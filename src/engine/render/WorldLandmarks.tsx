import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildDetailVoxelGeometry, type DetailBoxSpec } from './Entities';
import type { InteractablePlacement } from '../voxel/islandGenerator';
import { useGameStore } from '../../stores/useGameStore';

const FINE = 0.0625;

// ============================================================================
// 1. CODING TERMINAL LANDMARK
// ============================================================================

interface TerminalVisualTheme {
  primary: string;
  secondary: string;
  plinthStone: string;
  accentMetal: string;
  codeColor1: string;
  codeColor2: string;
  screenBacking: string;
}

function getTerminalTheme(id: string): TerminalVisualTheme {
  switch (id) {
    case 'beacon_terminal':
      return {
        primary: '#5CE1E6',
        secondary: '#F2B544',
        plinthStone: '#EDE4D0',
        accentMetal: '#A8773D',
        codeColor1: '#5CE1E6',
        codeColor2: '#F2B544',
        screenBacking: '#18364A',
      };
    case 'bit_terminal':
      return {
        primary: '#6DBE4B',
        secondary: '#4BACE8',
        plinthStone: '#C6CED2',
        accentMetal: '#7A5233',
        codeColor1: '#6DBE4B',
        codeColor2: '#4BACE8',
        screenBacking: '#1B3D2B',
      };
    case 'gate_console':
      return {
        primary: '#4BACE8',
        secondary: '#E0603F',
        plinthStone: '#5E666D',
        accentMetal: '#3A464C',
        codeColor1: '#4BACE8',
        codeColor2: '#E0603F',
        screenBacking: '#172738',
      };
    case 'farm_console':
      return {
        primary: '#4CD7E0',
        secondary: '#76BF31',
        plinthStone: '#99A2A8',
        accentMetal: '#A8773D',
        codeColor1: '#76BF31',
        codeColor2: '#4CD7E0',
        screenBacking: '#153629',
      };
    case 'workshop_console':
      return {
        primary: '#F2B544',
        secondary: '#E5793A',
        plinthStone: '#778087',
        accentMetal: '#8F5D3C',
        codeColor1: '#F2B544',
        codeColor2: '#E5793A',
        screenBacking: '#382515',
      };
    default:
      return {
        primary: '#5CE1E6',
        secondary: '#F2B544',
        plinthStone: '#EDE4D0',
        accentMetal: '#A8773D',
        codeColor1: '#5CE1E6',
        codeColor2: '#F2B544',
        screenBacking: '#18364A',
      };
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
  const holoRef = useRef<THREE.Group>(null);
  const theme = useMemo(() => getTerminalTheme(id), [id]);

  // High-craft thematic terminal desk & screen geometry
  const terminalGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Heavy stepped architectural plinth base
      { x: -7, y: 0, z: -7, w: 14, h: 2, d: 14, hex: '#5E666D' },
      { x: -6, y: 2, z: -6, w: 12, h: 2, d: 12, hex: theme.plinthStone },
      // Bronze corner footing braces
      { x: -6.5, y: 0.5, z: -6.5, w: 2, h: 3, d: 2, hex: theme.accentMetal },
      { x: 4.5, y: 0.5, z: -6.5, w: 2, h: 3, d: 2, hex: theme.accentMetal },
      { x: -6.5, y: 0.5, z: 4.5, w: 2, h: 3, d: 2, hex: theme.accentMetal },
      { x: 4.5, y: 0.5, z: 4.5, w: 2, h: 3, d: 2, hex: theme.accentMetal },

      // 2. Carved stone pedestal shaft & bronze banding
      { x: -4, y: 4, z: -4, w: 8, h: 7, d: 8, hex: theme.plinthStone },
      { x: -4.5, y: 6.5, z: -4.5, w: 9, h: 1.5, d: 9, hex: theme.accentMetal },
      { x: -4.8, y: 10, z: -4.8, w: 9.6, h: 1.2, d: 9.6, hex: theme.accentMetal },

      // 3. Desk console table & side support wings
      { x: -6.5, y: 11, z: -5, w: 13, h: 2.5, d: 10, hex: '#C6CED2' },
      { x: -7.2, y: 12, z: -2.5, w: 1.4, h: 7.5, d: 5, hex: theme.accentMetal },
      { x: 5.8, y: 12, z: -2.5, w: 1.4, h: 7.5, d: 5, hex: theme.accentMetal },

      // 4. Slanted display housing & dark screen bezel
      { x: -5.5, y: 13.5, z: -4.5, w: 11, h: 7, d: 4, hex: '#2A3B4C' },
      { x: -4.8, y: 14.2, z: -0.8, w: 9.6, h: 5.4, d: 0.8, hex: theme.screenBacking },

      // 5. Luminous Python code bars on screen
      { x: -3.8, y: 18.0, z: -0.1, w: 2.4, h: 0.7, d: 0.3, hex: theme.codeColor2, emissive: 1.2 },
      { x: -0.8, y: 18.0, z: -0.1, w: 4.2, h: 0.7, d: 0.3, hex: theme.codeColor1, emissive: 1.2 },
      { x: -3.8, y: 16.6, z: -0.1, w: 5.2, h: 0.7, d: 0.3, hex: '#6DBE4B', emissive: 1.15 },
      { x: -2.6, y: 15.2, z: -0.1, w: 6.0, h: 0.7, d: 0.3, hex: theme.codeColor1, emissive: 1.2 },

      // 6. Angled tactile keyboard & illuminated prompt keys
      { x: -4.5, y: 13.2, z: 0.8, w: 9, h: 0.9, d: 3.5, hex: '#3A464C' },
      { x: -3.2, y: 13.9, z: 1.4, w: 2.4, h: 0.5, d: 2, hex: theme.codeColor2, emissive: 1.0 },
      { x: 0.8, y: 13.9, z: 1.4, w: 2.4, h: 0.5, d: 2, hex: theme.codeColor1, emissive: 1.0 },

      // 7. Thematic side accessories per terminal
      ...(id === 'beacon_terminal'
        ? [
            // Celestial astrolabe sextant bracket & brass star dial
            { x: 6, y: 13, z: 0, w: 2, h: 6, d: 2, hex: '#A8773D' },
            { x: 5.5, y: 18.5, z: -0.5, w: 3, h: 3, d: 3, hex: '#F2B544', emissive: 0.8 },
            { x: -7.5, y: 13, z: -1, w: 1.5, h: 4, d: 2, hex: '#5CE1E6', emissive: 0.9 },
          ]
        : id === 'bit_terminal'
        ? [
            // Comms telemetry mast & blinking satellite beacon antenna
            { x: 6.2, y: 13, z: -1, w: 1.2, h: 8, d: 1.2, hex: '#7A5233' },
            { x: 5.8, y: 21, z: -1.4, w: 2, h: 2, d: 2, hex: '#4BACE8', emissive: 1.25 },
            // Cartridge slot bay
            { x: -7.5, y: 13, z: 0, w: 1.5, h: 3, d: 3, hex: '#6DBE4B', emissive: 0.85 },
          ]
        : id === 'gate_console'
        ? [
            // Fortified iron lock plate & twin mechanical tumblers
            { x: 6, y: 13, z: -1, w: 1.8, h: 5, d: 3, hex: '#3A464C' },
            { x: 6.2, y: 17.5, z: 0, w: 1.4, h: 2.5, d: 1.4, hex: '#E0603F', emissive: 1.1 },
            { x: -7.5, y: 13, z: -1, w: 1.6, h: 4, d: 3, hex: '#4BACE8', emissive: 0.9 },
          ]
        : id === 'farm_console'
        ? [
            // Bronze irrigation conduit pipe & pressure barometer dial
            { x: 6.2, y: 11, z: -2, w: 1.5, h: 7, d: 1.5, hex: '#A8773D' },
            { x: 5.6, y: 18, z: -2.6, w: 2.6, h: 2.6, d: 1.2, hex: '#4CD7E0', emissive: 1.1 },
            // Seed flask hopper
            { x: -7.5, y: 13, z: 0, w: 1.6, h: 4.5, d: 2, hex: '#76BF31', emissive: 0.9 },
          ]
        : [
            // Workshop forge exhaust stack & brass gear assembly
            { x: 6.2, y: 12, z: -1.5, w: 1.8, h: 7, d: 1.8, hex: '#8F5D3C' },
            { x: 5.7, y: 19, z: -2, w: 2.8, h: 2.8, d: 2.8, hex: '#E5793A', emissive: 1.15 },
            // Blueprint clamp arm
            { x: -7.5, y: 13, z: -0.5, w: 1.5, h: 4, d: 2, hex: '#F2B544', emissive: 0.9 },
          ]),
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [id, theme]);

  // Floating 3D Holographic Symbol / Polyhedron above screen
  const holoGeo = useMemo(() => {
    let boxes: DetailBoxSpec[] = [];
    switch (id) {
      case 'beacon_terminal':
        // Turquoise Celestial Star Polyhedron + orbiting star brackets
        boxes = [
          // Central 8-pointed star core
          { x: -1.5, y: -1.5, z: -1.5, w: 3, h: 3, d: 3, hex: '#5CE1E6', emissive: 1.25 },
          { x: -0.8, y: -2.8, z: -0.8, w: 1.6, h: 5.6, d: 1.6, hex: '#F2B544', emissive: 1.2 },
          { x: -2.8, y: -0.8, z: -0.8, w: 5.6, h: 1.6, d: 1.6, hex: '#5CE1E6', emissive: 1.2 },
          { x: -0.8, y: -0.8, z: -2.8, w: 1.6, h: 1.6, d: 5.6, hex: '#FFF5D6', emissive: 1.25 },
          // Orbiting celestial code brackets
          { x: -3.5, y: -2.5, z: 0, w: 0.6, h: 5, d: 0.6, hex: '#5CE1E6', emissive: 1.15 },
          { x: 2.9, y: -2.5, z: 0, w: 0.6, h: 5, d: 0.6, hex: '#5CE1E6', emissive: 1.15 },
        ];
        break;

      case 'bit_terminal':
        // Emerald Data Cube + satellite bit nodes
        boxes = [
          // Central data matrix cube
          { x: -1.8, y: -1.8, z: -1.8, w: 3.6, h: 3.6, d: 3.6, hex: '#6DBE4B', emissive: 1.2 },
          { x: -1.2, y: -1.2, z: -2.2, w: 2.4, h: 2.4, d: 4.4, hex: '#4BACE8', emissive: 1.25 },
          // Corner data vertices
          { x: -2.2, y: 1.4, z: -2.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.3 },
          { x: 1.2, y: 1.4, z: -2.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.3 },
          { x: -2.2, y: -2.4, z: 1.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.3 },
          { x: 1.2, y: -2.4, z: 1.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.3 },
        ];
        break;

      case 'gate_console':
        // Azure Rune Lock & Security Shield
        boxes = [
          // Security shield body
          { x: -2, y: -2, z: -0.8, w: 4, h: 4, d: 1.6, hex: '#4BACE8', emissive: 1.2 },
          { x: -1.4, y: -3.2, z: -0.6, w: 2.8, h: 1.6, d: 1.2, hex: '#355C8C', emissive: 1.1 },
          // Rune lock padlock shackle
          { x: -1.8, y: 1.8, z: -0.5, w: 0.8, h: 2.2, d: 1, hex: '#F2B544', emissive: 1.25 },
          { x: 1.0, y: 1.8, z: -0.5, w: 0.8, h: 2.2, d: 1, hex: '#F2B544', emissive: 1.25 },
          { x: -1.8, y: 3.6, z: -0.5, w: 3.6, h: 0.8, d: 1, hex: '#F2B544', emissive: 1.25 },
          // Glowing center rune keyway
          { x: -0.5, y: -1, z: 0.8, w: 1, h: 2, d: 0.4, hex: '#E0603F', emissive: 1.3 },
        ];
        break;

      case 'farm_console':
        // Jade Irrigation Sprout & Soil Moisture Droplets
        boxes = [
          // Stem and twin leaves
          { x: -0.6, y: -2.5, z: -0.6, w: 1.2, h: 4.5, d: 1.2, hex: '#76BF31', emissive: 1.15 },
          { x: -2.5, y: 0.5, z: -0.5, w: 2.2, h: 1.4, d: 1, hex: '#4CD7E0', emissive: 1.25 },
          { x: 0.5, y: 1.2, z: -0.5, w: 2.2, h: 1.4, d: 1, hex: '#76BF31', emissive: 1.2 },
          // Floating moisture droplet prism
          { x: -0.8, y: 2.8, z: -0.8, w: 1.6, h: 1.8, d: 1.6, hex: '#4CD7E0', emissive: 1.3 },
          { x: -0.4, y: 4.4, z: -0.4, w: 0.8, h: 1.0, d: 0.8, hex: '#9EEFFF', emissive: 1.35 },
        ];
        break;

      case 'workshop_console':
        // Amber Clockwork Cog & Blueprint Grid Crosshairs
        boxes = [
          // Central gear hub & axle
          { x: -1.2, y: -1.2, z: -0.8, w: 2.4, h: 2.4, d: 1.6, hex: '#F2B544', emissive: 1.25 },
          { x: -0.5, y: -0.5, z: -1.2, w: 1.0, h: 1.0, d: 2.4, hex: '#FFF5D6', emissive: 1.3 },
          // 4 Cardinal cog teeth
          { x: -0.9, y: 1.8, z: -0.6, w: 1.8, h: 1.4, d: 1.2, hex: '#E5793A', emissive: 1.2 },
          { x: -0.9, y: -3.2, z: -0.6, w: 1.8, h: 1.4, d: 1.2, hex: '#E5793A', emissive: 1.2 },
          { x: -3.2, y: -0.9, z: -0.6, w: 1.4, h: 1.8, d: 1.2, hex: '#E5793A', emissive: 1.2 },
          { x: 1.8, y: -0.9, z: -0.6, w: 1.4, h: 1.8, d: 1.2, hex: '#E5793A', emissive: 1.2 },
          // Diagonal teeth
          { x: 1.4, y: 1.4, z: -0.6, w: 1.2, h: 1.2, d: 1.2, hex: '#F2B544', emissive: 1.15 },
          { x: -2.6, y: -2.6, z: -0.6, w: 1.2, h: 1.2, d: 1.2, hex: '#F2B544', emissive: 1.15 },
          { x: 1.4, y: -2.6, z: -0.6, w: 1.2, h: 1.2, d: 1.2, hex: '#F2B544', emissive: 1.15 },
          { x: -2.6, y: 1.4, z: -0.6, w: 1.2, h: 1.2, d: 1.2, hex: '#F2B544', emissive: 1.15 },
        ];
        break;
    }
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [id]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (holoRef.current) {
      holoRef.current.rotation.y = t * 1.3;
      holoRef.current.rotation.x = Math.sin(t * 1.6) * 0.08;
      holoRef.current.position.y = 1.48 + Math.sin(t * 2.5) * 0.06;
    }
  });

  return (
    <group position={position} rotation={[0, yaw, 0]} name={`landmark-${id}`}>
      {/* Voxel carved plinth & desk */}
      <mesh geometry={terminalGeo} material={material} castShadow receiveShadow />

      {/* Floating 3D Holographic Assembly above screen */}
      <group ref={holoRef} position={[0, 1.48, -0.05]}>
        <mesh geometry={holoGeo} material={material} />
        {/* Thematic Hologram Aura Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.014, 8, 24]} />
          <meshBasicMaterial color={theme.primary} transparent opacity={0.65} />
        </mesh>
      </group>

      {/* Screen Area Light */}
      <pointLight position={[0, 1.15, 0.2]} color={theme.primary} intensity={0.9} distance={4} decay={2} />
    </group>
  );
}

