# YouTube Audio Downloader

A modern, beautiful desktop application for downloading audio from YouTube videos in MP3 format.

## Features

✨ **Modern UI with Dark Mode**

- Beautiful, responsive interface with smooth animations
- Toggle between light and dark modes
- Framer Motion powered smooth transitions

🌍 **Multi-Language Support**

- English (en)
- Thai (ไทย)
- Easy language switching in the app

🎵 **YouTube Audio Download**

- Convert YouTube videos to MP3 audio format
- Accepts live streams and regular videos
- Custom filename support
- Powered by yt-dlp

📁 **Smart File Management**

- Choose custom save directory
- Default download location (~/Downloads)
- Auto-generated filenames

🌐 **Network Error Handling**

- Offline detection with visual indicator
- Automatic retry functionality
- Connection monitoring
- Graceful error messages in chosen language

🎨 **Beautiful UI Elements**

- Icons from lucide-react
- Smooth animations and transitions
- Modern gradient designs
- Responsive layout

## Requirements

- **yt-dlp**: Must be installed on your system

  ```bash
  # Ubuntu/Debian
  sudo apt install yt-dlp

  # macOS
  brew install yt-dlp

  # Arch Linux
  sudo pacman -S yt-dlp

  # Or via pip
  pip install yt-dlp
  ```

- **Node.js**: 18.x or higher
- **Rust**: 1.60+ (for building Tauri)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd downloader

# Install dependencies
npm install

# Build for development
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

1. **Launch the Application**
   - Run: `npm run tauri dev` or launch the built executable

2. **Download Audio**
   - Paste a YouTube URL in the URL field
   - (Optional) Enter a custom filename
   - Click "Browse" to select a save location (or use default)
   - Click "Download" to start

3. **Change Settings**
   - Toggle dark mode with the moon/sun icon
   - Switch language using the dropdown
   - Monitor internet connection status

4. **Error Handling**
   - The app shows connection status
   - Failed downloads can be retried when connection is restored
   - All errors display in your selected language

## Project Structure

```
downloader/
├── src/
│   ├── App.tsx           # Main React component
│   ├── App.css           # App styles
│   ├── main.tsx          # Entry point
│   ├── main.css          # Global styles
│   ├── config.ts         # Configuration
│   └── i18n/             # Internationalization
│       ├── index.ts      # i18n setup
│       └── locales/      # Language files
│           ├── en.json
│           └── th.json
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs        # Rust backend with download logic
│   └── Cargo.toml        # Rust dependencies
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Technologies Used

- **Frontend**: React 19 + TypeScript
- **UI Framework**: Tailwind CSS with custom animations
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Internationalization**: i18next + react-i18next
- **Desktop**: Tauri 2
- **Backend**: Rust with tokio
- **Download Engine**: yt-dlp

## Commands

```bash
# Development
npm run dev         # Run Vite dev server
npm run tauri dev   # Run Tauri dev with hot reload

# Building
npm run build       # Build frontend
npm run tauri build # Build complete application

# Preview
npm run preview     # Preview production build
```

## Configuration

Edit `src/config.ts` to customize:

- Default language
- Dark mode default state
- Retry settings
- App metadata

## Troubleshooting

### "yt-dlp is not installed"

- Install yt-dlp from your package manager or pip
- Verify installation: `yt-dlp --version`

### Download fails

- Check internet connection (status shown in app)
- Verify the YouTube URL is correct
- Ensure save directory has write permissions
- Check yt-dlp is up to date: `yt-dlp -U`

### Language not showing

- Clear browser cache in dev tools
- Restart the application
- Check `src/i18n/locales/` for translation files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project however you like!

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ using Tauri, React, and Rust
# youtube-audio-downloader
