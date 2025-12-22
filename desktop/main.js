const path = require("path");
const { app, BrowserWindow, screen } = require("electron");
const { fork } = require("child_process");
const fs = require("fs");

const isDev = !app.isPackaged;
const appRoot = path.join(__dirname, "..");
const appAsar = path.join(process.resourcesPath, "app.asar");
const appUnpacked = path.join(process.resourcesPath, "app.asar.unpacked");
const appPath = isDev ? appRoot : appAsar;
const distDir = path.join(appPath, "client", "dist");
const indexHtml = path.join(distDir, "index.html");
const serverEntry = isDev
  ? path.join(appRoot, "server", "dist", "server", "src", "index.js")
  : path.join(appUnpacked, "server", "dist", "server", "src", "index.js");
const nodeModulesPath = isDev ? path.join(appRoot, "node_modules") : path.join(appUnpacked, "node_modules");

let serverProcess = null;
let controlWindow = null;
let displayWindow = null;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

function startServer() {
  if (serverProcess) return;
  if (!fs.existsSync(serverEntry)) {
    console.error("[electron] server entry not found:", serverEntry);
    return;
  }
  console.log("[electron] starting server:", serverEntry);
  serverProcess = fork(serverEntry, {
    env: {
      ...process.env,
      PORT: process.env.PORT || "4000",
      NODE_PATH: [nodeModulesPath, process.env.NODE_PATH || ""].filter(Boolean).join(path.delimiter),
    },
    stdio: "inherit",
    detached: false,
  });
  serverProcess.on("exit", (code, signal) => {
    console.error("[electron] server exited", { code, signal });
    serverProcess = null;
  });
}

function createDisplayWindow() {
  const displays = screen.getAllDisplays();
  const external = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);
  const target = external || displays[0];

  displayWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    backgroundColor: "#0b0f12",
    webPreferences: {
      contextIsolation: true,
    },
  });

  if (isDev) {
    displayWindow.loadURL("http://localhost:5173/#/display");
  } else {
    if (!fs.existsSync(indexHtml)) {
      console.error("[electron] index html not found:", indexHtml);
    }
    displayWindow.loadFile(indexHtml, { hash: "display" });
  }
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    autoHideMenuBar: true,
    backgroundColor: "#0b0f12",
    webPreferences: {
      contextIsolation: true,
    },
  });

  if (isDev) {
    controlWindow.loadURL("http://localhost:5173/#/setup");
  } else {
    if (!fs.existsSync(indexHtml)) {
      console.error("[electron] index html not found:", indexHtml);
    }
    controlWindow.loadFile(indexHtml, { hash: "setup" });
  }
}

app.whenReady().then(() => {
  startServer();
  createDisplayWindow();
  createControlWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
      createDisplayWindow();
    }
  });
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
