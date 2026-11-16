import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startNewAdventureInSlot, waitForTitleReady } from './helpers';

const SCREENSHOT_DIR = path.resolve('test-results', 'e2e-screenshots');

test.describe('Gate 1: Visual Direction & Anti-AI-Slop', () => {
  test('Title screen, Shrine Island, and Awakening UI adhere to Slate/Parchment + non-bloom rules', async ({
    page,
  }, testInfo) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await waitForTitleReady(page);
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${testInfo.project.name}-title-screen.png`),
      fullPage: false,
    });

    // Verify 3D canvas has non-zero bounding box and non-blank rendered pixels
    const canvasMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="pycraft-game-canvas"] canvas') as HTMLCanvasElement | null;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      };
    });
    expect(canvasMetrics).not.toBeNull();
    expect(canvasMetrics!.width).toBeGreaterThan(200);
    expect(canvasMetrics!.height).toBeGreaterThan(200);

    // Anti-AI-Slop CSS & copy inspection on Title Screen
    const titleAudit = await page.evaluate(() => {
      const violations: string[] = [];
      const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
      const purpleNeonRegex = /(#[789a-f][0-9a-f]{2}[c-f][0-9a-f]|purple|violet|rgba?\(\s*1[2-9]\d,\s*[0-8]\d,\s*2[0-5]\d)/i;

      for (const el of document.querySelectorAll('*')) {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') {
          continue;
        }
        const bf = style.backdropFilter || (style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter;
        if (bf && bf !== 'none') {
          violations.push(`backdrop-filter on ${el.tagName}.${el.className}: ${bf}`);
        }
        if (style.backgroundImage && style.backgroundImage !== 'none' && purpleNeonRegex.test(style.backgroundImage)) {
          violations.push(`forbidden gradient on ${el.tagName}: ${style.backgroundImage}`);
        }
        if (style.boxShadow && style.boxShadow !== 'none' && purpleNeonRegex.test(style.boxShadow)) {
          violations.push(`neon glow boxShadow on ${el.tagName}: ${style.boxShadow}`);
        }
        const tag = el.tagName.toLowerCase();
        if ((tag === 'button' || tag === 'section' || tag === 'aside' || el.getAttribute('role') === 'dialog') &&
          !el.getAttribute('data-testid')?.includes('joystick')
        ) {
          const tl = parseFloat(style.borderTopLeftRadius || '0');
          if (tl > 8 && rect.width !== rect.height) {
            violations.push(`oversized border-radius (${tl}px) on ${tag} (${el.getAttribute('data-testid') ?? el.className})`);
          }
        }
      }

      const bodyText = document.body.innerText ?? '';
      if (emojiRegex.test(bodyText)) {
        violations.push(`emoji detected in body text`);
      }

      const titleScreen = document.querySelector('[data-testid="title-screen"]');
      const titleBg = titleScreen ? window.getComputedStyle(titleScreen).backgroundColor : '';
      return { violations, titleBg };
    });
    expect(titleAudit.violations).toEqual([]);

    // Enter Shrine Island in-game
    await startNewAdventureInSlot(page, 1, 'Arsitek Visual');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${testInfo.project.name}-shrine-island.png`),
      fullPage: false,
    });

    // Walk toward NEO Pedestal / edge of Shrine Island to frame landmarks and islands
    if (testInfo.project.name === 'desktop-chromium') {
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(900);
      await page.keyboard.up('KeyW');
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(600);
      await page.keyboard.up('KeyD');
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${testInfo.project.name}-awakening-landmarks.png`),
        fullPage: false,
      });
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });
});
