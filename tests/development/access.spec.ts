import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import type { NlheNode, NlheSession } from '../../src/shared/nlhe';
const demo = { email: 'demo@poker.local', password: 'Poker-Local-Demo-2026!' };
async function demoLogin(page: import('@playwright/test').Page) {
  await page.goto('/login'); await page.getByRole('button', { name: 'Mit Demo-Konto anmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Demo.' })).toBeVisible();
}
test('personal development signup returns to the exact selected NLHE range on the alternate hostname', async ({ page }) => {
  const email = `nlhe-${randomUUID()}@example.test`;
  await page.goto('http://127.0.0.1:3100/ranges?stack=40&hero=BB&scenario=vs-open&villain=BTN');
  await page.getByRole('button', { name: 'Konto erstellen', exact: true }).click();
  await page.getByLabel('Dein Name', { exact: true }).fill('Alex'); await page.getByLabel('E-Mail-Adresse', { exact: true }).fill(email);
  await page.getByLabel('Passwort', { exact: true }).fill('NLHE-Personal-Password!'); await page.getByRole('button', { name: 'Konto erstellen und starten' }).click();
  await expect(page.getByRole('gridcell')).toHaveCount(169); await expect(page.getByLabel('Effektiver Stack', { exact: true })).toHaveValue('40');
  const data = await (await page.request.get('http://127.0.0.1:3100/api/nlhe/progress')).json(); expect(data.decisions).toBe(0);
  await expect(page.locator('main')).not.toContainText('Kuhn');
});

