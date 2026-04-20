# YouTube Audio Downloader - Quick Start Guide

## فارسی (Persian) Guide

سلام! خوش آمدید به **YouTube Audio Downloader**. این برنامه یک ابزار قدرتمند و زیبا برای دانلود صوت از ویدیوهای یوتیوب است.

### ویژگی‌های برنامه:

1. **🌙 حالت تاریک** - برنامه به صورت پیش‌فرض در حالت تاریک قرار دارد
2. **🇹🇭 پشتیبانی از زبان تایلندی** - می‌توانید زبان را تغییر دهید
3. **🌐 شناسایی خودکار وضعیت اینترنت** - اگر اینترنت قطع شود، برنامه به صورت موقت رفتار می‌کند
4. **📁 انتخاب پوشه ذخیره‌سازی** - می‌توانید پوشه دلخواهی را انتخاب کنید (پوشه پیش‌فرض: ~/Downloads)
5. **✏️ تغییر نام فایل** - می‌توانید نام دلخواهی برای فایل انتخاب کنید
6. **🎨 رابط کاربری زیبا** - انیمیشن‌های خوب و آیکون‌های مناسب

---

## Installation & Running

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Mode

```bash
npm run tauri dev
```

This will open the application with hot reload enabled.

### 3. Production Build

```bash
npm run tauri build
```

This creates a standalone executable in `src-tauri/target/release/`

---

## How to Use

### Step 1: Launch the App

Run `npm run tauri dev` to start the application

### Step 2: Paste YouTube URL

Paste your YouTube link in the "YouTube URL" field:

- Regular videos: `https://www.youtube.com/watch?v=...`
- Live streams: `https://www.youtube.com/live/...`
- Shorts: `https://www.youtube.com/shorts/...`

### Step 3: (Optional) Enter Filename

Type a custom filename or leave it empty for auto-generated name.
If using a custom name, the `.mp3` extension is added automatically.

### Step 4: Choose Save Location

- Click "Browse" to select a folder
- Or use the default location (~/Downloads)

### Step 5: Download

Click the "Download" button and wait for completion.

### Step 6: Check Results

The app will show:

- Success message with file path
- Or an error message if something goes wrong

---

## Language & Theme

### Dark Mode

Click the moon/sun icon in the top-right to toggle between dark and light modes.

### Language

Select "English" or "ไทย" (Thai) from the dropdown in the header.
All text will immediately update to the chosen language.

---

## Network Error Handling

The app monitors your internet connection:

- **Online**: Full functionality enabled
- **Offline**: Red warning bar at the top
- **Reconnected**: Automatically detected
- **Failed Download**: "Retry" button appears to resume

---

## Configuration

### Changing Default Language

Edit `src/i18n/index.ts`:

```typescript
lng: 'en',  // Change to 'th' for Thai
fallbackLng: 'en',
```

### Changing Default Dark Mode

Edit `src/App.tsx`:

```typescript
const [darkMode, setDarkMode] = useState(true); // Change to false for light mode
```

### Adding New Languages

1. Create `src/i18n/locales/[lang-code].json`
2. Add translations for all keys from `en.json`
3. Update `src/i18n/index.ts` to include the new language

---

## Troubleshooting

### "yt-dlp is not installed"

```bash
# Ubuntu/Debian
sudo apt install yt-dlp

# macOS with Homebrew
brew install yt-dlp

# Using pip
pip install yt-dlp

# Verify installation
yt-dlp --version
```

### Download Times Out

- Check your internet connection
- Try a different video
- Update yt-dlp: `yt-dlp -U` (or `pip install --upgrade yt-dlp`)

### Permission Denied (Save Error)

- Ensure the selected folder has write permissions
- Try a different location like `~/Downloads`

### App Won't Start

- Clear the build cache: `rm -rf dist src-tauri/target`
- Reinstall dependencies: `npm install`
- Try again: `npm run tauri dev`

---

## Advanced Features

### Retry on Network Failure

The app is configured with automatic retry logic:

- Maximum 3 retries
- Exponential backoff delay
- Alert message showing connection status

### Custom Save Paths

You can:

- Set any folder as download location
- Use external drives or USB devices
- Create nested folder structures beforehand

### Supported Audio Format

Currently supports:

- **MP3**: Default format (high compatibility)

---

## File Structure

```
src/
├── i18n/                    # Translations
│   ├── index.ts            # i18n configuration
│   └── locales/
│       ├── en.json         # English translations
│       └── th.json         # Thai translations
├── utils/
│   └── network.ts          # Network error handling utilities
├── App.tsx                 # Main component
├── App.css                 # Component styles
├── main.tsx                # Entry point
├── main.css                # Global styles
└── config.ts               # Configuration

src-tauri/
├── src/
│   ├── lib.rs              # Backend logic (download commands)
│   └── main.rs             # Tauri entry point
└── Cargo.toml              # Rust dependencies
```

---

## System Requirements

- **OS**: Windows, macOS, or Linux
- **Node.js**: 18.x or higher
- **Rust**: 1.60+ (for development)
- **yt-dlp**: Latest version
- **RAM**: Minimal (< 100MB)
- **Disk**: ~50MB (for application)

---

## Performance Tips

1. **Disable animations**: Use light mode (animations are lighter in light mode)
2. **Close other apps**: Frees up system resources
3. **Use wired connection**: More stable than Wi-Fi
4. **Keep yt-dlp updated**: Better compatibility with YouTube

---

## Command Reference

```bash
# Start development server with auto-reload
npm run tauri dev

# Build production-ready application
npm run tauri build

# Check TypeScript for errors (no build)
npx tsc --noEmit

# Build frontend only
npm run build

# Preview production build (frontend only)
npm run preview
```

---

## Privacy & Security

- All downloads happen locally on your computer
- No data is sent to external servers
- No tracking or analytics
- Open source code - you can verify everything

---

## Getting Help

1. **Check the README.md** for general information
2. **See error messages** - they explain what went wrong
3. **Verify yt-dlp** - most issues are yt-dlp related
4. **Check your connection** - network issues are common

---

## Tips & Tricks

### Download Live Streams

```
1. Copy the live stream URL
2. Paste in the app
3. Click Download
4. Works for both active and ended streams
```

### Batch Downloads

❌ **Not currently supported** - Download one video at a time

### File Naming

✅ **Allowed characters**: A-Z, a-z, 0-9, space, dash, underscore
❌ **Not allowed**: /, \, :, \*, ?, ", <, >, |

### Default Location

The app saves to `$HOME/Downloads` by default.
Set by: `get_default_download_path()` in Rust backend

---

## Updates & Maintenance

### Updating the App

```bash
git pull origin main
npm install
npm run tauri build
```

### Updating yt-dlp

```bash
pip install --upgrade yt-dlp
# or
sudo apt upgrade yt-dlp
# or
brew upgrade yt-dlp
```

---

Made with ❤️ for YouTube lovers everywhere 🎵

Enjoy downloading! 🚀
