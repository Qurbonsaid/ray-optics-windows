# Ray Optics Gallery - Windows App

A portable Windows application that wraps the [Ray Optics Simulation](https://phydemo.app/ray-optics/) web application, designed for use on smart monitors and interactive whiteboards in schools and educational institutes.

## Features

- **Opens directly to Gallery** - Launches straight to the simulation gallery
- **Fullscreen Mode** - Optimized for smart monitors and whiteboards
- **Portable** - No installation required, runs from a single .exe
- **Offline Capable** - All assets bundled in the application
- **Keyboard Shortcuts** - F11 (fullscreen), F5 (refresh), Escape (exit fullscreen)

## Requirements

### For Building
- Node.js 16 or higher
- npm

### For Running
- Windows 10 or higher (64-bit or 32-bit)

## Building Locally

### Quick Build

```bash
npm install
npm run build
```

The portable `.exe` will be created in the `dist/` folder.

### What Happens During Build

1. **Auto-downloads** Ray Optics release from GitHub (cached in `.cache/`)
2. **Extracts** to `www/` folder
3. **Packages** into a portable Windows executable

### Available Commands

```bash
npm run download   # Just download Ray Optics (manual)
npm run start      # Run in development mode
npm run build      # Build portable .exe
npm run build:dir  # Build unpacked (for testing)
npm run clean      # Remove downloaded files
```

## Creating a Release

### Automatic (GitHub Actions)

This project uses GitHub Actions to automatically build releases. To save on usage minutes, builds are triggered:

1. **Manually** via GitHub Actions UI
2. **Automatically** when you push a version tag

#### Method 1: Manual Trigger (Recommended for Testing)

1. Go to https://github.com/Qurbonsaid/ray-optics-windows/actions
2. Click "Build and Release" workflow
3. Click "Run workflow" button
4. Select the main branch
5. Click "Run workflow"

#### Method 2: Create a Release Tag

```bash
# Using the helper script
./release.sh 1.0.1

# Or manually
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

The workflow will automatically:
- Build the Windows portable executable
- Create/update the release
- Upload the .exe file

### Why This Approach?

GitHub Actions has usage limits:
- **Free accounts**: 2,000 minutes/month for private repos
- **Windows runners**: Count as 2x minutes (1 minute build = 2 usage minutes)

By using manual triggers or tags, you control when builds happen and save your monthly quota.

## Updating Ray Optics Version

Edit `package.json` and change:
```json
"rayOpticsVersion": "5.2.0"
```

Then run `npm run clean && npm run build` to rebuild with the new version.

## Project Structure

```
windows-app/
├── main.js              # Electron main process
├── preload.js           # Preload script
├── package.json         # Config and dependencies
├── icon.ico             # Windows icon (256x256+)
├── icon.png             # Fallback icon
├── scripts/
│   ├── download-release.js  # Downloads Ray Optics
│   └── clean.js             # Cleanup script
├── .github/
│   └── workflows/
│       └── build-and-release.yml  # GitHub Actions workflow
├── www/                 # Ray Optics files (auto-downloaded)
├── .cache/              # Downloaded zip cache
└── dist/                # Built executables
```

## Configuration

### Changing Start Page

Edit `main.js` and modify the loadFile path:
```javascript
mainWindow.loadFile(path.join(__dirname, 'www', 'gallery', 'index.html'));
```

### Window Settings

Edit `main.js` to change:
- Initial window size
- Fullscreen behavior
- Menu visibility

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F11 | Toggle fullscreen |
| Escape | Exit fullscreen |
| F5 | Refresh page |
| Ctrl+Shift+I | Open DevTools (debugging) |

## Troubleshooting

### Build fails with "icon must be at least 256x256"
The icon.ico file must be at least 256x256 pixels. The repository includes a proper icon file.

### Navigation not working
Make sure you're using the latest version of main.js with proper path resolution fixes.

### Build quota exceeded
If you hit GitHub Actions limits, use manual workflow triggers or build locally instead.

## License

This application is licensed under the Apache License 2.0, the same license as the original Ray Optics Simulation project.

See [LICENSE](LICENSE) for the full license text.

## Credits

- **Ray Optics Simulation** - Original web application by [Yi-Ting Tu](https://github.com/ricktu288) and contributors
- **Project Website** - https://phydemo.app/ray-optics/
- **Source Repository** - https://github.com/ricktu288/ray-optics

## Contributing

Contributions are welcome! Please ensure any modifications comply with the Apache 2.0 license terms.
