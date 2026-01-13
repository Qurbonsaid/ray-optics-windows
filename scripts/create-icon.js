/**
 * Create a simple 256x256 icon for the build process
 * Uses Canvas to create a placeholder icon
 */

const fs = require("fs");
const path = require("path");

// Create a simple SVG icon
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" fill="#1a1a2e"/>
  <circle cx="128" cy="128" r="80" fill="none" stroke="#16c7ff" stroke-width="4"/>
  <line x1="48" y1="128" x2="208" y2="128" stroke="#16c7ff" stroke-width="2"/>
  <line x1="128" y1="48" x2="128" y2="208" stroke="#16c7ff" stroke-width="2"/>
  <path d="M 128 48 L 180 100 L 128 128 L 76 100 Z" fill="#16c7ff" opacity="0.6"/>
  <text x="128" y="220" font-family="Arial" font-size="20" fill="#16c7ff" text-anchor="middle">Ray Optics</text>
</svg>`;

const iconPath = path.join(__dirname, "..", "icon.svg");
fs.writeFileSync(iconPath, svg);
console.log("Created icon.svg - Note: electron-builder will need icon.png");
console.log("For production, add a proper 256x256 PNG icon to the repository");
