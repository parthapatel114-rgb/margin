import { addDays, dayKey, dayStart, weekStart } from "./analytics";
export type DateRange = { from: string; to: string };
export const dateAt = (key: string) => +new Date(`${key}T12:00:00`);
export const monthStart = (at: number) => {
  const d = new Date(at);
  return +new Date(d.getFullYear(), d.getMonth(), 1, 12);
};
export const shiftMonth = (at: number, count: number) => {
  const d = new Date(at);
  return +new Date(d.getFullYear(), d.getMonth() + count, 1, 12);
};
export function monthCells(at: number): Array<number | null> {
  const start = monthStart(at),
    d = new Date(start);
  const cells: Array<number | null> = Array((d.getDay() + 6) % 7).fill(null);
  for (
    let n = start;
    new Date(n).getMonth() === d.getMonth();
    n = addDays(n, 1)
  )
    cells.push(n);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function orderedRange(a: string, b: string): DateRange {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}
export function datePresets(now: number) {
  const today = dayKey(now);
  return [
    { name: "Today", from: today, to: today },
    {
      name: "Yesterday",
      from: dayKey(addDays(now, -1)),
      to: dayKey(addDays(now, -1)),
    },
    { name: "This week", from: dayKey(weekStart(now)), to: today },
    { name: "Last 7 days", from: dayKey(addDays(now, -6)), to: today },
    { name: "This month", from: dayKey(monthStart(now)), to: today },
    { name: "Last 30 days", from: dayKey(addDays(now, -29)), to: today },
  ];
}
export function rangeBounds(value: DateRange, now: number): [number, number] {
  return [
    value.from ? dayStart(dateAt(value.from)) : 0,
    value.to
      ? addDays(dayStart(dateAt(value.to)), 1)
      : addDays(dayStart(now), 1),
  ];
}
export function dateRangeLabel(value: DateRange) {
  if (!value.from && !value.to) return "All dates";
  const label = (key: string) =>
    new Date(dateAt(key)).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  if (value.from === value.to) return label(value.from);
  return `${value.from ? label(value.from) : "Beginning"} – ${value.to ? label(value.to) : "Today"}`;
}
