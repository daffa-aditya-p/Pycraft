import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore } from '../../stores/useSettingsStore';
import type { QualityPreset } from '../../stores/EventBus';

export const QUALITY_PRESETS: Record<
  QualityPreset,
  {
    dprMax: number;
    shadowSize: number; // 0 = off (blob shadow only)
    fogNear: number;
    fogFar: number;
    waterDetail: number;
    foliageSway: boolean;
  }
> = {
  high: {
    dprMax: 1.5,
    shadowSize: 2048,
    fogNear: 48,
    fogFar: 95,
    waterDetail: 1,
    foliageSway: true,
  },
  medium: {
    dprMax: 1.0,
    shadowSize: 1024,
    fogNear: 36,
    fogFar: 70,
    waterDetail: 1,
    foliageSway: false,
  },
  low: {
    dprMax: 0.8,
    shadowSize: 0,
    fogNear: 24,
    fogFar: 50,
    waterDetail: 0,
    foliageSway: false,
  },
};

export interface SkyAndLightingProps {
  focusPosRef: React.MutableRefObject<[number, number, number]>;
}

/**
 * Sky gradient dome (#8EC5E8 -> #B4DAF0 -> #D9EEF6), 50-deg SE warm sun (#FFF3DE),
 * hemisphere bounce light, fitted 48x48 shadow frustum, and distance horizon fog.
 */
export function SkyAndLighting({ focusPosRef }: SkyAndLightingProps) {
  const quality = useSettingsStore((s) => s.graphics.quality);
  const preset = QUALITY_PRESETS[quality];
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const targetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const { scene } = useThree();

  const skyMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#8EC5E8') },
        uMid: { value: new THREE.Color('#B4DAF0') },
        uHorizon: { value: new THREE.Color('#D9EEF6') },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        varying vec3 vWorldDir;
        void main() {
          float h = clamp(vWorldDir.y, -0.2, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(-0.05, 0.25, h));
          col = mix(col, uZenith, smoothstep(0.25, 0.78, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, []);

  // Ensure light target is attached to scene and follows focus
  useFrame(() => {
    const sun = sunRef.current;
    const tgt = targetRef.current;
    if (!tgt.parent) {
      scene.add(tgt);
    }
    const [fx, fy, fz] = focusPosRef.current;
    tgt.position.set(fx, fy, fz);
    if (sun) {
      // 50 deg elevation from south-east (+X, +Z)
      sun.position.set(fx + 27.3, fy + 46.0, fz + 27.3);
      sun.target = tgt;
      sun.target.updateMatrixWorld();
    }
  });

  return (
    <>
      <color attach="background" args={['#D9EEF6']} />
      <fog attach="fog" args={['#D9EEF6', preset.fogNear, preset.fogFar]} />

      {/* Sky dome */}
      <mesh material={skyMaterial} renderOrder={-10}>
        <sphereGeometry args={[240, 24, 16]} />
      </mesh>

      {/* Hemisphere sky/ground bounce */}
      <hemisphereLight args={['#B4DAF0', '#8F5D3C', 0.8]} />

      {/* 50-deg SE Warm Directional Sun (#FFF3DE), 48x48 fitted shadow frustum */}
      <directionalLight
        ref={sunRef}
        color="#FFF3DE"
        intensity={1.75}
        position={[27.3, 46.0, 27.3]}
        castShadow={preset.shadowSize > 0}
        shadow-mapSize-width={Math.max(512, preset.shadowSize)}
        shadow-mapSize-height={Math.max(512, preset.shadowSize)}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={2}
        shadow-camera-far={130}
        shadow-bias={-0.0005}
      />
    </>
  );
}
