(function () {
  "use strict";

  function getCookie(name) {
    var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var match = document.cookie.match(new RegExp("(?:^|;\\s*)" + escaped + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }

  var queryMode = new URLSearchParams(window.location.search).get("mode");
  var cookieMode = getCookie("mode");
  var systemMode = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  var mode = queryMode === "dark" || queryMode === "light"
    ? queryMode
    : cookieMode === "dark" || cookieMode === "light"
      ? cookieMode
      : systemMode;

  document.documentElement.dataset.theme = mode;
  document.documentElement.classList.toggle("dark", mode === "dark");

  if (mode === "dark" && document.documentElement.dataset.app === "speed-test") {
    var darkStyle = document.createElement("link");
    darkStyle.id = "darkmode";
    darkStyle.rel = "stylesheet";
    darkStyle.href = "__DARK_MODE_CSS__";
    document.head.appendChild(darkStyle);
  }
})();
