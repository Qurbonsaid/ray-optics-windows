/**
 * Download and extract Ray Optics release from GitHub
 * This script runs automatically before build/start via npm scripts
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Read version from package.json
const packageJson = require("../package.json");
const VERSION = packageJson.rayOpticsVersion || "5.2.0";
const DOWNLOAD_URL = `https://github.com/ricktu288/ray-optics/releases/download/v${VERSION}/website-build.zip`;

const DOWNLOAD_DIR = path.join(__dirname, "..", ".cache");
const ZIP_FILE = path.join(DOWNLOAD_DIR, `website-build-v${VERSION}.zip`);
const WWW_DIR = path.join(__dirname, "..", "www");
const MARKER_FILE = path.join(WWW_DIR, ".version");

/**
 * Check if we need to download/extract
 */
function needsUpdate() {
  // Check if www folder exists and has correct version
  if (fs.existsSync(MARKER_FILE)) {
    const currentVersion = fs.readFileSync(MARKER_FILE, "utf8").trim();
    if (currentVersion === VERSION) {
      console.log(`Ray Optics v${VERSION} already extracted`);
      return false;
    }
  }
  return true;
}

/**
 * Download file with redirect support
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);

    const file = fs.createWriteStream(dest);

    const request = (url) => {
      https
        .get(url, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            console.log(`Redirecting to: ${redirectUrl}`);
            request(redirectUrl);
            return;
          }

          if (response.statusCode !== 200) {
            reject(
              new Error(`Failed to download: HTTP ${response.statusCode}`)
            );
            return;
          }

          const totalSize = parseInt(response.headers["content-length"], 10);
          let downloadedSize = 0;

          response.on("data", (chunk) => {
            downloadedSize += chunk.length;
            // Progress logging disabled for cleaner CI output
          });

          response.pipe(file);

          file.on("finish", () => {
            file.close();
            console.log("Download complete!");
            resolve();
          });
        })
        .on("error", (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
    };

    request(url);
  });
}

/**
 * Extract zip file
 */
function extractZip(zipPath, destDir) {
  console.log(`Extracting to: ${destDir}`);

  // Clean destination
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // Use system unzip command (available on Windows, Mac, Linux)
  try {
    if (process.platform === "win32") {
      // PowerShell on Windows
      execSync(
        `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
        {
          stdio: "inherit",
        }
      );
    } else {
      // unzip on Mac/Linux
      execSync(`unzip -q -o "${zipPath}" -d "${destDir}"`, {
        stdio: "inherit",
      });
    }
    console.log("Extraction complete!");
  } catch (error) {
    throw new Error(`Failed to extract: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`\n=== Ray Optics Release Downloader ===`);
  console.log(`Version: ${VERSION}\n`);

  if (!needsUpdate()) {
    return;
  }

  // Create cache directory
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  }

  // Download if not cached
  if (!fs.existsSync(ZIP_FILE)) {
    console.log(`Downloading Ray Optics v${VERSION}...`);
    await downloadFile(DOWNLOAD_URL, ZIP_FILE);
  } else {
    console.log(`Using cached download: ${ZIP_FILE}`);
  }

  // Extract
  extractZip(ZIP_FILE, WWW_DIR);

  // Write version marker
  fs.writeFileSync(MARKER_FILE, VERSION);

  console.log(`\nRay Optics v${VERSION} is ready!\n`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
