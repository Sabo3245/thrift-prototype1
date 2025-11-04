// theme.js
class ThemeManager {
  constructor() {
    this.toggle = document.getElementById("themeToggle");
    this.html = document.documentElement; // This is the <html> tag
  }

  init() {
    if (!this.toggle) {
      // Failsafe if the toggle isn't on the page (e.g., auth.html)
      this.loadTheme();
      return;
    }

    // 1. Add click listener
    this.toggle.addEventListener("change", () => {
      this.applyTheme(this.toggle.checked ? "light" : "dark");
    });

    // 2. Load the saved theme on page load
    this.loadTheme();
  }

  loadTheme() {
    // 1. Check local storage first
    let theme = localStorage.getItem("theme");

    // 2. If no saved theme, check system preference
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    // 3. Apply the found theme
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    // This is the line that triggers your CSS change
    this.html.setAttribute("data-color-scheme", theme);

    // Save the preference
    localStorage.setItem("theme", theme);

    // Sync the toggle switch's visual state
    if (this.toggle) {
      this.toggle.checked = theme === "light";
    }
  }
}

// Wait for the page to load, then initialize the theme manager
document.addEventListener("DOMContentLoaded", () => {
  const themeManager = new ThemeManager();
  themeManager.init();
});