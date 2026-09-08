import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';

const demo = { email: 'demo@poker.local', password: 'Poker-Local-Demo-2026!' };
test('personal signup and login work in development without sharing demo progress', async ({ page }) => {
  const email = `local-${randomUUID()}@example.test`;
  const password = `Local-${randomUUID()}`;
  await page.goto('http://127.0.0.1:3100/academy');
  await page.getByRole('button', { name: 'Konto erstellen', exact: true }).click();
  await page.getByLabel('Dein Name', { exact: true }).fill('Alex');
  await page.getByLabel('E-Mail-Adresse', { exact: true }).fill(email);
  await page.getByLabel('Passwort', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Konto erstellen und starten' }).click();
  await expect(page.getByRole('link', { name: 'Kurs öffnen' })).toBeVisible();
  const dashboard = await (await page.request.get('http://127.0.0.1:3100/api/dashboard')).json();
  expect(dashboard.user.developmentOnly).toBe(false);
  expect(dashboard.decisions).toBe(0);
  await page.goto('http://127.0.0.1:3100/settings');
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/login');
  await page.getByLabel('E-Mail-Adresse', { exact: true }).fill(email);
  await page.getByLabel('Passwort', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Alex.' })).toBeVisible();
});
test('demo login → dashboard → course → lesson → completed training → logout → persisted login', async ({ page }, info) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel('E-Mail-Adresse', { exact: true }).fill(demo.email);
  await page.getByLabel('Passwort', { exact: true }).fill(demo.password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Demo.' })).toBeVisible();
  const baseline = await (await page.request.get('/api/dashboard')).json();
  expect(baseline.decisions).toBeGreaterThanOrEqual(3);
  await page.getByRole('link', { name: 'Academy', exact: true }).first().click();
  await page.getByRole('link', { name: 'Kurs öffnen', exact: true }).click();
  await page.getByRole('link', { name: 'Lektion öffnen', exact: true }).click();
  await expect(page).toHaveURL(/\/academy\/grundlagen\/entscheidungen$/);
  await page.getByRole('radio').nth(0).check();
  await page.getByRole('button', { name: 'Antwort überprüfen' }).click();
  await expect(page.getByText(/Noch nicht ganz/)).toBeVisible();
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button', { name: 'Antwort überprüfen' }).click();
  await expect(page.getByText('Richtig. Deine Lektion ist abgeschlossen und gespeichert.')).toBeVisible();
  await page.getByRole('link', { name: 'Am Tisch anwenden', exact: true }).click();
  await page.getByRole('button', { name: 'Trainingssitzung starten', exact: true }).click();
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Berechnete Strategie' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('demo-feedback-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sitzung jetzt abschließen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Training abgeschlossen.' })).toBeVisible();
  await page.getByRole('link', { name: 'Fortschritt ansehen', exact: true }).click();
  await page.reload();
  const saved = await (await page.request.get('/api/dashboard')).json();
  expect(saved.decisions).toBe(baseline.decisions + 1);
  expect(saved.lessonCompleted).toBe(true);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get('/api/dashboard')).status()).toBe(401);
  await page.getByRole('button', { name: 'Mit Demo-Konto anmelden', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Demo.' })).toBeVisible();
  expect((await (await page.request.get('/api/dashboard')).json()).decisions).toBe(saved.decisions);
  await page.context().clearCookies();
  await page.goto('/academy/grundlagen/entscheidungen');
  await expect(page).toHaveURL(/\/login\?next=%2Facademy%2Fgrundlagen%2Fentscheidungen/);
  await page.getByRole('button', { name: 'Mit Demo-Konto anmelden', exact: true }).click();
  await expect(page).toHaveURL(/\/academy\/grundlagen\/entscheidungen$/);
});

test('logged-out destinations and both loopback aliases have usable login', async ({ browser }) => {
  for (const host of ['localhost', '127.0.0.1']) {
    const context = await browser.newContext({ baseURL: `http://${host}:3100` });
    const page = await context.newPage();
    for (const path of ['/', '/academy', '/academy/grundlagen', '/academy/grundlagen/entscheidungen', '/trainer', '/settings']) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}$`));
      await expect(page.getByRole('button', { name: 'Mit Demo-Konto anmelden' })).toBeVisible();
    }
    await page.goto('/trainer');
    await page.getByRole('button', { name: 'Mit Demo-Konto anmelden' }).click();
    await expect(page).toHaveURL(`http://${host}:3100/trainer`);
    await expect(page.getByRole('button', { name: 'Trainingssitzung starten' })).toBeVisible();
    await context.close();
  }
});

test('local login, course and completed session are usable on a phone', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Mit Demo-Konto anmelden' })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('demo-login-mobile.png'), fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map(v => v.id)).toEqual([]);
  await page.getByRole('button', { name: 'Mit Demo-Konto anmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Demo.' })).toBeVisible();
  await page.goto('/academy');
  await page.getByRole('link', { name: 'Kurs öffnen' }).click();
  await expect(page.getByRole('link', { name: 'Lektion öffnen' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('demo-course-mobile.png'), fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map(v => v.id)).toEqual([]);
  await page.getByRole('link', { name: 'Zur Trainingsübung' }).click();
  await page.getByRole('button', { name: 'Trainingssitzung starten' }).click();
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await page.getByRole('button', { name: 'Sitzung jetzt abschließen' }).click();
  await expect(page.getByRole('heading', { name: 'Training abgeschlossen.' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('demo-completed-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map(v => v.id)).toEqual([]);
});
