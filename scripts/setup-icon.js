/**
 * Setup app icon for Electron
 * Icon is now included in the repository (icon.png)
 * This script is kept for compatibility but does nothing
 */

const fs = require("fs");
const path = require("path");

const APP_DIR = path.join(__dirname, "..");
const iconPath = path.join(APP_DIR, "icon.png");

console.log("Checking app icon...");

if (fs.existsSync(iconPath)) {
  console.log("Icon found: icon.png");
} else {
  console.warn("Warning: icon.png not found in repository");
}
