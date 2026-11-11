import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, Download, FolderOpen, Upload } from "lucide-react";
import { Dialog } from "./Dialog";
import { DurationField } from "./DurationField";
import type {
  Font,
  ImportPreview,
  IoResult,
  Mutate,
  Settings as Preferences,
  Theme,
} from "../lib/types";
const themes: Theme[] = ["light", "dark", "warm", "slate", "forest", "rose"];
const fonts: { id: Font; name: string; family: string }[] = [
  { id: "inter", name: "Inter", family: "Inter Variable" },
  { id: "dm-sans", name: "DM Sans", family: "DM Sans Variable" },
  { id: "plex-mono", name: "IBM Plex Mono", family: "IBM Plex Mono" },
];
export function Settings({
  settings,
  mutate,
  busy,
  onClose,
  onError,
  onRefresh,
}: {
  settings: Preferences;
  mutate: Mutate;
  busy: boolean;
  onClose: () => void;
  onError: (s: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"appearance" | "timer" | "data" | "about">(
    "appearance",
  );
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  async function action(action: string) {
    setWorking(true);
    setNotice("");
    try {
      const result = await invoke<IoResult>("data_action", { action });
      if (result.preview) setPreview(result.preview);
      if (result.path)
        setNotice(
          action === "restore"
            ? `Restored. Safety backup: ${result.path}`
            : `Saved: ${result.path}`,
        );
      if (action === "restore") {
        setPreview(null);
        await onRefresh();
      }
    } catch (e) {
      onError(String(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <>
      <Dialog title="Settings" onClose={onClose} wide>
        <div
          className="settings-tabs"
          role="group"
          aria-label="Settings sections"
        >
          {(["appearance", "timer", "data", "about"] as const).map((t) => (
            <button aria-pressed={tab === t} key={t} onClick={() => setTab(t)}>
              {t === "data" ? "Data" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {tab === "appearance" ? (
          <div className="settings-content">
            <h3>Theme</h3>
            <div className="theme-grid">
              {themes.map((theme) => (
                <button
                  className="theme-option"
                  data-theme={theme}
                  aria-pressed={settings.theme === theme}
                  key={theme}
                  onClick={() =>
                    void mutate({ kind: "setting", key: "theme", value: theme })
                  }
                  disabled={busy}
                >
                  <span className="theme-preview" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    {theme[0].toUpperCase() + theme.slice(1)}
                    {theme === settings.theme && <Check size={14} />}
                  </span>
                </button>
              ))}
            </div>
            <h3>Font</h3>
            <div className="font-list">
              {fonts.map((font) => (
                <button
                  key={font.id}
                  aria-pressed={font.id === settings.font}
                  disabled={busy}
                  onClick={() =>
                    void mutate({
                      kind: "setting",
                      key: "font",
                      value: font.id,
                    })
                  }
                  style={{ fontFamily: font.family }}
                >
                  <span>{font.name}</span>
                  <span aria-hidden="true">Aa 0123456789</span>
                  {font.id === settings.font && <Check size={15} />}
                </button>
              ))}
            </div>
          </div>
        ) : tab === "timer" ? (
          <div className="settings-content">
            <h3>Timer defaults</h3>
            <div className="timer-settings-grid">
              <DurationField
                label="Focus"
                setting="focusMinutes"
                value={settings.focusMinutes}
                mutate={mutate}
                busy={busy}
              />
              <DurationField
                label="Short break"
                setting="shortBreakMinutes"
                value={settings.shortBreakMinutes}
                mutate={mutate}
                busy={busy}
              />
              <DurationField
                label="Long break"
                setting="longBreakMinutes"
                value={settings.longBreakMinutes}
                mutate={mutate}
                busy={busy}
              />
              <DurationField
                label="Countdown"
                setting="countdownMinutes"
                value={settings.countdownMinutes}
                mutate={mutate}
                busy={busy}
              />
            </div>
            <p className="hint">
              Pomodoro takes a long break after four completed focus sessions.
              Start each new focus session when you’re ready.
            </p>
            <details>
              <summary>Timer behavior & shortcuts</summary>
              <p className="hint">
                Running time includes computer sleep and time away. Pauses and
                breaks are excluded from study totals. The mini timer stays on
                top; closing it keeps the session running.
              </p>
              <div className="shortcuts">
                <span>Pause / resume</span>
                <kbd>Space</kbd>
                <span>Focus subject</span>
                <kbd>⌘ / Ctrl K</kbd>
                <span>Open mini timer</span>
                <kbd>⌘ / Ctrl M</kbd>
                <span>Open Today</span>
                <kbd>⌘ / Ctrl 1</kbd>
                <span>Exit fullscreen</span>
                <kbd>Esc</kbd>
              </div>
            </details>
          </div>
        ) : tab === "data" ? (
          <div className="settings-content">
            <h3>Backups & exports</h3>
            <div className="data-actions">
              <button
                className="secondary"
                disabled={working}
                onClick={() => void action("export_json")}
              >
                <Download size={16} />
                Export JSON backup
              </button>
              <button
                className="secondary"
                disabled={working}
                onClick={() => void action("export_csv")}
              >
                <Download size={16} />
                Export CSV history
              </button>
              <button
                className="secondary"
                disabled={working}
                onClick={() => void action("preview_import")}
              >
                <Upload size={16} />
                Restore backup
              </button>
              <button
                className="secondary"
                disabled={working}
                onClick={() => void action("open_backups")}
              >
                <FolderOpen size={16} />
                Open backup folder
              </button>
            </div>
            <p className="hint">
              Restoring replaces current data and saves a safety backup first.
            </p>
            <details>
              <summary>Storage & backup details</summary>
              <p className="hint">
                Data stays in this computer’s application data folder. JSON
                includes all sessions, timers and settings; CSV includes
                finished sessions. Finish a session or skip a break before
                restoring.
              </p>
              <p className="hint">
                Local storage survives browser clearing. Export backups to a
                safe location to protect against a lost or failed computer.
              </p>
            </details>
            <p className="notice" role="status">
              {notice}
            </p>
          </div>
        ) : (
          <div className="settings-content about">
            <h3>
              Margin <small>0.2.0</small>
            </h3>
            <p>Local study tracking.</p>
            <dl>
              <dt>License</dt>
              <dd>MIT</dd>
              <dt>Fonts</dt>
              <dd>
                Inter, DM Sans, IBM Plex Mono
                <br />
                SIL Open Font License
              </dd>
            </dl>
          </div>
        )}
      </Dialog>
      {preview && (
        <Dialog
          title="Replace study data?"
          onClose={() => {
            setPreview(null);
            void action("cancel_import");
          }}
        >
          <p className="dialog-copy">
            Restore {preview.sessions} sessions, {preview.subjects} subjects and{" "}
            {preview.studyTypes} study types from{" "}
            {new Date(preview.exportedAt).toLocaleDateString()}?
          </p>
          <p className="hint">
            Current data will be replaced. A safety backup will be saved first.
            {preview.hasActive
              ? " The backup includes an unfinished timer."
              : ""}
          </p>
          <footer>
            <button
              className="secondary"
              disabled={working}
              onClick={() => {
                setPreview(null);
                void action("cancel_import");
              }}
            >
              Cancel
            </button>
            <button
              className="danger"
              disabled={working}
              onClick={() => void action("restore")}
            >
              {working ? "Restoring…" : "Replace data"}
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
