import type { Session, Subject } from "./types";
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const dayKey = (date: Date | number) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function dayStart(at: number) {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return +d;
}
export function addDays(at: number, n: number) {
  const d = new Date(at);
  d.setDate(d.getDate() + n);
  return +d;
}
export function weekStart(at: number) {
  const d = new Date(dayStart(at));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return +d;
}
export function elapsed(session: Session, now = Date.now()) {
  const total = session.segments.reduce(
    (sum, part) => sum + Math.max(0, (part.end ?? now) - part.start),
    0,
  );
  return session.targetMs === null ? total : Math.min(total, session.targetMs);
}
export function clock(ms: number) {
  const sec = Math.floor(Math.max(ms, 0) / 1000);
  return [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
export function duration(ms: number) {
  const minutes = Math.floor(Math.max(ms, 0) / 60000);
  if (ms > 0 && minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
}
export type Period = "week" | "month" | "year" | "all";
export function range(
  period: Period,
  anchor: number,
  sessions: Session[] = [],
): [number, number] {
  const date = new Date(anchor);
  if (period === "week") {
    const start = weekStart(anchor);
    return [start, addDays(start, 7)];
  }
  if (period === "month")
    return [
      +new Date(date.getFullYear(), date.getMonth(), 1),
      +new Date(date.getFullYear(), date.getMonth() + 1, 1),
    ];
  if (period === "year")
    return [
      +new Date(date.getFullYear(), 0, 1),
      +new Date(date.getFullYear() + 1, 0, 1),
    ];
  return [
    Math.min(dayStart(anchor), ...sessions.map((s) => dayStart(s.startedAt))),
    addDays(dayStart(anchor), 1),
  ];
}
export function shiftPeriod(period: Period, anchor: number, n: number) {
  const d = new Date(anchor);
  if (period === "week") return addDays(anchor, n * 7);
  if (period === "month")
    return +new Date(d.getFullYear(), d.getMonth() + n, 1);
  return +new Date(d.getFullYear() + n, 0, 1);
}
export interface DayBucket {
  total: number;
  subjects: Record<string, number>;
}
export function analyze(
  sessions: Session[],
  from: number,
  to: number,
  now = Date.now(),
) {
  const days: Record<string, DayBucket> = {};
  const hours = Array<number>(24).fill(0);
  const weekdays = Array<number>(7).fill(0);
  const subjects: Record<string, number> = {};
  const studyTypes: Record<string, number> = {};
  const months: Record<string, Set<string>> = {};
  let total = 0,
    count = 0,
    longest = 0;
  for (const session of sessions) {
    let sessionTotal = 0;
    let budget = session.targetMs ?? Infinity;
    for (const part of session.segments) {
      const effectiveEnd = Math.min(part.end ?? now, now, part.start + budget);
      budget -= Math.max(0, effectiveEnd - part.start);
      let cursor = Math.max(part.start, from);
      const end = Math.min(effectiveEnd, to);
      while (cursor < end) {
        const d = new Date(cursor);
        // Advance by elapsed time to the next wall-hour boundary. Repeated DST hours
        // get separate slices which accumulate in the same displayed hour bucket.
        const next = Math.min(
          end,
          cursor +
            (60 - d.getMinutes()) * 60000 -
            d.getSeconds() * 1000 -
            d.getMilliseconds(),
        );
        const amount = next - cursor;
        const key = dayKey(d);
        const bucket = days[key] ?? { total: 0, subjects: {} };
        bucket.total += amount;
        bucket.subjects[session.subjectId] =
          (bucket.subjects[session.subjectId] ?? 0) + amount;
        days[key] = bucket;
        hours[d.getHours()] += amount;
        weekdays[d.getDay()] += amount;
        const month = key.slice(0, 7);
        (months[month] ??= new Set()).add(key);
        subjects[session.subjectId] =
          (subjects[session.subjectId] ?? 0) + amount;
        studyTypes[session.studyTypeId] =
          (studyTypes[session.studyTypeId] ?? 0) + amount;
        sessionTotal += amount;
        cursor = next;
      }
    }
    if (sessionTotal > 0) {
      count++;
      total += sessionTotal;
      longest = Math.max(longest, sessionTotal);
    }
  }
  return {
    total,
    count,
    longest,
    average: count ? total / count : 0,
    days,
    hours,
    weekdays,
    subjects,
    studyTypes,
    activeDays: Object.keys(days).length,
    months,
  };
}
export type Analysis = ReturnType<typeof analyze>;
export function rankedSubjects(data: Analysis, subjects: Subject[]) {
  return Object.entries(data.subjects)
    .sort((a, b) => b[1] - a[1])
    .map(([id, ms]) => ({
      id,
      ms,
      percent: data.total ? (ms / data.total) * 100 : 0,
      subject: subjects.find((s) => s.id === id),
    }));
}
export function change(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}
export function observations(
  data: Analysis,
  previous: Analysis,
  subjects: Subject[],
) {
  if (!data.count) return [];
  const lines: string[] = [];
  const diff = change(data.total, previous.total);
  if (diff !== null)
    lines.push(
      Math.abs(diff) < 0.5
        ? "You recorded about the same study time as the previous period."
        : `You recorded ${Math.abs(Math.round(diff))}% ${diff > 0 ? "more" : "less"} study time than the previous period.`,
    );
  const top = rankedSubjects(data, subjects)[0];
  if (top)
    lines.push(
      `${top.subject?.name ?? "A removed subject"} accounted for ${Math.round(top.percent)}% of your study time.`,
    );
  if (data.activeDays >= 3) {
    const peak = data.hours.indexOf(Math.max(...data.hours));
    lines.push(
      `You recorded the most time between ${hourLabel(peak)} and ${hourLabel((peak + 1) % 24)}.`,
    );
  }
  return lines.slice(0, 3);
}
export function hourLabel(hour: number) {
  return `${hour % 12 || 12} ${hour >= 12 ? "PM" : "AM"}`;
}
