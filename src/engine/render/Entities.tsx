import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ArchitectAppearance, CosmeticsState } from '../../stores/useGameStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { hexToLinearRgb } from '../voxel/palette';

export const DETAIL_VOXEL = 0.125;

export type NeoVisorMood =
  | 'neutral'
  | 'happy'
  | 'thinking'
  | 'surprised'
  | 'concerned'
  | 'focused'
  | 'proud'
  | 'sleepy';

export interface DetailBoxSpec {
  /** Integer detail-voxel grid origin (scaled by 0.125 u) */
  x: number;
  y: number;
  z: number;
  /** Integer detail-voxel dimensions */
  w: number;
  h: number;
  d: number;
  hex: string;
  emissive?: number;
}

const SKIN_TONES = ['#F2C9A8', '#E0B088', '#C68B5E', '#A86D43', '#7D4E2D', '#54331C'] as const;
const HAIR_COLORS = ['#2A2420', '#5B3A27', '#8F5D3C', '#CDB683', '#B4533C', '#8C9398'] as const;
const SCARF_COLORS = ['#2F7F86', '#D9433B', '#F2B544', '#5FA32A', '#355C8C', '#B4533C'] as const;

const BIT_PAINT_HEX: Record<string, string> = {
  moss: '#5F8E4E',
  clay: '#B4533C',
  slate: '#6E757A',
  sky: '#4BACE8',
};

/**
 * Merges an array of integer-snapped detail-voxel boxes into a single BufferGeometry
 * so each character or rigid limb renders in 1 draw call.
 */
export function buildDetailVoxelGeometry(
  boxes: DetailBoxSpec[],
  voxelScale = DETAIL_VOXEL,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const dormantColors: number[] = [];
  const ao: number[] = [];
  const emissive: number[] = [];
  const indices: number[] = [];

  const template = new THREE.BoxGeometry(1, 1, 1);
  const tPos = template.getAttribute('position') as THREE.BufferAttribute;
  const tNorm = template.getAttribute('normal') as THREE.BufferAttribute;
  const tIdx = template.getIndex()!;

  let vertOffset = 0;

  for (const box of boxes) {
    const sx = box.w * voxelScale;
    const sy = box.h * voxelScale;
    const sz = box.d * voxelScale;
    const cx = (box.x + box.w * 0.5) * voxelScale;
    const cy = (box.y + box.h * 0.5) * voxelScale;
    const cz = (box.z + box.d * 0.5) * voxelScale;
    const [r, g, b] = hexToLinearRgb(box.hex);
    const em = Math.min(1.2, Math.max(0, box.emissive ?? 0));

    for (let i = 0; i < tPos.count; i++) {
      const px = tPos.getX(i) * sx + cx;
      const py = tPos.getY(i) * sy + cy;
      const pz = tPos.getZ(i) * sz + cz;
      const ny = tNorm.getY(i);
      positions.push(px, py, pz);
      normals.push(tNorm.getX(i), ny, tNorm.getZ(i));
      colors.push(r, g, b);
      dormantColors.push(r, g, b);
      // Slight baked underside AO shading for crisp miniature readability
      ao.push(ny < -0.5 ? 0.76 : ny > 0.5 ? 1.0 : 0.92);
      emissive.push(em);
    }

    for (let i = 0; i < tIdx.count; i++) {
      indices.push(vertOffset + tIdx.getX(i));
    }
    vertOffset += tPos.count;
  }

  template.dispose();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aDormantColor', new THREE.Float32BufferAttribute(dormantColors, 3));
  geo.setAttribute('aAo', new THREE.Float32BufferAttribute(ao, 1));
  geo.setAttribute('aEmissive', new THREE.Float32BufferAttribute(emissive, 1));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function BlobShadow({ radius = 0.45 }: { radius?: number }) {
  const quality = useSettingsStore((s) => s.graphics.quality);
  if (quality !== 'low') return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <circleGeometry args={[radius, 12]} />
      <meshBasicMaterial color="#2A2420" transparent opacity={0.32} depthWrite={false} />
    </mesh>
  );
}

