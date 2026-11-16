import { expect, type Page } from '@playwright/test';

export async function waitForTitleReady(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('[data-testid="pycraft-app"]').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('[data-testid="title-screen"]').waitFor({ state: 'visible', timeout: 30_000 });
  // Wait for 3D canvas to mount and finish initial world load
  const canvas = page.locator('[data-testid="pycraft-game-canvas"] canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
}

export async function startNewAdventureInSlot(
  page: Page,
  slot: 1 | 2 | 3 = 1,
  architectName = 'Arsitek E2E',
): Promise<void> {
  await page.locator('[data-testid="btn-new-adventure"]').click();
  await page.locator('[data-testid="new-adventure-screen"]').waitFor({ state: 'visible' });

  const slotCard = page.locator(`[data-testid="slot-tablet-${slot}"]`);
  await slotCard.click();

  const holdModal = page.locator('[data-testid="hold-confirm-modal"]');
  if (await holdModal.isVisible().catch(() => false)) {
    const holdBtn = page.locator('[data-testid="hold-confirm-button"]');
    const box = await holdBtn.boundingBox();
    if (!box) throw new Error('Hold confirm button missing boundingBox');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1650);
    await page.mouse.up();
    await expect(holdModal).toBeHidden({ timeout: 5_000 });
  }

  const nameInput = page.locator('#architect-name-input');
  await nameInput.fill(architectName);
  await page.locator('[data-testid="btn-start-adventure"]').click();

  await page.locator('[data-testid="pycraft-app"][data-screen="in_game"]').waitFor({
    state: 'visible',
    timeout: 30_000,
  });
  await page.locator('[data-testid="gameplay-hud"]').waitFor({ state: 'visible', timeout: 15_000 });
}

export async function openEditorFromHud(page: Page): Promise<void> {
  const editorWorkspace = page.locator('[data-testid="editor-workspace"]');
  if (await editorWorkspace.isVisible().catch(() => false)) return;

  const touchBtn = page.locator('[data-testid="touch-btn-editor"]');
  const hudBtn = page.locator('[data-testid="hud-editor-btn"]');
  if (await hudBtn.isVisible().catch(() => false)) {
    await hudBtn.click();
  } else if (await touchBtn.isVisible().catch(() => false)) {
    await touchBtn.click();
  } else {
    await page.keyboard.press('KeyO');
  }

  // Handle LearningIntroModal if it opens before the editor
  const introModal = page.locator('[data-testid="learning-intro-modal"]');
  if (await introModal.isVisible({ timeout: 1500 }).catch(() => false)) {
    const completeBtn = introModal.getByRole('button', { name: /Mulai Kode|Lanjut|Selesai|Start Coding/i }).last();
    await completeBtn.click();
  }

  await editorWorkspace.waitFor({ state: 'visible', timeout: 15_000 });
}

export async function waitForPyodideReady(page: Page): Promise<void> {
  const chip = page.locator('[data-testid="runtime-status-chip"]');
  await expect(chip).toBeVisible({ timeout: 15_000 });
  await expect(chip).toContainText(/Siap|Ready|Selesai|Completed|Error|Kesalahan|Dihentikan/i, {
    timeout: 60_000,
  });
}

export async function replaceCodeInEditor(page: Page, code: string): Promise<void> {
  const cmContent = page.locator('[data-testid="codemirror-host"] .cm-content');
  await cmContent.waitFor({ state: 'visible', timeout: 10_000 });
  await cmContent.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText(code);
}

export async function runCodeAndWaitForResult(page: Page): Promise<string> {
  const runBtn = page.locator('[data-testid="btn-run-code"]');
  await expect(runBtn).toBeEnabled({ timeout: 30_000 });
  await runBtn.click();

  const chip = page.locator('[data-testid="runtime-status-chip"]');
  await expect(chip).toContainText(/Selesai|Completed|Kesalahan|Error|Batas|Limit|Dihentikan|Stopped/i, {
    timeout: 45_000,
  });
  return (await chip.textContent()) ?? '';
}

export function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
