(function () {
  "use strict";

  var platform = "self";
  window.TEST_CONFIG = {
    platform: platform,
    presets: {
      quick: { duration: 10, packetCount: 640, interval: 15.625 },
      default: { duration: 30, packetCount: 1920, interval: 15.625 },
      max: {
        duration: platform === "web" ? 300 : Infinity,
        packetCount: platform === "web" ? 6000 : Infinity,
        interval: 50
      }
    }
  };
})();
