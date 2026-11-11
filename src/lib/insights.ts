import {
  addDays,
  analyze,
  dayKey,
  type Analysis,
  type Period,
} from "./analytics";
import type { Session } from "./types";
export function trendBuckets(
  data: Analysis,
  from: number,
  to: number,
  period: Period | "custom",
) {
  const bins = new Map<
    string,
    { key: string; from: string; to: string; ms: number; label: string }
  >();
  const monthly =
    period === "year" || period === "all" || to - from > 65 * 86400000;
  for (let at = from; at < to; at = addDays(at, 1)) {
    const d = new Date(at),
      key = monthly ? dayKey(at).slice(0, 7) : dayKey(at);
    const bin = bins.get(key) ?? {
      key,
      from: dayKey(at),
      to: dayKey(at),
      ms: 0,
      label: d.toLocaleDateString(
        [],
        monthly
          ? { month: "short", year: period === "all" ? "2-digit" : undefined }
          : {
              weekday: period === "week" ? "short" : undefined,
              day: period === "week" ? undefined : "numeric",
              month: period === "custom" ? "short" : undefined,
            },
      ),
    };
    bin.ms += data.days[dayKey(at)]?.total ?? 0;
    bin.to = dayKey(at);
    bins.set(key, bin);
  }
  return [...bins.values()];
}
export function studyMix(
  sessions: Session[],
  from: number,
  to: number,
  now = Date.now(),
) {
  const matrix: Record<string, Record<string, number>> = {},
    modes: Record<string, number> = {
      stopwatch: 0,
      pomodoro: 0,
      countdown: 0,
      manual: 0,
    };
  const durations: number[] = [];
  for (const session of sessions) {
    const ms = analyze([session], from, to, now).total;
    if (!ms) continue;
    (matrix[session.subjectId] ??= {})[session.studyTypeId] =
      ((matrix[session.subjectId] ?? {})[session.studyTypeId] ?? 0) + ms;
    modes[session.source === "manual" ? "manual" : session.timerMode] += ms;
    durations.push(ms);
  }
  durations.sort((a, b) => a - b);
  const n = durations.length;
  return {
    matrix,
    modes,
    median: n
      ? n % 2
        ? durations[(n - 1) / 2]
        : (durations[n / 2 - 1] + durations[n / 2]) / 2
      : 0,
  };
}
