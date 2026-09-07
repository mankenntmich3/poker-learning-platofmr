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
  await expect(page.getByRole('button', { name: 'Trainingsraum erstellen' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('login-desktop.png'), fullPage: true });
  await page.locator('input[name="name"]').fill('Mara');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Trainingsraum erstellen' }).click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Mara.' })).toBeVisible();
  await expect(page.getByText('Deine erste Entscheidung wartet')).toBeVisible();
  await page.getByRole('link', { name: 'Lektion beginnen' }).click();
  await expect(page.getByRole('heading', { name: 'Verstehen kommt vor Gewinnen.' })).toBeVisible();
  await page.getByRole('radio').nth(0).check();
  await page.getByRole('button', { name: 'Antwort überprüfen' }).click();
  await expect(page.getByText(/Noch nicht ganz/)).toBeVisible();
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Antwort überprüfen' }).click();
  await expect(page.getByText('Richtig. Deine Lektion ist abgeschlossen und gespeichert.')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('academy-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Am Tisch anwenden' }).click();
  await expect(page.getByRole('heading', { name: 'Wie spielst du diese Hand?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Berechnete Strategie' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deine Entscheidung ist gespeichert.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Berechnete Strategie' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('trainer-desktop.png'), fullPage: true });
  const trained = await (await page.request.get('/api/dashboard')).json() as StudyDashboard;
  expect(trained.decisions).toBe(1);
  expect(trained.lessonCompleted).toBe(true);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Training starten', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Training starten', exact: true })).toBeVisible();
  expect((await (await page.request.get('/api/dashboard')).json()).decisions).toBe(1);

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    for (const route of ['/', '/trainer', '/ranges']) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      if (route === '/') await expect(page.getByRole('link', { name: 'Training starten', exact: true })).toBeVisible();
      if (route === '/trainer') await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeVisible();
      if (route === '/ranges') await expect(page.getByRole('button', { name: 'AKs, 4 Kombinationen', exact: true })).toBeVisible();
      await noOverflow(page);
      if (width === 390 || width === 1440) {
        const label = route === '/' ? 'dashboard' : route.slice(1);
        await page.screenshot({ path: testInfo.outputPath(`${label}-${width === 390 ? 'mobile' : 'desktop'}.png`), fullPage: true });
        const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations, JSON.stringify(accessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })))).toEqual([]);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/ranges');
  const aceKing = page.getByRole('button', { name: 'AKs, 4 Kombinationen', exact: true });
  await aceKing.click();
  await aceKing.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'AQs', exact: true })).toBeVisible();
  await page.getByLabel('Handtyp').selectOption('pair');
  await page.getByRole('button', { name: 'AA, 6 Kombinationen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AA', exact: true })).toBeVisible();
  await expect(page.locator('.combo-pair')).toHaveCount(6);
  await page.getByRole('button', { name: 'Fokusansicht', exact: true }).click();
  await noOverflow(page);

  await page.goto('/settings');
  await page.getByLabel('Dein Name').fill('Mara Study');
  await page.getByLabel('Lerntage pro Woche').selectOption('5');
  await page.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.getByText('Gespeichert', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Konto erstellen', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Mara.' })).toBeVisible();
  const persisted = await (await page.request.get('/api/dashboard')).json() as StudyDashboard;
  expect(persisted.user.weeklyGoal).toBe(5);
  expect(persisted.decisions).toBe(1);
  expect(crashes).toEqual([]);
});

test('a failed data request gives a working retry', async ({ page }) => {
  await page.route('**/api/session', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Sitzung vorübergehend nicht erreichbar.' }) }), { times: 1 });
  await page.goto('/');
  await expect(page.getByText('Sitzung vorübergehend nicht erreichbar.')).toBeVisible();
  await page.getByRole('button', { name: /Erneut versuchen/ }).click();
  await expect(page.getByRole('button', { name: 'Trainingsraum erstellen' })).toBeVisible();
});
