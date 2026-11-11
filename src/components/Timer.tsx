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
  SkipForward,
} from "lucide-react";
import { elapsed } from "../lib/analytics";
import {
  breakRemaining,
  displayClock,
  MODE_NAMES,
  targetFor,
  timerRemaining,
} from "../lib/timer";
import {
  timeZone,
  type Mutate,
  type Session,
  type Snapshot,
  type TimerMode,
} from "../lib/types";
import { Confirm } from "./Dialog";
import { COLORS } from "../lib/palette";
import { DurationField } from "./DurationField";
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
  const breakState = data.timerState.break;
  const mode: TimerMode =
    active?.timerMode ?? (breakState ? "pomodoro" : data.settings.timerMode);
  const chosen =
    data.subjects.find(
      (s) =>
        s.id ===
          (active?.subjectId ??
            breakState?.subjectId ??
            data.settings.lastSubject) && !s.archived,
    ) ?? data.subjects.find((s) => !s.archived);
  const chosenType =
    data.studyTypes.find(
      (t) =>
        t.id ===
          (active?.studyTypeId ??
            breakState?.studyTypeId ??
            data.settings.lastStudyType) && !t.archived,
    ) ?? data.studyTypes.find((t) => !t.archived);
  const [typed, setTyped] = useState<string | null>(null);
  const [typedType, setTypedType] = useState<string | null>(null);
  const [durationOverride, setDurationOverride] = useState<number | null>(null);
  const idleTarget =
    mode === "stopwatch"
      ? null
      : (durationOverride ??
          (mode === "pomodoro"
            ? data.settings.focusMinutes
            : data.settings.countdownMinutes)) * 60_000;
  const [starting, setStarting] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const subjectInput = useRef<HTMLInputElement>(null),
    typeInput = useRef<HTMLInputElement>(null);
  const subjectName = active
    ? data.subjects.find((s) => s.id === active.subjectId)?.name
    : chosen?.name;
  const typeName = active
    ? data.studyTypes.find((t) => t.id === active.studyTypeId)?.name
    : chosenType?.name;
  const text = typed ?? chosen?.name ?? "",
    typeText = typedType ?? chosenType?.name ?? "";
  const running = breakState
    ? breakState.runningSince !== null
    : !!active?.segments.some((p) => p.end === null);
  const ms = breakState
    ? breakRemaining(breakState, now)
    : active
      ? mode === "stopwatch"
        ? elapsed(active, now)
        : timerRemaining(active, now)
      : (idleTarget ?? 0);
  const status = breakState
    ? `${breakState.long ? "Long break" : "Break"}${running ? "" : " · Paused"}`
    : active
      ? running
        ? "In progress"
        : "Paused"
      : "Ready";
  const target =
    breakState?.totalMs ?? active?.targetMs ?? targetFor(mode, data.settings);
  const progress =
    target === null
      ? null
      : breakState
        ? 1 - ms / target
        : active
          ? 1 - ms / target
          : 0;
  async function start() {
    if (starting) return;
    if (
      mode !== "stopwatch" &&
      (!Number.isInteger((idleTarget ?? 0) / 60_000) ||
        idleTarget! < 60_000 ||
        idleTarget! > 14_400_000)
    ) {
      setFieldError("Enter a duration from 1 to 240 minutes.");
      return;
    }
    if (!text.trim()) {
      setFieldError("Enter a subject.");
      subjectInput.current?.focus();
      return;
    }
    if (!typeText.trim()) {
      setFieldError("Enter a study type.");
      typeInput.current?.focus();
      return;
    }
    setStarting(true);
    setFieldError("");
    try {
      let subject = data.subjects.find(
        (s) =>
          s.name.toLocaleLowerCase() === text.trim().toLocaleLowerCase() &&
          !s.archived,
      );
      if (!subject) {
        const next = await mutate({
          kind: "subject",
          id: null,
          name: text.trim(),
          color: COLORS[data.subjects.length % COLORS.length],
        });
        if (!next) return;
        subject = next.subjects.find((s) => s.id === next.settings.lastSubject);
      }
      let type = data.studyTypes.find(
        (t) =>
          t.name.toLocaleLowerCase() === typeText.trim().toLocaleLowerCase() &&
          !t.archived,
      );
      if (!type) {
        const next = await mutate({
          kind: "study_type",
          id: null,
          name: typeText.trim(),
          color: COLORS[data.studyTypes.length % COLORS.length],
        });
        if (!next) return;
        type = next.studyTypes.find(
          (t) => t.id === next.settings.lastStudyType,
        );
      }
      if (
        subject &&
        type &&
        (await mutate({
          kind: "start",
          subjectId: subject.id,
          studyTypeId: type.id,
          timeZone: timeZone(),
          timerMode: mode,
          targetMs: idleTarget,
        }))
      ) {
        setTyped(null);
        setTypedType(null);
      }
    } finally {
      setStarting(false);
    }
  }
  const pause = () => {
    if (breakState)
      void mutate({
        kind: "break_action",
        sessionId: breakState.sessionId,
        action: running ? "pause" : "resume",
      });
    else if (active)
      void mutate({ kind: running ? "pause" : "resume", id: active.id });
  };
  const context = (
    <div className="timer-context">
      <span className="context-subject">
        <i
          className="dot"
          style={{ background: chosen?.color ?? "var(--accent)" }}
        />
        {subjectName ?? "No active session"}
      </span>
      <span className="context-type">
        {typeName}
        {(mini || focus) && typeName ? " · " : ""}
        {mini || focus ? MODE_NAMES[mode] : ""}
      </span>
    </div>
  );
  const controls = (
    <div className="timer-actions">
      {active || breakState ? (
        <>
          <button
            className="secondary"
            aria-label={running ? "Pause timer" : "Resume timer"}
            title={running ? "Pause" : "Resume"}
            disabled={busy}
            onClick={pause}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            <span>{running ? "Pause" : "Resume"}</span>
          </button>
          {breakState ? (
            <button
              className="secondary"
              aria-label="Skip break"
              title="Skip break"
              disabled={busy}
              onClick={() =>
                void mutate({
                  kind: "break_action",
                  sessionId: breakState.sessionId,
                  action: "skip",
                })
              }
            >
              <SkipForward size={16} />
              <span>Skip break</span>
            </button>
          ) : (
            active && (
              <button
                className="primary"
                aria-label="Finish session"
                title="Finish session"
                disabled={busy}
                onClick={() => onFinish(active.id)}
              >
                <Check size={17} />
                <span>Finish</span>
              </button>
            )
          )}
          {active && !mini && (
            <button
              className="icon cancel"
              aria-label="Discard session"
              title="Discard session"
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
          disabled={starting}
          onClick={() => void start()}
        >
          <Play size={16} />
          {starting
            ? "Starting…"
            : mode === "pomodoro"
              ? "Start focus"
              : mode === "countdown"
                ? "Start countdown"
                : "Start session"}
        </button>
      )}
    </div>
  );
  return (
    <section
      className={`timer ${mini ? "mini-timer" : ""} ${focus ? "focus-timer" : ""}`}
      aria-label="Study timer"
    >
      {mini ? (
        <>
          <div className="mini-top" data-tauri-drag-region>
            <span className="timer-status" data-tauri-drag-region>
              {status === "Ready" ? MODE_NAMES[mode] : status}
            </span>
            <div>
              <button
                className="icon"
                aria-label="Open main window"
                title="Open main window"
                onClick={onMain}
              >
                <ArrowUpRight size={15} />
              </button>
              <button
                className="icon"
                aria-label="Close mini timer"
                title="Close mini timer"
                onClick={onCloseMini}
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <button
            className="mini-context"
            onClick={onMain}
            title={subjectName ?? "Open Margin"}
          >
            {context}
          </button>
          <div className="mini-clock-row">
            <div
              className="clock"
              role="timer"
              aria-label={`${breakState ? "Break remaining" : mode === "stopwatch" ? "Elapsed time" : "Time remaining"} ${displayClock(ms, breakState ? "break" : mode)}`}
            >
              {displayClock(ms, breakState ? "break" : mode)}
            </div>
            {controls}
          </div>
        </>
      ) : (
        <>
          <div className="timer-toolbar">
            {focus ? (
              <span className="timer-status">{status}</span>
            ) : (
              <div
                className="segmented mode-switch"
                role="group"
                aria-label="Timer mode"
              >
                {(["stopwatch", "pomodoro", "countdown"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    disabled={busy || !!active || !!breakState}
                    onClick={() => {
                      setDurationOverride(null);
                      void mutate({
                        kind: "setting",
                        key: "timerMode",
                        value: m,
                      });
                    }}
                  >
                    {MODE_NAMES[m]}
                  </button>
                ))}
              </div>
            )}
            <div className="timer-window-actions">
              {!focus && (
                <button
                  className="icon"
                  aria-label="Open mini timer"
                  title="Mini timer · ⌘/Ctrl M"
                  onClick={onMini}
                >
                  <PictureInPicture2 size={17} />
                </button>
              )}
              <button
                className="icon"
                aria-label={focus ? "Exit fullscreen" : "Enter fullscreen"}
                title={focus ? "Exit focus · Esc" : "Fullscreen"}
                onClick={onFocus}
              >
                {focus ? <Minimize size={17} /> : <Maximize size={17} />}
              </button>
            </div>
          </div>
          {active || breakState || focus ? (
            context
          ) : (
            <div className="session-inputs">
              <label htmlFor="subject-field">
                <span>Subject</span>
                <span className="input-with-action">
                  <input
                    ref={subjectInput}
                    id="subject-field"
                    name="subject"
                    aria-invalid={fieldError === "Enter a subject."}
                    aria-describedby={
                      fieldError ? "timer-input-error" : undefined
                    }
                    list="subject-options"
                    maxLength={80}
                    placeholder="e.g. Data Structures"
                    autoComplete="off"
                    value={text}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void start();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="icon"
                    aria-label="Manage subjects"
                    title="Manage subjects"
                    onClick={onSubjects}
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                </span>
              </label>
              <datalist id="subject-options">
                {data.subjects
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
              </datalist>
              <label htmlFor="study-type-field">
                <span>Study type</span>
                <span className="input-with-action">
                  <input
                    ref={typeInput}
                    id="study-type-field"
                    name="studyType"
                    aria-invalid={fieldError === "Enter a study type."}
                    aria-describedby={
                      fieldError ? "timer-input-error" : undefined
                    }
                    list="study-type-options"
                    maxLength={80}
                    placeholder="e.g. Reviewing"
                    autoComplete="off"
                    value={typeText}
                    onChange={(e) => setTypedType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void start();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="icon"
                    aria-label="Manage study types"
                    title="Manage study types"
                    onClick={onTypes}
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                </span>
              </label>
              <datalist id="study-type-options">
                {data.studyTypes
                  .filter((t) => !t.archived)
                  .map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
              </datalist>
            </div>
          )}
          {fieldError && (
            <p className="field-error" role="alert" id="timer-input-error">
              {fieldError}
            </p>
          )}
          <div className="timer-display">
            <div className="timer-status">
              {!focus && (
                <>
                  <i
                    className={running ? "status-dot running" : "status-dot"}
                  />
                  {status}
                </>
              )}
              {mode === "pomodoro" && !breakState && (
                <span className="cycle-count">
                  Focus {(data.timerState.cycle % 4) + 1} of 4
                </span>
              )}
            </div>
            <div
              className="clock"
              role="timer"
              aria-label={`${breakState ? "Break remaining" : mode === "stopwatch" ? "Elapsed time" : "Time remaining"} ${displayClock(ms, breakState ? "break" : mode)}`}
            >
              {displayClock(ms, breakState ? "break" : mode)}
            </div>
            {controls}
          </div>
          {!focus && !active && !breakState && mode !== "stopwatch" && (
            <div className="mode-options">
              <DurationField
                key={mode === "pomodoro" ? "focus" : "countdown"}
                label={mode === "pomodoro" ? "Focus" : "Duration"}
                onValueChange={setDurationOverride}
                setting={
                  mode === "pomodoro" ? "focusMinutes" : "countdownMinutes"
                }
                value={
                  mode === "pomodoro"
                    ? data.settings.focusMinutes
                    : data.settings.countdownMinutes
                }
                mutate={mutate}
                busy={busy}
              />
              {mode === "pomodoro" && (
                <DurationField
                  key="shortBreak"
                  label="Break"
                  setting="shortBreakMinutes"
                  value={data.settings.shortBreakMinutes}
                  mutate={mutate}
                  busy={busy}
                />
              )}
            </div>
          )}
        </>
      )}
      {progress !== null && (active || breakState) && (
        <progress
          className="timer-progress"
          aria-label={breakState ? "Break progress" : "Session progress"}
          max={1}
          value={Math.max(0, Math.min(1, progress))}
        />
      )}
      {cancel && active && (
        <Confirm
          title="Discard session?"
          label="Discard session"
          busy={busy}
          onClose={() => setCancel(false)}
          onConfirm={async () => {
            if (await mutate({ kind: "cancel", id: active.id }))
              setCancel(false);
          }}
        >
          Discard {displayClock(elapsed(active, now), "stopwatch")} of recorded
          study time? This session won’t be saved.
        </Confirm>
      )}
    </section>
  );
}
