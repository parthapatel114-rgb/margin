import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowRight, Check, Plus, Settings2, X } from "lucide-react";
import { Timer } from "./components/Timer";
import { History, SessionRows } from "./components/History";
import { Insights } from "./components/Insights";
import { Settings } from "./components/Settings";
import { Subjects } from "./components/Subjects";
import { SessionEditor } from "./components/SessionEditor";
import { Dialog } from "./components/Dialog";
import {
  addDays,
  analyze,
  dayKey,
  dayStart,
  duration,
  weekStart,
} from "./lib/analytics";
import { useClock, useStudyStore } from "./lib/store";
import type { Session } from "./lib/types";
function Mark() {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <rect x="12" y="10" width="8" height="44" rx="3" />
      <rect x="28" y="20" width="8" height="34" rx="3" />
      <rect x="44" y="10" width="8" height="28" rx="3" />
      <rect x="44" y="46" width="8" height="8" rx="2" />
    </svg>
  );
}
export function App() {
  const { data, error, setError, busy, mutate, refresh } = useStudyStore();
  const now = useClock();
  const mini = new URLSearchParams(location.search).get("window") === "mini";
  const [page, setPage] = useState<"today" | "history" | "insights">("today");
  const [focus, setFocus] = useState(false);
  const [settings, setSettings] = useState(false);
  const [manage, setManage] = useState<"subject" | "study_type" | null>(null);
  const [editor, setEditor] = useState<Session | "new" | null>(null);
  const [finished, setFinished] = useState<string | null>(null);
  const active = data?.sessions.find((s) => s.endedAt === null);
  const doNative = useCallback(
    async (command: string) => {
      try {
        await invoke(command);
      } catch (e) {
        setError(String(e));
      }
    },
    [setError],
  );
  const toggleFocus = useCallback(async () => {
    try {
      const w = getCurrentWindow();
      const next = !(await w.isFullscreen());
      await w.setFullscreen(next);
      setFocus(next);
    } catch (e) {
      setError(String(e));
    }
  }, [setError]);
  const finish = useCallback(
    async (id: string) => {
      if (await mutate({ kind: "finish", id })) {
        setFinished(id);
      }
    },
    [mutate],
  );
  const theme = data?.settings.theme,
    font = data?.settings.font;
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    if (font) document.documentElement.dataset.font = font;
  }, [theme, font]);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    getCurrentWindow()
      .onResized(() => {
        void getCurrentWindow().isFullscreen().then(setFocus);
      })
      .then((fn) => {
        if (disposed) fn();
        else cleanup = fn;
      })
      .catch(() => {});
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focus) {
        e.preventDefault();
        void toggleFocus();
        return;
      }
      if (document.querySelector("dialog[open]")) return;
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key.toLowerCase() === "m") {
          e.preventDefault();
          void doNative("open_mini");
        }
        if (e.key === "1") {
          e.preventDefault();
          if (mini) void doNative("show_main");
          else setPage("today");
        }
        if (e.key.toLowerCase() === "k" && !mini) {
          e.preventDefault();
          setPage("today");
          requestAnimationFrame(() =>
            document.getElementById("subject-field")?.focus(),
          );
        }
      }
      if (
        e.code === "Space" &&
        active &&
        !target.closest("button,a") &&
        !e.repeat
      ) {
        e.preventDefault();
        void mutate({
          kind: active.segments.some((p) => p.end === null)
            ? "pause"
            : "resume",
          id: active.id,
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, doNative, focus, mini, mutate, toggleFocus]);
  const todayStart = dayStart(now);
  const week = weekStart(now);
  const totals = useMemo(
    () => (data ? analyze(data.sessions, week, addDays(week, 7), now) : null),
    [data, week, now],
  );
  const today = totals?.days[dayKey(todayStart)]?.total ?? 0;
  const finishedSessions = useMemo(
    () => data?.sessions.filter((s) => s.endedAt !== null) ?? [],
    [data],
  );
  function addSession() {
    if (!data?.subjects.some((s) => !s.archived)) {
      setManage("subject");
      return;
    }
    setEditor("new");
  }
  if (!data)
    return (
      <main className="loading">
        <div className="brand">
          <Mark />
          <span>Margin</span>
        </div>
        <p>{error || "Opening your study journal…"}</p>
        {error && (
          <button
            className="secondary"
            onClick={() => {
              setError("");
              void refresh();
            }}
          >
            Try again
          </button>
        )}
      </main>
    );
  const timer = (
    <Timer
      data={data}
      active={active}
      now={now}
      mutate={mutate}
      busy={busy}
      mini={mini}
      focus={focus}
      onFocus={() => void toggleFocus()}
      onMini={() => void doNative("open_mini")}
      onSubjects={() => setManage("subject")}
      onTypes={() => setManage("study_type")}
      onFinish={(id) => void finish(id)}
      onMain={() => void doNative("show_main")}
      onCloseMini={() => {
        void getCurrentWindow()
          .close()
          .catch((e) => setError(String(e)));
      }}
    />
  );
  return (
    <div
      className={`app ${mini ? "mini-app" : ""} ${focus ? "focus-app" : ""}`}
    >
      {!mini && !focus && (
        <>
          <header className="app-header">
            <button
              className="brand"
              aria-label="Margin Today"
              onClick={() => setPage("today")}
            >
              <Mark />
              <span>Margin</span>
            </button>
            <nav aria-label="Main navigation">
              {(["today", "history", "insights"] as const).map(
                (destination) => (
                  <button
                    aria-current={page === destination ? "page" : undefined}
                    key={destination}
                    onClick={() => setPage(destination)}
                  >
                    {destination[0].toUpperCase() + destination.slice(1)}
                  </button>
                ),
              )}
            </nav>
            <button
              className="icon settings-trigger"
              aria-label="Open settings"
              title="Settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={18} />
            </button>
          </header>
        </>
      )}
      {data.recoveredId && active && !mini && (
        <div className="recovery">
          <div>
            <strong>Your unfinished session is here.</strong>
            <p>
              {active.segments.some((p) => p.end === null)
                ? "Running time includes time asleep or away. Pause or finish, then edit the session in History if needed."
                : "Your session was paused. Resume when you’re ready."}
            </p>
          </div>
          <button
            className="text-button"
            onClick={() =>
              void mutate({ kind: "acknowledge_recovery", id: active.id })
            }
          >
            Got it <Check size={14} />
          </button>
        </div>
      )}
      {finished && !mini && !focus && (
        <div className="saved-message" role="status">
          <span>
            <Check size={15} />
            Session saved.
          </span>
          <button
            className="text-button"
            onClick={() => {
              const s = data.sessions.find((s) => s.id === finished);
              if (s) setEditor(s);
            }}
          >
            Add a note
          </button>
          <button
            className="icon"
            aria-label="Dismiss saved message"
            onClick={() => setFinished(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <main className={mini || focus ? "timer-main" : "main-content"}>
        {mini || focus ? (
          timer
        ) : page === "today" ? (
          <>
            <div className="today-heading">
              <div>
                <span className="eyebrow">
                  {new Date(now)
                    .toLocaleDateString([], {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                    .toUpperCase()}
                </span>
                <h1>A little time, well spent.</h1>
              </div>
              <span className="local-label">
                <i />
                Saved on this computer
              </span>
            </div>
            {timer}
            <section className="today-summary">
              <div className="today-totals">
                <div>
                  <span>Today</span>
                  <strong>{duration(today)}</strong>
                </div>
                <div>
                  <span>This week</span>
                  <strong>{duration(totals?.total ?? 0)}</strong>
                </div>
              </div>
              <div className="week-strip" aria-label="This week's study time">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(week, i);
                  const ms = totals?.days[dayKey(date)]?.total ?? 0;
                  const max = Math.max(
                    3600000,
                    ...Object.values(totals?.days ?? {}).map((d) => d.total),
                  );
                  return (
                    <div
                      className={dayKey(date) === dayKey(now) ? "current" : ""}
                      key={i}
                      title={`${new Date(date).toLocaleDateString()}: ${duration(ms)}`}
                    >
                      <div className="week-bar">
                        <span
                          style={{
                            height: `${ms ? Math.max(5, (ms / max) * 100) : 3}%`,
                          }}
                        />
                      </div>
                      <span>
                        {new Date(date).toLocaleDateString([], {
                          weekday: "narrow",
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
                <div>
                  <button className="text-button" onClick={addSession}>
                    <Plus size={14} />
                    Add time
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setPage("history")}
                  >
                    View history <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              {finishedSessions.length ? (
                <SessionRows
                  sessions={finishedSessions.slice(0, 3)}
                  subjects={data.subjects}
                  studyTypes={data.studyTypes}
                  onEdit={setEditor}
                />
              ) : (
                <div className="recent-empty">
                  <span>Your first session is a fresh page.</span>
                  <p>Start the timer above. We’ll keep the record.</p>
                </div>
              )}
            </section>
            <footer className="app-footer">
              <span>A simple timer. A meaningful history.</span>
              <span>Local by design.</span>
            </footer>
          </>
        ) : page === "history" ? (
          <History
            sessions={data.sessions}
            subjects={data.subjects}
            studyTypes={data.studyTypes}
            mutate={mutate}
            busy={busy}
            onEdit={setEditor}
            onAdd={addSession}
          />
        ) : (
          <Insights
            sessions={data.sessions}
            subjects={data.subjects}
            studyTypes={data.studyTypes}
            now={now}
          />
        )}
      </main>
      {settings && (
        <Settings
          settings={data.settings}
          mutate={mutate}
          busy={busy}
          onClose={() => setSettings(false)}
          onError={setError}
          onRefresh={refresh}
        />
      )}
      {manage && (
        <Subjects
          key={manage}
          mode={manage}
          usedIds={
            new Set(
              data.sessions.map((s) =>
                manage === "subject" ? s.subjectId : s.studyTypeId,
              ),
            )
          }
          subjects={manage === "subject" ? data.subjects : data.studyTypes}
          mutate={mutate}
          busy={busy}
          onClose={() => setManage(null)}
        />
      )}
      {editor && (
        <SessionEditor
          session={editor === "new" ? undefined : editor}
          subjects={data.subjects}
          studyTypes={data.studyTypes}
          mutate={mutate}
          busy={busy}
          onClose={() => setEditor(null)}
        />
      )}
      {error && (
        <Dialog
          title="Something needs your attention"
          onClose={() => setError("")}
        >
          <p className="dialog-copy" role="alert">
            {error}
          </p>
          <footer>
            <button className="primary" onClick={() => setError("")}>
              Got it
            </button>
          </footer>
        </Dialog>
      )}
    </div>
  );
}
