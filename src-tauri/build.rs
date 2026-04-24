use std::env;
use std::fs;
use std::path::PathBuf;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {

    // Get the target triple
    let target_os = env::var("CARGO_CFG_TARGET_OS")?;

    // Get the manifest dir (src-tauri directory)
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let binaries_dir = manifest_dir.join("binaries");

    // Create binaries directory if it doesn't exist
    fs::create_dir_all(&binaries_dir)?;

    // Determine the yt-dlp binary name based on target OS
    let (ytdlp_name, asset_pattern) = match target_os.as_str() {
        "windows" => ("yt-dlp.exe", "yt-dlp.exe"),
        "linux" => ("yt-dlp", "yt-dlp_linux"),
        "macos" => ("yt-dlp", "yt-dlp_macos"),
        _ => {
            eprintln!(
                "Warning: yt-dlp bundling not supported for target OS: {}",
                target_os
            );
            return Ok(());
        }
    };

    let binary_path = binaries_dir.join(ytdlp_name);

    // Check if binary already exists (for faster rebuilds)
    if binary_path.exists() {
        println!(
            "cargo:warning=yt-dlp binary already exists at {:?}, skipping download",
            binary_path
        );
        return Ok(());
    }

    println!("cargo:warning=Fetching latest yt-dlp release from GitHub API...");

    // Get latest release info from GitHub API
    let release_response = reqwest::Client::new()
        .get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest")
        .header("User-Agent", "tauri-downloader-app")
        .send()
        .await?;

    if !release_response.status().is_success() {
        eprintln!(
            "Failed to fetch GitHub releases: HTTP {}",
            release_response.status()
        );
        return Err("Failed to fetch GitHub API".into());
    }

    let release_data: serde_json::Value = release_response.json().await?;

    // Find the correct asset URL
    let mut download_url: Option<String> = None;
    if let Some(assets) = release_data["assets"].as_array() {
        for asset in assets {
            if let Some(name) = asset["name"].as_str() {
                if name == asset_pattern {
                    if let Some(url) = asset["browser_download_url"].as_str() {
                        download_url = Some(url.to_string());
                        break;
                    }
                }
            }
        }
    }

    let download_url = download_url.ok_or("Could not find yt-dlp asset in latest release")?;

    println!("cargo:warning=Downloading yt-dlp from: {}", download_url);

    // Download yt-dlp binary
    let response = reqwest::Client::new().get(&download_url).send().await?;

    if !response.status().is_success() {
        eprintln!(
            "Failed to download yt-dlp: HTTP {} from {}",
            response.status(),
            download_url
        );
        return Err("Failed to download yt-dlp binary".into());
    }

    let bytes = response.bytes().await?;
    fs::write(&binary_path, bytes)?;

    // Set executable permission on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = fs::Permissions::from_mode(0o755);
        fs::set_permissions(&binary_path, perms)?;
    }

    println!(
        "cargo:warning=Successfully downloaded and installed yt-dlp to {:?}",
        binary_path
    );

    // Tell Cargo to re-run this build script if environment variable changes
    println!("cargo:rerun-if-env-changed=FORCE_YTDLP_DOWNLOAD");

    // Finally, run the default tauri build which will validate resources
    tauri_build::build();

    Ok(())
}
