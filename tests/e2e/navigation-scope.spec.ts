import { expect, test } from '@playwright/test';
import { startNewAdventureInSlot, waitForTitleReady } from './helpers';

test.describe('Gate 2: Navigation & Scope', () => {
  test('Title options, Game Modes [Segera Hadir] guard, 8 World regions, Settings, and 1.5s hold overwrite guard', async ({
    page,
  }) => {
    await waitForTitleReady(page);

    // 1. Title screen actions visible
    await expect(page.locator('[data-testid="btn-continue-adventure"]')).toBeDisabled();
    await expect(page.locator('[data-testid="btn-select-adventure"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-new-adventure"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-game-modes"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-world-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-settings"]')).toBeVisible();

    const fsBtn = page.getByRole('button', { name: /Layar Penuh|Fullscreen/i });
    const fsSupported = await page.evaluate(() => Boolean(document.fullscreenEnabled));
    if (fsSupported) {
      await expect(fsBtn).toBeVisible();
    }

    // 2. Game Modes: Adventure playable; Automation, Sandbox, Challenge strictly disabled
    await page.locator('[data-testid="btn-game-modes"]').click();
    await expect(page.locator('[data-testid="game-modes-screen"]')).toBeVisible();

    const advBtn = page.locator('[data-testid="mode-row-adventure"]');
    await expect(advBtn).toBeEnabled();

    for (const lockedMode of ['automation', 'sandbox', 'challenge'] as const) {
      const row = page.locator(`[data-testid="mode-row-${lockedMode}"]`);
      await expect(row).toBeVisible();
      await expect(row).toHaveAttribute('aria-disabled', 'true');
      await expect(row).toHaveAttribute('tabindex', '-1');
      await expect(row).toContainText(/Segera Hadir/i);
      await row.click({ force: true });
      await expect(page.locator('[data-testid="game-modes-screen"]')).toBeVisible();
    }

    await page.getByRole('button', { name: /Kembali|Back/i }).click();
    await expect(page.locator('[data-testid="title-screen"]')).toBeVisible();

    // 3. World / Progress: all 8 regions shown
    await page.locator('[data-testid="btn-world-progress"]').click();
    await expect(page.locator('[data-testid="world-progress-screen"]')).toBeVisible();
    const regionItems = page.locator('[data-testid^="region-item-"]');
    await expect(regionItems).toHaveCount(8);
    await expect(page.locator('[data-testid="region-item-awakening"]')).toBeVisible();

    await page.getByRole('button', { name: /Kembali|Back/i }).click();
    await expect(page.locator('[data-testid="title-screen"]')).toBeVisible();

    // 4. Settings opens cleanly
    await page.locator('[data-testid="btn-settings"]').click();
    await expect(page.locator('[data-testid="settings-screen"]')).toBeVisible();
    await page.getByRole('button', { name: /Kembali|Back/i }).click();

    // 5. Create Slot 1 save, return to Title, verify Continue enabled & 1.5s hold overwrite guard
    await startNewAdventureInSlot(page, 1, 'Arsitek Pertama');

    // Open Pause -> Return to Title
    await page.locator('[data-testid="hud-pause-btn"]').click();
    await expect(page.locator('[data-testid="pause-menu"]')).toBeVisible();
    await page.getByRole('button', { name: /Simpan Sekarang|Save Now/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Kembali ke Judul|Return to Title/i }).click();
    await expect(page.locator('[data-testid="title-screen"]')).toBeVisible();

    // Continue should now be enabled
    await expect(page.locator('[data-testid="btn-continue-adventure"]')).toBeEnabled();

    // Pilih Petualangan opens save management
    await page.locator('[data-testid="btn-select-adventure"]').click();
    await expect(page.locator('[data-testid="save-management-screen"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-slot-card-1"]')).toContainText('Arsitek Pertama');
    await page.getByRole('button', { name: /Kembali|Back/i }).click();

    // New Adventure -> clicking occupied Slot 1 triggers 1.5s HoldConfirmModal with Ekspor Dulu
    await page.locator('[data-testid="btn-new-adventure"]').click();
    await page.locator('[data-testid="slot-tablet-1"]').click();
    const holdModal = page.locator('[data-testid="hold-confirm-modal"]');
    await expect(holdModal).toBeVisible();
    await expect(holdModal.getByRole('button', { name: /Ekspor Dulu|Export/i })).toBeVisible();

    // Short 300ms press must NOT confirm overwrite
    const holdBtn = page.locator('[data-testid="hold-confirm-button"]');
    const box = await holdBtn.boundingBox();
    if (!box) throw new Error('Hold button has no boundingBox');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);
    await page.mouse.up();
    await expect(holdModal).toBeVisible();

    // Full 1650ms hold MUST confirm
    await page.mouse.down();
    await page.waitForTimeout(1650);
    await page.mouse.up();
    await expect(holdModal).toBeHidden({ timeout: 5_000 });
  });
});
