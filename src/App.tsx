import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Check,
  Settings2,
  X,
  Timer as TimerIcon,
  History as HistoryIcon,
  ChartNoAxesCombined,
  CircleAlert,
  RotateCcw,
} from "lucide-react";
import { Timer } from "./components/Timer";
import { Today } from "./components/Today";
import { History } from "./components/History";
import { Insights } from "./components/Insights";
import { Settings } from "./components/Settings";
import { Subjects } from "./components/Subjects";
import { SessionEditor } from "./components/SessionEditor";
import { Dialog, Confirm } from "./components/Dialog";
import { useClock, useStudyStore } from "./lib/store";
import type { Session, SessionDraft, HistoryFilter } from "./lib/types";
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
  const { data, error, setError, busy, busySince, mutate, refresh } =
    useStudyStore();
  const now = useClock();
  const mini = new URLSearchParams(location.search).get("window") === "mini";
  const [page, setPage] = useState<"today" | "history" | "insights">("today");
  const [focus, setFocus] = useState(false);
  const [settings, setSettings] = useState(false);
  const [manage, setManage] = useState<"subject" | "study_type" | null>(null);
  const [pendingManual, setPendingManual] = useState(false);
  const [draft, setDraft] = useState<SessionDraft>();
  const [quitConfirm, setQuitConfirm] = useState(false);
  const draftRef = useRef(false),
    allowClose = useRef(false);
  const saveDraft = useCallback((next?: Omit<SessionDraft, "version">) => {
    setDraft((previous) =>
      next ? { ...next, version: previous?.version ?? 0 } : undefined,
    );
  }, []);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>({});
  const [editor, setEditor] = useState<Session | "new" | null>(null);
  const active = data?.sessions.find((s) => s.endedAt === null);
  const breakState = data?.timerState.break;
  useEffect(() => {
    draftRef.current = !!editor || !!manage || (!!draft && !active);
  }, [draft, active, editor, manage]);
  useEffect(() => {
    if (mini) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void getCurrentWindow()
      .onCloseRequested((event) => {
        if (draftRef.current && !allowClose.current) {
          event.preventDefault();
          setQuitConfirm(true);
        }
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
  }, [mini]);
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
  const theme = data?.settings.theme,
    font = data?.settings.font;
  useEffect(() => {
    document.documentElement.classList.add("theme-changing");
    if (theme) document.documentElement.dataset.theme = theme;
    if (font) document.documentElement.dataset.font = font;
    void document.documentElement.offsetHeight;
    const frame = requestAnimationFrame(() =>
      document.documentElement.classList.remove("theme-changing"),
    );
    return () => cancelAnimationFrame(frame);
  }, [theme, font]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `Margin · ${page === "insights" ? "Statistics" : page[0].toUpperCase() + page.slice(1)}`;
    if (!mini && !focus)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>("main h1")
          ?.focus({ preventScroll: true }),
      );
  }, [page, mini, focus]);
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
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "Escape" && focus) {
        e.preventDefault();
        void toggleFocus();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key.toLowerCase() === "m") {
          e.preventDefault();
          void doNative("open_mini");
          return;
        }
        if ((e.key === "2" || e.key === "3") && !mini) {
          e.preventDefault();
          setPage(e.key === "2" ? "history" : "insights");
          return;
        }
        if (e.key === "1") {
          e.preventDefault();
          if (mini) void doNative("show_main");
          else setPage("today");
          return;
        }
        if (e.key.toLowerCase() === "k" && !mini) {
          e.preventDefault();
          setPage("today");
          requestAnimationFrame(() =>
            document.getElementById("subject-field")?.focus(),
          );
          return;
        }
      }
      const target = e.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,select,[contenteditable="true"],button,a',
        )
      )
        return;
      if (e.code === "Space" && !e.repeat) {
        if (active) {
          e.preventDefault();
          void mutate({
            kind: active.segments.some((p) => p.end === null)
              ? "pause"
              : "resume",
            id: active.id,
          });
        } else if (breakState) {
          e.preventDefault();
          void mutate({
            kind: "break_action",
            sessionId: breakState.sessionId,
            action: breakState.runningSince === null ? "resume" : "pause",
          });
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, breakState, doNative, focus, mini, mutate, toggleFocus]);
  function openHistory(filter: HistoryFilter = {}) {
    setHistoryFilter(filter);
    setPage("history");
  }
  function repeatSession(s: Session) {
    if (active || breakState) {
      setError(
        "Finish the current session or skip the break before preparing another.",
      );
      return;
    }
    const subject = data?.subjects.find(
        (x) => x.id === s.subjectId && !x.archived,
      ),
      type = data?.studyTypes.find(
        (x) => x.id === s.studyTypeId && !x.archived,
      );
    if (!subject || !type) {
      setError(
        "Restore this subject and study type before repeating the session.",
      );
      return;
    }
    setDraft((p) => ({
      subject: subject.name,
      studyType: type.name,
      note: p?.note,
      version: (p?.version ?? 0) + 1,
    }));
    setPage("today");
  }
  function addSession() {
    if (!data?.subjects.some((s) => !s.archived)) {
      setPendingManual(true);
      setManage("subject");
      return;
    }
    if (!data.studyTypes.some((type) => !type.archived)) {
      setPendingManual(true);
      setManage("study_type");
      return;
    }
    setPendingManual(false);
    setEditor("new");
  }
  if (!data)
    return (
      <main className="loading">
        <div className="brand">
          <Mark />
          <span>Margin</span>
        </div>
        <p role={error ? "alert" : "status"}>
          {error ? (
            <>
              <CircleAlert size={18} /> {error}
            </>
          ) : (
            "Opening your study journal…"
          )}
        </p>
        {error && (
          <button
            className="secondary"
            onClick={() => {
              setError("");
              void refresh(true);
            }}
          >
            Retry
          </button>
        )}
      </main>
    );
  const notice = data.timerState.notice;
  const noticeText =
    notice?.kind === "break"
      ? "Break finished"
      : notice?.kind === "pomodoro"
        ? "Focus complete"
        : notice?.kind === "countdown"
          ? "Countdown complete"
          : "Session saved";
  const timer = (
    <Timer
      key={draft?.version ?? 0}
      draft={draft}
      onDraftChange={mini ? undefined : saveDraft}
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
      onFinish={(id) => {
        void mutate({ kind: "finish", id });
      }}
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
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <header className="app-header">
            <div className="header-inner">
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
                      aria-label={
                        destination === "insights"
                          ? "Statistics"
                          : destination[0].toUpperCase() + destination.slice(1)
                      }
                      title={`${destination === "insights" ? "Statistics" : destination[0].toUpperCase() + destination.slice(1)} · ⌘/Ctrl ${destination === "today" ? 1 : destination === "history" ? 2 : 3}`}
                      aria-current={page === destination ? "page" : undefined}
                      key={destination}
                      onClick={() => setPage(destination)}
                    >
                      {destination === "today" ? (
                        <TimerIcon size={18} />
                      ) : destination === "history" ? (
                        <HistoryIcon size={18} />
                      ) : (
                        <ChartNoAxesCombined size={18} />
                      )}
                      <span>
                        {destination === "insights"
                          ? "Statistics"
                          : destination[0].toUpperCase() + destination.slice(1)}
                      </span>
                    </button>
                  ),
                )}
              </nav>
              <div className="rail-bottom">
                <button
                  className="settings-trigger"
                  aria-label="Open settings"
                  title="Settings"
                  onClick={() => setSettings(true)}
                >
                  <Settings2 size={18} />
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </header>
        </>
      )}
      {data.recoveredId && active && !mini && (
        <div className="recovery">
          <div>
            <strong>Session restored</strong>
            <p>
              {active.segments.some((p) => p.end === null)
                ? "Running time includes time away. Finish and edit it in History to correct it."
                : "This session is paused."}
            </p>
          </div>
          <button
            className="icon"
            aria-label="Dismiss recovery notice"
            onClick={() =>
              void mutate({ kind: "acknowledge_recovery", id: active.id })
            }
          >
            <X size={16} />
          </button>
        </div>
      )}
      <main
        id="main"
        tabIndex={-1}
        className={mini || focus ? "timer-main" : "main-content"}
      >
        {mini || focus ? (
          timer
        ) : page === "today" ? (
          <Today
            data={data}
            now={now}
            timer={timer}
            onAdd={addSession}
            onHistory={() => openHistory()}
            onRepeat={repeatSession}
            mutate={mutate}
            busy={busy}
            onEdit={setEditor}
          />
        ) : page === "history" ? (
          <History
            key={JSON.stringify(historyFilter)}
            initialFilter={historyFilter}
            now={now}
            onRepeat={repeatSession}
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
            onStart={() => setPage("today")}
            onAdd={addSession}
            onHistory={openHistory}
          />
        )}
      </main>
      {busy && now - busySince > 8000 && (
        <div className="local-save-status" role="status">
          Still saving on this computer. Keep Margin open.
        </div>
      )}
      <div
        className={`notice-region ${notice && !mini ? "has-notice" : ""}`}
        role="status"
      >
        {notice && !mini && (
          <div className="saved-message">
            <span>
              <Check size={16} />
              {noticeText}
            </span>
            {notice.kind !== "break" && (
              <button
                className="text-button"
                onClick={() => {
                  const s = data.sessions.find(
                    (s) => s.id === notice.sessionId,
                  );
                  if (s) setEditor(s);
                }}
              >
                Add note
              </button>
            )}
            <button
              className="icon"
              aria-label="Dismiss timer notice"
              onClick={() =>
                void mutate({ kind: "dismiss_notice", id: notice.id })
              }
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      {settings && (
        <Settings
          settings={data.settings}
          mutate={mutate}
          busy={busy}
          onClose={() => setSettings(false)}
          onRefresh={refresh}
        />
      )}
      {manage && (
        <Subjects
          key={manage}
          mode={manage}
          subjects={manage === "subject" ? data.subjects : data.studyTypes}
          usedIds={
            new Set(
              data.sessions.map((s) =>
                manage === "subject" ? s.subjectId : s.studyTypeId,
              ),
            )
          }
          mutate={mutate}
          busy={busy}
          onClose={() => {
            setManage(null);
            if (
              pendingManual &&
              (manage === "subject" ? data.subjects : data.studyTypes).some(
                (choice) => !choice.archived,
              )
            )
              addSession();
            else setPendingManual(false);
          }}
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
        <Dialog title="Couldn’t complete that" onClose={() => setError("")}>
          <p className="field-error" role="alert">
            <CircleAlert size={18} />
            <span>{error}</span>
          </p>
          <p className="dialog-copy">
            Your input is kept. Refresh to check the saved state, then try the
            action again.
          </p>
          <footer>
            <button className="secondary" onClick={() => setError("")}>
              Close
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void refresh(true)}
            >
              <RotateCcw size={15} />
              Refresh data
            </button>
          </footer>
        </Dialog>
      )}
      {quitConfirm && (
        <Confirm
          title="Close Margin?"
          label="Discard & close"
          busy={busy}
          onClose={() => setQuitConfirm(false)}
          onConfirm={() => {
            allowClose.current = true;
            void getCurrentWindow()
              .close()
              .catch((e) => {
                allowClose.current = false;
                setError(String(e));
              });
          }}
        >
          Unsaved input in this window will be discarded. Keep Margin open to
          continue editing. Saved sessions and the current timer are kept.
        </Confirm>
      )}
    </div>
  );
}
