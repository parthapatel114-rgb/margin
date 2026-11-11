use serde::{Deserialize, Serialize};

pub fn default_type() -> String {
    "studying".into()
}
pub fn default_types() -> Vec<Subject> {
    [
        ("studying", "Studying", "#66816C"),
        ("reviewing", "Reviewing", "#657D94"),
        ("practice", "Practice", "#8F755D"),
        ("reading", "Reading", "#89759E"),
    ]
    .into_iter()
    .map(|(id, name, color)| Subject {
        id: id.into(),
        name: name.into(),
        color: color.into(),
        archived: false,
    })
    .collect()
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Subject {
    pub id: String,
    pub name: String,
    pub color: String,
    pub archived: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Segment {
    pub start: i64,
    pub end: Option<i64>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Session {
    pub id: String,
    pub subject_id: String,
    #[serde(default = "default_type")]
    pub study_type_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub note: String,
    pub source: String,
    pub time_zone: String,
    pub updated_at: i64,
    pub segments: Vec<Segment>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub theme: String,
    pub font: String,
    pub last_subject: String,
    #[serde(default = "default_type")]
    pub last_study_type: String,
    pub always_on_top: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Backup {
    pub format: String,
    pub version: u32,
    pub exported_at: i64,
    pub subjects: Vec<Subject>,
    #[serde(default = "default_types")]
    pub study_types: Vec<Subject>,
    pub sessions: Vec<Session>,
    pub settings: Settings,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub subjects: Vec<Subject>,
    pub study_types: Vec<Subject>,
    pub sessions: Vec<Session>,
    pub settings: Settings,
    pub recovered_id: Option<String>,
    pub revision: u64,
}
#[derive(Debug, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum Command {
    Subject {
        id: Option<String>,
        name: String,
        color: String,
    },
    DeleteSubject {
        id: String,
    },
    DeleteStudyType {
        id: String,
    },
    ArchiveSubject {
        id: String,
    },
    StudyType {
        id: Option<String>,
        name: String,
        color: String,
    },
    ArchiveStudyType {
        id: String,
    },
    Start {
        subject_id: String,
        study_type_id: String,
        time_zone: String,
    },
    Pause {
        id: String,
    },
    Resume {
        id: String,
    },
    Finish {
        id: String,
    },
    Cancel {
        id: String,
    },
    Session {
        id: Option<String>,
        subject_id: String,
        study_type_id: String,
        started_at: i64,
        duration: i64,
        note: String,
        time_zone: String,
        expected_updated_at: Option<i64>,
    },
    Note {
        id: String,
        note: String,
        expected_updated_at: i64,
    },
    DeleteSession {
        id: String,
    },
    Setting {
        key: String,
        value: String,
    },
    AcknowledgeRecovery {
        id: String,
    },
}
pub fn now() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
