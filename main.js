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
    path.join(__dirname, "icon.png"),
    path.join(__dirname, "icon.ico"),
    path.join(WWW_DIR, "img", "icon.png"),
    path.join(__dirname, "assets", "icon.png"),
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
 */
function resolveAbsolutePath(requestPath) {
  // Remove leading slash and normalize
  let normalizedPath = requestPath.replace(/^\/+/, "");

  // Handle Windows-style paths that may have drive letter
  normalizedPath = normalizedPath.replace(/^[a-zA-Z]:/, "");
  normalizedPath = normalizedPath.replace(/^\/+/, "");

  // If path is empty, default to index.html
  if (!normalizedPath) {
    normalizedPath = "index.html";
  }

  // Construct full path
  let fullPath = path.join(WWW_DIR, normalizedPath);

  // Normalize to handle .. and . in paths
  fullPath = path.normalize(fullPath);

  // Security: ensure we're still within WWW_DIR
  if (!fullPath.startsWith(WWW_DIR)) {
    console.warn("Path escapes www directory, redirecting to gallery");
    fullPath = path.join(WWW_DIR, "gallery", "index.html");
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
  mainWindow.loadFile(path.join(WWW_DIR, "gallery", "index.html"));

  // Handle navigation to intercept absolute paths and external links
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Handle external links - open in system browser
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      // Check if it's an external site (not phydemo.app which is the canonical URL in the HTML)
      if (!navigationUrl.includes("phydemo.app")) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
        return;
      }

      // For phydemo.app URLs, convert to local file
      event.preventDefault();
      // Extract path, removing /ray-optics prefix
      const localPath = extractPathFromPhydemoUrl(parsedUrl.pathname);
      const resolvedPath = resolveAbsolutePath(localPath);

      if (fs.existsSync(resolvedPath)) {
        // Preserve hash for simulator (e.g., /simulator/#convex-lens)
        const hash = parsedUrl.hash || "";
        mainWindow.loadFile(resolvedPath).then(() => {
          if (hash) {
            mainWindow.webContents.executeJavaScript(
              `window.location.hash = "${hash}";`
            );
          }
        });
      } else {
        console.error("File not found:", resolvedPath);
      }
      return;
    }

    // Handle file:// URLs with absolute paths
    if (parsedUrl.protocol === "file:") {
      const filePath = parsedUrl.pathname;

      // Check if it's trying to navigate to an absolute path outside www
      // This happens when HTML has href="/gallery" type links
      if (!filePath.includes(WWW_DIR) && !filePath.includes("www")) {
        event.preventDefault();

        // Try to find the path relative to our www folder
        const resolvedPath = resolveAbsolutePath(filePath);

        if (fs.existsSync(resolvedPath)) {
          const hash = parsedUrl.hash || "";
          mainWindow.loadFile(resolvedPath).then(() => {
            if (hash) {
              mainWindow.webContents.executeJavaScript(
                `window.location.hash = "${hash}";`
              );
            }
          });
        } else {
          console.error("Cannot resolve path:", filePath, "->", resolvedPath);
        }
      }
    }
  });

  // Handle new window requests (target="_blank" links)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    const parsedUrl = new URL(targetUrl);

    // External links open in system browser
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      if (!targetUrl.includes("phydemo.app")) {
        shell.openExternal(targetUrl);
        return { action: "deny" };
      }

      // For phydemo.app URLs, open locally in the same window
      const localPath = extractPathFromPhydemoUrl(parsedUrl.pathname);
      const resolvedPath = resolveAbsolutePath(localPath);
      const hash = parsedUrl.hash || "";

      if (fs.existsSync(resolvedPath)) {
        mainWindow.loadFile(resolvedPath).then(() => {
          if (hash) {
            mainWindow.webContents.executeJavaScript(
              `window.location.hash = "${hash}";`
            );
          }
        });
      }
      return { action: "deny" };
    }

    // For file:// URLs, handle in same window
    if (parsedUrl.protocol === "file:") {
      const resolvedPath = resolveAbsolutePath(parsedUrl.pathname);
      const hash = parsedUrl.hash || "";

      if (fs.existsSync(resolvedPath)) {
        mainWindow.loadFile(resolvedPath).then(() => {
          if (hash) {
            mainWindow.webContents.executeJavaScript(
              `window.location.hash = "${hash}";`
            );
          }
        });
      }
      return { action: "deny" };
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
      console.error("Error:", errorDescription);
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
