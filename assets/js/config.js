/* Runtime configuration loaded before the OpenSpeedTest engine. */
var openSpeedTestServerList = [
  {
    ServerName: "ZVLZ Auto Node",
    Download: "/downloading",
    Upload: "/upload",
    ServerIcon: "DefaultIcon"
  }
];

var pingSamples = 10;
var jitterFinalSample = 0.5;
var setPingSamples = true;
var pingTimeOut = 5000;
var setPingTimeout = true;
var pingMethod = "GET";
var pingFile = "Upload";

var ulDataSize = 30;
var ulDelay = 300;
var dlDelay = 300;

var upAdjust = 1.04;
var dlAdjust = 1.04;
var enableClean = true;

var dlDuration = 12;
var ulDuration = 12;
var dlThreads = 6;
var ulThreads = 6;
var setHTTPReq = true;

var saveData = false;
var saveDataURL = "/save-result";

var stressTest = true;
var selectTest = true;
var selectServer = true;
var enableRun = true;
var openChannel = "dev";

function ostOnload() {
  var build = document.querySelector('meta[name="zvlz-build"]')?.content || "development";
  console.info("ZVLZ Network Test ready", { build: build });
}
