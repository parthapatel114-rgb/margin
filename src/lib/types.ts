export interface Subject {
  id: string;
  name: string;
  color: string;
  archived: boolean;
}
export interface Segment {
  start: number;
  end: number | null;
}
export type TimerMode = "stopwatch" | "pomodoro" | "countdown";
export interface BreakState {
  sessionId: string;
  subjectId: string;
  studyTypeId: string;
  remainingMs: number;
  runningSince: number | null;
  totalMs: number;
  long: boolean;
}
export interface TimerState {
  cycle: number;
  break: BreakState | null;
  notice: {
    id: string;
    kind: "pomodoro" | "countdown" | "break" | "manual";
    sessionId: string;
  } | null;
}
export interface Session {
  id: string;
  subjectId: string;
  studyTypeId: string;
  startedAt: number;
  endedAt: number | null;
  note: string;
  source: "timer" | "manual";
  timeZone: string;
  updatedAt: number;
  segments: Segment[];
  timerMode: TimerMode;
  targetMs: number | null;
}
export type Theme = "light" | "dark" | "warm" | "slate" | "forest" | "rose";
export type Font = "inter" | "dm-sans" | "plex-mono";
export interface Settings {
  theme: Theme;
  font: Font;
  lastSubject: string;
  lastStudyType: string;
  alwaysOnTop: boolean;
  timerMode: TimerMode;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  countdownMinutes: number;
}
export interface Snapshot {
  subjects: Subject[];
  studyTypes: Subject[];
  sessions: Session[];
  settings: Settings;
  recoveredId: string | null;
  timerState: TimerState;
  revision: number;
}
export type Command =
  | {
      kind: "subject" | "study_type";
      id: string | null;
      name: string;
      color: string;
    }
  | {
      kind:
        | "archive_subject"
        | "archive_study_type"
        | "delete_subject"
        | "delete_study_type";
      id: string;
    }
  | {
      kind: "start";
      subjectId: string;
      studyTypeId: string;
      timeZone: string;
      timerMode: TimerMode;
      targetMs: number | null;
    }
  | {
      kind: "break_action";
      sessionId: string;
      action: "pause" | "resume" | "skip";
    }
  | { kind: "dismiss_notice"; id: string }
  | {
      kind:
        | "pause"
        | "resume"
        | "finish"
        | "cancel"
        | "delete_session"
        | "acknowledge_recovery";
      id: string;
    }
  | {
      kind: "session";
      id: string | null;
      subjectId: string;
      studyTypeId: string;
      startedAt: number;
      duration: number;
      note: string;
      timeZone: string;
      expectedUpdatedAt: number | null;
    }
  | { kind: "note"; id: string; note: string; expectedUpdatedAt: number }
  | { kind: "setting"; key: string; value: string };
export interface ImportPreview {
  subjects: number;
  studyTypes: number;
  sessions: number;
  exportedAt: number;
  hasActive: boolean;
}
export interface IoResult {
  path: string | null;
  preview: ImportPreview | null;
}
export type Mutate = (command: Command) => Promise<Snapshot | null>;
export const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
