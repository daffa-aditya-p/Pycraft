import {
  EXPORT_MAGIC,
  MAX_IMPORT_BYTES,
  RawExportBundleEnvelopeSchema,
  SCHEMA_VERSION,
  SaveStatePayloadSchema,
  SaveStateRecordSchema,
  SlotHeaderRecordSchema,
  computeCanonicalSha256,
  deriveSlotHeader,
  type ExportBundle,
  type SlotId,
} from './schema';
import { runMigrations, type PycraftDB } from './db';
import type { SaveManager, SaveSlotResult } from './SaveManager';

export type ImportValidationErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_JSON'
  | 'INVALID_MAGIC'
  | 'UNSUPPORTED_VERSION'
  | 'CHECKSUM_MISMATCH'
  | 'SCHEMA_INVALID';

export interface ImportPreview {
  playerName: string;
  architectRank: number;
  xp: number;
  currentRegionId: string;
  completedMissionCount: number;
  playtimeSeconds: number;
  exportedAt: number;
  sourceSchemaVersion: number;
}

export type ValidateImportResult =
  | {
      ok: true;
      preview: ImportPreview;
      bundle: ExportBundle;
    }
  | {
      ok: false;
      errorCode: ImportValidationErrorCode;
      message: string;
    };

export function formatExportFilename(
  slotId: SlotId,
  date: Date = new Date()
): string {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `pycraft-slot-${slotId}-${yyyy}${mm}${dd}.pycraft.json`;
}

export async function exportSlotBundle(
  db: PycraftDB,
  slotId: SlotId,
  exportedAt: number = Date.now()
): Promise<ExportBundle> {
  const rawState = await db.get('save_states', slotId);
  if (!rawState) {
    throw new Error(`Slot ${slotId} is empty; cannot export.`);
  }
  const parsedState = SaveStateRecordSchema.parse(rawState);
  const sha256 = await computeCanonicalSha256(parsedState.payload);
  if (sha256 !== parsedState.sha256) {
    throw new Error(`Slot ${slotId} failed SHA-256 integrity check before export.`);
  }

  const rawHeader = await db.get('slots', slotId);
  const parsedHeader = SlotHeaderRecordSchema.safeParse(rawHeader);
  const header =
    parsedHeader.success && parsedHeader.data.sha256 === sha256
      ? parsedHeader.data
      : deriveSlotHeader(slotId, parsedState.payload, sha256, exportedAt);

  return {
    magic: EXPORT_MAGIC,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    sha256,
    header,
    payload: parsedState.payload,
  };
}

