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
- Windows 7 or higher (64-bit or 32-bit)

## Building

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
├── scripts/
│   ├── download-release.js  # Downloads Ray Optics
│   └── clean.js             # Cleanup script
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

## License

This application is licensed under the Apache License 2.0, the same license as the original Ray Optics Simulation project.

See [LICENSE](LICENSE) for the full license text.

## Credits

- **Ray Optics Simulation** - Original web application by [Yi-Ting Tu](https://github.com/ricktu288) and contributors
- **Project Website** - https://phydemo.app/ray-optics/
- **Source Repository** - https://github.com/ricktu288/ray-optics

## Contributing

Contributions are welcome! Please ensure any modifications comply with the Apache 2.0 license terms.
