import { useState, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ArchitectAppearance, CosmeticsState } from '../../stores/useGameStore';
import { useGameStore } from '../../stores/useGameStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useUIStore } from '../../stores/useUIStore';
import { hexToLinearRgb } from '../voxel/palette';
import { AWAKENING_QUESTS } from '../../content/awakening/quests';
import type { InteractablePlacement } from '../voxel/islandGenerator';

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

const FINE_VOXEL = 0.0625;

/**
 * Architect (Player Avatar): 1.75 u tall high-detail stylized voxel-chibi sculpt (0.0625 u),
 * symmetrical eyes with catchlights, customizable skin/hair/scarf, adventurer tunic & satchel.
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
  const rigRef = useRef<THREE.Group>(null);
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
      // Crown & back hair volume wrapping top/back/sides of 8x8x8 head
      { x: -4.4, y: 27.2, z: -4.4, w: 8.8, h: 1.6, d: 8.8, hex: hairHex },
      { x: -4.4, y: 21, z: -4.4, w: 8.8, h: 6.5, d: 3.6, hex: hairHex },
      { x: -4.4, y: 24, z: -1, w: 1.1, h: 3.5, d: 4.5, hex: hairHex },
      { x: 3.3, y: 24, z: -1, w: 1.1, h: 3.5, d: 4.5, hex: hairHex },
    ];
    const style = appearance.hairStyle % 4;
    if (style === 0) {
      // Short Neat Crop with textured bangs
      hairBoxes.push(
        { x: -4, y: 26, z: 3.4, w: 5.5, h: 1.4, d: 1.2, hex: hairHex },
        { x: 1.5, y: 26.5, z: 3.4, w: 2.5, h: 1.0, d: 1.1, hex: hairHex },
      );
    } else if (style === 1) {
      // Center-Parted Swoop
      hairBoxes.push(
        { x: -4.4, y: 25, z: 3.2, w: 3.6, h: 2.5, d: 1.2, hex: hairHex },
        { x: 0.8, y: 25, z: 3.2, w: 3.6, h: 2.5, d: 1.2, hex: hairHex },
        { x: -3.5, y: 28.5, z: -2, w: 7, h: 1.0, d: 5, hex: hairHex },
      );
    } else if (style === 2) {
      // Adventurer Ponytail & ribbon tie
      hairBoxes.push(
        { x: -3.5, y: 26, z: 3.2, w: 7, h: 1.4, d: 1.1, hex: hairHex },
        { x: -1.5, y: 22.5, z: -5.4, w: 3, h: 2.5, d: 1.2, hex: scarfHex },
        { x: -2, y: 17.5, z: -6.4, w: 4, h: 6, d: 1.8, hex: hairHex },
      );
    } else {
      // Fluffy Wavy Curls
      hairBoxes.push(
        { x: -5, y: 25.5, z: -3.5, w: 10, h: 3, d: 7.5, hex: hairHex },
        { x: -3.8, y: 28.2, z: -2.5, w: 7.6, h: 1.3, d: 5.5, hex: hairHex },
        { x: -4.2, y: 25.5, z: 3.2, w: 8.4, h: 1.6, d: 1.3, hex: hairHex },
      );
    }

    const torsoHead = buildDetailVoxelGeometry(
      [
        // Ivory tunic + warm leather explorer vest + belt & gold buckle
        { x: -4, y: 10, z: -2.2, w: 8, h: 8.8, d: 4.4, hex: '#F3ECE0' },
        { x: -4.1, y: 11.5, z: -2.3, w: 2.4, h: 7.2, d: 4.6, hex: '#8F5D3C' },
        { x: 1.7, y: 11.5, z: -2.3, w: 2.4, h: 7.2, d: 4.6, hex: '#8F5D3C' },
        { x: -4.2, y: 9.8, z: -2.4, w: 8.4, h: 1.8, d: 4.8, hex: '#5D3822' },
        { x: -1, y: 9.8, z: 2.1, w: 2, h: 1.8, d: 0.6, hex: '#F2B544' },
        // Adventurer Satchel Backpack + sleeping roll
        { x: -3.2, y: 11.2, z: -4.4, w: 6.4, h: 6.4, d: 2.2, hex: '#7A5233' },
        { x: -3.5, y: 17.4, z: -4.6, w: 7, h: 2, d: 2.2, hex: '#E2CE9C' },
        { x: -1, y: 13.5, z: -4.7, w: 2, h: 1.2, d: 0.5, hex: '#F2B544' },
        // Symmetrical Scarf Collar + neat front clasp + flowing twin tails
        { x: -4.4, y: 18.2, z: -2.7, w: 8.8, h: 1.8, d: 5.4, hex: scarfHex },
        { x: -1.8, y: 16.5, z: 2.1, w: 3.6, h: 2, d: 0.8, hex: scarfHex },
        { x: -2.5, y: 13, z: -3.6, w: 1.8, h: 5.5, d: 1, hex: scarfHex },
        { x: 0.7, y: 14, z: -3.6, w: 1.8, h: 4.5, d: 1, hex: scarfHex },
        // Neck & Symmetrical Sculpted 8x8x8 Head (y = 20..28)
        { x: -1.5, y: 19.5, z: -1.5, w: 3, h: 1.5, d: 3, hex: skinHex },
        { x: -4, y: 20, z: -4, w: 8, h: 8, d: 8, hex: skinHex },
        // Symmetric Eyebrows
        { x: -3, y: 24.4, z: 3.9, w: 2.1, h: 0.7, d: 0.4, hex: hairHex },
        { x: 0.9, y: 24.4, z: 3.9, w: 2.1, h: 0.7, d: 0.4, hex: hairHex },
        // Symmetrical Expressive Eyes + White Sparkles
        { x: -2.9, y: 22.1, z: 3.9, w: 1.5, h: 1.9, d: 0.35, hex: '#1F2933' },
        { x: 1.4, y: 22.1, z: 3.9, w: 1.5, h: 1.9, d: 0.35, hex: '#1F2933' },
        { x: -2.7, y: 23.2, z: 4.08, w: 0.7, h: 0.7, d: 0.25, hex: '#FFFFFF', emissive: 0.25 },
        { x: 1.6, y: 23.2, z: 4.08, w: 0.7, h: 0.7, d: 0.25, hex: '#FFFFFF', emissive: 0.25 },
        // Warm rosy cheek blushes
        { x: -3.4, y: 21.1, z: 3.9, w: 1.2, h: 0.8, d: 0.3, hex: '#E89B82' },
        { x: 2.2, y: 21.1, z: 3.9, w: 1.2, h: 0.8, d: 0.3, hex: '#E89B82' },
        ...hairBoxes,
      ],
      FINE_VOXEL,
    );

    // Legs pivoted at hip y = 10*0.0625 = 0.625 u (so bottom y = -10 rests cleanly at 0.0)
    const leg = buildDetailVoxelGeometry(
      [
        { x: -1.8, y: -7.2, z: -1.9, w: 3.6, h: 7.2, d: 3.8, hex: '#355C8C' },
        { x: -2, y: -9.3, z: -2.2, w: 4, h: 2.2, d: 4.6, hex: '#7A5233' },
        { x: -2, y: -10, z: -2.2, w: 4, h: 0.8, d: 4.6, hex: '#3A2A1E' },
      ],
      FINE_VOXEL,
    );

    // Arms pivoted at shoulder y = 18*0.0625 = 1.125 u
    const arm = buildDetailVoxelGeometry(
      [
        { x: -1.4, y: -5.5, z: -1.5, w: 2.8, h: 6.2, d: 3, hex: '#F3ECE0' },
        { x: -1.5, y: -6.8, z: -1.6, w: 3, h: 1.4, d: 3.2, hex: '#7A5233' },
        { x: -1.3, y: -8.6, z: -1.4, w: 2.6, h: 2, d: 2.8, hex: skinHex },
      ],
      FINE_VOXEL,
    );

    return { torsoHead, leg, arm };
  }, [skinHex, hairHex, scarfHex, appearance.hairStyle]);

  useFrame((state, delta) => {
    const root = rootRef.current;
    const rig = rigRef.current;
    if (!root || !rig) return;
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
    // Gentle bounce during stride + subtle breathing when idle
    rig.position.y = walking
      ? Math.abs(Math.sin(animPhaseRef.current)) * 0.045
      : Math.sin(state.clock.elapsedTime * 2.2) * 0.015;
    rig.rotation.x = walking && sprinting ? 0.08 : 0;

    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.8;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.8;
  });

  return (
    <group ref={rootRef} name="entity-architect">
      <BlobShadow radius={0.42} />
      <group ref={rigRef}>
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
          position={[-0.34, 1.125, 0]}
          castShadow
        />
        <mesh
          ref={rightArmRef}
          geometry={geos.arm}
          material={material}
          position={[0.34, 1.125, 0]}
          castShadow
        />
      </group>
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
 * NEO Companion Drone (~0.6 u): sculpted beveled ceramic shell, brass wings/thrusters, antenna halo,
 * 8 visor eye moods, and smooth 4 cm hover over a 2.4 s cycle.
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
    return buildDetailVoxelGeometry(
      [
        // Chamfered sleek aero ceramic core (~0.58u wide)
        { x: -4.2, y: 0.6, z: -3.5, w: 8.4, h: 6.8, d: 7, hex: '#F2F4F5' },
        { x: -3.2, y: 0, z: -2.8, w: 6.4, h: 8, d: 5.6, hex: '#FFFFFF' },
        // Turquoise/Amber lower energy thrusters + trim belt
        { x: -4.4, y: 2.6, z: -3.7, w: 8.8, h: 1.0, d: 7.4, hex: '#A8773D' },
        { x: -2, y: -0.8, z: -1.5, w: 4, h: 1, d: 3, hex: visorHex, emissive: 0.9 },
        // Brass aero winglet stabilizers
        { x: -5.8, y: 2.2, z: -1.5, w: 1.6, h: 3.5, d: 3, hex: '#A8773D' },
        { x: 4.2, y: 2.2, z: -1.5, w: 1.6, h: 3.5, d: 3, hex: '#A8773D' },
        { x: -5.6, y: 3.4, z: -0.5, w: 1, h: 1.2, d: 1, hex: visorHex, emissive: 1.05 },
        { x: 4.6, y: 3.4, z: -0.5, w: 1, h: 1.2, d: 1, hex: visorHex, emissive: 1.05 },
        // Antenna & luminous orb tip
        { x: -0.6, y: 8, z: -0.6, w: 1.2, h: 2.8, d: 1.2, hex: '#A8773D' },
        { x: -1.1, y: 10.6, z: -1.1, w: 2.2, h: 2.0, d: 2.2, hex: visorHex, emissive: 1.15 },
        // Framed glass visor recess
        { x: -3.6, y: 2.0, z: 3.3, w: 7.2, h: 3.8, d: 0.6, hex: '#142634' },
      ],
      FINE_VOXEL,
    );
  }, [visorHex]);

  const eyesGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [];
    const ez = 3.85;
    switch (mood) {
      case 'happy':
        boxes.push(
          { x: -2.7, y: 4.0, z: ez, w: 1.8, h: 0.8, d: 0.3, hex: visorHex, emissive: 1.15 },
          { x: 0.9, y: 4.0, z: ez, w: 1.8, h: 0.8, d: 0.3, hex: visorHex, emissive: 1.15 },
        );
        break;
      case 'thinking':
        boxes.push(
          { x: -2.6, y: 3.3, z: ez, w: 1.6, h: 1.5, d: 0.3, hex: visorHex, emissive: 1.05 },
          { x: 1.0, y: 4.1, z: ez, w: 1.6, h: 0.8, d: 0.3, hex: visorHex, emissive: 1.05 },
        );
        break;
      case 'surprised':
        boxes.push(
          { x: -2.7, y: 2.7, z: ez, w: 1.8, h: 2.4, d: 0.3, hex: visorHex, emissive: 1.15 },
          { x: 0.9, y: 2.7, z: ez, w: 1.8, h: 2.4, d: 0.3, hex: visorHex, emissive: 1.15 },
        );
        break;
      case 'concerned':
        boxes.push(
          { x: -2.7, y: 3.2, z: ez, w: 1.8, h: 1.1, d: 0.3, hex: '#F2B544', emissive: 1.05 },
          { x: 0.9, y: 3.2, z: ez, w: 1.8, h: 1.1, d: 0.3, hex: '#F2B544', emissive: 1.05 },
        );
        break;
      case 'focused':
        boxes.push(
          { x: -2.8, y: 3.3, z: ez, w: 2.1, h: 0.9, d: 0.3, hex: visorHex, emissive: 1.15 },
          { x: 0.7, y: 3.3, z: ez, w: 2.1, h: 0.9, d: 0.3, hex: visorHex, emissive: 1.15 },
        );
        break;
      case 'proud':
        boxes.push(
          { x: -2.7, y: 3.6, z: ez, w: 1.9, h: 1.3, d: 0.3, hex: visorHex, emissive: 1.15 },
          { x: 0.8, y: 3.6, z: ez, w: 1.9, h: 1.3, d: 0.3, hex: visorHex, emissive: 1.15 },
        );
        break;
      case 'sleepy':
        boxes.push(
          { x: -2.6, y: 2.9, z: ez, w: 1.8, h: 0.6, d: 0.3, hex: visorHex, emissive: 0.6 },
          { x: 0.8, y: 2.9, z: ez, w: 1.8, h: 0.6, d: 0.3, hex: visorHex, emissive: 0.6 },
        );
        break;
      case 'neutral':
      default:
        boxes.push(
          { x: -2.6, y: 3.0, z: ez, w: 1.7, h: 1.9, d: 0.3, hex: visorHex, emissive: 1.1 },
          { x: 0.9, y: 3.0, z: ez, w: 1.7, h: 1.9, d: 0.3, hex: visorHex, emissive: 1.1 },
        );
        break;
    }
    return buildDetailVoxelGeometry(boxes, FINE_VOXEL);
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

    if (!fixedWorldPos) {
      const dx = followPosRef.current[0] - posRef.current[0];
      const dz = followPosRef.current[2] - posRef.current[2];
      root.rotation.y = Math.atan2(dx, dz);
    }

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
 * BIT (Programmable Builder Robot): 1x1 u footprint, articulated treads, beveled chassis,
 * glowing stereo eyes, builder crane arm, customizable paint & accessories.
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
    const chassis = buildDetailVoxelGeometry(
      [
        // Left & right treads with bronze rollers (0.9u footprint)
        { x: -7, y: 0, z: -7, w: 3, h: 3.5, d: 14, hex: '#3A464C' },
        { x: 4, y: 0, z: -7, w: 3, h: 3.5, d: 14, hex: '#3A464C' },
        { x: -7.4, y: 1, z: -5, w: 1, h: 1.5, d: 2.5, hex: '#A8773D' },
        { x: -7.4, y: 1, z: 2.5, w: 1, h: 1.5, d: 2.5, hex: '#A8773D' },
        { x: 6.4, y: 1, z: -5, w: 1, h: 1.5, d: 2.5, hex: '#A8773D' },
        { x: 6.4, y: 1, z: 2.5, w: 1, h: 1.5, d: 2.5, hex: '#A8773D' },
        // Beveled Painted Chassis
        { x: -5, y: 2.5, z: -5.5, w: 10, h: 8, d: 11, hex: chassisHex },
        { x: -4.2, y: 10.5, z: -4.5, w: 8.4, h: 1.8, d: 9, hex: '#A8773D' },
        // Amber hazard bumper & rear exhaust grill
        { x: -5.2, y: 3, z: 4.8, w: 10.4, h: 1.4, d: 1, hex: '#F2B544' },
        { x: -3.5, y: 4, z: -6, w: 7, h: 4, d: 0.6, hex: '#3A464C' },
        // Wide front visor + symmetric friendly glowing cyan eyes
        { x: -4, y: 5.5, z: 5.3, w: 8, h: 3.8, d: 0.8, hex: '#18364A' },
        { x: -2.8, y: 6.6, z: 6.0, w: 1.8, h: 1.8, d: 0.35, hex: '#5CE1E6', emissive: 1.15 },
        { x: 1.0, y: 6.6, z: 6.0, w: 1.8, h: 1.8, d: 0.35, hex: '#5CE1E6', emissive: 1.15 },
      ],
      FINE_VOXEL,
    );

    const crane = buildDetailVoxelGeometry(
      [
        { x: -0.8, y: 0, z: -0.8, w: 1.6, h: 6, d: 1.6, hex: '#A8773D' },
        { x: -0.8, y: 5.5, z: -0.8, w: 1.6, h: 1.6, d: 5.5, hex: '#A8773D' },
        { x: -1, y: 4, z: 3.8, w: 2, h: 2, d: 2, hex: '#F2B544', emissive: 0.9 },
      ],
      FINE_VOXEL,
    );

    let acc: THREE.BufferGeometry | null = null;
    if (cosmetics.bitAccessory === 'lantern') {
      acc = buildDetailVoxelGeometry(
        [
          { x: -6.5, y: 9, z: 1.5, w: 1.4, h: 4.5, d: 1.4, hex: '#A8773D' },
          { x: -7, y: 7.5, z: 3, w: 2.2, h: 2.5, d: 2.2, hex: '#F2B544', emissive: 1.15 },
        ],
        FINE_VOXEL,
      );
    } else if (cosmetics.bitAccessory === 'antenna_flag') {
      acc = buildDetailVoxelGeometry(
        [
          { x: -4.5, y: 12, z: -3, w: 1.2, h: 7, d: 1.2, hex: '#A8773D' },
          { x: -4.5, y: 16.5, z: -7, w: 0.8, h: 2.5, d: 4, hex: '#D9433B' },
        ],
        FINE_VOXEL,
      );
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
          position={[0.32, 0.5, -0.1]}
          castShadow
        />
        {accessoryGeo && <mesh geometry={accessoryGeo} material={material} castShadow />}
      </group>
      <Html position={[0, 1.35, 0]} center distanceFactor={10} zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div
          ref={speechDivRef}
          style={{
            display: 'none',
            background: '#FFFDF7',
            color: '#172B3A',
            border: '2px solid #0891B2',
            borderRadius: '10px',
            padding: '5px 10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(15, 45, 70, 0.25)',
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
 * BOLT: Stocky Engineer, leather blacksmith apron, copper goggles with aqua lenses, symmetric eyes & beard.
 */
