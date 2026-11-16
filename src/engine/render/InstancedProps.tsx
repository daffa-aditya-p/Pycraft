import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildDetailVoxelGeometry, type DetailBoxSpec } from './Entities';
import type { PropPlacement } from '../voxel/islandGenerator';

const PROP_TEMPLATES: Record<PropPlacement['type'], { boxes: DetailBoxSpec[]; scale: number }> = {
  pine_small: {
    scale: 1.0,
    boxes: [
      { x: -0.5, y: 0, z: -0.5, w: 1, h: 1.5, d: 1, hex: '#6A4A2F' },
      { x: -1.5, y: 1.5, z: -1.5, w: 3, h: 1, d: 3, hex: '#2D6636' },
      { x: -1, y: 2.5, z: -1, w: 2, h: 1, d: 2, hex: '#3E8242' },
      { x: -0.5, y: 3.5, z: -0.5, w: 1, h: 1, d: 1, hex: '#5CA64A' },
    ],
  },
  pine_tall: {
    scale: 1.0,
    boxes: [
      { x: -0.5, y: 0, z: -0.5, w: 1, h: 2, d: 1, hex: '#6A4A2F' },
      { x: -2, y: 2, z: -2, w: 4, h: 1, d: 4, hex: '#2D6636' },
      { x: -1.5, y: 3, z: -1.5, w: 3, h: 1, d: 3, hex: '#3E8242' },
      { x: -1, y: 4, z: -1, w: 2, h: 1, d: 2, hex: '#3E8242' },
      { x: -0.5, y: 5, z: -0.5, w: 1, h: 1.5, d: 1, hex: '#5CA64A' },
    ],
  },
  oak: {
    scale: 1.0,
    boxes: [
      { x: -0.5, y: 0, z: -0.5, w: 1, h: 2.5, d: 1, hex: '#6A4A2F' },
      { x: -2, y: 2.5, z: -2, w: 4, h: 2, d: 4, hex: '#3E8242' },
      { x: -1.5, y: 4.5, z: -1.5, w: 3, h: 1, d: 3, hex: '#5CA64A' },
    ],
  },
  shrub: {
    scale: 0.25,
    boxes: [
      { x: -2, y: 0, z: -2, w: 4, h: 3, d: 4, hex: '#3E8242' },
      { x: -1, y: 3, z: -1, w: 2, h: 1, d: 2, hex: '#5CA64A' },
      { x: 1, y: 2, z: 1, w: 1, h: 1, d: 1, hex: '#E9B7C4' },
    ],
  },
  rock: {
    scale: 0.25,
    boxes: [
      { x: -2, y: 0, z: -2, w: 4, h: 2, d: 4, hex: '#8C9398' },
      { x: -1, y: 2, z: -1, w: 3, h: 1, d: 2, hex: '#B2B8BC' },
    ],
  },
  crystal: {
    scale: 0.125,
    boxes: [
      { x: -2, y: 0, z: -2, w: 4, h: 2, d: 4, hex: '#6E757A' },
      { x: -1, y: 2, z: -1, w: 2, h: 6, d: 2, hex: '#4BACE8', emissive: 1.05 },
      { x: 1, y: 1, z: -2, w: 2, h: 4, d: 2, hex: '#5CE1E6', emissive: 1.0 },
    ],
  },
  crate: {
    scale: 0.125,
    boxes: [
      { x: -4, y: 0, z: -4, w: 8, h: 8, d: 8, hex: '#B07D4F' },
      { x: -4, y: 3, z: -4.2, w: 8, h: 2, d: 8.4, hex: '#7A5233' },
    ],
  },
  crop_wheat: {
    scale: 0.125,
    boxes: [
      { x: -2, y: 0, z: -2, w: 1, h: 4, d: 1, hex: '#5FA32A' },
      { x: 1, y: 0, z: -1, w: 1, h: 5, d: 1, hex: '#E2CE9C' },
      { x: -1, y: 0, z: 1, w: 1, h: 4, d: 1, hex: '#E2CE9C' },
    ],
  },
  lore_note: {
    scale: 0.125,
    boxes: [
      { x: -2, y: 0, z: -2, w: 4, h: 5, d: 4, hex: '#8C9398' },
      { x: -2, y: 5, z: -2, w: 4, h: 1, d: 4, hex: '#A8773D' },
      { x: -1, y: 6, z: -1, w: 2, h: 1, d: 2, hex: '#EDE4D0', emissive: 0.6 },
    ],
  },
  cloud: {
    scale: 1.0,
    boxes: [
      { x: -3, y: 0, z: -2, w: 6, h: 2, d: 4, hex: '#F5FAFD', emissive: 0.1 },
      { x: -1, y: 2, z: -1, w: 3, h: 1, d: 2, hex: '#F5FAFD', emissive: 0.1 },
      { x: -2, y: -1, z: -1, w: 4, h: 1, d: 2, hex: '#DCEAF3' },
    ],
  },
};

export interface InstancedPropGroupProps {
  type: PropPlacement['type'];
  placements: PropPlacement[];
  material: THREE.Material;
  castShadow?: boolean;
}

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