// ============================================================================
// 2. NEO PEDESTAL LANDMARK
// ============================================================================

function NeoPedestalLandmark({
  position,
  material,
}: {
  position: [number, number, number];
  material: THREE.Material;
}) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Mesh>(null);

  // Ancient sculpted stasis pod casing with glowing energy tubes
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Grand stepped circular/octagonal Awakening Sanctuary Dais
      { x: -8, y: 0, z: -8, w: 16, h: 2.5, d: 16, hex: '#778087' },
      { x: -6.5, y: 2.5, z: -6.5, w: 13, h: 2, d: 13, hex: '#99A2A8' },
      { x: -5, y: 4.5, z: -5, w: 10, h: 1.5, d: 10, hex: '#C6CED2' },

      // 2. Rear curved Stasis Pod Casing Backshell (Ancient magitech reliquary)
      { x: -5.5, y: 4.5, z: -7, w: 11, h: 14, d: 3, hex: '#355C8C' },
      { x: -4.5, y: 6, z: -5.5, w: 9, h: 11.5, d: 2, hex: '#1E324D' },
      { x: -3.5, y: 17.5, z: -7, w: 7, h: 2, d: 3, hex: '#A8773D' },

      // 3. Glowing turquoise energy tubes running along pod and floor
      { x: -4.2, y: 6.5, z: -5.2, w: 1.2, h: 11, d: 1.2, hex: '#5CE1E6', emissive: 1.2 },
      { x: 3.0, y: 6.5, z: -5.2, w: 1.2, h: 11, d: 1.2, hex: '#5CE1E6', emissive: 1.2 },
      { x: -3, y: 13, z: -5.2, w: 6, h: 1.2, d: 1.2, hex: '#5ED8CB', emissive: 1.15 },
      // Floor power conduits feeding to the central pedestal
      { x: -1, y: 4.7, z: -4.5, w: 2, h: 0.6, d: 4.5, hex: '#5CE1E6', emissive: 1.2 },
      { x: -3.5, y: 4.7, z: -2, w: 7, h: 0.6, d: 1.2, hex: '#5ED8CB', emissive: 1.1 },

      // 4. Carved bronze pedestal column & cresting collar
      { x: -3.2, y: 5.5, z: -2, w: 6.4, h: 6, d: 6.4, hex: '#A8773D' },
      { x: -4.0, y: 11.5, z: -2.8, w: 8, h: 1.8, d: 8, hex: '#F2B544' },

      // 5. 4 Cradling brass stasis claws
      { x: -4.4, y: 13, z: -1, w: 1.4, h: 4, d: 2, hex: '#A8773D' },
      { x: 3.0, y: 13, z: -1, w: 1.4, h: 4, d: 2, hex: '#A8773D' },
      { x: -1, y: 13, z: -3.4, w: 2, h: 4, d: 1.4, hex: '#A8773D' },
      { x: -1, y: 13, z: 1.4, w: 2, h: 4, d: 1.4, hex: '#A8773D' },

      // 6. Glowing turquoise activation socket
      { x: -2.5, y: 12.8, z: -2.5, w: 5, h: 1.2, d: 5, hex: '#5ED8CB', emissive: 1.2 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Floating Activation Orb
  const orbGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -1.8, y: -1.8, z: -1.8, w: 3.6, h: 3.6, d: 3.6, hex: '#5CE1E6', emissive: 1.2 },
      { x: -1.0, y: -2.8, z: -1.0, w: 2.0, h: 5.6, d: 2.0, hex: '#FFF5D6', emissive: 1.3 },
      { x: -2.8, y: -1.0, z: -1.0, w: 5.6, h: 2.0, d: 2.0, hex: '#5ED8CB', emissive: 1.15 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 1.1;
      outerRingRef.current.rotation.x = Math.sin(t * 0.8) * 0.35;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = -t * 1.4;
      innerRingRef.current.rotation.z = Math.cos(t * 0.9) * 0.45;
    }
    if (orbRef.current) {
      orbRef.current.rotation.y = t * 1.2;
      orbRef.current.position.y = 1.15 + Math.sin(t * 2.4) * 0.07;
    }
  });

  return (
    <group position={position} name="landmark-neo-pedestal">
      {/* Ancient Stasis Pod Pod Dais */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Floating Activation Orb */}
      <mesh ref={orbRef} geometry={orbGeo} material={material} position={[0, 1.15, 0]} />

      {/* Primary Celestial Gyro Ring */}
      <mesh ref={outerRingRef} position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.44, 0.024, 10, 32]} />
        <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>

      {/* Secondary Inclined Celestial Ring */}
      <mesh ref={innerRingRef} position={[0, 1.12, 0]} rotation={[0.4, 0.5, 0]}>
        <torusGeometry args={[0.34, 0.018, 8, 24]} />
        <meshStandardMaterial color="#FFF5D6" emissive="#FFF5D6" emissiveIntensity={0.8} roughness={0.2} />
      </mesh>

      {/* Floor Activation Matrix Light */}
      <pointLight position={[0, 1.2, 0]} color="#5CE1E6" intensity={1.8} distance={8} decay={2} />
    </group>
  );
}