export function BoltNpc({ position, yaw = 0, material }: NpcProps) {
  const geo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          // Sturdy cuffed boots & pants
          { x: -3.5, y: 0, z: -2, w: 3, h: 3, d: 4, hex: '#4A3423' },
          { x: 0.5, y: 0, z: -2, w: 3, h: 3, d: 4, hex: '#4A3423' },
          { x: -3.3, y: 3, z: -1.8, w: 2.8, h: 5, d: 3.6, hex: '#3A464C' },
          { x: 0.5, y: 3, z: -1.8, w: 2.8, h: 5, d: 3.6, hex: '#3A464C' },
          // Stocky torso + leather apron + bronze utility belt
          { x: -5, y: 8, z: -2.8, w: 10, h: 10, d: 5.6, hex: '#7A5233' },
          { x: -4.2, y: 7, z: 2.4, w: 8.4, h: 10, d: 0.8, hex: '#5D3822' },
          { x: -5.2, y: 11.5, z: -3, w: 10.4, h: 1.8, d: 6.2, hex: '#A8773D' },
          { x: -1.2, y: 11.5, z: 3.0, w: 2.4, h: 1.8, d: 0.5, hex: '#F2B544' },
          // Muscular rolled-sleeve arms
          { x: -7.2, y: 10, z: -1.5, w: 2.2, h: 7.5, d: 3, hex: '#E0B088' },
          { x: 5.0, y: 10, z: -1.5, w: 2.2, h: 7.5, d: 3, hex: '#E0B088' },
          { x: -7.4, y: 15, z: -1.7, w: 2.4, h: 3, d: 3.4, hex: '#D6CCB8' },
          { x: 5.0, y: 15, z: -1.7, w: 2.4, h: 3, d: 3.4, hex: '#D6CCB8' },
          // Symmetrical Head + gray beard + copper aviator goggles
          { x: -4, y: 18, z: -3.8, w: 8, h: 8, d: 7.6, hex: '#E0B088' },
          { x: -4.1, y: 17.5, z: 1.2, w: 8.2, h: 3.8, d: 3.2, hex: '#8C9398' },
          { x: -4.1, y: 24, z: -4, w: 8.2, h: 2.2, d: 8, hex: '#6D4630' },
          // Symmetrical Eyes
          { x: -2.8, y: 21.5, z: 3.7, w: 1.4, h: 1.5, d: 0.35, hex: '#1F2933' },
          { x: 1.4, y: 21.5, z: 3.7, w: 1.4, h: 1.5, d: 0.35, hex: '#1F2933' },
          // Brass goggles cleanly resting on forehead
          { x: -4.3, y: 23.8, z: -3.9, w: 8.6, h: 2.0, d: 8.4, hex: '#A8773D' },
          { x: -3.1, y: 24.0, z: 4.3, w: 2.2, h: 1.6, d: 0.5, hex: '#4CD7E0', emissive: 0.65 },
          { x: 0.9, y: 24.0, z: 4.3, w: 2.2, h: 1.6, d: 0.5, hex: '#4CD7E0', emissive: 0.65 },
        ],
        FINE_VOXEL,
      ),
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
 * Mira: Cheerful Farmer-Botanist, wide straw sun hat with coral ribbon, olive dress & harvest basket.
 */
