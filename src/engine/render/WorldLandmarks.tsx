import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildDetailVoxelGeometry, type DetailBoxSpec } from './Entities';
import type { InteractablePlacement } from '../voxel/islandGenerator';
import { useGameStore } from '../../stores/useGameStore';

const FINE = 0.0625;

// ============================================================================
// 1. CODING TERMINAL LANDMARK (5 HIGH-RES THEMATIC CONSOLES)
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
      // 1. Stepped Coastal Sandstone Base with Chiseled Mouldings
      boxes.push(
        { x: -8.5, y: 0, z: -8.5, w: 17, h: 2, d: 17, hex: '#C6CED2' },
        { x: -7.5, y: 2, z: -7.5, w: 15, h: 2, d: 15, hex: '#EDE4D0' },
        { x: -6.5, y: 4, z: -6.5, w: 13, h: 2, d: 13, hex: '#D8CEBA' },
        // 4 Marine bronze corner brackets with heavy bolt studs
        { x: -7, y: 0.5, z: -7, w: 2.2, h: 4, d: 2.2, hex: '#A8773D' },
        { x: 4.8, y: 0.5, z: -7, w: 2.2, h: 4, d: 2.2, hex: '#A8773D' },
        { x: -7, y: 0.5, z: 4.8, w: 2.2, h: 4, d: 2.2, hex: '#A8773D' },
        { x: 4.8, y: 0.5, z: 4.8, w: 2.2, h: 4, d: 2.2, hex: '#A8773D' },
        // Corner bolt studs
        { x: -6.7, y: 3.5, z: -7.2, w: 1.6, h: 1.2, d: 0.6, hex: '#F2B544' },
        { x: 5.1, y: 3.5, z: -7.2, w: 1.6, h: 1.2, d: 0.6, hex: '#F2B544' },
        { x: -6.7, y: 3.5, z: 6.6, w: 1.6, h: 1.2, d: 0.6, hex: '#F2B544' },
        { x: 5.1, y: 3.5, z: 6.6, w: 1.6, h: 1.2, d: 0.6, hex: '#F2B544' },

        // 2. Central Pedestal Shaft & Gold Celestial Meridian Inlay
        { x: -4.5, y: 6, z: -4.5, w: 9, h: 5, d: 9, hex: '#EDE4D0' },
        { x: -5, y: 8, z: -5, w: 10, h: 1.2, d: 10, hex: '#F2B544', emissive: 0.85 },
        // Meridian runic channels on shaft faces
        { x: -0.6, y: 6.2, z: 4.6, w: 1.2, h: 4.6, d: 0.4, hex: '#5CE1E6', emissive: 1.1 },
        { x: -0.6, y: 6.2, z: -5.0, w: 1.2, h: 4.6, d: 0.4, hex: '#5CE1E6', emissive: 1.1 },
        { x: -5.0, y: 6.2, z: -0.6, w: 0.4, h: 4.6, d: 1.2, hex: '#5CE1E6', emissive: 1.1 },
        { x: 4.6, y: 6.2, z: -0.6, w: 0.4, h: 4.6, d: 1.2, hex: '#5CE1E6', emissive: 1.1 },

        // 3. Polished Sandstone Desktop
        { x: -8, y: 11, z: -6, w: 16, h: 2.5, d: 12, hex: '#EDE4D0' },
        { x: -8.2, y: 13, z: -6.2, w: 16.4, h: 0.6, d: 12.4, hex: '#D8CEBA' },

        // 4. Inlaid Celestial Astrolabe Star Dial on Desk Surface
        // Outer concentric brass bezel ring
        { x: -4.8, y: 13.6, z: 0.2, w: 4.6, h: 0.4, d: 4.6, hex: '#A8773D' },
        { x: -4.2, y: 13.8, z: 0.8, w: 3.4, h: 0.3, d: 3.4, hex: '#F2B544', emissive: 0.95 },
        // 8-point compass azimuth markings & glowing star pointer
        { x: -2.8, y: 14.1, z: 1.0, w: 0.6, h: 0.3, d: 3.0, hex: '#FFF5D6', emissive: 1.25 },
        { x: -4.0, y: 14.1, z: 2.2, w: 3.0, h: 0.3, d: 0.6, hex: '#FFF5D6', emissive: 1.25 },

        // 5. Glowing Brass Chronometer Housing & Faceted Cyan Glass
        { x: 1.5, y: 13.6, z: 1.0, w: 3.2, h: 1.0, d: 3.2, hex: '#A8773D' },
        { x: 1.8, y: 14.4, z: 1.3, w: 2.6, h: 0.3, d: 2.6, hex: '#5CE1E6', emissive: 1.3 },
        { x: 2.8, y: 14.7, z: 2.3, w: 0.6, h: 0.2, d: 1.2, hex: '#FFF5D6', emissive: 1.4 },

        // 6. Holographic Starry Projector Lens at Desk Center
        { x: -1.0, y: 13.6, z: -1.8, w: 2.0, h: 0.8, d: 2.0, hex: '#A8773D' },
        { x: -0.6, y: 14.2, z: -1.4, w: 1.2, h: 0.4, d: 1.2, hex: '#9EEFFF', emissive: 1.4 },

        // 7. Slanted Nautical Console Housing & Faceted Cyan Screens
        { x: -6.5, y: 13.5, z: -5.0, w: 13, h: 8.0, d: 4.5, hex: '#2A3B4C' },
        { x: -5.6, y: 14.2, z: -1.2, w: 11.2, h: 6.6, d: 0.9, hex: '#18364A' },
        // Cyan CRT faceted screen glass
        { x: -5.2, y: 14.5, z: -0.5, w: 10.4, h: 6.0, d: 0.4, hex: '#1C4A63' },

        // Celestial code lines
        { x: -4.4, y: 19.0, z: -0.1, w: 3.4, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.3 },
        { x: -0.5, y: 19.0, z: -0.1, w: 4.8, h: 0.6, d: 0.3, hex: '#5CE1E6', emissive: 1.3 },
        { x: -4.4, y: 17.5, z: -0.1, w: 6.0, h: 0.6, d: 0.3, hex: '#6DBE4B', emissive: 1.2 },
        { x: -3.0, y: 16.0, z: -0.1, w: 7.2, h: 0.6, d: 0.3, hex: '#5CE1E6', emissive: 1.3 },
        { x: -4.4, y: 14.6, z: -0.1, w: 4.6, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.2 },

        // 8. Right Flank: Brass Sextant Mounting Bracket & Sight Tube
        { x: 6.8, y: 11, z: -2.5, w: 1.8, h: 8.5, d: 4.5, hex: '#A8773D' },
        { x: 7.2, y: 17, z: -4.0, w: 1.2, h: 6.0, d: 1.6, hex: '#F2B544', emissive: 0.95 },
        { x: 7.2, y: 20, z: -2.6, w: 1.2, h: 1.8, d: 4.0, hex: '#5CE1E6', emissive: 1.15 },
        // Fine adjustment screw & vernier arc
        { x: 7.6, y: 15, z: -1.0, w: 0.8, h: 1.5, d: 1.5, hex: '#FFF5D6', emissive: 1.1 },

        // 9. Left Flank: Resonating Sea Crystal Sensor & Copper Tuning Forks
        { x: -8.6, y: 11, z: -2.0, w: 1.8, h: 5.5, d: 3.0, hex: '#A8773D' },
        { x: -8.8, y: 16.5, z: -1.6, w: 2.2, h: 4.5, d: 2.2, hex: '#5CE1E6', emissive: 1.35 },
        // Copper tuning forks
        { x: -8.8, y: 19.5, z: -2.6, w: 0.6, h: 3.0, d: 0.6, hex: '#B87333', emissive: 0.9 },
        { x: -8.8, y: 19.5, z: -0.6, w: 0.6, h: 3.0, d: 0.6, hex: '#B87333', emissive: 0.9 }
      );
      break;
    }

    case 'bit_terminal': {
      // ----------------------------------------------------------------------
      // BIT TERMINAL: Ancient Mossy Druidic Desk, Dynamos, Teal Canopy & Cells
      // ----------------------------------------------------------------------
      boxes.push(
        // 1. Weathered Dark Oak Footings & Root Tendrils with Moss
        { x: -8.0, y: 0, z: -7.0, w: 16, h: 2, d: 14, hex: '#342013' },
        { x: -7.5, y: 2, z: -6.5, w: 4.5, h: 9, d: 13, hex: '#4E311F' },
        { x: 3.0, y: 2, z: -6.5, w: 4.5, h: 9, d: 13, hex: '#4E311F' },
        // Moss pockets on desk legs
        { x: -7.8, y: 1, z: 3.5, w: 2.0, h: 4.0, d: 2.0, hex: '#5FA32A' },
        { x: 5.2, y: 1, z: -5.5, w: 2.2, h: 3.5, d: 1.8, hex: '#488220' },
        { x: -7.7, y: 3, z: -4.5, w: 1.2, h: 2.5, d: 2.0, hex: '#76BF31' },

        // Brass drawer handles & root inlays
        { x: -7.8, y: 5.5, z: 0, w: 0.6, h: 1.8, d: 1.8, hex: '#F2B544', emissive: 0.8 },
        { x: 7.2, y: 5.5, z: 0, w: 0.6, h: 1.8, d: 1.8, hex: '#F2B544', emissive: 0.8 },

        // 2. Solid Expedition Dark Oak Desktop
        { x: -8.5, y: 11, z: -7.5, w: 17, h: 2.2, d: 15, hex: '#7A5233' },
        // Brass desktop corner braces
        { x: -8.7, y: 10.8, z: -7.7, w: 2.4, h: 2.6, d: 2.4, hex: '#A8773D' },
        { x: 6.3, y: 10.8, z: -7.7, w: 2.4, h: 2.6, d: 2.4, hex: '#A8773D' },
        { x: -8.7, y: 10.8, z: 5.3, w: 2.4, h: 2.6, d: 2.4, hex: '#A8773D' },
        { x: 6.3, y: 10.8, z: 5.3, w: 2.4, h: 2.6, d: 2.4, hex: '#A8773D' },
        // Leather field blotter on desk
        { x: -4.5, y: 13.2, z: -1.0, w: 9.0, h: 0.2, d: 6.0, hex: '#3D2714' },

        // 3. Teal Canvas Overhang / Sunshade Canopy Overhead
        // Awning timber support poles
        { x: -8.0, y: 13, z: -7.0, w: 1.2, h: 15, d: 1.2, hex: '#5B3A27' },
        { x: 6.8, y: 13, z: -7.0, w: 1.2, h: 15, d: 1.2, hex: '#5B3A27' },
        // Horizontal canopy cross-spar
        { x: -8.5, y: 27.5, z: -7.2, w: 17, h: 1.2, d: 1.6, hex: '#7A5233' },
        // Arched teal canvas sunshade awning
        { x: -9.0, y: 28.5, z: -7.5, w: 18, h: 1.4, d: 9.0, hex: '#2E8B8B' },
        { x: -9.2, y: 29.5, z: -7.0, w: 18.4, h: 0.8, d: 7.5, hex: '#3AAFA9' },
        // Scalloped front valence
        { x: -9.0, y: 27.0, z: 1.0, w: 18, h: 1.8, d: 0.8, hex: '#4CD7E0', emissive: 0.6 },

        // 4. Ruggedized Druidic Monitor
        { x: -6.0, y: 13, z: -5.5, w: 12, h: 8.0, d: 4.5, hex: '#243A2C' },
        { x: -5.2, y: 13.8, z: -1.4, w: 10.4, h: 6.4, d: 0.9, hex: '#1B3D2B' },
        // Code bars: emerald and sky blue
        { x: -4.2, y: 18.4, z: -0.3, w: 3.2, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.25 },
        { x: -0.5, y: 18.4, z: -0.3, w: 4.5, h: 0.6, d: 0.3, hex: '#6DBE4B', emissive: 1.3 },
        { x: -4.2, y: 17.0, z: -0.3, w: 7.0, h: 0.6, d: 0.3, hex: '#6DBE4B', emissive: 1.25 },
        { x: -3.2, y: 15.6, z: -0.3, w: 6.0, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.25 },
        { x: -4.2, y: 14.2, z: -0.3, w: 4.4, h: 0.6, d: 0.3, hex: '#9EEFFF', emissive: 1.3 },

        // 5. Tactile Mechanical Keyboard
        { x: -5.0, y: 13.2, z: 0.8, w: 10, h: 0.9, d: 4.2, hex: '#3A464C' },
        { x: -3.5, y: 14.0, z: 1.5, w: 2.8, h: 0.4, d: 2.2, hex: '#6DBE4B', emissive: 0.95 },
        { x: 0.8, y: 14.0, z: 1.5, w: 2.8, h: 0.4, d: 2.2, hex: '#4BACE8', emissive: 0.95 },

        // 6. Right Flank: Copper Spark Dynamo & Telemetry Beacon
        { x: 6.8, y: 13, z: -3.2, w: 2.2, h: 3.5, d: 2.5, hex: '#5B3A27' },
        // Ribbed copper coil spark dynamo
        { x: 7.0, y: 16.5, z: -3.0, w: 1.8, h: 4.0, d: 2.0, hex: '#B87333', emissive: 0.8 },
        // Spark gap electrodes with crackling electric spark
        { x: 7.2, y: 20.5, z: -2.5, w: 1.4, h: 1.2, d: 1.4, hex: '#9EEFFF', emissive: 1.45 },
        // Telemetry mast & top beacon
        { x: 7.3, y: 21.7, z: -2.5, w: 1.0, h: 8.5, d: 1.0, hex: '#7A5233' },
        { x: 6.8, y: 30.0, z: -3.0, w: 2.0, h: 2.0, d: 2.0, hex: '#4BACE8', emissive: 1.4 },

        // 7. Left Flank: Crystal Battery Cells & Data Cartridge Bay
        { x: -9.0, y: 13, z: -2.5, w: 2.0, h: 4.0, d: 4.5, hex: '#3A464C' },
        // Dual glass battery cylinders filled with glowing ionic electrolyte
        { x: -9.2, y: 15.0, z: -1.8, w: 1.8, h: 4.5, d: 1.4, hex: '#6DBE4B', emissive: 1.35 },
        { x: -9.2, y: 15.0, z: 0.2, w: 1.8, h: 4.5, d: 1.4, hex: '#4CD7E0', emissive: 1.35 },
        // Copper terminal caps
        { x: -9.3, y: 19.5, z: -1.9, w: 2.0, h: 0.8, d: 1.6, hex: '#B87333' },
        { x: -9.3, y: 19.5, z: 0.1, w: 2.0, h: 0.8, d: 1.6, hex: '#B87333' }
      );
      break;
    }

    case 'gate_console': {
      // ----------------------------------------------------------------------
      // GATE CONSOLE: Fortified Obsidian Pulpit, Levers, Gear Racks & Logic LEDs
      // ----------------------------------------------------------------------
      boxes.push(
        // 1. Chiseled Volcanic Obsidian & Dark Granite Base
        { x: -8.5, y: 0, z: -8.5, w: 17, h: 2.8, d: 17, hex: '#1E2226' },
        { x: -7.5, y: 2.8, z: -7.5, w: 15, h: 4.2, d: 15, hex: '#2C3439' },
        // Riveted wrought iron structural bands
        { x: -8.0, y: 1.8, z: -8.0, w: 16, h: 1.4, d: 16, hex: '#1E252B' },
        { x: -8.0, y: 6.0, z: -8.0, w: 16, h: 1.4, d: 16, hex: '#1E252B' },
        // 4 Corner iron gussets with heavy studs
        { x: -8.0, y: 0.5, z: -8.0, w: 2.2, h: 7.0, d: 2.2, hex: '#505A61' },
        { x: 5.8, y: 0.5, z: -8.0, w: 2.2, h: 7.0, d: 2.2, hex: '#505A61' },
        { x: -8.0, y: 0.5, z: 5.8, w: 2.2, h: 7.0, d: 2.2, hex: '#505A61' },
        { x: 5.8, y: 0.5, z: 5.8, w: 2.2, h: 7.0, d: 2.2, hex: '#505A61' },

        // 2. Basalt Column Shaft
        { x: -5.5, y: 7.0, z: -5.5, w: 11, h: 4.5, d: 11, hex: '#3A464C' },

        // 3. Heavy Iron Console Table & Hazard Warning Trim
        { x: -8.0, y: 11.5, z: -6.5, w: 16, h: 2.5, d: 13, hex: '#5E666D' },
        { x: -6.5, y: 12.0, z: 6.2, w: 13, h: 1.6, d: 0.6, hex: '#F2B544', emissive: 0.95 },
        { x: -4.0, y: 12.0, z: 6.3, w: 3.5, h: 1.6, d: 0.6, hex: '#1E252B' },
        { x: 1.5, y: 12.0, z: 6.3, w: 3.5, h: 1.6, d: 0.6, hex: '#1E252B' },

        // 4. Heavy Iron Levers in Mechanical Guide Slots
        { x: -3.5, y: 14.0, z: 2.0, w: 0.8, h: 4.5, d: 0.8, hex: '#505A61' },
        { x: -3.7, y: 18.2, z: 1.8, w: 1.2, h: 1.2, d: 1.2, hex: '#FF4D4D', emissive: 1.3 },
        { x: 2.5, y: 14.0, z: 2.0, w: 0.8, h: 4.5, d: 0.8, hex: '#505A61' },
        { x: 2.3, y: 18.2, z: 1.8, w: 1.2, h: 1.2, d: 1.2, hex: '#50FA7B', emissive: 1.3 },

        // 5. Binary Logic Indicators on Flanks of Screen
        // Left Column (Red & Green logic status LEDs)
        { x: -5.6, y: 18.5, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#FF4D4D', emissive: 1.4 },
        { x: -5.6, y: 17.0, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#50FA7B', emissive: 1.4 },
        { x: -5.6, y: 15.5, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#50FA7B', emissive: 1.4 },
        { x: -5.6, y: 14.0, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#FF4D4D', emissive: 1.4 },
        // Right Column
        { x: 4.8, y: 18.5, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#50FA7B', emissive: 1.4 },
        { x: 4.8, y: 17.0, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#50FA7B', emissive: 1.4 },
        { x: 4.8, y: 15.5, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#FF4D4D', emissive: 1.4 },
        { x: 4.8, y: 14.0, z: -0.8, w: 0.8, h: 0.8, d: 0.4, hex: '#50FA7B', emissive: 1.4 },

        // 6. Armored Security Display Bezel & Screen
        { x: -6.0, y: 13.5, z: -5.0, w: 12, h: 7.5, d: 4.5, hex: '#1E252B' },
        { x: -4.5, y: 14.2, z: -1.2, w: 9.0, h: 6.0, d: 0.9, hex: '#172738' },
        // Security cipher code lines
        { x: -3.8, y: 18.5, z: -0.1, w: 3.2, h: 0.6, d: 0.3, hex: '#E0603F', emissive: 1.3 },
        { x: -0.2, y: 18.5, z: -0.1, w: 4.5, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.3 },
        { x: -3.8, y: 17.0, z: -0.1, w: 6.2, h: 0.6, d: 0.3, hex: '#4BACE8', emissive: 1.25 },
        { x: -2.6, y: 15.5, z: -0.1, w: 5.8, h: 0.6, d: 0.3, hex: '#5CE1E6', emissive: 1.25 },
        { x: -3.8, y: 14.0, z: -0.1, w: 4.2, h: 0.6, d: 0.3, hex: '#E0603F', emissive: 1.2 },

        // 7. Right Flank: Bronze Gear Rack & Twin Mechanical Tumblers
        { x: 6.5, y: 12, z: -2.5, w: 2.8, h: 7.0, d: 4.5, hex: '#1E252B' },
        // Exposed bronze gear rack with teeth
        { x: 7.2, y: 12.5, z: 1.5, w: 1.6, h: 6.5, d: 1.0, hex: '#A8773D' },
        { x: 7.4, y: 13.0, z: 2.3, w: 1.2, h: 0.8, d: 0.6, hex: '#F2B544' },
        { x: 7.4, y: 15.0, z: 2.3, w: 1.2, h: 0.8, d: 0.6, hex: '#F2B544' },
        { x: 7.4, y: 17.0, z: 2.3, w: 1.2, h: 0.8, d: 0.6, hex: '#F2B544' },
        // Twin tumblers
        { x: 7.0, y: 16.0, z: -1.2, w: 2.0, h: 2.2, d: 2.2, hex: '#E0603F', emissive: 1.25 },
        { x: 7.0, y: 13.2, z: -1.2, w: 2.0, h: 2.2, d: 2.2, hex: '#4BACE8', emissive: 1.25 },

        // 8. Left Flank: Armored Interlock Plate & Status Conduit
        { x: -8.5, y: 12, z: -2.5, w: 1.8, h: 6.0, d: 4.5, hex: '#3A464C' },
        { x: -8.8, y: 14.5, z: -0.8, w: 2.0, h: 2.8, d: 1.8, hex: '#4BACE8', emissive: 1.3 }
      );
      break;
    }

    case 'farm_console': {
      // ----------------------------------------------------------------------
      // FARM CONSOLE: Aqueduct Sluice Brass Pedestal, Gauges, Cogs & Display
      // ----------------------------------------------------------------------
      boxes.push(
        // 1. Terraced Fieldstone Plinth with Water-Worn Moss
        { x: -8.0, y: 0, z: -8.0, w: 16, h: 2.8, d: 16, hex: '#5E666D' },
        { x: -7.0, y: 2.8, z: -7.0, w: 14, h: 3.2, d: 14, hex: '#778087' },
        // Moss pockets on plinth
        { x: -7.2, y: 3.0, z: 2.5, w: 3.8, h: 1.2, d: 4.2, hex: '#5FA32A' },
        { x: 3.8, y: 3.0, z: -6.0, w: 2.8, h: 1.2, d: 3.2, hex: '#488220' },

        // 2. Polished Brass Sluice Pedestal Shaft
        { x: -5.0, y: 6.0, z: -5.0, w: 10, h: 5.5, d: 10, hex: '#99A2A8' },
        // Front Sluice Control Handwheel Valve
        { x: -1.5, y: 7.5, z: 4.8, w: 3.0, h: 3.0, d: 0.8, hex: '#A8773D' },
        { x: -0.5, y: 8.5, z: 5.4, w: 1.0, h: 1.0, d: 0.6, hex: '#F2B544', emissive: 1.1 },

        // 3. Terraced Stone Desk Table
        { x: -7.5, y: 11.5, z: -6.0, w: 15, h: 2.5, d: 12, hex: '#99A2A8' },
        { x: -4.5, y: 14.0, z: 1.2, w: 9.0, h: 0.4, d: 4.0, hex: '#7A5233' },

        // 4. Weatherproof Botanical Display Housing
        { x: -6.0, y: 14.0, z: -5.0, w: 12, h: 7.5, d: 4.5, hex: '#354E3C' },
        { x: -5.2, y: 14.8, z: -1.2, w: 10.4, h: 6.0, d: 0.9, hex: '#153629' },
        // Botanical code lines
        { x: -4.4, y: 19.0, z: -0.1, w: 3.2, h: 0.6, d: 0.3, hex: '#76BF31', emissive: 1.3 },
        { x: -0.6, y: 19.0, z: -0.1, w: 4.8, h: 0.6, d: 0.3, hex: '#4CD7E0', emissive: 1.3 },
        { x: -4.4, y: 17.5, z: -0.1, w: 6.2, h: 0.6, d: 0.3, hex: '#76BF31', emissive: 1.25 },
        { x: -3.0, y: 16.0, z: -0.1, w: 6.4, h: 0.6, d: 0.3, hex: '#4CD7E0', emissive: 1.25 },
        { x: -4.4, y: 14.5, z: -0.1, w: 4.0, h: 0.6, d: 0.3, hex: '#9EEFFF', emissive: 1.2 },

        // 5. Right Flank: Waterwheel Pressure Gauges & Spinning Cogwheels
        { x: 6.5, y: 0, z: -2.5, w: 1.8, h: 20, d: 1.8, hex: '#A8773D' },
        // Dual circular pressure barometers with glowing dials
        { x: 6.4, y: 19.0, z: -3.0, w: 3.0, h: 3.0, d: 1.6, hex: '#A8773D' },
        { x: 6.7, y: 19.5, z: -3.3, w: 2.4, h: 2.4, d: 0.5, hex: '#4CD7E0', emissive: 1.35 },
        { x: 6.4, y: 15.0, z: -3.0, w: 2.6, h: 2.6, d: 1.6, hex: '#A8773D' },
        { x: 6.7, y: 15.5, z: -3.3, w: 2.0, h: 2.0, d: 0.5, hex: '#76BF31', emissive: 1.3 },
        // Intermeshing brass cogwheels on bracket
        { x: 6.8, y: 12.0, z: 0.2, w: 1.4, h: 2.8, d: 2.8, hex: '#F2B544', emissive: 1.1 },
        { x: 6.8, y: 14.0, z: 2.0, w: 1.4, h: 2.2, d: 2.2, hex: '#E5793A', emissive: 1.1 },

        // 6. Left Flank: Glass Nutrient Seed Reservoir & Sight Hopper
        { x: -8.0, y: 11.5, z: -1.2, w: 2.0, h: 4.5, d: 2.2, hex: '#A8773D' },
        { x: -8.3, y: 15.5, z: -1.2, w: 2.5, h: 5.0, d: 2.5, hex: '#4CD7E0', emissive: 1.2 },
        { x: -8.0, y: 16.0, z: -0.9, w: 1.8, h: 3.0, d: 1.8, hex: '#76BF31', emissive: 1.35 }
      );
      break;
    }

    case 'workshop_console': {
      // ----------------------------------------------------------------------
      // WORKSHOP CONSOLE: Steampunk Magitech Housing, Vacuum Tubes & Cogs
      // ----------------------------------------------------------------------
      boxes.push(
        // 1. Heavy Cast Iron Footing Base
        { x: -8.5, y: 0, z: -8.5, w: 17, h: 2.8, d: 17, hex: '#252D32' },
        // 2. Steampunk Bronze Boiler Machine Body
        { x: -7.5, y: 2.8, z: -7.5, w: 15, h: 9.0, d: 15, hex: '#8F5D3C' },
        // Glowing exhaust combustion heat vents on flanks
        { x: -7.8, y: 5.5, z: -4.5, w: 0.8, h: 4.5, d: 9.0, hex: '#FF7700', emissive: 1.4 },
        { x: 7.0, y: 5.5, z: -4.5, w: 0.8, h: 4.5, d: 9.0, hex: '#FF7700', emissive: 1.4 },
        // Heavy riveted boiler seams
        { x: -7.7, y: 2.8, z: -7.7, w: 15.4, h: 1.2, d: 15.4, hex: '#5C3D27' },

        // 3. Glowing Glass Vacuum Tubes on Top of Boiler Housing
        // Tube 1
        { x: -3.8, y: 11.8, z: 3.5, w: 1.4, h: 3.5, d: 1.4, hex: '#FFE29A', emissive: 1.45 },
        { x: -4.0, y: 11.4, z: 3.3, w: 1.8, h: 0.8, d: 1.8, hex: '#B87333' },
        // Tube 2
        { x: -0.7, y: 11.8, z: 3.5, w: 1.4, h: 3.5, d: 1.4, hex: '#FF9900', emissive: 1.45 },
        { x: -0.9, y: 11.4, z: 3.3, w: 1.8, h: 0.8, d: 1.8, hex: '#B87333' },
        // Tube 3
        { x: 2.4, y: 11.8, z: 3.5, w: 1.4, h: 3.5, d: 1.4, hex: '#FFE29A', emissive: 1.45 },
        { x: 2.2, y: 11.4, z: 3.3, w: 1.8, h: 0.8, d: 1.8, hex: '#B87333' },

        // 4. Machine Worktable Plate & Heavy Bezel
        { x: -8.0, y: 11.5, z: -6.5, w: 16, h: 2.5, d: 13, hex: '#8F5D3C' },
        { x: -8.2, y: 13.0, z: -6.7, w: 16.4, h: 0.9, d: 13.4, hex: '#3A464C' },

        // 5. Heavy Riveted CRT Vector Terminal Housing
        { x: -6.0, y: 14.0, z: -5.0, w: 12, h: 7.5, d: 4.5, hex: '#5C3D27' },
        { x: -5.2, y: 14.8, z: -1.2, w: 10.4, h: 6.0, d: 0.9, hex: '#382515' },
        // Amber phosphor vector code lines
        { x: -4.4, y: 19.0, z: -0.1, w: 3.8, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.3 },
        { x: 0.0, y: 19.0, z: -0.1, w: 4.5, h: 0.6, d: 0.3, hex: '#E5793A', emissive: 1.3 },
        { x: -4.4, y: 17.5, z: -0.1, w: 6.8, h: 0.6, d: 0.3, hex: '#F2B544', emissive: 1.25 },
        { x: -2.8, y: 16.0, z: -0.1, w: 6.2, h: 0.6, d: 0.3, hex: '#FFF5D6', emissive: 1.3 },
        { x: -4.4, y: 14.5, z: -0.1, w: 4.2, h: 0.6, d: 0.3, hex: '#E5793A', emissive: 1.2 },

        // 6. Right Flank: Intermeshing Brass Cogs & Steam Chimney
        { x: 6.5, y: 12, z: -2.5, w: 2.2, h: 6.5, d: 4.5, hex: '#5C3D27' },
        { x: 7.0, y: 16.5, z: -1.2, w: 2.2, h: 3.5, d: 3.5, hex: '#F2B544', emissive: 1.2 },
        { x: 7.0, y: 13.2, z: 0.5, w: 2.2, h: 2.8, d: 2.8, hex: '#E5793A', emissive: 1.2 },
        // Steam turbine exhaust chimney with brass cap
        { x: 7.0, y: 19.5, z: -2.2, w: 2.0, h: 6.0, d: 2.0, hex: '#3A464C' },
        { x: 6.8, y: 25.0, z: -2.4, w: 2.4, h: 1.0, d: 2.4, hex: '#F2B544' },

        // 7. Left Flank: Blueprint Projection Frame & Articulated Clamp
        { x: -8.5, y: 12, z: -1.5, w: 1.8, h: 5.5, d: 2.5, hex: '#8F5D3C' },
        // Glowing blueprint schematic display plate
        { x: -8.8, y: 16.0, z: -2.5, w: 2.0, h: 4.0, d: 5.0, hex: '#5CE1E6', emissive: 1.25 },
        { x: -8.9, y: 17.5, z: -1.8, w: 2.2, h: 0.4, d: 3.5, hex: '#F2B544', emissive: 1.35 }
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
        // Celestial Astrolabe Star Polyhedron + celestial code brackets
        boxes = [
          { x: -1.6, y: -1.6, z: -1.6, w: 3.2, h: 3.2, d: 3.2, hex: '#5CE1E6', emissive: 1.3 },
          { x: -0.9, y: -3.0, z: -0.9, w: 1.8, h: 6.0, d: 1.8, hex: '#F2B544', emissive: 1.25 },
          { x: -3.0, y: -0.9, z: -0.9, w: 6.0, h: 1.8, d: 1.8, hex: '#5CE1E6', emissive: 1.25 },
          { x: -0.9, y: -0.9, z: -3.0, w: 1.8, h: 1.8, d: 6.0, hex: '#FFF5D6', emissive: 1.35 },
          // Celestial code brackets < >
          { x: -4.0, y: -2.6, z: 0, w: 0.6, h: 5.2, d: 0.6, hex: '#5CE1E6', emissive: 1.25 },
          { x: -4.0, y: 2.2, z: 0, w: 1.5, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.25 },
          { x: -4.0, y: -2.6, z: 0, w: 1.5, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.25 },
          { x: 3.4, y: -2.6, z: 0, w: 0.6, h: 5.2, d: 0.6, hex: '#5CE1E6', emissive: 1.25 },
          { x: 2.5, y: 2.2, z: 0, w: 1.5, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.25 },
          { x: 2.5, y: -2.6, z: 0, w: 1.5, h: 0.6, d: 0.6, hex: '#5CE1E6', emissive: 1.25 },
        ];
        break;

      case 'bit_terminal':
        // Emerald Data Matrix Cube
        boxes = [
          { x: -2.0, y: -2.0, z: -2.0, w: 4.0, h: 4.0, d: 4.0, hex: '#6DBE4B', emissive: 1.3 },
          { x: -1.3, y: -1.3, z: -2.4, w: 2.6, h: 2.6, d: 4.8, hex: '#4BACE8', emissive: 1.3 },
          { x: -2.4, y: 1.5, z: -2.4, w: 1.1, h: 1.1, d: 1.1, hex: '#9EEFFF', emissive: 1.4 },
          { x: 1.3, y: 1.5, z: -2.4, w: 1.1, h: 1.1, d: 1.1, hex: '#9EEFFF', emissive: 1.4 },
          { x: -2.4, y: -2.6, z: 1.3, w: 1.1, h: 1.1, d: 1.1, hex: '#9EEFFF', emissive: 1.4 },
          { x: 1.3, y: -2.6, z: 1.3, w: 1.1, h: 1.1, d: 1.1, hex: '#9EEFFF', emissive: 1.4 },
        ];
        break;

      case 'gate_console':
        // Azure Rune Lock & Security Shield
        boxes = [
          { x: -2.4, y: -2.4, z: -0.9, w: 4.8, h: 4.8, d: 1.8, hex: '#4BACE8', emissive: 1.3 },
          { x: -1.6, y: -3.6, z: -0.7, w: 3.2, h: 2.0, d: 1.4, hex: '#355C8C', emissive: 1.2 },
          // Padlock shackle
          { x: -2.0, y: 2.2, z: -0.6, w: 0.9, h: 2.6, d: 1.2, hex: '#F2B544', emissive: 1.35 },
          { x: 1.1, y: 2.2, z: -0.6, w: 0.9, h: 2.6, d: 1.2, hex: '#F2B544', emissive: 1.35 },
          { x: -2.0, y: 4.2, z: -0.6, w: 4.0, h: 0.9, d: 1.2, hex: '#F2B544', emissive: 1.35 },
          // Glowing center rune keyway
          { x: -0.6, y: -1.4, z: 0.9, w: 1.2, h: 2.4, d: 0.5, hex: '#E0603F', emissive: 1.4 },
        ];
        break;

      case 'farm_console':
        // Jade Irrigation Sprout & Soil Moisture Droplets
        boxes = [
          { x: -0.7, y: -2.6, z: -0.7, w: 1.4, h: 5.2, d: 1.4, hex: '#76BF31', emissive: 1.25 },
          { x: -2.8, y: 0.6, z: -0.6, w: 2.6, h: 1.6, d: 1.2, hex: '#4CD7E0', emissive: 1.35 },
          { x: 0.7, y: 1.5, z: -0.6, w: 2.6, h: 1.6, d: 1.2, hex: '#76BF31', emissive: 1.3 },
          // Moisture droplet prism
          { x: -0.9, y: 3.2, z: -0.9, w: 1.8, h: 2.0, d: 1.8, hex: '#4CD7E0', emissive: 1.35 },
          { x: -0.5, y: 4.8, z: -0.5, w: 1.0, h: 1.2, d: 1.0, hex: '#9EEFFF', emissive: 1.45 },
        ];
        break;

      case 'workshop_console':
        // Amber Clockwork Master Cog & Projected Crosshairs
        boxes = [
          { x: -1.6, y: -1.6, z: -0.9, w: 3.2, h: 3.2, d: 1.8, hex: '#F2B544', emissive: 1.35 },
          { x: -0.7, y: -0.7, z: -1.5, w: 1.4, h: 1.4, d: 3.0, hex: '#FFF5D6', emissive: 1.4 },
          // 4 Cardinal cog teeth
          { x: -1.1, y: 2.2, z: -0.7, w: 2.2, h: 1.8, d: 1.4, hex: '#E5793A', emissive: 1.3 },
          { x: -1.1, y: -4.0, z: -0.7, w: 2.2, h: 1.8, d: 1.4, hex: '#E5793A', emissive: 1.3 },
          { x: -4.0, y: -1.1, z: -0.7, w: 1.8, h: 2.2, d: 1.4, hex: '#E5793A', emissive: 1.3 },
          { x: 2.2, y: -1.1, z: -0.7, w: 1.8, h: 2.2, d: 1.4, hex: '#E5793A', emissive: 1.3 },
          // Diagonal teeth
          { x: 1.6, y: 1.6, z: -0.7, w: 1.4, h: 1.4, d: 1.4, hex: '#F2B544', emissive: 1.25 },
          { x: -3.0, y: -3.0, z: -0.7, w: 1.4, h: 1.4, d: 1.4, hex: '#F2B544', emissive: 1.25 },
          { x: 1.6, y: -3.0, z: -0.7, w: 1.4, h: 1.4, d: 1.4, hex: '#F2B544', emissive: 1.25 },
          { x: -3.0, y: 1.6, z: -0.7, w: 1.4, h: 1.4, d: 1.4, hex: '#F2B544', emissive: 1.25 },
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
      <pointLight position={[0, 1.15, 0.2]} color={theme.primary} intensity={1.2} distance={5.0} decay={2} />
    </group>
  );
}

// ============================================================================
// 2. NEO PEDESTAL LANDMARK (AWAKENING STASIS POD DAIS)
// ============================================================================

function NeoPedestalLandmark({
  position,
  material,
}: {
  position: [number, number, number];
  material: THREE.Material;
}) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const midRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const orbRef = useRef<THREE.Group>(null);
  const floorPulseRef = useRef<THREE.Mesh>(null);

  // Awakening stasis pod dais with bronze pedestal pillars & glowing cybernetic glyphs
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Stepped Sanctuary Dais (y: 0..6.0)
      { x: -9.0, y: 0, z: -9.0, w: 18, h: 2.5, d: 18, hex: '#505A61' },
      { x: -7.5, y: 2.5, z: -7.5, w: 15, h: 2.0, d: 15, hex: '#6E757A' },
      { x: -6.0, y: 4.5, z: -6.0, w: 12, h: 1.5, d: 12, hex: '#99A2A8' },

      // 2. Four Monumental Bronze Pedestal Pillars at Dais Corners
      { x: -8.0, y: 2.5, z: -8.0, w: 2.4, h: 7.0, d: 2.4, hex: '#A8773D' },
      { x: 5.6, y: 2.5, z: -8.0, w: 2.4, h: 7.0, d: 2.4, hex: '#A8773D' },
      { x: -8.0, y: 2.5, z: 5.6, w: 2.4, h: 7.0, d: 2.4, hex: '#A8773D' },
      { x: 5.6, y: 2.5, z: 5.6, w: 2.4, h: 7.0, d: 2.4, hex: '#A8773D' },

      // Pillar Golden Capitals & Glowing Cyan Beacon Nodes
      { x: -8.2, y: 9.5, z: -8.2, w: 2.8, h: 1.2, d: 2.8, hex: '#F2B544', emissive: 0.9 },
      { x: 5.4, y: 9.5, z: -8.2, w: 2.8, h: 1.2, d: 2.8, hex: '#F2B544', emissive: 0.9 },
      { x: -8.2, y: 9.5, z: 5.4, w: 2.8, h: 1.2, d: 2.8, hex: '#F2B544', emissive: 0.9 },
      { x: 5.4, y: 9.5, z: 5.4, w: 2.8, h: 1.2, d: 2.8, hex: '#F2B544', emissive: 0.9 },

      { x: -7.6, y: 10.7, z: -7.6, w: 1.6, h: 1.6, d: 1.6, hex: '#5CE1E6', emissive: 1.35 },
      { x: 6.0, y: 10.7, z: -7.6, w: 1.6, h: 1.6, d: 1.6, hex: '#5CE1E6', emissive: 1.35 },
      { x: -7.6, y: 10.7, z: 6.0, w: 1.6, h: 1.6, d: 1.6, hex: '#5CE1E6', emissive: 1.35 },
      { x: 6.0, y: 10.7, z: 6.0, w: 1.6, h: 1.6, d: 1.6, hex: '#5CE1E6', emissive: 1.35 },

      // 3. Stasis Pod Alcove Backshell & Spine Conduit Harness
      { x: -6.5, y: 4.5, z: -8.0, w: 13, h: 16, d: 4.0, hex: '#2A476E' },
      { x: -5.5, y: 6.0, z: -6.5, w: 11, h: 13, d: 2.2, hex: '#1E324D' },
      // Overhanging capsule cowl / canopy overhead
      { x: -6.0, y: 19.5, z: -8.5, w: 12, h: 2.8, d: 6.0, hex: '#355C8C' },
      { x: -4.5, y: 21.0, z: -7.0, w: 9.0, h: 1.5, d: 4.5, hex: '#A8773D' },
      { x: -3.0, y: 22.5, z: -5.5, w: 6.0, h: 1.2, d: 3.0, hex: '#F2B544', emissive: 1.1 },

      // 4. Pulsing Blue Cybernetic Glyphs & Glowing Energy Conduits
      // Vertical cybernetic conduits running up the pod
      { x: -4.8, y: 6.5, z: -5.8, w: 1.5, h: 13, d: 1.5, hex: '#5CE1E6', emissive: 1.35 },
      { x: 3.3, y: 6.5, z: -5.8, w: 1.5, h: 13, d: 1.5, hex: '#5CE1E6', emissive: 1.35 },
      { x: -3.5, y: 15.0, z: -5.8, w: 7.0, h: 1.5, d: 1.5, hex: '#5ED8CB', emissive: 1.25 },
      // Horizontal cybernetic glyph inlays along backshell
      { x: -3.0, y: 18.0, z: -5.4, w: 6.0, h: 0.8, d: 0.5, hex: '#9EEFFF', emissive: 1.4 },
      { x: -2.5, y: 11.0, z: -5.4, w: 5.0, h: 0.8, d: 0.5, hex: '#9EEFFF', emissive: 1.4 },
      { x: -2.0, y: 8.0, z: -5.4, w: 4.0, h: 0.8, d: 0.5, hex: '#5CE1E6', emissive: 1.35 },

      // Radial floor energy circuits feeding central socket
      { x: -1.2, y: 4.7, z: -5.5, w: 2.4, h: 0.6, d: 5.5, hex: '#5CE1E6', emissive: 1.3 },
      { x: -4.5, y: 4.7, z: -2.0, w: 9.0, h: 0.6, d: 1.5, hex: '#5ED8CB', emissive: 1.2 },
      { x: -3.5, y: 4.7, z: 1.5, w: 7.0, h: 0.6, d: 1.5, hex: '#5CE1E6', emissive: 1.3 },

      // 5. Carved Bronze Pedestal Column & Flared Collar
      { x: -3.5, y: 5.5, z: -2.0, w: 7.0, h: 6.5, d: 7.0, hex: '#A8773D' },
      { x: -4.5, y: 12.0, z: -3.0, w: 9.0, h: 1.8, d: 9.0, hex: '#F2B544', emissive: 0.85 },

      // 6. Cradling Brass Stasis Claws
      { x: -1.4, y: 13.5, z: -4.5, w: 2.8, h: 5.0, d: 1.6, hex: '#A8773D' },
      { x: -1.4, y: 13.5, z: 2.0, w: 2.8, h: 5.0, d: 1.6, hex: '#A8773D' },
      { x: -5.0, y: 13.5, z: -1.4, w: 1.6, h: 5.0, d: 2.8, hex: '#A8773D' },
      { x: 3.4, y: 13.5, z: -1.4, w: 1.6, h: 5.0, d: 2.8, hex: '#A8773D' },

      // Claw focus emitter nodes
      { x: -0.8, y: 18.0, z: -4.3, w: 1.6, h: 1.2, d: 1.2, hex: '#5CE1E6', emissive: 1.4 },
      { x: -0.8, y: 18.0, z: 2.2, w: 1.6, h: 1.2, d: 1.2, hex: '#5CE1E6', emissive: 1.4 },
      { x: -4.8, y: 18.0, z: -0.8, w: 1.2, h: 1.2, d: 1.6, hex: '#5CE1E6', emissive: 1.4 },
      { x: 3.6, y: 18.0, z: -0.8, w: 1.2, h: 1.2, d: 1.6, hex: '#5CE1E6', emissive: 1.4 },

      // 7. Glowing Turquoise Activation Socket
      { x: -2.8, y: 13.2, z: -2.8, w: 5.6, h: 1.4, d: 5.6, hex: '#5ED8CB', emissive: 1.35 },
      { x: -1.6, y: 13.8, z: -1.6, w: 3.2, h: 0.8, d: 3.2, hex: '#FFF8DC', emissive: 1.4 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Floating Activation Orb with Inner Radiant Star Core
  const orbGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Outer translucent turquoise gyro cage
      { x: -2.0, y: -2.0, z: -2.0, w: 4.0, h: 4.0, d: 4.0, hex: '#5CE1E6', emissive: 1.25 },
      { x: -2.8, y: -1.2, z: -1.2, w: 5.6, h: 2.4, d: 2.4, hex: '#5ED8CB', emissive: 1.2 },
      { x: -1.2, y: -2.8, z: -1.2, w: 2.4, h: 5.6, d: 2.4, hex: '#5ED8CB', emissive: 1.2 },
      { x: -1.2, y: -1.2, z: -2.8, w: 2.4, h: 2.4, d: 5.6, hex: '#5ED8CB', emissive: 1.2 },
      // Inner glowing star core
      { x: -0.9, y: -0.9, z: -0.9, w: 1.8, h: 1.8, d: 1.8, hex: '#FFF8DC', emissive: 1.4 },
      { x: -0.5, y: -1.6, z: -0.5, w: 1.0, h: 3.2, d: 1.0, hex: '#FFF5D6', emissive: 1.45 },
      { x: -1.6, y: -0.5, z: -0.5, w: 3.2, h: 1.0, d: 1.0, hex: '#F2B544', emissive: 1.35 },
      { x: -0.5, y: -0.5, z: -1.6, w: 1.0, h: 1.0, d: 3.2, hex: '#F2B544', emissive: 1.35 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 1.1;
      outerRingRef.current.rotation.x = Math.sin(t * 0.8) * 0.35;
    }
    if (midRingRef.current) {
      midRingRef.current.rotation.y = -t * 1.4;
      midRingRef.current.rotation.z = Math.cos(t * 0.9) * 0.45;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.x = t * 1.8;
      innerRingRef.current.rotation.y = Math.sin(t * 1.2) * 0.5;
    }
    if (orbRef.current) {
      orbRef.current.rotation.y = t * 1.2;
      orbRef.current.position.y = 1.18 + Math.sin(t * 2.4) * 0.07;
    }
    if (floorPulseRef.current) {
      const mat = floorPulseRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.55 + Math.sin(t * 3.0) * 0.2;
      }
    }
  });

  return (
    <group position={position} name="landmark-neo-pedestal">
      {/* Ancient Sculpted Stasis Pod Dais */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Floating Activation Orb with Inner Star Core */}
      <group ref={orbRef} position={[0, 1.18, 0]}>
        <mesh geometry={orbGeo} material={material} />
      </group>

      {/* Primary Cyan Gyro Ring */}
      <mesh ref={outerRingRef} position={[0, 1.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.52, 0.026, 10, 36]} />
        <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={1.05} roughness={0.2} />
      </mesh>

      {/* Secondary Golden Celestial Ring */}
      <mesh ref={midRingRef} position={[0, 1.18, 0]} rotation={[0.4, 0.5, 0]}>
        <torusGeometry args={[0.40, 0.020, 8, 30]} />
        <meshStandardMaterial color="#F2B544" emissive="#F2B544" emissiveIntensity={0.95} roughness={0.25} />
      </mesh>

      {/* Inner Azure Rune Ring */}
      <mesh ref={innerRingRef} position={[0, 1.18, 0]} rotation={[-0.3, 0.2, 0]}>
        <torusGeometry args={[0.28, 0.016, 8, 24]} />
        <meshStandardMaterial color="#FFF5D6" emissive="#FFF5D6" emissiveIntensity={1.1} roughness={0.2} />
      </mesh>

      {/* Pulsing Floor Stasis Ring */}
      <mesh ref={floorPulseRef} position={[0, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.65, 32]} />
        <meshBasicMaterial color="#5CE1E6" transparent opacity={0.65} />
      </mesh>

      {/* Floor Activation Matrix Light */}
      <pointLight position={[0, 1.25, 0]} color="#5CE1E6" intensity={2.2} distance={9} decay={2} />
    </group>
  );
}

// ============================================================================
// 3. BEACON TOWER LANDMARK (COASTAL LIGHTHOUSE WITH SPIRAL BUTTRESSES)
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
  const lanternLightRef = useRef<THREE.PointLight>(null);

  // Towering coastal lighthouse with spiral stone buttresses, balustrades & spire
  const towerGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Heavy Stepped Granite Foundation Plinth (y: 0..6.5)
      { x: -11.0, y: 0, z: -11.0, w: 22, h: 2.5, d: 22, hex: '#3A464C' },
      { x: -9.5, y: 2.5, z: -9.5, w: 19, h: 2.0, d: 19, hex: '#48545C' },
      { x: -8.0, y: 4.5, z: -8.0, w: 16, h: 2.0, d: 16, hex: '#5E666D' },

      // 4 Sweeping Spiral Stone Buttresses Curving Around Foundation
      // Corner NW
      { x: -11.5, y: 0, z: -11.5, w: 4.0, h: 5.0, d: 4.0, hex: '#3A464C' },
      { x: -9.5, y: 5, z: -9.5, w: 3.0, h: 6.5, d: 3.0, hex: '#48545C' },
      { x: -8.0, y: 11.5, z: -8.0, w: 2.5, h: 7.0, d: 2.5, hex: '#5E666D' },
      // Corner NE
      { x: 7.5, y: 0, z: -11.5, w: 4.0, h: 5.0, d: 4.0, hex: '#3A464C' },
      { x: 6.5, y: 5, z: -9.5, w: 3.0, h: 6.5, d: 3.0, hex: '#48545C' },
      { x: 5.5, y: 11.5, z: -8.0, w: 2.5, h: 7.0, d: 2.5, hex: '#5E666D' },
      // Corner SW
      { x: -11.5, y: 0, z: 7.5, w: 4.0, h: 5.0, d: 4.0, hex: '#3A464C' },
      { x: -9.5, y: 5, z: 6.5, w: 3.0, h: 6.5, d: 3.0, hex: '#48545C' },
      { x: -8.0, y: 11.5, z: 5.5, w: 2.5, h: 7.0, d: 2.5, hex: '#5E666D' },
      // Corner SE
      { x: 7.5, y: 0, z: 7.5, w: 4.0, h: 5.0, d: 4.0, hex: '#3A464C' },
      { x: 6.5, y: 5, z: 6.5, w: 3.0, h: 6.5, d: 3.0, hex: '#48545C' },
      { x: 5.5, y: 11.5, z: 5.5, w: 2.5, h: 7.0, d: 2.5, hex: '#5E666D' },

      // 2. Sandstone & Red-Coral Lighthouse Shaft (y: 6.5..34)
      // Tier 1 body
      { x: -6.0, y: 6.5, z: -6.0, w: 12, h: 8.5, d: 12, hex: '#EDE4D0' },
      // Bronze corner quoins
      { x: -6.3, y: 6.5, z: -6.3, w: 1.6, h: 8.5, d: 1.6, hex: '#A8773D' },
      { x: 4.7, y: 6.5, z: -6.3, w: 1.6, h: 8.5, d: 1.6, hex: '#A8773D' },
      { x: -6.3, y: 6.5, z: 4.7, w: 1.6, h: 8.5, d: 1.6, hex: '#A8773D' },
      { x: 4.7, y: 6.5, z: 4.7, w: 1.6, h: 8.5, d: 1.6, hex: '#A8773D' },
      // Lower coral band
      { x: -6.2, y: 15.0, z: -6.2, w: 12.4, h: 3.2, d: 12.4, hex: '#D9433B' },

      // Tier 2 body with illuminated window embrasures
      { x: -5.5, y: 18.2, z: -5.5, w: 11, h: 8.0, d: 11, hex: '#EDE4D0' },
      { x: -1.4, y: 20.2, z: -5.8, w: 2.8, h: 4.2, d: 0.6, hex: '#F2B544', emissive: 1.15 },
      { x: -1.4, y: 20.2, z: 5.2, w: 2.8, h: 4.2, d: 0.6, hex: '#F2B544', emissive: 1.15 },
      { x: -5.8, y: 20.2, z: -1.4, w: 0.6, h: 4.2, d: 2.8, hex: '#F2B544', emissive: 1.15 },
      { x: 5.2, y: 20.2, z: -1.4, w: 0.6, h: 4.2, d: 2.8, hex: '#F2B544', emissive: 1.15 },
      // Mid coral band
      { x: -5.7, y: 26.2, z: -5.7, w: 11.4, h: 3.2, d: 11.4, hex: '#D9433B' },

      // Tier 3 upper neck
      { x: -4.8, y: 29.4, z: -4.8, w: 9.6, h: 5.0, d: 9.6, hex: '#EDE4D0' },

      // 8 Carved stone corbel brackets supporting balcony
      { x: -7.0, y: 32.4, z: -3.8, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },
      { x: -7.0, y: 32.4, z: 1.6, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },
      { x: 4.8, y: 32.4, z: -3.8, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },
      { x: 4.8, y: 32.4, z: 1.6, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },
      { x: -3.8, y: 32.4, z: -7.0, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },
      { x: 1.6, y: 32.4, z: -7.0, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },
      { x: -3.8, y: 32.4, z: 4.8, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },
      { x: 1.6, y: 32.4, z: 4.8, w: 2.2, h: 2.6, d: 2.2, hex: '#A8773D' },

      // 3. Grand Balcony Deck & Balustrade (y: 35..43)
      { x: -8.0, y: 35.0, z: -8.0, w: 16, h: 2.0, d: 16, hex: '#C6CED2' },
      { x: -8.3, y: 36.5, z: -8.3, w: 16.6, h: 0.8, d: 16.6, hex: '#A8773D' },

      // 4 Balustrade corner newel posts with brass finials
      { x: -7.8, y: 37.0, z: -7.8, w: 2.0, h: 5.5, d: 2.0, hex: '#3A464C' },
      { x: 5.8, y: 37.0, z: -7.8, w: 2.0, h: 5.5, d: 2.0, hex: '#3A464C' },
      { x: -7.8, y: 37.0, z: 5.8, w: 2.0, h: 5.5, d: 2.0, hex: '#3A464C' },
      { x: 5.8, y: 37.0, z: 5.8, w: 2.0, h: 5.5, d: 2.0, hex: '#3A464C' },

      { x: -7.6, y: 42.5, z: -7.6, w: 1.6, h: 1.4, d: 1.6, hex: '#F2B544', emissive: 0.85 },
      { x: 6.0, y: 42.5, z: -7.6, w: 1.6, h: 1.4, d: 1.6, hex: '#F2B544', emissive: 0.85 },
      { x: -7.6, y: 42.5, z: 6.0, w: 1.6, h: 1.4, d: 1.6, hex: '#F2B544', emissive: 0.85 },
      { x: 6.0, y: 42.5, z: 6.0, w: 1.6, h: 1.4, d: 1.6, hex: '#F2B544', emissive: 0.85 },

      // Continuous molded brass top rails
      { x: -7.8, y: 41.8, z: -7.8, w: 15.6, h: 1.0, d: 1.2, hex: '#F2B544' },
      { x: -7.8, y: 41.8, z: 6.6, w: 15.6, h: 1.0, d: 1.2, hex: '#F2B544' },
      { x: -7.8, y: 41.8, z: -7.8, w: 1.2, h: 1.0, d: 15.6, hex: '#F2B544' },
      { x: 6.6, y: 41.8, z: -7.8, w: 1.2, h: 1.0, d: 15.6, hex: '#F2B544' },

      // 4. Open-Air Lantern Cage Pavilion (y: 37..48)
      // 8 Fluted brass colonnade pillars framing the beacon chamber
      { x: -5.0, y: 37.0, z: -5.0, w: 1.8, h: 11.5, d: 1.8, hex: '#A8773D' },
      { x: 3.2, y: 37.0, z: -5.0, w: 1.8, h: 11.5, d: 1.8, hex: '#A8773D' },
      { x: -5.0, y: 37.0, z: 3.2, w: 1.8, h: 11.5, d: 1.8, hex: '#A8773D' },
      { x: 3.2, y: 37.0, z: 3.2, w: 1.8, h: 11.5, d: 1.8, hex: '#A8773D' },
      { x: -0.9, y: 37.0, z: -5.2, w: 1.8, h: 11.5, d: 1.4, hex: '#A8773D' },
      { x: -0.9, y: 37.0, z: 3.8, w: 1.8, h: 11.5, d: 1.4, hex: '#A8773D' },
      { x: -5.2, y: 37.0, z: -0.9, w: 1.4, h: 11.5, d: 1.8, hex: '#A8773D' },
      { x: 3.8, y: 37.0, z: -0.9, w: 1.4, h: 11.5, d: 1.8, hex: '#A8773D' },

      // 5. Peaked Slate Dome Roof & Crowning Brass Spire (y: 48.5..66)
      { x: -7.0, y: 48.5, z: -7.0, w: 14, h: 2.2, d: 14, hex: '#355C8C' },
      { x: -5.5, y: 50.7, z: -5.5, w: 11, h: 2.6, d: 11, hex: '#2A476E' },
      { x: -4.0, y: 53.3, z: -4.0, w: 8.0, h: 2.6, d: 8.0, hex: '#355C8C' },
      { x: -2.5, y: 55.9, z: -2.5, w: 5.0, h: 2.2, d: 5.0, hex: '#A8773D' },
      // Spire needle finial reaching skyward
      { x: -1.0, y: 58.1, z: -1.0, w: 2.0, h: 5.5, d: 2.0, hex: '#F2B544', emissive: 1.15 },
      { x: -0.5, y: 63.6, z: -0.5, w: 1.0, h: 5.0, d: 1.0, hex: '#FFE29A', emissive: 1.4 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Pulsing multi-faceted core crystal
  const coreGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -2.8, y: -2.8, z: -2.8, w: 5.6, h: 5.6, d: 5.6, hex: '#F2B544', emissive: 1.35 },
      { x: -1.6, y: -5.0, z: -1.6, w: 3.2, h: 10.0, d: 3.2, hex: '#FFF5D6', emissive: 1.4 },
      { x: -5.0, y: -1.6, z: -1.6, w: 10.0, h: 3.2, d: 3.2, hex: '#5CE1E6', emissive: 1.25 },
      { x: -1.6, y: -1.6, z: -5.0, w: 3.2, h: 3.2, d: 10.0, hex: '#5CE1E6', emissive: 1.25 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = restored ? 1.6 : 0.45;

    // Multi-tier rotating astrolabe gimbal rings
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

    // Breathing emissive glow on core crystal
    if (coreRef.current) {
      coreRef.current.rotation.y = -t * speed * 1.1;
      const pulse = restored ? 1.15 + Math.sin(t * 3.2) * 0.12 : 0.88 + Math.sin(t * 1.5) * 0.05;
      coreRef.current.scale.setScalar(pulse);
    }

    // Skyward beam shimmer & ascending pulse rings
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
    if (lanternLightRef.current) {
      lanternLightRef.current.intensity = restored
        ? 3.8 + Math.sin(t * 3.0) * 0.4
        : 0.85 + Math.sin(t * 1.2) * 0.1;
    }
  });

  return (
    <group position={position} name="landmark-beacon-tower">
      {/* Tower body & architectural balustrade */}
      <mesh geometry={towerGeo} material={material} castShadow receiveShadow />

      {/* Luminous Breathing Core Crystal inside the Lantern Gallery (y = 2.65 u) */}
      <mesh ref={coreRef} geometry={coreGeo} material={material} position={[0, 2.65, 0]} />

      {/* Multi-Tier Rotating Astrolabe Brass Gimbal Rings */}
      <group ref={outerGyroRef} position={[0, 2.65, 0]}>
        <mesh>
          <torusGeometry args={[0.54, 0.028, 10, 36]} />
          <meshStandardMaterial
            color="#F2B544"
            emissive="#F2B544"
            emissiveIntensity={restored ? 1.05 : 0.3}
            roughness={0.25}
          />
        </mesh>
      </group>

      <group ref={midGyroRef} position={[0, 2.65, 0]}>
        <mesh>
          <torusGeometry args={[0.40, 0.024, 8, 30]} />
          <meshStandardMaterial
            color="#E5A823"
            emissive="#E5A823"
            emissiveIntensity={restored ? 0.95 : 0.25}
            roughness={0.25}
          />
        </mesh>
      </group>

      <group ref={innerGyroRef} position={[0, 2.65, 0]}>
        <mesh>
          <torusGeometry args={[0.28, 0.020, 8, 24]} />
          <meshStandardMaterial
            color="#5CE1E6"
            emissive="#5CE1E6"
            emissiveIntensity={restored ? 1.15 : 0.35}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Skyward Volumetric Crystal Beacon Beam (Multi-layered when restored) */}
      {restored && (
        <group position={[0, 4.0, 0]}>
          {/* Inner intense radiant core beam */}
          <mesh ref={beamRef} position={[0, 25.0, 0]}>
            <cylinderGeometry args={[0.08, 0.16, 50, 16]} />
            <meshBasicMaterial color="#FFF8DC" transparent opacity={0.95} depthWrite={false} />
          </mesh>

          {/* Middle vibrant cyan additive glow beam */}
          <mesh ref={beamMidRef} position={[0, 25.0, 0]}>
            <cylinderGeometry args={[0.28, 0.58, 50, 16]} />
            <meshBasicMaterial
              color="#5CE1E6"
              transparent
              opacity={0.58}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Outer soft volumetric atmospheric glow */}
          <mesh ref={beamOuterRef} position={[0, 25.0, 0]}>
            <cylinderGeometry args={[0.70, 1.25, 50, 16]} />
            <meshBasicMaterial
              color="#4BACE8"
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Ascending beacon pulse rings */}
          <mesh ref={pulseRing1Ref} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.48, 0.022, 8, 24]} />
            <meshBasicMaterial
              color="#FFF5D6"
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={pulseRing2Ref} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.48, 0.022, 8, 24]} />
            <meshBasicMaterial
              color="#5CE1E6"
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Beacon Lantern Light */}
      <pointLight
        ref={lanternLightRef}
        position={[0, 2.7, 0]}
        color={restored ? '#FFE29A' : '#F2B544'}
        intensity={restored ? 4.0 : 0.85}
        distance={restored ? 20 : 7}
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
  const mote1Ref = useRef<THREE.Mesh>(null);
  const mote2Ref = useRef<THREE.Mesh>(null);

  // Carved stone pedestal with flared capital basin & glowing runic channels
  const plinthGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Stepped carved stone base
      { x: -6.5, y: 0, z: -6.5, w: 13, h: 2.2, d: 13, hex: '#3A464C' },
      { x: -5.5, y: 2.2, z: -5.5, w: 11, h: 2.2, d: 11, hex: '#505A61' },
      { x: -4.5, y: 4.4, z: -4.5, w: 9, h: 1.6, d: 9, hex: '#5E666D' },

      // Carved column shaft
      { x: -3.5, y: 6.0, z: -3.5, w: 7, h: 6.5, d: 7, hex: '#99A2A8' },

      // 4 Bronze corner clamps with rivet studs
      { x: -4.0, y: 6.5, z: -4.0, w: 1.4, h: 6.0, d: 1.4, hex: '#A8773D' },
      { x: 2.6, y: 6.5, z: -4.0, w: 1.4, h: 6.0, d: 1.4, hex: '#A8773D' },
      { x: -4.0, y: 6.5, z: 2.6, w: 1.4, h: 6.0, d: 1.4, hex: '#A8773D' },
      { x: 2.6, y: 6.5, z: 2.6, w: 1.4, h: 6.0, d: 1.4, hex: '#A8773D' },

      // Inlaid glowing runic channels on all 4 faces
      { x: -1.2, y: 6.0, z: -3.8, w: 2.4, h: 6.0, d: 0.5, hex: runeHex, emissive: 1.3 },
      { x: -1.2, y: 6.0, z: 3.3, w: 2.4, h: 6.0, d: 0.5, hex: runeHex, emissive: 1.3 },
      { x: -3.8, y: 6.0, z: -1.2, w: 0.5, h: 6.0, d: 2.4, hex: runeHex, emissive: 1.3 },
      { x: 3.3, y: 6.0, z: -1.2, w: 0.5, h: 6.0, d: 2.4, hex: runeHex, emissive: 1.3 },

      // Flared capital basin
      { x: -5.5, y: 12.5, z: -5.5, w: 11, h: 1.6, d: 11, hex: '#C6CED2' },
      { x: -5.0, y: 14.1, z: -5.0, w: 10, h: 1.2, d: 10, hex: '#99A2A8' },

      // 4 Cradling bronze talons on capital rim
      { x: -5.2, y: 14.0, z: -1.4, w: 1.4, h: 3.5, d: 2.8, hex: '#A8773D' },
      { x: 3.8, y: 14.0, z: -1.4, w: 1.4, h: 3.5, d: 2.8, hex: '#A8773D' },
      { x: -1.4, y: 14.0, z: -5.2, w: 2.8, h: 3.5, d: 1.4, hex: '#A8773D' },
      { x: -1.4, y: 14.0, z: 3.8, w: 2.8, h: 3.5, d: 1.4, hex: '#A8773D' },

      // Swirling elemental mana pool inside the basin
      { x: -3.5, y: 14.6, z: -3.5, w: 7, h: 0.6, d: 7, hex: runeHex, emissive: 1.25 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [runeHex]);

  // Floating rotating glowing runic obelisk
  const obeliskGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Tapered spire core
      { x: -1.4, y: -6.5, z: -1.4, w: 2.8, h: 3.5, d: 2.8, hex: color, emissive: 1.25 },
      { x: -2.2, y: -3.0, z: -2.2, w: 4.4, h: 9.0, d: 4.4, hex: '#2A476E' },
      { x: -1.6, y: 6.0, z: -1.6, w: 3.2, h: 4.5, d: 3.2, hex: '#355C8C' },
      { x: -1.0, y: 10.5, z: -1.0, w: 2.0, h: 3.5, d: 2.0, hex: '#A8773D' },
      { x: -0.5, y: 14.0, z: -0.5, w: 1.0, h: 2.5, d: 1.0, hex: color, emissive: 1.4 },

      // Inlaid glowing runic glyph bands on all 4 faces
      { x: -2.4, y: -1.0, z: -1.4, w: 4.8, h: 1.6, d: 2.8, hex: runeHex, emissive: 1.35 },
      { x: -1.4, y: -1.0, z: -2.4, w: 2.8, h: 1.6, d: 4.8, hex: runeHex, emissive: 1.35 },
      { x: -2.4, y: 3.0, z: -1.4, w: 4.8, h: 1.6, d: 2.8, hex: runeHex, emissive: 1.35 },
      { x: -1.4, y: 3.0, z: -2.4, w: 2.8, h: 1.6, d: 4.8, hex: runeHex, emissive: 1.35 },

      // Radiant crystal core
      { x: -1.2, y: -4.5, z: -1.2, w: 2.4, h: 11.5, d: 2.4, hex: color, emissive: 1.3 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, [color, runeHex]);

  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (obeliskRef.current) {
      obeliskRef.current.rotation.y = t * 1.1;
      obeliskRef.current.rotation.x = Math.sin(t * 1.4) * 0.07;
      obeliskRef.current.rotation.z = Math.cos(t * 1.2) * 0.07;
      obeliskRef.current.position.y = 1.12 + Math.sin(t * 2.2) * 0.08;
    }
    if (auraRef.current) {
      auraRef.current.rotation.z = -t * 0.85;
    }
    if (mote1Ref.current) {
      const a = t * 2.0;
      mote1Ref.current.position.x = Math.cos(a) * 0.28;
      mote1Ref.current.position.z = Math.sin(a) * 0.28;
      mote1Ref.current.position.y = 0.15 + Math.sin(t * 3.0) * 0.08;
    }
    if (mote2Ref.current) {
      const a = -t * 1.6 + 2.5;
      mote2Ref.current.position.x = Math.cos(a) * 0.35;
      mote2Ref.current.position.z = Math.sin(a) * 0.35;
      mote2Ref.current.position.y = -0.1 + Math.cos(t * 2.8) * 0.08;
    }
  });

  return (
    <group position={position} name={`gate-rune-plinth-${runeHex}`}>
      {/* Carved stone plinth */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Floating Rotating Glowing Runic Obelisk */}
      <group ref={obeliskRef} position={[0, 1.12, 0]}>
        <mesh geometry={obeliskGeo} material={material} />

        {/* Orbiting Elemental Mana Motes */}
        <mesh ref={mote1Ref} scale={[0.04, 0.08, 0.04]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={runeHex} emissive={runeHex} emissiveIntensity={1.4} />
        </mesh>
        <mesh ref={mote2Ref} scale={[0.035, 0.07, 0.035]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} />
        </mesh>
      </group>

      {/* Glowing Runic Aura Ring on the pedestal rim */}
      <mesh ref={auraRef} position={[0, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.018, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} roughness={0.2} />
      </mesh>

      {/* Atmospheric Point Light */}
      <pointLight position={[0, 1.2, 0]} color={color} intensity={2.2} distance={7.0} decay={2} />
    </group>
  );
}

// ============================================================================
// 5. CORE SHARD ALTAR LANDMARK (GRAND CLIMAX CELESTIAL ALTAR)
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
  const midRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const crystalRef = useRef<THREE.Mesh>(null);
  const satRefs = useRef<(THREE.Mesh | null)[]>([]);
  const beamRef = useRef<THREE.Mesh>(null);
  const beamGlowRef = useRef<THREE.Mesh>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  // Colossal 3-tiered celestial altar with carved stone coping, filigree & 4 obelisk pylons
  const altarGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Tier 1 Base (26x3x26) with coping border
      { x: -13.0, y: 0, z: -13.0, w: 26, h: 3, d: 26, hex: '#3A464C' },
      { x: -13.5, y: 2, z: -13.5, w: 27, h: 1, d: 27, hex: '#48545C' },

      // Tier 2 Mid-tier with gold filigree & stone coping (22x3x22)
      { x: -11.0, y: 3, z: -11.0, w: 22, h: 3, d: 22, hex: '#5E666D' },
      { x: -11.4, y: 5, z: -11.4, w: 22.8, h: 1, d: 22.8, hex: '#778087' },
      // Floor gold filigree channels
      { x: -10.0, y: 5.8, z: -0.8, w: 20, h: 0.4, d: 1.6, hex: '#F2B544', emissive: 0.95 },
      { x: -0.8, y: 5.8, z: -10.0, w: 1.6, h: 0.4, d: 20, hex: '#F2B544', emissive: 0.95 },

      // Tier 3 Sanctuary Platform (16x2.5x16)
      { x: -8.0, y: 6, z: -8.0, w: 16, h: 2.5, d: 16, hex: '#C6CED2' },
      { x: -8.4, y: 8, z: -8.4, w: 16.8, h: 0.8, d: 16.8, hex: '#EDE4D0' },

      // Inlaid celestial runic channels on the dais floor
      { x: -6.5, y: 8.5, z: -6.5, w: 13, h: 0.4, d: 13, hex: '#F2B544', emissive: 1.0 },
      { x: -5.0, y: 8.7, z: -5.0, w: 10, h: 0.4, d: 10, hex: '#5ED8CB', emissive: 1.2 },

      // 4 Carved Corner Obelisk Pylons on Tier 2
      // Shafts
      { x: -10.5, y: 3, z: -10.5, w: 3.2, h: 14, d: 3.2, hex: '#355C8C' },
      { x: 7.3, y: 3, z: -10.5, w: 3.2, h: 14, d: 3.2, hex: '#355C8C' },
      { x: -10.5, y: 3, z: 7.3, w: 3.2, h: 14, d: 3.2, hex: '#355C8C' },
      { x: 7.3, y: 3, z: 7.3, w: 3.2, h: 14, d: 3.2, hex: '#355C8C' },

      // Pylon gold pyramidion capitals
      { x: -10.8, y: 17, z: -10.8, w: 3.8, h: 3.5, d: 3.8, hex: '#F2B544', emissive: 1.15 },
      { x: 7.0, y: 17, z: -10.8, w: 3.8, h: 3.5, d: 3.8, hex: '#F2B544', emissive: 1.15 },
      { x: -10.8, y: 17, z: 7.0, w: 3.8, h: 3.5, d: 3.8, hex: '#F2B544', emissive: 1.15 },
      { x: 7.0, y: 17, z: 7.0, w: 3.8, h: 3.5, d: 3.8, hex: '#F2B544', emissive: 1.15 },

      // Pylon radiant golden tips
      { x: -10.0, y: 20.5, z: -10.0, w: 2.2, h: 2.2, d: 2.2, hex: '#FFF5D6', emissive: 1.4 },
      { x: 7.8, y: 20.5, z: -10.0, w: 2.2, h: 2.2, d: 2.2, hex: '#FFF5D6', emissive: 1.4 },
      { x: -10.0, y: 20.5, z: 7.8, w: 2.2, h: 2.2, d: 2.2, hex: '#FFF5D6', emissive: 1.4 },
      { x: 7.8, y: 20.5, z: 7.8, w: 2.2, h: 2.2, d: 2.2, hex: '#FFF5D6', emissive: 1.4 },

      // 4 Curved Bronze Containment Claws cradling the central core
      { x: -5.0, y: 8.5, z: -1.4, w: 2.0, h: 6.0, d: 2.8, hex: '#A8773D' },
      { x: 3.0, y: 8.5, z: -1.4, w: 2.0, h: 6.0, d: 2.8, hex: '#A8773D' },
      { x: -1.4, y: 8.5, z: -5.0, w: 2.8, h: 6.0, d: 2.0, hex: '#A8773D' },
      { x: -1.4, y: 8.5, z: 3.0, w: 2.8, h: 6.0, d: 2.0, hex: '#A8773D' },

      // Claw glowing focus tips
      { x: -4.6, y: 14.2, z: -1.0, w: 1.4, h: 1.6, d: 2.0, hex: '#5CE1E6', emissive: 1.35 },
      { x: 3.2, y: 14.2, z: -1.0, w: 1.4, h: 1.6, d: 2.0, hex: '#5CE1E6', emissive: 1.35 },
      { x: -1.0, y: 14.2, z: -4.6, w: 2.0, h: 1.6, d: 1.4, hex: '#5CE1E6', emissive: 1.35 },
      { x: -1.0, y: 14.2, z: 3.2, w: 2.0, h: 1.6, d: 1.4, hex: '#5CE1E6', emissive: 1.35 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Colossal celestial sapphire shard crystal core
  const shardGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -3.5, y: -7.0, z: -3.5, w: 7.0, h: 14.0, d: 7.0, hex: '#5ED8CB', emissive: 1.3 },
      { x: -2.4, y: -9.5, z: -2.4, w: 4.8, h: 19.0, d: 4.8, hex: '#9EEFFF', emissive: 1.35 },
      { x: -1.2, y: -12.0, z: -1.2, w: 2.4, h: 24.0, d: 2.4, hex: '#FFF8DC', emissive: 1.45 },
      // Symmetrical crystal facet flanges
      { x: -5.8, y: -3.5, z: -1.8, w: 11.6, h: 7.0, d: 3.6, hex: '#4BACE8', emissive: 1.25 },
      { x: -1.8, y: -3.5, z: -5.8, w: 3.6, h: 7.0, d: 11.6, hex: '#4BACE8', emissive: 1.25 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Orbiting satellite shard crystal geometry
  const satelliteShardGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      { x: -1.2, y: -2.5, z: -1.2, w: 2.4, h: 5.0, d: 2.4, hex: '#5CE1E6', emissive: 1.3 },
      { x: -0.6, y: -3.8, z: -0.6, w: 1.2, h: 7.6, d: 1.2, hex: '#9EEFFF', emissive: 1.4 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const mult = restored ? 1.8 : 0.6;

    // Swirling triple energy rings (Gold, Turquoise, Azure)
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = t * mult;
      outerRingRef.current.rotation.x = Math.sin(t * 0.7) * 0.45;
    }
    if (midRingRef.current) {
      midRingRef.current.rotation.y = -t * mult * 1.35;
      midRingRef.current.rotation.z = Math.cos(t * 0.9) * 0.55;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.x = t * mult * 1.7;
      innerRingRef.current.rotation.y = Math.sin(t * 1.1) * 0.5;
    }

    // Celestial Core levitation and pulsing
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 0.9;
      const bob = 1.95 + Math.sin(t * 2.2) * (restored ? 0.16 : 0.07);
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
      const radius = 1.35 + i * 0.12;
      const inc = (i - 1.5) * 0.35;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      mesh.position.y = 1.95 + Math.sin(angle * 2.0) * 0.25 + Math.sin(inc) * radius;
      mesh.rotation.y = t * 2.0 + i;
      mesh.rotation.x = angle * 1.5;
    });

    // Pulsing light shafts when restored
    if (beamRef.current && restored) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.50 + Math.sin(t * 3.5) * 0.12;
      }
    }
    if (beamGlowRef.current && restored) {
      const mat = beamGlowRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.25 + Math.sin(t * 4.2) * 0.08;
      }
    }
    if (pulseRingRef.current && restored) {
      const yNorm = ((t * 5.0) % 35) / 35;
      pulseRingRef.current.position.y = yNorm * 38;
      const s = 1.0 + yNorm * 3.0;
      pulseRingRef.current.scale.set(s, 1, s);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = (1 - yNorm) * 0.75;
    }
  });

  return (
    <group position={position} name="landmark-core-altar">
      {/* Grand Tiered Celestial Dais */}
      <mesh geometry={altarGeo} material={material} castShadow receiveShadow />

      {/* Floating Celestial Core Shard */}
      <mesh ref={crystalRef} geometry={shardGeo} material={material} position={[0, 1.95, 0]} />

      {/* 4 Orbiting Satellite Shard Crystals in 3D orbit */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            satRefs.current[i] = el;
          }}
          geometry={satelliteShardGeo}
          material={material}
          position={[0, 1.95, 0]}
        />
      ))}

      {/* Swirling Triple Energy Rings (Gold, Turquoise, Azure) */}
      <mesh ref={outerRingRef} position={[0, 1.95, 0]}>
        <torusGeometry args={[1.18, 0.048, 12, 40]} />
        <meshStandardMaterial
          color="#F2B544"
          emissive="#F2B544"
          emissiveIntensity={restored ? 1.05 : 0.3}
          roughness={0.25}
        />
      </mesh>

      <mesh ref={midRingRef} position={[0, 1.95, 0]}>
        <torusGeometry args={[0.88, 0.040, 10, 36]} />
        <meshStandardMaterial
          color="#5CE1E6"
          emissive="#5CE1E6"
          emissiveIntensity={restored ? 1.2 : 0.35}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={innerRingRef} position={[0, 1.95, 0]}>
        <torusGeometry args={[0.62, 0.032, 8, 30]} />
        <meshStandardMaterial
          color="#4BACE8"
          emissive="#4BACE8"
          emissiveIntensity={restored ? 1.15 : 0.3}
          roughness={0.2}
        />
      </mesh>

      {/* Glowing Stasis Matrix Ring on the Platform Floor */}
      <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.90, 36]} />
        <meshBasicMaterial color="#5ED8CB" transparent opacity={restored ? 0.9 : 0.35} />
      </mesh>

      {/* Pulsing Light Shafts / Stasis Beam reaching high into the sky when restored */}
      {restored && (
        <group position={[0, 18, 0]}>
          <mesh ref={beamRef}>
            <cylinderGeometry args={[0.35, 0.70, 38, 16]} />
            <meshBasicMaterial
              color="#9EEFFF"
              transparent
              opacity={0.50}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          <mesh ref={beamGlowRef}>
            <cylinderGeometry args={[0.80, 1.45, 38, 16]} />
            <meshBasicMaterial
              color="#5CE1E6"
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Ascending Vortex Energy Rings */}
          <mesh ref={pulseRingRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.9, 0.035, 8, 32]} />
            <meshBasicMaterial
              color="#FFF5D6"
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Altar Radiant Light */}
      <pointLight
        position={[0, 2.4, 0]}
        color="#9EEFFF"
        intensity={restored ? 5.8 : 1.6}
        distance={restored ? 24 : 11}
        decay={2}
      />
    </group>
  );
}

