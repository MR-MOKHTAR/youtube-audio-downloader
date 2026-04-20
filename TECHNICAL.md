# Technical Implementation Details

## Overview

This YouTube Audio Downloader is built with:

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Rust + Tauri 2
- **Download Engine**: yt-dlp
- **i18n**: i18next + react-i18next

---

## Architecture

### Frontend Architecture

```
App.tsx (Main Component)
├── State Management
│   ├── url (YouTube URL)
│   ├── filename (Custom filename)
│   ├── savePath (Folder location)
│   ├── darkMode (Theme)
│   ├── language (i18n)
│   ├── isDownloading (Download state)
│   ├── isOnline (Network state)
│   └── alert (Error/Success messages)
│
├── Effects
│   ├── Network monitoring (online/offline events)
│   ├── Dark mode synchronization
│   ├── App initialization (get default path, check yt-dlp)
│   └── Language synchronization
│
└── Components
    ├── Header (Title, Language, Dark Mode)
    ├── Network Status (Conditional)
    ├── Form Inputs
    │   ├── URL input
    │   ├── Filename input
    │   └── Folder selection
    ├── Download Progress
    ├── Download Button
    ├── Alert Messages
    └── Footer

Utilities (utils/network.ts)
├── checkInternetConnection()
├── isOnlineFast()
├── retryWithBackoff()
└── setupNetworkMonitoring()

Internationalization (i18n/)
├── Configuration
│   └── index.ts (i18next setup)
└── Locales
    ├── en.json (English)
    └── th.json (Thai)
```

### Backend Architecture

```
Rust Backend (src-tauri/src/lib.rs)
├── Commands
│   ├── download_audio(url, output_path, filename)
│   │   └── Validation → yt-dlp execution → Result
│   ├── check_ytdlp_installed()
│   │   └── verify yt-dlp existence
│   └── get_default_download_path()
│       └── return $HOME/Downloads
│
├── Data Structures
│   ├── DownloadResult {success, message, file_path}
│   └── DownloadProgress {status, error}
│
└── Error Handling
    ├── URL validation
    ├── Path validation
    ├── yt-dlp execution errors
    └── File system errors
```

---

## Key Features Explained

### 1. Dark Mode Implementation

```typescript
// Stored in React state
const [darkMode, setDarkMode] = useState(true);

// Applied to DOM via class
useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}, [darkMode]);

// Used in Tailwind classes
className={`${darkMode ? "dark bg-slate-950" : "bg-gradient-to-br from-blue-50 to-indigo-100"}`}
```

### 2. Language Support (i18n)

```typescript
// i18n configuration
i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      th: { translation: th },
    },
    lng: 'en',
    fallbackLng: 'en',
  });

// Usage in components
const { t } = useTranslation();
<h1>{t("app_title")}</h1>  // Renders localized title

// Language switching
const changeLanguage = (newLang: string) => {
  setLanguage(newLang);
  i18n.changeLanguage(newLang);
};
```

### 3. Internet Connection Handling

```typescript
// Monitor online/offline events
useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

// Show warning when offline
{!isOnline && (
  <motion.div className="bg-orange-500">
    <WifiOff className="w-5 h-5" />
    <span>{t("no_internet")}</span>
  </motion.div>
)}
```

### 4. File Management

```typescript
// Get default path from Rust backend
const defaultPath = await invoke<string>("get_default_download_path");

// Open folder dialog
const selected = await open({
  directory: true,
  multiple: false,
  defaultPath: savePath,
});

// File naming
const output_file = format!("{}/{}.mp3", output_path, filename);
```

### 5. Download with Progress

```typescript
// Simulate progress on frontend
const progressInterval = setInterval(() => {
  setProgress((prev) => {
    if (prev >= 90) return prev;
    return prev + Math.random() * 30;
  });
}, 500);

// Call Rust backend
const result = await invoke<DownloadResult>("download_audio", {
  url: url.trim(),
  outputPath: savePath,
  filename: filename.trim() || "audio",
});

// Update UI based on result
if (result.success) {
  setAlert({
    type: "success",
    message: `${t("success")} - ${result.file_path}`,
  });
}
```

### 6. Animations with Framer Motion

```typescript
// Header animation
<motion.header
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
>
  {/* Content */}
</motion.header>

// Button hover effects
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Download
</motion.button>

// Spinning loader during download
<motion.div
  animate={{ rotate: 360 }}
  transition={{ repeat: Infinity, duration: 1 }}
>
  <Download className="w-5 h-5" />
</motion.div>
```

---

## Data Flow

### Download Process Flow

```
User Input
    ↓
Validation (URL, Path)
    ↓
Check Internet
    ↓
Check yt-dlp Installation
    ↓
Invoke Rust Command
    ↓
yt-dlp Execution
    ↓
Success/Error Handling
    ↓
Update UI with Result
    ↓
Show Alert Message
```