export function MiraNpc({ position, yaw = 0, material }: NpcProps) {
  const geo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          // Boots + Olive sundress + cream apron
          { x: -3, y: 0, z: -1.5, w: 2.4, h: 2.5, d: 3, hex: '#6A4A2F' },
          { x: 0.6, y: 0, z: -1.5, w: 2.4, h: 2.5, d: 3, hex: '#6A4A2F' },
          { x: -4.2, y: 2, z: -2.4, w: 8.4, h: 8, d: 4.8, hex: '#5F8E4E' },
          { x: -3.5, y: 3, z: -2.6, w: 7, h: 7.5, d: 5.2, hex: '#F3ECE0' },
          { x: -3.6, y: 10, z: -2.1, w: 7.2, h: 8, d: 4.2, hex: '#F3ECE0' },
          { x: -3.7, y: 10, z: -2.2, w: 7.4, h: 4, d: 4.4, hex: '#5F8E4E' },
          // Arms + woven basket with carrot & golden wheat
          { x: -5.8, y: 10.5, z: -1.2, w: 2, h: 7, d: 2.4, hex: '#C68B5E' },
          { x: 3.8, y: 10.5, z: -1.2, w: 2, h: 7, d: 2.4, hex: '#C68B5E' },
          { x: 4.2, y: 7, z: 0, w: 4.2, h: 4.2, d: 4.2, hex: '#B07D4F' },
          { x: 4.8, y: 11, z: 0.8, w: 1.5, h: 2, d: 1.5, hex: '#E5793A' },
          { x: 6.4, y: 11, z: 1.2, w: 1.4, h: 2.5, d: 1.4, hex: '#F2B544' },
          // Symmetrical Head + hair braids + wide woven straw hat & ribbon
          { x: -3.8, y: 18, z: -3.8, w: 7.6, h: 7.6, d: 7.6, hex: '#C68B5E' },
          { x: -4.2, y: 19.5, z: -4.1, w: 8.4, h: 5, d: 3.5, hex: '#5B3A27' },
          { x: -2.6, y: 20.6, z: 3.7, w: 1.3, h: 1.6, d: 0.3, hex: '#1F2933' },
          { x: 1.3, y: 20.6, z: 3.7, w: 1.3, h: 1.6, d: 0.3, hex: '#1F2933' },
          { x: -3.1, y: 19.6, z: 3.7, w: 1.1, h: 0.7, d: 0.25, hex: '#E89B82' },
          { x: 2.0, y: 19.6, z: 3.7, w: 1.1, h: 0.7, d: 0.25, hex: '#E89B82' },
          { x: -6.5, y: 24.8, z: -6.5, w: 13, h: 1.4, d: 13, hex: '#E2CE9C' },
          { x: -4.4, y: 26.2, z: -4.4, w: 8.8, h: 1.2, d: 8.8, hex: '#D9433B' },
          { x: -4.2, y: 27.4, z: -4.2, w: 8.4, h: 2.0, d: 8.4, hex: '#CDB683' },
        ],
        FINE_VOXEL,
      ),
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
 * Old Tamo: Gatekeeper Sage in sapphire & ivory robe, gentle symmetrical face, staff with glowing orb.
 */
