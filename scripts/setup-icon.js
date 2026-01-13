/**
 * Setup app icon for Electron
 * Copies icon from www folder to app root after download
 */

const fs = require("fs");
const path = require("path");

const WWW_DIR = path.join(__dirname, "..", "www");
const APP_DIR = path.join(__dirname, "..");

// Source and destination paths
const iconSource = path.join(WWW_DIR, "img", "icon.png");
const iconDest = path.join(APP_DIR, "icon.png");

/**
 * Copy icon from www to app root
 */
function setupIcon() {
  console.log("Setting up app icon...");

  // Check if source icon exists
  if (!fs.existsSync(iconSource)) {
    console.log("Warning: Source icon not found at", iconSource);
    console.log("Icon will be set up after first build/start");
    return;
  }

  // Copy icon to app root for easier access
  try {
    fs.copyFileSync(iconSource, iconDest);
    console.log("Icon copied to:", iconDest);
  } catch (error) {
    console.error("Failed to copy icon:", error.message);
  }
}

setupIcon();
