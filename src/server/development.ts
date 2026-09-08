/** Public test credentials only. Never use them for a personal or hosted account. */
export const DEVELOPMENT_DEMO = { email: 'demo@poker.local', password: 'Poker-Local-Demo-2026!' };
export function developmentAccessEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;
}
export function requireDevelopmentDatabase(): void {
  if (!developmentAccessEnabled()) throw new Error('Demo-Seed und Reset sind ausschließlich für die lokale Entwicklungsdatenbank erlaubt. NODE_ENV=production und DATABASE_URL werden abgewiesen.');
}
