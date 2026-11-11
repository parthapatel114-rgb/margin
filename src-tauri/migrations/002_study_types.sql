CREATE TABLE study_types (
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
 color TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1))
);
INSERT INTO study_types VALUES
 ('studying','Studying','#66816C',0),('reviewing','Reviewing','#657D94',0),
 ('practice','Practice','#8F755D',0),('reading','Reading','#89759E',0);
-- Rebuild within the migration transaction: SQLite does not permit adding a
-- foreign-key column with a non-null default to an already populated table.
CREATE TABLE sessions_v2 (
 id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES subjects(id),
 started_at INTEGER NOT NULL CHECK(started_at > 0), ended_at INTEGER,
 note TEXT NOT NULL DEFAULT '', source TEXT NOT NULL CHECK(source IN ('timer','manual')),
 time_zone TEXT NOT NULL, updated_at INTEGER NOT NULL,
 study_type_id TEXT NOT NULL REFERENCES study_types(id),
 CHECK(ended_at IS NULL OR ended_at >= started_at)
);
INSERT INTO sessions_v2 SELECT *, 'studying' FROM sessions;
CREATE TABLE segments_v2 (
 session_id TEXT NOT NULL REFERENCES sessions_v2(id) ON DELETE CASCADE,
 started_at INTEGER NOT NULL, ended_at INTEGER,
 PRIMARY KEY(session_id, started_at), CHECK(ended_at IS NULL OR ended_at >= started_at)
);
INSERT INTO segments_v2 SELECT * FROM segments;
DROP TABLE segments;
DROP TABLE sessions;
ALTER TABLE sessions_v2 RENAME TO sessions;
ALTER TABLE segments_v2 RENAME TO segments;
CREATE UNIQUE INDEX one_active_session ON sessions((1)) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX one_open_segment ON segments(session_id) WHERE ended_at IS NULL;
CREATE INDEX sessions_by_date ON sessions(started_at);
INSERT INTO settings VALUES('lastStudyType','studying');
PRAGMA user_version = 2;