// ============================================================================
// 6. BLUE CRYSTALS LANDMARK (CRYSTALLINE CLUSTERS WITH HARMONIC PARTICLES)
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
      { x: -5.0, y: 0, z: -5.0, w: 10, h: 2.2, d: 10, hex: '#505A61' },
      { x: -4.0, y: 2.2, z: -4.0, w: 8, h: 1.6, d: 8, hex: '#6E757A' },
      // Moss pockets
      { x: -4.2, y: 2.3, z: 1.2, w: 2.8, h: 0.8, d: 2.8, hex: '#5FA32A' },
      { x: 1.8, y: 2.3, z: -3.8, w: 2.4, h: 0.8, d: 2.8, hex: '#488220' },
      { x: -3.8, y: 0.6, z: -4.5, w: 2.2, h: 1.4, d: 1.8, hex: '#76BF31' },
      // Golden mineral vein flecks in stone bed
      { x: -2.0, y: 2.4, z: -1.0, w: 1.4, h: 0.4, d: 1.4, hex: '#F2B544', emissive: 0.85 },
      { x: 1.0, y: 2.4, z: 1.5, w: 1.2, h: 0.4, d: 1.2, hex: '#F2B544', emissive: 0.85 },
      // 3 Ground geode shard crystals sprouting from stone
      { x: -2.8, y: 3.5, z: 2.0, w: 1.2, h: 2.4, d: 1.2, hex: '#4BACE8', emissive: 1.2 },
      { x: 2.2, y: 3.5, z: -1.8, w: 1.0, h: 3.0, d: 1.0, hex: '#5CE1E6', emissive: 1.25 },
      { x: -1.8, y: 3.5, z: -2.8, w: 1.2, h: 2.0, d: 1.2, hex: '#2A86A8', emissive: 1.1 },
      // Crystal root base
      { x: -2.4, y: 3.2, z: -2.4, w: 4.8, h: 1.4, d: 4.8, hex: '#1E324D', emissive: 0.85 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Sparkling faceted blue crystal clusters with golden facets & inner luminescence
  const crystalGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // Main central faceted crystal spire
      { x: -2.2, y: -4.5, z: -2.2, w: 4.4, h: 9.0, d: 4.4, hex: '#2A86A8', emissive: 1.25 },
      { x: -1.6, y: -6.0, z: -1.6, w: 3.2, h: 12.0, d: 3.2, hex: '#4BACE8', emissive: 1.3 },
      { x: -0.8, y: -7.0, z: -0.8, w: 1.6, h: 14.5, d: 1.6, hex: '#9EEFFF', emissive: 1.4 },
      { x: -0.4, y: 7.5, z: -0.4, w: 0.8, h: 2.2, d: 0.8, hex: '#FFF8DC', emissive: 1.45 },
      // Golden facet caps catching the light
      { x: -1.8, y: 2.0, z: -2.4, w: 3.6, h: 0.8, d: 0.6, hex: '#F2B544', emissive: 1.3 },
      { x: -1.8, y: 2.0, z: 1.8, w: 3.6, h: 0.8, d: 0.6, hex: '#F2B544', emissive: 1.3 },
      // Secondary leaning crystal spire
      { x: 1.8, y: -3.0, z: -1.2, w: 2.0, h: 7.0, d: 2.0, hex: '#5CE1E6', emissive: 1.25 },
      { x: 2.0, y: 4.0, z: -1.0, w: 1.4, h: 3.0, d: 1.4, hex: '#9EEFFF', emissive: 1.35 },
      // Flanking crystal points
      { x: -3.2, y: -2.5, z: 0.6, w: 1.8, h: 5.5, d: 1.8, hex: '#4BACE8', emissive: 1.2 },
      { x: -1.0, y: -3.0, z: 2.0, w: 1.8, h: 6.0, d: 1.8, hex: '#5CE1E6', emissive: 1.25 },
      { x: 0.6, y: -3.5, z: -2.8, w: 1.6, h: 5.0, d: 1.6, hex: '#2A86A8', emissive: 1.15 },
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
      crystalRef.current.position.y = 0.45 + Math.sin(t * 2.6) * 0.08;
    }
    if (auraRef.current) {
      auraRef.current.rotation.z = -t * 0.9;
    }
    if (sat1Ref.current) {
      const angle = t * 1.6;
      sat1Ref.current.position.x = Math.cos(angle) * 0.32;
      sat1Ref.current.position.z = Math.sin(angle) * 0.32;
      sat1Ref.current.position.y = Math.sin(t * 3.0) * 0.08 + 0.1;
      sat1Ref.current.rotation.y = t * 2.0;
    }
    if (sat2Ref.current) {
      const angle = -t * 1.4 + 2.0;
      sat2Ref.current.position.x = Math.cos(angle) * 0.38;
      sat2Ref.current.position.z = Math.sin(angle) * 0.38;
      sat2Ref.current.position.y = Math.cos(t * 2.8) * 0.08 - 0.05;
      sat2Ref.current.rotation.y = -t * 1.8;
    }
    if (sat3Ref.current) {
      const angle = t * 1.1 + 4.0;
      sat3Ref.current.position.x = Math.cos(angle) * 0.45;
      sat3Ref.current.position.z = Math.sin(angle) * 0.45;
      sat3Ref.current.position.y = Math.sin(t * 2.4) * 0.12;
      sat3Ref.current.rotation.x = t * 1.5;
    }
  });

  return (
    <group position={position} name={`landmark-${id}`}>
      {/* Carved natural stone bed with moss & ground geodes */}
      <mesh geometry={plinthGeo} material={material} castShadow receiveShadow />

      {/* Sparkling Floating Faceted Crystal Cluster */}
      <group ref={crystalRef} position={[0, 0.45, 0]}>
        <mesh geometry={crystalGeo} material={material} />

        {/* Orbiting Satellite Micro-Shards */}
        <mesh ref={sat1Ref} scale={[0.08, 0.16, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#9EEFFF" emissive="#9EEFFF" emissiveIntensity={1.4} roughness={0.15} />
        </mesh>

        <mesh ref={sat2Ref} scale={[0.06, 0.12, 0.06]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={1.3} roughness={0.15} />
        </mesh>

        <mesh ref={sat3Ref} scale={[0.05, 0.1, 0.05]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#FFF8DC" emissive="#FFF8DC" emissiveIntensity={1.45} roughness={0.15} />
        </mesh>
      </group>

      {/* Ground Aura Halo Ring */}
      <mesh ref={auraRef} position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.018, 8, 32]} />
        <meshStandardMaterial color="#5CE1E6" emissive="#5CE1E6" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>

      {/* Soft Sparkling Crystal Light */}
      <pointLight position={[0, 0.6, 0]} color="#5CE1E6" intensity={2.0} distance={7.0} decay={2} />
    </group>
  );
}

// ============================================================================
// 7. FARM WATERWHEEL LANDMARK (MULTI-SPOKE WHEEL, RACE CHANNEL & SLUICE GATE)
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
  const waterFlowRef = useRef<THREE.Mesh>(null);

  // Static Stone Race Channel, Timber A-Frame Supports & Wooden Sluice Gate
  const staticGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Stone Race Channel Underneath & Beside the Wheel (z: -7..7)
      // Channel stone bed
      { x: -8.0, y: -18, z: -7.0, w: 16, h: 2.5, d: 14, hex: '#48545C' },
      // Left channel retaining wall
      { x: -8.0, y: -15.5, z: -7.0, w: 16, h: 4.5, d: 2.2, hex: '#5E666D' },
      // Right channel retaining wall
      { x: -8.0, y: -15.5, z: 4.8, w: 16, h: 4.5, d: 2.2, hex: '#5E666D' },

      // 2. Upstream Wooden Sluice Gate at x = 7.0
      // Vertical sluice frame posts
      { x: 6.5, y: -15.5, z: -5.0, w: 2.0, h: 22, d: 1.8, hex: '#5B3A27' },
      { x: 6.5, y: -15.5, z: 3.2, w: 2.0, h: 22, d: 1.8, hex: '#5B3A27' },
      // Overhead sluice lifting gear beam
      { x: 6.2, y: 6.5, z: -5.5, w: 2.6, h: 2.5, d: 11, hex: '#7A5233' },
      // Sluice lift rack screw & bronze crank wheel
      { x: 6.8, y: 4.0, z: -0.6, w: 1.4, h: 6.5, d: 1.2, hex: '#A8773D' },
      { x: 7.2, y: 9.0, z: -0.6, w: 0.8, h: 2.8, d: 2.8, hex: '#F2B544' },
      // Sluice timber drop gate slats
      { x: 6.8, y: -10.0, z: -4.5, w: 1.2, h: 14, d: 9.0, hex: '#7A5233' },
      // Sluice iron reinforcement bands
      { x: 6.7, y: -2.0, z: -4.8, w: 1.4, h: 1.0, d: 9.6, hex: '#3A464C' },
      { x: 6.7, y: -8.0, z: -4.8, w: 1.4, h: 1.0, d: 9.6, hex: '#3A464C' },

      // 3. Timber A-Frame Trestle Supports Flanking the Wheel
      // Left Trestle at z = -5.0
      { x: -6.5, y: -16, z: -5.2, w: 2.6, h: 22, d: 2.2, hex: '#5B3A27' },
      { x: 3.9, y: -16, z: -5.2, w: 2.6, h: 22, d: 2.2, hex: '#5B3A27' },
      { x: -6.5, y: -6, z: -5.2, w: 13, h: 2.2, d: 2.2, hex: '#7A5233' },
      // Bronze axle bearing housing with bolts
      { x: -2.2, y: -2.2, z: -5.6, w: 4.4, h: 4.4, d: 3.0, hex: '#A8773D' },
      { x: -1.8, y: -1.8, z: -5.9, w: 3.6, h: 3.6, d: 0.5, hex: '#F2B544' },

      // Right Trestle at z = 3.0
      { x: -6.5, y: -16, z: 3.0, w: 2.6, h: 22, d: 2.2, hex: '#5B3A27' },
      { x: 3.9, y: -16, z: 3.0, w: 2.6, h: 22, d: 2.2, hex: '#5B3A27' },
      { x: -6.5, y: -6, z: 3.0, w: 13, h: 2.2, d: 2.2, hex: '#7A5233' },
      // Bronze axle bearing housing
      { x: -2.2, y: -2.2, z: 2.6, w: 4.4, h: 4.4, d: 3.0, hex: '#A8773D' },
      { x: -1.8, y: -1.8, z: 5.4, w: 3.6, h: 3.6, d: 0.5, hex: '#F2B544' },

      // 4. Cascading Water Flume Delivery Chute Feeding Top Buckets
      { x: 4.5, y: 12.0, z: -3.0, w: 4.5, h: 1.2, d: 6.0, hex: '#4CD7E0', emissive: 0.8 },
      { x: 1.5, y: 11.5, z: -3.0, w: 3.5, h: 1.0, d: 6.0, hex: '#9EEFFF', emissive: 0.9 },
    ];
    return buildDetailVoxelGeometry(boxes, FINE);
  }, []);

  // Rotating Wheel: Bronze Hub Rivets, 12 Radial Timber Spokes, Double-Bucket Water Scoops
  const wheelGeo = useMemo(() => {
    const boxes: DetailBoxSpec[] = [
      // 1. Central Bronze Axle & Octagonal Hub
      { x: -1.6, y: -1.6, z: -6.0, w: 3.2, h: 3.2, d: 12, hex: '#7A5233' },
      { x: -3.8, y: -3.8, z: -2.8, w: 7.6, h: 7.6, d: 5.6, hex: '#A8773D' },

      // 16 Protruding Bronze Hub Rivets on Front and Back Hub Faces
      { x: 0, y: 2.8, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 0, y: -2.8, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 2.8, y: 0, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: -2.8, y: 0, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 2.0, y: 2.0, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: -2.0, y: 2.0, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 2.0, y: -2.0, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: -2.0, y: -2.0, z: -3.1, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },

      { x: 0, y: 2.8, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 0, y: -2.8, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 2.8, y: 0, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: -2.8, y: 0, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 2.0, y: 2.0, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: -2.0, y: 2.0, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: 2.0, y: -2.0, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },
      { x: -2.0, y: -2.0, z: 2.5, w: 0.9, h: 0.9, d: 0.6, hex: '#F2B544' },

      // 2. Cardinal Timber Spokes
      { x: -1.4, y: -15, z: -1.4, w: 2.8, h: 30, d: 2.8, hex: '#7A5233' },
      { x: -15, y: -1.4, z: -1.4, w: 30, h: 2.8, d: 2.8, hex: '#7A5233' },

      // 3. Diagonal Timber Spokes
      { x: -11, y: -11, z: -1.4, w: 22, h: 2.4, d: 2.8, hex: '#8F5D3C' },
      { x: -11, y: 8.6, z: -1.4, w: 22, h: 2.4, d: 2.8, hex: '#8F5D3C' },

      // 4. Dual Concentric Rims with Copper Banding
      // Front Rim
      { x: -12.5, y: 12.5, z: 2.2, w: 25, h: 1.2, d: 0.8, hex: '#5B3A27' },
      { x: -12.5, y: -13.7, z: 2.2, w: 25, h: 1.2, d: 0.8, hex: '#5B3A27' },
      // Rear Rim
      { x: -12.5, y: 12.5, z: -3.0, w: 25, h: 1.2, d: 0.8, hex: '#5B3A27' },
      { x: -12.5, y: -13.7, z: -3.0, w: 25, h: 1.2, d: 0.8, hex: '#5B3A27' },

      // 5. 8 Double-Bucket Water Scoops & Copper Lip Reinforcements
      // Bucket 1: Top (0 deg)
      { x: -3.8, y: 13.0, z: -2.4, w: 7.6, h: 2.2, d: 4.8, hex: '#B07D4F' },
      { x: -4.4, y: 15.2, z: -2.7, w: 8.8, h: 2.0, d: 5.4, hex: '#C48A58' },
      { x: -4.6, y: 16.8, z: -2.8, w: 9.2, h: 0.6, d: 5.6, hex: '#A8773D' },

      // Bucket 2: Bottom (180 deg)
      { x: -3.8, y: -15.2, z: -2.4, w: 7.6, h: 2.2, d: 4.8, hex: '#B07D4F' },
      { x: -4.4, y: -17.2, z: -2.7, w: 8.8, h: 2.0, d: 5.4, hex: '#C48A58' },
      { x: -4.6, y: -17.8, z: -2.8, w: 9.2, h: 0.6, d: 5.6, hex: '#A8773D' },

      // Bucket 3: Right (90 deg)
      { x: 13.0, y: -3.8, z: -2.4, w: 2.2, h: 7.6, d: 4.8, hex: '#B07D4F' },
      { x: 15.2, y: -4.4, z: -2.7, w: 2.0, h: 8.8, d: 5.4, hex: '#C48A58' },
      { x: 16.8, y: -4.6, z: -2.8, w: 0.6, h: 9.2, d: 5.6, hex: '#A8773D' },

      // Bucket 4: Left (270 deg)
      { x: -15.2, y: -3.8, z: -2.4, w: 2.2, h: 7.6, d: 4.8, hex: '#B07D4F' },
      { x: -17.2, y: -4.4, z: -2.7, w: 2.0, h: 8.8, d: 5.4, hex: '#C48A58' },
      { x: -17.8, y: -4.6, z: -2.8, w: 0.6, h: 9.2, d: 5.6, hex: '#A8773D' },

      // Bucket 5: Top-Right (45 deg)
      { x: 8.8, y: 8.8, z: -2.4, w: 5.0, h: 5.0, d: 4.8, hex: '#B07D4F' },
      { x: 10.4, y: 10.4, z: -2.7, w: 5.0, h: 5.0, d: 5.4, hex: '#C48A58' },
      { x: 11.5, y: 11.5, z: -2.8, w: 5.3, h: 5.3, d: 5.6, hex: '#A8773D' },

      // Bucket 6: Top-Left (135 deg)
      { x: -13.8, y: 8.8, z: -2.4, w: 5.0, h: 5.0, d: 4.8, hex: '#B07D4F' },
      { x: -15.4, y: 10.4, z: -2.7, w: 5.0, h: 5.0, d: 5.4, hex: '#C48A58' },
      { x: -16.8, y: 11.5, z: -2.8, w: 5.3, h: 5.3, d: 5.6, hex: '#A8773D' },

      // Bucket 7: Bottom-Right (315 deg)
      { x: 8.8, y: -13.8, z: -2.4, w: 5.0, h: 5.0, d: 4.8, hex: '#B07D4F' },
      { x: 10.4, y: -15.4, z: -2.7, w: 5.0, h: 5.0, d: 5.4, hex: '#C48A58' },
      { x: 11.5, y: -16.8, z: -2.8, w: 5.3, h: 5.3, d: 5.6, hex: '#A8773D' },

      // Bucket 8: Bottom-Left (225 deg)
      { x: -13.8, y: -13.8, z: -2.4, w: 5.0, h: 5.0, d: 4.8, hex: '#B07D4F' },
      { x: -15.4, y: -15.4, z: -2.7, w: 5.0, h: 5.0, d: 5.4, hex: '#C48A58' },
      { x: -16.8, y: -16.8, z: -2.8, w: 5.3, h: 5.3, d: 5.6, hex: '#A8773D' },
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
      {/* Static Stone Race Channel, Timber A-Frames & Wooden Sluice Gate */}
      <mesh geometry={staticGeo} material={material} castShadow receiveShadow />

      {/* Rotating Timber Wheel with 12 Spokes & 8 Double-Bucket Paddles */}
      <group ref={wheelRef}>
        <mesh geometry={wheelGeo} material={material} castShadow receiveShadow />
      </group>

      {/* Animated Water Splash Particle Accents when spinning */}
      {spinning && (
        <group ref={splashRef} position={[0, -0.9, 0]}>
          <pointLight color="#9EEFFF" intensity={1.1} distance={5.0} decay={2} />
          <mesh ref={waterFlowRef} position={[0, -0.2, 0]} scale={[0.15, 0.08, 0.15]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#4CD7E0" emissive="#4CD7E0" emissiveIntensity={1.3} transparent opacity={0.8} />
          </mesh>
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
      {/* 1. NEO Awakening Pedestal (Stasis Pod Dais at [-48, 4.0, 48]) */}
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

      {/* 3. High-Craft Beacon Tower Lighthouse with Spiral Buttresses, Astrolabe & Cyan Beam */}
      <BeaconTowerLandmark
        position={[-9.5, 6.0, 28.5]}
        restored={restoredZoneIds.includes('beacon_point')}
        material={material}
      />

      {/* 4. Gatehouse Rune Plinths Landmark (Floating Elemental Runestones at [44, 8, -3], [44, 8, 0], [44, 8, 3]) */}
      <GatehouseRunePlinth
        position={[44.0, 8.0, -3.0]}
        color="#4BACE8"
        runeHex="#5CE1E6"
        phase={0}
        material={material}
      />
      <GatehouseRunePlinth
        position={[44.0, 8.0, 0.0]}
        color="#6DBE4B"
        runeHex="#9EEFFF"
        phase={1.7}
        material={material}
      />
      <GatehouseRunePlinth
        position={[44.0, 8.0, 3.0]}
        color="#E0603F"
        runeHex="#F2B544"
        phase={3.4}
        material={material}
      />

      {/* 5. Terrace Farm Waterfall Waterwheel (Multi-Spoke Wheel, Race Channel & Sluice Gate at [8.5, 12.0, -33]) */}
      <FarmWaterwheelLandmark
        position={[8.5, 12.0, -33.0]}
        spinning={restoredZoneIds.includes('terrace_farm')}
        material={material}
      />

      {/* 6. Grand Climax Core Shard Celestial Altar with Orbiting Rings & Vortex Light Shafts */}
      {coreAltar && (
        <CoreShardAltarLandmark
          position={coreAltar.position}
          restored={restoredZoneIds.includes('core_spire')}
          material={material}
        />
      )}

      {/* 7. Sparkling Floating Faceted Blue Crystals with Harmonic Particles */}
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
