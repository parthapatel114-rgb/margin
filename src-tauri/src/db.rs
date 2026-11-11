use crate::model::*;
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use std::{collections::HashSet, path::Path, time::Duration};
use uuid::Uuid;

pub type Result<T> = std::result::Result<T, String>;
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}
pub struct Database {
    pub conn: Connection,
    pub recovered_id: Option<String>,
    pub revision: u64,
    pub pending: Option<Backup>,
}
fn id() -> String {
    Uuid::new_v4().to_string()
}
fn text_valid(s: &str, max: usize) -> bool {
    !s.is_empty() && s.chars().count() <= max && !s.chars().any(|c| c.is_control())
}
fn color_valid(s: &str) -> bool {
    s.len() == 7 && s.starts_with('#') && s[1..].chars().all(|c| c.is_ascii_hexdigit())
}
pub fn validate_settings(s: &Settings) -> Result<()> {
    if !["light", "dark", "warm", "slate", "forest", "rose"].contains(&s.theme.as_str())
        || !["inter", "dm-sans", "plex-mono"].contains(&s.font.as_str())
    {
        return Err("Unknown appearance preset.".into());
    }
    Ok(())
}
impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        let mut conn = Connection::open(path).map_err(err)?;
        conn.busy_timeout(Duration::from_secs(5)).map_err(err)?;
        conn.execute_batch(
            "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
        )
        .map_err(err)?;
        let version: u32 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .map_err(err)?;
        if version > 2 {
            return Err(
                "This database was created by a newer Margin version. Please update Margin.".into(),
            );
        }
        if version == 0 {
            let tx = conn.transaction().map_err(err)?;
            tx.execute_batch(include_str!("../migrations/001_initial.sql"))
                .map_err(err)?;
            tx.commit().map_err(err)?;
        }
        if version < 2 {
            let tx = conn.transaction().map_err(err)?;
            tx.execute_batch(include_str!("../migrations/002_study_types.sql"))
                .map_err(err)?;
            tx.commit().map_err(err)?;
        }
        let recovered_id = conn
            .query_row("SELECT id FROM sessions WHERE ended_at IS NULL", [], |r| {
                r.get(0)
            })
            .optional()
            .map_err(err)?;
        Ok(Self {
            conn,
            recovered_id,
            revision: 0,
            pending: None,
        })
    }
    pub fn snapshot(&self) -> Result<Snapshot> {
        let subjects = self
            .conn
            .prepare(
                "SELECT id,name,color,archived FROM subjects ORDER BY archived,name COLLATE NOCASE",
            )
            .map_err(err)?
            .query_map([], |r| {
                Ok(Subject {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    color: r.get(2)?,
                    archived: r.get(3)?,
                })
            })
            .map_err(err)?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(err)?;
        let study_types = self.conn.prepare("SELECT id,name,color,archived FROM study_types ORDER BY archived,name COLLATE NOCASE").map_err(err)?.query_map([], |r| Ok(Subject { id:r.get(0)?,name:r.get(1)?,color:r.get(2)?,archived:r.get(3)? })).map_err(err)?.collect::<std::result::Result<Vec<_>,_>>().map_err(err)?;
        let mut sessions = self.conn.prepare("SELECT id,subject_id,started_at,ended_at,note,source,time_zone,updated_at,study_type_id FROM sessions ORDER BY started_at DESC").map_err(err)?.query_map([], |r| Ok(Session { id:r.get(0)?,subject_id:r.get(1)?,started_at:r.get(2)?,ended_at:r.get(3)?,note:r.get(4)?,source:r.get(5)?,time_zone:r.get(6)?,updated_at:r.get(7)?,study_type_id:r.get(8)?,segments:vec![] })).map_err(err)?.collect::<std::result::Result<Vec<_>,_>>().map_err(err)?;
        let mut stmt = self
            .conn
            .prepare(
                "SELECT started_at,ended_at FROM segments WHERE session_id=? ORDER BY started_at",
            )
            .map_err(err)?;
        for session in &mut sessions {
            session.segments = stmt
                .query_map([&session.id], |r| {
                    Ok(Segment {
                        start: r.get(0)?,
                        end: r.get(1)?,
                    })
                })
                .map_err(err)?
                .collect::<std::result::Result<Vec<_>, _>>()
                .map_err(err)?;
        }
        let get = |k: &str| {
            self.conn
                .query_row("SELECT value FROM settings WHERE key=?", [k], |r| {
                    r.get::<_, String>(0)
                })
                .map_err(err)
        };
        let settings = Settings {
            theme: get("theme")?,
            font: get("font")?,
            last_subject: get("lastSubject")?,
            last_study_type: get("lastStudyType")?,
            always_on_top: get("alwaysOnTop")? == "true",
        };
        Ok(Snapshot {
            subjects,
            study_types,
            sessions,
            settings,
            recovered_id: self.recovered_id.clone(),
            revision: self.revision,
        })
    }
    pub fn backup(&self) -> Result<Backup> {
        let s = self.snapshot()?;
        Ok(Backup {
            format: "margin-study".into(),
            version: 2,
            exported_at: now(),
            subjects: s.subjects,
            study_types: s.study_types,
            sessions: s.sessions,
            settings: s.settings,
        })
    }
    pub fn mutate(&mut self, command: Command, at: i64) -> Result<Snapshot> {
        let tx = self.conn.transaction().map_err(err)?;
        let mut clear_recovery = false;
        match command {
            Command::Subject {
                id: old_id,
                name,
                color,
            } => {
                let name = name.trim();
                if !text_valid(name, 80) || !color_valid(&color) {
                    return Err("Use a subject name of 1–80 characters and a valid color.".into());
                }
                if let Some(key) = old_id {
                    if tx
                        .execute(
                            "UPDATE subjects SET name=?,color=? WHERE id=?",
                            params![name, color, key],
                        )
                        .map_err(|_| "That subject name is already in use.".to_string())?
                        == 0
                    {
                        return Err("Subject no longer exists.".into());
                    }
                } else if let Some(key) = tx
                    .query_row(
                        "SELECT id FROM subjects WHERE name=? COLLATE NOCASE",
                        [name],
                        |r| r.get::<_, String>(0),
                    )
                    .optional()
                    .map_err(err)?
                {
                    tx.execute("UPDATE subjects SET archived=0 WHERE id=?", [&key])
                        .map_err(err)?;
                    tx.execute(
                        "UPDATE settings SET value=? WHERE key='lastSubject'",
                        [&key],
                    )
                    .map_err(err)?;
                } else {
                    let key = id();
                    tx.execute(
                        "INSERT INTO subjects(id,name,color) VALUES(?,?,?)",
                        params![key, name, color],
                    )
                    .map_err(err)?;
                    tx.execute(
                        "UPDATE settings SET value=? WHERE key='lastSubject'",
                        [&key],
                    )
                    .map_err(err)?;
                }
            }
            Command::DeleteSubject { id } => {
                if tx
                    .execute("DELETE FROM subjects WHERE id=?", [&id])
                    .is_err()
                {
                    return Err(
                        "This subject has recorded sessions. Archive it to preserve your history."
                            .into(),
                    );
                }
                tx.execute(
                    "UPDATE settings SET value='' WHERE key='lastSubject' AND value=?",
                    [&id],
                )
                .map_err(err)?;
            }
            Command::DeleteStudyType { id } => {
                if tx
                    .execute("DELETE FROM study_types WHERE id=?", [&id])
                    .is_err()
                {
                    return Err("This study type has recorded sessions. Archive it to preserve your history.".into());
                }
                tx.execute(
                    "UPDATE settings SET value='' WHERE key='lastStudyType' AND value=?",
                    [&id],
                )
                .map_err(err)?;
            }
            Command::ArchiveSubject { id } => {
                let active: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM sessions WHERE subject_id=? AND ended_at IS NULL)", [&id], |r| r.get(0)).map_err(err)?;
                if active {
                    return Err("Finish the active session before removing its subject.".into());
                }
                tx.execute("UPDATE subjects SET archived=1 WHERE id=?", [&id])
                    .map_err(err)?;
                tx.execute(
                    "UPDATE settings SET value='' WHERE key='lastSubject' AND value=?",
                    [&id],
                )
                .map_err(err)?;
            }
            Command::StudyType {
                id: old_id,
                name,
                color,
            } => {
                let name = name.trim();
                if !text_valid(name, 80) || !color_valid(&color) {
                    return Err(
                        "Use a study type name of 1–80 characters and a valid color.".into(),
                    );
                }
                if let Some(key) = old_id {
                    if tx
                        .execute(
                            "UPDATE study_types SET name=?,color=? WHERE id=?",
                            params![name, color, key],
                        )
                        .map_err(|_| "That study type name is already in use.".to_string())?
                        == 0
                    {
                        return Err("Study type no longer exists.".into());
                    }
                } else if let Some(key) = tx
                    .query_row(
                        "SELECT id FROM study_types WHERE name=? COLLATE NOCASE",
                        [name],
                        |r| r.get::<_, String>(0),
                    )
                    .optional()
                    .map_err(err)?
                {
                    tx.execute("UPDATE study_types SET archived=0 WHERE id=?", [&key])
                        .map_err(err)?;
                    tx.execute(
                        "UPDATE settings SET value=? WHERE key='lastStudyType'",
                        [&key],
                    )
                    .map_err(err)?;
                } else {
                    let key = id();
                    tx.execute(
                        "INSERT INTO study_types(id,name,color) VALUES(?,?,?)",
                        params![key, name, color],
                    )
                    .map_err(err)?;
                    tx.execute(
                        "UPDATE settings SET value=? WHERE key='lastStudyType'",
                        [&key],
                    )
                    .map_err(err)?;
                }
            }
            Command::ArchiveStudyType { id } => {
                let active:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM sessions WHERE study_type_id=? AND ended_at IS NULL)",[&id],|r|r.get(0)).map_err(err)?;
                if active {
                    return Err("Finish the active session before archiving its study type.".into());
                }
                tx.execute("UPDATE study_types SET archived=1 WHERE id=?", [&id])
                    .map_err(err)?;
                tx.execute(
                    "UPDATE settings SET value='' WHERE key='lastStudyType' AND value=?",
                    [&id],
                )
                .map_err(err)?;
            }
            Command::Start {
                subject_id,
                study_type_id,
                time_zone,
            } => {
                subject_exists(&tx, &subject_id)?;
                type_exists(&tx, &study_type_id)?;
                zone_valid(&time_zone)?;
                let active: bool = tx
                    .query_row(
                        "SELECT EXISTS(SELECT 1 FROM sessions WHERE ended_at IS NULL)",
                        [],
                        |r| r.get(0),
                    )
                    .map_err(err)?;
                if active {
                    return Err(
                        "A session is already active. Finish it before starting another.".into(),
                    );
                }
                let key = id();
                tx.execute("INSERT INTO sessions(id,subject_id,started_at,ended_at,note,source,time_zone,updated_at,study_type_id) VALUES(?,?,?,NULL,'','timer',?,?,?)", params![key,subject_id,at,time_zone,at,study_type_id]).map_err(err)?;
                tx.execute("INSERT INTO segments VALUES(?,?,NULL)", params![key, at])
                    .map_err(err)?;
                tx.execute(
                    "UPDATE settings SET value=? WHERE key='lastSubject'",
                    [subject_id],
                )
                .map_err(err)?;
                tx.execute(
                    "UPDATE settings SET value=? WHERE key='lastStudyType'",
                    [study_type_id],
                )
                .map_err(err)?;
            }
            Command::Pause { id } => {
                active_exists(&tx, &id, at)?;
                tx.execute(
                    "UPDATE segments SET ended_at=? WHERE session_id=? AND ended_at IS NULL",
                    params![at, id],
                )
                .map_err(err)?;
                tx.execute(
                    "UPDATE sessions SET updated_at=? WHERE id=?",
                    params![at, id],
                )
                .map_err(err)?;
            }
            Command::Resume { id } => {
                active_exists(&tx, &id, at)?;
                let running: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM segments WHERE session_id=? AND ended_at IS NULL)", [&id], |r| r.get(0)).map_err(err)?;
                if !running {
                    tx.execute("INSERT INTO segments VALUES(?,?,NULL)", params![id, at])
                        .map_err(err)?;
                }
                tx.execute(
                    "UPDATE sessions SET updated_at=? WHERE id=?",
                    params![at, id],
                )
                .map_err(err)?;
            }
            Command::Finish { id } => {
                active_exists(&tx, &id, at)?;
                tx.execute(
                    "UPDATE segments SET ended_at=? WHERE session_id=? AND ended_at IS NULL",
                    params![at, id],
                )
                .map_err(err)?;
                tx.execute(
                    "UPDATE sessions SET ended_at=?,updated_at=? WHERE id=?",
                    params![at, at, id],
                )
                .map_err(err)?;
                clear_recovery = true;
            }
            Command::Cancel { id } => {
                active_exists(&tx, &id, at)?;
                tx.execute("DELETE FROM sessions WHERE id=?", [id])
                    .map_err(err)?;
                clear_recovery = true;
            }
            Command::Session {
                id: old_id,
                subject_id,
                study_type_id,
                started_at,
                duration,
                note,
                time_zone,
                expected_updated_at,
            } => {
                subject_exists(&tx, &subject_id)?;
                type_exists(&tx, &study_type_id)?;
                zone_valid(&time_zone)?;
                note_valid(&note)?;
                let end = started_at
                    .checked_add(duration)
                    .ok_or("Invalid duration.")?;
                if started_at <= 0 || duration <= 0 || end > at + 1000 {
                    return Err(
                        "Use a positive duration and an end time that is not in the future.".into(),
                    );
                }
                if let Some(ref key) = old_id {
                    check_edit(&tx, key, expected_updated_at)?;
                }
                let overlap:bool=tx.query_row("SELECT EXISTS(SELECT 1 FROM segments WHERE session_id != ? AND started_at < ? AND COALESCE(ended_at,?) > ?)",params![old_id.as_deref().unwrap_or(""),end,at,started_at],|r|r.get(0)).map_err(err)?;
                if overlap {
                    return Err("This time overlaps an existing study session. Adjust the start or duration.".into());
                }
                let key = old_id.unwrap_or_else(id);
                tx.execute("INSERT INTO sessions(id,subject_id,started_at,ended_at,note,source,time_zone,updated_at,study_type_id) VALUES(?,?,?,?,?,'manual',?,?,?) ON CONFLICT(id) DO UPDATE SET subject_id=excluded.subject_id,study_type_id=excluded.study_type_id,started_at=excluded.started_at,ended_at=excluded.ended_at,note=excluded.note,source='manual',time_zone=excluded.time_zone,updated_at=excluded.updated_at",params![key,subject_id,started_at,end,note,time_zone,at,study_type_id]).map_err(err)?;
                tx.execute("DELETE FROM segments WHERE session_id=?", [&key])
                    .map_err(err)?;
                tx.execute(
                    "INSERT INTO segments VALUES(?,?,?)",
                    params![key, started_at, end],
                )
                .map_err(err)?;
            }
            Command::Note {
                id,
                note,
                expected_updated_at,
            } => {
                note_valid(&note)?;
                check_edit(&tx, &id, Some(expected_updated_at))?;
                tx.execute(
                    "UPDATE sessions SET note=?,updated_at=? WHERE id=?",
                    params![note, at, id],
                )
                .map_err(err)?;
            }
            Command::DeleteSession { id } => {
                let count = tx
                    .execute(
                        "DELETE FROM sessions WHERE id=? AND ended_at IS NOT NULL",
                        [id],
                    )
                    .map_err(err)?;
                if count == 0 {
                    return Err("This session is active or no longer exists.".into());
                }
            }
            Command::Setting { key, value } => {
                let valid = match key.as_str() {
                    "theme" => ["light", "dark", "warm", "slate", "forest", "rose"]
                        .contains(&value.as_str()),
                    "font" => ["inter", "dm-sans", "plex-mono"].contains(&value.as_str()),
                    "alwaysOnTop" => ["true", "false"].contains(&value.as_str()),
                    "lastStudyType" => {
                        if !value.is_empty() {
                            type_exists(&tx, &value)?;
                        }
                        true
                    }
                    "lastSubject" => {
                        if !value.is_empty() {
                            subject_exists(&tx, &value)?;
                        }
                        true
                    }
                    _ => false,
                };
                if !valid {
                    return Err("Invalid setting.".into());
                }
                tx.execute(
                    "UPDATE settings SET value=? WHERE key=?",
                    params![value, key],
                )
                .map_err(err)?;
            }
            Command::AcknowledgeRecovery { id } => {
                active_exists(&tx, &id, at)?;
                clear_recovery = true;
            }
        }
        tx.commit().map_err(err)?;
        if clear_recovery {
            self.recovered_id = None;
        }
        self.revision += 1;
        self.snapshot()
    }
    pub fn restore(&mut self, backup: Backup, at: i64) -> Result<Snapshot> {
        validate_backup(&backup, at)?;
        if self
            .snapshot()?
            .sessions
            .iter()
            .any(|s| s.ended_at.is_none())
        {
            return Err("Finish or discard your current session before restoring a backup.".into());
        }
        let tx = self.conn.transaction().map_err(err)?;
        tx.execute_batch("DELETE FROM sessions; DELETE FROM subjects; DELETE FROM study_types; DELETE FROM settings;").map_err(err)?;
        for s in &backup.subjects {
            tx.execute(
                "INSERT INTO subjects VALUES(?,?,?,?)",
                params![s.id, s.name, s.color, s.archived],
            )
            .map_err(err)?;
        }
        for s in &backup.study_types {
            tx.execute(
                "INSERT INTO study_types VALUES(?,?,?,?)",
                params![s.id, s.name, s.color, s.archived],
            )
            .map_err(err)?;
        }
        for s in &backup.sessions {
            tx.execute("INSERT INTO sessions(id,subject_id,started_at,ended_at,note,source,time_zone,updated_at,study_type_id) VALUES(?,?,?,?,?,?,?,?,?)",params![s.id,s.subject_id,s.started_at,s.ended_at,s.note,s.source,s.time_zone,s.updated_at,s.study_type_id]).map_err(err)?;
            for p in &s.segments {
                tx.execute(
                    "INSERT INTO segments VALUES(?,?,?)",
                    params![s.id, p.start, p.end],
                )
                .map_err(err)?;
            }
        }
        let s = backup.settings;
        for (key, value) in [
            ("theme", s.theme),
            ("font", s.font),
            ("lastSubject", s.last_subject),
            ("lastStudyType", s.last_study_type),
            ("alwaysOnTop", s.always_on_top.to_string()),
        ] {
            tx.execute("INSERT INTO settings VALUES(?,?)", params![key, value])
                .map_err(err)?;
        }
        tx.commit().map_err(err)?;
        self.recovered_id = backup
            .sessions
            .iter()
            .find(|s| s.ended_at.is_none())
            .map(|s| s.id.clone());
        self.revision += 1;
        self.snapshot()
    }
}
fn type_exists(tx: &Transaction<'_>, key: &str) -> Result<()> {
    let yes: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM study_types WHERE id=? AND archived=0)",
            [key],
            |r| r.get(0),
        )
        .map_err(err)?;
    if yes {
        Ok(())
    } else {
        Err("Choose an available study type.".into())
    }
}
fn subject_exists(tx: &Transaction<'_>, key: &str) -> Result<()> {
    let yes: bool = tx
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM subjects WHERE id=? AND archived=0)",
            [key],
            |r| r.get(0),
        )
        .map_err(err)?;
    if yes {
        Ok(())
    } else {
        Err("Choose an available subject.".into())
    }
}
fn active_exists(tx: &Transaction<'_>, key: &str, at: i64) -> Result<()> {
    let last=tx.query_row("SELECT MAX(updated_at,COALESCE((SELECT MAX(started_at) FROM segments WHERE session_id=sessions.id),started_at)) FROM sessions WHERE id=? AND ended_at IS NULL",[key],|r|r.get::<_,i64>(0)).optional().map_err(err)?;
    match last {
        Some(last) if at >= last => Ok(()),
        Some(_) => Err(
            "The system clock moved backwards. Correct the clock before changing the timer.".into(),
        ),
        None => Err("The active session changed. Please try again.".into()),
    }
}
fn check_edit(tx: &Transaction<'_>, key: &str, expected: Option<i64>) -> Result<()> {
    let current = tx
        .query_row(
            "SELECT updated_at FROM sessions WHERE id=? AND ended_at IS NOT NULL",
            [key],
            |r| r.get::<_, i64>(0),
        )
        .optional()
        .map_err(err)?;
    if current.is_none() || current != expected {
        Err("This session changed. Close the editor and open it again.".into())
    } else {
        Ok(())
    }
}
fn zone_valid(zone: &str) -> Result<()> {
    if text_valid(zone, 100) {
        Ok(())
    } else {
        Err("Invalid recording time zone.".into())
    }
}
fn note_valid(note: &str) -> Result<()> {
    if note.chars().count() <= 2000 && !note.contains('\0') {
        Ok(())
    } else {
        Err("Keep notes under 2,000 characters.".into())
    }
}
pub fn validate_backup(b: &Backup, at: i64) -> Result<()> {
    if b.format != "margin-study" || !(1..=2).contains(&b.version) {
        return Err("This is not a supported Margin backup.".into());
    }
    validate_settings(&b.settings)?;
    let mut ids = HashSet::new();
    let mut names = HashSet::new();
    for s in &b.subjects {
        if !text_valid(&s.id, 100)
            || !text_valid(&s.name, 80)
            || !color_valid(&s.color)
            || !ids.insert(&s.id)
            || !names.insert(s.name.to_lowercase())
        {
            return Err("Backup contains invalid or duplicate subjects.".into());
        }
    }
    if !b.settings.last_subject.is_empty() && !ids.contains(&b.settings.last_subject) {
        return Err("Backup refers to a missing subject.".into());
    }
    let mut type_ids = HashSet::new();
    let mut type_names = HashSet::new();
    for s in &b.study_types {
        if !text_valid(&s.id, 100)
            || !text_valid(&s.name, 80)
            || !color_valid(&s.color)
            || !type_ids.insert(&s.id)
            || !type_names.insert(s.name.to_lowercase())
        {
            return Err("Backup contains invalid or duplicate study types.".into());
        }
    }
    if !b.settings.last_study_type.is_empty() && !type_ids.contains(&b.settings.last_study_type) {
        return Err("Backup refers to a missing study type.".into());
    }
    let mut keys = HashSet::new();
    let mut active = 0;
    for s in &b.sessions {
        if !text_valid(&s.id, 100)
            || !keys.insert(&s.id)
            || !ids.contains(&s.subject_id)
            || !type_ids.contains(&s.study_type_id)
            || s.started_at <= 0
            || s.started_at > at + 1000
            || s.updated_at < s.started_at
            || s.updated_at > at + 1000
            || !["timer", "manual"].contains(&s.source.as_str())
        {
            return Err("Backup contains invalid sessions.".into());
        }
        note_valid(&s.note)?;
        zone_valid(&s.time_zone)?;
        if let Some(end) = s.ended_at {
            if end < s.started_at || end > at + 1000 {
                return Err("Backup contains invalid session dates.".into());
            }
        } else {
            active += 1;
        }
        let mut last = s.started_at;
        let mut open = false;
        if s.segments.is_empty() {
            return Err("Backup contains a session without time intervals.".into());
        }
        for p in &s.segments {
            if open || p.start < last || p.start > s.ended_at.unwrap_or(at + 1000) {
                return Err("Backup contains overlapping or invalid time intervals.".into());
            }
            if let Some(end) = p.end {
                if end < p.start || end > s.ended_at.unwrap_or(at + 1000) {
                    return Err("Backup contains invalid interval dates.".into());
                }
                last = end;
            } else {
                if s.ended_at.is_some() {
                    return Err("A finished session contains a running interval.".into());
                }
                open = true;
            }
        }
        let unique: HashSet<i64> = s.segments.iter().map(|p| p.start).collect();
        if unique.len() != s.segments.len() {
            return Err("Backup contains duplicate intervals.".into());
        }
    }
    if active > 1 {
        return Err("Backup contains more than one active session.".into());
    }
    Ok(())
}
