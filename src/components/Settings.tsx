import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Check, Download, FolderOpen, Upload } from "lucide-react";
import { Dialog } from "./Dialog";
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
            ? `Restored. A safety backup of your previous data was saved to ${result.path}`
            : `Saved to ${result.path}`,
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
          role="tablist"
          aria-label="Settings sections"
        >
          {(["appearance", "timer", "data", "about"] as const).map((t) => (
            <button
              role="tab"
              aria-selected={tab === t}
              key={t}
              onClick={() => setTab(t)}
            >
              {t === "data"
                ? "Data & backups"
                : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {tab === "appearance" ? (
          <div className="settings-content">
            <h3>A space that feels like you.</h3>
            <p className="hint">Choose a palette. Every view will follow.</p>
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
                  <span className="theme-preview">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    {theme[0].toUpperCase() + theme.slice(1)}
                    {theme === settings.theme && <Check size={13} />}
                  </span>
                </button>
              ))}
            </div>
            <h3>Type, to your taste.</h3>
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
                  <span>Time well spent. 0123456789</span>
                  {font.id === settings.font && <Check size={15} />}
                </button>
              ))}
            </div>
            <p className="hint">
              Fonts are bundled with Margin and work offline.
            </p>
          </div>
        ) : tab === "timer" ? (
          <div className="settings-content">
            <h3>A timer that stays with you.</h3>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings.alwaysOnTop}
                onChange={(e) =>
                  void mutate({
                    kind: "setting",
                    key: "alwaysOnTop",
                    value: String(e.target.checked),
                  })
                }
              />
              Keep the mini timer above other windows
            </label>
            <p className="hint">
              Running time includes computer sleep and time while the app is
              closed. Pause before taking a break. Restored timers stay intact
              and can be corrected in History.
            </p>
            <p className="hint">
              Closing the mini timer keeps your session running. Closing the
              main window exits Margin; an unfinished session is restored next
              time.
            </p>
            <div className="shortcuts">
              <span>Pause / resume</span>
              <kbd>Space</kbd>
              <span>Focus subject</span>
              <kbd>⌘ / Ctrl K</kbd>
              <span>Open mini timer</span>
              <kbd>⌘ / Ctrl M</kbd>
              <span>Return to Today</span>
              <kbd>⌘ / Ctrl 1</kbd>
              <span>Leave focus mode</span>
              <kbd>Esc</kbd>
            </div>
          </div>
        ) : tab === "data" ? (
          <div className="settings-content">
            <h3>Your history belongs to you.</h3>
            <p className="hint">
              Subjects, sessions and settings are stored in a SQLite database in
              this computer’s application data directory. No accounts, uploads
              or cloud services.
            </p>
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
                Export history as CSV
              </button>
              <button
                className="secondary"
                disabled={working}
                onClick={() => void action("preview_import")}
              >
                <Upload size={16} />
                Restore JSON backup
              </button>
              <button
                className="secondary"
                disabled={working}
                onClick={() => void action("open_backups")}
              >
                <FolderOpen size={16} />
                Open safety backups
              </button>
            </div>
            <p className="hint">
              JSON includes all data, including an unfinished timer. CSV
              includes finished sessions. Restoring replaces current records
              after validation, and creates a safety backup first. Finish or
              discard any active session before restoring.
            </p>
            <p className="hint">
              Local storage survives browser clearing. It does not protect
              against a lost or failed computer. Export backups to a location
              you keep safe.
            </p>
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
          </div>
        ) : (
          <div className="settings-content about">
            <h3>
              Margin <small>0.1.0</small>
            </h3>
            <p>
              A small desktop app for keeping track of study time and seeing
              where the hours go.
            </p>
            <p className="hint">
              Built with Tauri, React and SQLite.
              <br />
              Open source under the MIT license.
              <br />
              Inter, DM Sans and IBM Plex Mono are bundled under the SIL Open
              Font License.
            </p>
            <p className="hint">
              No analytics tracking. No background requests.
              <br />A simple timer. A meaningful history.
            </p>
          </div>
        )}
      </Dialog>
      {preview && (
        <Dialog
          title="Replace your study data?"
          onClose={() => {
            setPreview(null);
            void action("cancel_import");
          }}
        >
          <p className="dialog-copy">
            This backup contains {preview.subjects} subjects,{" "}
            {preview.studyTypes} study types and {preview.sessions} sessions,
            exported {new Date(preview.exportedAt).toLocaleString()}.
            {preview.hasActive
              ? " Its unfinished timer will be restored with a recovery notice."
              : ""}
          </p>
          <p className="hint">
            Current data will be replaced. Margin will save a JSON safety backup
            of your current records before the transaction.
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
              Replace data & restore
            </button>
          </footer>
        </Dialog>
      )}
    </>
  );
}
