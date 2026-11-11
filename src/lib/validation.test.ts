import { describe, expect, it } from "vitest";
import { sessionInputErrors } from "./validation";
describe("session input recovery", () => {
  const now = +new Date("2026-11-11T12:00:00Z");
  it("accepts a completed historical session", () =>
    expect(sessionInputErrors("2026-11-11T10:00:00Z", "60", now)).toEqual({}));
  it("identifies malformed dates without treating them as duration errors", () =>
    expect(sessionInputErrors("not a date", "60", now)).toEqual({
      start: "Choose a valid start date and time.",
    }));
  it("rejects a future start at the start field", () =>
    expect(
      sessionInputErrors("2026-11-12T10:00:00Z", "60", now).start,
    ).toBeTruthy());
  it.each(["", "-1", "NaN", "Infinity", "0"])(
    "keeps invalid duration %s at its field",
    (value) =>
      expect(
        sessionInputErrors("2026-11-11T10:00:00Z", value, now).minutes,
      ).toBeTruthy(),
  );
  it("identifies a session whose end is in the future", () =>
    expect(
      sessionInputErrors("2026-11-11T11:30:00Z", "60", now).minutes,
    ).toContain("ends in the future"));
});