export function serializeExportBundle(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

function getInputByteLength(input: string | Uint8Array | ArrayBuffer): {
  bytes: number;
  text: string;
} {
  if (typeof input === 'string') {
    const encoded = new TextEncoder().encode(input);
    return { bytes: encoded.byteLength, text: input };
  }
  const uint8 = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  return {
    bytes: uint8.byteLength,
    text: new TextDecoder().decode(uint8),
  };
}

export async function validateAndPreviewImport(
  input: string | Uint8Array | ArrayBuffer
): Promise<ValidateImportResult> {
  const { bytes, text } = getInputByteLength(input);
  if (bytes > MAX_IMPORT_BYTES) {
    return {
      ok: false,
      errorCode: 'FILE_TOO_LARGE',
      message: `Ukuran berkas melebihi batas maksimum 1 MB (${bytes} byte).`,
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    return {
      ok: false,
      errorCode: 'INVALID_JSON',
      message: 'Berkas bukan JSON yang valid.',
    };
  }

  if (!parsedJson || typeof parsedJson !== 'object') {
    return {
      ok: false,
      errorCode: 'SCHEMA_INVALID',
      message: 'Format berkas simpanan tidak valid.',
    };
  }

  const obj = parsedJson as Record<string, unknown>;
  if (obj.magic !== EXPORT_MAGIC) {
    return {
      ok: false,
      errorCode: 'INVALID_MAGIC',
      message: 'Berkas ini bukan berkas simpanan PYCRAFT yang valid.',
    };
  }

  if (
    typeof obj.schemaVersion === 'number' &&
    obj.schemaVersion > SCHEMA_VERSION
  ) {
    return {
      ok: false,
      errorCode: 'UNSUPPORTED_VERSION',
      message: `Versi skema ${obj.schemaVersion} lebih baru dari versi aplikasi (${SCHEMA_VERSION}).`,
    };
  }

  const envelope = RawExportBundleEnvelopeSchema.safeParse(parsedJson);
  if (!envelope.success) {
    return {
      ok: false,
      errorCode: 'SCHEMA_INVALID',
      message: `Struktur berkas ekspor tidak valid: ${envelope.error.message}`,
    };
  }

  const rawBundle = envelope.data;

  // Verify SHA-256 against the exported payload BEFORE migration
  const computedRawSha = await computeCanonicalSha256(rawBundle.payload);
  if (computedRawSha !== rawBundle.sha256) {
    return {
      ok: false,
      errorCode: 'CHECKSUM_MISMATCH',
      message: 'Checksum SHA-256 tidak cocok; berkas mungkin rusak atau diubah.',
    };
  }

  let migratedPayloadRaw: unknown = rawBundle.payload;
  if (rawBundle.schemaVersion < SCHEMA_VERSION) {
    try {
      migratedPayloadRaw = runMigrations(
        rawBundle.payload,
        rawBundle.schemaVersion,
        SCHEMA_VERSION
      );
    } catch (err) {
      return {
        ok: false,
        errorCode: 'SCHEMA_INVALID',
        message:
          err instanceof Error
            ? `Migrasi berkas gagal: ${err.message}`
            : 'Migrasi berkas gagal.',
      };
    }
  }

  const validatedPayload = SaveStatePayloadSchema.safeParse(migratedPayloadRaw);
  if (!validatedPayload.success) {
    return {
      ok: false,
      errorCode: 'SCHEMA_INVALID',
      message: `Data pemain tidak valid: ${validatedPayload.error.message}`,
    };
  }

  const v1Sha =
    rawBundle.schemaVersion === SCHEMA_VERSION
      ? rawBundle.sha256
      : await computeCanonicalSha256(validatedPayload.data);

  const rawHeaderParsed = SlotHeaderRecordSchema.safeParse(rawBundle.header);
  const slotId: SlotId = rawHeaderParsed.success ? rawHeaderParsed.data.slotId : 1;
  const header =
    rawHeaderParsed.success && rawBundle.schemaVersion === SCHEMA_VERSION
      ? rawHeaderParsed.data
      : deriveSlotHeader(
          slotId,
          validatedPayload.data,
          v1Sha,
          rawBundle.exportedAt
        );

  const v1Bundle: ExportBundle = {
    magic: EXPORT_MAGIC,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: rawBundle.exportedAt,
    sha256: v1Sha,
    header,
    payload: validatedPayload.data,
  };

  return {
    ok: true,
    preview: {
      playerName: v1Bundle.payload.profile.name,
      architectRank: v1Bundle.payload.learning.rank,
      xp: v1Bundle.payload.learning.xp,
      currentRegionId: v1Bundle.payload.world.regionId,
      completedMissionCount: v1Bundle.header.completedMissionCount,
      playtimeSeconds: v1Bundle.payload.profile.playtimeSeconds,
      exportedAt: v1Bundle.exportedAt,
      sourceSchemaVersion: rawBundle.schemaVersion,
    },
    bundle: v1Bundle,
  };
}

/**
 * Writes an already-validated ExportBundle into `targetSlotId`,
 * automatically creating a `"pre_overwrite"` backup if the target slot is currently occupied.
 */
export async function commitImportedBundle(
  saveManager: SaveManager,
  targetSlotId: SlotId,
  bundle: ExportBundle
): Promise<SaveSlotResult> {
  const db = await saveManager.init();
  const existingState = await db.get('save_states', targetSlotId);
  if (existingState) {
    await saveManager.createBackup(targetSlotId, 'pre_overwrite');
  }

  return saveManager.saveSlot(targetSlotId, bundle.payload);
}
