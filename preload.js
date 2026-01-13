/**
 * Preload script for Ray Optics Gallery
 * This runs in a sandboxed context before the page loads
 */

window.addEventListener("DOMContentLoaded", () => {
  console.log("Ray Optics Gallery - Loaded");

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
