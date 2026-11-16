import { expect, test } from '@playwright/test';
import { openEditorFromHud, startNewAdventureInSlot, waitForTitleReady } from './helpers';

test.describe('Gate 3: Mobile & Responsive Parity', () => {
  test('Touch targets >= 48x48, joystick pointerId capture, Portrait 3-snap sheet, Landscape keyboard overlay & accessory bar', async ({
    page,
  }, testInfo) => {
    const project = testInfo.project.name;
    await waitForTitleReady(page);

    if (project === 'mobile-portrait' || project === 'mobile-landscape') {
      // Verify all primary Title Screen buttons meet >= 48x48 px touch target
      const titleUndersized = await page.evaluate(() => {
        const bad: string[] = [];
        const buttons = document.querySelectorAll('[data-testid="title-screen"] button');
        for (const btn of buttons) {
          const r = btn.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.width < 48 || r.height < 48) {
            bad.push(`${btn.getAttribute('data-testid') ?? btn.textContent?.trim()}: ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        }
        return bad;
      });
      expect(titleUndersized).toEqual([]);
    }

    await startNewAdventureInSlot(page, 1, 'Arsitek Mobile');

    if (project === 'mobile-portrait' || project === 'mobile-landscape') {
      const touchControls = page.locator('[data-testid="touch-controls"]');
      await expect(touchControls).toBeVisible();

      // Verify TouchControls & HUD action buttons meet >= 48x48 px
      const hudTouchUndersized = await page.evaluate(() => {
        const bad: string[] = [];
        const selectors = [
          '[data-testid="touch-controls"] button',
          '[data-testid="gameplay-hud"] button',
        ];
        for (const sel of selectors) {
          for (const btn of document.querySelectorAll(sel)) {
            const r = btn.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.width < 48 || r.height < 48) {
              bad.push(`${btn.getAttribute('data-testid') ?? btn.getAttribute('aria-label') ?? btn.textContent?.trim()}: ${Math.round(r.width)}x${Math.round(r.height)}`);
            }
          }
        }
        return bad;
      });
      expect(hudTouchUndersized).toEqual([]);

      // Test joystick pointerId capture even when thumb drifts past 40% radius
      const joyZone = page.locator('[data-testid="touch-joystick-zone"]');
      const joyBox = await joyZone.boundingBox();
      expect(joyBox).not.toBeNull();
      const startX = joyBox!.x + joyBox!.width / 2;
      const startY = joyBox!.y + joyBox!.height / 2;

      await page.evaluate(
        ({ sx, sy }) => {
          const zone = document.querySelector('[data-testid="touch-joystick-zone"]') as HTMLElement | null;
          if (!zone) throw new Error('missing touch-joystick-zone');
          zone.dispatchEvent(
            new PointerEvent('pointerdown', {
              pointerId: 7,
              pointerType: 'touch',
              clientX: sx,
              clientY: sy,
              bubbles: true,
            }),
          );
          // Drift far past 40% radius (+180px across screen)
          zone.dispatchEvent(
            new PointerEvent('pointermove', {
              pointerId: 7,
              pointerType: 'touch',
              clientX: sx + 180,
              clientY: sy - 20,
              bubbles: true,
            }),
          );
        },
        { sx: startX, sy: startY },
      );

      const knobStyleMid = await page.locator('[data-testid="touch-joystick-knob"]').getAttribute('style');
      expect(knobStyleMid).not.toContain('translate(-50%, -50%)');

      await page.evaluate(
        ({ sx, sy }) => {
          const zone = document.querySelector('[data-testid="touch-joystick-zone"]') as HTMLElement | null;
          zone?.dispatchEvent(
            new PointerEvent('pointerup', {
              pointerId: 7,
              pointerType: 'touch',
              clientX: sx + 180,
              clientY: sy - 20,
              bubbles: true,
            }),
          );
        },
        { sx: startX, sy: startY },
      );
      const knobStyleReset = await page.locator('[data-testid="touch-joystick-knob"]').getAttribute('style');
      expect(knobStyleReset).toContain('translate(-50%, -50%)');
    }

    // Open EditorWorkspace and verify responsive layout class
    await openEditorFromHud(page);
    const editor = page.locator('[data-testid="editor-workspace"]');
    await expect(editor).toBeVisible();

    if (project === 'mobile-portrait') {
      await expect(editor).toHaveAttribute('data-layout-class', 'phone_portrait');

      // 3-snap bottom sheet: peek (>= 88px), half (~50%), full (~92%)
      await page.locator('[data-testid="sheet-snap-peek"]').click();
      await page.waitForTimeout(250);
      const peekBox = await editor.boundingBox();
      expect(peekBox!.height).toBeGreaterThanOrEqual(88);
      expect(peekBox!.height).toBeLessThan(260);

      await page.locator('[data-testid="sheet-snap-half"]').click();
      await page.waitForTimeout(250);
      const halfBox = await editor.boundingBox();
      expect(halfBox!.height).toBeGreaterThan(340);
      expect(halfBox!.height).toBeLessThan(520);

      await page.locator('[data-testid="sheet-snap-full"]').click();
      await page.waitForTimeout(250);
      const fullBox = await editor.boundingBox();
      expect(fullBox!.height).toBeGreaterThan(680);

      // Accessory bar ~44px & [Keping Kode ▾]
      const accBar = page.locator('[data-testid="mobile-accessory-bar"]');
      await expect(accBar).toBeVisible();
      const accBox = await accBar.boundingBox();
      expect(accBox!.height).toBeGreaterThanOrEqual(40);
      expect(accBox!.height).toBeLessThanOrEqual(56);

      const snippetBtn = page.getByRole('button', { name: /Keping Kode/i });
      await expect(snippetBtn).toBeVisible();
      await snippetBtn.click();
      await expect(page.getByText(/robot\.move_forward\(\)/i).first()).toBeVisible();
    }

    if (project === 'mobile-landscape') {
      await expect(editor).toHaveAttribute('data-layout-class', 'phone_landscape');
      await expect(page.locator('[data-testid="editor-landscape-rail"]')).toBeVisible();

      const accBar = page.locator('[data-testid="mobile-accessory-bar"]');
      await expect(accBar).toBeVisible();
      const accBox = await accBar.boundingBox();
      expect(accBox!.height).toBeGreaterThanOrEqual(40);
      expect(accBox!.height).toBeLessThanOrEqual(56);

      // Simulate virtual keyboard shrinkage on visualViewport (390 -> 180 px)
      await page.evaluate(() => {
        const vv = window.visualViewport;
        if (vv) {
          Object.defineProperty(vv, 'height', { configurable: true, value: 180 });
          vv.dispatchEvent(new Event('resize'));
        }
      });
      await page.waitForTimeout(150);
      await expect(editor).toHaveAttribute('data-keyboard-overlay', 'true');
      const closeKbBtn = page.locator('[data-testid="btn-close-keyboard"]');
      await expect(closeKbBtn).toBeVisible();
      await closeKbBtn.click();

      // Restore visualViewport height
      await page.evaluate(() => {
        const vv = window.visualViewport;
        if (vv) {
          Object.defineProperty(vv, 'height', { configurable: true, value: 390 });
          vv.dispatchEvent(new Event('resize'));
        }
      });
    }

    // Check touch targets inside EditorWorkspace on mobile projects
    if (project === 'mobile-portrait' || project === 'mobile-landscape') {
      const editorUndersized = await page.evaluate(() => {
        const bad: string[] = [];
        for (const btn of document.querySelectorAll('[data-testid="editor-workspace"] button')) {
          const r = btn.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // Exclude accessory bar small key inserts if explicitly 38px inside 44px bar, flag primary controls
          if (btn.closest('[data-testid="mobile-accessory-bar"]')) continue;
          if (r.width < 44 || r.height < 44) {
            bad.push(`${btn.getAttribute('data-testid') ?? btn.textContent?.trim()}: ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        }
        return bad;
      });
      expect(editorUndersized).toEqual([]);
    }
  });
});
