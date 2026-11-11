use crate::{db::*, model::*};
use std::path::Path;
fn database() -> Database {
    Database::open(Path::new(":memory:")).unwrap()
}
fn subject(db: &mut Database) -> String {
    db.mutate(
        Command::Subject {
            id: None,
            name: "Calculus".into(),
            color: "#728875".into(),
        },
        1000,
    )
    .unwrap()
    .subjects[0]
        .id
        .clone()
}
fn start(db: &mut Database, sid: &str, at: i64) -> String {
    db.mutate(
        Command::Start {
            timer_mode: "stopwatch".into(),
            target_ms: None,
            study_type_id: "studying".into(),
            subject_id: sid.into(),
            time_zone: "America/New_York".into(),
        },
        at,
    )
    .unwrap()
    .sessions[0]
        .id
        .clone()
}
#[test]
fn timer_pause_resume_finish_and_duplicate_guard() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = start(&mut db, &sid, 1000);
    assert!(db
        .mutate(
            Command::Start {
                timer_mode: "stopwatch".into(),
                target_ms: None,
                study_type_id: "studying".into(),
                subject_id: sid,
                time_zone: "UTC".into()
            },
            1500
        )
        .is_err());
    db.mutate(Command::Pause { id: id.clone() }, 2000).unwrap();
    db.mutate(Command::Pause { id: id.clone() }, 2500).unwrap();
    db.mutate(Command::Resume { id: id.clone() }, 4000).unwrap();
    db.mutate(Command::Resume { id: id.clone() }, 4500).unwrap();
    let s = db
        .mutate(Command::Finish { id: id.clone() }, 6000)
        .unwrap()
        .sessions
        .remove(0);
    assert_eq!(s.segments.len(), 2);
    assert_eq!(
        s.segments
            .iter()
            .map(|p| p.end.unwrap() - p.start)
            .sum::<i64>(),
        3000
    );
    assert!(db.mutate(Command::Finish { id }, 7000).is_err());
}
#[test]
fn persistence_recovery_and_migrations() {
    let temp = tempfile::tempdir().unwrap();
    let path = temp.path().join("test.db");
    let key;
    {
        let mut db = Database::open(&path).unwrap();
        let sid = subject(&mut db);
        key = start(&mut db, &sid, 1000);
    }
    let mut db = Database::open(&path).unwrap();
    assert_eq!(db.recovered_id, Some(key.clone()));
    db.mutate(Command::Finish { id: key }, 90000).unwrap();
    drop(db);
    let db = Database::open(&path).unwrap();
    assert!(db.recovered_id.is_none());
    assert_eq!(db.snapshot().unwrap().sessions.len(), 1);
}
#[test]
fn cancel_and_clock_reversal() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = start(&mut db, &sid, 1000);
    assert!(db.mutate(Command::Pause { id: id.clone() }, 999).is_err());
    db.mutate(Command::Cancel { id }, 2000).unwrap();
    assert!(db.snapshot().unwrap().sessions.is_empty());
}
#[test]
fn archive_retains_history_and_rename() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = start(&mut db, &sid, 1000);
    assert!(db
        .mutate(Command::ArchiveSubject { id: sid.clone() }, 2000)
        .is_err());
    db.mutate(Command::Finish { id }, 3000).unwrap();
    db.mutate(
        Command::Subject {
            id: Some(sid.clone()),
            name: "Analysis".into(),
            color: "#778899".into(),
        },
        4000,
    )
    .unwrap();
    let s = db
        .mutate(Command::ArchiveSubject { id: sid }, 5000)
        .unwrap();
    assert!(s.subjects[0].archived);
    assert_eq!(s.subjects[0].name, "Analysis");
    assert_eq!(s.sessions.len(), 1);
}
#[test]
fn import_validation_atomic_restore() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = start(&mut db, &sid, 1000);
    db.mutate(Command::Finish { id }, 2000).unwrap();
    let b = db.backup().unwrap();
    validate_backup(&b, now()).unwrap();
    let mut bad = b.clone();
    bad.sessions[0].segments[0].end = Some(3000);
    assert!(db.restore(bad, now()).is_err());
    assert_eq!(db.snapshot().unwrap().sessions.len(), 1);
    db.restore(b, now()).unwrap();
    assert_eq!(db.snapshot().unwrap().sessions.len(), 1);
}
#[test]
fn manual_edit_stale_guard_delete_and_overlap() {
    let mut db = database();
    let sid = subject(&mut db);
    let cmd = |id, expected, start| Command::Session {
        id,
        study_type_id: "reviewing".into(),
        subject_id: sid.clone(),
        started_at: start,
        duration: 1000,
        note: "Notes".into(),
        time_zone: "UTC".into(),
        expected_updated_at: expected,
    };
    let s = db
        .mutate(cmd(None, None, 1000), 3000)
        .unwrap()
        .sessions
        .remove(0);
    assert!(db.mutate(cmd(None, None, 1500), 3000).is_err());
    assert!(db
        .mutate(cmd(Some(s.id.clone()), Some(2000), 1000), 4000)
        .is_err());
    db.mutate(cmd(Some(s.id.clone()), Some(s.updated_at), 1000), 4000)
        .unwrap();
    db.mutate(Command::DeleteSession { id: s.id }, 5000)
        .unwrap();
    assert!(db.snapshot().unwrap().sessions.is_empty());
}
#[test]
fn newer_schema_not_reset() {
    let tmp = tempfile::tempdir().unwrap();
    let p = tmp.path().join("new.db");
    let db = Database::open(&p).unwrap();
    db.conn.execute_batch("PRAGMA user_version=99").unwrap();
    drop(db);
    assert!(Database::open(&p).is_err());
}
#[test]
fn export_csv_escapes_formulas_and_notes() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = start(&mut db, &sid, 1000);
    let s = db
        .mutate(Command::Finish { id }, 2000)
        .unwrap()
        .sessions
        .remove(0);
    db.mutate(
        Command::Note {
            id: s.id,
            note: "=SUM(1,2)\n\"quote\"".into(),
            expected_updated_at: s.updated_at,
        },
        3000,
    )
    .unwrap();
    let csv = crate::csv(&db.backup().unwrap());
    assert!(csv.contains("'=SUM"));
    assert!(csv.contains("\"\"quote\"\""));
}
#[test]
fn study_types_persist_rename_archive_and_export() {
    let mut db = database();
    let sid = subject(&mut db);
    let s = db
        .mutate(
            Command::StudyType {
                id: None,
                name: "Solving past papers".into(),
                color: "#89759E".into(),
            },
            1000,
        )
        .unwrap();
    let type_id = s.settings.last_study_type;
    let session = db
        .mutate(
            Command::Start {
                timer_mode: "stopwatch".into(),
                target_ms: None,
                subject_id: sid,
                study_type_id: type_id.clone(),
                time_zone: "UTC".into(),
            },
            2000,
        )
        .unwrap()
        .sessions
        .remove(0);
    assert_eq!(session.study_type_id, type_id);
    assert!(db
        .mutate(
            Command::ArchiveStudyType {
                id: type_id.clone()
            },
            2500
        )
        .is_err());
    db.mutate(Command::Finish { id: session.id }, 3000).unwrap();
    db.mutate(
        Command::StudyType {
            id: Some(type_id.clone()),
            name: "Past papers".into(),
            color: "#89759E".into(),
        },
        4000,
    )
    .unwrap();
    db.mutate(
        Command::ArchiveStudyType {
            id: type_id.clone(),
        },
        5000,
    )
    .unwrap();
    let backup = db.backup().unwrap();
    validate_backup(&backup, now()).unwrap();
    assert!(crate::csv(&backup).contains("Past papers"));
    let mut restored = database();
    restored.restore(backup, now()).unwrap();
    let s = restored.snapshot().unwrap();
    assert_eq!(s.sessions[0].study_type_id, type_id);
    assert!(
        s.study_types
            .iter()
            .find(|t| t.id == type_id)
            .unwrap()
            .archived
    );
}
#[test]
fn migration_adds_types_without_changing_existing_sessions() {
    let tmp = tempfile::tempdir().unwrap();
    let path = tmp.path().join("old.db");
    {
        let conn = rusqlite::Connection::open(&path).unwrap();
        conn.execute_batch(include_str!("../migrations/001_initial.sql"))
            .unwrap();
        conn.execute_batch("INSERT INTO subjects VALUES('math','Math','#66816C',0);INSERT INTO sessions VALUES('old','math',1000,3000,'retained','timer','UTC',3000);INSERT INTO segments VALUES('old',1000,2000);INSERT INTO segments VALUES('old',2500,3000);").unwrap();
    }
    let db = Database::open(&path).unwrap();
    let s = db.snapshot().unwrap();
    assert_eq!(s.study_types.len(), 4);
    assert_eq!(s.sessions[0].study_type_id, "studying");
    assert_eq!(s.sessions[0].note, "retained");
    assert_eq!(s.sessions[0].segments.len(), 2);
}
#[test]
fn accepts_v1_backups_and_rejects_broken_foreign_keys() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = start(&mut db, &sid, 1000);
    db.mutate(Command::Finish { id }, 2000).unwrap();
    let mut json = serde_json::to_value(db.backup().unwrap()).unwrap();
    json["version"] = 1.into();
    json.as_object_mut().unwrap().remove("studyTypes");
    json["settings"]
        .as_object_mut()
        .unwrap()
        .remove("lastStudyType");
    json["sessions"][0]
        .as_object_mut()
        .unwrap()
        .remove("studyTypeId");
    let backup: Backup = serde_json::from_value(json).unwrap();
    db.restore(backup, now()).unwrap();
    assert_eq!(db.snapshot().unwrap().sessions[0].study_type_id, "studying");
    let mut invalid = db.backup().unwrap();
    invalid.sessions[0].study_type_id = "missing".into();
    assert!(db.restore(invalid, now()).is_err());
    assert_eq!(db.snapshot().unwrap().sessions.len(), 1);
}
#[test]
fn restore_refuses_to_replace_an_active_timer() {
    let mut db = database();
    let sid = subject(&mut db);
    let backup = db.backup().unwrap();
    let id = start(&mut db, &sid, 1000);
    assert!(db.restore(backup, now()).is_err());
    assert_eq!(db.snapshot().unwrap().sessions[0].id, id);
}
#[test]
fn settings_survive_reopening() {
    let tmp = tempfile::tempdir().unwrap();
    let path = tmp.path().join("settings.db");
    {
        let mut db = Database::open(&path).unwrap();
        db.mutate(
            Command::Setting {
                key: "theme".into(),
                value: "forest".into(),
            },
            1000,
        )
        .unwrap();
        db.mutate(
            Command::Setting {
                key: "font".into(),
                value: "plex-mono".into(),
            },
            2000,
        )
        .unwrap();
    }
    let s = Database::open(&path).unwrap().snapshot().unwrap();
    assert_eq!(s.settings.theme, "forest");
    assert_eq!(s.settings.font, "plex-mono");
}

