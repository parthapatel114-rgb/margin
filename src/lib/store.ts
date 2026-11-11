import { useCallback, useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Command, Snapshot } from "./types";
export function useStudyStore() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState(() =>
    isTauri()
      ? ""
      : "Open Margin as a desktop app with npm run dev. Study data is only available in the native application.",
  );
  const [busy, setBusy] = useState(false);
  const [busySince, setBusySince] = useState(0);
  const accept = useCallback(
    (s: Snapshot) => setData((p) => (p && p.revision > s.revision ? p : s)),
    [],
  );
  const refresh = useCallback(
    async (clearError = false) => {
      try {
        accept(await invoke<Snapshot>("snapshot"));
        if (clearError) setError("");
      } catch (e) {
        setError(String(e));
      }
    },
    [accept],
  );
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void listen("margin:changed", () => {
      void refresh();
    })
      .then((unlisten) => {
        if (disposed) unlisten();
        else {
          cleanup = unlisten;
          void refresh();
        }
      })
      .catch((e) => setError(String(e)));
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      disposed = true;
      cleanup?.();
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const mutate = useCallback(
    async (command: Command) => {
      setBusy(true);
      setBusySince(Date.now());
      try {
        const result = await invoke<Snapshot>("mutate", { command });
        accept(result);
        return result;
      } catch (e) {
        await refresh();
        setError(String(e));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [accept, refresh],
  );
  return { data, error, setError, busy, busySince, mutate, refresh };
}
export function useClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 500);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}
