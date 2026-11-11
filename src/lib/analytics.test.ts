import { describe, it, expect } from "vitest";
import {
  analyze,
  HOUR,
  change,
  range,
  elapsed,
  dayKey,
  observations,
} from "./analytics";
import type { Session } from "./types";
const session = (
  start: string,
  end: string,
  segments?: Session["segments"],
): Session => ({
  id: "s",
  subjectId: "math",
  studyTypeId: "reviewing",
  startedAt: +new Date(start),
  endedAt: +new Date(end),
  source: "timer",
  timerMode: "stopwatch",
  targetMs: null,
  timeZone: "America/New_York",
  note: "",
  updatedAt: +new Date(end),
  segments: segments ?? [{ start: +new Date(start), end: +new Date(end) }],
});
describe("shared analytics", () => {
  it("splits the actual time across hours", () => {
    const s = session("2026-11-10T21:45:00", "2026-11-10T22:30:00");
    const a = analyze([s], 0, Infinity, Infinity);
    expect(a.hours[21]).toBe(HOUR / 4);
    expect(a.hours[22]).toBe(HOUR / 2);
    expect(a.total).toBe(HOUR * 0.75);
    expect(a.studyTypes.reviewing).toBe(HOUR * 0.75);
  });
  it("excludes pauses across midnight", () => {
    const s = session("2026-11-10T23:30:00", "2026-11-11T01:00:00", [
      {
        start: +new Date("2026-11-10T23:30:00"),
        end: +new Date("2026-11-10T23:45:00"),
      },
      {
        start: +new Date("2026-11-11T00:30:00"),
        end: +new Date("2026-11-11T01:00:00"),
      },
    ]);
    const a = analyze([s], 0, Infinity, Infinity);
    expect(a.days["2026-11-10"].total).toBe(HOUR / 4);
    expect(a.days["2026-11-11"].total).toBe(HOUR / 2);
    expect(elapsed(s)).toBe(HOUR * 0.75);
  });
  it("clips periods and computes subject shares", () => {
    const s = session("2026-11-10T09:00:00", "2026-11-10T11:00:00");
    const t = { ...s, id: "s2", subjectId: "physics" };
    const a = analyze(
      [s, t],
      +new Date("2026-11-10T10:00:00"),
      +new Date("2026-11-10T11:00:00"),
      Infinity,
    );
    expect(a.total).toBe(HOUR * 2);
    expect(a.subjects.math / a.total).toBe(0.5);
    expect(a.count).toBe(2);
    expect(a.activeDays).toBe(1);
  });
  it("has truthful empty statistics and comparisons", () => {
    const a = analyze([], 0, Infinity);
    expect(a.total).toBe(0);
    expect(a.average).toBe(0);
    expect(change(1, 0)).toBeNull();
    expect(change(120, 100)).toBe(20);
    expect(observations(a, a, [])).toEqual([]);
  });
  it("uses calendar month and Monday week boundaries", () => {
    const at = +new Date("2026-11-10T16:00:00");
    expect(dayKey(range("week", at)[0])).toBe("2026-11-09");
    expect(dayKey(range("month", at)[1])).toBe("2026-12-01");
  });
  it("counts repeated fall-back hours and skipped spring hours in New York", () => {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone !== "America/New_York")
      return;
    const fall = session(
      "2026-11-01T00:30:00-04:00",
      "2026-11-01T02:30:00-05:00",
    );
    const a = analyze([fall], 0, Infinity, Infinity);
    expect(a.total).toBe(HOUR * 3);
    expect(a.hours[1]).toBe(HOUR * 2);
    const spring = session(
      "2026-03-08T01:30:00-05:00",
      "2026-03-08T03:30:00-04:00",
    );
    const b = analyze([spring], 0, Infinity, Infinity);
    expect(b.total).toBe(HOUR);
    expect(b.hours[2]).toBe(0);
  });
  it("recaps count active days per month and never future time", () => {
    const s = session("2026-11-10T09:00:00", "2026-11-10T11:00:00");
    const a = analyze([s], 0, Infinity, +new Date("2026-11-10T10:00:00"));
    expect(a.total).toBe(HOUR);
    expect(a.months["2026-11"].size).toBe(1);
  });
});
describe("study types and zone edges", () => {
  it("separates reviewing and practice even for the same subject", () => {
    const a = session("2026-11-09T10:00:00", "2026-11-09T11:00:00");
    const b = {
      ...session("2026-11-10T10:00:00", "2026-11-10T10:30:00"),
      id: "s2",
      studyTypeId: "practice",
    };
    const data = analyze([a, b], 0, Infinity, Infinity);
    expect(data.subjects.math).toBe(HOUR * 1.5);
    expect(data.studyTypes.reviewing).toBe(HOUR);
    expect(data.studyTypes.practice).toBe(HOUR / 2);
  });
  it("restored running intervals include elapsed wall time, paused intervals do not", () => {
    const s = {
      ...session("2026-11-10T10:00:00", "2026-11-10T11:00:00"),
      endedAt: null,
      segments: [{ start: +new Date("2026-11-10T10:00:00"), end: null }],
    };
    expect(elapsed(s, +new Date("2026-11-10T12:00:00"))).toBe(HOUR * 2);
    const paused = {
      ...s,
      segments: [{ start: s.startedAt, end: s.startedAt + HOUR / 2 }],
    };
    expect(elapsed(paused, +new Date("2026-11-10T12:00:00"))).toBe(HOUR / 2);
  });
  it("handles Lord Howe’s half-hour fall-back", () => {
    if (
      Intl.DateTimeFormat().resolvedOptions().timeZone !== "Australia/Lord_Howe"
    )
      return;
    const s = session("2026-04-05T01:00:00+11:00", "2026-04-05T02:30:00+10:30");
    const a = analyze([s], 0, Infinity, Infinity);
    expect(a.total).toBe(HOUR * 2);
    expect(a.hours[1]).toBe(HOUR * 1.5);
    expect(a.hours[2]).toBe(HOUR / 2);
  });
});

it("caps live timed analytics at the target even before native completion arrives", () => {
  const s = {
    ...session("2026-11-10T23:59:00", "2026-11-11T00:10:00"),
    endedAt: null,
    timerMode: "countdown" as const,
    targetMs: 120_000,
    segments: [
      {
        start: +new Date("2026-11-10T23:59:00"),
        end: +new Date("2026-11-10T23:59:30"),
      },
      { start: +new Date("2026-11-11T00:01:00"), end: null },
    ],
  };
  const now = +new Date("2026-11-11T00:10:00");
  expect(elapsed(s, now)).toBe(120_000);
  const data = analyze([s], +new Date("2026-11-11T00:00:00"), now, now);
  expect(data.total).toBe(90_000);
  expect(data.days["2026-11-11"].total).toBe(90_000);
});
