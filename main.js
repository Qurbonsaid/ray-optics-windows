const {
  app,
  BrowserWindow,
  Menu,
  screen,
  shell,
  protocol,
} = require("electron");
const path = require("path");
const fs = require("fs");
const url = require("url");

// Keep a global reference of the window object
let mainWindow;

// Base path for www content
const WWW_DIR = path.join(__dirname, "www");

/**
 * Get the app icon path (checks multiple locations)
 */
function getIconPath() {
  const iconPaths = [
    path.join(__dirname, "icon.ico"),
    path.join(__dirname, "icon.png"),
    path.join(WWW_DIR, "img", "icon.png"),
  ];

  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      console.log("Using icon:", iconPath);
      return iconPath;
    }
  }

  console.log("No icon found, using default");
  return undefined;
}

/**
 * Resolve absolute paths (like /gallery or /simulator) to local files
 * Fixed to properly handle Windows paths and path traversal security
 */
function resolveAbsolutePath(requestPath) {
  // Remove leading slash and normalize
  let normalizedPath = requestPath.replace(/^\/+/, "");

  // Handle Windows-style paths that may have drive letter
  normalizedPath = normalizedPath.replace(/^[a-zA-Z]:/, "");
  normalizedPath = normalizedPath.replace(/^\/+/, "");

  // If path is empty, default to gallery index
  if (!normalizedPath) {
    normalizedPath = "gallery/index.html";
  }

  // Construct full path
  let fullPath = path.join(WWW_DIR, normalizedPath);

  // Normalize and resolve to handle .. and . in paths
  fullPath = path.resolve(fullPath);

  // SECURITY: Use path.resolve for proper comparison on Windows
  const normalizedWWW = path.resolve(WWW_DIR);

  // Ensure we're still within WWW_DIR (prevent path traversal)
  if (!fullPath.startsWith(normalizedWWW + path.sep) && fullPath !== normalizedWWW) {
    console.warn("Path escapes www directory, redirecting to gallery");
    return path.join(WWW_DIR, "gallery", "index.html");
  }

  // If it's a directory, look for index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, "index.html");
  }

  // If no extension and file doesn't exist, try adding .html
  if (!path.extname(fullPath) && !fs.existsSync(fullPath)) {
    const htmlPath = fullPath + ".html";
    if (fs.existsSync(htmlPath)) {
      fullPath = htmlPath;
    }
  }

  return fullPath;
}

/**
 * Extract path from phydemo.app URL
 * e.g., https://phydemo.app/ray-optics/gallery/ -> /gallery/
 */
function extractPathFromPhydemoUrl(phydemoPath) {
  // Remove /ray-optics prefix if present
  let localPath = phydemoPath.replace(/^\/ray-optics\/?/, "/");
  if (!localPath.startsWith("/")) {
    localPath = "/" + localPath;
  }
  return localPath;
}

/**
 * Navigate to a local file with proper error handling
 */
