import { useMemo, type ReactNode } from "react";
import { Plus, ArrowRight } from "lucide-react";
import {
  addDays,
  analyze,
  dayKey,
  duration,
  weekStart,
} from "../lib/analytics";
import type { Snapshot, Session } from "../lib/types";
import { SessionRows } from "./History";
export function Today({
  data,
  now,
  timer,
  onAdd,
  onHistory,
  onEdit,
}: {
  data: Snapshot;
  now: number;
  timer: ReactNode;
  onAdd: () => void;
  onHistory: () => void;
  onEdit: (s: Session) => void;
}) {
  const week = weekStart(now);
  const totals = useMemo(
    () => analyze(data.sessions, week, addDays(week, 7), now),
    [data.sessions, week, now],
  );
  const finished = data.sessions.filter((s) => s.endedAt !== null);
  const peak = Math.max(
    3_600_000,
    ...Object.values(totals.days).map((d) => d.total),
  );
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
      <div className="today-layout">
        <div className="timer-column">{timer}</div>
        <aside className="today-sidebar" aria-label="Study overview">
          <section className="today-summary" aria-label="Study totals">
            <div className="today-totals">
              <div>
                <span>Today</span>
                <strong>
                  {duration(totals.days[dayKey(now)]?.total ?? 0)}
                </strong>
              </div>
              <div>
                <span>This week</span>
                <strong>{duration(totals.total)}</strong>
              </div>
            </div>
            <div
              className="week-strip"
              role="img"
              aria-label={Array.from({ length: 7 }, (_, i) => {
                const date = addDays(week, i);
                return `${new Date(date).toLocaleDateString([], { weekday: "long" })}: ${duration(totals.days[dayKey(date)]?.total ?? 0)}`;
              }).join(", ")}
            >
              {Array.from({ length: 7 }, (_, i) => {
                const date = addDays(week, i),
                  ms = totals.days[dayKey(date)]?.total ?? 0;
                return (
                  <div
                    key={date}
                    className={dayKey(date) === dayKey(now) ? "current" : ""}
                    title={`${new Date(date).toLocaleDateString()}: ${duration(ms)}`}
                  >
                    <div className="week-bar">
                      <span
                        style={{
                          height: `${ms ? Math.max(4, (ms / peak) * 100) : 2}%`,
                        }}
                      />
                    </div>
                    <span>
                      {new Date(date).toLocaleDateString([], {
                        weekday: "short",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="recent">
            <div className="section-heading">
              <h2>Recent sessions</h2>
              <button className="text-button" onClick={onHistory}>
                History
                <ArrowRight size={14} />
              </button>
            </div>
            {finished.length ? (
              <SessionRows
                sessions={finished.slice(0, 5)}
                subjects={data.subjects}
                studyTypes={data.studyTypes}
                onEdit={onEdit}
              />
            ) : (
              <p className="recent-empty">No sessions yet.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
