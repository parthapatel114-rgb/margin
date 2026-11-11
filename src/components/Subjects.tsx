import { useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Dialog, Confirm } from "./Dialog";
import type { Mutate, Subject } from "../lib/types";
import { COLORS } from "../lib/palette";
import { InlineError } from "./Feedback";
export function Subjects({
  subjects,
  usedIds,
  mutate,
  busy,
  onClose,
  mode = "subject",
}: {
  mode?: "subject" | "study_type";
  subjects: Subject[];
  usedIds: Set<string>;
  mutate: Mutate;
  busy: boolean;
  onClose: () => void;
}) {
  const studyType = mode === "study_type";
  const noun = studyType ? "study type" : "subject";
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [removing, setRemoving] = useState<Subject | null>(null);
  const [error, setError] = useState("");
  const [discard, setDiscard] = useState(false);
  function requestClose() {
    if (
      name.trim() &&
      (!editing || name !== editing.name || color !== editing.color)
    )
      setDiscard(true);
    else onClose();
  }
  return (
    <>
      <Dialog
        title={studyType ? "Study types" : "Subjects"}
        onClose={requestClose}
      >
        <div className="subject-list">
          {subjects.map((s) => (
            <div className="subject-row" key={s.id}>
              <button
                className="subject-name"
                onClick={() => {
                  setEditing(s);
                  setName(s.name);
                  setColor(s.color);
                }}
              >
                <i className="dot" style={{ background: s.color }} />
                {s.name}
                {s.archived && <span className="muted">Archived</span>}
              </button>
              {!usedIds.has(s.id) && (
                <button
                  className="icon"
                  aria-label={`Delete unused ${noun} ${s.name}`}
                  onClick={() => setDeleting(s)}
                >
                  <Trash2 size={14} />
                </button>
              )}
              {s.archived ? (
                <button
                  className="icon"
                  aria-label={`Restore ${s.name}`}
                  disabled={busy}
                  onClick={() =>
                    void mutate({
                      kind: mode,
                      id: null,
                      name: s.name,
                      color: s.color,
                    })
                  }
                >
                  <RotateCcw size={16} />
                </button>
              ) : (
                <button
                  className="icon"
                  aria-label={`Archive ${s.name}`}
                  onClick={() => setRemoving(s)}
                >
                  <Archive size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <form
          className="form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) {
              setError(`Enter a ${noun} name.`);
              return;
            }
            setError("");
            if (
              await mutate({ kind: mode, id: editing?.id ?? null, name, color })
            ) {
              setName("");
              setEditing(null);
            }
          }}
        >
          <label>
            {editing ? `Rename ${noun}` : `New ${noun}`}
            <input
              maxLength={80}
              value={name}
              required
              placeholder={
                studyType ? "e.g. Solving problems" : "e.g. Data Structures"
              }
              aria-invalid={!!error}
              aria-describedby={error ? "choice-name-error" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
            />
            {error && <InlineError id="choice-name-error">{error}</InlineError>}
          </label>
          <div className="swatches" role="group" aria-label="Subject color">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <footer>
            {editing && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditing(null);
                  setName("");
                }}
              >
                Cancel edit
              </button>
            )}
            <button className="primary" disabled={busy}>
              {editing ? "Save changes" : `Add ${noun}`}
            </button>
          </footer>
        </form>
      </Dialog>
      {discard && (
        <Confirm
          title="Discard this draft?"
          label="Discard changes"
          busy={busy}
          onClose={() => setDiscard(false)}
          onConfirm={onClose}
        >
          Your saved subjects and study types stay unchanged. Go back to keep
          editing, or discard this draft.
        </Confirm>
      )}
      {deleting && (
        <Confirm
          title={`Delete ${deleting.name}?`}
          busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (
              await mutate({
                kind: studyType ? "delete_study_type" : "delete_subject",
                id: deleting.id,
              })
            ) {
              if (editing?.id === deleting.id) {
                setEditing(null);
                setName("");
              }
              setDeleting(null);
            }
          }}
        >
          This permanently removes the unused {noun}. There are no recorded
          sessions attached to it.
        </Confirm>
      )}
      {removing && (
        <Confirm
          title={`Archive ${removing.name}?`}
          label={`Archive ${noun}`}
          busy={busy}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            if (
              await mutate({
                kind: studyType ? "archive_study_type" : "archive_subject",
                id: removing.id,
              })
            )
              setRemoving(null);
          }}
        >
          It will leave the picker. Past sessions and statistics will stay. You
          can restore it here at any time.
        </Confirm>
      )}
    </>
  );
}
