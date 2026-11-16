export type DetailedLayoutClass = 'D' | 'T-Landscape' | 'T-Portrait' | 'L' | 'P';
export type StoreLayoutClass = 'D' | 'T' | 'L' | 'P';

export type InputMode = 'mouse+keyboard' | 'touch' | 'keyboard-only';

/**
 * Computes responsive layout class from viewport dimensions and pointer capability.
 * - L: Phone landscape (width > height && height < 500)
 * - P: Phone portrait (width < 768)
 * - T-Landscape / T-Portrait: 768 <= width < 1024, or coarse-pointer tablet >= 1024
 * - D: Desktop/laptop (width >= 1024 && height >= 600 && !isCoarsePointer)
 */
export function computeLayoutClass(
  width: number,
  height: number,
  isCoarsePointer = false
): DetailedLayoutClass {
  if (height < 500 && width > height) {
    return 'L';
  }
  if (width < 768) {
    return 'P';
  }
  if (width < 1024 || isCoarsePointer) {
    return width >= height ? 'T-Landscape' : 'T-Portrait';
  }
  if (height >= 600) {
    return 'D';
  }
  return 'T-Landscape';
}

export function toStoreLayoutClass(detailed: DetailedLayoutClass): StoreLayoutClass {
  if (detailed === 'T-Landscape' || detailed === 'T-Portrait') return 'T';
  return detailed;
}

export function isDockLayout(layout: DetailedLayoutClass): boolean {
  return layout === 'D' || layout === 'T-Landscape' || layout === 'L';
}

export function isSheetLayout(layout: DetailedLayoutClass): boolean {
  return layout === 'P' || layout === 'T-Portrait';
}

export function formatRelativeTime(
  updatedAtMs: number,
  locale: 'id' | 'en',
  nowMs: number = Date.now()
): string {
  const diffSec = Math.max(0, Math.floor((nowMs - updatedAtMs) / 1000));
  if (diffSec < 60) {
    return locale === 'id' ? 'Baru saja' : 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return locale === 'id' ? `${diffMin} menit lalu` : `${diffMin} min ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return locale === 'id' ? `${diffHour} jam lalu` : `${diffHour}h ago`;
  }
  const diffDay = Math.floor(diffHour / 24);
  return locale === 'id' ? `${diffDay} hari lalu` : `${diffDay}d ago`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}j ${remMins}m`;
  }
  return `${mins}m`;
}
