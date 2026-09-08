import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import type { StudyDashboard } from '../../src/shared/contracts';

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test('learn, train, persist, inspect and return on desktop and mobile', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const crashes: string[] = [];
  page.on('pageerror', error => crashes.push(error.message));
  const email = `browser-${randomUUID()}@example.test`;
  const password = `Study-${randomUUID()}`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Mit Demo-Konto anmelden' })).toHaveCount(0);
  expect(await page.content()).not.toContain('Poker-Local-Demo-2026!');
  await page.getByRole('button', { name: 'Konto erstellen', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('login-desktop.png'), fullPage: true });
  await page.locator('input[name="name"]').fill('Mara');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Konto erstellen und starten' }).click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Mara.' })).toBeVisible();
  await expect(page.getByText('Dein Lernverlauf entsteht mit deiner ersten Hold’em-Entscheidung.')).toBeVisible();
  await page.getByRole('link', { name: 'Zuerst die Grundlagen lesen' }).click();
  await expect(page.getByRole('heading', { name: 'Verstehen kommt vor Gewinnen.' })).toBeVisible();
  await page.getByRole('radio').nth(0).check();
  await page.getByRole('button', { name: 'Antwort überprüfen' }).click();
  await expect(page.getByText(/Noch nicht ganz/)).toBeVisible();
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Antwort überprüfen' }).click();
  await expect(page.getByText('Richtig. Deine Lektion ist abgeschlossen und gespeichert.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('academy-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Am Tisch anwenden' }).click();
  await page.getByRole('button', { name: 'Trainingssitzung starten' }).click();
  await expect(page.getByRole('heading', { name: 'Welche Aktion wählst du?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dein Range-Vergleich' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deine Entscheidung ist gespeichert.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dein Range-Vergleich' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('trainer-feedback-desktop.png'), fullPage: true });
  const trained = await (await page.request.get('/api/dashboard')).json() as StudyDashboard;
  expect(trained.nlhe.decisions).toBe(1);
  expect(trained.lessonCompleted).toBe(true);
  // Cover a full ten-hand session, session completion and a new session.
  for (let decision = 2; decision <= 10; decision++) {
    await page.getByRole('button', { name: 'Nächste Hand', exact: true }).click();
    await expect(page.getByText(`Hand ${decision} / 10`, { exact: true })).toBeVisible();
    await page.locator('.nlhe-action-buttons button').first().click();
    await expect(page.getByRole('heading', { name: 'Deine Entscheidung ist gespeichert.' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Training abschließen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Training abgeschlossen.' })).toBeVisible();
  await page.getByRole('link', { name: 'Neue Sitzung starten', exact: true }).click();
  await page.getByRole('button', { name: 'Trainingssitzung starten' }).click();
  await expect(page.getByText('Hand 1 / 10', { exact: true })).toBeVisible();
  // Simulate a lost response after the server persisted an action. Retry must deduplicate.
  await page.route('**/api/nlhe/decision', async route => {
    await route.fetch();
    await route.abort('failed');
  }, { times: 1 });
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('button', { name: /Raise auf/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Fold · Wiederholen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deine Entscheidung ist gespeichert.' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Preflop entdecken', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Preflop entdecken', exact: true })).toBeVisible();
  expect((await (await page.request.get('/api/dashboard')).json()).nlhe.decisions).toBe(11);

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    for (const route of ['/', '/trainer', '/ranges', '/postflop']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      if (route === '/') await expect(page.getByRole('link', { name: 'Preflop entdecken', exact: true })).toBeVisible();
      if (route === '/trainer') {
        await page.getByRole('button', { name: 'Trainingssitzung starten' }).click();
        await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeVisible();
      }
      if (route === '/ranges') await expect(page.getByRole('gridcell', { name: /^AKs:/ })).toBeVisible();
      if (route === '/postflop') await expect(page.getByRole('gridcell')).toHaveCount(169);
      await noOverflow(page);
      if (width === 390 || width === 1440) {
        const label = route === '/' ? 'dashboard' : route.slice(1);
        await page.screenshot({ path: testInfo.outputPath(`${label}-${width === 390 ? 'mobile' : 'desktop'}.png`), fullPage: true });
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ranges');
  const aceKing = page.getByRole('gridcell', { name: /^AKs:/ });
  await aceKing.click();
  await aceKing.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'AQs', exact: true })).toBeVisible();
  await page.getByLabel('Deine Position', { exact: true }).selectOption('CO');
  await page.getByRole('gridcell', { name: /^AA:/ }).click();
  await expect(page.getByRole('heading', { name: 'AA', exact: true })).toBeVisible();
  await page.getByText('Konkrete Kombinationen', { exact: true }).click();
  await expect(page.locator('.nlhe-combo-list .nlhe-cards')).toHaveCount(6);

  await noOverflow(page);

  await page.goto('/settings');
  await page.getByLabel('Dein Name').fill('Mara Study');
  await page.getByLabel('Lerntage pro Woche').selectOption('5');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Konto erstellen', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Anmelden', exact: true }).first().click();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Mara.' })).toBeVisible();
  const persisted = await (await page.request.get('/api/dashboard')).json() as StudyDashboard;
  expect(persisted.user.weeklyGoal).toBe(5);
  expect(persisted.nlhe.decisions).toBe(11);
  expect(crashes).toEqual([]);
});

test('a failed data request gives a working retry', async ({ page }) => {
  await page.route('**/api/session', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Sitzung vorübergehend nicht erreichbar.' }) }), { times: 1 });
  await page.goto('/');
  await expect(page.getByText('Sitzung vorübergehend nicht erreichbar.')).toBeVisible();
  await page.getByRole('button', { name: /Erneut versuchen/ }).click();
  await expect(page.getByRole('button', { name: 'Konto erstellen', exact: true })).toBeVisible();
});
