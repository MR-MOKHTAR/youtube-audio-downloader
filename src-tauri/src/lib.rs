use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Command, Stdio};
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::{AppHandle, Emitter};
use regex::Regex;

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadResult {
    pub success: bool,
    pub message: String,
    pub file_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub status: String,
    pub error: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub percent: f64,
    pub size: String,
    pub speed: String,
    pub eta: String,
}

/// Open a file or directory in the system file manager
#[tauri::command]
async fn open_path(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);

    if !path_obj.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let result = if cfg!(target_os = "macos") {
        Command::new("open").arg(&path).output()
    } else if cfg!(target_os = "linux") {
        Command::new("xdg-open").arg(&path).output()
    } else if cfg!(target_os = "windows") {
        Command::new("explorer").arg(&path).output()
    } else {
        return Err("Unsupported operating system".to_string());
    };

    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
        Err(e) => Err(format!("Failed to open path: {}", e)),
    }
}

/// Download audio from YouTube URL
#[tauri::command]
async fn download_audio(
    app_handle: AppHandle,
    url: String,
    output_path: String,
    filename: String,
) -> Result<DownloadResult, String> {
    // Validate URL
    if !url.contains("youtube.com") && !url.contains("youtu.be") {
        return Err("Invalid YouTube URL".to_string());
    }

    // Validate output path exists
    if !Path::new(&output_path).exists() {
        return Err(format!("Output path does not exist: {}", output_path));
    }

    let output_file = format!("{}/{}.mp3", output_path, filename);

    // Execute yt-dlp command
    let mut child = tokio::process::Command::new("yt-dlp")
        .arg("--newline")
        .arg("-x")
        .arg("--audio-format")
        .arg("mp3")
        .arg("-o")
        .arg(&output_file)
        .arg(&url)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn yt-dlp: {}", e))?;

    if let Some(stdout) = child.stdout.take() {
        let mut reader = BufReader::new(stdout).lines();
        // Setup regex to extract progress
        let re = Regex::new(r"\[download\]\s+([\d\.]+)%\s+of\s+([~\s\d\.]+([a-zA-Z]+)?)\s+at\s+([~\s\d\.]+([a-zA-Z]+/s)?)\s+ETA\s+([\d:]+)").unwrap();
        
        while let Ok(Some(line)) = reader.next_line().await {
            if let Some(caps) = re.captures(&line) {
                if let Ok(percent) = caps[1].parse::<f64>() {
                    let size = caps[2].trim().to_string();
                    let speed = caps[4].trim().to_string();
                    let eta = caps[6].trim().to_string();

                    let _ = app_handle.emit("download-progress", ProgressPayload {
                        percent,
                        size,
                        speed,
                        eta,
                    });
                }
            }
        }
    }

    let status = child.wait().await.map_err(|e| format!("Failed to wait: {}", e))?;

    if status.success() {
        Ok(DownloadResult {
            success: true,
            message: "Audio downloaded successfully".to_string(),
            file_path: Some(output_file),
        })
    } else {
        Err(format!("yt-dlp exited with status: {}", status))
    }
}

/// Check if yt-dlp is installed
#[tauri::command]
fn check_ytdlp_installed() -> bool {
    Command::new("yt-dlp")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

/// Get default downloads path
#[tauri::command]
fn get_default_download_path() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    format!("{}/Downloads", home)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            download_audio,
            check_ytdlp_installed,
            get_default_download_path,
            open_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
