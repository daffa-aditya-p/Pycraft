import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildDetailVoxelGeometry, type DetailBoxSpec } from './Entities';
import type { InteractablePlacement } from '../voxel/islandGenerator';
import { useGameStore } from '../../stores/useGameStore';

const FINE = 0.0625;

// ============================================================================
// 1. CODING TERMINAL LANDMARK (5 UNIQUE THEMATIC CONSOLES)
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
        plinthStone: '#5B3A27',
        accentMetal: '#7A5233',
        codeColor1: '#6DBE4B',
        codeColor2: '#4BACE8',
        screenBacking: '#1B3D2B',
      };
    case 'gate_console':
      return {
        primary: '#4BACE8',
        secondary: '#E0603F',
        plinthStone: '#3A464C',
        accentMetal: '#1E252B',
        codeColor1: '#4BACE8',
        codeColor2: '#E0603F',
        screenBacking: '#172738',
      };
    case 'farm_console':
      return {
        primary: '#4CD7E0',
        secondary: '#76BF31',
        plinthStone: '#778087',
        accentMetal: '#A8773D',
        codeColor1: '#76BF31',
        codeColor2: '#4CD7E0',
        screenBacking: '#153629',
      };
    case 'workshop_console':
      return {
        primary: '#F2B544',
        secondary: '#E5793A',
        plinthStone: '#8F5D3C',
        accentMetal: '#5C3D27',
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

function buildTerminalGeometry(id: string): THREE.BufferGeometry {
  const boxes: DetailBoxSpec[] = [];

  switch (id) {
    case 'beacon_terminal': {
      // ----------------------------------------------------------------------
      // BEACON TERMINAL: Celestial Astrolabe Star Dial & Coastal Sandstone
      // ----------------------------------------------------------------------
      // Stepped coastal sandstone base plinth
      boxes.push(
        { x: -8, y: 0, z: -8, w: 16, h: 2, d: 16, hex: '#C6CED2' },
        { x: -7, y: 2, z: -7, w: 14, h: 2, d: 14, hex: '#EDE4D0' },
        { x: -6, y: 4, z: -6, w: 12, h: 2, d: 12, hex: '#D8CEBA' },
        // 4 Corner bronze footing brackets
        { x: -6.5, y: 0.5, z: -6.5, w: 2, h: 3.5, d: 2, hex: '#A8773D' },
        { x: 4.5, y: 0.5, z: -6.5, w: 2, h: 3.5, d: 2, hex: '#A8773D' },
        { x: -6.5, y: 0.5, z: 4.5, w: 2, h: 3.5, d: 2, hex: '#A8773D' },
        { x: 4.5, y: 0.5, z: 4.5, w: 2, h: 3.5, d: 2, hex: '#A8773D' },
        // Central pedestal shaft & gold filigree band
        { x: -4, y: 6, z: -4, w: 8, h: 5, d: 8, hex: '#EDE4D0' },
        { x: -4.5, y: 8, z: -4.5, w: 9, h: 1.2, d: 9, hex: '#F2B544', emissive: 0.75 },
        // Sandstone desktop platform
        { x: -7.5, y: 11, z: -5.5, w: 15, h: 2.5, d: 11, hex: '#EDE4D0' },
        // Inlaid celestial astrolabe star dial on desk surface
        { x: -4.5, y: 13.5, z: 0.5, w: 4, h: 0.4, d: 4, hex: '#F2B544', emissive: 0.85 },
        { x: -3.5, y: 13.9, z: 1.5, w: 2, h: 0.2, d: 2, hex: '#FFF5D6', emissive: 1.1 },
        // Chronometer gauge
        { x: 1.5, y: 13.5, z: 1.2, w: 2.5, h: 0.8, d: 2.5, hex: '#A8773D' },
        { x: 2.0, y: 14.3, z: 1.7, w: 1.5, h: 0.2, d: 1.5, hex: '#5CE1E6', emissive: 1.2 },
        // Slanted display housing
        { x: -6, y: 13.5, z: -4.5, w: 12, h: 7.5, d: 4, hex: '#2A3B4C' },
        { x: -5.2, y: 14.2, z: -1, w: 10.4, h: 6.2, d: 0.8, hex: '#18364A' },
        // Celestial code lines
        { x: -4.2, y: 18.6, z: -0.1, w: 3.2, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.25 },
        { x: -0.5, y: 18.6, z: -0.1, w: 4.5, h: 0.6, d: 0.3, hex: '#5CE1E6', emissive: 1.25 },
        { x: -4.2, y: 17.2, z: -0.1, w: 5.6, h: 0.6, d: 0.3, hex: '#6DBE4B', emissive: 1.15 },
        { x: -3.0, y: 15.8, z: -0.1, w: 6.8, h: 0.6, d: 0.3, hex: '#5CE1E6', emissive: 1.25 },
        { x: -4.2, y: 14.4, z: -0.1, w: 4.2, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.15 },
        // Right Flank: Sextant mounting bracket & vernier arc
        { x: 6.5, y: 11, z: -2, w: 1.6, h: 8, d: 4, hex: '#A8773D' },
        { x: 6.8, y: 16.5, z: -3.5, w: 1.2, h: 5.5, d: 1.4, hex: '#F2B544', emissive: 0.9 },
        { x: 6.8, y: 19.5, z: -2.2, w: 1.2, h: 1.6, d: 3.5, hex: '#5CE1E6', emissive: 1.1 },
        // Left Flank: Resonating sea crystal sensor
        { x: -8.0, y: 11, z: -1.5, w: 1.6, h: 5, d: 2.5, hex: '#A8773D' },
        { x: -8.2, y: 16, z: -1.2, w: 2, h: 4, d: 2, hex: '#5CE1E6', emissive: 1.25 }
      );
      break;
    }

    case 'bit_terminal': {
      // ----------------------------------------------------------------------
      // BIT TERMINAL: Expedition Oak Desk, Telemetry Mast & Cartridge Bay
      // ----------------------------------------------------------------------
      boxes.push(
        // Heavy oak desk footing & twin pedestal cabinets
        { x: -7.5, y: 0, z: -6.5, w: 15, h: 2, d: 13, hex: '#422817' },
        { x: -7, y: 2, z: -6, w: 4, h: 9, d: 12, hex: '#5B3A27' },
        { x: 3, y: 2, z: -6, w: 4, h: 9, d: 12, hex: '#5B3A27' },
        // Brass drawer handles
        { x: -7.3, y: 5, z: 0, w: 0.6, h: 1.5, d: 1.5, hex: '#F2B544', emissive: 0.8 },
        { x: 6.7, y: 5, z: 0, w: 0.6, h: 1.5, d: 1.5, hex: '#F2B544', emissive: 0.8 },
        // Solid expedition oak desktop
        { x: -8, y: 11, z: -7, w: 16, h: 2, d: 14, hex: '#7A5233' },
        // Brass desktop corner braces
        { x: -8.2, y: 10.8, z: -7.2, w: 2, h: 2.4, d: 2, hex: '#A8773D' },
        { x: 6.2, y: 10.8, z: -7.2, w: 2, h: 2.4, d: 2, hex: '#A8773D' },
        { x: -8.2, y: 10.8, z: 5.2, w: 2, h: 2.4, d: 2, hex: '#A8773D' },
        { x: 6.2, y: 10.8, z: 5.2, w: 2, h: 2.4, d: 2, hex: '#A8773D' },
        // Ruggedized field monitor
        { x: -5.5, y: 13, z: -5, w: 11, h: 7.5, d: 4, hex: '#243A2C' },
        { x: -4.8, y: 13.8, z: -1.2, w: 9.6, h: 6, d: 0.8, hex: '#1B3D2B' },
        // Code bars: emerald and sky blue
        { x: -4, y: 18.2, z: -0.3, w: 3, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.2 },
        { x: -0.5, y: 18.2, z: -0.3, w: 4.2, h: 0.6, d: 0.3, hex: '#6DBE4B', emissive: 1.25 },
        { x: -4, y: 16.9, z: -0.3, w: 6.5, h: 0.6, d: 0.3, hex: '#6DBE4B', emissive: 1.2 },
        { x: -3, y: 15.6, z: -0.3, w: 5.5, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.2 },
        { x: -4, y: 14.3, z: -0.3, w: 4.0, h: 0.6, d: 0.3, hex: '#9EEFFF', emissive: 1.25 },
        // Angled tactile keyboard
        { x: -4.5, y: 13, z: 0.5, w: 9, h: 0.8, d: 4, hex: '#3A464C' },
        { x: -3.2, y: 13.8, z: 1.2, w: 2.4, h: 0.4, d: 2, hex: '#6DBE4B', emissive: 0.9 },
        { x: 0.8, y: 13.8, z: 1.2, w: 2.4, h: 0.4, d: 2, hex: '#4BACE8', emissive: 0.9 },
        // Right Flank: Tall Telemetry Antenna Mast with blinking beacon
        { x: 6.5, y: 13, z: -3, w: 2, h: 3, d: 2, hex: '#5B3A27' },
        { x: 7, y: 16, z: -2.5, w: 1.2, h: 10, d: 1.2, hex: '#7A5233' },
        { x: 5.5, y: 24, z: -2.5, w: 4.2, h: 0.8, d: 1.2, hex: '#A8773D' },
        { x: 6.6, y: 26, z: -2.9, w: 2, h: 2, d: 2, hex: '#4BACE8', emissive: 1.35 },
        // Left Flank: Cartridge Bay with inserted data cartridges
        { x: -8.5, y: 13, z: -2, w: 1.6, h: 3.5, d: 4, hex: '#3A464C' },
        { x: -8.8, y: 14.5, z: -1.2, w: 1.8, h: 3.5, d: 1.2, hex: '#6DBE4B', emissive: 1.2 },
        { x: -8.8, y: 14.5, z: 0.5, w: 1.8, h: 3.5, d: 1.2, hex: '#4BACE8', emissive: 1.2 }
      );
      break;
    }

    case 'gate_console': {
      // ----------------------------------------------------------------------
      // GATE CONSOLE: Fortified Basalt Plinth, Iron Brackets & Twin Tumblers
      // ----------------------------------------------------------------------
      boxes.push(
        // Chiseled volcanic basalt base slab
        { x: -8, y: 0, z: -8, w: 16, h: 2.5, d: 16, hex: '#252D32' },
        { x: -7, y: 2.5, z: -7, w: 14, h: 4, d: 14, hex: '#3A464C' },
        // Riveted wrought iron structural bands
        { x: -7.5, y: 1.5, z: -7.5, w: 15, h: 1.2, d: 15, hex: '#1E252B' },
        { x: -7.5, y: 5.5, z: -7.5, w: 15, h: 1.2, d: 15, hex: '#1E252B' },
        // 4 Corner iron gussets
        { x: -7.5, y: 0.5, z: -7.5, w: 2, h: 6.5, d: 2, hex: '#505A61' },
        { x: 5.5, y: 0.5, z: -7.5, w: 2, h: 6.5, d: 2, hex: '#505A61' },
        { x: -7.5, y: 0.5, z: 5.5, w: 2, h: 6.5, d: 2, hex: '#505A61' },
        { x: 5.5, y: 0.5, z: 5.5, w: 2, h: 6.5, d: 2, hex: '#505A61' },
        // Basalt column shaft
        { x: -5, y: 6.5, z: -5, w: 10, h: 4.5, d: 10, hex: '#3A464C' },
        // Iron console table & hazard trim
        { x: -7.5, y: 11, z: -6, w: 15, h: 2.5, d: 12, hex: '#5E666D' },
        { x: -6, y: 11.5, z: 5.8, w: 12, h: 1.5, d: 0.5, hex: '#F2B544', emissive: 0.95 },
        // Armored security display bezel
        { x: -5.5, y: 13.5, z: -4.5, w: 11, h: 7, d: 4, hex: '#1E252B' },
        { x: -4.8, y: 14.2, z: -1, w: 9.6, h: 5.5, d: 0.8, hex: '#172738' },
        // Security cipher code lines
        { x: -4, y: 18.2, z: -0.1, w: 3.2, h: 0.6, d: 0.3, hex: '#E0603F', emissive: 1.25 },
        { x: -0.3, y: 18.2, z: -0.1, w: 4.5, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.25 },
        { x: -4, y: 16.9, z: -0.1, w: 6.0, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.2 },
        { x: -2.8, y: 15.6, z: -0.1, w: 5.5, h: 0.6, d: 0.3, hex: '#5CE1E6', emissive: 1.2 },
        { x: -4, y: 14.3, z: -0.1, w: 4.2, h: 0.6, d: 0.3, hex: '#E0603F', emissive: 1.15 },
        // Right Flank: Twin mechanical tumblers & knife switch
        { x: 6, y: 12, z: -2, w: 2.5, h: 6, d: 4, hex: '#1E252B' },
        { x: 6.5, y: 15.5, z: -1, w: 1.8, h: 2, d: 2, hex: '#E0603F', emissive: 1.2 },
        { x: 6.5, y: 13, z: -1, w: 1.8, h: 2, d: 2, hex: '#4BACE8', emissive: 1.2 },
        { x: 7.2, y: 18, z: 0.5, w: 1.2, h: 3, d: 0.8, hex: '#F2B544', emissive: 0.8 },
        // Left Flank: Armored interlock plate & status conduit
        { x: -8, y: 12, z: -2, w: 1.6, h: 5.5, d: 4, hex: '#3A464C' },
        { x: -8.3, y: 14, z: -0.5, w: 1.8, h: 2.5, d: 1.5, hex: '#4BACE8', emissive: 1.25 }
      );
      break;
    }

    case 'farm_console': {
      // ----------------------------------------------------------------------
      // FARM CONSOLE: Terraced Stone Desk, Irrigation Pipe & Barometer Dial
      // ----------------------------------------------------------------------
      boxes.push(
        // Terraced fieldstone plinth with natural moss patches
        { x: -7.5, y: 0, z: -7.5, w: 15, h: 2.5, d: 15, hex: '#5E666D' },
        { x: -6.5, y: 2.5, z: -6.5, w: 13, h: 3, d: 13, hex: '#778087' },
        { x: -6.8, y: 2.6, z: 2, w: 3.5, h: 1, d: 4, hex: '#5FA32A' },
        { x: 3.5, y: 2.6, z: -5.5, w: 2.5, h: 1, d: 3, hex: '#488220' },
        // Pedestal column with carved leaf relief
        { x: -4.5, y: 5.5, z: -4.5, w: 9, h: 5.5, d: 9, hex: '#99A2A8' },
        { x: -2, y: 6.5, z: 4.6, w: 4, h: 3.5, d: 0.6, hex: '#76BF31', emissive: 0.9 },
        // Terraced stone desk table
        { x: -7, y: 11, z: -5.5, w: 14, h: 2.5, d: 11, hex: '#99A2A8' },
        { x: -4, y: 13.5, z: 1, w: 8, h: 0.4, d: 3.5, hex: '#7A5233' },
        // Rustic bio-monitor casing
        { x: -5.5, y: 13.5, z: -4.5, w: 11, h: 7, d: 4, hex: '#354E3C' },
        { x: -4.8, y: 14.2, z: -1, w: 9.6, h: 5.5, d: 0.8, hex: '#153629' },
        // Botanical code lines
        { x: -4, y: 18.2, z: -0.1, w: 3, h: 0.6, d: 0.3, hex: '#76BF31', emissive: 1.25 },
        { x: -0.5, y: 18.2, z: -0.1, w: 4.5, h: 0.6, d: 0.3, hex: '#4CD7E0', emissive: 1.25 },
        { x: -4, y: 16.9, z: -0.1, w: 5.8, h: 0.6, d: 0.3, hex: '#76BF31', emissive: 1.2 },
        { x: -2.8, y: 15.6, z: -0.1, w: 6.0, h: 0.6, d: 0.3, hex: '#4CD7E0', emissive: 1.2 },
        { x: -4, y: 14.3, z: -0.1, w: 3.8, h: 0.6, d: 0.3, hex: '#9EEFFF', emissive: 1.15 },
        // Right Flank: Bronze irrigation conduit & pressure barometer
        { x: 6.2, y: 0, z: -2, w: 1.6, h: 18, d: 1.6, hex: '#A8773D' },
        { x: 5.5, y: 17, z: -2, w: 2, h: 1.6, d: 1.6, hex: '#A8773D' },
        { x: 6, y: 18.5, z: -2.5, w: 2.8, h: 2.8, d: 1.4, hex: '#A8773D' },
        { x: 6.3, y: 19, z: -2.7, w: 2.2, h: 2.2, d: 0.4, hex: '#4CD7E0', emissive: 1.25 },
        // Left Flank: Glass seed hopper / nutrient reservoir
        { x: -7.5, y: 11, z: -1, w: 1.8, h: 4, d: 2, hex: '#A8773D' },
        { x: -7.8, y: 14.5, z: -1, w: 2.2, h: 4.5, d: 2.2, hex: '#4CD7E0', emissive: 1.15 },
        { x: -7.5, y: 15, z: -0.7, w: 1.6, h: 2.5, d: 1.6, hex: '#76BF31', emissive: 1.3 }
      );
      break;
    }

    case 'workshop_console': {
      // ----------------------------------------------------------------------
      // WORKSHOP CONSOLE: Industrial Bronze Machine Housing, Heat Vents & Gears
      // ----------------------------------------------------------------------
      boxes.push(
        // Cast iron footing base
        { x: -8, y: 0, z: -8, w: 16, h: 2.5, d: 16, hex: '#3A464C' },
        // Cast bronze boiler body
        { x: -7, y: 2.5, z: -7, w: 14, h: 8.5, d: 14, hex: '#8F5D3C' },
        // Glowing exhaust heat vents on flanks
        { x: -7.3, y: 5, z: -4, w: 0.6, h: 4, d: 8, hex: '#E5793A', emissive: 1.3 },
        { x: 6.7, y: 5, z: -4, w: 0.6, h: 4, d: 8, hex: '#E5793A', emissive: 1.3 },
        // Riveted seams
        { x: -7.2, y: 2.5, z: -7.2, w: 14.4, h: 1, d: 14.4, hex: '#5C3D27' },
        // Machine table plate
        { x: -7.5, y: 11, z: -6, w: 15, h: 2.5, d: 12, hex: '#8F5D3C' },
        { x: -7.6, y: 12.5, z: -6.2, w: 15.2, h: 0.8, d: 12.4, hex: '#3A464C' },
        // Heavy riveted CRT terminal housing
        { x: -5.5, y: 13.5, z: -4.5, w: 11, h: 7, d: 4, hex: '#5C3D27' },
        { x: -4.8, y: 14.2, z: -1, w: 9.6, h: 5.5, d: 0.8, hex: '#382515' },
        // Amber phosphor vector code
        { x: -4, y: 18.2, z: -0.1, w: 3.5, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.25 },
        { x: 0, y: 18.2, z: -0.1, w: 4.2, h: 0.6, d: 0.3, hex: '#E5793A', emissive: 1.25 },
        { x: -4, y: 16.9, z: -0.1, w: 6.2, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.2 },
        { x: -2.6, y: 15.6, z: -0.1, w: 5.8, h: 0.6, d: 0.3, hex: '#FFF5D6', emissive: 1.25 },
        { x: -4, y: 14.3, z: -0.1, w: 4.0, h: 0.6, d: 0.3, hex: '#E5793A', emissive: 1.15 },
        // Right Flank: Gear transmission assembly & chimney stack
        { x: 6, y: 12, z: -2, w: 2, h: 6, d: 4, hex: '#5C3D27' },
        { x: 6.5, y: 16, z: -1, w: 2, h: 3, d: 3, hex: '#F2B544', emissive: 1.15 },
        { x: 6.5, y: 13, z: 0.5, w: 2, h: 2.4, d: 2.4, hex: '#E5793A', emissive: 1.15 },
        { x: 6.5, y: 19, z: -2, w: 1.8, h: 5, d: 1.8, hex: '#3A464C' },
        // Left Flank: Blueprint clamp arm & drafting schematic plate
        { x: -8, y: 12, z: -1, w: 1.5, h: 5, d: 2, hex: '#8F5D3C' },
        { x: -8.3, y: 15.5, z: -2, w: 1.8, h: 3, d: 4, hex: '#F2B544', emissive: 0.95 }
      );
      break;
    }
  }

  return buildDetailVoxelGeometry(boxes, FINE);
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
  const satGroupRef = useRef<THREE.Group>(null);
  const theme = useMemo(() => getTerminalTheme(id), [id]);

  // Voxel thematic console desk & screen geometry
  const terminalGeo = useMemo(() => buildTerminalGeometry(id), [id]);

  // Floating 3D Holographic Symbol / Polyhedron above screen
  const holoGeo = useMemo(() => {
    let boxes: DetailBoxSpec[] = [];
    switch (id) {
      case 'beacon_terminal':
        // Turquoise Celestial Star Polyhedron + orbiting star brackets
        boxes = [
          { x: -1.5, y: -1.5, z: -1.5, w: 3, h: 3, d: 3, hex: '#5CE1E6', emissive: 1.25 },
          { x: -0.8, y: -2.8, z: -0.8, w: 1.6, h: 5.6, d: 1.6, hex: '#F2B544', emissive: 1.2 },
          { x: -2.8, y: -0.8, z: -0.8, w: 5.6, h: 1.6, d: 1.6, hex: '#5CE1E6', emissive: 1.2 },
          { x: -0.8, y: -0.8, z: -2.8, w: 1.6, h: 1.6, d: 5.6, hex: '#FFF5D6', emissive: 1.3 },
          // Celestial code brackets
          { x: -3.8, y: -2.5, z: 0, w: 0.6, h: 5, d: 0.6, hex: '#5CE1E6', emissive: 1.2 },
          { x: -3.8, y: 2.0, z: 0, w: 1.4, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.2 },
          { x: -3.8, y: -2.5, z: 0, w: 1.4, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.2 },
          { x: 3.2, y: -2.5, z: 0, w: 0.6, h: 5, d: 0.6, hex: '#5CE1E6', emissive: 1.2 },
          { x: 2.4, y: 2.0, z: 0, w: 1.4, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.2 },
          { x: 2.4, y: -2.5, z: 0, w: 1.4, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.2 },
        ];
        break;

      case 'bit_terminal':
        // Emerald Data Matrix Cube
        boxes = [
          { x: -1.8, y: -1.8, z: -1.8, w: 3.6, h: 3.6, d: 3.6, hex: '#6DBE4B', emissive: 1.25 },
          { x: -1.2, y: -1.2, z: -2.2, w: 2.4, h: 2.4, d: 4.4, hex: '#4BACE8', emissive: 1.25 },
          { x: -2.2, y: 1.4, z: -2.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.35 },
          { x: 1.2, y: 1.4, z: -2.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.35 },
          { x: -2.2, y: -2.4, z: 1.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.35 },
          { x: 1.2, y: -2.4, z: 1.2, w: 1, h: 1, d: 1, hex: '#9EEFFF', emissive: 1.35 },
        ];
        break;

      case 'gate_console':
        // Azure Rune Lock & Security Shield
        boxes = [
          { x: -2.2, y: -2.2, z: -0.8, w: 4.4, h: 4.4, d: 1.6, hex: '#4BACE8', emissive: 1.25 },
          { x: -1.5, y: -3.4, z: -0.6, w: 3.0, h: 1.8, d: 1.2, hex: '#355C8C', emissive: 1.15 },
          // Padlock shackle
          { x: -1.8, y: 2.0, z: -0.5, w: 0.8, h: 2.4, d: 1, hex: '#F2B544', emissive: 1.3 },
          { x: 1.0, y: 2.0, z: -0.5, w: 0.8, h: 2.4, d: 1, hex: '#F2B544', emissive: 1.3 },
          { x: -1.8, y: 3.8, z: -0.5, w: 3.6, h: 0.8, d: 1, hex: '#F2B544', emissive: 1.3 },
          // Glowing center rune keyway
          { x: -0.5, y: -1.2, z: 0.8, w: 1, h: 2.2, d: 0.4, hex: '#E0603F', emissive: 1.35 },
        ];
        break;

      case 'farm_console':
        // Jade Irrigation Sprout & Soil Moisture Droplets
        boxes = [
          { x: -0.6, y: -2.5, z: -0.6, w: 1.2, h: 5.0, d: 1.2, hex: '#76BF31', emissive: 1.2 },
          { x: -2.6, y: 0.6, z: -0.5, w: 2.4, h: 1.5, d: 1, hex: '#4CD7E0', emissive: 1.3 },
          { x: 0.6, y: 1.4, z: -0.5, w: 2.4, h: 1.5, d: 1, hex: '#76BF31', emissive: 1.25 },
          // Moisture droplet prism
          { x: -0.8, y: 3.0, z: -0.8, w: 1.6, h: 1.8, d: 1.6, hex: '#4CD7E0', emissive: 1.3 },
          { x: -0.4, y: 4.6, z: -0.4, w: 0.8, h: 1.0, d: 0.8, hex: '#9EEFFF', emissive: 1.4 },
        ];
        break;

      case 'workshop_console':
        // Amber Clockwork Cog & Blueprint Crosshairs
        boxes = [
          { x: -1.4, y: -1.4, z: -0.8, w: 2.8, h: 2.8, d: 1.6, hex: '#F2B544', emissive: 1.3 },
          { x: -0.6, y: -0.6, z: -1.4, w: 1.2, h: 1.2, d: 2.8, hex: '#FFF5D6', emissive: 1.35 },
          // 4 Cardinal cog teeth
          { x: -1.0, y: 2.0, z: -0.6, w: 2.0, h: 1.6, d: 1.2, hex: '#E5793A', emissive: 1.25 },
          { x: -1.0, y: -3.6, z: -0.6, w: 2.0, h: 1.6, d: 1.2, hex: '#E5793A', emissive: 1.25 },
          { x: -3.6, y: -1.0, z: -0.6, w: 1.6, h: 2.0, d: 1.2, hex: '#E5793A', emissive: 1.25 },
          { x: 2.0, y: -1.0, z: -0.6, w: 1.6, h: 2.0, d: 1.2, hex: '#E5793A', emissive: 1.25 },
          // Diagonal teeth
          { x: 1.5, y: 1.5, z: -0.6, w: 1.3, h: 1.3, d: 1.2, hex: '#F2B544', emissive: 1.2 },
          { x: -2.8, y: -2.8, z: -0.6, w: 1.3, h: 1.3, d: 1.2, hex: '#F2B544', emissive: 1.2 },
          { x: 1.5, y: -2.8, z: -0.6, w: 1.3, h: 1.3, d: 1.2, hex: '#F2B544', emissive: 1.2 },
          { x: -2.8, y: 1.5, z: -0.6, w: 1.3, h: 1.3, d: 1.2, hex: '#F2B544', emissive: 1.2 },
        ];
        break;
    }
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [id]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (holoRef.current) {
      holoRef.current.rotation.y = t * 1.35;
      holoRef.current.rotation.x = Math.sin(t * 1.6) * 0.08;
      holoRef.current.position.y = 1.48 + Math.sin(t * 2.5) * 0.06;
    }
    if (satGroupRef.current) {
      satGroupRef.current.rotation.y = -t * 2.2;
    }
  });

  return (
    <group position={position} rotation={[0, yaw, 0]} name={`landmark-${id}`}>
      {/* Voxel carved plinth & console */}
      <mesh geometry={terminalGeo} material={material} castShadow receiveShadow />

      {/* Floating 3D Holographic Assembly above screen */}
      <group ref={holoRef} position={[0, 1.48, -0.05]}>
        <mesh geometry={holoGeo} material={material} />

        {/* Bit Terminal Orbiting Satellite Bit Nodes */}
        {id === 'bit_terminal' && (
          <group ref={satGroupRef}>
            {[0, 1, 2, 3].map((i) => {
              const a = (i * Math.PI) / 2;
              const r = 0.38;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * r, (i % 2 === 0 ? 0.08 : -0.08), Math.sin(a) * r]}
                  scale={[0.04, 0.04, 0.04]}
                >
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial
                    color="#4BACE8"
                    emissive="#4BACE8"
                    emissiveIntensity={1.4}
                  />
                </mesh>
              );
            })}
          </group>
        )}

        {/* Farm Console Floating Moisture Droplets */}
        {id === 'farm_console' && (
          <>
            <mesh position={[0.24, 0.18, 0.12]} scale={[0.035, 0.06, 0.035]}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#9EEFFF" emissive="#9EEFFF" emissiveIntensity={1.35} />
            </mesh>
            <mesh position={[-0.22, -0.12, -0.15]} scale={[0.03, 0.05, 0.03]}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#4CD7E0" emissive="#4CD7E0" emissiveIntensity={1.3} />
            </mesh>
          </>
        )}

        {/* Thematic Hologram Aura Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.014, 8, 24]} />
          <meshBasicMaterial color={theme.primary} transparent opacity={0.65} />
        </mesh>
      </group>

      {/* Screen Area Light */}
      <pointLight position={[0, 1.15, 0.2]} color={theme.primary} intensity={1.1} distance={4.5} decay={2} />
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
  const orbRef = useRef<THREE.Group>(null);

  // Ancient sculpted stasis pod casing with glowing turquoise energy tubes
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Stepped Sanctuary Dais
      { x: -8, y: 0, z: -8, w: 16, h: 2.5, d: 16, hex: '#6E757A' },
      { x: -6.5, y: 2.5, z: -6.5, w: 13, h: 2, d: 13, hex: '#99A2A8' },
      { x: -5, y: 4.5, z: -5, w: 10, h: 1.5, d: 10, hex: '#C6CED2' },

      // 2. Ancient sculpted stasis pod casing alcove backshell
      { x: -6, y: 4.5, z: -7.5, w: 12, h: 15, d: 3.5, hex: '#2A476E' },
      { x: -5, y: 6, z: -6, w: 10, h: 12, d: 2, hex: '#1E324D' },
      // Overhanging capsule cowl / canopy
      { x: -5.5, y: 18.5, z: -8, w: 11, h: 2.5, d: 5, hex: '#355C8C' },
      { x: -4, y: 20, z: -6.5, w: 8, h: 1.5, d: 4, hex: '#A8773D' },

      // 3. Glowing turquoise energy tubes running along pod and floor
      { x: -4.5, y: 6.5, z: -5.5, w: 1.4, h: 12, d: 1.4, hex: '#5CE1E6', emissive: 1.25 },
      { x: 3.1, y: 6.5, z: -5.5, w: 1.4, h: 12, d: 1.4, hex: '#5CE1E6', emissive: 1.25 },
      { x: -3.5, y: 14, z: -5.5, w: 7, h: 1.4, d: 1.4, hex: '#5ED8CB', emissive: 1.2 },
      // Floor power conduits feeding to central socket
      { x: -1.2, y: 4.7, z: -5, w: 2.4, h: 0.6, d: 5, hex: '#5CE1E6', emissive: 1.25 },
      { x: -4, y: 4.7, z: -2, w: 8, h: 0.6, d: 1.4, hex: '#5ED8CB', emissive: 1.15 },

      // 4. Carved bronze pedestal column & flared collar
      { x: -3.2, y: 5.5, z: -2, w: 6.4, h: 6, d: 6.4, hex: '#A8773D' },
      { x: -4.2, y: 11.5, z: -3, w: 8.4, h: 1.8, d: 8.4, hex: '#F2B544' },

      // 5. 4 Cradling brass stasis claws
      { x: -1.2, y: 13, z: -4.2, w: 2.4, h: 4.5, d: 1.4, hex: '#A8773D' },
      { x: -1.2, y: 13, z: 1.8, w: 2.4, h: 4.5, d: 1.4, hex: '#A8773D' },
      { x: -4.6, y: 13, z: -1.2, w: 1.4, h: 4.5, d: 2.4, hex: '#A8773D' },
      { x: 3.2, y: 13, z: -1.2, w: 1.4, h: 4.5, d: 2.4, hex: '#A8773D' },

      // 6. Glowing turquoise activation socket
      { x: -2.5, y: 12.8, z: -2.5, w: 5, h: 1.2, d: 5, hex: '#5ED8CB', emissive: 1.3 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Floating Activation Orb with Inner Star Core
  const orbGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Outer translucent turquoise gyro cage
      { x: -1.8, y: -1.8, z: -1.8, w: 3.6, h: 3.6, d: 3.6, hex: '#5CE1E6', emissive: 1.2 },
      { x: -2.5, y: -1.0, z: -1.0, w: 5.0, h: 2.0, d: 2.0, hex: '#5ED8CB', emissive: 1.15 },
      { x: -1.0, y: -2.5, z: -1.0, w: 2.0, h: 5.0, d: 2.0, hex: '#5ED8CB', emissive: 1.15 },
      { x: -1.0, y: -1.0, z: -2.5, w: 2.0, h: 2.0, d: 5.0, hex: '#5ED8CB', emissive: 1.15 },
      // Inner glowing star core
      { x: -0.8, y: -0.8, z: -0.8, w: 1.6, h: 1.6, d: 1.6, hex: '#FFF8DC', emissive: 1.35 },
      { x: -0.4, y: -1.4, z: -0.4, w: 0.8, h: 2.8, d: 0.8, hex: '#FFF5D6', emissive: 1.4 },
      { x: -1.4, y: -0.4, z: -0.4, w: 2.8, h: 0.8, d: 0.8, hex: '#F2B544', emissive: 1.3 },
      { x: -0.4, y: -0.4, z: -1.4, w: 0.8, h: 0.8, d: 2.8, hex: '#F2B544', emissive: 1.3 },
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
      {/* Ancient Sculpted Stasis Pod Dais */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Floating Activation Orb with Inner Star Core */}
      <group ref={orbRef} position={[0, 1.15, 0]}>
        <mesh geometry={orbGeo} material={material} />
      </group>

      {/* Primary Celestial Gyro Ring */}
      <mesh ref={outerRingRef} position={[0, 1.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.48, 0.024, 10, 36]} />
        <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={0.95} roughness={0.2} />
      </mesh>

      {/* Secondary Inclined Celestial Ring */}
      <mesh ref={innerRingRef} position={[0, 1.12, 0]} rotation={[0.4, 0.5, 0]}>
        <torusGeometry args={[0.36, 0.018, 8, 28]} />
        <meshStandardMaterial color="#FFF5D6" emissive="#FFF5D6" emissiveIntensity={0.85} roughness={0.2} />
      </mesh>

      {/* Floor Activation Matrix Light */}
      <pointLight position={[0, 1.25, 0]} color="#5CE1E6" intensity={2.0} distance={8} decay={2} />
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
  const beamMidRef = useRef<THREE.Mesh>(null);
  const beamOuterRef = useRef<THREE.Mesh>(null);
  const pulseRing1Ref = useRef<THREE.Mesh>(null);
  const pulseRing2Ref = useRef<THREE.Mesh>(null);

  // Grand architectural beacon tower with full balustrade & peaked dome roof
  const towerGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Heavy stepped granite foundation plinth (y: 0..6.5)
      { x: -10, y: 0, z: -10, w: 20, h: 2.5, d: 20, hex: '#48545C' },
      { x: -8.5, y: 2.5, z: -8.5, w: 17, h: 2, d: 17, hex: '#5E666D' },
      { x: -7.5, y: 4.5, z: -7.5, w: 15, h: 2, d: 15, hex: '#778087' },
      // 4 Corner buttress plinths
      { x: -10.5, y: 0, z: -10.5, w: 3.5, h: 6.5, d: 3.5, hex: '#3A464C' },
      { x: 7.0, y: 0, z: -10.5, w: 3.5, h: 6.5, d: 3.5, hex: '#3A464C' },
      { x: -10.5, y: 0, z: 7.0, w: 3.5, h: 6.5, d: 3.5, hex: '#3A464C' },
      { x: 7.0, y: 0, z: 7.0, w: 3.5, h: 6.5, d: 3.5, hex: '#3A464C' },

      // 2. Sandstone & Red-Coral Tower Body (y: 6.5..34)
      // Tier 1 body
      { x: -5.5, y: 6.5, z: -5.5, w: 11, h: 8.5, d: 11, hex: '#EDE4D0' },
      // Bronze corner quoins
      { x: -5.8, y: 6.5, z: -5.8, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      { x: 4.3, y: 6.5, z: -5.8, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      { x: -5.8, y: 6.5, z: 4.3, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      { x: 4.3, y: 6.5, z: 4.3, w: 1.5, h: 8.5, d: 1.5, hex: '#A8773D' },
      // Lower coral band
      { x: -5.8, y: 15, z: -5.8, w: 11.6, h: 3, d: 11.6, hex: '#D9433B' },

      // Tier 2 body with illuminated window embrasures
      { x: -5, y: 18, z: -5, w: 10, h: 8, d: 10, hex: '#EDE4D0' },
      { x: -1.2, y: 20, z: -5.3, w: 2.4, h: 4, d: 0.6, hex: '#F2B544', emissive: 1.1 },
      { x: -1.2, y: 20, z: 4.7, w: 2.4, h: 4, d: 0.6, hex: '#F2B544', emissive: 1.1 },
      { x: -5.3, y: 20, z: -1.2, w: 0.6, h: 4, d: 2.4, hex: '#F2B544', emissive: 1.1 },
      { x: 4.7, y: 20, z: -1.2, w: 0.6, h: 4, d: 2.4, hex: '#F2B544', emissive: 1.1 },
      // Mid coral band
      { x: -5.3, y: 26, z: -5.3, w: 10.6, h: 3, d: 10.6, hex: '#D9433B' },

      // Tier 3 upper neck
      { x: -4.5, y: 29, z: -4.5, w: 9, h: 5, d: 9, hex: '#EDE4D0' },

      // 8 Carved stone corbel brackets supporting the cantilevered balcony
      { x: -6.5, y: 32, z: -3.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: -6.5, y: 32, z: 1.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: 4.5, y: 32, z: -3.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: 4.5, y: 32, z: 1.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: -3.5, y: 32, z: -6.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: 1.5, y: 32, z: -6.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: -3.5, y: 32, z: 4.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },
      { x: 1.5, y: 32, z: 4.5, w: 2, h: 2.5, d: 2, hex: '#A8773D' },

      // 3. Grand Balcony Deck & Balustrade (y: 34..42)
      // Balcony floor platform & astrolabe floor medallion
      { x: -7.5, y: 34, z: -7.5, w: 15, h: 2, d: 15, hex: '#C6CED2' },
      { x: -7.8, y: 35.5, z: -7.8, w: 15.6, h: 0.8, d: 15.6, hex: '#A8773D' },

      // 4 Balustrade corner newel posts with brass finials
      { x: -7.4, y: 36, z: -7.4, w: 1.8, h: 5.5, d: 1.8, hex: '#3A464C' },
      { x: 5.6, y: 36, z: -7.4, w: 1.8, h: 5.5, d: 1.8, hex: '#3A464C' },
      { x: -7.4, y: 36, z: 5.6, w: 1.8, h: 5.5, d: 1.8, hex: '#3A464C' },
      { x: 5.6, y: 36, z: 5.6, w: 1.8, h: 5.5, d: 1.8, hex: '#3A464C' },

      { x: -7.2, y: 41.5, z: -7.2, w: 1.4, h: 1.2, d: 1.4, hex: '#F2B544', emissive: 0.8 },
      { x: 5.8, y: 41.5, z: -7.2, w: 1.4, h: 1.2, d: 1.4, hex: '#F2B544', emissive: 0.8 },
      { x: -7.2, y: 41.5, z: 5.8, w: 1.4, h: 1.2, d: 1.4, hex: '#F2B544', emissive: 0.8 },
      { x: 5.8, y: 41.5, z: 5.8, w: 1.4, h: 1.2, d: 1.4, hex: '#F2B544', emissive: 0.8 },

      // Balustrade intermediate spindles along all 4 sides (4 per side)
      // North
      { x: -5, y: 36, z: -7.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: -2.5, y: 36, z: -7.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: 0.5, y: 36, z: -7.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: 3, y: 36, z: -7.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      // South
      { x: -5, y: 36, z: 6.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: -2.5, y: 36, z: 6.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: 0.5, y: 36, z: 6.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: 3, y: 36, z: 6.3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      // West
      { x: -7.3, y: 36, z: -5, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: -7.3, y: 36, z: -2.5, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: -7.3, y: 36, z: 0.5, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: -7.3, y: 36, z: 3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      // East
      { x: 6.3, y: 36, z: -5, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: 6.3, y: 36, z: -2.5, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: 6.3, y: 36, z: 0.5, w: 1, h: 4.8, d: 1, hex: '#A8773D' },
      { x: 6.3, y: 36, z: 3, w: 1, h: 4.8, d: 1, hex: '#A8773D' },

      // Continuous molded brass top rails
      { x: -7.4, y: 40.8, z: -7.4, w: 14.8, h: 1.0, d: 1.2, hex: '#F2B544' },
      { x: -7.4, y: 40.8, z: 6.2, w: 14.8, h: 1.0, d: 1.2, hex: '#F2B544' },
      { x: -7.4, y: 40.8, z: -7.4, w: 1.2, h: 1.0, d: 14.8, hex: '#F2B544' },
      { x: 6.2, y: 40.8, z: -7.4, w: 1.2, h: 1.0, d: 14.8, hex: '#F2B544' },

      // 4. Open-Air Lantern Pavilion (y: 36..47)
      // 4 Heavy brass structural colonnade pillars framing the core
      { x: -4.5, y: 36, z: -4.5, w: 1.6, h: 11, d: 1.6, hex: '#A8773D' },
      { x: 2.9, y: 36, z: -4.5, w: 1.6, h: 11, d: 1.6, hex: '#A8773D' },
      { x: -4.5, y: 36, z: 2.9, w: 1.6, h: 11, d: 1.6, hex: '#A8773D' },
      { x: 2.9, y: 36, z: 2.9, w: 1.6, h: 11, d: 1.6, hex: '#A8773D' },

      // 5. Peaked Slate Dome Roof & Spire Needle (y: 47..64)
      { x: -6.5, y: 47, z: -6.5, w: 13, h: 2, d: 13, hex: '#355C8C' },
      { x: -5, y: 49, z: -5, w: 10, h: 2.5, d: 10, hex: '#2A476E' },
      { x: -3.5, y: 51.5, z: -3.5, w: 7, h: 2.5, d: 7, hex: '#355C8C' },
      { x: -2, y: 54, z: -2, w: 4, h: 2, d: 4, hex: '#A8773D' },
      // Spire needle finial
      { x: -0.8, y: 56, z: -0.8, w: 1.6, h: 5, d: 1.6, hex: '#F2B544', emissive: 1.1 },
      { x: -0.4, y: 61, z: -0.4, w: 0.8, h: 4, d: 0.8, hex: '#FFE29A', emissive: 1.35 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Pulsing multi-faceted core crystal
  const coreGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -2.5, y: -2.5, z: -2.5, w: 5, h: 5, d: 5, hex: '#F2B544', emissive: 1.3 },
      { x: -1.5, y: -4.5, z: -1.5, w: 3, h: 9, d: 3, hex: '#FFF5D6', emissive: 1.35 },
      { x: -4.5, y: -1.5, z: -1.5, w: 9, h: 3, d: 3, hex: '#5CE1E6', emissive: 1.2 },
      { x: -1.5, y: -1.5, z: -4.5, w: 3, h: 3, d: 9, hex: '#5CE1E6', emissive: 1.2 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = restored ? 1.6 : 0.45;

    // Multi-tier rotating astrolabe gimbal rings with distinct rotation speeds and tilt axes
    if (outerGyroRef.current) {
      outerGyroRef.current.rotation.y = t * speed;
      outerGyroRef.current.rotation.x = Math.sin(t * 0.9) * 0.28;
    }
    if (midGyroRef.current) {
      midGyroRef.current.rotation.x = -t * speed * 1.35;
      midGyroRef.current.rotation.z = Math.cos(t * 1.1) * 0.35;
    }
    if (innerGyroRef.current) {
      innerGyroRef.current.rotation.z = t * speed * 1.75;
      innerGyroRef.current.rotation.y = Math.sin(t * 1.4) * 0.45;
    }

    // Pulsing multi-faceted core with warm breathing emissive glow
    if (coreRef.current) {
      coreRef.current.rotation.y = -t * speed * 1.1;
      const pulse = restored ? 1.15 + Math.sin(t * 3.2) * 0.12 : 0.88 + Math.sin(t * 1.5) * 0.05;
      coreRef.current.scale.setScalar(pulse);
    }

    // Volumetric skyward beam shimmer & ascending pulse rings
    if (beamOuterRef.current && restored) {
      const mat = beamOuterRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.38 + Math.sin(t * 4.0) * 0.08;
      }
    }
    if (beamMidRef.current && restored) {
      const mat = beamMidRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.55 + Math.sin(t * 5.0) * 0.1;
      }
    }

    // Ascending pulse rings along beacon beam
    if (pulseRing1Ref.current && restored) {
      const yNorm = ((t * 4.5) % 40) / 40;
      pulseRing1Ref.current.position.y = yNorm * 45;
      const s = 1.0 + yNorm * 2.5;
      pulseRing1Ref.current.scale.set(s, 1, s);
      const mat = pulseRing1Ref.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = (1 - yNorm) * 0.7;
    }
    if (pulseRing2Ref.current && restored) {
      const yNorm = ((t * 4.5 + 20) % 40) / 40;
      pulseRing2Ref.current.position.y = yNorm * 45;
      const s = 1.0 + yNorm * 2.5;
      pulseRing2Ref.current.scale.set(s, 1, s);
      const mat = pulseRing2Ref.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = (1 - yNorm) * 0.7;
    }
  });

  return (
    <group position={position} name="landmark-beacon-tower">
      {/* Tower body & architectural balustrade */}
      <mesh geometry={towerGeo} material={material} castShadow receiveShadow />

      {/* Luminous Breathing Core Crystal inside the Lantern Gallery (y = 2.56 u) */}
      <mesh ref={coreRef} geometry={coreGeo} material={material} position={[0, 2.56, 0]} />

      {/* Multi-Tier Rotating Astrolabe Brass Gimbal Rings */}
      <group ref={outerGyroRef} position={[0, 2.56, 0]}>
        <mesh>
          <torusGeometry args={[0.52, 0.026, 10, 36]} />
          <meshStandardMaterial
            color="#F2B544"
            emissive="#F2B544"
            emissiveIntensity={restored ? 1.0 : 0.3}
            roughness={0.25}
          />
        </mesh>
      </group>

      <group ref={midGyroRef} position={[0, 2.56, 0]}>
        <mesh>
          <torusGeometry args={[0.38, 0.022, 8, 30]} />
          <meshStandardMaterial
            color="#E5A823"
            emissive="#E5A823"
            emissiveIntensity={restored ? 0.9 : 0.25}
            roughness={0.25}
          />
        </mesh>
      </group>

      <group ref={innerGyroRef} position={[0, 2.56, 0]}>
        <mesh>
          <torusGeometry args={[0.26, 0.018, 8, 24]} />
          <meshStandardMaterial
            color="#5CE1E6"
            emissive="#5CE1E6"
            emissiveIntensity={restored ? 1.1 : 0.35}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Skyward Volumetric Crystal Beacon Beam (Multi-layered when restored) */}
      {restored && (
        <group position={[0, 3.9, 0]}>
          {/* Inner intense radiant core beam */}
          <mesh ref={beamRef} position={[0, 22.5, 0]}>
            <cylinderGeometry args={[0.07, 0.14, 45, 16]} />
            <meshBasicMaterial color="#FFF8DC" transparent opacity={0.92} depthWrite={false} />
          </mesh>

          {/* Middle vibrant cyan additive glow beam */}
          <mesh ref={beamMidRef} position={[0, 22.5, 0]}>
            <cylinderGeometry args={[0.26, 0.52, 45, 16]} />
            <meshBasicMaterial
              color="#5CE1E6"
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Outer soft volumetric atmospheric glow */}
          <mesh ref={beamOuterRef} position={[0, 22.5, 0]}>
            <cylinderGeometry args={[0.65, 1.15, 45, 16]} />
            <meshBasicMaterial
              color="#4BACE8"
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Ascending beacon pulse rings */}
          <mesh ref={pulseRing1Ref} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.45, 0.02, 8, 24]} />
            <meshBasicMaterial
              color="#FFF5D6"
              transparent
              opacity={0.65}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={pulseRing2Ref} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.45, 0.02, 8, 24]} />
            <meshBasicMaterial
              color="#5CE1E6"
              transparent
              opacity={0.65}
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
        intensity={restored ? 3.8 : 0.85}
        distance={restored ? 18 : 6}
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

  // Carved stone pedestal with flared capital basin & glowing runic channels
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Stepped carved stone base
      { x: -6, y: 0, z: -6, w: 12, h: 2, d: 12, hex: '#505A61' },
      { x: -5, y: 2, z: -5, w: 10, h: 2, d: 10, hex: '#5E666D' },
      { x: -4, y: 4, z: -4, w: 8, h: 1.5, d: 8, hex: '#778087' },

      // Carved column shaft
      { x: -3, y: 5.5, z: -3, w: 6, h: 6, d: 6, hex: '#99A2A8' },

      // 4 Bronze corner clamps
      { x: -3.5, y: 6, z: -3.5, w: 1.2, h: 5.5, d: 1.2, hex: '#A8773D' },
      { x: 2.3, y: 6, z: -3.5, w: 1.2, h: 5.5, d: 1.2, hex: '#A8773D' },
      { x: -3.5, y: 6, z: 2.3, w: 1.2, h: 5.5, d: 1.2, hex: '#A8773D' },
      { x: 2.3, y: 6, z: 2.3, w: 1.2, h: 5.5, d: 1.2, hex: '#A8773D' },

      // Inlaid glowing runic channels on all 4 faces
      { x: -1, y: 5.5, z: -3.2, w: 2, h: 5.5, d: 0.4, hex: runeHex, emissive: 1.25 },
      { x: -1, y: 5.5, z: 2.8, w: 2, h: 5.5, d: 0.4, hex: runeHex, emissive: 1.25 },
      { x: -3.2, y: 5.5, z: -1, w: 0.4, h: 5.5, d: 2, hex: runeHex, emissive: 1.25 },
      { x: 2.8, y: 5.5, z: -1, w: 0.4, h: 5.5, d: 2, hex: runeHex, emissive: 1.25 },

      // Flared capital basin
      { x: -5, y: 11.5, z: -5, w: 10, h: 1.5, d: 10, hex: '#C6CED2' },
      { x: -4.5, y: 13, z: -4.5, w: 9, h: 1, d: 9, hex: '#99A2A8' },

      // 4 Cradling bronze talons on capital rim
      { x: -4.6, y: 13, z: -1.2, w: 1.2, h: 3, d: 2.4, hex: '#A8773D' },
      { x: 3.4, y: 13, z: -1.2, w: 1.2, h: 3, d: 2.4, hex: '#A8773D' },
      { x: -1.2, y: 13, z: -4.6, w: 2.4, h: 3, d: 1.2, hex: '#A8773D' },
      { x: -1.2, y: 13, z: 3.4, w: 2.4, h: 3, d: 1.2, hex: '#A8773D' },

      // Swirling mana pool inside the basin
      { x: -3, y: 13.5, z: -3, w: 6, h: 0.5, d: 6, hex: runeHex, emissive: 1.2 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [runeHex]);

  // Floating rotating glowing runic obelisk
  const obeliskGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Tapered spire core
      { x: -1.2, y: -6, z: -1.2, w: 2.4, h: 3, d: 2.4, hex: color, emissive: 1.2 },
      { x: -2, y: -3, z: -2, w: 4, h: 8, d: 4, hex: '#2A476E' },
      { x: -1.4, y: 5, z: -1.4, w: 2.8, h: 4, d: 2.8, hex: '#355C8C' },
      { x: -0.8, y: 9, z: -0.8, w: 1.6, h: 3, d: 1.6, hex: '#A8773D' },
      { x: -0.4, y: 12, z: -0.4, w: 0.8, h: 2, d: 0.8, hex: color, emissive: 1.35 },

      // Inlaid glowing runic glyph bands
      { x: -2.2, y: -1, z: -1.2, w: 4.4, h: 1.5, d: 2.4, hex: runeHex, emissive: 1.3 },
      { x: -1.2, y: -1, z: -2.2, w: 2.4, h: 1.5, d: 4.4, hex: runeHex, emissive: 1.3 },
      { x: -2.2, y: 2.5, z: -1.2, w: 4.4, h: 1.5, d: 2.4, hex: runeHex, emissive: 1.3 },
      { x: -1.2, y: 2.5, z: -2.2, w: 2.4, h: 1.5, d: 4.4, hex: runeHex, emissive: 1.3 },

      // Radiant crystal core
      { x: -1, y: -4, z: -1, w: 2, h: 10, d: 2, hex: color, emissive: 1.25 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [color, runeHex]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (obeliskRef.current) {
      obeliskRef.current.rotation.y = t * 1.1;
      obeliskRef.current.rotation.x = Math.sin(t * 1.4) * 0.07;
      obeliskRef.current.rotation.z = Math.cos(t * 1.2) * 0.07;
      obeliskRef.current.position.y = 1.05 + Math.sin(t * 2.2) * 0.08;
    }
    if (auraRef.current) {
      auraRef.current.rotation.z = -t * 0.85;
    }
  });

  return (
    <group position={position} name={`gate-rune-plinth-${runeHex}`}>
      {/* Carved stone plinth */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Floating Rotating Glowing Runic Obelisk */}
      <group ref={obeliskRef} position={[0, 1.05, 0]}>
        <mesh geometry={obeliskGeo} material={material} />
      </group>

      {/* Glowing Runic Aura Ring on the pedestal rim */}
      <mesh ref={auraRef} position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.016, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.2} />
      </mesh>

      {/* Atmospheric Point Light */}
      <pointLight position={[0, 1.15, 0]} color={color} intensity={2.0} distance={6.5} decay={2} />
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
  const satRefs = useRef<(THREE.Mesh | null)[]>([]);
  const beamRef = useRef<THREE.Mesh>(null);
  const beamGlowRef = useRef<THREE.Mesh>(null);

  // Colossal 3-tiered celestial altar with carved stone coping & floor runic channels
  const altarGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Tier 1 Base (24x3x24) with coping border
      { x: -12, y: 0, z: -12, w: 24, h: 3, d: 24, hex: '#48545C' },
      { x: -12.5, y: 2, z: -12.5, w: 25, h: 1, d: 25, hex: '#5E666D' },

      // Tier 2 Mid-tier with gold filigree & stone coping (20x3x20)
      { x: -10, y: 3, z: -10, w: 20, h: 3, d: 20, hex: '#778087' },
      { x: -10.4, y: 5, z: -10.4, w: 20.8, h: 1, d: 20.8, hex: '#99A2A8' },
      // Floor gold filigree channels
      { x: -9, y: 5.8, z: -0.6, w: 18, h: 0.4, d: 1.2, hex: '#F2B544', emissive: 0.9 },
      { x: -0.6, y: 5.8, z: -9, w: 1.2, h: 0.4, d: 18, hex: '#F2B544', emissive: 0.9 },

      // Tier 3 Sanctuary Platform (15x2.5x15)
      { x: -7.5, y: 6, z: -7.5, w: 15, h: 2.5, d: 15, hex: '#C6CED2' },
      { x: -7.8, y: 8, z: -7.8, w: 15.6, h: 0.8, d: 15.6, hex: '#EDE4D0' },

      // Inlaid celestial runic channels on the dais floor
      { x: -6, y: 8.5, z: -6, w: 12, h: 0.4, d: 12, hex: '#F2B544', emissive: 0.95 },
      { x: -4.5, y: 8.7, z: -4.5, w: 9, h: 0.4, d: 9, hex: '#5ED8CB', emissive: 1.15 },

      // 4 Carved Corner Obelisk Pylons on Tier 2
      // Shafts
      { x: -9.5, y: 3, z: -9.5, w: 2.8, h: 13, d: 2.8, hex: '#355C8C' },
      { x: 6.7, y: 3, z: -9.5, w: 2.8, h: 13, d: 2.8, hex: '#355C8C' },
      { x: -9.5, y: 3, z: 6.7, w: 2.8, h: 13, d: 2.8, hex: '#355C8C' },
      { x: 6.7, y: 3, z: 6.7, w: 2.8, h: 13, d: 2.8, hex: '#355C8C' },

      // Pylon gold pyramidion capitals
      { x: -9.8, y: 16, z: -9.8, w: 3.4, h: 3, d: 3.4, hex: '#F2B544', emissive: 1.1 },
      { x: 6.4, y: 16, z: -9.8, w: 3.4, h: 3, d: 3.4, hex: '#F2B544', emissive: 1.1 },
      { x: -9.8, y: 16, z: 6.4, w: 3.4, h: 3, d: 3.4, hex: '#F2B544', emissive: 1.1 },
      { x: 6.4, y: 16, z: 6.4, w: 3.4, h: 3, d: 3.4, hex: '#F2B544', emissive: 1.1 },

      // Pylon radiant golden tips
      { x: -9.0, y: 19, z: -9.0, w: 1.8, h: 2, d: 1.8, hex: '#FFF5D6', emissive: 1.35 },
      { x: 7.2, y: 19, z: -9.0, w: 1.8, h: 2, d: 1.8, hex: '#FFF5D6', emissive: 1.35 },
      { x: -9.0, y: 19, z: 7.2, w: 1.8, h: 2, d: 1.8, hex: '#FFF5D6', emissive: 1.35 },
      { x: 7.2, y: 19, z: 7.2, w: 1.8, h: 2, d: 1.8, hex: '#FFF5D6', emissive: 1.35 },

      // 4 Curved Bronze Containment Claws cradling the central core
      { x: -4.5, y: 8.5, z: -1.2, w: 1.8, h: 5.5, d: 2.4, hex: '#A8773D' },
      { x: 2.7, y: 8.5, z: -1.2, w: 1.8, h: 5.5, d: 2.4, hex: '#A8773D' },
      { x: -1.2, y: 8.5, z: -4.5, w: 2.4, h: 5.5, d: 1.8, hex: '#A8773D' },
      { x: -1.2, y: 8.5, z: 2.7, w: 2.4, h: 5.5, d: 1.8, hex: '#A8773D' },

      // Claw glowing focus tips
      { x: -4.2, y: 13.5, z: -0.8, w: 1.2, h: 1.5, d: 1.6, hex: '#5CE1E6', emissive: 1.3 },
      { x: 3.0, y: 13.5, z: -0.8, w: 1.2, h: 1.5, d: 1.6, hex: '#5CE1E6', emissive: 1.3 },
      { x: -0.8, y: 13.5, z: -4.2, w: 1.6, h: 1.5, d: 1.2, hex: '#5CE1E6', emissive: 1.3 },
      { x: -0.8, y: 13.5, z: 3.0, w: 1.6, h: 1.5, d: 1.2, hex: '#5CE1E6', emissive: 1.3 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Colossal celestial shard crystal core
  const shardGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -3, y: -6, z: -3, w: 6, h: 12, d: 6, hex: '#5ED8CB', emissive: 1.25 },
      { x: -2, y: -8, z: -2, w: 4, h: 16, d: 4, hex: '#9EEFFF', emissive: 1.3 },
      { x: -1, y: -10, z: -1, w: 2, h: 20, d: 2, hex: '#FFF8DC', emissive: 1.4 },
      // Symmetrical crystal facet flanges
      { x: -5, y: -3, z: -1.5, w: 10, h: 6, d: 3, hex: '#4BACE8', emissive: 1.2 },
      { x: -1.5, y: -3, z: -5, w: 3, h: 6, d: 10, hex: '#4BACE8', emissive: 1.2 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Orbiting satellite shard crystal geometry
  const satelliteShardGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -1, y: -2, z: -1, w: 2, h: 4, d: 2, hex: '#5CE1E6', emissive: 1.25 },
      { x: -0.5, y: -3, z: -0.5, w: 1, h: 6, d: 1, hex: '#9EEFFF', emissive: 1.35 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mult = restored ? 1.8 : 0.6;

    // Swirling dual energy rings (gold and turquoise)
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

    // 4 Orbiting satellite shard crystals in true 3D orbit
    satRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const speed = mult * 0.9;
      const dir = i % 2 === 0 ? 1 : -1;
      const angle = t * speed * dir + (i * Math.PI) / 2;
      const radius = 1.2 + i * 0.12;
      const inc = (i - 1.5) * 0.35;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = 1.85 + Math.sin(angle * 2.0) * 0.25 + Math.sin(inc) * radius;
      mesh.rotation.y = t * 2.0 + i;
      mesh.rotation.x = angle * 1.5;
    });

    // Pulsing light shafts when restored
    if (beamRef.current && restored) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.45 + Math.sin(t * 3.5) * 0.1;
      }
    }
    if (beamGlowRef.current && restored) {
      const mat = beamGlowRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.22 + Math.sin(t * 4.2) * 0.08;
      }
    }
  });

  return (
    <group position={position} name="landmark-core-altar">
      {/* Grand Tiered Celestial Dais */}
      <mesh geometry={altarGeo} material={material} castShadow receiveShadow />

      {/* Floating Celestial Core Shard */}
      <mesh ref={crystalRef} geometry={shardGeo} material={material} position={[0, 1.85, 0]} />

      {/* 4 Orbiting Satellite Shard Crystals in 3D orbit */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            satRefs.current[i] = el;
          }}
          geometry={satelliteShardGeo}
          material={material}
          position={[0, 1.85, 0]}
        />
      ))}

      {/* Swirling Dual Energy Rings (Gold and Turquoise) */}
      <mesh ref={outerRingRef} position={[0, 1.85, 0]}>
        <torusGeometry args={[1.05, 0.045, 12, 40]} />
        <meshStandardMaterial
          color="#F2B544"
          emissive="#F2B544"
          emissiveIntensity={restored ? 1.0 : 0.3}
          roughness={0.25}
        />
      </mesh>

      <mesh ref={innerRingRef} position={[0, 1.85, 0]}>
        <torusGeometry args={[0.78, 0.038, 10, 36]} />
        <meshStandardMaterial
          color="#5CE1E6"
          emissive="#5CE1E6"
          emissiveIntensity={restored ? 1.15 : 0.35}
          roughness={0.2}
        />
      </mesh>

      {/* Glowing Stasis Matrix Ring on the Platform Floor */}
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.82, 36]} />
        <meshBasicMaterial color="#5ED8CB" transparent opacity={restored ? 0.85 : 0.35} />
      </mesh>

      {/* Pulsing Light Shafts / Stasis Beam reaching high into the sky when restored */}
      {restored && (
        <group position={[0, 16, 0]}>
          <mesh ref={beamRef}>
            <cylinderGeometry args={[0.3, 0.6, 32, 16]} />
            <meshBasicMaterial
              color="#9EEFFF"
              transparent
              opacity={0.45}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={beamGlowRef}>
            <cylinderGeometry args={[0.7, 1.2, 32, 16]} />
            <meshBasicMaterial
              color="#5CE1E6"
              transparent
              opacity={0.22}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Altar Radiant Light */}
      <pointLight
        position={[0, 2.2, 0]}
        color="#9EEFFF"
        intensity={restored ? 5.2 : 1.5}
        distance={restored ? 22 : 10}
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
  const sat3Ref = useRef<THREE.Mesh>(null);

  // Carved natural stone plinth bed with moss pockets & geode shards
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Craggy stone bed
      { x: -4.5, y: 0, z: -4.5, w: 9, h: 2, d: 9, hex: '#505A61' },
      { x: -3.5, y: 2, z: -3.5, w: 7, h: 1.5, d: 7, hex: '#6E757A' },
      // Moss pockets
      { x: -4, y: 2.1, z: 1, w: 2.5, h: 0.6, d: 2.5, hex: '#5FA32A' },
      { x: 1.5, y: 2.1, z: -3.5, w: 2, h: 0.6, d: 2.5, hex: '#488220' },
      { x: -3.5, y: 0.5, z: -4.2, w: 2, h: 1.2, d: 1.5, hex: '#76BF31' },
      // 3 Ground geode shard crystals sprouting from stone
      { x: -2.5, y: 3.2, z: 1.8, w: 1, h: 2, d: 1, hex: '#4BACE8', emissive: 1.15 },
      { x: 2, y: 3.2, z: -1.5, w: 0.8, h: 2.5, d: 0.8, hex: '#5CE1E6', emissive: 1.2 },
      { x: -1.5, y: 3.2, z: -2.5, w: 1, h: 1.8, d: 1, hex: '#2A86A8', emissive: 1.0 },
      // Crystal root base
      { x: -2, y: 3, z: -2, w: 4, h: 1.2, d: 4, hex: '#1E324D', emissive: 0.8 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Sparkling faceted blue crystal clusters
  const crystalGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Main central faceted crystal spire
      { x: -2, y: -4, z: -2, w: 4, h: 8, d: 4, hex: '#2A86A8', emissive: 1.2 },
      { x: -1.4, y: -5.5, z: -1.4, w: 2.8, h: 11, d: 2.8, hex: '#4BACE8', emissive: 1.25 },
      { x: -0.7, y: -6.5, z: -0.7, w: 1.4, h: 13, d: 1.4, hex: '#9EEFFF', emissive: 1.35 },
      { x: -0.3, y: 6.5, z: -0.3, w: 0.6, h: 2, d: 0.6, hex: '#FFF8DC', emissive: 1.4 },
      // Secondary leaning crystal spire
      { x: 1.5, y: -2.5, z: -1, w: 1.8, h: 6, d: 1.8, hex: '#5CE1E6', emissive: 1.2 },
      { x: 1.8, y: 3.2, z: -0.8, w: 1.2, h: 2.5, d: 1.2, hex: '#9EEFFF', emissive: 1.3 },
      // Flanking crystal points
      { x: -2.8, y: -2, z: 0.5, w: 1.6, h: 5, d: 1.6, hex: '#4BACE8', emissive: 1.15 },
      { x: -0.8, y: -2.5, z: 1.8, w: 1.6, h: 5.5, d: 1.6, hex: '#5CE1E6', emissive: 1.2 },
      { x: 0.5, y: -3, z: -2.5, w: 1.5, h: 4.5, d: 1.5, hex: '#2A86A8', emissive: 1.1 },
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
      sat2Ref.current.position.x = Math.cos(angle) * 0.35;
      sat2Ref.current.position.z = Math.sin(angle) * 0.35;
      sat2Ref.current.position.y = Math.cos(t * 2.8) * 0.08 - 0.05;
      sat2Ref.current.rotation.y = -t * 1.8;
    }
    if (sat3Ref.current) {
      const angle = t * 1.1 + 4.0;
      sat3Ref.current.position.x = Math.cos(angle) * 0.42;
      sat3Ref.current.position.z = Math.sin(angle) * 0.42;
      sat3Ref.current.position.y = Math.sin(t * 2.4) * 0.12;
      sat3Ref.current.rotation.x = t * 1.5;
    }
  });

  return (
    <group position={position} name={`landmark-${id}`}>
      {/* Carved natural stone bed with moss & ground geodes */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Sparkling Floating Faceted Crystal Cluster */}
      <group ref={crystalRef} position={[0, 0.42, 0]}>
        <mesh geometry={crystalGeo} material={material} />

        {/* Orbiting Satellite Micro-Shards */}
        <mesh ref={sat1Ref} scale={[0.08, 0.16, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#9EEFFF" emissive="#9EEFFF" emissiveIntensity={1.35} roughness={0.15} />
        </mesh>

        <mesh ref={sat2Ref} scale={[0.06, 0.12, 0.06]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={1.25} roughness={0.15} />
        </mesh>

        <mesh ref={sat3Ref} scale={[0.05, 0.1, 0.05]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#FFF8DC" emissive="#FFF8DC" emissiveIntensity={1.4} roughness={0.15} />
        </mesh>
      </group>

      {/* Ground Aura Halo Ring */}
      <mesh ref={auraRef} position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.016, 8, 32]} />
        <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={0.85} roughness={0.2} />
      </mesh>

      {/* Soft Sparkling Crystal Light */}
      <pointLight position={[0, 0.55, 0]} color="#5CE1E6" intensity={1.8} distance={6.5} decay={2} />
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
  const splashRef = useRef<THREE.Group>(null);

  // Upgraded static timber framework & A-frame trestle supports
  const trestleGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Left Trestle at z = -4.5
      { x: -6, y: -16, z: -4.8, w: 2.4, h: 22, d: 2, hex: '#5B3A27' },
      { x: 3.6, y: -16, z: -4.8, w: 2.4, h: 22, d: 2, hex: '#5B3A27' },
      { x: -6, y: -6, z: -4.8, w: 12, h: 2, d: 2, hex: '#7A5233' },
      { x: -2, y: -2, z: -5.2, w: 4, h: 4, d: 2.8, hex: '#A8773D' },

      // Right Trestle at z = 2.8
      { x: -6, y: -16, z: 2.8, w: 2.4, h: 22, d: 2, hex: '#5B3A27' },
      { x: 3.6, y: -16, z: 2.8, w: 2.4, h: 22, d: 2, hex: '#5B3A27' },
      { x: -6, y: -6, z: 2.8, w: 12, h: 2, d: 2, hex: '#7A5233' },
      { x: -2, y: -2, z: 2.4, w: 4, h: 4, d: 2.8, hex: '#A8773D' },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Upgraded rotating wheel: Bronze hub rivets, 8 double-bucket water paddles & copper rims
  const wheelGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Central bronze axle & octagonal hub
      { x: -1.5, y: -1.5, z: -5.5, w: 3, h: 3, d: 11, hex: '#7A5233' },
      { x: -3.5, y: -3.5, z: -2.5, w: 7, h: 7, d: 5, hex: '#A8773D' },

      // Protruding bronze hub rivets on front and back hub faces
      { x: 0, y: 2.5, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 0, y: -2.5, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 2.5, y: 0, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: -2.5, y: 0, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 1.8, y: 1.8, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: -1.8, y: 1.8, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 1.8, y: -1.8, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: -1.8, y: -1.8, z: -2.8, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },

      { x: 0, y: 2.5, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 0, y: -2.5, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 2.5, y: 0, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: -2.5, y: 0, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 1.8, y: 1.8, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: -1.8, y: 1.8, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: 1.8, y: -1.8, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },
      { x: -1.8, y: -1.8, z: 2.2, w: 0.8, h: 0.8, d: 0.6, hex: '#F2B544' },

      // Cardinal timber spokes
      { x: -1.2, y: -14, z: -1.2, w: 2.4, h: 28, d: 2.4, hex: '#7A5233' },
      { x: -14, y: -1.2, z: -1.2, w: 28, h: 2.4, d: 2.4, hex: '#7A5233' },

      // Diagonal timber spokes
      { x: -10, y: -10, z: -1.2, w: 20, h: 2.2, d: 2.4, hex: '#8F5D3C' },
      { x: -10, y: 8, z: -1.2, w: 20, h: 2.2, d: 2.4, hex: '#8F5D3C' },

      // 8 Double-Bucket Water Paddles & Copper Rim Reinforcements
      // Paddle 1: Top (0 deg)
      { x: -3.5, y: 12, z: -2.2, w: 7, h: 2, d: 4.4, hex: '#B07D4F' },
      { x: -4, y: 14, z: -2.5, w: 8, h: 1.8, d: 5, hex: '#C48A58' },
      { x: -4.2, y: 15.5, z: -2.6, w: 8.4, h: 0.5, d: 5.2, hex: '#A8773D' },

      // Paddle 2: Bottom (180 deg)
      { x: -3.5, y: -14, z: -2.2, w: 7, h: 2, d: 4.4, hex: '#B07D4F' },
      { x: -4, y: -15.8, z: -2.5, w: 8, h: 1.8, d: 5, hex: '#C48A58' },
      { x: -4.2, y: -16.3, z: -2.6, w: 8.4, h: 0.5, d: 5.2, hex: '#A8773D' },

      // Paddle 3: Right (90 deg)
      { x: 12, y: -3.5, z: -2.2, w: 2, h: 7, d: 4.4, hex: '#B07D4F' },
      { x: 14, y: -4, z: -2.5, w: 1.8, h: 8, d: 5, hex: '#C48A58' },
      { x: 15.5, y: -4.2, z: -2.6, w: 0.5, h: 8.4, d: 5.2, hex: '#A8773D' },

      // Paddle 4: Left (270 deg)
      { x: -14, y: -3.5, z: -2.2, w: 2, h: 7, d: 4.4, hex: '#B07D4F' },
      { x: -15.8, y: -4, z: -2.5, w: 1.8, h: 8, d: 5, hex: '#C48A58' },
      { x: -16.3, y: -4.2, z: -2.6, w: 0.5, h: 8.4, d: 5.2, hex: '#A8773D' },

      // Paddle 5: Top-Right (45 deg)
      { x: 8, y: 8, z: -2.2, w: 4.5, h: 4.5, d: 4.4, hex: '#B07D4F' },
      { x: 9.5, y: 9.5, z: -2.5, w: 4.5, h: 4.5, d: 5, hex: '#C48A58' },
      { x: 10.5, y: 10.5, z: -2.6, w: 4.8, h: 4.8, d: 5.2, hex: '#A8773D' },

      // Paddle 6: Top-Left (135 deg)
      { x: -12.5, y: 8, z: -2.2, w: 4.5, h: 4.5, d: 4.4, hex: '#B07D4F' },
      { x: -14, y: 9.5, z: -2.5, w: 4.5, h: 4.5, d: 5, hex: '#C48A58' },
      { x: -15.3, y: 10.5, z: -2.6, w: 4.8, h: 4.8, d: 5.2, hex: '#A8773D' },

      // Paddle 7: Bottom-Right (315 deg)
      { x: 8, y: -12.5, z: -2.2, w: 4.5, h: 4.5, d: 4.4, hex: '#B07D4F' },
      { x: 9.5, y: -14, z: -2.5, w: 4.5, h: 4.5, d: 5, hex: '#C48A58' },
      { x: 10.5, y: -15.3, z: -2.6, w: 4.8, h: 4.8, d: 5.2, hex: '#A8773D' },

      // Paddle 8: Bottom-Left (225 deg)
      { x: -12.5, y: -12.5, z: -2.2, w: 4.5, h: 4.5, d: 4.4, hex: '#B07D4F' },
      { x: -14, y: -14, z: -2.5, w: 4.5, h: 4.5, d: 5, hex: '#C48A58' },
      { x: -15.3, y: -15.3, z: -2.6, w: 4.8, h: 4.8, d: 5.2, hex: '#A8773D' },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((_, delta) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z -= delta * (spinning ? 2.2 : 0.35);
    }
  });

  return (
    <group position={position} name="landmark-waterwheel">
      {/* Static Upgraded Timber A-Frame Trestle Support Pier */}
      <mesh geometry={trestleGeo} material={material} castShadow receiveShadow />

      {/* Rotating Timber Wheel with 8 Double-Bucket Paddles & Riveted Bronze Hub */}
      <group ref={wheelRef}>
        <mesh geometry={wheelGeo} material={material} castShadow receiveShadow />
      </group>

      {/* Water Spray Particle Accents when spinning */}
      {spinning && (
        <group ref={splashRef} position={[0, -0.9, 0]}>
          <pointLight color="#9EEFFF" intensity={0.9} distance={4} decay={2} />
        </group>
      )}
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