export interface ArchitectEntityProps {
  positionRef: React.MutableRefObject<[number, number, number]>;
  yawRef: React.MutableRefObject<number>;
  walkingRef: React.MutableRefObject<boolean>;
  sprintingRef: React.MutableRefObject<boolean>;
  appearance: ArchitectAppearance;
  material: THREE.Material;
}

/**
 * Architect (Player Avatar): 14 detail voxels tall (1.75 u), chunky 4x4x4 head,
 * customizable skin/hair/scarf, articulated limbs.
 */
export function ArchitectEntity({
  positionRef,
  yawRef,
  walkingRef,
  sprintingRef,
  appearance,
  material,
}: ArchitectEntityProps) {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const animPhaseRef = useRef(0);

  const skinHex = SKIN_TONES[appearance.skinTone % SKIN_TONES.length] ?? SKIN_TONES[2];
  const hairHex = HAIR_COLORS[appearance.hairColor % HAIR_COLORS.length] ?? HAIR_COLORS[1];
  const scarfHex = SCARF_COLORS[appearance.scarfColor % SCARF_COLORS.length] ?? SCARF_COLORS[0];

  const geos = useMemo(() => {
    const hairBoxes: DetailBoxSpec[] = [
      { x: -2, y: 13, z: -2, w: 4, h: 1, d: 4, hex: hairHex },
      { x: -2, y: 10, z: -2, w: 4, h: 3, d: 1, hex: hairHex },
    ];
    if (appearance.hairStyle % 4 === 1) {
      hairBoxes.push({ x: -2, y: 14, z: -1, w: 3, h: 1, d: 3, hex: hairHex });
    } else if (appearance.hairStyle % 4 === 2) {
      hairBoxes.push({ x: -2, y: 8, z: -3, w: 4, h: 4, d: 1, hex: hairHex });
    } else if (appearance.hairStyle % 4 === 3) {
      hairBoxes.push({ x: -3, y: 12, z: -2, w: 6, h: 1, d: 4, hex: hairHex });
    }

    const torsoHead = buildDetailVoxelGeometry([
      // Torso (canvas tunic + leather belt)
      { x: -2, y: 5, z: -1, w: 4, h: 4, d: 2, hex: '#D6CCB8' },
      { x: -2, y: 4, z: -1, w: 4, h: 1, d: 2, hex: '#7A5233' },
      // Scarf accent
      { x: -2, y: 9, z: -1, w: 4, h: 1, d: 3, hex: scarfHex },
      { x: 0, y: 7, z: -2, w: 2, h: 2, d: 1, hex: scarfHex },
      // Head (4x4x4 detail voxels, y = 10..14)
      { x: -2, y: 10, z: -2, w: 4, h: 4, d: 4, hex: skinHex },
      // Eyes
      { x: -1, y: 11, z: 2, w: 1, h: 1, d: 0.2, hex: '#2A2420' },
      { x: 1, y: 11, z: 2, w: 1, h: 1, d: 0.2, hex: '#2A2420' },
      ...hairBoxes,
    ]);

    const leg = buildDetailVoxelGeometry([
      { x: -1, y: -4, z: -1, w: 2, h: 3, d: 2, hex: '#3A464C' },
      { x: -1, y: -5, z: -1, w: 2, h: 1, d: 2, hex: '#6A4A2F' },
    ]);

    const arm = buildDetailVoxelGeometry([
      { x: -1, y: -4, z: -1, w: 2, h: 4, d: 2, hex: '#D6CCB8' },
      { x: -1, y: -5, z: -1, w: 2, h: 1, d: 2, hex: skinHex },
    ]);

    return { torsoHead, leg, arm };
  }, [skinHex, hairHex, scarfHex, appearance.hairStyle]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const [x, y, z] = positionRef.current;
    root.position.set(x, y, z);
    root.rotation.y = yawRef.current;

    const walking = walkingRef.current;
    const sprinting = sprintingRef.current;
    if (walking) {
      animPhaseRef.current += delta * (sprinting ? 14 : 9.5);
    } else {
      animPhaseRef.current *= 0.85;
    }

    const swing = walking ? Math.sin(animPhaseRef.current) * 0.55 : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.8;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.8;
  });

  return (
    <group ref={rootRef} name="entity-architect">
      <BlobShadow radius={0.42} />
      <mesh geometry={geos.torsoHead} material={material} castShadow receiveShadow />
      <mesh
        ref={leftLegRef}
        geometry={geos.leg}
        material={material}
        position={[-0.125, 0.625, 0]}
        castShadow
      />
      <mesh
        ref={rightLegRef}
        geometry={geos.leg}
        material={material}
        position={[0.125, 0.625, 0]}
        castShadow
      />
      <mesh
        ref={leftArmRef}
        geometry={geos.arm}
        material={material}
        position={[-0.375, 1.125, 0]}
        castShadow
      />
      <mesh
        ref={rightArmRef}
        geometry={geos.arm}
        material={material}
        position={[0.375, 1.125, 0]}
        castShadow
      />
    </group>
  );
}

