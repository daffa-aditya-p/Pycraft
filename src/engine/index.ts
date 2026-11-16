export {
  CHUNK_SIZE,
  CHUNK_AREA,
  CHUNK_VOLUME,
  PADDED_SIZE,
  ChunkStorage,
  chunkKey,
  localIndex,
  type VoxelChunk,
  type SerializedChunkEntry,
  type SerializedWorldData,
} from './voxel/ChunkStorage';

export {
  VoxelId,
  VOXEL_SPECS,
  PALETTE_TABLES,
  hexToLinearRgb,
  type VoxelIdValue,
  type VoxelRenderLayer,
  type VoxelMaterialSpec,
} from './voxel/palette';

export {
  AO_LEVELS,
  meshPaddedChunk,
  collectTransferables,
  type LayerMeshBuffers,
  type ChunkMeshResult,
} from './voxel/mesher';

export { MesherClient } from './voxel/MesherClient';
export { raycastVoxels, raycastStorage, type VoxelRaycastHit } from './voxel/raycast';
export {
  AWAKENING_ZONES,
  generateAwakeningWorld,
  serializeGeneratedWorld,
  type PropPlacement,
  type IslandZoneSpec,
  type InteractablePlacement,
  type GeneratedWorld,
} from './voxel/islandGenerator';

export {
  CharacterController,
  PLAYER_CONSTANTS,
  type RespawnAnchor,
  type CharacterInputState,
  type CharacterState,
} from './controller/CharacterController';

export {
  InputManager,
  globalInputManager,
  isTextInputFocused,
  type GameAction,
  type InputSnapshot,
} from './input/InputManager';

export {
  CameraRig,
  CAMERA_CONSTANTS,
  easeOutCubic,
  computeCameraPose,
  lerpCameraPose,
  computeTargetViewOffset,
  type CameraMode,
  type CameraPoseInput,
  type CameraPoseOutput,
} from './camera/CameraRig';

export {
  GameCanvas,
  syncBitVisualFromSim,
  clearBitVisualOverride,
} from './render/GameCanvas';
export { SkyAndLighting, QUALITY_PRESETS } from './render/SkyAndLighting';
export { QualityController } from './render/QualityController';
export {
  createSharedShaderUniforms,
  createTerrainMaterial,
  createWaterMaterial,
  createSkybridgeMaterial,
  type VoxelShaderUniforms,
} from './render/VoxelMaterials';
export {
  DETAIL_VOXEL,
  buildDetailVoxelGeometry,
  ArchitectEntity,
  NeoEntity,
  BitEntity,
  BoltNpc,
  MiraNpc,
  OldTamoNpc,
  GuardianSilhouette,
  type NeoVisorMood,
  type DetailBoxSpec,
} from './render/Entities';
