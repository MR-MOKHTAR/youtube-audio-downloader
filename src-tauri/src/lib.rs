use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};

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

/// Get the path to the bundled yt-dlp binary
fn get_ytdlp_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    
    // Try to get bundled binary first
    let binary_name = if cfg!(target_os = "windows") {
        "yt-dlp.exe"
    } else {
        "yt-dlp"
    };

    // Look in the app's resource directory (bundled binaries)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let bundled_path = resource_dir.join("binaries").join(binary_name);
        if bundled_path.exists() {
            return Ok(bundled_path);
        }
    }

    // Fallback: try system PATH
    let mut cmd = Command::new(binary_name);
    cmd.arg("--version");

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    if cmd
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
    {
        return Ok(PathBuf::from(binary_name));
    }

    Err(
        "yt-dlp not found. Please ensure yt-dlp is installed or bundled with the application."
            .to_string(),
    )
}

/// Ensure yt-dlp binary has proper permissions (Linux only)
fn ensure_ytdlp_executable(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::fs;
        use std::os::unix::fs::PermissionsExt;

        let perms = fs::Permissions::from_mode(0o755);
        fs::set_permissions(path, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;
    }
    Ok(())
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

/// Download audio or video from YouTube URL
#[tauri::command]
async fn download_media(
    app_handle: AppHandle,
    url: String,
    output_path: String,
    filename: String,
    download_type: String,
    quality: String,
) -> Result<DownloadResult, String> {
    // Validate URL
    if !url.contains("youtube.com") && !url.contains("youtu.be") {
        return Err("Invalid YouTube URL".to_string());
    }

    // Validate output path exists
    if !Path::new(&output_path).exists() {
        return Err(format!("Output path does not exist: {}", output_path));
    }

    let (output_file, mut cmd_args): (String, Vec<String>) = match download_type.as_str() {
        "audio" => {
            let file = format!("{}/{}.mp3", output_path, filename);
            let args = vec![
                "--newline".to_string(),
                "-x".to_string(),
                "--audio-format".to_string(),
                "mp3".to_string(),
                "--audio-quality".to_string(),
                match quality.as_str() {
                    "highest" => "0",
                    "high" => "64",
                    "medium" => "128",
                    "low" => "192",
                    _ => "128",
                }
                .to_string(),
                "-o".to_string(),
                file.clone(),
            ];
            (file, args)
        }
        "video" => {
            let file = format!("{}/{}.mp4", output_path, filename);
            let format_spec = match quality.as_str() {
                "4k" => "bestvideo[height=2160]+bestaudio/best[height=2160]",
                "1440p" => "bestvideo[height=1440]+bestaudio/best[height=1440]",
                "1080p" => "bestvideo[height=1080]+bestaudio/best[height=1080]",
                "720p" => "bestvideo[height=720]+bestaudio/best[height=720]",
                "480p" => "bestvideo[height=480]+bestaudio/best[height=480]",
                "best" => "bestvideo+bestaudio/best",
                _ => "bestvideo[height=720]+bestaudio/best[height=720]",
            };
            let args = vec![
                "--newline".to_string(),
                "-f".to_string(),
                format_spec.to_string(),
                "--merge-output-format".to_string(),
                "mp4".to_string(),
                "-o".to_string(),
                file.clone(),
            ];
            (file, args)
        }
        _ => {
            return Err(format!(
                "Invalid download type: {}. Must be 'audio' or 'video'",
                download_type
            ))
        }
    };

    // Add URL as last argument
    cmd_args.push(url);

    // Get the path to yt-dlp binary
    let ytdlp_path = get_ytdlp_path(&app_handle)?;

    // Ensure executable permissions (especially important on Linux)
    ensure_ytdlp_executable(&ytdlp_path)?;

    // Execute yt-dlp command
    let mut std_cmd = std::process::Command::new(&ytdlp_path);
    std_cmd.args(&cmd_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        std_cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = tokio::process::Command::from(std_cmd)
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

                    let _ = app_handle.emit(
                        "download-progress",
                        ProgressPayload {
                            percent,
                            size,
                            speed,
                            eta,
                        },
                    );
                }
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed to wait: {}", e))?;

    if status.success() {
        let message = format!("{}  downloaded successfully!", {
            match download_type.as_str() {
                "audio" => "Audio",
                "video" => "Video",
                _ => "Media",
            }
        });
        Ok(DownloadResult {
            success: true,
            message,
            file_path: Some(output_file),
        })
    } else {
        Err(format!("yt-dlp exited with status: {}", status))
    }
}

/// Download audio from YouTube URL (deprecated, use download_media instead)
#[tauri::command]
async fn download_audio(
    app_handle: AppHandle,
    url: String,
    output_path: String,
    filename: String,
) -> Result<DownloadResult, String> {
    download_media(
        app_handle,
        url,
        output_path,
        filename,
        "audio".to_string(),
        "128".to_string(),
    )
    .await
}

/// Check if yt-dlp is installed (bundled or in system PATH)
#[tauri::command]
fn check_ytdlp_installed(app_handle: AppHandle) -> bool {
    match get_ytdlp_path(&app_handle) {
        Ok(_) => true,
        Err(_) => false,
    }
}

/// Get default downloads path
#[tauri::command]
fn get_default_download_path() -> String {
    if cfg!(target_os = "windows") {
        // Windows: use %USERPROFILE%\Downloads
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            return format!("{}\\Downloads", userprofile);
        }
    }

    // macOS and Linux: use ~/Downloads
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
            download_media,
            download_audio,
            check_ytdlp_installed,
            get_default_download_path,
            open_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
