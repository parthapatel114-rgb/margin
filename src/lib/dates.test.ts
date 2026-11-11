import { expect, it } from "vitest";
import { addDays, analyze, dayKey, dayStart } from "./analytics";
import {
  dateAt,
  datePresets,
  monthCells,
  orderedRange,
  rangeBounds,
} from "./dates";
import { studyMix, trendBuckets } from "./insights";
import type { Session } from "./types";
it("calendar months preserve Monday order and leap days", () => {
  const cells = monthCells(+new Date(2024, 1, 1));
  expect(cells.filter((x) => x !== null)).toHaveLength(29);
  expect(cells.length % 7).toBe(0);
  expect(new Date(cells[3]!).getDate()).toBe(1);
});
it("date presets include complete local dates across DST changes", () => {
  const now = +new Date(2026, 10, 2, 15);
  const p = datePresets(now).find((x) => x.name === "Last 7 days")!;
  expect(p.from).toBe("2026-10-27");
  expect(p.to).toBe("2026-11-02");
  const [from, to] = rangeBounds(p, now);
  let n = 0;
  for (let at = from; at < to; at = addDays(at, 1)) n++;
  expect(n).toBe(7);
  expect(to).toBe(dayStart(addDays(now, 1)));
});
it("reverse calendar selections normalize and a single day includes its evening", () => {
  expect(orderedRange("2026-11-10", "2026-11-03")).toEqual({
    from: "2026-11-03",
    to: "2026-11-10",
  });
  const [a, b] = rangeBounds(
    { from: "2026-11-10", to: "2026-11-10" },
    dateAt("2026-11-10"),
  );
  expect(dayKey(a)).toBe("2026-11-10");
  expect(dayKey(b)).toBe("2026-11-11");
});
const record = (
  id: string,
  type: string,
  mode: Session["timerMode"],
  start: number,
  end: number,
): Session => ({
  id,
  subjectId: "math",
  studyTypeId: type,
  timerMode: mode,
  targetMs: mode === "stopwatch" ? null : end - start,
  startedAt: start,
  endedAt: end,
  note: "",
  source: "timer",
  timeZone: "UTC",
  updatedAt: end,
  segments: [{ start, end }],
});
it("study mix clips intervals and preserves subject, study type and timer mode totals", () => {
  const t = +new Date(2026, 10, 10, 10);
  const sessions = [
    record("1", "reviewing", "stopwatch", t, t + 3600000),
    record("2", "practice", "pomodoro", t + 7200000, t + 9000000),
  ];
  const mix = studyMix(sessions, t + 1800000, t + 10000000, Infinity);
  expect(mix.matrix.math.reviewing).toBe(1800000);
  expect(mix.matrix.math.practice).toBe(1800000);
  expect(mix.modes.pomodoro).toBe(1800000);
  expect(mix.median).toBe(1800000);
});
it("monthly chart buckets keep exact drilldown date bounds", () => {
  const from = +new Date(2026, 0, 1),
    to = +new Date(2027, 0, 1);
  const data = analyze([], from, to, Infinity);
  const bins = trendBuckets(data, from, to, "year");
  expect(bins).toHaveLength(12);
  expect(bins[1].from).toBe("2026-02-01");
  expect(bins[1].to).toBe("2026-02-28");
  expect(bins.every((b) => b.ms === 0)).toBe(true);
});
it("manual entries stay separate from actual timer modes", () => {
  const s = {
    ...record("manual", "reading", "stopwatch", 1000, 61000),
    source: "manual" as const,
  };
  const mix = studyMix([s], 0, 100000, Infinity);
  expect(mix.modes.manual).toBe(60000);
  expect(mix.modes.stopwatch).toBe(0);
});