#[test]
fn deletes_unused_subjects_and_types_but_preserves_history() {
    let mut db = database();
    let sid = subject(&mut db);
    db.mutate(
        Command::DeleteStudyType {
            id: "reading".into(),
        },
        1000,
    )
    .unwrap();
    let id = start(&mut db, &sid, 2000);
    db.mutate(Command::Finish { id }, 3000).unwrap();
    assert!(db.mutate(Command::DeleteSubject { id: sid }, 4000).is_err());
    assert!(db
        .mutate(
            Command::DeleteStudyType {
                id: "studying".into()
            },
            4000
        )
        .is_err());
    let result = db
        .mutate(
            Command::Subject {
                id: None,
                name: "Unused".into(),
                color: "#66816C".into(),
            },
            5000,
        )
        .unwrap();
    let unused = result.settings.last_subject;
    let result = db
        .mutate(Command::DeleteSubject { id: unused.clone() }, 6000)
        .unwrap();
    assert!(!result.subjects.iter().any(|s| s.id == unused));
    assert_eq!(result.sessions.len(), 1);
}

#[test]
fn atomic_backup_writes_replace_complete_contents() {
    let tmp = tempfile::tempdir().unwrap();
    let file = tmp.path().join("backup.json");
    std::fs::write(&file, b"prior content").unwrap();
    crate::write_atomic(&file, b"{\"complete\":true}").unwrap();
    assert_eq!(std::fs::read(&file).unwrap(), b"{\"complete\":true}");
    assert_eq!(std::fs::read_dir(tmp.path()).unwrap().count(), 1);
}