test('dynamic postflop starts a persistent exact-node training session', async ({ page }, info) => {
  await demoLogin(page); const baseline = await (await page.request.get('/api/nlhe/progress')).json();
  await page.goto('/postflop'); await expect(page.getByRole('gridcell')).toHaveCount(338);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'BTN ist am Zug', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Diesen Spot trainieren', exact: true }).click();
  await page.getByRole('link', { name: 'Trainingssitzung konfigurieren', exact: true }).click();
  await page.getByRole('button', { name: 'Study-Training starten', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'NLHE Study-Trainer', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dein Strategievergleich', exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Dein Strategievergleich', exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>v.id)).toEqual([]);
  await page.screenshot({ path: info.outputPath('nlhe-postflop-feedback.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sitzung jetzt abschließen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Study-Training abgeschlossen', exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Study-Training abgeschlossen', exact: true })).toBeVisible();
  const progress = await (await page.request.get('/api/nlhe/progress')).json(); expect(progress.postflop).toBe(baseline.postflop + 1);
});

test('demo explores mixed NLHE ranges, switches stack, trains exact spot and retains progress after relogin', async ({ page }, info) => {
  await demoLogin(page); const baseline = await (await page.request.get('/api/nlhe/progress')).json();
  await page.getByRole('link', { name: 'Preflop entdecken' }).click();
  // Slow server navigation must not make successive controls overwrite an earlier selection.
  await page.route('**/ranges?**', async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.getByLabel('Effektiver Stack', { exact: true }).selectOption('25');
  await page.getByLabel('Deine Position', { exact: true }).selectOption('SB');
  await page.getByLabel('Vorgeschichte', { exact: true }).selectOption('vs-open');
  await page.getByLabel('Gegnerposition', { exact: true }).selectOption('BTN');
  await expect(page.getByRole('heading', { name: '25 BB · SB vs BTN · vs Open', exact: true })).toBeVisible();
  const range: NlheNode = await (await page.request.get('/api/nlhe/range?stack=25&hero=SB&scenario=vs-open&villain=BTN')).json();
  const mixed = range.classes.find(row => row.actions.some(a => a.frequency > 0 && a.frequency < 1))!;
  await page.locator(`[data-hand="${mixed.handClass}"]`).click(); await expect(page.getByRole('heading', { name: mixed.handClass, exact: true })).toBeVisible();
  await page.getByLabel('Effektiver Stack', { exact: true }).selectOption('40');
  await expect(page.getByRole('heading', { name: '40 BB · SB vs BTN · vs Open', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('nlhe-explorer-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'Diese Range trainieren' }).click(); await page.getByRole('button', { name: 'Trainingssitzung starten' }).click();
  await expect(page).toHaveURL(/session=/); const sessionId = new URL(page.url()).searchParams.get('session')!;
  const session: NlheSession = await (await page.request.get(`/api/nlhe/session?id=${sessionId}`)).json();
  expect(session.spot.config).toMatchObject({ stackBb: 40, hero: 'SB', villain: 'BTN', scenario: 'vs-open' }); expect(session.question.cards).toHaveLength(2);
  expect(session.feedback).toBeNull(); await expect(page.getByRole('heading', { name: 'Dein Range-Vergleich' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fold', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Dein Range-Vergleich' })).toBeVisible();
  await expect(page.getByText('EV-Verlust: nicht verfügbar', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('nlhe-feedback-desktop.png'), fullPage: true });
  await page.reload(); await expect(page.getByRole('heading', { name: 'Dein Range-Vergleich' })).toBeVisible();
  await page.getByRole('button', { name: 'Sitzung jetzt abschließen' }).click(); await expect(page.getByRole('heading', { name: 'Training abgeschlossen.' })).toBeVisible();
  await page.goto('/settings'); await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/); await page.getByLabel('E-Mail-Adresse', { exact: true }).fill(demo.email); await page.getByLabel('Passwort', { exact: true }).fill(demo.password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).last().click(); await expect(page.getByRole('heading', { name: 'Dein Trainingsraum, Demo.' })).toBeVisible();
  const saved = await (await page.request.get('/api/nlhe/progress')).json(); expect(saved.decisions).toBe(baseline.decisions + 1);
  await page.goto(`/trainer?session=${sessionId}`); await expect(page.getByRole('heading', { name: 'Training abgeschlossen.' })).toBeVisible();
});
test('all stack presets, legal positions and an arbitrary stack are available without stale ranges', async ({ page }) => {
  await demoLogin(page); await page.goto('/ranges');
  for (const stack of [10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200]) {
    await page.getByLabel('Effektiver Stack', { exact: true }).selectOption(String(stack));
    await expect(page.getByRole('heading', { name: `${stack} BB · BTN · RFI`, exact: true })).toBeVisible(); await expect(page.getByRole('gridcell')).toHaveCount(169);
  }
  for (const position of ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']) { await page.getByLabel('Deine Position', { exact: true }).selectOption(position); await expect(page.locator('.nlhe-context h2')).toContainText(position); }
  await expect(page.getByLabel('Vorgeschichte', { exact: true })).toHaveValue('vs-open');
  await page.getByLabel('Effektiver Stack', { exact: true }).selectOption('custom'); await page.getByLabel('Eigener Stack in BB', { exact: true }).fill('62.5'); await page.getByRole('button', { name: 'Stack anwenden' }).click();
  await expect(page.locator('.nlhe-context h2')).toContainText('62.5 BB');
});
test('phone range controls, keyboard grid and training feedback are accessible', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await demoLogin(page); await page.goto('/ranges');
  await expect(page.getByRole('gridcell')).toHaveCount(169); await page.locator('[data-hand="AKs"]').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-hand="AQs"]')).toBeFocused(); await expect(page.getByRole('heading', { name: 'AQs', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map(v => v.id)).toEqual([]);
  await page.screenshot({ path: info.outputPath('nlhe-explorer-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Diese Range trainieren' }).click(); await page.getByRole('button', { name: 'Trainingssitzung starten' }).click();
  await page.getByRole('button', { name: 'Fold', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Dein Range-Vergleich' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map(v => v.id)).toEqual([]);
  await page.screenshot({ path: info.outputPath('nlhe-trainer-mobile.png'), fullPage: true });
});