export function OldTamoNpc({ position, yaw = 0, material }: NpcProps) {
  const geo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          // Layered storyteller robe + bronze sash + shawl
          { x: -4.5, y: 0, z: -3.2, w: 9, h: 15, d: 6.4, hex: '#355C8C' },
          { x: -4.8, y: 8.5, z: -3.4, w: 9.6, h: 1.5, d: 6.8, hex: '#A8773D' },
          { x: -5, y: 13, z: -3.5, w: 10, h: 3.5, d: 7, hex: '#2F7F86' },
          // Draped sleeves
          { x: -6.6, y: 8, z: -1.5, w: 2.2, h: 7, d: 3.5, hex: '#355C8C' },
          { x: 4.4, y: 8, z: -1.5, w: 2.2, h: 7, d: 3.5, hex: '#355C8C' },
          // Symmetrical Head + silver hair, bushy brows & flowing white beard
          { x: -3.8, y: 16.5, z: -2.2, w: 7.6, h: 7.5, d: 7.4, hex: '#C68B5E' },
          { x: -4, y: 23.5, z: -2.5, w: 8, h: 1.8, d: 8, hex: '#F0EDE6' },
          { x: -3.5, y: 12.5, z: 4.2, w: 7, h: 5.5, d: 1.4, hex: '#F0EDE6' },
          { x: -2.6, y: 19.8, z: 5.1, w: 1.2, h: 1.3, d: 0.3, hex: '#1F2933' },
          { x: 1.4, y: 19.8, z: 5.1, w: 1.2, h: 1.3, d: 0.3, hex: '#1F2933' },
          { x: -3, y: 21.3, z: 5.1, w: 2.2, h: 0.8, d: 0.4, hex: '#F0EDE6' },
          { x: 0.8, y: 21.3, z: 5.1, w: 2.2, h: 0.8, d: 0.4, hex: '#F0EDE6' },
          // Wooden sage staff + glowing cyan Aetheria orb
          { x: 5.5, y: 0, z: 0.5, w: 1.5, h: 20, d: 1.5, hex: '#6A4A2F' },
          { x: 5.0, y: 20, z: 0, w: 2.5, h: 2.5, d: 2.5, hex: '#5ED8CB', emissive: 1.05 },
        ],
        FINE_VOXEL,
      ),
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

