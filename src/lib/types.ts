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
}
export type Theme = "light" | "dark" | "warm" | "slate" | "forest" | "rose";
export type Font = "inter" | "dm-sans" | "plex-mono";
export interface Settings {
  theme: Theme;
  font: Font;
  lastSubject: string;
  lastStudyType: string;
  alwaysOnTop: boolean;
}
export interface Snapshot {
  subjects: Subject[];
  studyTypes: Subject[];
  sessions: Session[];
  settings: Settings;
  recoveredId: string | null;
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
  | { kind: "start"; subjectId: string; studyTypeId: string; timeZone: string }
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
