import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildDetailVoxelGeometry, type DetailBoxSpec } from './Entities';
import type { PropPlacement } from '../voxel/islandGenerator';

const PROP_TEMPLATES: Record<PropPlacement['type'], { boxes: DetailBoxSpec[]; scale: number }> = {
  pine_small: {
    scale: 0.25,
    boxes: [
      // Flared trunk & roots
      { x: -1.5, y: 0, z: -1.5, w: 3, h: 1, d: 3, hex: '#5D3D24' },
      { x: -1, y: 1, z: -1, w: 2, h: 6, d: 2, hex: '#6A4A2F' },
      // Tier 1 lush boughs
      { x: -5, y: 5, z: -5, w: 10, h: 2, d: 10, hex: '#265E32' },
      { x: -4, y: 7, z: -4, w: 8, h: 1.5, d: 8, hex: '#34783B' },
      // Tier 2 mid boughs
      { x: -4, y: 8.5, z: -4, w: 8, h: 2, d: 8, hex: '#2D6636' },
      { x: -3, y: 10.5, z: -3, w: 6, h: 1.5, d: 6, hex: '#489342' },
      // Tier 3 crown
      { x: -2.5, y: 12, z: -2.5, w: 5, h: 2, d: 5, hex: '#3E8242' },
      { x: -1.5, y: 14, z: -1.5, w: 3, h: 2, d: 3, hex: '#66B84D' },
      { x: -0.5, y: 16, z: -0.5, w: 1, h: 1.5, d: 1, hex: '#8ED438' },
    ],
  },
  pine_tall: {
    scale: 0.25,
    boxes: [
      { x: -2, y: 0, z: -1.5, w: 4, h: 1, d: 3, hex: '#5D3D24' },
      { x: -1.5, y: 0, z: -2, w: 3, h: 1, d: 4, hex: '#5D3D24' },
      { x: -1, y: 1, z: -1, w: 2, h: 8, d: 2, hex: '#6A4A2F' },
      // Lower skirt
      { x: -6, y: 7, z: -6, w: 12, h: 2, d: 12, hex: '#265E32' },
      { x: -5, y: 9, z: -5, w: 10, h: 2, d: 10, hex: '#34783B' },
      // Mid tier
      { x: -5, y: 11, z: -5, w: 10, h: 2, d: 10, hex: '#2D6636' },
      { x: -4, y: 13, z: -4, w: 8, h: 2, d: 8, hex: '#3E8242' },
      // Upper tier
      { x: -3.5, y: 15, z: -3.5, w: 7, h: 2, d: 7, hex: '#489342' },
      { x: -2.5, y: 17, z: -2.5, w: 5, h: 2, d: 5, hex: '#5CA64A' },
      // Sunlit tip
      { x: -1.5, y: 19, z: -1.5, w: 3, h: 2, d: 3, hex: '#76BF31' },
      { x: -0.5, y: 21, z: -0.5, w: 1, h: 1.5, d: 1, hex: '#8ED438' },
    ],
  },
  oak: {
    scale: 0.25,
    boxes: [
      // Knobby roots + trunk + forked limb
      { x: -2, y: 0, z: -2, w: 4, h: 1.5, d: 4, hex: '#5D3D24' },
      { x: -1.5, y: 1.5, z: -1.5, w: 3, h: 6.5, d: 3, hex: '#6A4A2F' },
      { x: -3, y: 6, z: -1, w: 2, h: 2, d: 2, hex: '#6A4A2F' },
      { x: 1, y: 6.5, z: -1, w: 2, h: 2, d: 2, hex: '#6A4A2F' },
      // Leafy billowing rounded canopy
      { x: -6, y: 8, z: -6, w: 12, h: 4, d: 12, hex: '#34783B' },
      { x: -7, y: 9, z: -4, w: 14, h: 3, d: 8, hex: '#3E8242' },
      { x: -4, y: 9, z: -7, w: 8, h: 3, d: 14, hex: '#3E8242' },
      { x: -5, y: 12, z: -5, w: 10, h: 3, d: 10, hex: '#5CA64A' },
      { x: -3, y: 15, z: -3, w: 6, h: 1.5, d: 6, hex: '#76BF31' },
      // Delicate blossom accents
      { x: 4, y: 10, z: 4, w: 2, h: 1.5, d: 2, hex: '#E9B7C4' },
      { x: -5, y: 11, z: 3, w: 2, h: 1.5, d: 2, hex: '#F2B544' },
    ],
  },
  shrub: {
    scale: 0.125,
    boxes: [
      { x: -3, y: 0, z: -3, w: 6, h: 3, d: 6, hex: '#2D6636' },
      { x: -4, y: 1, z: -2, w: 8, h: 2.5, d: 4, hex: '#3E8242' },
      { x: -2, y: 1, z: -4, w: 4, h: 2.5, d: 8, hex: '#3E8242' },
      { x: -2, y: 3, z: -2, w: 4, h: 2, d: 4, hex: '#5CA64A' },
      // Cheerful blossoms
      { x: 2, y: 3, z: 1, w: 1.5, h: 1.5, d: 1.5, hex: '#E9B7C4' },
      { x: -3, y: 2.5, z: 1.5, w: 1.5, h: 1.5, d: 1.5, hex: '#F2B544' },
      { x: 0, y: 4.5, z: -2, w: 1.5, h: 1.5, d: 1.5, hex: '#E9B7C4' },
    ],
  },
  rock: {
    scale: 0.125,
    boxes: [
      { x: -4, y: 0, z: -3, w: 8, h: 3, d: 6, hex: '#6E757A' },
      { x: -3, y: 0, z: -4, w: 6, h: 2.5, d: 8, hex: '#8C9398' },
      { x: -2.5, y: 3, z: -2.5, w: 5, h: 2, d: 5, hex: '#99A2A8' },
      { x: -1.5, y: 5, z: -1.5, w: 3, h: 1, d: 3, hex: '#C6CED2' },
      // Moss cap pocket
      { x: -2, y: 4.5, z: 1, w: 2.5, h: 1, d: 2, hex: '#5FA32A' },
    ],
  },
  crystal: {
    scale: 0.0625,
    boxes: [
      // Craggy slate bed
      { x: -5, y: 0, z: -5, w: 10, h: 2.5, d: 10, hex: '#5E666D' },
      { x: -4, y: 2, z: -4, w: 8, h: 2, d: 8, hex: '#778087' },
      // Main central azure spire
      { x: -2.5, y: 3, z: -2.5, w: 5, h: 11, d: 5, hex: '#2A86A8', emissive: 0.65 },
      { x: -2, y: 4, z: -2, w: 4, h: 12, d: 4, hex: '#4BACE8', emissive: 1.05 },
      { x: -1, y: 15, z: -1, w: 2, h: 3, d: 2, hex: '#9EEFFF', emissive: 1.15 },
      // Flanking crystal shards
      { x: 2, y: 2, z: -3.5, w: 3, h: 8, d: 3, hex: '#5CE1E6', emissive: 1.05 },
      { x: -4.5, y: 2, z: 1, w: 3, h: 6.5, d: 3, hex: '#4BACE8', emissive: 0.95 },
      { x: 1, y: 2, z: 2.5, w: 2.5, h: 5, d: 2.5, hex: '#5CE1E6', emissive: 1.0 },
    ],
  },
  crate: {
    scale: 0.0625,
    boxes: [
      // Dark sturdy timber corner frame & base
      { x: -6, y: 0, z: -6, w: 12, h: 12, d: 12, hex: '#7A5233' },
      // Recessed warm wooden faces
      { x: -5, y: 1, z: -6.2, w: 10, h: 10, d: 12.4, hex: '#B07D4F' },
      { x: -6.2, y: 1, z: -5, w: 12.4, h: 10, d: 10, hex: '#B07D4F' },
      { x: -5, y: 11.5, z: -5, w: 10, h: 1, d: 10, hex: '#C69362' },
      // Diagonal plank band & brass corner latches
      { x: -4, y: 5, z: -6.35, w: 8, h: 2, d: 12.7, hex: '#8F5D3C' },
      { x: -6.35, y: 5, z: -4, w: 12.7, h: 2, d: 8, hex: '#8F5D3C' },
      { x: -6.4, y: 10, z: -6.4, w: 2, h: 2, d: 2, hex: '#F2B544' },
      { x: 4.4, y: 10, z: -6.4, w: 2, h: 2, d: 2, hex: '#F2B544' },
      { x: -6.4, y: 10, z: 4.4, w: 2, h: 2, d: 2, hex: '#F2B544' },
      { x: 4.4, y: 10, z: 4.4, w: 2, h: 2, d: 2, hex: '#F2B544' },
    ],
  },
  crop_wheat: {
    scale: 0.0625,
    boxes: [
      { x: -4, y: 0, z: -3, w: 1.5, h: 8, d: 1.5, hex: '#5FA32A' },
      { x: -4.5, y: 7, z: -3.5, w: 2.5, h: 4, d: 2.5, hex: '#F2B544' },
      { x: 2, y: 0, z: -2, w: 1.5, h: 9, d: 1.5, hex: '#76BF31' },
      { x: 1.5, y: 8, z: -2.5, w: 2.5, h: 4.5, d: 2.5, hex: '#E2CE9C' },
      { x: -1.5, y: 0, z: 2.5, w: 1.5, h: 7.5, d: 1.5, hex: '#5FA32A' },
      { x: -2, y: 7, z: 2, w: 2.5, h: 4, d: 2.5, hex: '#F2B544' },
      { x: 3, y: 0, z: 3, w: 1.5, h: 6.5, d: 1.5, hex: '#76BF31' },
      { x: 2.5, y: 6, z: 2.5, w: 2.5, h: 3.5, d: 2.5, hex: '#E2CE9C' },
    ],
  },
  lore_note: {
    scale: 0.0625,
    boxes: [
      // Carved stone lectern base & column
      { x: -4, y: 0, z: -4, w: 8, h: 2, d: 8, hex: '#778087' },
      { x: -2.5, y: 2, z: -2.5, w: 5, h: 9, d: 5, hex: '#99A2A8' },
      { x: -4.5, y: 11, z: -3.5, w: 9, h: 2, d: 7, hex: '#A8773D' },
      // Illuminated cream open parchment tome & azure bookmark
      { x: -4, y: 13, z: -2.5, w: 3.8, h: 1.2, d: 5, hex: '#FFFBF2', emissive: 0.45 },
      { x: 0.2, y: 13, z: -2.5, w: 3.8, h: 1.2, d: 5, hex: '#FFFBF2', emissive: 0.45 },
      { x: -0.3, y: 12.8, z: -2.8, w: 0.6, h: 1.6, d: 5.8, hex: '#3CC4C0', emissive: 0.9 },
      // Gold clasp spark
      { x: -1, y: 14.5, z: 0, w: 2, h: 1, d: 1, hex: '#F2B544', emissive: 0.95 },
    ],
  },
  cloud: {
    scale: 1.0,
    boxes: [
      { x: -4, y: 0, z: -2.5, w: 8, h: 2, d: 5, hex: '#F5FAFD', emissive: 0.14 },
      { x: -2.5, y: 2, z: -1.5, w: 5, h: 1.2, d: 3, hex: '#FFFFFF', emissive: 0.15 },
      { x: -5.5, y: 0.3, z: -1.5, w: 2, h: 1.4, d: 3, hex: '#F5FAFD', emissive: 0.12 },
      { x: 3.5, y: 0.3, z: -1.5, w: 2, h: 1.4, d: 3, hex: '#F5FAFD', emissive: 0.12 },
      { x: -3, y: -0.8, z: -1.5, w: 6, h: 0.8, d: 3, hex: '#DCEAF3' },
    ],
  },
};

