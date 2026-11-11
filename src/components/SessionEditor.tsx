import { useState } from "react";
import { Dialog } from "./Dialog";
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
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const duration = Math.round(Number(minutes) * 60000);
    const startedAt = +new Date(start);
    if (
      !subject ||
      !Number.isFinite(startedAt) ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      setError("Choose a subject, date and positive duration.");
      return;
    }
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
  }
  return (
    <Dialog
      title={session ? "Edit session" : "Add study time"}
      onClose={onClose}
    >
      <form onSubmit={save} className="form">
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
              value={start}
              required
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Study minutes
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={minutes}
              required
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
        </div>
        <p className="hint">
          Times use {timeZone()}.{" "}
          {session
            ? "Changing the time replaces pause intervals with one continuous manual entry."
            : "The session must end in the past and must not overlap another session."}
        </p>
        <label>
          Note <span className="muted">(optional)</span>
          <textarea
            maxLength={2000}
            rows={3}
            value={note}
            placeholder="What did you work on?"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy || !subject}>
            Save session
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
