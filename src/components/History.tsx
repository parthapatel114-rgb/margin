import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, RotateCcw, Search } from "lucide-react";
import { dayKey, duration, elapsed, analyze } from "../lib/analytics";
import type { Mutate, Session, Subject } from "../lib/types";
import { DateRangePicker } from "./Calendar";
import { rangeBounds } from "../lib/dates";
import type { HistoryFilter } from "../lib/types";
import { Confirm } from "./Dialog";
import { EmptyLedger } from "./Feedback";
export function SessionRows({
  sessions,
  subjects,
  studyTypes,
  onEdit,
  onDelete,
  onRepeat,
}: {
  sessions: Session[];
  subjects: Subject[];
  studyTypes: Subject[];
  onEdit: (s: Session) => void;
  onDelete?: (s: Session) => void;
  onRepeat?: (s: Session) => void;
}) {
  return (
    <div className="session-list">
      {sessions.map((s) => {
        const subject = subjects.find((x) => x.id === s.subjectId);
        return (
          <div className="session-row" key={s.id}>
            <i
              className="session-line"
              style={{ background: subject?.color ?? "var(--accent)" }}
            />
            <div className="session-details">
              <strong>{subject?.name ?? "Removed subject"}</strong>
              <span>
                {new Date(s.startedAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                —{" "}
                {new Date(s.endedAt!).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · " +
                  (studyTypes.find((t) => t.id === s.studyTypeId)?.name ??
                    "Studying") +
                  (s.source === "manual"
                    ? " · Manual"
                    : s.timerMode === "pomodoro"
                      ? " · Pomodoro"
                      : s.timerMode === "countdown"
                        ? " · Countdown"
                        : "")}
                {s.timeZone !== Intl.DateTimeFormat().resolvedOptions().timeZone
                  ? ` · Recorded in ${s.timeZone}`
                  : ""}
              </span>
              {s.note && <p>{s.note}</p>}
            </div>
            <span
              className="session-duration"
              title="Full session duration, excluding pauses"
            >
              {duration(elapsed(s))}
            </span>
            <button
              className="icon"
              aria-label={`Edit ${subject?.name ?? ""} session`}
              onClick={() => onEdit(s)}
            >
              <Pencil size={14} />
            </button>
            {onRepeat && (
              <button
                className="icon"
                title="Repeat session"
                aria-label={`Repeat ${subject?.name ?? ""} session`}
                onClick={() => onRepeat(s)}
              >
                <RotateCcw size={14} />
              </button>
            )}
            {onDelete && (
              <button
                className="icon"
                aria-label={`Delete ${subject?.name ?? ""} session`}
                onClick={() => onDelete(s)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function History({
  sessions,
  subjects,
  studyTypes,
  mutate,
  busy,
  onEdit,
  onAdd,
  onRepeat,
  initialFilter,
  now,
}: {
  sessions: Session[];
  subjects: Subject[];
  studyTypes: Subject[];
  mutate: Mutate;
  busy: boolean;
  onEdit: (s: Session) => void;
  onAdd: () => void;
  onRepeat: (s: Session) => void;
  initialFilter?: HistoryFilter;
  now: number;
}) {
  const [subject, setSubject] = useState(initialFilter?.subject ?? "");
  const [studyType, setStudyType] = useState(initialFilter?.studyType ?? "");
  const [from, setFrom] = useState(initialFilter?.from ?? "");
  const [to, setTo] = useState(initialFilter?.to ?? "");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [rangeFrom, rangeTo] = rangeBounds({ from, to }, now);
  const [removing, setRemoving] = useState<Session | null>(null);
  const [limit, setLimit] = useState(100);
  const filtered = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            s.endedAt !== null &&
            (!subject || s.subjectId === subject) &&
            (!studyType || s.studyTypeId === studyType) &&
            ((!from && !to) ||
              s.segments.some(
                (p) => p.start < rangeTo && (p.end ?? now) > rangeFrom,
              )) &&
            (!query.trim() ||
              [
                s.note,
                subjects.find((x) => x.id === s.subjectId)?.name,
                studyTypes.find((x) => x.id === s.studyTypeId)?.name,
              ]
                .join(" ")
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase())),
        )
        .sort((a, b) =>
          sort === "longest"
            ? elapsed(b) - elapsed(a)
            : sort === "oldest"
              ? a.startedAt - b.startedAt
              : b.startedAt - a.startedAt,
        ),
    [
      sessions,
      subject,
      studyType,
      from,
      to,
      rangeFrom,
      rangeTo,
      query,
      sort,
      subjects,
      studyTypes,
      now,
    ],
  );
  const hasFinished = sessions.some((s) => s.endedAt !== null);
  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered.slice(0, limit)) {
      const key = dayKey(s.startedAt);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map];
  }, [filtered, limit]);
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>History</h1>
        <button className="secondary" onClick={onAdd}>
          <Plus size={16} />
          Add time
        </button>
      </div>
      <div className="history-search">
        <Search size={16} />
        <input
          aria-label="Search sessions"
          type="search"
          placeholder="Search subjects, study types or notes"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(100);
          }}
        />
      </div>
      <div className="filters">
        <label>
          <span>Subject</span>
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setLimit(100);
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Study type</span>
          <select
            value={studyType}
            onChange={(e) => setStudyType(e.target.value)}
          >
            <option value="">All types</option>
            {studyTypes.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-date">
          <span>Date range</span>
          <DateRangePicker
            value={{ from, to }}
            now={now}
            onChange={(v) => {
              setFrom(v.from);
              setTo(v.to);
              setLimit(100);
            }}
          />
        </div>
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="longest">Longest first</option>
          </select>
        </label>
        {(subject || studyType || from || to || query) && (
          <button
            className="text-button"
            onClick={() => {
              setSubject("");
              setStudyType("");
              setFrom("");
              setTo("");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        )}
        <span className="filter-summary">
          {filtered.length} {filtered.length === 1 ? "session" : "sessions"} ·{" "}
          {duration(analyze(filtered, rangeFrom, rangeTo, now).total)}
          {from || to ? " in range" : ""}
        </span>
      </div>
      {groups.length ? (
        groups.map(([date, items]) => (
          <section key={date} className="history-day">
            <div className="section-heading">
              <h2>
                {new Date(`${date}T12:00`).toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <span>{duration(items.reduce((n, s) => n + elapsed(s), 0))}</span>
            </div>
            <SessionRows
              sessions={items}
              subjects={subjects}
              studyTypes={studyTypes}
              onEdit={onEdit}
              onDelete={setRemoving}
              onRepeat={onRepeat}
            />
          </section>
        ))
      ) : (
        <div className="empty">
          <EmptyLedger />
          <h2>
            {hasFinished ? "No matching sessions" : "No finished sessions yet"}
          </h2>
          {hasFinished ? (
            <button
              className="secondary"
              onClick={() => {
                setSubject("");
                setStudyType("");
                setFrom("");
                setTo("");
                setQuery("");
              }}
            >
              Clear filters
            </button>
          ) : (
            <button className="secondary" onClick={onAdd}>
              Add time
            </button>
          )}
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="secondary load-more"
          onClick={() => setLimit((n) => n + 100)}
        >
          Show more sessions
        </button>
      )}
      {removing && (
        <Confirm
          title="Delete this session?"
          busy={busy}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            if (await mutate({ kind: "delete_session", id: removing.id }))
              setRemoving(null);
          }}
        >
          This permanently removes {duration(elapsed(removing))} from your
          history and statistics. Export a backup first if you want to keep a
          copy.
        </Confirm>
      )}
    </>
  );
}
