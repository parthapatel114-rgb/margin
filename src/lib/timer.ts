import { clock, elapsed } from "./analytics";
import type { BreakState, Session, TimerMode, Settings } from "./types";
export const MODE_NAMES: Record<TimerMode, string> = {
  stopwatch: "Stopwatch",
  pomodoro: "Pomodoro",
  countdown: "Countdown",
};
export function breakRemaining(b: BreakState, now: number) {
  return Math.max(
    0,
    b.remainingMs -
      (b.runningSince === null ? 0 : Math.max(0, now - b.runningSince)),
  );
}
export function targetFor(mode: TimerMode, settings: Settings) {
  return mode === "stopwatch"
    ? null
    : (mode === "pomodoro"
        ? settings.focusMinutes
        : settings.countdownMinutes) * 60_000;
}
export function timerRemaining(session: Session, now: number) {
  return Math.max(0, (session.targetMs ?? 0) - elapsed(session, now));
}
export function displayClock(ms: number, mode: TimerMode | "break") {
  if (mode === "stopwatch" || ms >= 3_600_000) return clock(ms);
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
