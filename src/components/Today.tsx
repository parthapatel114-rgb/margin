import { useMemo, useState, type ReactNode } from "react";
import { Plus, ArrowRight, Target, RotateCcw } from "lucide-react";
import {
  addDays,
  analyze,
  dayKey,
  duration,
  dayStart,
  weekStart,
} from "../lib/analytics";
import type { Snapshot, Session, Mutate } from "../lib/types";
import { SessionRows } from "./History";
import { Dialog } from "./Dialog";
export function Today({
  data,
  now,
  timer,
  onAdd,
  onHistory,
  onEdit,
  onRepeat,
  mutate,
  busy,
}: {
  data: Snapshot;
  now: number;
  timer: ReactNode;
  onAdd: () => void;
  onHistory: () => void;
  onEdit: (s: Session) => void;
  onRepeat: (s: Session) => void;
  mutate: Mutate;
  busy: boolean;
}) {
  const week = weekStart(now),
    totals = useMemo(
      () => analyze(data.sessions, week, addDays(week, 7), now),
      [data.sessions, week, now],
    );
  const finished = data.sessions.filter((s) => s.endedAt !== null),
    today = totals.days[dayKey(now)]?.total ?? 0;
  const [goalOpen, setGoalOpen] = useState(false),
    [goalDraft, setGoalDraft] = useState(
      String(data.settings.dailyGoalMinutes || 60),
    );
  const [goalError, setGoalError] = useState("");
  const goal = data.settings.dailyGoalMinutes;
  const combos = finished
    .filter(
      (s, i, all) =>
        all.findIndex(
          (p) => p.subjectId === s.subjectId && p.studyTypeId === s.studyTypeId,
        ) === i,
    )
    .filter(
      (s) =>
        data.subjects.some((x) => x.id === s.subjectId && !x.archived) &&
        data.studyTypes.some((x) => x.id === s.studyTypeId && !x.archived),
    )
    .slice(0, 3);
  async function saveGoal(n: number) {
    if (!Number.isInteger(n) || n < 0 || n > 1440) {
      setGoalError("Enter 1–1440 minutes, or disable the target.");
      return;
    }
    if (
      await mutate({
        kind: "setting",
        key: "dailyGoalMinutes",
        value: String(n),
      })
    )
      setGoalOpen(false);
  }
  return (
    <>
      <div className="page-heading">
        <div className="page-title">
          <h1 tabIndex={-1}>Today</h1>
          <time dateTime={dayKey(now)}>
            {new Date(now).toLocaleDateString([], {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
        <button className="secondary" onClick={onAdd}>
          <Plus size={16} />
          Add time
        </button>
      </div>
      <div className="today-metrics" aria-label="Study totals">
        <div>
          <span>Today</span>
          <strong>{duration(today)}</strong>
        </div>
        <div>
          <span>This week</span>
          <strong>{duration(totals.total)}</strong>
        </div>
        <div>
          <span title="Sessions with study time today">Sessions</span>
          <strong>
            {
              analyze(
                data.sessions,
                dayStart(now),
                addDays(dayStart(now), 1),
                now,
              ).count
            }
          </strong>
        </div>
        <button
          className="daily-goal"
          onClick={() => {
            setGoalDraft(String(goal || 60));
            setGoalError("");
            setGoalOpen(true);
          }}
        >
          <Target size={18} />
          <span>
            <span>{goal ? "Daily target" : "Daily target · Optional"}</span>
            <strong>
              {goal
                ? `${duration(today)} / ${duration(goal * 60000)}`
                : "Set a target"}
            </strong>
            {goal > 0 && (
              <progress
                aria-label="Daily study target"
                value={Math.min(today, goal * 60000)}
                max={goal * 60000}
              />
            )}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
      <section className="study-workspace" aria-label="Current session">
        <div className="workspace-label">
          <h2>
            {data.sessions.some((s) => s.endedAt === null) ||
            data.timerState.break
              ? "Current session"
              : finished.length
                ? "Study session"
                : "Start your first session"}
          </h2>
          <span>
            {data.sessions.some((s) => s.endedAt === null)
              ? "Timer running or paused"
              : "Choose a subject and study type"}
          </span>
        </div>
        {timer}
      </section>
      {combos.length > 0 && (
        <section className="continue-section">
          <div className="section-heading">
            <h2>Continue studying</h2>
            <span>Prepare a session</span>
          </div>
          <div className="continue-grid">
            {combos.map((s) => (
              <button
                className="continue-card"
                disabled={
                  data.sessions.some((x) => x.endedAt === null) ||
                  !!data.timerState.break
                }
                key={`${s.subjectId}-${s.studyTypeId}`}
                onClick={() => onRepeat(s)}
              >
                <i
                  className="dot"
                  style={{
                    background: data.subjects.find((x) => x.id === s.subjectId)
                      ?.color,
                  }}
                />
                <span>
                  <strong>
                    {data.subjects.find((x) => x.id === s.subjectId)?.name}
                  </strong>
                  <small>
                    {data.studyTypes.find((x) => x.id === s.studyTypeId)?.name}
                  </small>
                </span>
                <RotateCcw size={15} />
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="today-bottom">
        <section className="recent panel">
          <div className="section-heading">
            <h2>Recent sessions</h2>
            <button className="text-button" onClick={onHistory}>
              View history
              <ArrowRight size={14} />
            </button>
          </div>
          {finished.length ? (
            <SessionRows
              sessions={finished.slice(0, 4)}
              subjects={data.subjects}
              studyTypes={data.studyTypes}
              onEdit={onEdit}
              onRepeat={onRepeat}
            />
          ) : (
            <div className="first-record">
              <span>Your finished sessions will appear here.</span>
              <button className="text-button" onClick={onAdd}>
                <Plus size={14} />
                Log past study time
              </button>
            </div>
          )}
        </section>
        <section className="week-overview panel">
          <div className="section-heading">
            <h2>This week</h2>
            <span>{duration(totals.total)}</span>
          </div>
          <div className="week-days">
            {Array.from({ length: 7 }, (_, i) => {
              const at = addDays(week, i),
                ms = totals.days[dayKey(at)]?.total ?? 0;
              return (
                <div
                  className={dayKey(at) === dayKey(now) ? "current" : ""}
                  key={at}
                >
                  <span>
                    {new Date(at).toLocaleDateString([], { weekday: "short" })}
                  </span>
                  <strong>{duration(ms)}</strong>
                  <i
                    style={{
                      height: `${ms ? Math.max(4, (ms / Math.max(3600000, ...Object.values(totals.days).map((d) => d.total))) * 46) : 2}px`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {goalOpen && (
        <Dialog title="Daily study target" onClose={() => setGoalOpen(false)}>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveGoal(Number(goalDraft));
            }}
          >
            <label>
              Minutes per day
              <input
                type="number"
                min={1}
                max={1440}
                required
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
              />
            </label>
            <p className="hint">
              Counts actual study time. Breaks are excluded.
            </p>
            {goalError && (
              <p role="alert" className="field-error">
                {goalError}
              </p>
            )}
            <footer>
              {goal > 0 && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => void saveGoal(0)}
                >
                  Disable target
                </button>
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => setGoalOpen(false)}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                Save target
              </button>
            </footer>
          </form>
        </Dialog>
      )}
    </>
  );
}
