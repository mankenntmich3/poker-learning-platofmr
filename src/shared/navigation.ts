export const COURSE_PATH = '/academy/grundlagen';
export const LESSON_PATH = '/academy/grundlagen/entscheidungen';
const destinations = new Set(['/', '/academy', COURSE_PATH, LESSON_PATH, '/trainer', '/ranges', '/settings', '/postflop']);
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  const url = new URL(value, 'https://rangeform.invalid');
  if (url.origin !== 'https://rangeform.invalid' || !destinations.has(url.pathname)) return '/';
  if (url.pathname === '/trainer' && /^[a-f0-9-]{36}$/i.test(url.searchParams.get('session') || '')) return `/trainer?session=${url.searchParams.get('session')}`;
  if ((url.pathname === '/trainer' || url.pathname === '/ranges') && url.search) {
    try { return `${url.pathname}?${configSearch(configFromSearch(url.searchParams))}`; } catch { return url.pathname; }
  }
  return url.pathname;
}
import { configFromSearch, configSearch } from './nlhe';
