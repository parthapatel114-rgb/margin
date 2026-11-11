use serde::{Deserialize, Serialize};

pub fn default_mode() -> String {
    "stopwatch".into()
}
pub fn default_focus() -> u32 {
    25
}
pub fn default_short_break() -> u32 {
    5
}
pub fn default_long_break() -> u32 {
    15
}
pub fn default_countdown() -> u32 {
    45
}
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TimerState {
    pub cycle: u32,
    #[serde(rename = "break")]
    pub break_state: Option<BreakState>,
    pub notice: Option<TimerNotice>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct BreakState {
    pub session_id: String,
    pub subject_id: String,
    pub study_type_id: String,
    pub remaining_ms: i64,
    pub running_since: Option<i64>,
    pub total_ms: i64,
    pub long: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TimerNotice {
    pub id: String,
    pub kind: String,
    pub session_id: String,
}
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
    #[serde(default = "default_mode")]
    pub timer_mode: String,
    #[serde(default)]
    pub target_ms: Option<i64>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub theme: String,
    pub font: String,
    pub last_subject: String,
    #[serde(default = "default_type")]
    pub last_study_type: String,
    #[serde(default)]
    pub always_on_top: bool,
    #[serde(default = "default_mode")]
    pub timer_mode: String,
    #[serde(default = "default_focus")]
    pub focus_minutes: u32,
    #[serde(default = "default_short_break")]
    pub short_break_minutes: u32,
    #[serde(default = "default_long_break")]
    pub long_break_minutes: u32,
    #[serde(default = "default_countdown")]
    pub countdown_minutes: u32,
    #[serde(default)]
    pub daily_goal_minutes: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Backup {
    pub format: String,
    pub version: u32,
    pub exported_at: i64,
    #[serde(default)]
    pub timer_state: TimerState,
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
    pub timer_state: TimerState,
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
        #[serde(default)]
        note: String,
        subject_id: String,
        study_type_id: String,
        time_zone: String,
        #[serde(default = "default_mode")]
        timer_mode: String,
        #[serde(default)]
        target_ms: Option<i64>,
    },
    BreakAction {
        session_id: String,
        action: String,
    },
    DismissNotice {
        id: String,
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
