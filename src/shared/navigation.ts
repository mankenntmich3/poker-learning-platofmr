export const COURSE_PATH = '/academy/grundlagen';
export const LESSON_PATH = '/academy/grundlagen/entscheidungen';
const destinations = new Set(['/', '/academy', COURSE_PATH, LESSON_PATH, '/trainer', '/ranges', '/settings']);
export function safeReturnTo(value: unknown): string {
  return typeof value === 'string' && destinations.has(value) ? value : '/';
}
