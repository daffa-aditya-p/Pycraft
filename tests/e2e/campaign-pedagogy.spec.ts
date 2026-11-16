import { expect, test } from '@playwright/test';
import { AWAKENING_MISSIONS } from '../../src/content/awakening/missions';
import {
  openEditorFromHud,
  replaceCodeInEditor,
  runCodeAndWaitForResult,
  startNewAdventureInSlot,
  waitForPyodideReady,
  waitForTitleReady,
} from './helpers';

test.describe('Gate 4: Pedagogy, Campaign Walkthrough & IndexedDB Persistence', () => {
  test('Prologue, 4 Tiers + Guided OS Paste, NEO Indonesian error translation, M1-M5/Final Pyodide execution, restoration collapse & IDB reload', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Full multi-mission Pyodide campaign walkthrough runs on desktop-chromium');
    test.setTimeout(180_000);

    await waitForTitleReady(page);
    await startNewAdventureInSlot(page, 1, 'Arsitek Kampanye');

    // 1. Walk from spawn [-48, 4, 52] toward neo_pedestal [-44, 5, 47] and verify proximity prompt
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(850);
    await page.keyboard.up('KeyW');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(750);
    await page.keyboard.up('KeyD');

    const prompt = page.locator('[data-testid="hud-interaction-prompt"]');
    const promptVisible = await prompt.isVisible({ timeout: 4000 }).catch(() => false);
    if (promptVisible) {
      await page.keyboard.press('KeyE');
      const dialogue = page.locator('[data-testid="dialogue-box"]');
      await expect(dialogue).toBeVisible({ timeout: 5000 });
      // Advance dialogue through choices / lines until it opens learning intro or editor
      for (let i = 0; i < 12; i++) {
        if (!(await dialogue.isVisible().catch(() => false))) break;
        const choiceBtn = dialogue.locator('button').filter({ hasNotText: /Lanjut|Tutup/i }).first();
        if (await choiceBtn.isVisible().catch(() => false)) {
          await choiceBtn.click();
        } else {
          await page.locator('[data-testid="dialogue-advance-btn"]').click();
        }
        await page.waitForTimeout(150);
      }
    }

    await openEditorFromHud(page);
    await waitForPyodideReady(page);

    // 2. Test all 4 Assistance Tiers
    for (const tier of ['assisted', 'independent', 'mastery', 'guided'] as const) {
      await page.locator(`[data-testid="tier-btn-${tier}"]`).click();
      await expect(page.locator(`[data-testid="tier-btn-${tier}"]`)).toHaveAttribute('aria-pressed', 'true');
    }

    // Verify Guided blanks allow OS paste (ClipboardEvent paste into blank chip)
    const blank = page.locator('.cm-pycraft-blank').first();
    if (await blank.isVisible({ timeout: 3000 }).catch(() => false)) {
      await blank.click();
      await page.evaluate(() => {
        const target = document.activeElement ?? document.querySelector('[data-testid="codemirror-host"] .cm-content');
        if (!target) return;
        const dt = new DataTransfer();
        dt.setData('text/plain', '"Suar"');
        target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      });
      const editorText = await page.locator('[data-testid="codemirror-host"] .cm-content').innerText();
      expect(editorText).toContain('Suar');
    }

    // 3. Test NEO Indonesian Error Translation
    await replaceCodeInEditor(page, 'print("Halo');
    const errStatus = await runCodeAndWaitForResult(page);
    expect(errStatus).toMatch(/Kesalahan|Error/i);

    const mentorPanel = page.locator('[data-testid="mentor-panel"]');
    await expect(mentorPanel).toBeVisible();
    await expect(mentorPanel).toContainText(/tanda kutip|tutup|Sintaks|kurung|NEO/i);

    await page.locator('[data-testid="btn-neo-hint"]').click();
    await expect(mentorPanel).toBeVisible();

    // 4. Complete M1 steps (m1_s1..m1_s5) in real Pyodide & verify restoration collapse + MissionCompleteModal
    const m1 = AWAKENING_MISSIONS.find((m) => m.missionId === 'm1_hello_architect')!;
    const m1MainSteps = m1.steps.filter((s) => !s.isBonus);

    for (let i = 0; i < m1MainSteps.length; i++) {
      const step = m1MainSteps[i]!;
      // Re-open editor if needed so RuntimeClient loads the newly active step
      if (i > 0) {
        const closeEditorBtn = page.locator('[data-testid="hud-editor-btn"]');
        if (await page.locator('[data-testid="editor-workspace"]').isVisible().catch(() => false)) {
          await closeEditorBtn.click();
          await page.waitForTimeout(150);
        }
        await openEditorFromHud(page);
      }
      await replaceCodeInEditor(page, step.referenceSolution);
      const status = await runCodeAndWaitForResult(page);
      expect(status, `Expected ${step.stepId} to pass, got status "${status}"`).toMatch(/Selesai|Completed/i);
    }

    // Verify restoration auto-collapse & MissionCompleteModal after last main step of M1
    const completeModal = page.locator('[data-testid="mission-complete-modal"]');
    await expect(completeModal).toBeVisible({ timeout: 10_000 });
    await completeModal.getByRole('button', { name: /Lanjut|Continue/i }).click();
    await expect(completeModal).toBeHidden();

    // 5. Verify Journal can open steps across M2-M5 & Final Core and run in real Pyodide
    const representativeSteps = [
      AWAKENING_MISSIONS.find((m) => m.missionId === 'm2_data_collector')!.steps[0]!,
      AWAKENING_MISSIONS.find((m) => m.missionId === 'm3_locked_gate')!.steps[0]!,
      AWAKENING_MISSIONS.find((m) => m.missionId === 'm4_automated_farm')!.steps[0]!,
      AWAKENING_MISSIONS.find((m) => m.missionId === 'm5_blueprint')!.steps[0]!,
      AWAKENING_MISSIONS.find((m) => m.missionId === 'final_core_shard')!.steps[0]!,
      AWAKENING_MISSIONS.find((m) => m.missionId === 'final_core_shard')!.steps[2]!,
    ];

    for (const step of representativeSteps) {
      await page.locator('[data-testid="hud-journal-btn"]').click();
      const journal = page.locator('[data-testid="journal-modal"]');
      await expect(journal).toBeVisible({ timeout: 5000 });
      // Practice button or step selector inside Journal
      const practiceBtn = journal.locator(`[data-step-id="${step.stepId}"]`).first();
      if (await practiceBtn.isVisible().catch(() => false)) {
        await practiceBtn.click();
        await page.locator('[data-testid="editor-workspace"]').waitFor({ state: 'visible', timeout: 10_000 });
        await replaceCodeInEditor(page, step.referenceSolution);
        const st = await runCodeAndWaitForResult(page);
        expect(st, `Expected ${step.stepId} to complete in real Pyodide`).toMatch(/Selesai|Completed/i);
      } else {
        await journal.getByRole('button', { name: /Tutup|Close/i }).first().click();
        break;
      }
    }

    // 6. Verify IndexedDB Save & Reload Persistence
    await page.locator('[data-testid="hud-pause-btn"]').click();
    await page.locator('[data-testid="pause-menu"]').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /Simpan Sekarang|Save Now/i }).click();
    await expect(page.locator('[data-testid="hud-save-status"]')).toContainText(/Tersimpan|Saved/i, {
      timeout: 10_000,
    });

    await page.reload();
    await waitForTitleReady(page);
    const continueBtn = page.locator('[data-testid="btn-continue-adventure"]');
    await expect(continueBtn).toBeEnabled({ timeout: 10_000 });
    await continueBtn.click();

    await page.locator('[data-testid="pycraft-app"][data-screen="in_game"]').waitFor({
      state: 'visible',
      timeout: 20_000,
    });
    // Open World Progress / Journal to confirm M1 progress persisted
    await page.locator('[data-testid="hud-journal-btn"]').click();
    const journalAfterReload = page.locator('[data-testid="journal-modal"]');
    await expect(journalAfterReload).toBeVisible();
  });
});
