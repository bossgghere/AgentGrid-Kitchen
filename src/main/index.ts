import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import url from "url";
import { HiveInitializer } from "../application/initializer/HiveInitializer.ts";
import { HiveRouter } from "../application/router/HiveRouter.ts";
import { HookServer } from "../application/hooks/HookServer.ts";
import { PtyManager } from "../application/pty/PtyManager.ts";
import { IpcController } from "./ipc/IpcController.ts";

let mainWindow: BrowserWindow | null = null;
let initializer: HiveInitializer;
let router: HiveRouter;
let hookServer: HookServer;
let ptyManager: PtyManager;

async function createWindow() {
  // 1. Initialize Walk-in Fridge Storage (~/.agentgrid/hive/)
  initializer = new HiveInitializer();
  initializer.initialize();

  // 2. Start Hive Router & Hook Server Engine
  router = new HiveRouter();
  router.start();

  hookServer = new HookServer();
  await hookServer.start();

  // 3. Initialize PtyManager
  ptyManager = new PtyManager();

  // 4. Create Desktop BrowserWindow
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "AgentGrid Kitchen — Executive Chef Dashboard",
    backgroundColor: "#020617",
    webPreferences: {
      preload: path.join(process.cwd(), "dist", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 5. Connect IPC Controller
  new IpcController({
    initializer,
    router,
    hookServer,
    ptyManager,
    ipcMain,
    getMainWindow: () => mainWindow,
  });

  const indexPath = path.join(process.cwd(), "index.html");
  mainWindow.loadURL(url.pathToFileURL(indexPath).href);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  router?.stop();
  await hookServer?.stop();
  ptyManager?.killAll();
});