export interface ActiveQuestTargetInfo {
  activeQuestId: string | null;
  activeObjectiveId: string | null;
  targetId: string | null;
  missionId: string | null;
  objectiveType: string | null;
  objectiveLabel: string | null;
}

export function getActiveQuestTargetInfo(
  gameQuests: {
    states: Record<string, string>;
    completedStepIds: string[];
    completedObjectiveIds?: string[];
    activeMissionId: string | null;
    activeStepId: string | null;
  },
  collectedWorldItemIds: string[] = []
): ActiveQuestTargetInfo {
  let quest = AWAKENING_QUESTS.find((q) => gameQuests.states[q.id] === 'active');
  if (!quest && gameQuests.activeMissionId) {
    quest = AWAKENING_QUESTS.find((q) => q.id === gameQuests.activeMissionId);
  }
  if (!quest) {
    quest = AWAKENING_QUESTS[0];
  }

  if (!quest) {
    return {
      activeQuestId: null,
      activeObjectiveId: null,
      targetId: null,
      missionId: null,
      objectiveType: null,
      objectiveLabel: null,
    };
  }

  const completedObjs = gameQuests.completedObjectiveIds ?? [];
  const activeObj = quest.objectives.find((obj) => {
    // Objective or code step already completed
    if (
      completedObjs.includes(obj.id) ||
      gameQuests.completedStepIds.includes(obj.id) ||
      (obj.type === 'code_step' && gameQuests.completedStepIds.includes(obj.targetId)) ||
      gameQuests.completedStepIds.includes(obj.targetId)
    ) {
      return false;
    }
    if (obj.type === 'collect' && obj.targetId === 'blue_crystal') {
      const count = collectedWorldItemIds.filter((id) => id.startsWith('awakening_crystal_')).length;
      return count < (obj.requiredCount ?? 3);
    }
    return true;
  }) ?? quest.objectives[0] ?? null;

  return {
    activeQuestId: quest.id,
    activeObjectiveId: activeObj?.id ?? null,
    targetId: activeObj?.targetId ?? null,
    missionId: activeObj?.missionId ?? quest.id,
    objectiveType: activeObj?.type ?? null,
    objectiveLabel: activeObj?.label?.id ?? null,
  };
}

