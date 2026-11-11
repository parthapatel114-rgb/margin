import { expect, it } from "vitest";
import {
  breakRemaining,
  displayClock,
  targetFor,
  timerRemaining,
} from "./timer";
import type { Session, Settings } from "./types";
const session: Session = {
  id: "a",
  subjectId: "math",
  studyTypeId: "reviewing",
  startedAt: 1000,
  endedAt: null,
  note: "",
  source: "timer",
  timeZone: "UTC",
  updatedAt: 1000,
  timerMode: "countdown",
  targetMs: 60_000,
  segments: [
    { start: 1000, end: 11_000 },
    { start: 21_000, end: null },
  ],
};
it("countdowns display the remaining active time and clamp at zero", () => {
  expect(timerRemaining(session, 31_000)).toBe(40_000);
  expect(timerRemaining(session, 99_000)).toBe(0);
});
it("timers display each mode without changing stored durations", () => {
  expect(displayClock(1500_000, "pomodoro")).toBe("25:00");
  expect(displayClock(59_500, "countdown")).toBe("01:00");
  expect(displayClock(3_600_000, "countdown")).toBe("01:00:00");
  expect(displayClock(0, "stopwatch")).toBe("00:00:00");
});
it("breaks exclude pauses and clamp at their deadline", () => {
  const b = {
    sessionId: "a",
    subjectId: "math",
    studyTypeId: "reviewing",
    remainingMs: 300_000,
    runningSince: 1000,
    totalMs: 300_000,
    long: false,
  };
  expect(breakRemaining(b, 61_000)).toBe(240_000);
  expect(breakRemaining({ ...b, runningSince: null }, 999_000)).toBe(300_000);
  expect(breakRemaining(b, 999_000)).toBe(0);
});
it("each mode uses its saved duration", () => {
  const s = { focusMinutes: 25, countdownMinutes: 45 } as Settings;
  expect(targetFor("stopwatch", s)).toBeNull();
  expect(targetFor("pomodoro", s)).toBe(1500_000);
  expect(targetFor("countdown", s)).toBe(2700_000);
});