export interface NeoEntityProps {
  followPosRef: React.MutableRefObject<[number, number, number]>;
  mood: NeoVisorMood;
  visorCosmetic: string;
  material: THREE.Material;
  fixedWorldPos?: [number, number, number];
}

/**
 * NEO Companion Drone (~0.6 u): ceramic shell, brass trim, short antenna,
 * 8 visor eye moods, and 4 cm sinusoidal hover over a 2.4 s cycle.
 */
export function NeoEntity({
  followPosRef,
  mood,
  visorCosmetic,
  material,
  fixedWorldPos,
}: NeoEntityProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const posRef = useRef<[number, number, number]>(
    fixedWorldPos ?? [followPosRef.current[0] - 1.1, followPosRef.current[1] + 1.4, followPosRef.current[2] - 0.8],
  );

  const visorHex = visorCosmetic === 'amber' ? '#F2B544' : '#5ED8CB';

  const bodyGeo = useMemo(() => {
    return buildDetailVoxelGeometry([
      // Ceramic body ~5x4x4 detail voxels (~0.625u)
      { x: -2, y: 0, z: -2, w: 4, h: 4, d: 4, hex: '#F2F4F5' },
      // Brass side thrusters & trim
      { x: -3, y: 1, z: -1, w: 1, h: 2, d: 2, hex: '#A8773D' },
      { x: 2, y: 1, z: -1, w: 1, h: 2, d: 2, hex: '#A8773D' },
      // Antenna
      { x: 0, y: 4, z: 0, w: 1, h: 2, d: 1, hex: '#A8773D' },
      { x: 0, y: 6, z: 0, w: 1, h: 1, d: 1, hex: visorHex, emissive: 1.05 },
      // Dark visor recess
      { x: -2, y: 1, z: 2, w: 4, h: 2, d: 0.4, hex: '#1C2427' },
    ]);
  }, [visorHex]);

  const eyesGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [];
    // 8 distinct detail-voxel eye shapes inside the 4x2 visor
    switch (mood) {
      case 'happy':
        boxes.push(
          { x: -1.6, y: 2.0, z: 2.25, w: 1.0, h: 0.5, d: 0.2, hex: visorHex, emissive: 1.1 },
          { x: 0.6, y: 2.0, z: 2.25, w: 1.0, h: 0.5, d: 0.2, hex: visorHex, emissive: 1.1 },
        );
        break;
      case 'thinking':
        boxes.push(
          { x: -1.5, y: 1.6, z: 2.25, w: 0.9, h: 0.8, d: 0.2, hex: visorHex, emissive: 1.0 },
          { x: 0.6, y: 2.1, z: 2.25, w: 0.9, h: 0.4, d: 0.2, hex: visorHex, emissive: 1.0 },
        );
        break;
      case 'surprised':
        boxes.push(
          { x: -1.5, y: 1.3, z: 2.25, w: 1.0, h: 1.3, d: 0.2, hex: visorHex, emissive: 1.15 },
          { x: 0.5, y: 1.3, z: 2.25, w: 1.0, h: 1.3, d: 0.2, hex: visorHex, emissive: 1.15 },
        );
        break;
      case 'concerned':
        boxes.push(
          { x: -1.5, y: 1.5, z: 2.25, w: 1.0, h: 0.6, d: 0.2, hex: '#F2B544', emissive: 1.0 },
          { x: 0.5, y: 1.5, z: 2.25, w: 1.0, h: 0.6, d: 0.2, hex: '#F2B544', emissive: 1.0 },
        );
        break;
      case 'focused':
        boxes.push(
          { x: -1.6, y: 1.6, z: 2.25, w: 1.2, h: 0.5, d: 0.2, hex: visorHex, emissive: 1.15 },
          { x: 0.4, y: 1.6, z: 2.25, w: 1.2, h: 0.5, d: 0.2, hex: visorHex, emissive: 1.15 },
        );
        break;
      case 'proud':
        boxes.push(
          { x: -1.5, y: 1.8, z: 2.25, w: 1.1, h: 0.7, d: 0.2, hex: visorHex, emissive: 1.15 },
          { x: 0.4, y: 1.8, z: 2.25, w: 1.1, h: 0.7, d: 0.2, hex: visorHex, emissive: 1.15 },
        );
        break;
      case 'sleepy':
        boxes.push(
          { x: -1.5, y: 1.4, z: 2.25, w: 1.0, h: 0.3, d: 0.2, hex: visorHex, emissive: 0.5 },
          { x: 0.5, y: 1.4, z: 2.25, w: 1.0, h: 0.3, d: 0.2, hex: visorHex, emissive: 0.5 },
        );
        break;
      case 'neutral':
      default:
        boxes.push(
          { x: -1.4, y: 1.5, z: 2.25, w: 0.9, h: 1.0, d: 0.2, hex: visorHex, emissive: 1.1 },
          { x: 0.5, y: 1.5, z: 2.25, w: 0.9, h: 1.0, d: 0.2, hex: visorHex, emissive: 1.1 },
        );
        break;
    }
    return buildDetailVoxelGeometry(boxes);
  }, [mood, visorHex]);

  useFrame((state, delta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;

    const target: [number, number, number] = fixedWorldPos ?? [
      followPosRef.current[0] - 1.05,
      followPosRef.current[1] + 1.45,
      followPosRef.current[2] - 0.85,
    ];

    const lerpRate = Math.min(1, delta * 4.5);
    posRef.current[0] += (target[0] - posRef.current[0]) * lerpRate;
    posRef.current[1] += (target[1] - posRef.current[1]) * lerpRate;
    posRef.current[2] += (target[2] - posRef.current[2]) * lerpRate;

    root.position.set(posRef.current[0], posRef.current[1], posRef.current[2]);

    // Face player slightly
    if (!fixedWorldPos) {
      const dx = followPosRef.current[0] - posRef.current[0];
      const dz = followPosRef.current[2] - posRef.current[2];
      root.rotation.y = Math.atan2(dx, dz);
    }

    // 4 cm (0.04 u) hover over exact 2.4 s cycle
    const omega = (Math.PI * 2) / 2.4;
    body.position.y = Math.sin(state.clock.elapsedTime * omega) * 0.04;
  });

  return (
    <group ref={rootRef} name="entity-neo">
      <group ref={bodyRef}>
        <mesh geometry={bodyGeo} material={material} castShadow />
        <mesh geometry={eyesGeo} material={material} />
      </group>
    </group>
  );
}

