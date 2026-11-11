CREATE TABLE subjects (
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
 color TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1))
);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES subjects(id),
 started_at INTEGER NOT NULL CHECK(started_at > 0), ended_at INTEGER,
 note TEXT NOT NULL DEFAULT '', source TEXT NOT NULL CHECK(source IN ('timer','manual')),
 time_zone TEXT NOT NULL, updated_at INTEGER NOT NULL,
 CHECK(ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX one_active_session ON sessions((1)) WHERE ended_at IS NULL;
CREATE TABLE segments (
 session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 started_at INTEGER NOT NULL, ended_at INTEGER,
 PRIMARY KEY(session_id, started_at), CHECK(ended_at IS NULL OR ended_at >= started_at)
);
CREATE UNIQUE INDEX one_open_segment ON segments(session_id) WHERE ended_at IS NULL;
CREATE INDEX sessions_by_date ON sessions(started_at);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO settings VALUES('theme','light'),('font','inter'),('lastSubject',''),('alwaysOnTop','true');
PRAGMA user_version = 1;
