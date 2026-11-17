import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildDetailVoxelGeometry, type DetailBoxSpec } from './Entities';
import type { InteractablePlacement } from '../voxel/islandGenerator';

const FINE = 0.0625;

function getTerminalAccent(id: string): { primary: string; secondary: string } {
  switch (id) {
    case 'beacon_terminal':
      return { primary: '#5CE1E6', secondary: '#F2B544' };
    case 'bit_terminal':
      return { primary: '#6DBE4B', secondary: '#F2B544' };
    case 'gate_console':
      return { primary: '#4BACE8', secondary: '#5CE1E6' };
    case 'farm_console':
      return { primary: '#4CD7E0', secondary: '#76BF31' };
    case 'workshop_console':
      return { primary: '#5CE1E6', secondary: '#E5793A' };
    default:
      return { primary: '#5CE1E6', secondary: '#F2B544' };
  }
}

function CodingTerminalLandmark({
  position,
  id,
  yaw = -0.35,
  material,
}: {
  position: [number, number, number];
  id: string;
  yaw?: number;
  material: THREE.Material;
}) {
  const holoRef = useRef<THREE.Mesh>(null);
  const { primary, secondary } = getTerminalAccent(id);

  const terminalGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Stepped octagonal-style stone plinth (12x2x12 -> 0.75u footprint)
      { x: -6, y: 0, z: -6, w: 12, h: 2, d: 12, hex: '#778087' },
      { x: -5, y: 2, z: -5, w: 10, h: 1.5, d: 10, hex: '#99A2A8' },
      // Carved cream sandstone pillar + bronze bands
      { x: -3.5, y: 3.5, z: -3.5, w: 7, h: 8, d: 7, hex: '#E6D9BE' },
      { x: -4, y: 5, z: -4, w: 8, h: 1.5, d: 8, hex: '#A8773D' },
      // Desk housing & bronze side struts
      { x: -5.5, y: 11.5, z: -4.5, w: 11, h: 2.5, d: 9, hex: '#C6CED2' },
      { x: -6.2, y: 12, z: -2, w: 1, h: 7, d: 4, hex: '#A8773D' },
      { x: 5.2, y: 12, z: -2, w: 1, h: 7, d: 4, hex: '#A8773D' },
      // Angled display frame + dark screen backing + glowing Python code bars
      { x: -5, y: 13.5, z: -4, w: 10, h: 6.5, d: 3.5, hex: '#355C8C' },
      { x: -4.2, y: 14.3, z: -0.6, w: 8.4, h: 4.8, d: 0.6, hex: '#18364A' },
      // Bright luminous syntax code bars on screen
      { x: -3.4, y: 17.6, z: -0.1, w: 2.2, h: 0.7, d: 0.3, hex: secondary, emissive: 1.1 },
      { x: -0.6, y: 17.6, z: -0.1, w: 3.8, h: 0.7, d: 0.3, hex: primary, emissive: 1.1 },
      { x: -3.4, y: 16.3, z: -0.1, w: 4.5, h: 0.7, d: 0.3, hex: '#6DBE4B', emissive: 1.05 },
      { x: -2.4, y: 15.0, z: -0.1, w: 5.2, h: 0.7, d: 0.3, hex: primary, emissive: 1.1 },
      // Miniature glowing keyboard pad
      { x: -3.5, y: 13.6, z: 1, w: 7, h: 0.8, d: 2.8, hex: '#3A464C' },
      { x: -2.5, y: 14.2, z: 1.5, w: 2, h: 0.4, d: 1.6, hex: secondary, emissive: 0.9 },
      { x: 0.5, y: 14.2, z: 1.5, w: 2, h: 0.4, d: 1.6, hex: primary, emissive: 0.9 },
      // Copper antenna / crystal transmitter post on right side
      { x: 5.5, y: 19, z: -1, w: 1, h: 3, d: 1, hex: '#A8773D' },
      { x: 5.2, y: 22, z: -1.3, w: 1.6, h: 1.6, d: 1.6, hex: secondary, emissive: 1.15 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [primary, secondary]);

  const holoGeo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          { x: -1.2, y: -1.2, z: -1.2, w: 2.4, h: 2.4, d: 2.4, hex: primary, emissive: 1.15 },
          { x: -0.6, y: -2, z: -0.6, w: 1.2, h: 4, d: 1.2, hex: secondary, emissive: 1.15 },
        ],
        FINE,
      ),
    [primary, secondary],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (holoRef.current) {
      holoRef.current.rotation.y = t * 1.4;
      holoRef.current.position.y = 1.45 + Math.sin(t * 2.5) * 0.06;
    }
  });

  return (
    <group position={position} rotation={[0, yaw, 0]} name={`landmark-${id}`}>
      <mesh geometry={terminalGeo} material={material} castShadow receiveShadow />
      <mesh ref={holoRef} geometry={holoGeo} material={material} position={[0, 1.45, -0.05]} />
    </group>
  );
}