export function isInteractableQuestTarget(
  item: InteractablePlacement,
  questInfo: ActiveQuestTargetInfo,
  collectedWorldItemIds: string[] = []
): boolean {
  if (!questInfo.targetId && !questInfo.activeQuestId) return false;

  // Direct targetId match (e.g. 'neo_pedestal', 'old_tamo', 'mira', 'bolt', 'bit_robot')
  if (questInfo.targetId && item.id === questInfo.targetId) return true;

  // Blue crystal collection match (awakening_crystal_1, 2, 3)
  if (questInfo.targetId === 'blue_crystal') {
    if (item.id.startsWith('awakening_crystal_') && !collectedWorldItemIds.includes(item.id)) {
      return true;
    }
  }

  // Code step terminal / console match (only when active objective is code_step)
  if (item.missionId) {
    if (questInfo.objectiveType === 'code_step') {
      if (questInfo.missionId && item.missionId === questInfo.missionId) return true;
      if (questInfo.activeQuestId && item.missionId === questInfo.activeQuestId) return true;
    }
    if (!questInfo.targetId && questInfo.activeQuestId && item.missionId === questInfo.activeQuestId) {
      return true;
    }
  }

  // Island waypoint navigation
  if (questInfo.objectiveType === 'go_to') {
    if (questInfo.targetId === 'beacon_point' && item.id === 'beacon_terminal') return true;
    if (questInfo.targetId === 'core_spire' && item.id === 'core_altar') return true;
    if (questInfo.targetId === 'shrine_ledge' && item.id === 'neo_pedestal') return true;
    if (questInfo.targetId === 'supply_grove' && (item.id === 'bit_robot' || item.id === 'bit_terminal')) return true;
  }

  return false;
}

