import type { ChunkStorage } from '../voxel/ChunkStorage';
import { EventBus } from '../../stores/EventBus';

export interface RespawnAnchor {
  id: string;
  islandId: string;
  position: [number, number, number];
  yaw: number;
}

export interface CharacterInputState {
  moveX: number; // -1..1 (camera-relative right)
  moveZ: number; // -1..1 (camera-relative forward)
  sprint: boolean;
  jumpPressed: boolean;
  cameraYaw: number;
  observationLocked: boolean;
}

export interface CharacterState {
  position: [number, number, number];
  velocity: [number, number, number];
  yaw: number;
  grounded: boolean;
  sprinting: boolean;
  walking: boolean;
  voidFadeProgress: number; // 0 = normal, >0..1 = fading out/in during respawn
  respawning: boolean;
  lastSafePosition: [number, number, number];
  nearestAnchorId: string;
  currentIslandId: string;
}

export const PLAYER_CONSTANTS = {
  WALK_SPEED: 4.0, // u/s (Section 5.2)
  SPRINT_MULTIPLIER: 1.6, // 6.4 u/s
  GRAVITY: 24.0, // u/s^2
  JUMP_APEX: 1.3, // u (clears 1-voxel step, blocked by 2-voxel wall)
  JUMP_VELOCITY: Math.sqrt(2 * 24.0 * 1.3), // ~7.899 u/s -> exact 1.30 u apex
  HALF_WIDTH: 0.34, // 0.68 u total width (fits comfortably in 1-voxel corridors)
  HEIGHT: 1.75, // 14 detail voxels (Section 6.4)
  SKIN_EPS: 0.001,
  VOID_Y: -30, // Section 5.1 / Task spec
  FADE_DURATION_SEC: 0.4, // 400 ms fade
  MAX_DT: 0.05,
} as const;

/**
 * Kinematic swept-AABB voxel character controller.
 * Pure TypeScript so it runs identically in headless Vitest physics tests and R3F useFrame.
 */
export class CharacterController {
  public state: CharacterState;
  private anchors: RespawnAnchor[];
  private fadeTimer = 0;
  private fadePhase: 'none' | 'out' | 'in' = 'none';
  private pendingRespawnAnchor: RespawnAnchor | null = null;
  private wasJumpDown = false;

  constructor(
    initialPos: [number, number, number] = [0, 3, 0],
    initialYaw = 0,
    anchors: RespawnAnchor[] = [
      { id: 'shrine_spawn', islandId: 'stasis_shrine', position: [0, 3, 0], yaw: 0 },
    ],
  ) {
    this.anchors = anchors;
    this.state = {
      position: [...initialPos],
      velocity: [0, 0, 0],
      yaw: initialYaw,
      grounded: false,
      sprinting: false,
      walking: false,
      voidFadeProgress: 0,
      respawning: false,
      lastSafePosition: [...initialPos],
      nearestAnchorId: anchors[0]?.id ?? 'shrine_spawn',
      currentIslandId: anchors[0]?.islandId ?? 'stasis_shrine',
    };
  }

  setAnchors(anchors: RespawnAnchor[]): void {
    if (anchors.length > 0) {
      this.anchors = anchors;
    }
  }

  teleport(position: [number, number, number], yaw?: number): void {
    this.state.position = [...position];
    this.state.velocity = [0, 0, 0];
    if (yaw !== undefined) this.state.yaw = yaw;
    this.state.grounded = false;
    this.fadePhase = 'none';
    this.state.voidFadeProgress = 0;
    this.state.respawning = false;
  }

