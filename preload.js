/**
 * Preload script for Ray Optics Gallery
 * This runs in a sandboxed context before the page loads
 */

const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  closeApp: () => ipcRenderer.send("close-app"),
});

window.addEventListener("DOMContentLoaded", () => {
  console.log("Ray Optics Gallery - Loaded");

  // Inject exit button into the page
  injectExitButton();

  // Disable context menu (right-click) for cleaner kiosk experience
  // Can be enabled for debugging by pressing Ctrl+Shift+I
  document.addEventListener("contextmenu", (e) => {
    // Allow context menu in DevTools only
    if (!e.target.closest("devtools")) {
      // e.preventDefault(); // Uncomment to disable right-click menu
    }
  });

  // Log any JavaScript errors for debugging
  window.addEventListener("error", (event) => {
    console.error(
      "Page error:",
      event.message,
      "at",
      event.filename,
      ":",
      event.lineno
    );
  });

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
  });
});

/**
 * Inject exit button into the page for touchscreen devices
 */
function injectExitButton() {
  // Create container
  const container = document.createElement("div");
  container.id = "exit-button-container";
  container.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 999999;
    opacity: 0.3;
    transition: opacity 0.3s ease;
  `;

  // Create button
  const button = document.createElement("div");
  button.id = "exit-button";
  button.title = "Exit Application";
  button.textContent = "×";
  button.style.cssText = `
    width: 50px;
    height: 50px;
    background: rgba(220, 53, 69, 0.9);
    border: 2px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
    user-select: none;
  `;

  // Add hover effects
  button.addEventListener("mouseenter", () => {
    button.style.background = "rgba(220, 53, 69, 1)";
    button.style.transform = "scale(1.1)";
    button.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.4)";
    container.style.opacity = "1";
  });

  button.addEventListener("mouseleave", () => {
    button.style.background = "rgba(220, 53, 69, 0.9)";
    button.style.transform = "scale(1)";
    button.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.3)";
    container.style.opacity = "0.3";
  });

  button.addEventListener("mousedown", () => {
    button.style.transform = "scale(0.95)";
  });

  button.addEventListener("mouseup", () => {
    button.style.transform = "scale(1.1)";
  });

  // Handle click to close app
  button.addEventListener("click", () => {
    if (window.electronAPI && window.electronAPI.closeApp) {
      window.electronAPI.closeApp();
    } else {
      window.close();
    }
  });

  // Assemble and inject
  container.appendChild(button);
  document.body.appendChild(container);

  // Show button temporarily on mouse movement or touch
  let hideTimeout;

  function showButton() {
    container.style.opacity = "1";
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      container.style.opacity = "0.3";
    }, 3000);
  }

  document.addEventListener("mousemove", showButton);
  document.addEventListener("touchstart", showButton);

  // Make button larger on touch devices
  if (window.matchMedia("(pointer: coarse)").matches) {
    button.style.width = "60px";
    button.style.height = "60px";
    button.style.fontSize = "32px";
    container.style.opacity = "0.5";
  }
}
