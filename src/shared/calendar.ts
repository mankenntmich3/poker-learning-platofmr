/** Seven UTC calendar days, including today; missing activity is genuinely zero. */
export function lastSevenDays(activity: { date: string; decisions: number }[], today: string) {
  const end = new Date(`${today}T00:00:00Z`);
  if (!Number.isFinite(end.getTime())) throw new Error('Invalid calendar date');
  const byDay = new Map(activity.map(day => [day.date, day.decisions]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end.getTime() - (6 - index) * 86_400_000).toISOString().slice(0, 10);
    return { date, decisions: byDay.get(date) ?? 0 };
  });
}
