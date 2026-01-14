const {
  app,
  BrowserWindow,
  Menu,
  screen,
  shell,
  protocol,
  ipcMain,
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
 */
function resolveAbsolutePath(requestPath) {
  console.log("Resolving path:", requestPath);

  // First, check if requestPath is already an absolute path within www directory
  let normalizedPath = requestPath;
  
  // Handle Windows file URLs (e.g., /C:/Users/.../www/gallery/...)
  if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(normalizedPath)) {
    normalizedPath = normalizedPath.substring(1); // Remove leading slash
  }
  
  // Decode URI components
  try {
    normalizedPath = decodeURIComponent(normalizedPath);
  } catch (e) {
    // Already decoded or invalid encoding
  }
  
  // Convert to proper path and resolve
  normalizedPath = path.resolve(normalizedPath);
  const normalizedWWW = path.resolve(WWW_DIR).toLowerCase();
  
  console.log("Checking if path is already within www:", normalizedPath);
  
  // Check if the path is already a full path within the www directory
  if (normalizedPath.toLowerCase().startsWith(normalizedWWW)) {
    console.log("Path is already within www, using directly");
    let fullPath = normalizedPath;
    
    // If it's a directory, look for index.html
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        console.log("Path is directory, looking for index.html");
        fullPath = path.join(fullPath, "index.html");
      }
    }
    
    // If no extension and file doesn't exist, try adding .html
    if (!path.extname(fullPath) && !fs.existsSync(fullPath)) {
      const htmlPath = fullPath + ".html";
      if (fs.existsSync(htmlPath)) {
        console.log("Found .html version:", htmlPath);
        fullPath = htmlPath;
      }
    }
    
    console.log("Final resolved path:", fullPath);
    return fullPath;
  }
  
  // Otherwise, treat as a relative path from www root
  normalizedPath = requestPath.replace(/^\/+/, "");

  // Handle Windows-style paths that may have drive letter
  normalizedPath = normalizedPath.replace(/^[a-zA-Z]:[\\\/]?/, "");
  normalizedPath = normalizedPath.replace(/^\/+/, "");

  console.log("Normalized relative path:", normalizedPath);

  // If path is empty, default to gallery index
  if (!normalizedPath) {
    normalizedPath = "gallery/index.html";
  }

  // Construct full path
  let fullPath = path.join(WWW_DIR, normalizedPath);
  console.log("Full path before resolve:", fullPath);

  // Normalize and resolve to handle .. and . in paths
  fullPath = path.resolve(fullPath);
  console.log("Full path after resolve:", fullPath);

  // SECURITY: Use path.resolve for proper comparison on Windows (case-insensitive)
  console.log("WWW directory:", normalizedWWW);

  // Ensure we're still within WWW_DIR (prevent path traversal) - case insensitive on Windows
  const isInside = fullPath.toLowerCase().startsWith(normalizedWWW + path.sep) || fullPath.toLowerCase() === normalizedWWW;
  console.log("Is inside WWW?", isInside);

  if (!isInside) {
    console.warn("Path escapes www directory, redirecting to gallery");
    return path.join(WWW_DIR, "gallery", "index.html");
  }

  // If it's a directory, look for index.html
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      console.log("Path is directory, looking for index.html");
      fullPath = path.join(fullPath, "index.html");
    }
  }

  // If no extension and file doesn't exist, try adding .html
  if (!path.extname(fullPath) && !fs.existsSync(fullPath)) {
    const htmlPath = fullPath + ".html";
    if (fs.existsSync(htmlPath)) {
      console.log("Found .html version:", htmlPath);
      fullPath = htmlPath;
    }
  }

  console.log("Final resolved path:", fullPath);
  console.log("File exists?", fs.existsSync(fullPath));

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

/**
 * Ensure exit button exists on the page (inject from main process)
 */
