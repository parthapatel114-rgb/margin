export function sessionInputErrors(
  start: string,
  minutes: string,
  now: number,
) {
  const startedAt = +new Date(start),
    duration = Math.round(Number(minutes) * 60_000);
  const errors: { start?: string; minutes?: string } = {};
  if (!start || !Number.isFinite(startedAt) || startedAt < 0)
    errors.start = "Choose a valid start date and time.";
  else if (startedAt > now) errors.start = "Start time must be in the past.";
  if (!minutes.trim() || !Number.isFinite(duration) || duration < 1)
    errors.minutes = "Enter a study duration greater than zero.";
  else if (!Number.isSafeInteger(duration))
    errors.minutes = "Enter a shorter duration.";
  else if (!errors.start && startedAt + duration > now)
    errors.minutes =
      "This session ends in the future. Shorten its duration or choose an earlier start.";
  return errors;
}