  findNearestAnchor(pos: [number, number, number]): RespawnAnchor {
    let best = this.anchors[0] ?? {
      id: 'shrine_spawn',
      islandId: 'stasis_shrine',
      position: [...this.state.lastSafePosition] as [number, number, number],
      yaw: 0,
    };
    let bestDistSq = Infinity;
    for (const anchor of this.anchors) {
      const dx = anchor.position[0] - pos[0];
      const dy = anchor.position[1] - pos[1];
      const dz = anchor.position[2] - pos[2];
      const dSq = dx * dx + dy * dy * 0.25 + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = anchor;
      }
    }
    return best;
  }

  step(dtRaw: number, input: CharacterInputState, storage: ChunkStorage): void {
    const dt = Math.min(PLAYER_CONSTANTS.MAX_DT, Math.max(0, dtRaw));
    if (dt === 0) return;

    // Handle void respawn fade state machine (400 ms out -> teleport -> 400 ms in, total 0.8s <= 1.2s)
    if (this.fadePhase === 'out') {
      this.fadeTimer += dt;
      this.state.voidFadeProgress = Math.min(1, this.fadeTimer / PLAYER_CONSTANTS.FADE_DURATION_SEC);
      if (this.fadeTimer >= PLAYER_CONSTANTS.FADE_DURATION_SEC) {
        const anchor = this.pendingRespawnAnchor ?? this.findNearestAnchor(this.state.position);
        this.state.position = [...anchor.position];
        this.state.velocity = [0, 0, 0];
        this.state.yaw = anchor.yaw;
        this.state.nearestAnchorId = anchor.id;
        this.state.currentIslandId = anchor.islandId;
        this.fadePhase = 'in';
        this.fadeTimer = 0;
        EventBus.emit('world.player.respawned', {
          anchorId: anchor.id,
          position: [...anchor.position],
        });
      }
      return;
    }

    if (this.fadePhase === 'in') {
      this.fadeTimer += dt;
      this.state.voidFadeProgress = Math.max(
        0,
        1 - this.fadeTimer / PLAYER_CONSTANTS.FADE_DURATION_SEC,
      );
      if (this.fadeTimer >= PLAYER_CONSTANTS.FADE_DURATION_SEC) {
        this.fadePhase = 'none';
        this.state.voidFadeProgress = 0;
        this.state.respawning = false;
      }
      return;
    }

    // Observation Mode lock during code playback
    if (input.observationLocked) {
      this.state.velocity[0] = 0;
      this.state.velocity[2] = 0;
      this.state.walking = false;
      this.state.sprinting = false;
      this.wasJumpDown = input.jumpPressed;
      // Still apply gravity so player stays resting on ground
      this.state.velocity[1] -= PLAYER_CONSTANTS.GRAVITY * dt;
      this.moveAndCollide(0, this.state.velocity[1] * dt, 0, storage);
      return;
    }

    // Compute camera-relative world movement vector
    const mag = Math.hypot(input.moveX, input.moveZ);
    let worldMoveX = 0;
    let worldMoveZ = 0;
    if (mag > 0.05) {
      const normX = input.moveX / Math.max(1, mag);
      const normZ = input.moveZ / Math.max(1, mag);
      const sinYaw = Math.sin(input.cameraYaw);
      const cosYaw = Math.cos(input.cameraYaw);
      // Forward is (-sinYaw, -cosYaw), Right is (cosYaw, -sinYaw) in Three.js Y-up
      worldMoveX = normX * cosYaw - normZ * sinYaw;
      worldMoveZ = -normX * sinYaw - normZ * cosYaw;

      const targetYaw = Math.atan2(worldMoveX, worldMoveZ);
      this.state.yaw = lerpAngle(this.state.yaw, targetYaw, Math.min(1, dt * 14));
    }

    const speed =
      PLAYER_CONSTANTS.WALK_SPEED * (input.sprint && mag > 0.05 ? PLAYER_CONSTANTS.SPRINT_MULTIPLIER : 1);
    this.state.velocity[0] = worldMoveX * speed;
    this.state.velocity[2] = worldMoveZ * speed;
    this.state.walking = mag > 0.05;
    this.state.sprinting = input.sprint && this.state.walking;

    // Jump on rising edge when grounded (exact 1.3u apex)
    const jumpEdge = input.jumpPressed && !this.wasJumpDown;
    this.wasJumpDown = input.jumpPressed;
    if (jumpEdge && this.state.grounded) {
      this.state.velocity[1] = PLAYER_CONSTANTS.JUMP_VELOCITY;
      this.state.grounded = false;
      EventBus.emit('audio.cue', { cue: 'jump', worldPos: [...this.state.position] });
    }

    // Gravity (Velocity Verlet for exact dt-independent 1.3 u jump apex)
    const prevVy = this.state.velocity[1];
    this.state.velocity[1] -= PLAYER_CONSTANTS.GRAVITY * dt;
    if (this.state.velocity[1] < -40) {
      this.state.velocity[1] = -40;
    }

    const dx = this.state.velocity[0] * dt;
    const dy = 0.5 * (prevVy + this.state.velocity[1]) * dt;
    const dz = this.state.velocity[2] * dt;

    const wasGrounded = this.state.grounded;
    this.moveAndCollide(dx, dy, dz, storage);

    if (!wasGrounded && this.state.grounded) {
      EventBus.emit('audio.cue', { cue: 'land', worldPos: [...this.state.position] });
    }

    // Update nearest anchor / safe position when solidly grounded
    if (this.state.grounded) {
      this.state.lastSafePosition = [...this.state.position];
      const nearest = this.findNearestAnchor(this.state.position);
      this.state.nearestAnchorId = nearest.id;
      this.state.currentIslandId = nearest.islandId;
    }

    // Void fall detection (Y < -30)
    if (this.state.position[1] < PLAYER_CONSTANTS.VOID_Y) {
      this.pendingRespawnAnchor = this.findNearestAnchor(this.state.position);
      this.fadePhase = 'out';
      this.fadeTimer = 0;
      this.state.respawning = true;
      this.state.voidFadeProgress = 0;
    }
  }

  /**
   * Axis-separated swept AABB resolution against voxel solids.
   * Resolves Y first (ground/ceiling), then X and Z independently for smooth wall sliding
   * with zero corner snagging.
   */
  private moveAndCollide(dx: number, dy: number, dz: number, storage: ChunkStorage): void {
    const hw = PLAYER_CONSTANTS.HALF_WIDTH;
    const h = PLAYER_CONSTANTS.HEIGHT;
    const eps = PLAYER_CONSTANTS.SKIN_EPS;

    // 1. Vertical sweep (Y)
    const nextY = this.state.position[1] + dy;
    let resolvedY = nextY;
    let grounded = false;

    const minX = Math.floor(this.state.position[0] - hw + eps);
    const maxX = Math.floor(this.state.position[0] + hw - eps);
    const minZ = Math.floor(this.state.position[2] - hw + eps);
    const maxZ = Math.floor(this.state.position[2] + hw - eps);

    if (dy <= 0) {
      const footStart = Math.floor(this.state.position[1] + eps);
      const footEnd = Math.floor(nextY);
      outerDown: for (let vy = footStart; vy >= footEnd; vy--) {
        for (let vx = minX; vx <= maxX; vx++) {
          for (let vz = minZ; vz <= maxZ; vz++) {
            if (storage.isSolid(vx, vy, vz)) {
              const topFace = vy + 1;
              if (this.state.position[1] >= topFace - 0.15) {
                resolvedY = topFace;
                this.state.velocity[1] = 0;
                grounded = true;
                break outerDown;
              }
            }
          }
        }
      }
    } else {
      const headStart = Math.floor(this.state.position[1] + h - eps);
      const headEnd = Math.floor(nextY + h);
      outerUp: for (let vy = headStart; vy <= headEnd; vy++) {
        for (let vx = minX; vx <= maxX; vx++) {
          for (let vz = minZ; vz <= maxZ; vz++) {
            if (storage.isSolid(vx, vy, vz)) {
              resolvedY = vy - h - eps;
              this.state.velocity[1] = 0;
              break outerUp;
            }
          }
        }
      }
    }
    this.state.position[1] = resolvedY;
    this.state.grounded = grounded;

    // Vertical span after Y resolution (inset slightly at feet so standing on top face doesn't collide horizontally)
    const bodyMinY = Math.floor(this.state.position[1] + eps * 2);
    const bodyMaxY = Math.floor(this.state.position[1] + h - eps * 2);

    // 2. X sweep
    if (Math.abs(dx) > 1e-7) {
      const nextX = this.state.position[0] + dx;
      const z0 = Math.floor(this.state.position[2] - hw + eps * 2);
      const z1 = Math.floor(this.state.position[2] + hw - eps * 2);
      let blockedX = false;
      let clampedX = nextX;

      if (dx > 0) {
        const startVx = Math.floor(this.state.position[0] + hw - eps);
        const endVx = Math.floor(nextX + hw);
        outerPosX: for (let vx = startVx; vx <= endVx; vx++) {
          for (let vy = bodyMinY; vy <= bodyMaxY; vy++) {
            for (let vz = z0; vz <= z1; vz++) {
              if (storage.isSolid(vx, vy, vz)) {
                clampedX = vx - hw - eps;
                blockedX = true;
                break outerPosX;
              }
            }
          }
        }
      } else {
        const startVx = Math.floor(this.state.position[0] - hw + eps);
        const endVx = Math.floor(nextX - hw);
        outerNegX: for (let vx = startVx; vx >= endVx; vx--) {
          for (let vy = bodyMinY; vy <= bodyMaxY; vy++) {
            for (let vz = z0; vz <= z1; vz++) {
              if (storage.isSolid(vx, vy, vz)) {
                clampedX = vx + 1 + hw + eps;
                blockedX = true;
                break outerNegX;
              }
            }
          }
        }
      }

      this.state.position[0] = clampedX;
      if (blockedX) this.state.velocity[0] = 0;
    }

    // 3. Z sweep (uses updated X so corner sliding is crisp and snag-free)
    if (Math.abs(dz) > 1e-7) {
      const nextZ = this.state.position[2] + dz;
      const x0 = Math.floor(this.state.position[0] - hw + eps * 2);
      const x1 = Math.floor(this.state.position[0] + hw - eps * 2);
      let blockedZ = false;
      let clampedZ = nextZ;

      if (dz > 0) {
        const startVz = Math.floor(this.state.position[2] + hw - eps);
        const endVz = Math.floor(nextZ + hw);
        outerPosZ: for (let vz = startVz; vz <= endVz; vz++) {
          for (let vy = bodyMinY; vy <= bodyMaxY; vy++) {
            for (let vx = x0; vx <= x1; vx++) {
              if (storage.isSolid(vx, vy, vz)) {
                clampedZ = vz - hw - eps;
                blockedZ = true;
                break outerPosZ;
              }
            }
          }
        }
      } else {
        const startVz = Math.floor(this.state.position[2] - hw + eps);
        const endVz = Math.floor(nextZ - hw);
        outerNegZ: for (let vz = startVz; vz >= endVz; vz--) {
          for (let vy = bodyMinY; vy <= bodyMaxY; vy++) {
            for (let vx = x0; vx <= x1; vx++) {
              if (storage.isSolid(vx, vy, vz)) {
                clampedZ = vz + 1 + hw + eps;
                blockedZ = true;
                break outerNegZ;
              }
            }
          }
        }
      }

      this.state.position[2] = clampedZ;
      if (blockedZ) this.state.velocity[2] = 0;
    }
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
