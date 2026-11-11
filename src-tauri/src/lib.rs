mod db;
mod model;
#[cfg(test)]
mod tests;

use db::{Database, Result};
use model::*;
use serde::Serialize;
use std::{
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

struct Store(Mutex<Database>);
fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn publish(app: &tauri::AppHandle, snapshot: &Snapshot) {
    let _ = app.emit("margin:changed", snapshot.revision);
}
#[tauri::command]
fn snapshot(state: tauri::State<Store>) -> Result<Snapshot> {
    state.0.lock().map_err(error)?.snapshot()
}
#[tauri::command]
fn mutate(app: tauri::AppHandle, state: tauri::State<Store>, command: Command) -> Result<Snapshot> {
    let mut db = state.0.lock().map_err(error)?;
    let snapshot = db.mutate(command, now())?;
    publish(&app, &snapshot);
    if let Some(mini) = app.get_webview_window("mini") {
        mini.set_always_on_top(snapshot.settings.always_on_top)
            .map_err(error)?;
    }
    Ok(snapshot)
}
#[tauri::command]
fn open_mini(app: tauri::AppHandle, state: tauri::State<Store>) -> Result<()> {
    if let Some(window) = app.get_webview_window("mini") {
        window.show().map_err(error)?;
        window.set_focus().map_err(error)?;
        return Ok(());
    }
    let top = state
        .0
        .lock()
        .map_err(error)?
        .snapshot()?
        .settings
        .always_on_top;
    tauri::WebviewWindowBuilder::new(
        &app,
        "mini",
        tauri::WebviewUrl::App("index.html?window=mini".into()),
    )
    .title("Margin · Mini timer")
    .inner_size(348.0, 164.0)
    .min_inner_size(320.0, 164.0)
    .resizable(false)
    .decorations(false)
    .always_on_top(top)
    .build()
    .map_err(error)?;
    Ok(())
}
#[tauri::command]
fn show_main(app: tauri::AppHandle) -> Result<()> {
    if let Some(w) = app.get_webview_window("main") {
        w.show().map_err(error)?;
        w.unminimize().map_err(error)?;
        w.set_focus().map_err(error)?;
    }
    Ok(())
}
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf> {
    if cfg!(debug_assertions) {
        if let Some(path) = std::env::var_os("MARGIN_TEST_DATA_DIR") {
            return Ok(PathBuf::from(path));
        }
    }
    app.path().app_data_dir().map_err(error)
}
fn backup_dir(app: &tauri::AppHandle) -> Result<PathBuf> {
    let path = data_dir(app)?.join("backups");
    std::fs::create_dir_all(&path).map_err(error)?;
    Ok(path)
}
fn write_atomic(path: &Path, data: &[u8]) -> Result<()> {
    let parent = path.parent().ok_or("Invalid file location.")?;
    let mut temp = tempfile::NamedTempFile::new_in(parent).map_err(error)?;
    temp.write_all(data).map_err(error)?;
    temp.as_file().sync_all().map_err(error)?;
    temp.persist(path).map_err(error)?;
    #[cfg(unix)]
    std::fs::File::open(parent)
        .and_then(|dir| dir.sync_all())
        .map_err(error)?;
    Ok(())
}
fn safe_backup(app: &tauri::AppHandle, db: &Database) -> Result<PathBuf> {
    let path = backup_dir(app)?.join(format!(
        "margin-{}-{}.json",
        chrono::Utc::now().format("%Y%m%d-%H%M%S"),
        uuid::Uuid::new_v4()
    ));
    write_atomic(
        &path,
        &serde_json::to_vec_pretty(&db.backup()?).map_err(error)?,
    )?;
    Ok(path)
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportPreview {
    subjects: usize,
    study_types: usize,
    sessions: usize,
    exported_at: i64,
    has_active: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IoResult {
    path: Option<String>,
    preview: Option<ImportPreview>,
}
#[tauri::command]
async fn data_action(app: tauri::AppHandle, action: String) -> Result<IoResult> {
    tauri::async_runtime::spawn_blocking(move || data_action_sync(&app, &action))
        .await
        .map_err(error)?
}
fn data_action_sync(app: &tauri::AppHandle, action: &str) -> Result<IoResult> {
    let state = app.state::<Store>();
    let mut output = IoResult {
        path: None,
        preview: None,
    };
    match action {
        "open_backups" => {
            let path = backup_dir(app)?;
            app.opener()
                .open_path(path.to_string_lossy().to_string(), None::<&str>)
                .map_err(error)?;
        }
        "export_json" | "export_csv" => {
            let json = action == "export_json";
            let ext = if json { "json" } else { "csv" };
            let chosen = app
                .dialog()
                .file()
                .set_title("Export study data")
                .set_file_name(format!(
                    "margin-{}.{}",
                    chrono::Local::now().format("%Y-%m-%d"),
                    ext
                ))
                .add_filter("Study data", &[ext])
                .blocking_save_file();
            if let Some(chosen) = chosen {
                let path = chosen.into_path().map_err(error)?;
                let db = state.0.lock().map_err(error)?;
                let backup = db.backup()?;
                let bytes = if json {
                    serde_json::to_vec_pretty(&backup).map_err(error)?
                } else {
                    csv(&backup).into_bytes()
                };
                write_atomic(&path, &bytes)?;
                output.path = Some(path.to_string_lossy().into());
            }
        }
        "preview_import" => {
            if let Some(chosen) = app
                .dialog()
                .file()
                .set_title("Choose a Margin backup")
                .add_filter("Margin JSON backup", &["json"])
                .blocking_pick_file()
            {
                let path = chosen.into_path().map_err(error)?;
                if std::fs::metadata(&path).map_err(error)?.len() > 100_000_000 {
                    return Err(
                        "This backup is larger than 100 MB. Split or inspect it before importing."
                            .into(),
                    );
                }
                let backup: Backup =
                    serde_json::from_slice(&std::fs::read(path).map_err(error)?)
                        .map_err(|e| format!("Could not read this Margin backup: {e}"))?;
                db::validate_backup(&backup, now())?;
                output.preview = Some(ImportPreview {
                    subjects: backup.subjects.len(),
                    study_types: backup.study_types.len(),
                    sessions: backup.sessions.len(),
                    exported_at: backup.exported_at,
                    has_active: backup.sessions.iter().any(|s| s.ended_at.is_none()),
                });
                state.0.lock().map_err(error)?.pending = Some(backup);
            }
        }
        "restore" => {
            let mut db = state.0.lock().map_err(error)?;
            let backup = db
                .pending
                .clone()
                .ok_or("Choose a backup to restore first.")?;
            if db.snapshot()?.sessions.iter().any(|s| s.ended_at.is_none()) {
                return Err("Finish or discard your active session before restoring.".into());
            }
            let path = safe_backup(app, &db)?;
            let snapshot = db.restore(backup, now())?;
            db.pending = None;
            publish(app, &snapshot);
            output.path = Some(path.to_string_lossy().into());
        }
        "cancel_import" => {
            state.0.lock().map_err(error)?.pending = None;
        }
        _ => return Err("Unknown data action.".into()),
    }
    Ok(output)
}

fn csv(b: &Backup) -> String {
    fn cell(s: &str) -> String {
        let safe = if s.starts_with(['=', '+', '-', '@', '\t', '\r']) {
            format!("'{s}")
        } else {
            s.to_string()
        };
        format!("\"{}\"", safe.replace('"', "\"\""))
    }
    let mut out=String::from("subject,study_type,started_at_utc,ended_at_utc,duration_seconds,paused_seconds,note,recording_time_zone,source\r\n");
    for s in &b.sessions {
        let Some(end) = s.ended_at else { continue };
        let elapsed: i64 = s
            .segments
            .iter()
            .map(|p| p.end.unwrap_or(end) - p.start)
            .sum();
        let name = b
            .subjects
            .iter()
            .find(|p| p.id == s.subject_id)
            .map(|p| p.name.as_str())
            .unwrap_or("Removed subject");
        let study_type = b
            .study_types
            .iter()
            .find(|t| t.id == s.study_type_id)
            .map(|t| t.name.as_str())
            .unwrap_or("Studying");
        let date = |ms| {
            chrono::DateTime::from_timestamp_millis(ms)
                .map(|d| d.to_rfc3339())
                .unwrap_or_default()
        };
        out.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\r\n",
            cell(name),
            cell(study_type),
            cell(&date(s.started_at)),
            cell(&date(end)),
            elapsed as f64 / 1000.0,
            (end - s.started_at - elapsed).max(0) as f64 / 1000.0,
            cell(&s.note),
            cell(&s.time_zone),
            cell(&s.source)
        ));
    }
    out
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = show_main(app.clone());
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .with_denylist(&["mini"])
                .build(),
        )
        .setup(|app| {
            let path = if cfg!(debug_assertions) {
                std::env::var_os("MARGIN_TEST_DATA_DIR")
                    .map(PathBuf::from)
                    .unwrap_or(app.path().app_data_dir()?)
            } else {
                app.path().app_data_dir()?
            };
            std::fs::create_dir_all(&path)?;
            let database =
                Database::open(&path.join("margin.sqlite3")).map_err(std::io::Error::other)?;
            app.manage(Store(Mutex::new(database)));
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                window.app_handle().exit(0);
            }
        })
        .invoke_handler(tauri::generate_handler![
            snapshot,
            mutate,
            open_mini,
            show_main,
            data_action
        ])
        .run(tauri::generate_context!())
        .expect("Margin could not start. Your study data has not been reset.");
}
