import idUi from './id/ui.json';
import enUi from './en/ui.json';
import type { Locale } from '../../mentor/types';

export const UI_STRINGS = {
  id: idUi,
  en: enUi,
} as const;

export function t(
  locale: Locale,
  keyPath: string,
  params?: Record<string, string | number>
): string {
  const root: unknown = locale === 'en' ? enUi : idUi;
  const parts = keyPath.split('.');
  let current: unknown = root;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return keyPath;
    }
  }
  if (typeof current !== 'string') return keyPath;
  if (!params) return current;
  return current.replace(/\{(\w+)\}/g, (_m, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}