export interface BitEntityProps {
  positionRef: React.MutableRefObject<[number, number, number]>;
  yawRef: React.MutableRefObject<number>;
  animStateRef: React.MutableRefObject<{
    bumpTimer: number;
    craneTimer: number;
    scanTimer: number;
    speechBubble: string | null;
  }>;
  cosmetics: CosmeticsState;
  material: THREE.Material;
}

/**
 * BIT (Programmable Builder Robot): 1x1 u footprint, ~0.8 u tall, moss-green chassis,
 * brass trim, treads, front scanner lens, crane arm, customizable paint & accessories,
 * bump/shrug animation, and overhead speech bubble.
 */
export function BitEntity({
  positionRef,
  yawRef,
  animStateRef,
  cosmetics,
  material,
}: BitEntityProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const craneRef = useRef<THREE.Mesh>(null);
  const speechDivRef = useRef<HTMLDivElement>(null);

  const chassisHex = BIT_PAINT_HEX[cosmetics.bitPaint] ?? BIT_PAINT_HEX.moss!;

  const { chassisGeo, craneGeo, accessoryGeo } = useMemo(() => {
    const chassis = buildDetailVoxelGeometry([
      // Left & right treads (1x1 u footprint = 8x8 detail voxels)
      { x: -4, y: 0, z: -4, w: 2, h: 2, d: 8, hex: '#3A464C' },
      { x: 2, y: 0, z: -4, w: 2, h: 2, d: 8, hex: '#3A464C' },
      // Brass tread hubs
      { x: -4, y: 0, z: -2, w: 1, h: 1, d: 4, hex: '#A8773D' },
      { x: 3, y: 0, z: -2, w: 1, h: 1, d: 4, hex: '#A8773D' },
      // Main chassis (6x4x6 detail voxels)
      { x: -3, y: 2, z: -3, w: 6, h: 4, d: 6, hex: chassisHex },
      // Brass top collar
      { x: -2, y: 6, z: -2, w: 4, h: 1, d: 4, hex: '#A8773D' },
      // Front scanner lens
      { x: -2, y: 3, z: 3, w: 4, h: 2, d: 1, hex: '#3A464C' },
      { x: -1, y: 3, z: 4, w: 2, h: 1, d: 0.4, hex: '#5CE1E6', emissive: 1.15 },
    ]);

    const crane = buildDetailVoxelGeometry([
      { x: 0, y: 0, z: 0, w: 1, h: 3, d: 1, hex: '#A8773D' },
      { x: 0, y: 3, z: 0, w: 1, h: 1, d: 3, hex: '#A8773D' },
      { x: 0, y: 2, z: 2, w: 1, h: 1, d: 1, hex: '#F2B544', emissive: 0.8 },
    ]);

    let acc: THREE.BufferGeometry | null = null;
    if (cosmetics.bitAccessory === 'lantern') {
      acc = buildDetailVoxelGeometry([
        { x: -4, y: 5, z: 1, w: 1, h: 2, d: 1, hex: '#A8773D' },
        { x: -4, y: 4, z: 2, w: 1, h: 1, d: 1, hex: '#F2B544', emissive: 1.15 },
      ]);
    } else if (cosmetics.bitAccessory === 'antenna_flag') {
      acc = buildDetailVoxelGeometry([
        { x: -3, y: 6, z: -2, w: 1, h: 4, d: 1, hex: '#A8773D' },
        { x: -3, y: 9, z: -4, w: 1, h: 1, d: 2, hex: '#D9433B' },
      ]);
    }

    return { chassisGeo: chassis, craneGeo: crane, accessoryGeo: acc };
  }, [chassisHex, cosmetics.bitAccessory]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;

    const [x, y, z] = positionRef.current;
    root.position.set(x, y, z);
    root.rotation.y = yawRef.current;

    const anim = animStateRef.current;
    if (anim.bumpTimer > 0) {
      anim.bumpTimer = Math.max(0, anim.bumpTimer - delta);
      const p = anim.bumpTimer / 0.25;
      body.position.z = -Math.sin(p * Math.PI) * 0.14;
      body.rotation.z = Math.sin(p * Math.PI * 3) * 0.12;
    } else {
      body.position.z = 0;
      body.rotation.z = 0;
    }

    if (craneRef.current) {
      if (anim.craneTimer > 0) {
        anim.craneTimer = Math.max(0, anim.craneTimer - delta);
        craneRef.current.rotation.x = Math.sin((anim.craneTimer / 0.3) * Math.PI) * 0.55;
      } else {
        craneRef.current.rotation.x = 0;
      }
    }

    if (anim.scanTimer > 0) {
      anim.scanTimer = Math.max(0, anim.scanTimer - delta);
    }

    if (speechDivRef.current) {
      const text = anim.speechBubble;
      if (text) {
        speechDivRef.current.style.display = 'block';
        speechDivRef.current.textContent = text;
      } else {
        speechDivRef.current.style.display = 'none';
      }
    }
  });

  return (
    <group ref={rootRef} name="entity-bit">
      <BlobShadow radius={0.55} />
      <group ref={bodyRef}>
        <mesh geometry={chassisGeo} material={material} castShadow receiveShadow />
        <mesh
          ref={craneRef}
          geometry={craneGeo}
          material={material}
          position={[0.3125, 0.5, -0.125]}
          castShadow
        />
        {accessoryGeo && <mesh geometry={accessoryGeo} material={material} castShadow />}
      </group>
      <Html position={[0, 1.3, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div
          ref={speechDivRef}
          style={{
            display: 'none',
            background: '#F3EAD8',
            color: '#2A2420',
            border: '2px solid #D9C9A8',
            borderRadius: '2px',
            padding: '4px 8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
          }}
        />
      </Html>
    </group>
  );
}

export interface NpcProps {
  position: [number, number, number];
  yaw?: number;
  material: THREE.Material;
}

/**
 * BOLT: 15 detail voxels tall, leather apron, copper goggles, rolled sleeves, beard.
 */
export function BoltNpc({ position, yaw = 0, material }: NpcProps) {
  const geo = useMemo(
    () =>
      buildDetailVoxelGeometry([
        { x: -2, y: 0, z: -1, w: 2, h: 4, d: 2, hex: '#3A464C' },
        { x: 0, y: 0, z: -1, w: 2, h: 4, d: 2, hex: '#3A464C' },
        { x: -3, y: 4, z: -2, w: 6, h: 6, d: 4, hex: '#7A5233' }, // stocky torso + leather apron
        { x: -3, y: 6, z: -2, w: 6, h: 1, d: 4, hex: '#A8773D' }, // tool belt
        { x: -4, y: 5, z: -1, w: 1, h: 4, d: 2, hex: '#E0B088' },
        { x: 3, y: 5, z: -1, w: 1, h: 4, d: 2, hex: '#E0B088' },
        { x: -2, y: 10, z: -2, w: 4, h: 5, d: 4, hex: '#E0B088' },
        { x: -2, y: 10, z: 1, w: 4, h: 2, d: 2, hex: '#8C9398' }, // gray-streaked beard
        { x: -2, y: 13, z: -2, w: 4, h: 1, d: 5, hex: '#A8773D' }, // copper goggles
        { x: -1, y: 13, z: 2.2, w: 1, h: 1, d: 0.4, hex: '#4CD7E0' },
        { x: 1, y: 13, z: 2.2, w: 1, h: 1, d: 0.4, hex: '#4CD7E0' },
      ]),
    [],
  );

  return (
    <group position={position} rotation={[0, yaw, 0]} name="npc-bolt">
      <BlobShadow radius={0.48} />
      <mesh geometry={geo} material={material} castShadow receiveShadow />
    </group>
  );
}

/**
 * Mira: 14 detail voxels tall, straw hat, olive dress, woven basket.
 */
export function MiraNpc({ position, yaw = 0, material }: NpcProps) {
  const geo = useMemo(
    () =>
      buildDetailVoxelGeometry([
        { x: -2, y: 0, z: -1, w: 4, h: 5, d: 2, hex: '#5F8E4E' }, // olive dress
        { x: -2, y: 5, z: -1, w: 4, h: 4, d: 2, hex: '#D6CCB8' },
        { x: -3, y: 5, z: -1, w: 1, h: 4, d: 2, hex: '#C68B5E' },
        { x: 2, y: 5, z: -1, w: 1, h: 4, d: 2, hex: '#C68B5E' },
        { x: 2, y: 3, z: 0, w: 2, h: 2, d: 2, hex: '#B07D4F' }, // woven basket
        { x: -2, y: 9, z: -2, w: 4, h: 4, d: 4, hex: '#C68B5E' },
        { x: -3, y: 13, z: -3, w: 6, h: 1, d: 6, hex: '#E2CE9C' }, // straw hat brim
        { x: -2, y: 14, z: -2, w: 4, h: 1, d: 4, hex: '#CDB683' }, // straw hat crown
      ]),
    [],
  );

  return (
    <group position={position} rotation={[0, yaw, 0]} name="npc-mira">
      <BlobShadow radius={0.42} />
      <mesh geometry={geo} material={material} castShadow receiveShadow />
    </group>
  );
}

/**
 * Old Tamo: 13 detail voxels tall, hunched blue-gray robe, wooden staff.
 */
export function OldTamoNpc({ position, yaw = 0, material }: NpcProps) {
  const geo = useMemo(
    () =>
      buildDetailVoxelGeometry([
        { x: -2, y: 0, z: -1, w: 4, h: 8, d: 3, hex: '#355C8C' }, // blue-gray robe
        { x: -2, y: 8, z: 0, w: 4, h: 4, d: 4, hex: '#C68B5E' }, // hunched forward head
        { x: -2, y: 12, z: 0, w: 4, h: 1, d: 4, hex: '#F0EDE6' }, // white hair
        { x: -2, y: 7, z: 3, w: 4, h: 2, d: 1, hex: '#F0EDE6' }, // white beard
        { x: 3, y: 0, z: 1, w: 1, h: 11, d: 1, hex: '#6A4A2F' }, // staff
        { x: 3, y: 11, z: 1, w: 1, h: 1, d: 1, hex: '#5ED8CB', emissive: 0.9 },
      ]),
    [],
  );

  return (
    <group position={position} rotation={[0, yaw, 0]} name="npc-tamo">
      <BlobShadow radius={0.45} />
      <mesh geometry={geo} material={material} castShadow receiveShadow />
    </group>
  );
}

/**
 * Distant Guardian Silhouette (World-voxel scale 1.0 u, bronze/stone colossus with restrained veins).
 */
export function GuardianSilhouette({
  position,
  visible,
  material,
}: {
  position: [number, number, number];
  visible: boolean;
  material: THREE.Material;
}) {
  const geo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          { x: -3, y: 0, z: -2, w: 2, h: 8, d: 3, hex: '#6E757A' },
          { x: 1, y: 0, z: -2, w: 2, h: 8, d: 3, hex: '#6E757A' },
          { x: -4, y: 8, z: -2, w: 8, h: 9, d: 4, hex: '#555B60' },
          { x: -3, y: 10, z: 2, w: 6, h: 4, d: 1, hex: '#A8773D' },
          { x: -1, y: 11, z: 2.5, w: 2, h: 3, d: 1, hex: '#5ED8CB', emissive: 0.7 },
          { x: -6, y: 9, z: -1, w: 2, h: 8, d: 2, hex: '#6E757A' },
          { x: 4, y: 9, z: -1, w: 2, h: 8, d: 2, hex: '#6E757A' },
        ],
        1.0, // World voxel = 1.0 u
      ),
    [],
  );

  if (!visible) return null;

  return (
    <group position={position} name="entity-guardian-silhouette">
      <mesh geometry={geo} material={material} />
    </group>
  );
}