function NeoPedestalLandmark({
  position,
  material,
}: {
  position: [number, number, number];
  material: THREE.Material;
}) {
  const ringRef = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);

  const plinthGeo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          // Grand stepped Awakening Dais
          { x: -7, y: 0, z: -7, w: 14, h: 2, d: 14, hex: '#99A2A8' },
          { x: -5.5, y: 2, z: -5.5, w: 11, h: 2, d: 11, hex: '#C6CED2' },
          // Carved bronze core column & cresting collar
          { x: -3.5, y: 4, z: -3.5, w: 7, h: 7, d: 7, hex: '#A8773D' },
          { x: -4.5, y: 11, z: -4.5, w: 9, h: 2, d: 9, hex: '#F2B544' },
          // 4 cradling brass stasis claws
          { x: -5, y: 13, z: -1, w: 1.5, h: 3.5, d: 2, hex: '#A8773D' },
          { x: 3.5, y: 13, z: -1, w: 1.5, h: 3.5, d: 2, hex: '#A8773D' },
          { x: -1, y: 13, z: -5, w: 2, h: 3.5, d: 1.5, hex: '#A8773D' },
          { x: -1, y: 13, z: 3.5, w: 2, h: 3.5, d: 1.5, hex: '#A8773D' },
          // Glowing turquoise activation socket
          { x: -2.5, y: 13, z: -2.5, w: 5, h: 1.2, d: 5, hex: '#5ED8CB', emissive: 1.1 },
        ],
        FINE,
      ),
    [],
  );

  const orbGeo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          { x: -1.5, y: -1.5, z: -1.5, w: 3, h: 3, d: 3, hex: '#5CE1E6', emissive: 1.15 },
          { x: -0.8, y: -2.5, z: -0.8, w: 1.6, h: 5, d: 1.6, hex: '#FFF5D6', emissive: 1.15 },
        ],
        FINE,
      ),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.9;
    }
    if (orbRef.current) {
      orbRef.current.rotation.y = t * 1.2;
      orbRef.current.position.y = 1.05 + Math.sin(t * 2.4) * 0.06;
    }
  });

  return (
    <group position={position} name="landmark-neo-pedestal">
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />
      <mesh ref={orbRef} geometry={orbGeo} material={material} position={[0, 1.05, 0]} />
      <mesh ref={ringRef} position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.025, 8, 24]} />
        <meshBasicMaterial color="#5CE1E6" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function BeaconTowerLandmark({
  position,
  restored,
  material,
}: {
  position: [number, number, number];
  restored: boolean;
  material: THREE.Material;
}) {
  const gyroRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const towerGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Heavy chamfered plinth base (14x4x14 -> ~0.88u)
      { x: -7, y: 0, z: -7, w: 14, h: 3, d: 14, hex: '#778087' },
      { x: -6, y: 3, z: -6, w: 12, h: 3, d: 12, hex: '#C6CED2' },
      // Tiered sandstone & red-coral beacon body (y=6..36)
      { x: -5, y: 6, z: -5, w: 10, h: 8, d: 10, hex: '#EDE4D0' },
      { x: -5.2, y: 14, z: -5.2, w: 10.4, h: 5, d: 10.4, hex: '#D9433B' },
      { x: -4.5, y: 19, z: -4.5, w: 9, h: 7, d: 9, hex: '#EDE4D0' },
      { x: -4.7, y: 26, z: -4.7, w: 9.4, h: 5, d: 9.4, hex: '#D9433B' },
      { x: -4, y: 31, z: -4, w: 8, h: 4, d: 8, hex: '#EDE4D0' },
      // Decorative brass ribs & balcony deck
      { x: -6, y: 35, z: -6, w: 12, h: 2, d: 12, hex: '#A8773D' },
      { x: -5.5, y: 37, z: -5.5, w: 1.5, h: 6, d: 1.5, hex: '#3A464C' },
      { x: 4, y: 37, z: -5.5, w: 1.5, h: 6, d: 1.5, hex: '#3A464C' },
      { x: -5.5, y: 37, z: 4, w: 1.5, h: 6, d: 1.5, hex: '#3A464C' },
      { x: 4, y: 37, z: 4, w: 1.5, h: 6, d: 1.5, hex: '#3A464C' },
      // Slate peaked dome roof + bronze spire needle
      { x: -6, y: 43, z: -6, w: 12, h: 2, d: 12, hex: '#355C8C' },
      { x: -4.5, y: 45, z: -4.5, w: 9, h: 2, d: 9, hex: '#355C8C' },
      { x: -2.5, y: 47, z: -2.5, w: 5, h: 2, d: 5, hex: '#A8773D' },
      { x: -0.8, y: 49, z: -0.8, w: 1.6, h: 5, d: 1.6, hex: '#F2B544', emissive: 0.9 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  const lampGeo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          { x: -2.5, y: -2.5, z: -2.5, w: 5, h: 5, d: 5, hex: '#F2B544', emissive: 1.15 },
          { x: -1.5, y: -3.5, z: -1.5, w: 3, h: 7, d: 3, hex: '#FFF5D6', emissive: 1.15 },
        ],
        FINE,
      ),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = restored ? 1.5 : 0.45;
    if (gyroRef.current) {
      gyroRef.current.rotation.y = t * speed;
      gyroRef.current.rotation.x = Math.sin(t * 0.9) * 0.28;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = -t * speed * 1.2;
      const pulse = restored ? 1.08 + Math.sin(t * 3.0) * 0.08 : 0.85;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} name="landmark-beacon-tower">
      <mesh geometry={towerGeo} material={material} castShadow receiveShadow />
      <mesh ref={coreRef} geometry={lampGeo} material={material} position={[0, 2.5, 0]} />
      <group ref={gyroRef} position={[0, 2.5, 0]}>
        <mesh>
          <torusGeometry args={[0.38, 0.028, 8, 24]} />
          <meshStandardMaterial color="#F2B544" emissive="#F2B544" emissiveIntensity={restored ? 0.8 : 0.25} />
        </mesh>
      </group>
      {restored && <pointLight position={[0, 2.6, 0]} color="#FFE29A" intensity={2.2} distance={14} decay={2} />}
    </group>
  );
}

