import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { contrastRatio, openEditorFromHud, startNewAdventureInSlot, waitForTitleReady } from './helpers';

test.describe('Gate 5: Accessibility, Contrast & 150% Text Scaling', () => {
  test('#8FA3A9 contrast >= 4.5:1, zero critical/serious axe violations, aria-live announcements, and 150% scaling without clipping', async ({
    page,
  }, testInfo) => {
    // Verify #8FA3A9 secondary text meets >= 4.5:1 on Slate Dark #1C2427
    expect(contrastRatio('#8FA3A9', '#1C2427')).toBeGreaterThanOrEqual(4.5);

    await waitForTitleReady(page);

    // #game-announcements aria-live="polite"
    const liveRegion = page.locator('#game-announcements');
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    const checkAxeAndOverflow = async (label: string) => {
      const axeResults = await new AxeBuilder({ page })
        .disableRules(['color-contrast']) // WebGL canvas underneath can confuse automated bg sampling; explicit contrast tested below
        .analyze();
      const severe = axeResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(severe, `Axe critical/serious violations on ${label}`).toEqual([]);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        overflow.scrollWidth,
        `Horizontal overflow on ${label}: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`,
      ).toBeLessThanOrEqual(overflow.innerWidth + 1);
    };

    await checkAxeAndOverflow('Title Screen (100%)');

    // Enable 150% text scale in Settings and check all pre-game screens
    await page.locator('[data-testid="btn-settings"]').click();
    await page.locator('[data-testid="settings-screen"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="settings-tab-accessibility"]').click();
    await page.locator('[data-testid="text-scale-150"]').click();

    await expect
      .poll(async () =>
        page.evaluate(() => document.documentElement.style.getPropertyValue('--text-scale')),
      )
      .toBe('1.5');

    await checkAxeAndOverflow('Settings Screen (150%)');

    // Check Settings tabs remain clickable without horizontal clipping at 150%
    for (const tab of ['audio', 'graphics', 'controls', 'language', 'storage'] as const) {
      await page.locator(`[data-testid="settings-tab-${tab}"]`).click();
      await checkAxeAndOverflow(`Settings Tab ${tab} (150%)`);
    }

    await page.getByRole('button', { name: /Kembali|Back/i }).click();
    await checkAxeAndOverflow('Title Screen (150%)');

    await page.locator('[data-testid="btn-game-modes"]').click();
    await checkAxeAndOverflow('Game Modes (150%)');
    await page.getByRole('button', { name: /Kembali|Back/i }).click();

    await page.locator('[data-testid="btn-world-progress"]').click();
    await checkAxeAndOverflow('World Progress (150%)');
    await page.getByRole('button', { name: /Kembali|Back/i }).click();

    // Check in-game HUD + Editor at 150% text scale
    await startNewAdventureInSlot(page, 1, 'Arsitek A11y');
    await checkAxeAndOverflow('In-Game HUD (150%)');

    await openEditorFromHud(page);
    await checkAxeAndOverflow('Editor Workspace (150%)');

    // Also verify narrow 360x640 viewport at 150% on desktop project
    if (testInfo.project.name === 'desktop-chromium') {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.waitForTimeout(200);
      await checkAxeAndOverflow('Editor Workspace 360x640 (150%)');
    }
  });
});
