import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Music,
  Folder,
  Moon,
  Sun,
  Check,
  AlertCircle,
  WifiOff,
  RotateCcw,
  Minus,
  Square,
  X,
} from "lucide-react";
import i18n from "./i18n";

interface ProgressPayload {
  percent: number;
  size: string;
  speed: string;
  eta: string;
}

interface DownloadResult {
  success: boolean;
  message: string;
  file_path?: string;
}

interface AlertState {
  type: "success" | "error" | "info" | "warning";
  message: string;
}

function App() {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [savePath, setSavePath] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("en");
  const [isDownloading, setIsDownloading] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [ytdlpReady, setYtdlpReady] = useState(true);
  const [downloadStats, setDownloadStats] = useState<ProgressPayload | null>(
    null,
  );
  const [lastFilePath, setLastFilePath] = useState<string | null>(null);
  const [downloadSuccessInfo, setDownloadSuccessInfo] = useState<{
    path: string;
    name: string;
  } | null>(null);

  // Window Controls
  const minimize = () => getCurrentWindow().minimize();
  const toggleMaximize = () => getCurrentWindow().toggleMaximize();
  const closeWindow = () => getCurrentWindow().close();

  // Listen for real-time progress
  useEffect(() => {
    let unlisten: () => void;

    async function setupListener() {
      unlisten = await listen<ProgressPayload>("download-progress", (event) => {
        setDownloadStats(event.payload);
      });
    }

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Auto-dismiss alerts
  useEffect(() => {
    if (!alert) return;

    let timeout: ReturnType<typeof setTimeout>;

    if (alert.type === "success") {
      timeout = setTimeout(() => setAlert(null), 8000);
    } else if (alert.type === "info") {
      timeout = setTimeout(() => setAlert(null), 6000);
    } else if (alert.type === "warning") {
      timeout = setTimeout(() => setAlert(null), 8000);
    } else if (alert.type === "error") {
      timeout = setTimeout(() => setAlert(null), 10000);
    }

    return () => clearTimeout(timeout);
  }, [alert]);

  // Check internet connection
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

  // Block Developer Tools and Context Menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12
      if (e.key === "F12") {
        e.preventDefault();
      }
      // Block Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "I" || e.key === "i")
      ) {
        e.preventDefault();
      }
      // Block Cmd+Option+I specifically for Mac
      if (
        e.metaKey &&
        e.altKey &&
        (e.key === "I" ||
          e.key === "i" ||
          e.key === "J" ||
          e.key === "j" ||
          e.key === "C" ||
          e.key === "c")
      ) {
        e.preventDefault();
      }
      // Block Ctrl+Shift+J or Ctrl+Shift+C
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Change language
  const changeLanguage = (newLang: string) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    // Set RTL for Arabic and Farsi
    if (newLang === "ar" || newLang === "fa") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = newLang;
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = newLang;
    }
  };

  async function initializeApp() {
    try {
      const defaultPath = await invoke<string>("get_default_download_path");
      setSavePath(defaultPath);

      const isInstalled = await invoke<boolean>("check_ytdlp_installed");
      if (!isInstalled) {
        setAlert({
          type: "warning",
          message: t("ytdlp_not_found"),
        });
        setYtdlpReady(false);
      }
    } catch (error) {
      console.error("Initialization error:", error);
      setAlert({
        type: "error",
        message: String(error),
      });
    }
  }

  async function selectFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: savePath,
      });
      if (selected) {
        setSavePath(selected as string);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
      setAlert({
        type: "error",
        message: `Error selecting folder: ${String(error)}`,
      });
    }
  }

  async function openPath(path: string) {
    try {
      await invoke("open_path", { path });
    } catch (error) {
      console.error("Error opening path:", error);
      setAlert({
        type: "error",
        message: `Error opening folder: ${String(error)}`,
      });
    }
  }

  async function handleDownload() {
    // Validation
    if (!url.trim()) {
      setAlert({
        type: "error",
        message: t("invalid_url"),
      });
      return;
    }

    if (!savePath.trim()) {
      setAlert({
        type: "error",
        message: "Please select a save location",
      });
      return;
    }

    if (!isOnline) {
      setAlert({
        type: "error",
        message: t("no_internet"),
      });
      return;
    }

    if (!ytdlpReady) {
      setAlert({
        type: "warning",
        message: t("ytdlp_not_found"),
      });
      return;
    }

    setIsDownloading(true);
    setDownloadStats(null);
    setDownloadSuccessInfo(null);

    try {
      const result = await invoke<DownloadResult>("download_audio", {
        url: url.trim(),
        outputPath: savePath,
        filename: filename.trim() || "audio",
      });

      if (result.success) {
        const downloadDir =
          result.file_path?.substring(0, result.file_path.lastIndexOf("/")) ||
          savePath;
        setLastFilePath(downloadDir);
        setDownloadSuccessInfo({
          path: downloadDir,
          name:
            result.file_path?.split("/").pop() ||
            filename.trim() ||
            "audio.mp3",
        });
        setAlert({
          type: "success",
          message: `${t("success")} - Downloaded`,
        });
        setUrl("");
        setFilename("");
      } else {
        setAlert({
          type: "error",
          message: result.message,
        });
      }
    } catch (error) {
      const errorMessage = String(error);
      if (errorMessage.includes("No such file")) {
        setAlert({
          type: "error",
          message: "Invalid save location",
        });
      } else {
        setAlert({
          type: "error",
          message: errorMessage,
        });
      }
    } finally {
      setIsDownloading(false);
    }
  }

  const handleRetry = () => {
    if (isOnline) {
      handleDownload();
    } else {
      setAlert({
        type: "info",
        message: t("no_internet"),
      });
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        darkMode
          ? "dark bg-slate-950 text-white"
          : "bg-linear-to-br from-blue-50 to-indigo-100 text-gray-900"
      } transition-colors duration-300`}
    >
      {/* Custom Window Header */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        data-tauri-drag-region
        className={`${
          darkMode
            ? "bg-slate-900 border-slate-800 text-white"
            : "bg-blue-50 border-blue-200 text-gray-900"
        } border-b z-50 select-none sticky top-0 h-12 flex items-center justify-between px-4 transition-colors duration-300`}
        dir="ltr"
      >
        {/* Left: App Title and Icon */}
        <div
          data-tauri-drag-region
          className="flex items-center gap-3 pointer-events-none h-full"
        >
          <Music className="w-5 h-5 text-blue-500" />
          <h1 className="text-sm font-bold truncate max-w-[300px]">
            {filename || downloadSuccessInfo?.name || t("app_title")}
          </h1>
        </div>

        {/* Right Section: Toggles + Window Controls */}
        <div className="flex items-center h-full">
          {/* Language & Theme Controls */}
          <div
            className="flex items-center gap-2 px-4 border-r border-slate-700/20 dark:border-slate-400/10 h-8 mr-1"
            style={{ direction: "ltr" }}
          >
            <motion.select
              whileTap={{ scale: 0.95 }}
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              className={`px-2 py-1 h-7 text-[11px] rounded border cursor-pointer font-bold transition-all appearance-none text-center ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                  : "bg-white border-blue-200 text-gray-600 hover:text-blue-600 hover:border-blue-400"
              } focus:outline-none min-w-[40px]`}
            >
              <option value="en">EN</option>
              <option value="fa">FA</option>
              <option value="ar">AR</option>
            </motion.select>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                darkMode
                  ? "hover:bg-slate-800 text-yellow-400"
                  : "hover:bg-blue-100 text-blue-600"
              }`}
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.button>
          </div>

          {/* Window Controls Group */}
          <div className="flex items-center gap-1 h-full">
            <button
              onClick={minimize}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-slate-800 text-slate-400"
                  : "hover:bg-gray-200 text-gray-600"
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={toggleMaximize}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-slate-800 text-slate-400"
                  : "hover:bg-gray-200 text-gray-600"
              }`}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={closeWindow}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                darkMode
                  ? "hover:bg-red-500 hover:text-white text-slate-400"
                  : "hover:bg-red-500 hover:text-white text-gray-600"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Internet Status */}
      <AnimatePresence mode="wait">
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-orange-500 text-white px-6 py-3 flex items-center gap-2"
          >
            <WifiOff className="w-5 h-5" />
            <span>{t("no_internet")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${
            darkMode
              ? "bg-slate-900 border-slate-800 shadow-2xl"
              : "bg-white border-blue-200"
          } border rounded-2xl p-8 shadow-lg`}
        >
          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <label className="block text-sm font-semibold mb-2">
              {t("url_label")}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("url_placeholder")}
              disabled={isDownloading}
              className={`w-full px-4 py-3 rounded-lg border-2 cursor-text ${
                darkMode
                  ? "bg-slate-800 border-slate-700 focus:border-blue-500"
                  : "bg-blue-50 border-blue-300 focus:border-blue-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all disabled:opacity-50`}
            />
          </motion.div>

          {/* Filename Input */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <label className="block text-sm font-semibold mb-2">
              {t("filename_label")}
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder={t("filename_placeholder")}
              disabled={isDownloading}
              className={`w-full px-4 py-3 rounded-lg border-2 cursor-text ${
                darkMode
                  ? "bg-slate-800 border-slate-700 focus:border-blue-500"
                  : "bg-blue-50 border-blue-300 focus:border-blue-500"
              } focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all disabled:opacity-50`}
            />
          </motion.div>

          {/* Save Location */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <label className="block text-sm font-semibold mb-2">
              {t("save_location")}
            </label>
            <div className="flex gap-3" style={{ direction: "ltr" }}>
              <input
                type="text"
                value={savePath}
                readOnly
                className={`flex-1 px-4 py-3 rounded-lg border-2 cursor-default ${
                  darkMode
                    ? "bg-slate-800 border-slate-700"
                    : "bg-blue-50 border-blue-300"
                } focus:outline-none`}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={selectFolder}
                disabled={isDownloading}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  darkMode
                    ? "bg-slate-800 hover:bg-slate-700"
                    : "bg-blue-200 hover:bg-blue-300"
                } disabled:opacity-50`}
              >
                <Folder className="w-4 h-4" />
                {t("browse_button")}
              </motion.button>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <AnimatePresence mode="wait">
            {isDownloading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                {downloadStats ? (
                  <>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-semibold text-blue-500">
                        {t("downloading")} {downloadStats.percent.toFixed(1)}%
                      </span>
                      <span className="text-xs font-mono opacity-80">
                        {downloadStats.size}
                      </span>
                    </div>
                    <div
                      className={`w-full h-2.5 rounded-full overflow-hidden ${
                        darkMode ? "bg-slate-800" : "bg-blue-200"
                      }`}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadStats.percent}%` }}
                        transition={{ ease: "linear", duration: 0.3 }}
                        className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-xs font-mono opacity-70">
                      <span>Speed: {downloadStats.speed}</span>
                      <span>ETA: {downloadStats.eta}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold mb-2 text-blue-500 animate-pulse">
                      {t("please_wait")}...
                    </p>
                    <div
                      className={`w-full h-2.5 rounded-full overflow-hidden relative ${darkMode ? "bg-slate-800" : "bg-blue-200"}`}
                    >
                      <div className="absolute top-0 left-0 h-full w-1/3 bg-blue-500 rounded-full animate-[loading_1.5s_infinite_ease-in-out]"></div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              disabled={isDownloading || !ytdlpReady}
              className={`flex-1 px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isDownloading
                  ? darkMode
                    ? "bg-slate-700 text-gray-400"
                    : "bg-gray-300 text-gray-500"
                  : "bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white active:scale-95"
              }`}
            >
              {isDownloading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Download className="w-5 h-5" />
                  </motion.div>
                  {t("please_wait")}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {t("download_button")}
                </>
              )}
            </motion.button>

            {isDownloading && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsDownloading(false)}
                className={`px-6 py-3 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-2 ${
                  darkMode
                    ? "bg-red-900/30 hover:bg-red-900/50 text-red-300"
                    : "bg-red-200 hover:bg-red-300 text-red-700"
                }`}
              >
                <X className="w-5 h-5" />
                {t("cancel_button")}
              </motion.button>
            )}
          </div>

          {/* Persistent Download Success Area */}
          <AnimatePresence>
            {downloadSuccessInfo && !isDownloading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mt-6 p-5 rounded-xl border ${
                  darkMode
                    ? "bg-green-900/10 border-green-800"
                    : "bg-green-50 border-green-200"
                } flex flex-col sm:flex-row items-center justify-between gap-4`}
                dir="ltr"
              >
                <div className="flex items-center gap-4 text-left w-full">
                  <div
                    className={`p-3 rounded-full shrink-0 ${
                      darkMode
                        ? "bg-green-900/50 text-green-400"
                        : "bg-green-200 text-green-700"
                    }`}
                  >
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden w-full">
                    <p
                      className="font-bold text-sm sm:text-base truncate max-w-full"
                      style={{ direction: "ltr" }}
                    >
                      {downloadSuccessInfo.name}
                    </p>
                    <p
                      className={`text-xs mt-1 truncate max-w-full ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                      style={{ direction: "ltr" }}
                    >
                      {downloadSuccessInfo.path}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openPath(downloadSuccessInfo.path)}
                  className="whitespace-nowrap px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white cursor-pointer"
                >
                  <Folder className="w-5 h-5" />
                  {t("open_folder") || "Open Folder"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Alert Messages */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 max-w-md rounded-lg p-4 flex items-start gap-3 shadow-lg backdrop-blur-sm ${
              alert.type === "success"
                ? darkMode
                  ? "bg-green-900/50 border border-green-700"
                  : "bg-green-100 border border-green-300"
                : alert.type === "error"
                  ? darkMode
                    ? "bg-red-900/50 border border-red-700"
                    : "bg-red-100 border border-red-300"
                  : alert.type === "warning"
                    ? darkMode
                      ? "bg-yellow-900/50 border border-yellow-700"
                      : "bg-yellow-100 border border-yellow-300"
                    : darkMode
                      ? "bg-blue-900/50 border border-blue-700"
                      : "bg-blue-100 border border-blue-300"
            } ${
              alert.type === "success"
                ? darkMode
                  ? "text-green-100"
                  : "text-green-800"
                : alert.type === "error"
                  ? darkMode
                    ? "text-red-100"
                    : "text-red-800"
                  : alert.type === "warning"
                    ? darkMode
                      ? "text-yellow-100"
                      : "text-yellow-800"
                    : darkMode
                      ? "text-blue-100"
                      : "text-blue-800"
            }`}
          >
            <div>
              {alert.type === "success" && <Check className="w-5 h-5 mt-0.5" />}
              {alert.type === "error" && (
                <AlertCircle className="w-5 h-5 mt-0.5" />
              )}
              {alert.type === "warning" && (
                <AlertCircle className="w-5 h-5 mt-0.5" />
              )}
              {alert.type === "info" && (
                <AlertCircle className="w-5 h-5 mt-0.5" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{t(`${alert.type}`)}</p>
              <p className="text-sm opacity-90 mt-1">{alert.message}</p>
              {alert.type === "success" && lastFilePath && (
                <button
                  onClick={() => openPath(lastFilePath)}
                  className="mt-2 text-sm font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Folder className="w-4 h-4" />
                  {t("open_folder") || "Open Folder"}
                </button>
              )}
              {(alert.type === "error" || alert.type === "warning") &&
                !isOnline && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-sm font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t("retry")}
                  </button>
                )}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setAlert(null)}
              className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            >
              ✕
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`${
          darkMode ? "border-slate-800" : "border-blue-200"
        } border-t ${darkMode ? "bg-slate-900" : "bg-white"} text-center py-4 text-sm opacity-60`}
      >
        <p dir="ltr">© 2026 YouTube Audio Downloader. Made with ❤️</p>
      </motion.footer>
    </div>
  );
}

export default App;