function CoreShardAltarLandmark({
  position,
  restored,
  material,
}: {
  position: [number, number, number];
  restored: boolean;
  material: THREE.Material;
}) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const crystalRef = useRef<THREE.Mesh>(null);

  const altarGeo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          { x: -10, y: 0, z: -10, w: 20, h: 3, d: 20, hex: '#5E666D' },
          { x: -8, y: 3, z: -8, w: 16, h: 2.5, d: 16, hex: '#99A2A8' },
          { x: -5, y: 5.5, z: -5, w: 10, h: 6, d: 10, hex: '#A8773D' },
          { x: -6, y: 11.5, z: -6, w: 12, h: 2, d: 12, hex: '#F2B544' },
          // 4 gilded corner obelisks
          { x: -7, y: 5.5, z: -7, w: 2, h: 10, d: 2, hex: '#3A464C' },
          { x: 5, y: 5.5, z: -7, w: 2, h: 10, d: 2, hex: '#3A464C' },
          { x: -7, y: 5.5, z: 5, w: 2, h: 10, d: 2, hex: '#3A464C' },
          { x: 5, y: 5.5, z: 5, w: 2, h: 10, d: 2, hex: '#3A464C' },
        ],
        FINE,
      ),
    [],
  );

  const shardGeo = useMemo(
    () =>
      buildDetailVoxelGeometry(
        [
          { x: -2.5, y: -4, z: -2.5, w: 5, h: 8, d: 5, hex: '#5ED8CB', emissive: 1.1 },
          { x: -1.5, y: -6, z: -1.5, w: 3, h: 12, d: 3, hex: '#9EEFFF', emissive: 1.2 },
        ],
        FINE,
      ),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mult = restored ? 1.6 : 0.6;
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = t * mult;
      outerRingRef.current.rotation.x = Math.sin(t * 0.7) * 0.4;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = -t * mult * 1.3;
      innerRingRef.current.rotation.z = Math.cos(t * 0.9) * 0.5;
    }
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 0.9;
      crystalRef.current.position.y = 1.6 + Math.sin(t * 2.2) * 0.1;
    }
  });

  return (
    <group position={position} name="landmark-core-altar">
      <mesh geometry={altarGeo} material={material} castShadow receiveShadow />
      <mesh ref={crystalRef} geometry={shardGeo} material={material} position={[0, 1.6, 0]} />
      <mesh ref={outerRingRef} position={[0, 1.6, 0]}>
        <torusGeometry args={[0.72, 0.04, 10, 32]} />
        <meshStandardMaterial color="#F2B544" emissive="#F2B544" emissiveIntensity={restored ? 0.7 : 0.2} />
      </mesh>
      <mesh ref={innerRingRef} position={[0, 1.6, 0]}>
        <torusGeometry args={[0.52, 0.035, 8, 28]} />
        <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={restored ? 0.85 : 0.3} />
      </mesh>
    </group>
  );
}

