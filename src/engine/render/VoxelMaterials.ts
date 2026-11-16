import * as THREE from 'three';

export interface VoxelShaderUniforms {
  uTime: { value: number };
  uRestoration: { value: number };
  uWaterDetail: { value: number }; // 1.0 = High/Med stepped waves & foam, 0.0 = Low flat
  uEmissiveCap: { value: number }; // strictly <= 1.2
}

export function createSharedShaderUniforms(): VoxelShaderUniforms {
  return {
    uTime: { value: 0 },
    uRestoration: { value: 0 },
    uWaterDetail: { value: 1 },
    uEmissiveCap: { value: 1.2 },
  };
}

/**
 * Shared terrain & prop Lambert material extended via onBeforeCompile:
 * - 4-level baked vertex AO (aAo)
 * - +/- 3% deterministic world-cell hash jitter
 * - Dormant -> Lush palette blend via uRestoration (0..1)
 * - Strictly clamped emissive <= 1.2x albedo (zero bloom)
 */
export function createTerrainMaterial(
  uniforms: Pick<VoxelShaderUniforms, 'uRestoration' | 'uEmissiveCap'>,
  restorationOverride?: { value: number },
): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: false,
  });

  const restUniform = restorationOverride ?? uniforms.uRestoration;
  mat.customProgramCacheKey = () => 'pycraft-terrain-lambert-v1';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRestoration = restUniform;
    shader.uniforms.uEmissiveCap = uniforms.uEmissiveCap;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aAo;
        attribute vec3 aDormantColor;
        attribute float aEmissive;
        varying float vVoxelAo;
        varying vec3 vDormantColor;
        varying float vVoxelEmissive;
        varying vec3 vWorldCellPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vVoxelAo = aAo;
        vDormantColor = aDormantColor;
        vVoxelEmissive = aEmissive;
        vec4 cellLocal = vec4(position - normal * 0.05, 1.0);
        #ifdef USE_INSTANCING
          vWorldCellPos = (modelMatrix * instanceMatrix * cellLocal).xyz;
        #else
          vWorldCellPos = (modelMatrix * cellLocal).xyz;
        #endif`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uRestoration;
        uniform float uEmissiveCap;
        varying float vVoxelAo;
        varying vec3 vDormantColor;
        varying float vVoxelEmissive;
        varying vec3 vWorldCellPos;
        float pycraftCellHash(vec3 p) {
          vec3 fp = floor(p + 0.001);
          float h = dot(fp, vec3(127.1, 311.7, 74.7));
          return fract(sin(h) * 43758.5453123);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 basePalette = mix(vDormantColor, diffuseColor.rgb, clamp(uRestoration, 0.0, 1.0));
        float jitter = (pycraftCellHash(vWorldCellPos) - 0.5) * 0.06;
        diffuseColor.rgb = basePalette * clamp(vVoxelAo, 0.62, 1.0) * (1.0 + jitter);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float clampedEm = min(min(1.2, uEmissiveCap), max(0.0, vVoxelEmissive));
        float restoreFactor = mix(0.12, 1.0, clamp(uRestoration, 0.0, 1.0));
        totalEmissiveRadiance += diffuseColor.rgb * clampedEm * restoreFactor;`,
      );
  };

  return mat;
}

/**
 * Stepped cascade water material:
 * - Vertex-stepped gentle voxel ripple when uWaterDetail > 0.5
 * - Slow turquoise color banding + white foam (#E8F7F4) on cascade faces
 * - Zero reflections, blends dormant -> turquoise via uRestoration
 */
export function createWaterMaterial(
  uniforms: VoxelShaderUniforms,
  restorationOverride?: { value: number },
): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
  });

  const restUniform = restorationOverride ?? uniforms.uRestoration;
  mat.customProgramCacheKey = () => 'pycraft-water-lambert-v1';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uRestoration = restUniform;
    shader.uniforms.uWaterDetail = uniforms.uWaterDetail;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uWaterDetail;
        attribute vec3 aDormantColor;
        varying vec3 vDormantColor;
        varying vec3 vWaterWorldPos;
        varying vec3 vWaterNormal;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vDormantColor = aDormantColor;
        vec4 wPos = modelMatrix * vec4(transformed, 1.0);
        vWaterWorldPos = wPos.xyz;
        vWaterNormal = normalize(mat3(modelMatrix) * objectNormal);
        if (uWaterDetail > 0.5 && abs(objectNormal.y) > 0.5) {
          float wave = sin(wPos.x * 1.1 + uTime * 2.0) * cos(wPos.z * 1.1 - uTime * 1.6);
          transformed.y += floor(wave * 3.0) / 3.0 * 0.045 - 0.06;
        } else if (abs(objectNormal.y) > 0.5) {
          transformed.y -= 0.06;
        }`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uRestoration;
        uniform float uWaterDetail;
        varying vec3 vDormantColor;
        varying vec3 vWaterWorldPos;
        varying vec3 vWaterNormal;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 waterBase = mix(vDormantColor, diffuseColor.rgb, clamp(uRestoration, 0.0, 1.0));
        if (uWaterDetail > 0.5) {
          float isCascade = 1.0 - step(0.45, abs(vWaterNormal.y));
          float flowBand = floor(fract(vWaterWorldPos.y * 0.45 + uTime * 0.85 * isCascade + vWaterWorldPos.x * 0.15) * 4.0) / 4.0;
          vec3 foamCol = vec3(0.81, 0.93, 0.90);
          float foamMask = isCascade * step(0.72, flowBand) * clamp(uRestoration, 0.0, 1.0);
          waterBase = mix(waterBase, foamCol, foamMask * 0.75);
        }
        diffuseColor.rgb = waterBase;`,
      );
  };

  return mat;
}

/**
 * 4x4 Bayer ordered dither translucent cyan skybridge shader (RC-07).
 * Emissive strictly clamped <= 1.2x albedo; zero bloom post-processing.
 */
export function createSkybridgeMaterial(
  uniforms: VoxelShaderUniforms,
  restorationOverride?: { value: number },
): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
  });

  const restUniform = restorationOverride ?? uniforms.uRestoration;
  mat.customProgramCacheKey = () => 'pycraft-skybridge-bayer-v1';

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uRestoration = restUniform;
    shader.uniforms.uEmissiveCap = uniforms.uEmissiveCap;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aDormantColor;
        attribute float aEmissive;
        varying vec3 vDormantColor;
        varying float vVoxelEmissive;
        varying vec3 vBridgeWorldPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vDormantColor = aDormantColor;
        vVoxelEmissive = aEmissive;
        vBridgeWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uRestoration;
        uniform float uEmissiveCap;
        varying vec3 vDormantColor;
        varying float vVoxelEmissive;
        varying vec3 vBridgeWorldPos;
        float bayer4x4(vec2 coord) {
          int x = int(mod(coord.x, 4.0));
          int y = int(mod(coord.y, 4.0));
          int idx = y * 4 + x;
          if (idx == 0) return 0.0625;
          if (idx == 1) return 0.5625;
          if (idx == 2) return 0.1875;
          if (idx == 3) return 0.6875;
          if (idx == 4) return 0.8125;
          if (idx == 5) return 0.3125;
          if (idx == 6) return 0.9375;
          if (idx == 7) return 0.4375;
          if (idx == 8) return 0.25;
          if (idx == 9) return 0.75;
          if (idx == 10) return 0.125;
          if (idx == 11) return 0.625;
          if (idx == 12) return 1.0;
          if (idx == 13) return 0.5;
          if (idx == 14) return 0.875;
          return 0.375;
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float dither = bayer4x4(gl_FragCoord.xy);
        float density = mix(0.35, 0.82, clamp(uRestoration, 0.0, 1.0));
        if (dither > density) discard;
        float pulse = 0.92 + 0.08 * sin(uTime * 2.2 - vBridgeWorldPos.x * 0.4);
        diffuseColor.rgb = mix(vDormantColor, diffuseColor.rgb, clamp(uRestoration, 0.0, 1.0)) * pulse;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float clampedEm = min(min(1.2, uEmissiveCap), max(0.0, vVoxelEmissive));
        totalEmissiveRadiance += diffuseColor.rgb * clampedEm * mix(0.2, 1.0, clamp(uRestoration, 0.0, 1.0));`,
      );
  };

  return mat;
}