### Error Handling Flow

```
Error Occurs
    ↓
Catch Exception
    ↓
Get Error Message
    ↓
Set Alert State
    ↓
Show Alert Component
    ↓
Render in Chosen Language
    ↓
Allow Retry if Network Related
```

---

## Internationalization (i18n) Details

### Dictionary Keys

All translations are stored with consistent keys:

- `app_title`: Application name
- `url_label`: URL field label
- `filename_label`: Filename field label
- `save_location`: Save location label
- And many more...

### Adding New Languages

1. Create `src/i18n/locales/[iso-code].json`
2. Copy structure from `en.json`
3. Translate all values
4. Update `src/i18n/index.ts`:

```typescript
import newLang from './locales/[iso-code].json';

resources: {
  en: { translation: en },
  th: { translation: th },
  [isoCode]: { translation: newLang },  // Add here
}
```

5. Add to language selector in App.tsx

### Current Languages

- **en.json**: English (471 characters)
- **th.json**: Thai/ไทย (389 characters)

---

## Network Error Management

### Connection Detection Strategies

1. **Fast Check**: `navigator.onLine` (instant, may be inaccurate)
2. **Detailed Check**: Fetch request to Google (accurate, takes time)
3. **Event Monitoring**: `online`/`offline` events (reliable)

### Retry Logic

```typescript
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000,
): Promise<T>;

// Formula for delay:
// delay = min(baseDelay * 2^attempt + random, maxDelay)
// Attempt 0: ~1000ms + jitter
// Attempt 1: ~2000ms + jitter
// Attempt 2: ~4000ms + jitter
```

### Error Messages in UI

- Shows error type with icon
- Displays localized error text
- Offers retry button for network errors
- Auto-closes after 5 seconds (optional)

---

## Performance Optimizations

### Frontend

- Lazy rendering of alert dialogs
- Memoized components with AnimatePresence
- Debounced input events (Tailwind handles this)
- CSS animations for smooth 60fps

### Backend

- Rust async/await with tokio
- Direct yt-dlp system call (minimal overhead)
- Path validation before execution
- Error catching at Tauri boundary

### Build

- Tree-shaking in Vite build
- CSS purging with Tailwind
- Minified production bundle
- Code splitting handled automatically

---

## Dependency Versions

### Frontend Dependencies

```json
{
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "typescript": "~5.8.3",
  "@tauri-apps/api": "^2",
  "@tauri-apps/plugin-dialog": "^2",
  "@tauri-apps/plugin-fs": "^2",
  "tailwindcss": "^4.2.2",
  "framer-motion": "^11.0.0",
  "i18next": "^23.7.0",
  "react-i18next": "^13.5.0",
  "lucide-react": "^1.8.0"
}
```

### Build Tools

```json
{
  "vite": "^7.0.4",
  "@tauri-apps/cli": "^2",
  "@tailwindcss/vite": "^4.2.2",
  "@vitejs/plugin-react": "^4.6.0"
}
```

### Rust Dependencies

```toml
tauri = "2"
tauri-plugin-dialog = "2.7.0"
tauri-plugin-fs = "2.5.0"
tauri-plugin-opener = "2"
serde = "1"
serde_json = "1"
tokio = "1"
reqwest = "0.11"
regex = "1"
```

---

## Testing the Application

### Manual Testing Checklist

- [ ] YouTube URL input accepts valid URLs
- [ ] Invalid URLs show error message
- [ ] Language switching changes all text
- [ ] Dark mode toggle works
- [ ] Folder selection dialog opens
- [ ] Default path is ~/Downloads
- [ ] Download starts and shows progress
- [ ] File is created in correct location
- [ ] Offline detection works
- [ ] Error messages are in correct language

### Commands to Test

```bash
# Development mode with hot reload
npm run tauri dev

# Build production
npm run tauri build

# Check for TypeScript errors
npx tsc --noEmit

# Check Rust compilation
cd src-tauri && cargo check
```

---

## Known Limitations

1. **Single download at a time** - No batch downloads yet
2. **MP3 only** - Other formats not currently supported
3. **Live streams** - Only works if stream is public/accessible
4. **Filenames** - Limited special character support
5. **File size** - No size limits, but depends on yt-dlp

---

## Future Enhancement Ideas

- [ ] Batch download queue
- [ ] Multiple audio format support (AAC, OPUS, WAV)
- [ ] Download history
- [ ] Playlist support
- [ ] Theme customization (color picker)
- [ ] Download speed statistics
- [ ] Pause/resume functionality
- [ ] More language support (Arabic, Spanish, Chinese, etc.)
- [ ] Dark mode detection from system settings
- [ ] Automatic updates