fn timed(db: &mut Database, sid: &str, mode: &str, at: i64) -> String {
    db.mutate(
        Command::Start {
            subject_id: sid.into(),
            study_type_id: "reviewing".into(),
            time_zone: "UTC".into(),
            timer_mode: mode.into(),
            target_ms: Some(60_000),
        },
        at,
    )
    .unwrap()
    .sessions
    .iter()
    .find(|s| s.ended_at.is_none())
    .unwrap()
    .id
    .clone()
}
#[test]
fn countdown_finishes_at_exact_target_after_a_late_tick() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = timed(&mut db, &sid, "countdown", 1000);
    assert!(!db.reconcile(60_000).unwrap());
    assert!(db.reconcile(600_000).unwrap());
    let s = db.snapshot().unwrap();
    assert_eq!(s.sessions[0].id, id);
    assert_eq!(s.sessions[0].ended_at, Some(61_000));
    assert_eq!(s.sessions[0].segments[0].end, Some(61_000));
    assert!(s.timer_state.break_state.is_none());
    assert_eq!(s.timer_state.notice.unwrap().kind, "countdown");
    assert!(!db.reconcile(600_001).unwrap());
}
#[test]
fn countdown_pauses_shift_deadline_without_counting_the_gap() {
    let mut db = database();
    let sid = subject(&mut db);
    let id = timed(&mut db, &sid, "countdown", 1000);
    db.mutate(Command::Pause { id: id.clone() }, 11_000)
        .unwrap();
    assert!(!db.reconcile(120_000).unwrap());
    db.mutate(Command::Resume { id }, 121_000).unwrap();
    assert!(db.reconcile(500_000).unwrap());
    let s = db.snapshot().unwrap().sessions.remove(0);
    assert_eq!(s.ended_at, Some(171_000));
    assert_eq!(
        s.segments
            .iter()
            .map(|p| p.end.unwrap() - p.start)
            .sum::<i64>(),
        60_000
    );
}
#[test]
fn pomodoro_breaks_are_separate_from_study_time() {
    let mut db = database();
    let sid = subject(&mut db);
    db.mutate(
        Command::Setting {
            key: "shortBreakMinutes".into(),
            value: "1".into(),
        },
        1000,
    )
    .unwrap();
    let id = timed(&mut db, &sid, "pomodoro", 1000);
    db.reconcile(61_000).unwrap();
    let s = db.snapshot().unwrap();
    assert_eq!(s.timer_state.cycle, 1);
    assert_eq!(
        s.timer_state.break_state.unwrap().running_since,
        Some(61_000)
    );
    assert_eq!(s.sessions[0].segments[0].end, Some(61_000));
    db.mutate(
        Command::BreakAction {
            session_id: id.clone(),
            action: "pause".into(),
        },
        81_000,
    )
    .unwrap();
    assert!(!db.reconcile(500_000).unwrap());
    assert_eq!(
        db.timer_state().unwrap().break_state.unwrap().remaining_ms,
        40_000
    );
    db.mutate(
        Command::BreakAction {
            session_id: id,
            action: "resume".into(),
        },
        501_000,
    )
    .unwrap();
    db.reconcile(541_000).unwrap();
    let s = db.snapshot().unwrap();
    assert!(s.timer_state.break_state.is_none());
    assert_eq!(s.sessions.len(), 1);
    assert_eq!(s.timer_state.notice.unwrap().kind, "break");
}
#[test]
fn every_fourth_pomodoro_has_a_long_break() {
    let mut db = database();
    let sid = subject(&mut db);
    for n in 0..4 {
        let at = 1000 + n * 61_000;
        let id = timed(&mut db, &sid, "pomodoro", at);
        db.reconcile(at + 60_000).unwrap();
        let b = db.timer_state().unwrap().break_state.unwrap();
        assert_eq!(b.long, n == 3);
        assert_eq!(b.total_ms, if n == 3 { 900_000 } else { 300_000 });
        db.mutate(
            Command::BreakAction {
                session_id: id,
                action: "skip".into(),
            },
            at + 60_000,
        )
        .unwrap();
    }
    assert_eq!(db.snapshot().unwrap().sessions.len(), 4);
}
#[test]
fn timed_restart_does_not_invent_more_focus_sessions() {
    let temp = tempfile::tempdir().unwrap();
    let p = temp.path().join("restart.db");
    {
        let mut db = Database::open(&p).unwrap();
        let sid = subject(&mut db);
        timed(&mut db, &sid, "pomodoro", 1000);
    }
    let mut db = Database::open(&p).unwrap();
    assert!(db.recovered_id.is_some());
    db.reconcile(86_400_000).unwrap();
    let s = db.snapshot().unwrap();
    assert_eq!(s.sessions.len(), 1);
    assert_eq!(s.sessions[0].ended_at, Some(61_000));
    assert!(s.timer_state.break_state.is_none());
    assert!(s.recovered_id.is_none());
}
#[test]
fn backup_roundtrip_preserves_paused_break_and_timer_configuration() {
    let mut db = database();
    let sid = subject(&mut db);
    let key = timed(&mut db, &sid, "pomodoro", 1000);
    db.reconcile(61_000).unwrap();
    db.mutate(
        Command::BreakAction {
            session_id: key,
            action: "pause".into(),
        },
        71_000,
    )
    .unwrap();
    let backup = db.backup().unwrap();
    validate_backup(&backup, now()).unwrap();
    let mut other = database();
    other.restore(backup, now()).unwrap();
    let b = other.timer_state().unwrap().break_state.unwrap();
    assert_eq!(b.remaining_ms, 290_000);
    assert!(b.running_since.is_none());
}
#[test]
fn timer_settings_and_targets_are_validated() {
    let mut db = database();
    let sid = subject(&mut db);
    assert!(db
        .mutate(
            Command::Setting {
                key: "countdownMinutes".into(),
                value: "0".into()
            },
            1000
        )
        .is_err());
    assert!(db
        .mutate(
            Command::Start {
                subject_id: sid,
                study_type_id: "studying".into(),
                time_zone: "UTC".into(),
                timer_mode: "countdown".into(),
                target_ms: Some(0)
            },
            1000
        )
        .is_err());
    assert!(db
        .mutate(
            Command::Setting {
                key: "alwaysOnTop".into(),
                value: "false".into()
            },
            1000
        )
        .is_err());
}
#[test]
fn migration_v2_preserves_an_active_stopwatch_and_pins_legacy_settings() {
    let tmp = tempfile::tempdir().unwrap();
    let p = tmp.path().join("v2.db");
    {
        let c = rusqlite::Connection::open(&p).unwrap();
        c.execute_batch(include_str!("../migrations/001_initial.sql"))
            .unwrap();
        c.execute_batch(include_str!("../migrations/002_study_types.sql"))
            .unwrap();
        c.execute_batch("INSERT INTO subjects VALUES('subject','Calculus','#66816C',0);INSERT INTO sessions VALUES('active','subject',1000,NULL,'kept','timer','UTC',1000,'studying');INSERT INTO segments VALUES('active',1000,NULL);UPDATE settings SET value='false' WHERE key='alwaysOnTop';").unwrap();
    }
    let db = Database::open(&p).unwrap();
    let s = db.snapshot().unwrap();
    assert_eq!(s.recovered_id.as_deref(), Some("active"));
    assert_eq!(s.sessions[0].timer_mode, "stopwatch");
    assert_eq!(s.sessions[0].note, "kept");
    assert!(s.sessions[0].target_ms.is_none());
    assert!(s.settings.always_on_top);
    assert_eq!(s.settings.focus_minutes, 25);
}
