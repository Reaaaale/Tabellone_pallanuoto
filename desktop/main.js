// main.js
const path = require("path");
const { app, BrowserWindow, screen, globalShortcut, ipcMain } = require("electron");
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

function pickLedDisplay() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  const byLedwall = displays.find((d) => d.size.width === 960 && d.size.height === 480);
  if (byLedwall) return byLedwall;

  const secondary = displays.find((d) => d.id !== primary.id);
  return secondary || primary;
}

function forceWindowToDisplay(win, targetDisplay) {
  const b = targetDisplay.bounds;

  win.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height }, false);
  win.setKiosk(true);
  win.setFullScreen(true);
}

function loadDisplayURL(win) {
  if (isDev) {
    win.loadURL("http://localhost:5173/#/display");
  } else {
    if (!fs.existsSync(indexHtml)) {
      console.error("[electron] index html not found:", indexHtml);
    }
    win.loadFile(indexHtml, { hash: "/display" });
  }
}

function loadControlURL(win) {
  if (isDev) {
    win.loadURL("http://localhost:5173/#/");
  } else {
    if (!fs.existsSync(indexHtml)) {
      console.error("[electron] index html not found:", indexHtml);
    }
    win.loadFile(indexHtml, { hash: "/" });
  }
}

function createDisplayWindow() {
  if (displayWindow) return;
  const target = pickLedDisplay();

  displayWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#000",
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: true,
    skipTaskbar: true,
    focusable: true,
    webPreferences: {
      contextIsolation: true,
    },
  });

  displayWindow.setMenu(null);
  loadDisplayURL(displayWindow);

  displayWindow.once("ready-to-show", () => {
    try {
      forceWindowToDisplay(displayWindow, target);
    } catch (e) {
      console.error("[electron] forceWindowToDisplay error:", e);
    }
    displayWindow.show();
    displayWindow.focus();
  });

  displayWindow.on("move", () => {
    const t = pickLedDisplay();
    if (displayWindow) forceWindowToDisplay(displayWindow, t);
  });

  displayWindow.on("closed", () => {
    displayWindow = null;
  });
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
      preload: path.join(__dirname, "preload.js"),
    },
  });

  loadControlURL(controlWindow);

  controlWindow.on("closed", () => {
    controlWindow = null;
    app.quit();
  });
}

app.whenReady().then(() => {
  startServer();
  createControlWindow();

  globalShortcut.register("CommandOrControl+Q", () => {
    app.quit();
  });

  const reapply = () => {
    if (!displayWindow) return;
    const t = pickLedDisplay();
    forceWindowToDisplay(displayWindow, t);
  };

  screen.on("display-added", reapply);
  screen.on("display-removed", reapply);
  screen.on("display-metrics-changed", reapply);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createDisplayWindow();
      createControlWindow();
    }
  });
});

ipcMain.on("open-display", () => {
  createDisplayWindow();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