function navigateToLocalFile(filePath, hash = "") {
  if (!mainWindow) return;

  if (fs.existsSync(filePath)) {
    console.log("Navigating to:", filePath, hash ? `with hash: ${hash}` : "");
    mainWindow.loadFile(filePath).then(() => {
      if (hash) {
        // Escape hash for safe JavaScript execution
        const safeHash = hash.replace(/["\\]/g, '\\$&');
        mainWindow.webContents.executeJavaScript(
          `window.location.hash = "${safeHash}";`
        ).catch(err => console.error("Failed to set hash:", err));
      }
    }).catch(err => {
      console.error("Failed to load file:", filePath, err);
    });
  } else {
    console.error("File not found:", filePath);
    // Fallback to gallery if file doesn't exist
    const fallback = path.join(WWW_DIR, "gallery", "index.html");
    if (fs.existsSync(fallback)) {
      console.log("Falling back to gallery");
      mainWindow.loadFile(fallback).catch(err => {
        console.error("Failed to load fallback:", err);
      });
    }
  }
}

function createWindow() {
  // Get primary display dimensions for fullscreen kiosk mode (ideal for smart monitors)
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: true, // Start in fullscreen for smart monitors/whiteboards
    autoHideMenuBar: true, // Hide menu bar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
    },
    icon: getIconPath(),
    title: "Ray Optics Gallery",
  });

  // Remove menu bar completely
  Menu.setApplicationMenu(null);

  // Load the gallery page directly
  const galleryPath = path.join(WWW_DIR, "gallery", "index.html");
  mainWindow.loadFile(galleryPath).catch(err => {
    console.error("Failed to load gallery:", err);
  });

  // Handle navigation to intercept absolute paths and external links
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);

      // Handle HTTP/HTTPS URLs
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        // Check if it's phydemo.app (canonical URL in HTML)
        if (navigationUrl.includes("phydemo.app")) {
          // Convert phydemo.app URLs to local file - prevent default navigation
          event.preventDefault();
          const localPath = extractPathFromPhydemoUrl(parsedUrl.pathname);
          const resolvedPath = resolveAbsolutePath(localPath);
          navigateToLocalFile(resolvedPath, parsedUrl.hash);
        } else {
          // External site - open in system browser
          event.preventDefault();
          shell.openExternal(navigationUrl).catch(err => {
            console.error("Failed to open external URL:", err);
          });
        }
        return;
      }

      // Handle file:// URLs with absolute paths
      if (parsedUrl.protocol === "file:") {
        // Decode the file path properly
        let filePath = decodeURIComponent(parsedUrl.pathname);

        // Fix Windows file paths (remove leading slash from /C:/...)
        if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(filePath)) {
          filePath = filePath.substring(1);
        }

        // Check if it's trying to navigate outside www directory
        const normalizedFilePath = path.resolve(filePath);
        const normalizedWWW = path.resolve(WWW_DIR);

        // Only intercept if path is outside www directory
        if (!normalizedFilePath.startsWith(normalizedWWW + path.sep) &&
            normalizedFilePath !== normalizedWWW) {
          event.preventDefault();

          // Try to resolve it relative to www folder
          const resolvedPath = resolveAbsolutePath(parsedUrl.pathname);
          navigateToLocalFile(resolvedPath, parsedUrl.hash);
        }
        // If inside www directory, let it navigate normally (don't prevent)
      }
    } catch (err) {
      console.error("Navigation error:", err);
      event.preventDefault();
    }
  });

  // Handle new window requests (target="_blank" links)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    try {
      const parsedUrl = new URL(targetUrl);

      // Handle HTTP/HTTPS URLs
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        if (targetUrl.includes("phydemo.app")) {
          // For phydemo.app URLs, open locally in the same window
          const localPath = extractPathFromPhydemoUrl(parsedUrl.pathname);
          const resolvedPath = resolveAbsolutePath(localPath);
          navigateToLocalFile(resolvedPath, parsedUrl.hash);
        } else {
          // External site - open in system browser
          shell.openExternal(targetUrl).catch(err => {
            console.error("Failed to open external URL:", err);
          });
        }
        return { action: "deny" };
      }

      // For file:// URLs, handle in same window
      if (parsedUrl.protocol === "file:") {
        let filePath = decodeURIComponent(parsedUrl.pathname);

        // Fix Windows file paths
        if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(filePath)) {
          filePath = filePath.substring(1);
        }

        const resolvedPath = resolveAbsolutePath(filePath);
        navigateToLocalFile(resolvedPath, parsedUrl.hash);
        return { action: "deny" };
      }
    } catch (err) {
      console.error("Window open error:", err);
    }

    return { action: "deny" };
  });

  // Emitted when the window is closed
  mainWindow.on("closed", function () {
    mainWindow = null;
  });

  // Handle keyboard shortcuts
  mainWindow.webContents.on("before-input-event", (event, input) => {
    // F11 to toggle fullscreen
    if (input.key === "F11") {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
    // Escape to exit fullscreen
    if (input.key === "Escape" && mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
    // F5 to refresh
    if (input.key === "F5") {
      mainWindow.reload();
    }
    // Ctrl+Shift+I for DevTools (useful for debugging)
    if (input.control && input.shift && input.key.toLowerCase() === "i") {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Log navigation errors for debugging
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error("Failed to load:", validatedURL);
      console.error("Error code:", errorCode, "Description:", errorDescription);

      // Try to recover by loading gallery
      if (errorCode !== 0 && errorCode !== -3) { // -3 is ERR_ABORTED (normal for prevented navigation)
        const fallback = path.join(WWW_DIR, "gallery", "index.html");
        if (fs.existsSync(fallback)) {
          console.log("Attempting recovery by loading gallery");
          mainWindow.loadFile(fallback).catch(err => {
            console.error("Recovery failed:", err);
          });
        }
      }
    }
  );
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
