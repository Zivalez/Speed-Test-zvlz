let darkStyle;

window.addEventListener("load", syncThemeControls);

function syncThemeControls() {
  const isDark = Boolean(document.getElementById("darkmode"));
  const darkButtons = [document.getElementById("nightmode"), document.getElementById("nightmode-Mob")];
  const lightButtons = [document.getElementById("daymode"), document.getElementById("daymode-Mob")];

  darkButtons.forEach((button) => {
    if (button) button.style.display = isDark ? "none" : "block";
  });
  lightButtons.forEach((button) => {
    if (button) button.style.display = isDark ? "block" : "none";
  });
}

function setSkin(mode) {
  darkStyle = document.getElementById("darkmode");

  if (mode === "dark" && !darkStyle) {
    darkStyle = document.createElement("link");
    darkStyle.id = "darkmode";
    darkStyle.rel = "stylesheet";
    darkStyle.href = "assets/css/darkmode.css?v=7";
    document.head.appendChild(darkStyle);
  }

  if (mode === "light" && darkStyle) {
    darkStyle.remove();
  }

  createCookie("mode", mode, 365);
  syncThemeControls();
  window.zvlzSfx?.themeChanged(mode);
}

function toggleSkin() {
  setSkin(document.getElementById("darkmode") ? "light" : "dark");
}

function createCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}
