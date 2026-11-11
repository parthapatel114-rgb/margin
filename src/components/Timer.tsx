import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  SlidersHorizontal,
  X,
  Pin,
  PinOff,
} from "lucide-react";
import { clock, elapsed } from "../lib/analytics";
import {
  timeZone,
  type Mutate,
  type Session,
  type Snapshot,
} from "../lib/types";
import { Confirm } from "./Dialog";
import { COLORS } from "../lib/palette";
export function Timer({
  data,
  active,
  now,
  mutate,
  busy,
  mini,
  focus,
  onFocus,
  onMini,
  onSubjects,
  onTypes,
  onFinish,
  onMain,
  onCloseMini,
}: {
  data: Snapshot;
  active?: Session;
  now: number;
  mutate: Mutate;
  busy: boolean;
  mini: boolean;
  focus: boolean;
  onFocus: () => void;
  onMini: () => void;
  onSubjects: () => void;
  onTypes: () => void;
  onFinish: (id: string) => void;
  onMain: () => void;
  onCloseMini: () => void;
}) {
  const chosen =
    data.subjects.find(
      (s) =>
        s.id === (active?.subjectId ?? data.settings.lastSubject) &&
        !s.archived,
    ) ?? data.subjects.find((s) => !s.archived);
  const chosenType =
    data.studyTypes.find(
      (t) => t.id === data.settings.lastStudyType && !t.archived,
    ) ?? data.studyTypes.find((t) => !t.archived);
  const [typedType, setTypedType] = useState<string | null>(null);
  const typeText = typedType ?? chosenType?.name ?? "";
  const [typed, setTyped] = useState<string | null>(null);
  const [cancel, setCancel] = useState(false);
  const [starting, setStarting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const running = !!active?.segments.some((p) => p.end === null);
  const subject = data.subjects.find((s) => s.id === active?.subjectId);
  const text = typed ?? chosen?.name ?? "";
  async function start() {
    if (starting || busy || !text.trim()) return;
    setStarting(true);
    try {
      let target = data.subjects.find(
        (s) =>
          s.name.toLocaleLowerCase() === text.trim().toLocaleLowerCase() &&
          !s.archived,
      );
      if (!target) {
        const next = await mutate({
          kind: "subject",
          id: null,
          name: text.trim(),
          color: COLORS[data.subjects.length % COLORS.length],
        });
        if (!next) return;
        target = next.subjects.find((s) => s.id === next.settings.lastSubject);
      }
      let activity = data.studyTypes.find(
        (t) =>
          t.name.toLocaleLowerCase() === typeText.trim().toLocaleLowerCase() &&
          !t.archived,
      );
      if (!activity) {
        const next = await mutate({
          kind: "study_type",
          id: null,
          name: typeText.trim(),
          color: COLORS[data.studyTypes.length % COLORS.length],
        });
        if (!next) return;
        activity = next.studyTypes.find(
          (t) => t.id === next.settings.lastStudyType,
        );
      }
      if (
        target &&
        activity &&
        (await mutate({
          kind: "start",
          subjectId: target.id,
          studyTypeId: activity.id,
          timeZone: timeZone(),
        }))
      ) {
        setTyped(null);
        setTypedType(null);
      }
    } finally {
      setStarting(false);
    }
  }
  return (
    <section
      className={`timer ${mini ? "mini-timer" : ""} ${focus ? "focus-timer" : ""}`}
      aria-label="Study timer"
    >
      {mini && (
        <div className="mini-top" data-tauri-drag-region>
          <span className="mini-brand" data-tauri-drag-region>
            Margin
          </span>
          <div>
            <button
              className="icon"
              aria-label={
                data.settings.alwaysOnTop
                  ? "Unpin mini timer"
                  : "Keep mini timer on top"
              }
              onClick={() =>
                void mutate({
                  kind: "setting",
                  key: "alwaysOnTop",
                  value: String(!data.settings.alwaysOnTop),
                })
              }
            >
              {data.settings.alwaysOnTop ? (
                <Pin size={13} />
              ) : (
                <PinOff size={13} />
              )}
            </button>
            <button
              className="icon"
              aria-label="Return to main window"
              onClick={onMain}
            >
              <ArrowUpRight size={14} />
            </button>
            <button
              className="icon"
              aria-label="Close mini timer"
              onClick={onCloseMini}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {!mini && (
        <div className="timer-tools">
          <span className="eyebrow">
            {active
              ? running
                ? "SESSION IN PROGRESS"
                : "SESSION PAUSED"
              : "MAKE TIME TO LEARN"}
          </span>
          <div>
            {!focus && (
              <button
                className="icon"
                title="Mini timer · ⌘/Ctrl M"
                aria-label="Open mini timer"
                onClick={onMini}
              >
                <PictureInPicture2 size={17} />
              </button>
            )}
            <button
              className="icon"
              title={focus ? "Exit focus · Esc" : "Fullscreen focus"}
              aria-label={focus ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={onFocus}
            >
              {focus ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          </div>
        </div>
      )}
      {active || mini || focus ? (
        <div className="current-subject">
          <i
            className="dot"
            style={{
              background: subject?.color ?? chosen?.color ?? "var(--accent)",
            }}
          />
          {subject?.name ??
            chosen?.name ??
            "Choose a subject in the main window"}
        </div>
      ) : (
        <form
          className="subject-picker"
          onSubmit={(e) => {
            e.preventDefault();
            void start();
          }}
        >
          <i
            className="dot"
            style={{ background: chosen?.color ?? "var(--accent)" }}
          />
          <input
            ref={input}
            id="subject-field"
            aria-label="Study subject"
            list="subject-options"
            maxLength={80}
            placeholder="What are you studying?"
            value={text}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
            onBlur={() => {
              const match = data.subjects.find(
                (s) => !s.archived && s.name === text,
              );
              if (match && match.id !== data.settings.lastSubject)
                void mutate({
                  kind: "setting",
                  key: "lastSubject",
                  value: match.id,
                });
            }}
          />
          <datalist id="subject-options">
            {data.subjects
              .filter((s) => !s.archived)
              .map((s) => (
                <option value={s.name} key={s.id} />
              ))}
          </datalist>
          <button
            type="button"
            className="icon"
            aria-label="Manage subjects"
            title="Manage subjects"
            onClick={onSubjects}
          >
            <SlidersHorizontal size={15} />
          </button>
        </form>
      )}
      {!mini &&
        !focus &&
        (active ? (
          <div className="activity-label">
            {data.studyTypes.find((t) => t.id === active.studyTypeId)?.name}
          </div>
        ) : (
          <div className="activity-picker">
            <span>Study type</span>
            <input
              aria-label="Study type"
              list="study-type-options"
              maxLength={80}
              value={typeText}
              onChange={(e) => setTypedType(e.target.value)}
              placeholder="e.g. Reviewing"
            />
            <datalist id="study-type-options">
              {data.studyTypes
                .filter((t) => !t.archived)
                .map((t) => (
                  <option key={t.id} value={t.name} />
                ))}
            </datalist>
            <button
              className="icon"
              aria-label="Manage study types"
              onClick={onTypes}
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>
        ))}
      <div className="clock" role="timer" aria-label="Elapsed study time">
        {clock(active ? elapsed(active, now) : 0)}
      </div>
      <div className="timer-actions">
        {active ? (
          <>
            <button
              className="secondary"
              aria-label={running ? "Pause session" : "Resume session"}
              title={running ? "Pause" : "Resume"}
              disabled={busy}
              onClick={() =>
                void mutate({
                  kind: running ? "pause" : "resume",
                  id: active.id,
                })
              }
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
              <span>{running ? "Pause" : "Resume"}</span>
            </button>
            <button
              className="primary"
              aria-label="Finish session"
              title="Finish"
              disabled={busy}
              onClick={() => onFinish(active.id)}
            >
              <Check size={17} />
              <span>Finish</span>
            </button>
            {!mini && (
              <button
                className="icon cancel"
                title="Discard session"
                aria-label="Discard session"
                onClick={() => setCancel(true)}
              >
                <X size={16} />
              </button>
            )}
          </>
        ) : mini ? (
          <button className="secondary" onClick={onMain}>
            Open Margin <ArrowUpRight size={14} />
          </button>
        ) : (
          <button
            className="primary start"
            disabled={busy || starting || !text.trim() || !typeText.trim()}
            onClick={() => void start()}
          >
            <Play size={16} />
            {text.trim() &&
            !data.subjects.some(
              (s) =>
                !s.archived &&
                s.name.toLocaleLowerCase() === text.trim().toLocaleLowerCase(),
            )
              ? "Create subject & start"
              : "Start studying"}
          </button>
        )}
      </div>
      {!mini && !focus && (
        <p className="timer-caption">
          {active
            ? running
              ? "A little time, well recorded."
              : "Take your time. Pauses aren’t counted."
            : data.sessions.length
              ? "Pick up where you left off."
              : "Choose a subject, press start. Your history begins here."}
        </p>
      )}
      {cancel && active && (
        <Confirm
          title="Discard this session?"
          label="Discard session"
          busy={busy}
          onClose={() => setCancel(false)}
          onConfirm={async () => {
            if (await mutate({ kind: "cancel", id: active.id }))
              setCancel(false);
          }}
        >
          This removes the current {clock(elapsed(active, now))} session without
          saving it to History.
        </Confirm>
      )}
    </section>
  );
}