// ============================================================================
// 3. BEACON TOWER LANDMARK (MENARA SUAR)
// ============================================================================

function BeaconTowerLandmark({
  position,
  restored,
  material,
}: {
  position: [number, number, number];
  restored: boolean;
  material: THREE.Material;
}) {
  const outerGyroRef = useRef<THREE.Group>(null);
  const midGyroRef = useRef<THREE.Group>(null);
  const innerGyroRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const beamOuterRef = useRef<THREE.Mesh>(null);

  // Grand architectural beacon tower with balcony balustrade & peaked dome roof
  const towerGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Heavy stepped granite foundation plinth (y: 0..6)
      { x: -9, y: 0, z: -9, w: 18, h: 2.5, d: 18, hex: '#5E666D' },
      { x: -8, y: 2.5, z: -8, w: 16, h: 2, d: 16, hex: '#778087' },
      { x: -7, y: 4.5, z: -7, w: 14, h: 2, d: 14, hex: '#99A2A8' },
      // 4 Corner buttress plinths
      { x: -9.5, y: 0, z: -9.5, w: 3, h: 6, d: 3, hex: '#3A464C' },
      { x: 6.5, y: 0, z: -9.5, w: 3, h: 6, d: 3, hex: '#3A464C' },
      { x: -9.5, y: 0, z: 6.5, w: 3, h: 6, d: 3, hex: '#3A464C' },
      { x: 6.5, y: 0, z: 6.5, w: 3, h: 6, d: 3, hex: '#3A464C' },

      // 2. Sandstone & Red-Coral Tower Body (y: 6.5..34)
      // Tier 1 body
      { x: -5.5, y: 6.5, z: -5.5, w: 11, h: 8.5, d: 11, hex: '#EDE4D0' },
      { x: -5.8, y: 6.5, z: -5.8, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      { x: 4.3, y: 6.5, z: -5.8, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      { x: -5.8, y: 6.5, z: 4.3, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      { x: 4.3, y: 6.5, z: 4.3, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      // Lower coral band
      { x: -5.8, y: 15, z: -5.8, w: 11.6, h: 3, d: 11.6, hex: '#D9433B' },

      // Tier 2 body with illuminated window embrasures
      { x: -5, y: 18, z: -5, w: 10, h: 8, d: 10, hex: '#EDE4D0' },
      { x: -1.2, y: 20, z: -5.3, w: 2.4, h: 4, d: 0.6, hex: '#F2B544', emissive: 0.95 },
      { x: -1.2, y: 20, z: 4.7, w: 2.4, h: 4, d: 0.6, hex: '#F2B544', emissive: 0.95 },
      { x: -5.3, y: 20, z: -1.2, w: 0.6, h: 4, d: 2.4, hex: '#F2B544', emissive: 0.95 },
      { x: 4.7, y: 20, z: -1.2, w: 0.6, h: 4, d: 2.4, hex: '#F2B544', emissive: 0.95 },
      // Mid coral band
      { x: -5.3, y: 26, z: -5.3, w: 10.6, h: 3, d: 10.6, hex: '#D9433B' },

      // Tier 3 upper neck & corbels
      { x: -4.5, y: 29, z: -4.5, w: 9, h: 5, d: 9, hex: '#EDE4D0' },
      // Corbel brackets supporting the grand balcony
      { x: -6.5, y: 32.5, z: -2, w: 2, h: 2, d: 4, hex: '#A8773D' },
      { x: 4.5, y: 32.5, z: -2, w: 2, h: 2, d: 4, hex: '#A8773D' },
      { x: -2, y: 32.5, z: -6.5, w: 4, h: 2, d: 2, hex: '#A8773D' },
      { x: -2, y: 32.5, z: 4.5, w: 4, h: 2, d: 2, hex: '#A8773D' },

      // 3. Grand Balcony Deck & Balustrade (y: 34..41)
      // Balcony floor platform
      { x: -7.5, y: 34, z: -7.5, w: 15, h: 2, d: 15, hex: '#C6CED2' },
      { x: -7.8, y: 35.5, z: -7.8, w: 15.6, h: 0.8, d: 15.6, hex: '#A8773D' },

      // Balustrade corner newel posts
      { x: -7.4, y: 36, z: -7.4, w: 1.6, h: 4.5, d: 1.6, hex: '#3A464C' },
      { x: 5.8, y: 36, z: -7.4, w: 1.6, h: 4.5, d: 1.6, hex: '#3A464C' },
      { x: -7.4, y: 36, z: 5.8, w: 1.6, h: 4.5, d: 1.6, hex: '#3A464C' },
      { x: 5.8, y: 36, z: 5.8, w: 1.6, h: 4.5, d: 1.6, hex: '#3A464C' },

      // Balustrade intermediate spindles along all 4 sides
      { x: -1, y: 36, z: -7.3, w: 2, h: 4, d: 1, hex: '#A8773D' },
      { x: -1, y: 36, z: 6.3, w: 2, h: 4, d: 1, hex: '#A8773D' },
      { x: -7.3, y: 36, z: -1, w: 1, h: 4, d: 2, hex: '#A8773D' },
      { x: 6.3, y: 36, z: -1, w: 1, h: 4, d: 2, hex: '#A8773D' },

      // Balustrade top rails on North, South, East, West
      { x: -7.4, y: 40, z: -7.4, w: 14.8, h: 0.8, d: 1.2, hex: '#F2B544' },
      { x: -7.4, y: 40, z: 6.2, w: 14.8, h: 0.8, d: 1.2, hex: '#F2B544' },
      { x: -7.4, y: 40, z: -7.4, w: 1.2, h: 0.8, d: 14.8, hex: '#F2B544' },
      { x: 6.2, y: 40, z: -7.4, w: 1.2, h: 0.8, d: 14.8, hex: '#F2B544' },

      // 4. Open-Air Lantern Pavilion (y: 36..46)
      // 4 Heavy brass structural colonnade pillars framing the core
      { x: -4.5, y: 36, z: -4.5, w: 1.6, h: 10, d: 1.6, hex: '#A8773D' },
      { x: 2.9, y: 36, z: -4.5, w: 1.6, h: 10, d: 1.6, hex: '#A8773D' },
      { x: -4.5, y: 36, z: 2.9, w: 1.6, h: 10, d: 1.6, hex: '#A8773D' },
      { x: 2.9, y: 36, z: 2.9, w: 1.6, h: 10, d: 1.6, hex: '#A8773D' },

      // 5. Peaked Slate Dome Roof & Spire Needle (y: 46..62)
      { x: -6.5, y: 46, z: -6.5, w: 13, h: 2, d: 13, hex: '#355C8C' },
      { x: -5, y: 48, z: -5, w: 10, h: 2.5, d: 10, hex: '#2A476E' },
      { x: -3.5, y: 50.5, z: -3.5, w: 7, h: 2.5, d: 7, hex: '#355C8C' },
      { x: -2, y: 53, z: -2, w: 4, h: 2, d: 4, hex: '#A8773D' },
      // Spire needle finial
      { x: -0.8, y: 55, z: -0.8, w: 1.6, h: 5, d: 1.6, hex: '#F2B544', emissive: 1.0 },
      { x: -0.4, y: 60, z: -0.4, w: 0.8, h: 4, d: 0.8, hex: '#FFE29A', emissive: 1.25 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Luminous pulsing multi-faceted core crystal
  const coreGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -2.5, y: -2.5, z: -2.5, w: 5, h: 5, d: 5, hex: '#F2B544', emissive: 1.25 },
      { x: -1.5, y: -4.0, z: -1.5, w: 3, h: 8, d: 3, hex: '#FFF5D6', emissive: 1.3 },
      { x: -4.0, y: -1.5, z: -1.5, w: 8, h: 3, d: 3, hex: '#5CE1E6', emissive: 1.15 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = restored ? 1.6 : 0.45;

    // Multi-tier rotating astrolabe brass gyro rings
    if (outerGyroRef.current) {
      outerGyroRef.current.rotation.y = t * speed;
      outerGyroRef.current.rotation.x = Math.sin(t * 0.9) * 0.3;
    }
    if (midGyroRef.current) {
      midGyroRef.current.rotation.x = -t * speed * 1.3;
      midGyroRef.current.rotation.z = Math.cos(t * 1.1) * 0.35;
    }
    if (innerGyroRef.current) {
      innerGyroRef.current.rotation.z = t * speed * 1.7;
      innerGyroRef.current.rotation.y = Math.sin(t * 1.4) * 0.4;
    }

    // Luminous pulsing core
    if (coreRef.current) {
      coreRef.current.rotation.y = -t * speed * 1.2;
      const pulse = restored ? 1.12 + Math.sin(t * 3.2) * 0.1 : 0.85 + Math.sin(t * 1.5) * 0.04;
      coreRef.current.scale.setScalar(pulse);
    }

    // Skyward beacon beam animation
    if (beamOuterRef.current && restored) {
      const mat = beamOuterRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.38 + Math.sin(t * 4.0) * 0.08;
      }
    }
  });

  return (
    <group position={position} name="landmark-beacon-tower">
      {/* Tower body & architectural elements */}
      <mesh geometry={towerGeo} material={material} castShadow receiveShadow />

      {/* Luminous Pulsing Core inside the Lantern Gallery (y = 2.56 u) */}
      <mesh ref={coreRef} geometry={coreGeo} material={material} position={[0, 2.56, 0]} />

      {/* Multi-Tier Rotating Astrolabe Brass Gyro Rings */}
      <group ref={outerGyroRef} position={[0, 2.56, 0]}>
        <mesh>
          <torusGeometry args={[0.48, 0.024, 10, 32]} />
          <meshStandardMaterial
            color="#F2B544"
            emissive="#F2B544"
            emissiveIntensity={restored ? 0.95 : 0.3}
            roughness={0.25}
          />
        </mesh>
      </group>

      <group ref={midGyroRef} position={[0, 2.56, 0]}>
        <mesh>
          <torusGeometry args={[0.36, 0.02, 8, 28]} />
          <meshStandardMaterial
            color="#E5A823"
            emissive="#E5A823"
            emissiveIntensity={restored ? 0.85 : 0.25}
            roughness={0.25}
          />
        </mesh>
      </group>

      <group ref={innerGyroRef} position={[0, 2.56, 0]}>
        <mesh>
          <torusGeometry args={[0.25, 0.016, 8, 24]} />
          <meshStandardMaterial
            color="#5CE1E6"
            emissive="#5CE1E6"
            emissiveIntensity={restored ? 1.0 : 0.35}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Glowing Crystal Spire Beacon Beam (Skyward beam when restored) */}
      {restored && (
        <group position={[0, 3.9, 0]}>
          {/* Inner intense beam core */}
          <mesh ref={beamRef} position={[0, 22.5, 0]}>
            <cylinderGeometry args={[0.07, 0.14, 45, 16]} />
            <meshBasicMaterial color="#FFF8DC" transparent opacity={0.88} depthWrite={false} />
          </mesh>

          {/* Outer soft additive volumetric glow beam */}
          <mesh ref={beamOuterRef} position={[0, 22.5, 0]}>
            <cylinderGeometry args={[0.28, 0.52, 45, 16]} />
            <meshBasicMaterial
              color="#5CE1E6"
              transparent
              opacity={0.38}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Beacon Lantern Light */}
      <pointLight
        position={[0, 2.6, 0]}
        color={restored ? '#FFE29A' : '#F2B544'}
        intensity={restored ? 3.6 : 0.8}
        distance={restored ? 16 : 6}
        decay={2}
      />
    </group>
  );
}

// ============================================================================
// 4. GATEHOUSE RUNE PLINTHS LANDMARK
// ============================================================================

function GatehouseRunePlinth({
  position,
  color,
  runeHex,
  phase,
  material,
}: {
  position: [number, number, number];
  color: string;
  runeHex: string;
  phase: number;
  material: THREE.Material;
}) {
  const obeliskRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);

  // Carved stone pedestal with bronze corner brackets & runic channels
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Stepped carved stone base
      { x: -5, y: 0, z: -5, w: 10, h: 2, d: 10, hex: '#5E666D' },
      { x: -4, y: 2, z: -4, w: 8, h: 1.5, d: 8, hex: '#778087' },

      // Carved column shaft
      { x: -3, y: 3.5, z: -3, w: 6, h: 6, d: 6, hex: '#99A2A8' },
      // 4 Bronze corner clamps
      { x: -3.4, y: 4, z: -3.4, w: 1.2, h: 5, d: 1.2, hex: '#A8773D' },
      { x: 2.2, y: 4, z: -3.4, w: 1.2, h: 5, d: 1.2, hex: '#A8773D' },
      { x: -3.4, y: 4, z: 2.2, w: 1.2, h: 5, d: 1.2, hex: '#A8773D' },
      { x: 2.2, y: 4, z: 2.2, w: 1.2, h: 5, d: 1.2, hex: '#A8773D' },

      // Inlaid runic channel
      { x: -1, y: 4, z: -3.2, w: 2, h: 5, d: 0.4, hex: runeHex, emissive: 1.1 },
      { x: -1, y: 4, z: 2.8, w: 2, h: 5, d: 0.4, hex: runeHex, emissive: 1.1 },

      // Flared capital basin
      { x: -4.5, y: 9.5, z: -4.5, w: 9, h: 1.5, d: 9, hex: '#C6CED2' },
      // 4 Cradling prongs
      { x: -4, y: 11, z: -1, w: 1.2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: 2.8, y: 11, z: -1, w: 1.2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: -1, y: 11, z: -4, w: 2, h: 2.5, d: 1.2, hex: '#A8773D' },
      { x: -1, y: 11, z: 2.8, w: 2, h: 2.5, d: 1.2, hex: '#A8773D' },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [runeHex]);

  // Floating rotating glowing runic obelisk
  const obeliskGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Tapered spire core
      { x: -2, y: -5, z: -2, w: 4, h: 10, d: 4, hex: '#2A476E' },
      { x: -1.2, y: 5, z: -1.2, w: 2.4, h: 4, d: 2.4, hex: '#355C8C' },
      { x: -0.6, y: 9, z: -0.6, w: 1.2, h: 2.5, d: 1.2, hex: '#A8773D' },
      // Inlaid glowing runic glyph bands
      { x: -2.2, y: -2, z: -1, w: 4.4, h: 1.4, d: 2, hex: runeHex, emissive: 1.25 },
      { x: -1, y: -2, z: -2.2, w: 2, h: 1.4, d: 4.4, hex: runeHex, emissive: 1.25 },
      { x: -2.2, y: 2, z: -1, w: 4.4, h: 1.4, d: 2, hex: runeHex, emissive: 1.25 },
      { x: -1, y: 2, z: -2.2, w: 2, h: 1.4, d: 4.4, hex: runeHex, emissive: 1.25 },
      // Radiant crystal apex
      { x: -1.2, y: -4.5, z: -1.2, w: 2.4, h: 8, d: 2.4, hex: color, emissive: 1.2 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [color, runeHex]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (obeliskRef.current) {
      obeliskRef.current.rotation.y = t * 1.1;
      obeliskRef.current.rotation.z = Math.sin(t * 1.4) * 0.06;
      obeliskRef.current.position.y = 0.95 + Math.sin(t * 2.2) * 0.08;
    }
    if (auraRef.current) {
      auraRef.current.rotation.z = -t * 0.8;
    }
  });

  return (
    <group position={position} name={`gate-rune-plinth-${runeHex}`}>
      {/* Carved stone plinth */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Floating Rotating Glowing Runic Obelisk */}
      <group ref={obeliskRef} position={[0, 0.95, 0]}>
        <mesh geometry={obeliskGeo} material={material} />
      </group>

      {/* Glowing Runic Aura Ring on the pedestal rim */}
      <mesh ref={auraRef} position={[0, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.016, 8, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} roughness={0.2} />
      </mesh>

      {/* Atmospheric Point Light */}
      <pointLight position={[0, 1.05, 0]} color={color} intensity={1.8} distance={6} decay={2} />
    </group>
  );
}

