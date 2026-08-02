(function () {
  "use strict";

  function darkStylesheet() {
    return document.getElementById("darkmode");
  }

  function syncThemeControls() {
    var isDark = Boolean(darkStylesheet()) || document.documentElement.dataset.theme === "dark";
    var darkButtons = [document.getElementById("nightmode"), document.getElementById("nightmode-Mob")];
    var lightButtons = [document.getElementById("daymode"), document.getElementById("daymode-Mob")];

    darkButtons.forEach(function (button) {
      if (button) button.style.display = isDark ? "none" : "block";
    });
    lightButtons.forEach(function (button) {
      if (button) button.style.display = isDark ? "block" : "none";
    });
  }

  function createCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/; SameSite=Lax";
  }

  function setSkin(mode) {
    var darkStyle = darkStylesheet();
    var isDark = mode === "dark";

    if (isDark && !darkStyle) {
      darkStyle = document.createElement("link");
      darkStyle.id = "darkmode";
      darkStyle.rel = "stylesheet";
      darkStyle.href = "__DARK_MODE_CSS__";
      document.head.appendChild(darkStyle);
    } else if (!isDark && darkStyle) {
      darkStyle.remove();
    }

    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", isDark);
    createCookie("mode", isDark ? "dark" : "light", 365);
    syncThemeControls();
    window.zvlzSfx?.themeChanged(isDark ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: { theme: isDark ? "dark" : "light" } }));
  }

  function toggleSkin() {
    setSkin(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  }

  function runAction(action) {
    if (action === "toggle-theme") toggleSkin();
    if (action === "toggle-sound") window.toggleZvlzSound?.();
    if (action === "reset-test") window.zvlzResetTest?.();
    if (action === "restart-test") window.zvlzRestartTest?.();
  }

  function bindInteractiveControls() {
    document.querySelectorAll("[data-zvlz-action]").forEach(function (control) {
      if (control.dataset.actionBound === "true") return;
      control.dataset.actionBound = "true";
      control.addEventListener("click", function () {
        runAction(control.dataset.zvlzAction);
      });
    });

    document.querySelectorAll('[role="button"][tabindex="0"]').forEach(function (control) {
      if (control.dataset.keyboardBound === "true") return;
      control.dataset.keyboardBound = "true";
      control.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          control.click();
        }
      });
    });
  }

  window.setSkin = setSkin;
  window.toggleSkin = toggleSkin;
  window.createCookie = createCookie;

  document.addEventListener("DOMContentLoaded", function () {
    syncThemeControls();
    bindInteractiveControls();
  }, { once: true });
  document.addEventListener("zvlz:ui-mounted", function () {
    syncThemeControls();
    bindInteractiveControls();
  });
})();
