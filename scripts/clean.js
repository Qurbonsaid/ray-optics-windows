/**
 * Clean downloaded and extracted files
 */

const fs = require("fs");
const path = require("path");

const DOWNLOAD_DIR = path.join(__dirname, "..", ".cache");
const WWW_DIR = path.join(__dirname, "..", "www");

console.log("Cleaning Ray Optics files...");

if (fs.existsSync(DOWNLOAD_DIR)) {
  fs.rmSync(DOWNLOAD_DIR, { recursive: true, force: true });
  console.log("Removed: .cache/");
}

if (fs.existsSync(WWW_DIR)) {
  fs.rmSync(WWW_DIR, { recursive: true, force: true });
  console.log("Removed: www/");
}

console.log("Clean complete!");
