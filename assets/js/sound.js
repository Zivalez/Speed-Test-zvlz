import { createUISFX } from "../vendor/uisfx.js";

// Packs: minimal, soft, glass, arcade, mechanical, organic, dreamy,
// scifi, rubber, cinematic, studio, and zen.
const player = createUISFX({
  pack: "studio",
  volume: 1,
  preferences: { key: "zvlz-network:sound" }
});

let activeLoop = null;
let activeLoopCue = "";
let soundEnabled = player.isEnabled();
let unlockPromise = null;

function syncSoundControls() {
  document.querySelectorAll(".sound-status").forEach((label) => {
    label.textContent = soundEnabled ? "SFX ON" : "SFX OFF";
  });

  document.querySelectorAll(".sound-control").forEach((control) => {
    control.setAttribute("aria-pressed", String(soundEnabled));
    control.setAttribute("aria-label", soundEnabled ? "Mute interface sound" : "Enable interface sound");
  });
}

async function unlockSound() {
  if (!soundEnabled) return false;
  if (!unlockPromise) {
    unlockPromise = player.unlock().finally(() => {
      unlockPromise = null;
    });
  }
  return unlockPromise;
}

function play(cue, options) {
  if (!soundEnabled) return null;
  return player.play(cue, options);
}

function stopLoop() {
  activeLoop?.stop();
  activeLoop = null;
  activeLoopCue = "";
}

function startLoop(cue) {
  if (!soundEnabled || activeLoopCue === cue) return;
  stopLoop();
  activeLoop = player.play(cue);
  activeLoopCue = activeLoop ? cue : "";
}

const zvlzSfx = {
  play,

  async beginTest() {
    if (!await unlockSound()) return;
    stopLoop();
    play("start");
    startLoop("connecting");
  },

  stage(stageName) {
    stopLoop();
    play("progress-step");
    startLoop(stageName === "download" ? "streaming" : "processing");
  },

  complete() {
    stopLoop();
    play("complete");
  },

  fail() {
    stopLoop();
    play("error");
  },

  themeChanged(mode) {
    play(mode === "dark" ? "toggle-on" : "toggle-off");
  }
};

window.zvlzSfx = zvlzSfx;

window.toggleZvlzSound = async function toggleZvlzSound() {
  if (soundEnabled) {
    const toggleOff = player.play("toggle-off");
    soundEnabled = false;
    stopLoop();
    syncSoundControls();

    if (toggleOff) {
      await toggleOff.ended;
    }
    player.setEnabled(false);
    return;
  }

  soundEnabled = true;
  player.setEnabled(true);
  syncSoundControls();
  if (await unlockSound()) {
    player.play("toggle-on");
  }
};

window.zvlzResetTest = function zvlzResetTest() {
  stopLoop();
  play("cancel");
  window.setTimeout(() => window.location.assign(window.location.pathname), 220);
};

window.zvlzRestartTest = function zvlzRestartTest() {
  stopLoop();
  play("retry");
  window.setTimeout(() => window.location.assign(`${window.location.pathname}?run=0`), 220);
};

window.zvlzOpenPacketLoss = function zvlzOpenPacketLoss() {
  stopLoop();
  play("select");
  window.setTimeout(() => window.location.assign("/packet-loss/"), 180);
};

document.addEventListener("pointerdown", unlockSound, { capture: true });
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") unlockSound();
}, { capture: true });

window.addEventListener("pagehide", stopLoop);
window.addEventListener("load", () => window.setTimeout(syncSoundControls, 0));
