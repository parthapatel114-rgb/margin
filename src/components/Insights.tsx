import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import {
  addDays,
  analyze,
  dayKey,
  dayStart,
  duration,
  hourLabel,
  observations,
  range,
  rankedSubjects,
  shiftPeriod,
  weekStart,
  type Analysis,
  type Period,
} from "../lib/analytics";
import type { Session, Subject } from "../lib/types";
import { Dialog } from "./Dialog";
function SubjectBreakdown({
  data,
  subjects,
  previous,
}: {
  previous?: Analysis;
  data: Analysis;
  subjects: Subject[];
}) {
  return (
    <div className="distribution">
      {rankedSubjects(data, subjects).map((row) => (
        <div key={row.id}>
          <div className="distribution-label">
            <span>
              <i className="dot" style={{ background: row.subject?.color }} />
              {row.subject?.name ?? "Removed subject"}
            </span>
            <span>
              {duration(row.ms)}{" "}
              <small
                title={
                  previous?.total
                    ? `Share change: ${(row.percent - ((previous.subjects[row.id] ?? 0) / previous.total) * 100).toFixed(1)} percentage points from the previous period`
                    : undefined
                }
              >
                {Math.round(row.percent)}%
              </small>
              {previous && previous.total > 0 && (
                <small className="share-change">
                  {row.percent -
                    ((previous.subjects[row.id] ?? 0) / previous.total) * 100 >=
                  0
                    ? "+"
                    : ""}
                  {(
                    row.percent -
                    ((previous.subjects[row.id] ?? 0) / previous.total) * 100
                  ).toFixed(0)}{" "}
                  pp
                </small>
              )}
            </span>
          </div>
          <div className="track">
            <div
              style={{
                width: `${row.percent}%`,
                background: row.subject?.color ?? "var(--accent)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
function Trend({
  data,
  from,
  to,
  period,
}: {
  data: Analysis;
  from: number;
  to: number;
  period: Period;
}) {
  const bins = new Map<string, number>();
  for (let cursor = from; cursor < to; cursor = addDays(cursor, 1)) {
    const date = new Date(cursor);
    const key =
      period === "year"
        ? dayKey(weekStart(cursor))
        : period === "all"
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          : dayKey(cursor);
    bins.set(
      key,
      (bins.get(key) ?? 0) + (data.days[dayKey(cursor)]?.total ?? 0),
    );
  }
  const entries = [...bins];
  const max = Math.max(1, ...entries.map((x) => x[1]));
  return (
    <>
      <div
        className="trend-bars"
        role="img"
        aria-label={`Study duration by ${period === "all" ? "month" : period === "year" ? "week" : "day"}. ${entries
          .filter(([, ms]) => ms > 0)
          .map(([key, ms]) => `${key}: ${duration(ms)}`)
          .join(", ")}`}
      >
        {entries.map(([key, ms]) => (
          <div
            className="trend-column"
            key={key}
            title={`${key}: ${duration(ms)}`}
          >
            <span
              style={{ height: `${ms ? Math.max(2, (ms / max) * 100) : 1}%` }}
            />
          </div>
        ))}
      </div>
      <div className="chart-axis">
        <span>
          {new Date(from).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: period === "all" ? "numeric" : undefined,
          })}
        </span>
        <span>
          {period === "year"
            ? "Weekly totals"
            : period === "all"
              ? "Monthly totals"
              : "Daily totals"}
        </span>
        <span>
          {new Date(addDays(to, -1)).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </>
  );
}
export function Insights({
  sessions,
  subjects,
  studyTypes,
  now,
  onStart,
}: {
  onStart: () => void;
  sessions: Session[];
  subjects: Subject[];
  studyTypes: Subject[];
  now: number;
}) {
  const [breakdown, setBreakdown] = useState<"subjects" | "types">("subjects");
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState(now);
  const [recap, setRecap] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const finished = useMemo(
    () => sessions.filter((s) => s.endedAt !== null),
    [sessions],
  );
  const [from, to] = range(period, anchor, finished);
  const data = useMemo(
    () => analyze(finished, from, to, Infinity),
    [finished, from, to],
  );
  const [previousFrom, previousTo] = range(
    period,
    shiftPeriod(period, anchor, -1),
    finished,
  );
  const previous = useMemo(
    () => analyze(finished, previousFrom, previousTo, Infinity),
    [finished, previousFrom, previousTo],
  );
  const lines = observations(
    data,
    period === "all" ? analyze([], 0, 0) : previous,
    subjects,
  );
  const year = new Date(anchor).getFullYear();
  const yearStart = +new Date(year, 0, 1),
    yearEnd = +new Date(year + 1, 0, 1);
  const calendar = useMemo(
    () => analyze(finished, yearStart, yearEnd, Infinity),
    [finished, yearStart, yearEnd],
  );
  const cells: Array<number | null> = Array(
    (new Date(yearStart).getDay() + 6) % 7,
  ).fill(null);
  for (let day = yearStart; day < yearEnd; day = addDays(day, 1))
    cells.push(day);
  while (cells.length % 7) cells.push(null);
  const inspectedDay = useMemo(() => {
    if (!selectedDay) return null;
    const start = +new Date(`${selectedDay}T00:00`);
    return analyze(finished, start, addDays(start, 1), Infinity);
  }, [selectedDay, finished]);
  const peak = Math.max(1, ...Object.values(calendar.days).map((d) => d.total));
  const totalHours = Math.max(1, ...data.hours);
  const label =
    period === "all"
      ? "All recorded time"
      : period === "week"
        ? `${new Date(from).toLocaleDateString([], { month: "short", day: "numeric" })} – ${new Date(addDays(to, -1)).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
        : new Date(from).toLocaleDateString([], {
            year: "numeric",
            month: period === "month" ? "long" : undefined,
          });
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>Insights</h1>
        <button className="secondary" onClick={() => setRecap(true)}>
          <BookOpen size={16} />
          Study Wrapped <ArrowRight size={14} />
        </button>
      </div>
      <div className="period-row">
        <div className="segmented" aria-label="Statistics period">
          {(["week", "month", "year", "all"] as const).map((p) => (
            <button
              key={p}
              aria-pressed={period === p}
              onClick={() => {
                setPeriod(p);
                setAnchor(now);
              }}
            >
              {p === "all" ? "All time" : p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="period-step">
          <button
            className="icon"
            aria-label="Previous period"
            disabled={period === "all"}
            onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}
          >
            <ChevronLeft size={17} />
          </button>
          <span>{label}</span>
          <button
            className="icon"
            aria-label="Next period"
            disabled={period === "all" || shiftPeriod(period, anchor, 1) > now}
            onClick={() => setAnchor(shiftPeriod(period, anchor, 1))}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="insight-stats">
        <div>
          <span>Total study time</span>
          <strong>{duration(data.total)}</strong>
        </div>
        <div>
          <span>Active days</span>
          <strong>{data.activeDays}</strong>
        </div>
        <div>
          <span>Average session</span>
          <strong>{duration(data.average)}</strong>
        </div>
        <div>
          <span>Sessions</span>
          <strong>{data.count}</strong>
        </div>
      </div>
      {data.total === 0 ? (
        <div className="empty compact">
          <h2>No study time in this period</h2>
          {finished.length ? (
            <button
              className="secondary"
              onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}
              disabled={period === "all"}
            >
              Previous period
            </button>
          ) : (
            <button className="secondary" onClick={onStart}>
              Start a session
            </button>
          )}
        </div>
      ) : (
        <>
          <section className="insight-section">
            <div className="section-heading">
              <h2>Study time</h2>
              <span>{duration(data.total)} recorded</span>
            </div>
            <Trend data={data} from={from} to={to} period={period} />
          </section>
          <div className="insight-columns">
            <section>
              <div className="section-heading">
                <h2>Time distribution</h2>
                <div className="segmented small">
                  <button
                    aria-pressed={breakdown === "subjects"}
                    onClick={() => setBreakdown("subjects")}
                  >
                    Subjects
                  </button>
                  <button
                    aria-pressed={breakdown === "types"}
                    onClick={() => setBreakdown("types")}
                  >
                    Study types
                  </button>
                </div>
              </div>
              <SubjectBreakdown
                data={
                  breakdown === "subjects"
                    ? data
                    : { ...data, subjects: data.studyTypes }
                }
                subjects={breakdown === "subjects" ? subjects : studyTypes}
                previous={
                  period === "all"
                    ? undefined
                    : breakdown === "subjects"
                      ? previous
                      : { ...previous, subjects: previous.studyTypes }
                }
              />
            </section>
            <section>
              <div className="section-heading">
                <h2>Time of day</h2>
                <span>Study time by hour</span>
              </div>
              <div
                className="hour-bars"
                role="img"
                aria-label={`Study time by hour. ${data.hours
                  .map((ms, h) =>
                    ms > 0 ? `${hourLabel(h)}: ${duration(ms)}` : null,
                  )
                  .filter(Boolean)
                  .join(", ")}`}
              >
                {data.hours.map((ms, h) => (
                  <div title={`${hourLabel(h)}: ${duration(ms)}`} key={h}>
                    <span
                      style={{
                        height: `${ms ? Math.max(2, (ms / totalHours) * 100) : 1}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="chart-axis">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
              </div>
            </section>
          </div>
          {lines.length > 0 && (
            <div className="observations">
              {lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </>
      )}
      <section className="insight-section calendar-section">
        <div className="section-heading">
          <h2>Study calendar</h2>
          <div>
            <span className="muted">
              {year} · {calendar.activeDays} active{" "}
              {calendar.activeDays === 1 ? "day" : "days"}
            </span>
            <button
              className="secondary"
              onClick={() => setSelectedDay(dayKey(now))}
            >
              View day
            </button>
          </div>
        </div>
        <div className="calendar-scroll">
          <div className="calendar-months" aria-hidden="true">
            {Array.from({ length: 12 }, (_, month) => (
              <span key={month}>
                {new Date(year, month, 1).toLocaleDateString([], {
                  month: "short",
                })}
              </span>
            ))}
          </div>
          <div className="calendar" aria-label={`${year} study calendar`}>
            {cells.map((at, index) => {
              const key = at === null ? "" : dayKey(at);
              const ms = calendar.days[key]?.total ?? 0;
              return at === null ? (
                <span key={`blank-${index}`} />
              ) : (
                <button
                  key={key}
                  aria-label={`${key}: ${duration(ms)}. View subjects.`}
                  title={`${key}: ${duration(ms)}`}
                  disabled={at > dayStart(now)}
                  data-level={
                    ms === 0
                      ? 0
                      : ms / peak < 0.25
                        ? 1
                        : ms / peak < 0.5
                          ? 2
                          : ms / peak < 0.75
                            ? 3
                            : 4
                  }
                  onClick={() => setSelectedDay(key)}
                />
              );
            })}
          </div>
        </div>
        <div className="calendar-footer">
          <span>
            Time zone:
            {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </span>
          <span>
            Less <i data-level="0" />
            <i data-level="1" />
            <i data-level="2" />
            <i data-level="3" />
            <i data-level="4" /> More
          </span>
        </div>
      </section>
      {selectedDay && (
        <Dialog
          title={new Date(`${selectedDay}T12:00`).toLocaleDateString([], {
            dateStyle: "long",
          })}
          onClose={() => setSelectedDay(null)}
        >
          <p className="dialog-copy">
            {duration(inspectedDay?.total ?? 0)} recorded.
          </p>
          <label className="inspect-date">
            Date
            <input
              aria-label="Inspect date"
              type="date"
              max={dayKey(now)}
              value={selectedDay}
              onChange={(e) => {
                if (e.target.value) setSelectedDay(e.target.value);
              }}
            />
          </label>
          {inspectedDay?.total ? (
            <SubjectBreakdown data={inspectedDay} subjects={subjects} />
          ) : (
            <p className="hint">No study time was recorded on this day.</p>
          )}
        </Dialog>
      )}
      {recap && (
        <Wrapped
          sessions={finished}
          subjects={subjects}
          now={now}
          onClose={() => setRecap(false)}
        />
      )}
    </>
  );
}
function Wrapped({
  sessions,
  subjects,
  now,
  onClose,
}: {
  sessions: Session[];
  subjects: Subject[];
  now: number;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [anchor, setAnchor] = useState(now);
  const [page, setPage] = useState(0);
  const [from, to] = range(period, anchor);
  const data = analyze(sessions, from, to, now);
  const ranked = rankedSubjects(data, subjects);
  const enough = data.activeDays >= 3 && data.count >= 3;
  const favoriteHour = data.hours.indexOf(Math.max(...data.hours));
  const bestMonth = Object.entries(data.months).sort(
    (a, b) => b[1].size - a[1].size,
  )[0];
  const label = new Date(from).toLocaleDateString([], {
    month: period === "month" ? "long" : undefined,
    year: "numeric",
  });
  return (
    <Dialog title="Study Wrapped" onClose={onClose} wide>
      <div className="period-row recap-controls">
        <div className="segmented">
          {(["month", "year"] as const).map((p) => (
            <button
              key={p}
              aria-pressed={period === p}
              onClick={() => {
                setPeriod(p);
                setPage(0);
              }}
            >
              {p === "month" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
        <div className="period-step">
          <button
            className="icon"
            aria-label="Previous recap period"
            onClick={() => {
              setAnchor(shiftPeriod(period, anchor, -1));
              setPage(0);
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span>{label}</span>
          <button
            className="icon"
            aria-label="Next recap period"
            disabled={shiftPeriod(period, anchor, 1) > now}
            onClick={() => {
              setAnchor(shiftPeriod(period, anchor, 1));
              setPage(0);
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {enough ? (
        <>
          <article className={`recap-story story-${page}`}>
            <span className="eyebrow">
              MARGIN / {label.toUpperCase()}
              {to > now ? " SO FAR" : ""}
            </span>
            {page === 0 ? (
              <>
                <h3>Total study time</h3>
                <strong className="recap-number">
                  {(data.total / 3600000).toLocaleString([], {
                    maximumFractionDigits: 1,
                  })}
                  <small> hours</small>
                </strong>
                <p>
                  {data.count} sessions, across {data.activeDays} days.
                </p>
              </>
            ) : page === 1 ? (
              <>
                <h3>Top subject</h3>
                <strong className="recap-subject">
                  {ranked[0]?.subject?.name}
                </strong>
                <p>
                  {duration(ranked[0]?.ms ?? 0)} ·{" "}
                  {Math.round(ranked[0]?.percent ?? 0)}% of your recorded time.
                </p>
                <SubjectBreakdown data={data} subjects={subjects} />
              </>
            ) : (
              <>
                <h3>Most active hour</h3>
                <strong className="recap-number">
                  {hourLabel(favoriteHour)}
                </strong>
                <p> {duration(data.hours[favoriteHour])} recorded.</p>
                <div className="recap-facts">
                  <div>
                    <span>Longest session in this period</span>
                    <strong>{duration(data.longest)}</strong>
                  </div>
                  {period === "year" && bestMonth && (
                    <div>
                      <span>Most active month</span>
                      <strong>
                        {new Date(
                          `${bestMonth[0]}-01T12:00`,
                        ).toLocaleDateString([], { month: "long" })}{" "}
                        · {bestMonth[1].size} days
                      </strong>
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
          <div className="recap-pagination">
            <button
              className="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <span>{page + 1} / 3</span>
            <button
              className="primary"
              onClick={() => (page === 2 ? onClose() : setPage((p) => p + 1))}
            >
              {page === 2 ? "Done" : "Continue"}
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <div className="empty">
          <BookOpen size={30} />
          <h2>Not enough sessions for a recap</h2>
          <p>
            Record three sessions across three days in this {period}, or select
            an earlier period.
          </p>
        </div>
      )}
    </Dialog>
  );
}