// ============================================================================
// 5. CORE SHARD ALTAR LANDMARK
// ============================================================================

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
  const satelliteGroupRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  // Colossal tiered celestial altar dais & 4 corner obelisks
  const altarGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Tier 1 Base (22x3x22)
      { x: -11, y: 0, z: -11, w: 22, h: 3, d: 22, hex: '#5E666D' },
      // Tier 2 Mid-tier with gold filigree (18x3x18)
      { x: -9, y: 3, z: -9, w: 18, h: 3, d: 18, hex: '#778087' },
      // Tier 3 Sanctuary Platform (14x2.5x14)
      { x: -7, y: 6, z: -7, w: 14, h: 2.5, d: 14, hex: '#99A2A8' },

      // Inlaid celestial runic channels on the dais floor
      { x: -6, y: 8.5, z: -6, w: 12, h: 0.5, d: 12, hex: '#F2B544' },
      { x: -5, y: 8.8, z: -5, w: 10, h: 0.5, d: 10, hex: '#5ED8CB', emissive: 0.8 },

      // 4 Carved Corner Obelisk Pylons
      { x: -8.5, y: 3, z: -8.5, w: 2.5, h: 12, d: 2.5, hex: '#355C8C' },
      { x: 6.0, y: 3, z: -8.5, w: 2.5, h: 12, d: 2.5, hex: '#355C8C' },
      { x: -8.5, y: 3, z: 6.0, w: 2.5, h: 12, d: 2.5, hex: '#355C8C' },
      { x: 6.0, y: 3, z: 6.0, w: 2.5, h: 12, d: 2.5, hex: '#355C8C' },
      // Pylon golden capitals
      { x: -8.2, y: 15, z: -8.2, w: 1.9, h: 2.5, d: 1.9, hex: '#F2B544', emissive: 0.9 },
      { x: 6.3, y: 15, z: -8.2, w: 1.9, h: 2.5, d: 1.9, hex: '#F2B544', emissive: 0.9 },
      { x: -8.2, y: 15, z: 6.3, w: 1.9, h: 2.5, d: 1.9, hex: '#F2B544', emissive: 0.9 },
      { x: 6.3, y: 15, z: 6.3, w: 1.9, h: 2.5, d: 1.9, hex: '#F2B544', emissive: 0.9 },

      // 4 Curved Bronze Containment Claws cradling the central core
      { x: -4, y: 8.5, z: -1, w: 1.5, h: 5, d: 2, hex: '#A8773D' },
      { x: 2.5, y: 8.5, z: -1, w: 1.5, h: 5, d: 2, hex: '#A8773D' },
      { x: -1, y: 8.5, z: -4, w: 2, h: 5, d: 1.5, hex: '#A8773D' },
      { x: -1, y: 8.5, z: 2.5, w: 2, h: 5, d: 1.5, hex: '#A8773D' },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Colossal celestial shard crystal core
  const shardGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -3, y: -6, z: -3, w: 6, h: 12, d: 6, hex: '#5ED8CB', emissive: 1.2 },
      { x: -2, y: -8, z: -2, w: 4, h: 16, d: 4, hex: '#9EEFFF', emissive: 1.3 },
      { x: -1, y: -10, z: -1, w: 2, h: 20, d: 2, hex: '#FFF8DC', emissive: 1.35 },
      // Symmetrical crystal facet flanges
      { x: -5, y: -3, z: -1.5, w: 10, h: 6, d: 3, hex: '#4BACE8', emissive: 1.15 },
      { x: -1.5, y: -3, z: -5, w: 3, h: 6, d: 10, hex: '#4BACE8', emissive: 1.15 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Orbiting satellite shard crystal geometry
  const satelliteShardGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -1, y: -2, z: -1, w: 2, h: 4, d: 2, hex: '#5CE1E6', emissive: 1.25 },
      { x: -0.5, y: -3, z: -0.5, w: 1, h: 6, d: 1, hex: '#9EEFFF', emissive: 1.3 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mult = restored ? 1.8 : 0.6;

    // Swirling dual energy rings
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = t * mult;
      outerRingRef.current.rotation.x = Math.sin(t * 0.7) * 0.45;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y = -t * mult * 1.35;
      innerRingRef.current.rotation.z = Math.cos(t * 0.9) * 0.55;
    }

    // Celestial Core levitation and pulsing
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 0.9;
      const bob = 1.85 + Math.sin(t * 2.2) * (restored ? 0.16 : 0.07);
      crystalRef.current.position.y = bob;
      if (restored) {
        const pulse = 1.0 + Math.sin(t * 3.6) * 0.08;
        crystalRef.current.scale.setScalar(pulse);
      }
    }

    // Orbiting satellite shard crystals
    if (satelliteGroupRef.current) {
      satelliteGroupRef.current.rotation.y = t * mult * 0.85;
      satelliteGroupRef.current.position.y = 1.85 + Math.sin(t * 1.8) * 0.1;
    }

    // Pulsing light shafts
    if (beamRef.current && restored) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.42 + Math.sin(t * 3.5) * 0.1;
      }
    }
  });

  return (
    <group position={position} name="landmark-core-altar">
      {/* Grand Tiered Celestial Dais */}
      <mesh geometry={altarGeo} material={material} castShadow receiveShadow />

      {/* Floating Celestial Core Shard */}
      <mesh ref={crystalRef} geometry={shardGeo} material={material} position={[0, 1.85, 0]} />

      {/* 4 Orbiting Satellite Shard Crystals */}
      <group ref={satelliteGroupRef} position={[0, 1.85, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * Math.PI) / 2;
          const radius = 1.15;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          return (
            <mesh
              key={i}
              geometry={satelliteShardGeo}
              material={material}
              position={[x, (i % 2 === 0 ? 0.2 : -0.2), z]}
              rotation={[0.3 * (i + 1), angle, 0.2]}
            />
          );
        })}
      </group>

      {/* Swirling Dual Energy Rings */}
      <mesh ref={outerRingRef} position={[0, 1.85, 0]}>
        <torusGeometry args={[0.96, 0.045, 12, 36]} />
        <meshStandardMaterial
          color="#F2B544"
          emissive="#F2B544"
          emissiveIntensity={restored ? 0.95 : 0.3}
          roughness={0.25}
        />
      </mesh>

      <mesh ref={innerRingRef} position={[0, 1.85, 0]}>
        <torusGeometry args={[0.72, 0.038, 10, 32]} />
        <meshStandardMaterial
          color="#5CE1E6"
          emissive="#5CE1E6"
          emissiveIntensity={restored ? 1.1 : 0.35}
          roughness={0.2}
        />
      </mesh>

      {/* Glowing Stasis Matrix Ring on the Platform Floor */}
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.78, 32]} />
        <meshBasicMaterial color="#5ED8CB" transparent opacity={restored ? 0.8 : 0.35} />
      </mesh>

      {/* Pulsing Light Shafts / Stasis Beam reaching high into the sky when restored */}
      {restored && (
        <mesh ref={beamRef} position={[0, 16, 0]}>
          <cylinderGeometry args={[0.3, 0.6, 32, 16]} />
          <meshBasicMaterial
            color="#9EEFFF"
            transparent
            opacity={0.42}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Altar Radiant Light */}
      <pointLight
        position={[0, 2.2, 0]}
        color="#9EEFFF"
        intensity={restored ? 4.8 : 1.4}
        distance={restored ? 20 : 10}
        decay={2}
      />
    </group>
  );
}

