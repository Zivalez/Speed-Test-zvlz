function play(cue) {
  window.zvlzSfx?.play(cue);
}

function bind(selector, cue) {
  document.querySelectorAll(selector).forEach((element) => {
    element.addEventListener("click", () => play(cue));
  });
}

function bootstrapPacketShell() {
  const start = document.getElementById("btn-test");
  start?.addEventListener("click", () => window.zvlzSfx?.beginTest());

  bind("#btn-settings", "open");
  bind("#close-settings", "close");
  bind("#start-test-from-modal", "start");
  bind("#reset-settings", "cancel");
  bind(".preset-btn, .size-preset-btn, .radio-label", "select");
  bind(".zvlz-packet-brand, .zvlz-packet-nav a, .zvlz-packet-footer a", "select");

  document.querySelector('[data-zvlz-action="toggle-sound"]')?.addEventListener("click", () => {
    window.toggleZvlzSound?.();
  });

  document.getElementById("theme-btn")?.addEventListener("click", () => {
    window.setTimeout(() => {
      window.zvlzSfx?.themeChanged(document.documentElement.dataset.theme || "light");
    }, 0);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapPacketShell, { once: true });
} else {
  bootstrapPacketShell();
}

document.addEventListener("zvlz:packet-completed", () => window.zvlzSfx?.complete());
document.addEventListener("zvlz:packet-error", () => window.zvlzSfx?.fail());
