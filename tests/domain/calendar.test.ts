import { describe, expect, it } from 'vitest';
import { lastSevenDays } from '../../src/shared/calendar';
describe('study activity calendar', () => {
  it('excludes older active days and preserves zero days across year boundaries', () => {
    const week = lastSevenDays([{ date: '2025-12-01', decisions: 99 }, { date: '2025-12-31', decisions: 2 }, { date: '2026-01-02', decisions: 1 }], '2026-01-02');
    expect(week.map(day => day.date)).toEqual(['2025-12-27','2025-12-28','2025-12-29','2025-12-30','2025-12-31','2026-01-01','2026-01-02']);
    expect(week.reduce((sum, day) => sum + day.decisions, 0)).toBe(3);
    expect(week.filter(day => day.decisions === 0)).toHaveLength(5);
  });
});
