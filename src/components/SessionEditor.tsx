import { useState } from "react";
import { Dialog, Confirm } from "./Dialog";
import { InlineError } from "./Feedback";
import { sessionInputErrors } from "../lib/validation";
import { elapsed } from "../lib/analytics";
import {
  timeZone,
  type Mutate,
  type Session,
  type Subject,
} from "../lib/types";
const localInput = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export function SessionEditor({
  session,
  subjects,
  studyTypes,
  mutate,
  busy,
  onClose,
}: {
  session?: Session;
  subjects: Subject[];
  studyTypes: Subject[];
  mutate: Mutate;
  busy: boolean;
  onClose: () => void;
}) {
  const [initialStart] = useState(() =>
    localInput(session?.startedAt ?? Date.now() - 3600000),
  );
  const initialDuration = session
    ? String(+(elapsed(session) / 60000).toFixed(3))
    : "60";
  const [subject, setSubject] = useState(
    session?.subjectId ?? subjects.find((s) => !s.archived)?.id ?? "",
  );
  const [studyType, setStudyType] = useState(
    session?.studyTypeId ??
      studyTypes.find((t) => t.id === "studying" && !t.archived)?.id ??
      studyTypes.find((t) => !t.archived)?.id ??
      "",
  );
  const [start, setStart] = useState(initialStart);
  const [minutes, setMinutes] = useState(initialDuration);
  const [note, setNote] = useState(session?.note ?? "");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<{ start?: string; minutes?: string }>(
    {},
  );
  const [discard, setDiscard] = useState(false);
  const [original] = useState({ subject, studyType, start, minutes, note });
  const dirty =
    JSON.stringify(original) !==
    JSON.stringify({ subject, studyType, start, minutes, note });
  function requestClose() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const duration = Math.round(Number(minutes) * 60000);
    const startedAt = +new Date(start);
    const next = sessionInputErrors(start, minutes, Date.now());
    setErrors(next);
    if (!subject || !studyType || Object.keys(next).length) {
      requestAnimationFrame(() =>
        document
          .getElementById(next.start ? "session-start" : "session-duration")
          ?.focus(),
      );
      if (!subject || !studyType) setError("Choose a subject and study type.");
      return;
    }
    setError("");
    let result;
    if (
      session &&
      subject === session.subjectId &&
      studyType === session.studyTypeId &&
      start === initialStart &&
      minutes === initialDuration
    )
      result = await mutate({
        kind: "note",
        id: session.id,
        note,
        expectedUpdatedAt: session.updatedAt,
      });
    else
      result = await mutate({
        kind: "session",
        id: session?.id ?? null,
        subjectId: subject,
        studyTypeId: studyType,
        startedAt,
        duration,
        note,
        timeZone: timeZone(),
        expectedUpdatedAt: session?.updatedAt ?? null,
      });
    if (result) onClose();
    else
      setError(
        "This change wasn’t confirmed. Your input is kept; refresh the saved data, then try Save again.",
      );
  }
  return (
    <>
      <Dialog
        title={session ? "Edit session" : "Add study time"}
        onClose={requestClose}
      >
        <form onSubmit={save} className="form" noValidate>
          <label>
            Subject
            <select
              value={subject}
              required
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="" disabled>
                Choose a subject
              </option>
              {subjects
                .filter((s) => !s.archived || s.id === session?.subjectId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.archived ? " (archived)" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Study type
            <select
              value={studyType}
              required
              onChange={(e) => setStudyType(e.target.value)}
            >
              {studyTypes
                .filter((t) => !t.archived || t.id === session?.studyTypeId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-columns">
            <label>
              Start time
              <input
                type="datetime-local"
                id="session-start"
                value={start}
                required
                aria-invalid={!!errors.start}
                aria-describedby={errors.start ? "edit-start-error" : undefined}
                onChange={(e) => {
                  setStart(e.target.value);
                  setErrors({});
                }}
              />
              {errors.start && (
                <InlineError id="edit-start-error">{errors.start}</InlineError>
              )}
            </label>
            <label>
              Study minutes
              <input
                type="number"
                id="session-duration"
                min="0.001"
                step="0.001"
                value={minutes}
                required
                aria-invalid={!!errors.minutes}
                aria-describedby={
                  errors.minutes ? "edit-duration-error" : undefined
                }
                onChange={(e) => {
                  setMinutes(e.target.value);
                  setErrors({});
                }}
              />
              {errors.minutes && (
                <InlineError id="edit-duration-error">
                  {errors.minutes}
                </InlineError>
              )}
            </label>
          </div>
          <p className="hint">
            {timeZone()}.{" "}
            {session
              ? "Changing the time replaces pause intervals with one continuous manual entry."
              : "The session must end in the past and must not overlap another session."}
          </p>
          <label>
            Note
            <textarea
              maxLength={2000}
              rows={3}
              value={note}
              placeholder="e.g. Recursion practice"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && <InlineError>{error}</InlineError>}
          <footer>
            <button
              type="button"
              className="secondary"
              onClick={requestClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="primary" disabled={busy || !subject}>
              {busy ? "Saving…" : "Save session"}
            </button>
          </footer>
        </form>
      </Dialog>
      {discard && (
        <Confirm
          title="Discard your changes?"
          label="Discard changes"
          busy={busy}
          onClose={() => setDiscard(false)}
          onConfirm={onClose}
        >
          Your saved records stay as they are. Go back to keep editing, or
          discard this draft.
        </Confirm>
      )}
    </>
  );
}