function ensureExitButton() {
  if (!mainWindow) return;
  
  const injectScript = `
    (function() {
      function createExitButton() {
        if (document.getElementById("exit-button-container")) return;
        if (!document.body) {
          setTimeout(createExitButton, 100);
          return;
        }
        
        const container = document.createElement("div");
        container.id = "exit-button-container";
        container.style.cssText = "position:fixed;top:10px;right:10px;z-index:999999;opacity:0.3;transition:opacity 0.3s ease;";
        
        const button = document.createElement("div");
        button.id = "exit-button";
        button.title = "Exit Application";
        button.textContent = "×";
        button.style.cssText = "width:32px;height:24px;background:rgba(220,53,69,0.9);border:1px solid rgba(255,255,255,0.8);border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:white;font-weight:bold;box-shadow:0 1px 5px rgba(0,0,0,0.3);transition:all 0.2s ease;user-select:none;";
        
        button.addEventListener("mouseenter", function() { button.style.background="rgba(220,53,69,1)"; button.style.transform="scale(1.05)"; container.style.opacity="1"; });
        button.addEventListener("mouseleave", function() { button.style.background="rgba(220,53,69,0.9)"; button.style.transform="scale(1)"; container.style.opacity="0.3"; });
        button.addEventListener("click", function() { 
          if(window.electronAPI && window.electronAPI.closeApp) {
            window.electronAPI.closeApp();
          }
        });
        
        container.appendChild(button);
        document.body.appendChild(container);
        
        var hideTimeout;
        function showButton() { 
          container.style.opacity="1"; 
          clearTimeout(hideTimeout); 
          hideTimeout=setTimeout(function(){container.style.opacity="0.3";},3000); 
        }
        document.addEventListener("mousemove", showButton);
        document.addEventListener("touchstart", showButton);
        
        console.log("Exit button injected successfully");
      }
      
      // Try immediately and also with a delay
      createExitButton();
      setTimeout(createExitButton, 200);
    })();
  `;
  
  mainWindow.webContents.executeJavaScript(injectScript).catch(err => {
    console.error("Failed to inject exit button:", err);
  });
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

  // Inject exit button after every page load
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Page finished loading, injecting exit button");
    ensureExitButton();
  });

  // Load the gallery page directly
  const galleryPath = path.join(WWW_DIR, "gallery", "index.html");
  mainWindow.loadFile(galleryPath).catch(err => {
    console.error("Failed to load gallery:", err);
  });

  // Handle navigation to intercept absolute paths and external links
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    console.log("=== Navigation Event ===");
    console.log("URL:", navigationUrl);

    try {
      const parsedUrl = new URL(navigationUrl);
      console.log("Protocol:", parsedUrl.protocol);
      console.log("Pathname:", parsedUrl.pathname);

      // Handle HTTP/HTTPS URLs
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        // Check if it's phydemo.app (canonical URL in HTML)
        if (navigationUrl.includes("phydemo.app")) {
          console.log("Handling phydemo.app URL");
          // Convert phydemo.app URLs to local file - prevent default navigation
          event.preventDefault();
          const localPath = extractPathFromPhydemoUrl(parsedUrl.pathname);
          const resolvedPath = resolveAbsolutePath(localPath);
          navigateToLocalFile(resolvedPath, parsedUrl.hash);
        } else {
          console.log("External URL - opening in browser");
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
        console.log("File URL, decoded path:", filePath);

        // Fix Windows file paths (remove leading slash from /C:/...)
        if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(filePath)) {
          filePath = filePath.substring(1);
          console.log("Fixed Windows path:", filePath);
        }

        // Always intercept file:// URLs to properly resolve .html extensions
        event.preventDefault();
        
        // Resolve the path (adds .html extension, handles directories, etc.)
        const resolvedPath = resolveAbsolutePath(filePath);
        console.log("Resolved file path:", resolvedPath);
        navigateToLocalFile(resolvedPath, parsedUrl.hash);
      }
    } catch (err) {
      console.error("Navigation error:", err);
      event.preventDefault();
    }
  });

  // Handle new window requests (target="_blank" links)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    console.log("=== New Window Request ===");
    console.log("URL:", targetUrl);

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

// Handle IPC messages from renderer
ipcMain.on("close-app", () => {
  console.log("Exit button clicked - closing app");
  if (mainWindow) {
    mainWindow.close();
  }
  app.quit();
});

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