// ============================================================================
// 6. BLUE CRYSTALS LANDMARK
// ============================================================================

function BlueCrystalLandmark({
  id,
  position,
  material,
}: {
  id: string;
  position: [number, number, number];
  material: THREE.Material;
}) {
  const crystalRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const sat1Ref = useRef<THREE.Mesh>(null);
  const sat2Ref = useRef<THREE.Mesh>(null);

  // Carved natural stone plinth bed with dark azure crystal root matrix
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Craggy stone bed
      { x: -4, y: 0, z: -4, w: 8, h: 1.8, d: 8, hex: '#5E666D' },
      { x: -3, y: 1.8, z: -3, w: 6, h: 1.4, d: 6, hex: '#778087' },
      // Moss pocket
      { x: -3.5, y: 1.9, z: 1, w: 2.2, h: 0.6, d: 2.2, hex: '#5FA32A' },
      // Crystal root base
      { x: -2, y: 2.8, z: -2, w: 4, h: 1.2, d: 4, hex: '#2A86A8', emissive: 0.75 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Sparkling faceted blue crystal core
  const crystalGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Main central faceted crystal spire
      { x: -1.8, y: -3.5, z: -1.8, w: 3.6, h: 7, d: 3.6, hex: '#4BACE8', emissive: 1.2 },
      { x: -1.2, y: -5.0, z: -1.2, w: 2.4, h: 10, d: 2.4, hex: '#5CE1E6', emissive: 1.25 },
      { x: -0.6, y: -6.0, z: -0.6, w: 1.2, h: 12, d: 1.2, hex: '#9EEFFF', emissive: 1.35 },
      // Symmetrical side shards
      { x: 1.6, y: -2, z: -1, w: 1.4, h: 5, d: 2, hex: '#5CE1E6', emissive: 1.15 },
      { x: -3.0, y: -2, z: 0, w: 1.4, h: 4.5, d: 2, hex: '#4BACE8', emissive: 1.15 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Deterministic phase offset based on crystal ID
  const phase = useMemo(() => {
    if (id.endsWith('1')) return 0;
    if (id.endsWith('2')) return 1.8;
    return 3.6;
  }, [id]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 1.2;
      crystalRef.current.position.y = 0.42 + Math.sin(t * 2.6) * 0.08;
    }
    if (auraRef.current) {
      auraRef.current.rotation.z = -t * 0.9;
    }
    if (sat1Ref.current) {
      const angle = t * 1.6;
      sat1Ref.current.position.x = Math.cos(angle) * 0.28;
      sat1Ref.current.position.z = Math.sin(angle) * 0.28;
      sat1Ref.current.position.y = Math.sin(t * 3.0) * 0.08 + 0.1;
      sat1Ref.current.rotation.y = t * 2.0;
    }
    if (sat2Ref.current) {
      const angle = -t * 1.4 + 2.0;
      sat2Ref.current.position.x = Math.cos(angle) * 0.34;
      sat2Ref.current.position.z = Math.sin(angle) * 0.34;
      sat2Ref.current.position.y = Math.cos(t * 2.8) * 0.08 - 0.05;
      sat2Ref.current.rotation.y = -t * 1.8;
    }
  });

  return (
    <group position={position} name={`landmark-${id}`}>
      {/* Carved natural stone bed */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Sparkling Floating Faceted Crystal Group */}
      <group ref={crystalRef} position={[0, 0.42, 0]}>
        <mesh geometry={crystalGeo} material={material} />

        {/* Orbiting Satellite Micro-Shards */}
        <mesh ref={sat1Ref} scale={[0.08, 0.16, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#9EEFFF" emissive="#9EEFFF" emissiveIntensity={1.3} roughness={0.15} />
        </mesh>

        <mesh ref={sat2Ref} scale={[0.06, 0.12, 0.06]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={1.2} roughness={0.15} />
        </mesh>
      </group>

      {/* Ground Aura Halo Ring */}
      <mesh ref={auraRef} position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.016, 8, 24]} />
        <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={0.85} roughness={0.2} />
      </mesh>

      {/* Soft Sparkling Crystal Light */}
      <pointLight position={[0, 0.55, 0]} color="#5CE1E6" intensity={1.6} distance={6} decay={2} />
    </group>
  );
}

// ============================================================================
// 7. FARM WATERWHEEL LANDMARK
// ============================================================================

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

  // Weathered timber framework, copper-banded axle, 8 double-bucket water paddles
  const wheelGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Central bronze axle & hub
      { x: -2.5, y: -2.5, z: -2.5, w: 5, h: 5, d: 6, hex: '#A8773D' },
      { x: -1.2, y: -1.2, z: -3.5, w: 2.4, h: 2.4, d: 8, hex: '#7A5233' },

      // Cardinal timber spokes
      { x: -1.2, y: -13, z: -1, w: 2.4, h: 26, d: 2, hex: '#7A5233' },
      { x: -13, y: -1.2, z: -1, w: 26, h: 2.4, d: 2, hex: '#7A5233' },

      // Diagonal timber spokes
      { x: -9, y: -9, z: -1, w: 18, h: 2, d: 2, hex: '#8F5D3C' },
      { x: -9, y: 9, z: -1, w: 18, h: 2, d: 2, hex: '#8F5D3C' },

      // 8 Water paddles with copper bucket rims
      { x: -3, y: 12, z: -2.5, w: 6, h: 2.5, d: 5, hex: '#B07D4F' },
      { x: -3, y: -14.5, z: -2.5, w: 6, h: 2.5, d: 5, hex: '#B07D4F' },
      { x: 12, y: -3, z: -2.5, w: 2.5, h: 6, d: 5, hex: '#B07D4F' },
      { x: -14.5, y: -3, z: -2.5, w: 2.5, h: 6, d: 5, hex: '#B07D4F' },

      { x: 7.5, y: 7.5, z: -2.5, w: 4, h: 4, d: 5, hex: '#B07D4F' },
      { x: -11.5, y: 7.5, z: -2.5, w: 4, h: 4, d: 5, hex: '#B07D4F' },
      { x: 7.5, y: -11.5, z: -2.5, w: 4, h: 4, d: 5, hex: '#B07D4F' },
      { x: -11.5, y: -11.5, z: -2.5, w: 4, h: 4, d: 5, hex: '#B07D4F' },

      // Bronze rim reinforcement rings
      { x: -3.2, y: 14, z: -2.6, w: 6.4, h: 0.8, d: 5.2, hex: '#A8773D' },
      { x: -3.2, y: -14.8, z: -2.6, w: 6.4, h: 0.8, d: 5.2, hex: '#A8773D' },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((_, delta) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z -= delta * (spinning ? 2.0 : 0.3);
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

// ============================================================================
// MAIN WORLD LANDMARKS LAYER
// ============================================================================

export interface WorldLandmarksProps {
  interactables: InteractablePlacement[];
  restoredZoneIds: string[];
  material: THREE.Material;
  collectedWorldItemIds?: string[];
}

export function WorldLandmarksLayer({
  interactables,
  restoredZoneIds,
  material,
  collectedWorldItemIds,
}: WorldLandmarksProps) {
  const storeCollected = useGameStore((s) => s.world.collectedWorldItemIds);
  const collected = collectedWorldItemIds ?? storeCollected ?? [];

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

  // Filter uncollected blue crystals in the world
  const activeBlueCrystals = useMemo(() => {
    return interactables.filter(
      (item) => item.id.startsWith('awakening_crystal_') && !collected.includes(item.id)
    );
  }, [interactables, collected]);

  return (
    <group name="world-landmarks-layer">
      {/* 1. NEO Awakening Pedestal */}
      {neoPedestal && (
        <NeoPedestalLandmark position={neoPedestal.position} material={material} />
      )}

      {/* 2. Coding Terminals across all 5 mission islands */}
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

      {/* 3. High-Craft Menara Suar Beacon Tower with Multi-Tier Astrolabe & Skyward Beam */}
      <BeaconTowerLandmark
        position={[-9.5, 6, 28.5]}
        restored={restoredZoneIds.includes('beacon_point')}
        material={material}
      />

      {/* 4. Gatehouse Rune Plinths Landmark (Floating Rotating Runic Obelisks over Carved Pedestals) */}
      <GatehouseRunePlinth
        position={[44.5, 9.4, -2.5]}
        color="#4BACE8"
        runeHex="#5CE1E6"
        phase={0}
        material={material}
      />
      <GatehouseRunePlinth
        position={[44.5, 9.4, 0.5]}
        color="#6DBE4B"
        runeHex="#9EEFFF"
        phase={1.7}
        material={material}
      />
      <GatehouseRunePlinth
        position={[44.5, 9.4, 3.5]}
        color="#E0603F"
        runeHex="#F2B544"
        phase={3.4}
        material={material}
      />

      {/* 5. Terrace Farm Waterfall Waterwheel */}
      <FarmWaterwheelLandmark
        position={[23.2, 10.6, -33.2]}
        spinning={restoredZoneIds.includes('terrace_farm')}
        material={material}
      />

      {/* 6. Final Core Shard Astrolabe Altar with Orbiting Satellites & Stasis Light Shafts */}
      {coreAltar && (
        <CoreShardAltarLandmark
          position={coreAltar.position}
          restored={restoredZoneIds.includes('core_spire')}
          material={material}
        />
      )}

      {/* 7. Sparkling Floating Faceted Blue Crystals */}
      {activeBlueCrystals.map((crystal) => (
        <BlueCrystalLandmark
          key={crystal.id}
          id={crystal.id}
          position={crystal.position}
          material={material}
        />
      ))}
    </group>
  );
}