export const INTERACTABLE_KIND_COLORS: Record<
  'npc' | 'puzzle' | 'device' | 'item' | 'lore',
  { ring: string; glow: string; text: string }
> = {
  npc: { ring: '#F5B041', glow: '#F8C471', text: '#FAD7A0' }, // warm amber
  puzzle: { ring: '#3CC4C0', glow: '#5CE1E6', text: '#D1F2EB' }, // energetic turquoise
  device: { ring: '#5ED8CB', glow: '#76D7C4', text: '#E8F8F5' }, // beacon cyan
  item: { ring: '#4BACE8', glow: '#85C1E9', text: '#EBF5FB' }, // bright azure
  lore: { ring: '#EDE4D0', glow: '#F5EEF8', text: '#FAF0E6' }, // antique parchment
};

export function GroundHalo({
  color,
  isQuest,
  isFocused,
  distRef,
}: {
  color: string;
  isQuest: boolean;
  isFocused: boolean;
  distRef: React.MutableRefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const discRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!groupRef.current) return;
    const distance = distRef.current;

    if (isQuest) {
      if (ringRef.current) ringRef.current.rotation.z = -t * 0.8;
      if (innerRingRef.current) innerRingRef.current.rotation.z = t * 1.2;
      const pulse = 0.72 + Math.sin(t * 3.5) * 0.22;
      const targetScale = isFocused ? 1.3 : 1.0 + Math.sin(t * 2.5) * 0.06;
      groupRef.current.scale.set(targetScale, targetScale, targetScale);
      if (discRef.current) {
        (discRef.current.material as THREE.MeshBasicMaterial).opacity = isFocused ? 0.42 : 0.22;
      }
      if (ringRef.current) {
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    } else {
      const distFade = Math.max(0, Math.min(1, (13.5 - distance) / 3.5));
      const basePulse = isFocused ? 0.92 : (0.4 + Math.sin(t * 2.2) * 0.14) * distFade;
      const scale = isFocused ? 1.25 : 1.0;
      groupRef.current.scale.set(scale, scale, scale);
      if (ringRef.current) {
        (ringRef.current.material as THREE.MeshBasicMaterial).opacity = basePulse;
      }
      if (discRef.current) {
        (discRef.current.material as THREE.MeshBasicMaterial).opacity = (isFocused ? 0.32 : 0.12) * distFade;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Inner soft ground disc */}
      <mesh ref={discRef}>
        <circleGeometry args={[isQuest ? 0.65 : 0.52, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isQuest ? 0.22 : 0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Primary beacon ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[isQuest ? 0.82 : 0.52, isQuest ? 1.02 : 0.72, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isQuest ? 0.8 : 0.45}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={isQuest ? THREE.AdditiveBlending : THREE.NormalBlending}
        />
      </mesh>

      {/* Second concentric counter-rotating ring for quest targets */}
      {isQuest && (
        <mesh ref={innerRingRef}>
          <ringGeometry args={[0.48, 0.66, 32]} />
          <meshBasicMaterial
            color="#FFF4B8"
            transparent
            opacity={0.65}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

export function QuestObjectiveBeacon({
  heightOffset = 2.4,
  color = '#F59E0B',
}: {
  heightOffset?: number;
  color?: string;
}) {
  const diamondRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const pillarRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (diamondRef.current) {
      diamondRef.current.rotation.y = t * 2.0;
      diamondRef.current.position.y = heightOffset + Math.sin(t * 3.0) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 1.6;
    }
    if (pillarRef.current) {
      const pMat = pillarRef.current.material as THREE.MeshBasicMaterial;
      pMat.opacity = 0.14 + Math.sin(t * 2.6) * 0.05;
    }
  });

  return (
    <group name="quest-objective-beacon">
      {/* Gossamer soft vertical waypoint aura starting cleanly above ground */}
      <mesh ref={pillarRef} position={[0, heightOffset * 0.72, 0]}>
        <cylinderGeometry args={[0.06, 0.24, Math.max(1.2, heightOffset * 0.9), 16, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Crisp Floating Quest Waypoint Star & Halo Ring */}
      <group ref={diamondRef} position={[0, heightOffset, 0]}>
        <mesh scale={[0.18, 0.3, 0.18]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh scale={[0.1, 0.17, 0.1]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#FFFBEB" />
        </mesh>
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.28, 0.022, 6, 20]} />
          <meshBasicMaterial color="#FDE68A" transparent opacity={0.85} />
        </mesh>
      </group>
    </group>
  );
}

export function InteractivePromptBadge({
  label,
  keyHint = 'E',
  isQuest = false,
  heightOffset = 1.65,
}: {
  label: string;
  keyHint?: string;
  isQuest?: boolean;
  heightOffset?: number;
}) {
  return (
    <Html
      position={[0, heightOffset, 0]}
      center
      distanceFactor={9}
      zIndexRange={[15, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '4px 10px 4px 6px',
          background: '#FFFDF7',
          border: isQuest ? '2px solid #F59E0B' : '2px solid #0891B2',
          borderRadius: '999px',
          boxShadow: isQuest
            ? '0 4px 14px rgba(15, 45, 70, 0.22), 0 2px 0 #D97706'
            : '0 4px 12px rgba(15, 45, 70, 0.18), 0 2px 0 #0E7490',
          whiteSpace: 'nowrap',
          fontFamily: "var(--font-body, 'Segoe UI', sans-serif)",
          transform: 'translateY(-4px)',
        }}
      >
        <span
          style={{
            background: isQuest
              ? 'linear-gradient(180deg, #FBBF24 0%, #F59E0B 100%)'
              : 'linear-gradient(180deg, #22D3EE 0%, #0891B2 100%)',
            color: isQuest ? '#422006' : '#FFFFFF',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 800,
            fontSize: '11px',
            lineHeight: 1,
            padding: '4px 7px',
            borderRadius: '999px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
          }}
        >
          {keyHint}
        </span>
        <span
          style={{
            color: '#172B3A',
            fontSize: '12px',
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {label}
        </span>
      </div>
    </Html>
  );
}

function InteractableHighlightNode({
  item,
  playerPosRef,
  isQuest,
  isPromptActive,
  allowBadge,
}: {
  item: InteractablePlacement;
  playerPosRef: React.MutableRefObject<[number, number, number]>;
  isQuest: boolean;
  isPromptActive: boolean;
  allowBadge: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const [showBadge, setShowBadge] = useState(false);
  const colorSpec = INTERACTABLE_KIND_COLORS[item.kind] ?? { ring: '#5ED8CB', glow: '#76D7C4', text: '#E8F8F5' };
  const primaryColor = isQuest ? '#F4D03F' : colorSpec.ring;
  const distRef = useRef(999);

  const badgeHeight =
    item.kind === 'npc'
      ? 2.25
      : item.kind === 'puzzle' || item.kind === 'device'
        ? 1.95
        : 1.3;

  const beaconHeight =
    item.kind === 'npc'
      ? 2.85
      : item.kind === 'puzzle' || item.kind === 'device'
        ? 2.45
        : 1.75;

  useFrame(() => {
    const px = playerPosRef.current[0];
    const py = playerPosRef.current[1];
    const pz = playerPosRef.current[2];
    const dx = item.position[0] - px;
    const dy = item.position[1] - py;
    const dz = item.position[2] - pz;
    const dSq = dx * dx + dy * dy + dz * dz;

    const maxViewSq = isQuest ? 75 * 75 : 13.5 * 13.5;
    const isVisible = dSq <= maxViewSq;
    if (rootRef.current) {
      rootRef.current.visible = isVisible;
    }

    const d = Math.sqrt(dSq);
    distRef.current = d;

    const near = d < 2.6 || isPromptActive;
    if (near !== showBadge) {
      setShowBadge(near);
    }
  });

  return (
    <group ref={rootRef} position={item.position} name={`highlight-${item.id}`}>
      <GroundHalo
        color={primaryColor}
        isQuest={isQuest}
        isFocused={showBadge}
        distRef={distRef}
      />

      {isQuest && (
        <QuestObjectiveBeacon
          heightOffset={beaconHeight}
          color="#F4D03F"
        />
      )}

      {allowBadge && showBadge && (
        <InteractivePromptBadge
          label={item.label}
          keyHint="E"
          isQuest={isQuest}
          heightOffset={badgeHeight}
        />
      )}
    </group>
  );
}

export interface InteractablesHighlightLayerProps {
  interactables: InteractablePlacement[];
  playerPosRef: React.MutableRefObject<[number, number, number]>;
  collectedWorldItemIds: string[];
  discoveredLoreNoteIds: string[];
  activePromptTargetId: string | null;
}

export function InteractablesHighlightLayer({
  interactables,
  playerPosRef,
  collectedWorldItemIds,
  discoveredLoreNoteIds,
  activePromptTargetId,
}: InteractablesHighlightLayerProps) {
  const questsState = useGameStore((s) => s.quests);
  const screen = useUIStore((s) => s.screen);
  const inGameOverlay = useUIStore((s) => s.inGameOverlay);
  const allowBadge = screen === 'in_game' && inGameOverlay === 'explore';

  const questInfo = useMemo(
    () => getActiveQuestTargetInfo(questsState, collectedWorldItemIds),
    [questsState, collectedWorldItemIds],
  );

  const activeInteractables = useMemo(() => {
    return interactables.filter((item) => {
      if (collectedWorldItemIds.includes(item.id)) return false;
      if (discoveredLoreNoteIds.includes(item.id)) return false;
      return true;
    });
  }, [interactables, collectedWorldItemIds, discoveredLoreNoteIds]);

  return (
    <group name="interactables-highlight-layer">
      {activeInteractables.map((item) => {
        const isQuest = isInteractableQuestTarget(item, questInfo, collectedWorldItemIds);
        const isPromptActive = activePromptTargetId === item.id;
        return (
          <InteractableHighlightNode
            key={item.id}
            item={item}
            playerPosRef={playerPosRef}
            isQuest={isQuest}
            isPromptActive={isPromptActive}
            allowBadge={allowBadge}
          />
        );
      })}
    </group>
  );
}