export interface InstancedPropGroupProps {
  type: PropPlacement['type'];
  placements: PropPlacement[];
  material: THREE.Material;
  castShadow?: boolean;
}

const _propDummy = new THREE.Object3D();

function InstancedPropGroup({
  type,
  placements,
  material,
  castShadow = true,
}: InstancedPropGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const template = PROP_TEMPLATES[type];

  const geometry = useMemo(
    () => buildDetailVoxelGeometry(template.boxes, template.scale),
    [template],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    placements.forEach((p, idx) => {
      dummy.position.set(p.position[0], p.position[1], p.position[2]);
      dummy.rotation.set(0, p.rotationY, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);

  // Gentle hover/spin for energy crystals and slow scenic drift for clouds
  useFrame((state) => {
    if (type !== 'crystal' && type !== 'cloud') return;
    const mesh = meshRef.current;
    if (!mesh || placements.length === 0) return;
    const t = state.clock.elapsedTime;
    placements.forEach((p, idx) => {
      if (type === 'crystal') {
        const bob = Math.sin(t * 2.4 + idx * 1.6) * 0.08 + 0.1;
        _propDummy.position.set(p.position[0], p.position[1] + bob, p.position[2]);
        _propDummy.rotation.set(0, p.rotationY + t * 0.45, 0);
      } else {
        const drift = Math.sin(t * 0.14 + idx * 1.9) * 3.5;
        const bob = Math.cos(t * 0.35 + idx) * 0.4;
        _propDummy.position.set(p.position[0] + drift, p.position[1] + bob, p.position[2]);
        _propDummy.rotation.set(0, p.rotationY, 0);
      }
      _propDummy.scale.setScalar(p.scale);
      _propDummy.updateMatrix();
      mesh.setMatrixAt(idx, _propDummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (placements.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, placements.length]}
      castShadow={castShadow && type !== 'cloud'}
      receiveShadow={type !== 'cloud'}
      name={`instanced-${type}`}
    />
  );
}

export interface InstancedPropsLayerProps {
  props: PropPlacement[];
  collectedWorldItemIds: string[];
  discoveredLoreNoteIds: string[];
  restoredZoneIds: string[];
  material: THREE.Material;
}

/**
 * Renders all repeated Tier 2 props in <= 10 InstancedMesh draw calls total.
 */
export function InstancedPropsLayer({
  props,
  collectedWorldItemIds,
  discoveredLoreNoteIds,
  restoredZoneIds,
  material,
}: InstancedPropsLayerProps) {
  const grouped = useMemo(() => {
    const map = new Map<PropPlacement['type'], PropPlacement[]>();
    for (const p of props) {
      if (p.itemId && collectedWorldItemIds.includes(p.itemId)) continue;
      if (p.itemId && discoveredLoreNoteIds.includes(p.itemId)) continue;
      // Crops sprout visibly once Terrace Farm is restored
      if (p.type === 'crop_wheat' && !restoredZoneIds.includes('terrace_farm')) continue;

      let list = map.get(p.type);
      if (!list) {
        list = [];
        map.set(p.type, list);
      }
      list.push(p);
    }
    return Array.from(map.entries());
  }, [props, collectedWorldItemIds, discoveredLoreNoteIds, restoredZoneIds]);

  return (
    <group name="instanced-props-layer">
      {grouped.map(([type, list]) => (
        <InstancedPropGroup
          key={type}
          type={type}
          placements={list}
          material={material}
          castShadow={type !== 'cloud'}
        />
      ))}
    </group>
  );
}
