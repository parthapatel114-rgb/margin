import { useMemo, useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import {
  addDays,
  analyze,
  dayKey,
  dayStart,
  duration,
  hourLabel,
  range,
  rankedSubjects,
  shiftPeriod,
  type Analysis,
  type Period,
} from "../lib/analytics";
import {
  dateAt,
  monthStart,
  rangeBounds,
  shiftMonth,
  type DateRange,
} from "../lib/dates";
import { studyMix, trendBuckets } from "../lib/insights";
import { MODE_NAMES } from "../lib/timer";
import type { Session, Subject, HistoryFilter } from "../lib/types";
import { Dialog } from "./Dialog";
import { DateRangePicker, MonthCalendar } from "./Calendar";
import { EmptyLedger } from "./Feedback";

function SubjectBreakdown({
  data,
  subjects,
}: {
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
              {duration(row.ms)} <small>{Math.round(row.percent)}%</small>
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
export function Insights({
  sessions,
  subjects,
  studyTypes,
  now,
  onStart,
  onAdd,
  onHistory,
}: {
  sessions: Session[];
  subjects: Subject[];
  studyTypes: Subject[];
  now: number;
  onStart: () => void;
  onAdd: () => void;
  onHistory: (filter: HistoryFilter) => void;
}) {
  const [view, setView] = useState<"overview" | "calendar" | "mix">("overview"),
    [period, setPeriod] = useState<Period>("week"),
    [anchor, setAnchor] = useState(now);
  const [subject, setSubject] = useState(""),
    [studyType, setStudyType] = useState(""),
    [custom, setCustom] = useState<DateRange | null>(null),
    [recap, setRecap] = useState(false),
    [breakdown, setBreakdown] = useState<"subjects" | "types">("subjects");
  const [calendarScale, setCalendarScale] = useState<"month" | "year">("month"),
    [selectedDay, setSelectedDay] = useState(dayKey(now));
  const finished = useMemo(
    () => sessions.filter((s) => s.endedAt !== null),
    [sessions],
  );
  const scoped = useMemo(
    () =>
      finished.filter(
        (s) =>
          (!subject || s.subjectId === subject) &&
          (!studyType || s.studyTypeId === studyType),
      ),
    [finished, subject, studyType],
  );
  const [baseFrom, baseTo] = range(period, anchor, finished),
    [from, to] = custom ? rangeBounds(custom, now) : [baseFrom, baseTo];
  const data = useMemo(
    () => analyze(scoped, from, to, Infinity),
    [scoped, from, to],
  );
  const mix = useMemo(
    () => studyMix(scoped, from, to, Infinity),
    [scoped, from, to],
  );
  const buckets = useMemo(
    () => trendBuckets(data, from, to, custom ? "custom" : period),
    [data, from, to, custom, period],
  );
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartOverflow, setChartOverflow] = useState(false);
  useEffect(() => {
    const root = chartRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() =>
      setChartOverflow(root.scrollWidth > root.clientWidth + 1),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [buckets, view]);
  const max = Math.max(1, ...buckets.map((b) => b.ms)),
    currentRange = { from: dayKey(from), to: dayKey(addDays(to, -1)) };
  const [priorFrom, priorTo] = range(
    period,
    shiftPeriod(period, anchor, -1),
    finished,
  );
  const previous = useMemo(
    () =>
      !custom && period !== "all"
        ? analyze(scoped, priorFrom, priorTo, Infinity)
        : null,
    [custom, period, scoped, priorFrom, priorTo],
  );
  const year = new Date(anchor).getFullYear(),
    calendarFrom = +new Date(year, 0, 1),
    calendarTo = +new Date(year + 1, 0, 1);
  const yearData = useMemo(
    () => analyze(scoped, calendarFrom, calendarTo, Infinity),
    [scoped, calendarFrom, calendarTo],
  );
  const dayData = useMemo(
    () =>
      analyze(
        scoped,
        dayStart(dateAt(selectedDay)),
        addDays(dayStart(dateAt(selectedDay)), 1),
        Infinity,
      ),
    [scoped, selectedDay],
  );
  const hourPeak = data.hours.indexOf(Math.max(...data.hours));
  const history = (filter: HistoryFilter = {}) =>
    onHistory({
      from: currentRange.from,
      to: currentRange.to,
      subject,
      studyType,
      ...filter,
    });
  const reset = () => {
    setSubject("");
    setStudyType("");
    setCustom(null);
    setPeriod(view === "calendar" ? calendarScale : "week");
    setAnchor(now);
    setSelectedDay(dayKey(now));
  };
  function changeView(next: "overview" | "calendar" | "mix") {
    setView(next);
    if (next === "calendar") {
      setPeriod("month");
      setCustom(null);
      const at = custom?.from ? dateAt(custom.from) : anchor;
      setAnchor(at);
      setCalendarScale("month");
      setSelectedDay(dayKey(at));
    }
  }
  return (
    <>
      <div className="page-heading">
        <div className="page-title">
          <h1 tabIndex={-1}>Statistics</h1>
          <span className="muted">Finished sessions</span>
        </div>
        <button className="secondary" onClick={() => setRecap(true)}>
          <BookOpen size={16} />
          Study Wrapped
          <ArrowRight size={14} />
        </button>
      </div>
      <div
        className="stats-view-tabs"
        role="group"
        aria-label="Statistics view"
      >
        {(["overview", "calendar", "mix"] as const).map((v) => (
          <button
            aria-pressed={view === v}
            key={v}
            onClick={() => changeView(v)}
          >
            {v === "overview"
              ? "Overview"
              : v === "calendar"
                ? "Calendar"
                : "Study mix"}
          </button>
        ))}
      </div>
      <div className="stats-filterbar">
        <div className="segmented" role="group" aria-label="Statistics period">
          {(view === "calendar"
            ? (["month", "year"] as const)
            : (["week", "month", "year", "all"] as const)
          ).map((p) => (
            <button
              key={p}
              aria-pressed={!custom && period === p}
              onClick={() => {
                setPeriod(p);
                setCustom(null);
                if (view !== "calendar") setAnchor(now);
                if (view === "calendar")
                  setCalendarScale(
                    p === "year" || p === "all" ? "year" : "month",
                  );
              }}
            >
              {p === "all" ? "All time" : p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        {(view !== "calendar" || calendarScale === "year") && (
          <>
            <div className="stats-date-controls">
              <button
                className="icon"
                aria-label="Previous period"
                disabled={!!custom || period === "all"}
                onClick={() => {
                  const at = shiftPeriod(period, anchor, -1);
                  setAnchor(at);
                  if (view === "calendar") setSelectedDay(dayKey(at));
                }}
              >
                <ChevronLeft size={16} />
              </button>
              {view === "calendar" ? (
                <span className="calendar-period-label">
                  {new Date(anchor).toLocaleDateString([], {
                    month: calendarScale === "month" ? "long" : undefined,
                    year: "numeric",
                  })}
                </span>
              ) : (
                <DateRangePicker
                  label="Statistics dates"
                  value={custom ?? currentRange}
                  now={now}
                  onChange={(v) => {
                    if (!v.from) {
                      setCustom(null);
                      setPeriod("all");
                      setAnchor(now);
                    } else setCustom(v);
                  }}
                />
              )}
              <button
                className="icon"
                aria-label="Next period"
                disabled={
                  !!custom ||
                  period === "all" ||
                  shiftPeriod(period, anchor, 1) > now
                }
                onClick={() => {
                  const at = shiftPeriod(period, anchor, 1);
                  setAnchor(at);
                  if (view === "calendar") setSelectedDay(dayKey(at));
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
        <label className="filter-select">
          <span>Subject</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          <span>Study type</span>
          <select
            value={studyType}
            onChange={(e) => setStudyType(e.target.value)}
          >
            <option value="">All study types</option>
            {studyTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {(subject || studyType || custom) && (
          <button className="text-button" onClick={reset}>
            Reset
          </button>
        )}
      </div>
      <div className="stat-cards">
        <div>
          <span>Study time</span>
          <strong>{duration(data.total)}</strong>
          <small>
            {previous?.total
              ? `${data.total >= previous.total ? "+" : ""}${Math.round(((data.total - previous.total) / previous.total) * 100)}% vs previous ${period}`
              : null}
          </small>
        </div>
        <div>
          <span>Sessions</span>
          <strong>{data.count}</strong>
          <small>Average {duration(data.average)}</small>
        </div>
        <div>
          <span>Active days</span>
          <strong>{data.activeDays}</strong>
          <small>
            {data.activeDays
              ? `${duration(data.total / data.activeDays)} per active day`
              : "No activity in this range"}
          </small>
        </div>
      </div>
      {view === "overview" ? (
        data.total === 0 ? (
          <section className="stats-empty panel">
            <EmptyLedger />
            <h2>
              {finished.length
                ? "No sessions match these filters"
                : "Your statistics start with one session"}
            </h2>
            <div>
              {finished.length ? (
                <>
                  <button className="secondary" onClick={reset}>
                    Reset filters
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setPeriod("all");
                      setCustom(null);
                    }}
                  >
                    All time
                  </button>
                </>
              ) : (
                <>
                  <button className="primary" onClick={onStart}>
                    Start a session
                  </button>
                  <button className="secondary" onClick={onAdd}>
                    Log past time
                  </button>
                </>
              )}
            </div>
          </section>
        ) : (
          <>
            <div className="stats-overview-grid">
              <section className="panel trend-panel">
                <div className="section-heading">
                  <h2>Study time</h2>
                  <button className="text-button" onClick={() => history()}>
                    View sessions
                    <ArrowRight size={14} />
                  </button>
                </div>
                <div
                  ref={chartRef}
                  className="trend-scroll"
                  tabIndex={0}
                  aria-label="Study duration chart; scroll for more dates"
                >
                  <div className="labeled-trend">
                    {buckets.map((b) => (
                      <button
                        key={b.key}
                        disabled={b.from > dayKey(now)}
                        aria-label={`${b.from}${b.to !== b.from ? ` through ${b.to}` : ""}: ${duration(b.ms)}. View sessions`}
                        onClick={() => history({ from: b.from, to: b.to })}
                      >
                        <strong>{b.ms ? duration(b.ms) : ""}</strong>
                        <div className="bar-space">
                          <i
                            style={{
                              height: `${b.ms ? Math.max(2, (b.ms / max) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {chartOverflow && (
                  <p className="scroll-cue">Scroll to see more dates.</p>
                )}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Time by</h2>
                  <div
                    className="segmented"
                    role="group"
                    aria-label="Breakdown"
                  >
                    <button
                      aria-pressed={breakdown === "subjects"}
                      onClick={() => setBreakdown("subjects")}
                    >
                      Subject
                    </button>
                    <button
                      aria-pressed={breakdown === "types"}
                      onClick={() => setBreakdown("types")}
                    >
                      Study type
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
                />
              </section>
            </div>
            <details className="patterns panel">
              <summary>
                Study patterns{" "}
                <span>
                  {duration(mix.median)} median session · Most time at{" "}
                  {hourLabel(hourPeak)}
                </span>
              </summary>
              <div className="patterns-body">
                <section>
                  <h3>Time of day</h3>
                  <div
                    className="hour-pattern"
                    role="img"
                    aria-label={data.hours
                      .map((ms, h) => `${hourLabel(h)} ${duration(ms)}`)
                      .join(", ")}
                  >
                    {data.hours.map((ms, h) => (
                      <div key={h} title={`${hourLabel(h)}: ${duration(ms)}`}>
                        <i
                          style={{
                            height: `${(ms / Math.max(1, ...data.hours)) * 100}%`,
                          }}
                        />
                        <small>{h % 6 === 0 ? hourLabel(h) : ""}</small>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h3>Session method</h3>
                  <div className="mode-totals">
                    {Object.entries(mix.modes).map(([mode, ms]) => (
                      <div key={mode}>
                        <span>
                          {mode === "manual"
                            ? "Manual entry"
                            : MODE_NAMES[mode as keyof typeof MODE_NAMES]}
                        </span>
                        <strong>{duration(ms)}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </details>
          </>
        )
      ) : view === "mix" ? (
        <section className="panel study-mix-panel">
          <div className="section-heading">
            <div>
              <h2>Subject × study type</h2>
              <p className="hint">Select a duration to see its sessions.</p>
            </div>
            <span>{duration(data.total)} total</span>
          </div>
          {data.total ? (
            <div
              className="mix-scroll"
              tabIndex={0}
              aria-label="Study mix; scroll horizontally for more study types"
            >
              <table className="mix-table">
                <caption className="sr-only">
                  Recorded study time by subject and study type
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Subject</th>
                    {studyTypes
                      .filter((t) =>
                        Object.values(mix.matrix).some((row) => row[t.id]),
                      )
                      .map((t) => (
                        <th scope="col" key={t.id}>
                          {t.name}
                        </th>
                      ))}
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedSubjects(data, subjects).map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.subject?.name}</th>
                      {studyTypes
                        .filter((t) =>
                          Object.values(mix.matrix).some((row) => row[t.id]),
                        )
                        .map((t) => {
                          const ms = mix.matrix[row.id]?.[t.id] ?? 0;
                          return (
                            <td key={t.id}>
                              {ms ? (
                                <button
                                  className="mix-value"
                                  onClick={() =>
                                    history({
                                      subject: row.id,
                                      studyType: t.id,
                                    })
                                  }
                                  aria-label={`${row.subject?.name}, ${t.name}, ${duration(ms)}. View sessions`}
                                >
                                  {duration(ms)}
                                </button>
                              ) : (
                                <span className="muted">–</span>
                              )}
                            </td>
                          );
                        })}
                      <td>
                        <strong>{duration(row.ms)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty compact">
              <h3>No study time in this range</h3>
              <button className="secondary" onClick={reset}>
                Reset filters
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="panel activity-panel">
          <div className="section-heading">
            <h2>Study calendar</h2>
          </div>
          {calendarScale === "year" ? (
            <div className="year-month-grid">
              {Array.from({ length: 12 }, (_, m) => {
                const at = +new Date(year, m, 1, 12),
                  next = shiftMonth(at, 1),
                  monthData = analyze(
                    scoped,
                    dayStart(at),
                    dayStart(next),
                    Infinity,
                  );
                return (
                  <button
                    className="year-month"
                    key={m}
                    disabled={monthStart(at) > monthStart(now)}
                    onClick={() => {
                      setCalendarScale("month");
                      setPeriod("month");
                      setAnchor(at);
                      setCustom(null);
                      setSelectedDay(dayKey(at));
                    }}
                  >
                    <span>
                      <strong>
                        {new Date(at).toLocaleDateString([], { month: "long" })}
                      </strong>
                      <small>{duration(monthData.total)}</small>
                    </span>
                    <div
                      className="mini-month"
                      role="img"
                      aria-label={`${monthData.activeDays} active days`}
                    >
                      {Array.from(
                        { length: new Date(year, m + 1, 0).getDate() },
                        (_, i) => {
                          const key = dayKey(+new Date(year, m, i + 1));
                          return (
                            <i
                              key={i}
                              data-active={
                                !!yearData.days[key]?.total || undefined
                              }
                            />
                          );
                        },
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="activity-month-layout">
              <MonthCalendar
                month={monthStart(anchor)}
                onMonth={(at) => {
                  setAnchor(at);
                  setPeriod("month");
                  setCustom(null);
                  setSelectedDay(dayKey(at));
                }}
                selected={selectedDay}
                onSelect={setSelectedDay}
                totals={yearData.days}
                now={now}
              />
              <aside className="day-detail">
                <span className="eyebrow">Selected day</span>
                <h3>
                  {new Date(dateAt(selectedDay)).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    weekday: "long",
                  })}
                </h3>
                <strong className="day-total">{duration(dayData.total)}</strong>
                <span className="muted">
                  {dayData.count} {dayData.count === 1 ? "session" : "sessions"}
                </span>
                {dayData.total ? (
                  <>
                    <SubjectBreakdown data={dayData} subjects={subjects} />
                    <button
                      className="secondary"
                      onClick={() =>
                        history({ from: selectedDay, to: selectedDay })
                      }
                    >
                      View day's sessions
                      <ArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <div className="day-empty">
                    <CalendarDays size={22} />
                    <span>No study time</span>
                    <button className="text-button" onClick={onAdd}>
                      Log past time
                    </button>
                  </div>
                )}
              </aside>
            </div>
          )}
          <p className="calendar-zone">
            Dates use {Intl.DateTimeFormat().resolvedOptions().timeZone}.
          </p>
        </section>
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