function GateRuneGem({
  position,
  color,
  phase,
}: {
  position: [number, number, number];
  color: string;
  phase: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 1.2;
      meshRef.current.position.y = position[1] + Math.sin(t * 2.5) * 0.09;
    }
  });
  return (
    <mesh ref={meshRef} position={position} scale={[0.28, 0.46, 0.28]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} roughness={0.2} />
    </mesh>
  );
}

function FarmWaterwheelLandmark({
  position,
  spinning,
  material,
}: {
  position: [number, number, number];
  spinning: boolean;
  material: THREE.Material;
}) {
  const wheelRef = useRef<THREE.Group>(null);
  const wheelGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Hub & Rim spokes
      { x: -2, y: -2, z: -2, w: 4, h: 4, d: 5, hex: '#A8773D' },
      { x: -1, y: -11, z: -1, w: 2, h: 22, d: 2, hex: '#7A5233' },
      { x: -11, y: -1, z: -1, w: 22, h: 2, d: 2, hex: '#7A5233' },
      // Paddles at 4 cardinal points + diagonal paddles
      { x: -2.5, y: 10, z: -2.5, w: 5, h: 2, d: 5, hex: '#B07D4F' },
      { x: -2.5, y: -12, z: -2.5, w: 5, h: 2, d: 5, hex: '#B07D4F' },
      { x: 10, y: -2.5, z: -2.5, w: 2, h: 5, d: 5, hex: '#B07D4F' },
      { x: -12, y: -2.5, z: -2.5, w: 2, h: 5, d: 5, hex: '#B07D4F' },
      { x: 6, y: 6, z: -2, w: 3, h: 3, d: 4, hex: '#B07D4F' },
      { x: -9, y: 6, z: -2, w: 3, h: 3, d: 4, hex: '#B07D4F' },
      { x: 6, y: -9, z: -2, w: 3, h: 3, d: 4, hex: '#B07D4F' },
      { x: -9, y: -9, z: -2, w: 3, h: 3, d: 4, hex: '#B07D4F' },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((_, delta) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z -= delta * (spinning ? 1.8 : 0.25);
    }
  });

  return (
    <group position={position} name="landmark-waterwheel">
      <group ref={wheelRef}>
        <mesh geometry={wheelGeo} material={material} castShadow receiveShadow />
      </group>
    </group>
  );
}

export interface WorldLandmarksProps {
  interactables: InteractablePlacement[];
  restoredZoneIds: string[];
  material: THREE.Material;
}

export function WorldLandmarksLayer({
  interactables,
  restoredZoneIds,
  material,
}: WorldLandmarksProps) {
  const byId = useMemo(() => {
    const map = new Map<string, InteractablePlacement>();
    for (const item of interactables) map.set(item.id, item);
    return map;
  }, [interactables]);

  const terminalIds = [
    'beacon_terminal',
    'bit_terminal',
    'gate_console',
    'farm_console',
    'workshop_console',
  ];

  const neoPedestal = byId.get('neo_pedestal');
  const coreAltar = byId.get('core_altar');

  return (
    <group name="world-landmarks-layer">
      {/* NEO Awakening Pedestal */}
      {neoPedestal && (
        <NeoPedestalLandmark position={neoPedestal.position} material={material} />
      )}

      {/* Coding Terminals across all 5 mission islands */}
      {terminalIds.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <CodingTerminalLandmark
            key={id}
            id={id}
            position={item.position}
            yaw={id === 'beacon_terminal' ? -0.45 : id === 'gate_console' ? -1.4 : -0.3}
            material={material}
          />
        );
      })}

      {/* High-craft Menara Suar Beacon Tower next to Cottage */}
      <BeaconTowerLandmark
        position={[-9.5, 6, 28.5]}
        restored={restoredZoneIds.includes('beacon_point')}
        material={material}
      />

      {/* Gatehouse Spinning Crystal Gems */}
      <GateRuneGem position={[44.5, 9.4, -2.5]} color="#4BACE8" phase={0} />
      <GateRuneGem position={[44.5, 9.4, 0.5]} color="#6DBE4B" phase={1.7} />
      <GateRuneGem position={[44.5, 9.4, 3.5]} color="#E0603F" phase={3.4} />

      {/* Terrace Farm Waterfall Waterwheel */}
      <FarmWaterwheelLandmark
        position={[23.2, 10.6, -33.2]}
        spinning={restoredZoneIds.includes('terrace_farm')}
        material={material}
      />

      {/* Final Core Shard Astrolabe Altar */}
      {coreAltar && (
        <CoreShardAltarLandmark
          position={coreAltar.position}
          restored={restoredZoneIds.includes('core_spire')}
          material={material}
        />
      )}
    </group>
  );
}
