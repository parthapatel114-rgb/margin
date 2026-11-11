import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayKey, duration } from "../lib/analytics";
import {
  dateAt,
  datePresets,
  dateRangeLabel,
  monthCells,
  monthStart,
  orderedRange,
  shiftMonth,
  type DateRange,
} from "../lib/dates";
import { Dialog } from "./Dialog";
import { InlineError } from "./Feedback";

export function MonthCalendar({
  month,
  onMonth,
  onSelect,
  selected,
  range,
  totals,
  now,
  compact = false,
}: {
  month: number;
  onMonth: (at: number) => void;
  onSelect: (key: string) => void;
  selected?: string;
  range?: DateRange;
  totals?: Record<string, { total: number }>;
  now: number;
  compact?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    pending = useRef<string | null>(null);
  const id = useId();
  const today = dayKey(now),
    cells = monthCells(month),
    heading = new Date(month).toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });
  useEffect(() => {
    if (pending.current) {
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${pending.current}"]`)
        ?.focus();
      pending.current = null;
    }
  }, [month]);
  function move(e: React.KeyboardEvent<HTMLButtonElement>, at: number) {
    let next: number;
    const rtl =
      root.current && getComputedStyle(root.current).direction === "rtl";
    if (e.key === "ArrowLeft") next = addDays(at, rtl ? 1 : -1);
    else if (e.key === "ArrowRight") next = addDays(at, rtl ? -1 : 1);
    else if (e.key === "ArrowUp") next = addDays(at, -7);
    else if (e.key === "ArrowDown") next = addDays(at, 7);
    else if (e.key === "Home")
      next = addDays(at, -((new Date(at).getDay() + 6) % 7));
    else if (e.key === "End")
      next = addDays(at, 6 - ((new Date(at).getDay() + 6) % 7));
    else if (e.key === "PageUp" || e.key === "PageDown")
      next = shiftMonth(at, e.key === "PageUp" ? -1 : 1);
    else return;
    e.preventDefault();
    if (dayKey(next) > today) return;
    const target = dayKey(next);
    if (monthStart(next) !== monthStart(month)) {
      pending.current = target;
      onMonth(monthStart(next));
    } else
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)
        ?.focus();
  }
  return (
    <div
      className={`month-calendar ${compact ? "calendar-compact" : ""}`}
      ref={root}
    >
      <div className="month-heading">
        <button
          className="icon"
          aria-label={`Previous month before ${heading}`}
          onClick={() => onMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft size={16} />
        </button>
        <h3 id={id} aria-live="polite">
          {heading}
        </h3>
        <button
          className="icon"
          disabled={monthStart(month) >= monthStart(now)}
          aria-label={`Next month after ${heading}`}
          onClick={() => onMonth(shiftMonth(month, 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="month-weekdays" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="month-grid" role="group" aria-labelledby={id}>
        {cells.map((at, i) => {
          if (at === null)
            return <span key={`empty-${i}`} className="calendar-blank" />;
          const key = dayKey(at),
            total = totals?.[key]?.total ?? 0;
          const inRange =
              !!range?.from &&
              key >= range.from &&
              key <= (range.to || range.from),
            edge = key === range?.from || key === range?.to;
          return (
            <button
              type="button"
              key={key}
              data-date={key}
              disabled={key > today}
              aria-label={`${new Date(at).toLocaleDateString([], { dateStyle: "full" })}${totals ? `, ${duration(total)} study time` : ""}`}
              aria-pressed={selected === key || edge}
              aria-current={key === today ? "date" : undefined}
              data-in-range={inRange || undefined}
              data-range-edge={edge || undefined}
              data-active={total > 0 || undefined}
              onKeyDown={(e) => move(e, at)}
              onClick={() => onSelect(key)}
            >
              <span>{new Date(at).getDate()}</span>
              {totals && !compact && (
                <small>{total ? duration(total) : "–"}</small>
              )}
              {totals && compact && total > 0 && <i aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({
  value,
  onChange,
  now,
  label = "Date range",
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
  now: number;
  label?: string;
}) {
  const errorId = useId();
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value),
    [month, setMonth] = useState(monthStart(now)),
    [selectingEnd, setSelectingEnd] = useState(false);
  const select = (key: string) => {
    if (!selectingEnd) {
      setDraft({ from: key, to: "" });
      setSelectingEnd(true);
    } else {
      setDraft(orderedRange(draft.from, key));
      setSelectingEnd(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className="secondary date-range-trigger"
        aria-label={`${label}: ${dateRangeLabel(value)}`}
        aria-haspopup="dialog"
        onClick={() => {
          setTouched(false);
          setDraft({
            ...value,
            to: value.to > dayKey(now) ? dayKey(now) : value.to,
          });
          setMonth(monthStart(value.from ? dateAt(value.from) : now));
          setSelectingEnd(false);
          setOpen(true);
        }}
      >
        <CalendarDays size={16} />
        <span>{dateRangeLabel(value)}</span>
      </button>
      {open && (
        <Dialog title={label} onClose={() => setOpen(false)} wide>
          <div className="date-picker-layout">
            <div className="date-presets" aria-label="Quick date ranges">
              {datePresets(now).map((p) => (
                <button
                  className="secondary"
                  key={p.name}
                  aria-pressed={draft.from === p.from && draft.to === p.to}
                  onClick={() => {
                    setDraft({ from: p.from, to: p.to });
                    setMonth(monthStart(dateAt(p.from)));
                    setSelectingEnd(false);
                  }}
                >
                  {p.name}
                </button>
              ))}
              <button
                className="text-button"
                onClick={() => {
                  setDraft({ from: "", to: "" });
                  setSelectingEnd(false);
                }}
              >
                All dates
              </button>
            </div>
            <div className="date-calendar-panel">
              <div className="range-preview" role="status">
                <span>{dateRangeLabel(draft)}</span>
                <small>
                  {selectingEnd ? "Choose an end date" : "Choose a start date"}
                </small>
              </div>
              <MonthCalendar
                compact
                month={month}
                onMonth={setMonth}
                onSelect={select}
                range={draft}
                now={now}
              />
              <div className="range-text-inputs">
                <label>
                  From
                  <input
                    aria-invalid={touched && !validDraft(draft, dayKey(now))}
                    aria-describedby={
                      touched && !validDraft(draft, dayKey(now))
                        ? errorId
                        : undefined
                    }
                    onBlur={() => setTouched(true)}
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY-MM-DD"
                    value={draft.from}
                    onChange={(e) =>
                      setDraft({ ...draft, from: e.target.value })
                    }
                  />
                </label>
                <label>
                  To
                  <input
                    aria-invalid={touched && !validDraft(draft, dayKey(now))}
                    aria-describedby={
                      touched && !validDraft(draft, dayKey(now))
                        ? errorId
                        : undefined
                    }
                    onBlur={() => setTouched(true)}
                    type="text"
                    inputMode="numeric"
                    placeholder="YYYY-MM-DD"
                    value={draft.to}
                    onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                  />
                </label>
              </div>
            </div>
          </div>
          {touched && !validDraft(draft, dayKey(now)) && (
            <InlineError id={errorId}>
              Use valid dates in YYYY-MM-DD format, through today. Choose a
              start date before an end date.
            </InlineError>
          )}
          <footer>
            <button
              className="text-button"
              onClick={() => {
                onChange({ from: "", to: "" });
                setOpen(false);
              }}
            >
              Clear dates
            </button>
            <button className="secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={!validDraft(draft, dayKey(now))}
              onClick={() => {
                onChange(
                  draft.from
                    ? orderedRange(draft.from, draft.to || draft.from)
                    : { from: "", to: "" },
                );
                setOpen(false);
              }}
            >
              Apply range
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
function validDraft(value: DateRange, today: string) {
  return (
    [value.from, value.to].every(
      (key) =>
        !key ||
        (/^\d{4}-\d{2}-\d{2}$/.test(key) &&
          Number.isFinite(dateAt(key)) &&
          dateAt(key) >= 0 &&
          dayKey(dateAt(key)) === key &&
          key <= today),
    ) &&
    (!value.to || !!value.from)
  );
}
