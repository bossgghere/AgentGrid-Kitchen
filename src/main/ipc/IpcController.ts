import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import { IPC_CHANNELS } from "../../shared/ipc.types.ts";
import { HiveInitializer } from "../../application/initializer/HiveInitializer.ts";
import { HiveRouter } from "../../application/router/HiveRouter.ts";
import { HookServer } from "../../application/hooks/HookServer.ts";
import { PtyManager } from "../../application/pty/PtyManager.ts";
import type { ChefRole, OrderTicket, BrigadeRegistry } from "../../domain/types/hive.types.ts";
import type { PtySpawnOptions } from "../../domain/types/pty.types.ts";

export interface IpcControllerOptions {
  initializer: HiveInitializer;
  router: HiveRouter;
  hookServer: HookServer;
  ptyManager: PtyManager;
  ipcMain: {
    handle: (channel: string, listener: (event: any, ...args: any[]) => any) => void;
  };
  getMainWindow: () => { webContents: { send: (channel: string, ...args: any[]) => void } } | null;
}

export class IpcController {
  private initializer: HiveInitializer;
  private router: HiveRouter;
  private hookServer: HookServer;
  private ptyManager: PtyManager;
  private previewServer: http.Server | null = null;
  private activeWorkspacePath: string = "";
  private readonly PREVIEW_PORT = 5274;

  constructor(options: IpcControllerOptions) {
    this.initializer = options.initializer;
    this.router = options.router;
    this.hookServer = options.hookServer;
    this.ptyManager = options.ptyManager;

    this.registerHandlers(options.ipcMain, options.getMainWindow);
    this.bindEngineEvents(options.getMainWindow);
  }

  /**
   * Discovers the installed agy CLI binary
   */
  public getAgyBinary(): string | null {
    if (process.env.AGY_PATH && fs.existsSync(process.env.AGY_PATH)) return process.env.AGY_PATH;
    const candidates = [
      path.join(os.homedir(), ".local", "bin", "agy"),
      "/usr/local/bin/agy",
      "/opt/homebrew/bin/agy",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  /**
   * Registers all Electron IPC Channel Handlers
   */
  private registerHandlers(
    ipcMain: IpcControllerOptions["ipcMain"],
    getMainWindow: IpcControllerOptions["getMainWindow"]
  ): void {
    // 1. Spawn Agent Process
    ipcMain.handle(IPC_CHANNELS.SPAWN_AGENT, (_event, options: PtySpawnOptions) => {
      return this.ptyManager.spawnAgent(options);
    });

    // 1b. Spawn Real Interactive AGY CLI Session
    ipcMain.handle(IPC_CHANNELS.SPAWN_AGY, (_event, workspacePath?: string, role: ChefRole = "headchef") => {
      const targetDir = workspacePath || this.activeWorkspacePath || process.cwd();
      if (targetDir && fs.existsSync(targetDir)) {
        this.activeWorkspacePath = targetDir;
        this.ensurePreviewServerRunning();
      }
      const agyBin = this.getAgyBinary();
      const cmd = agyBin || process.env.SHELL || "/bin/zsh";
      const args = agyBin ? ["--dangerously-skip-permissions"] : ["-l"];

      return this.ptyManager.spawnAgent({
        role,
        command: cmd,
        args,
        cwd: targetDir,
        interactive: true,
      });
    });

    // 1c. Restart Interactive AGY CLI Session
    ipcMain.handle(IPC_CHANNELS.RESTART_AGY, (_event, workspacePath?: string, role: ChefRole = "headchef") => {
      this.ptyManager.killAgent(role);
      const targetDir = workspacePath || this.activeWorkspacePath || process.cwd();
      if (targetDir && fs.existsSync(targetDir)) {
        this.activeWorkspacePath = targetDir;
        this.ensurePreviewServerRunning();
      }
      const agyBin = this.getAgyBinary();
      const cmd = agyBin || process.env.SHELL || "/bin/zsh";
      const args = agyBin ? ["--dangerously-skip-permissions"] : ["-l"];

      return this.ptyManager.spawnAgent({
        role,
        command: cmd,
        args,
        cwd: targetDir,
        interactive: true,
      });
    });

    // 1d. Resize PTY Terminal (cols, rows)
    ipcMain.handle(IPC_CHANNELS.RESIZE_AGENT, (_event, role: ChefRole, cols: number, rows: number) => {
      return this.ptyManager.resizeAgent(role, cols, rows);
    });

    // 2. Write stdin Data to Agent
    ipcMain.handle(IPC_CHANNELS.WRITE_AGENT, (_event, role: ChefRole, data: string) => {
      return this.ptyManager.writeToAgent(role, data);
    });

    // 3. Kill Agent Process
    ipcMain.handle(IPC_CHANNELS.KILL_AGENT, (_event, role: ChefRole) => {
      return this.ptyManager.killAgent(role);
    });

    // 4. Get Active Agents
    ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_AGENTS, () => {
      return this.ptyManager.getAllActiveAgents();
    });

    // 5. Get Brigade Registry
    ipcMain.handle(IPC_CHANNELS.GET_REGISTRY, () => {
      const registryPath = path.join(this.initializer.getHiveRoot(), "registry.json");
      if (!fs.existsSync(registryPath)) return {} as BrigadeRegistry;
      const raw = fs.readFileSync(registryPath, "utf-8");
      return JSON.parse(raw);
    });

    // 6. Get Order Tickets
    ipcMain.handle(IPC_CHANNELS.GET_TICKETS, () => {
      const ticketsPath = path.join(this.initializer.getHiveRoot(), "tickets.json");
      if (!fs.existsSync(ticketsPath)) return [];
      const raw = fs.readFileSync(ticketsPath, "utf-8");
      return JSON.parse(raw);
    });

    // 7. Create Order Ticket (with Head Chef Autonomous Delegation)
    ipcMain.handle(
      IPC_CHANNELS.CREATE_TICKET,
      (_event, ticketInput: Omit<OrderTicket, "id" | "createdAt" | "updatedAt">) => {
        const ticketsPath = path.join(this.initializer.getHiveRoot(), "tickets.json");
        const raw = fs.existsSync(ticketsPath) ? fs.readFileSync(ticketsPath, "utf-8") : "[]";
        const tickets: OrderTicket[] = JSON.parse(raw);

        const now = new Date().toISOString();
        const newTicket: OrderTicket = {
          ...ticketInput,
          id: `tkt-${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };

        tickets.push(newTicket);

        // Head Chef Autonomous Task Decomposition:
        // When an order is placed to the Head Chef, the Head Chef formulates recipe_plan.md
        // and dispatches specialized sub-tickets to the Line Cook, Plating Chef, and Food Inspector.
        if (newTicket.assignee === "headchef") {
          // 1. Update recipe_plan.md
          const planPath = path.join(this.initializer.getHiveRoot(), "recipe_plan.md");
          const planContent = `# 📋 Master Recipe Plan — ${newTicket.title}\n\n` +
            `**Status**: Orchestrated by Head Chef\n` +
            `**Executive Guest Order**: ${newTicket.description}\n` +
            `**Created**: ${now}\n\n` +
            `## 👨‍🍳 Station Brigade Assignments\n` +
            `- [ ] **🍳 Line Cook**: Core business logic, APIs, and data modeling\n` +
            `- [ ] **🎨 Plating Chef**: UI design, components, and layout presentation\n` +
            `- [ ] **🔍 Food Inspector**: Testing bench, edge-case review, and code inspection\n`;
          fs.writeFileSync(planPath, planContent);

          // 2. Auto-decompose into station chef sub-tickets
          const subTickets: OrderTicket[] = [
            {
              id: `tkt-${Date.now()}-linecook`,
              title: `[Line Cook] Backend & Logic: ${newTicket.title}`,
              description: `Implement core logic, services, and data models for: ${newTicket.description}`,
              assignee: "linecook",
              status: "in_progress",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: `tkt-${Date.now()}-plating`,
              title: `[Plating Chef] Visual & UI: ${newTicket.title}`,
              description: `Design interactive UI components and layout views for: ${newTicket.description}`,
              assignee: "plating",
              status: "pending",
              createdAt: now,
              updatedAt: now,
            },
            {
              id: `tkt-${Date.now()}-inspector`,
              title: `[Food Inspector] QA Review: ${newTicket.title}`,
              description: `Validate code quality, error handling, and test specifications for: ${newTicket.description}`,
              assignee: "inspector",
              status: "pending",
              createdAt: now,
              updatedAt: now,
            },
          ];

          tickets.push(...subTickets);

          // 3. Dispatch official Head Chef dispatch orders to station outboxes
          const headChefOutbox = path.join(this.initializer.getHiveRoot(), "agents", "headchef", "outbox");
          if (fs.existsSync(headChefOutbox)) {
            for (const sub of subTickets) {
              const msg = {
                id: `msg-${Date.now()}-${sub.assignee}`,
                from: "headchef",
                to: sub.assignee,
                act: "request",
                subject: `New Station Order: ${sub.title}`,
                body: sub.description,
                timestamp: now,
              };
              fs.writeFileSync(path.join(headChefOutbox, `${msg.id}.json`), JSON.stringify(msg, null, 2));
            }
          }

          // 4. Extract Project Directory & Spawn Real Autonomous Station Workers
          let targetProjectDir = process.cwd();
          if (newTicket.description) {
            const match = newTicket.description.match(/\[(.*?)\]/);
            if (match && fs.existsSync(match[1])) {
              targetProjectDir = match[1];
            } else if (fs.existsSync(newTicket.description)) {
              targetProjectDir = newTicket.description;
            }
          }

          if (targetProjectDir && fs.existsSync(targetProjectDir)) {
            this.activeWorkspacePath = targetProjectDir;
            this.ensurePreviewServerRunning();
          }

          const workerScript = path.join(process.cwd(), "src", "application", "chefWorker.ts");

          const getAgyBinary = (): string | null => {
            if (process.env.AGY_PATH && fs.existsSync(process.env.AGY_PATH)) return process.env.AGY_PATH;
            const candidates = [
              path.join(os.homedir(), ".local", "bin", "agy"),
              "/usr/local/bin/agy",
              "/opt/homebrew/bin/agy",
            ];
            for (const c of candidates) {
              if (fs.existsSync(c)) return c;
            }
            return null;
          };

          const getNodeBinary = (): string => {
            if (process.env.NODE && fs.existsSync(process.env.NODE)) return process.env.NODE;
            if (process.execPath.toLowerCase().endsWith("/node")) return process.execPath;
            const candidates = [
              "/Users/gourav/.nvm/versions/node/v24.13.0/bin/node",
              "/usr/local/bin/node",
              "/opt/homebrew/bin/node",
            ];
            for (const c of candidates) {
              if (fs.existsSync(c)) return c;
            }
            return "node";
          };

          const agyBin = getAgyBinary();
          const nodeCmd = getNodeBinary();

          // 1. Spawning Head Chef Worker (uses agy CLI if installed)
          try {
            if (agyBin) {
              this.ptyManager.spawnAgent({
                role: "headchef",
                command: agyBin,
                args: [
                  "--dangerously-skip-permissions",
                  "-p",
                  `You are the Executive Head Chef of AgentGrid Kitchen. Formulate a master recipe_plan.md in this directory and outline the technical tasks for: "${newTicket.title}". Keep it concise and actionable.`,
                ],
                cwd: targetProjectDir,
              });
            } else {
              this.ptyManager.spawnAgent({
                role: "headchef",
                command: nodeCmd,
                args: ["--experimental-strip-types", workerScript, "--role", "headchef", "--project", targetProjectDir, "--task", newTicket.title],
                cwd: targetProjectDir,
              });
            }
          } catch (e) {
            console.error("Failed to spawn headchef:", e);
          }

          // 2. Automatically spawn Line Cook Worker (uses agy CLI)
          setTimeout(() => {
            try {
              if (agyBin) {
                this.ptyManager.spawnAgent({
                  role: "linecook",
                  command: agyBin,
                  args: [
                    "--dangerously-skip-permissions",
                    "-p",
                    `You are the Line Cook (Full-Stack Developer) in AgentGrid Kitchen. Implement the core code and files for: "${newTicket.title}". Write clean, modern, production-ready files (e.g. index.html, styles, scripts) directly into this workspace now.`,
                  ],
                  cwd: targetProjectDir,
                });
              } else {
                this.ptyManager.spawnAgent({
                  role: "linecook",
                  command: nodeCmd,
                  args: ["--experimental-strip-types", workerScript, "--role", "linecook", "--project", targetProjectDir, "--task", newTicket.title],
                  cwd: targetProjectDir,
                });
              }
            } catch (e) {
              console.error("Failed to spawn linecook:", e);
            }
          }, 1200);

          // 3. Automatically spawn Plating Chef Worker (uses agy CLI)
          setTimeout(() => {
            try {
              if (agyBin) {
                this.ptyManager.spawnAgent({
                  role: "plating",
                  command: agyBin,
                  args: [
                    "--dangerously-skip-permissions",
                    "-p",
                    `You are the Plating Chef (UI/UX Designer) in AgentGrid Kitchen. Review the visual styling, responsive layout, and presentation for: "${newTicket.title}". Refine CSS/styles if needed.`,
                  ],
                  cwd: targetProjectDir,
                });
              } else {
                this.ptyManager.spawnAgent({
                  role: "plating",
                  command: nodeCmd,
                  args: ["--experimental-strip-types", workerScript, "--role", "plating", "--project", targetProjectDir, "--task", newTicket.title],
                  cwd: targetProjectDir,
                });
              }
            } catch (e) {
              console.error("Failed to spawn plating:", e);
            }
          }, 2400);

          // 4. Automatically spawn Food Inspector Worker (uses agy CLI)
          setTimeout(() => {
            try {
              if (agyBin) {
                this.ptyManager.spawnAgent({
                  role: "inspector",
                  command: agyBin,
                  args: [
                    "--dangerously-skip-permissions",
                    "-p",
                    `You are the Food Inspector (QA). Review the files generated in this workspace for: "${newTicket.title}". Verify syntax, check for issues, and report your QA grade.`,
                  ],
                  cwd: targetProjectDir,
                });
              } else {
                this.ptyManager.spawnAgent({
                  role: "inspector",
                  command: nodeCmd,
                  args: ["--experimental-strip-types", workerScript, "--role", "inspector", "--project", targetProjectDir, "--task", newTicket.title],
                  cwd: targetProjectDir,
                });
              }
            } catch (e) {
              console.error("Failed to spawn inspector:", e);
            }
          }, 3600);

          // 5. Flush router queue to deliver outbox messages to station inboxes
          try {
            this.router.poll();
          } catch (err) {
            // Non-blocking
          }
        }

        fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
        return newTicket;
      }
    );

    // 8. Select Project Workspace Directory (Native Dialog)
    ipcMain.handle(IPC_CHANNELS.SELECT_DIRECTORY, async () => {
      try {
        const electron = await import("electron");
        const dialog = electron.dialog;
        const win = getMainWindow();
        const result = await dialog.showOpenDialog(win as any, {
          properties: ["openDirectory", "createDirectory"],
          title: "Select Project Workspace Folder",
        });
        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }
        const chosen = result.filePaths[0];
        this.activeWorkspacePath = chosen;
        this.ensurePreviewServerRunning();

        // Immediately auto-spawn real agy interactive session in the chosen directory!
        try {
          this.ptyManager.killAgent("headchef");
          const agyBin = this.getAgyBinary();
          const cmd = agyBin || process.env.SHELL || "/bin/zsh";
          const args = agyBin ? ["--dangerously-skip-permissions"] : ["-l"];
          this.ptyManager.spawnAgent({
            role: "headchef",
            command: cmd,
            args,
            cwd: chosen,
            interactive: true,
          });
        } catch (e) {
          console.error("Failed to auto-spawn agy on folder select:", e);
        }

        return chosen;
      } catch (err) {
        console.error("Failed to open directory dialog:", err);
        return null;
      }
    });

    // 9. Get Live Dish Preview Server URL
    ipcMain.handle(IPC_CHANNELS.GET_PREVIEW_URL, (_event, workspacePath?: string) => {
      if (workspacePath && typeof workspacePath === "string" && fs.existsSync(workspacePath)) {
        this.activeWorkspacePath = workspacePath;
      }
      this.ensurePreviewServerRunning();
      return `http://127.0.0.1:${this.PREVIEW_PORT}`;
    });

    // 10. Open External Browser Link
    ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: string) => {
      try {
        const electron = await import("electron");
        if (electron.shell?.openExternal) {
          await electron.shell.openExternal(url);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Failed to open external url:", err);
        return false;
      }
    });

    // 11. Read Project Workspace File
    ipcMain.handle(IPC_CHANNELS.READ_FILE, (_event, filePath: string) => {
      try {
        if (!filePath) return null;
        let resolved = filePath;
        if (!path.isAbsolute(resolved) && this.activeWorkspacePath) {
          resolved = path.join(this.activeWorkspacePath, filePath);
        }
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
          return fs.readFileSync(resolved, "utf-8");
        }
        // Fallback: check hive root
        const hivePath = path.join(this.initializer.getHiveRoot(), filePath);
        if (fs.existsSync(hivePath) && fs.statSync(hivePath).isFile()) {
          return fs.readFileSync(hivePath, "utf-8");
        }
        return null;
      } catch (err) {
        console.error("Failed to read file:", err);
        return null;
      }
    });
  }

  /**
   * Starts the internal lightweight static HTTP preview server on port 5274
   */
  public ensurePreviewServerRunning(): void {
    if (this.previewServer) return;

    this.previewServer = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (!this.activeWorkspacePath || !fs.existsSync(this.activeWorkspacePath)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AgentGrid Kitchen • Preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1019; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #161f30; border: 1px solid #334155; padding: 36px 44px; border-radius: 12px; text-align: center; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #f59e0b; font-size: 22px; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🍳 Kitchen Oven Warming Up</h1>
    <p>Please select your project workspace directory in <strong>AgentGrid Kitchen</strong> to preview your live cooked application.</p>
  </div>
</body>
</html>`);
        return;
      }

      const rawUrl = req.url?.split("?")[0] || "/";
      let requestedPath = decodeURIComponent(rawUrl);
      if (requestedPath === "/" || requestedPath === "") {
        requestedPath = "/index.html";
      }

      const filePath = path.normalize(path.join(this.activeWorkspacePath, requestedPath));

      // Directory traversal prevention
      if (!filePath.startsWith(path.normalize(this.activeWorkspacePath))) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("403 Forbidden: Access denied.");
        return;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".html": "text/html; charset=utf-8",
          ".htm": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".mjs": "text/javascript; charset=utf-8",
          ".json": "application/json; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".ico": "image/x-icon",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
          ".ttf": "font/ttf",
        };

        res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      // Check for index.html fallback
      const indexPath = path.join(this.activeWorkspacePath, "index.html");
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }

      // If index.html is not created yet, show auto-refreshing cooking placeholder
      let files: string[] = [];
      try {
        files = fs.readdirSync(this.activeWorkspacePath).filter((f) => !f.startsWith("."));
      } catch {}

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="2">
  <title>AgentGrid Kitchen • Cooking...</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1019; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #161f30; border: 1px solid #334155; padding: 36px 44px; border-radius: 12px; text-align: center; max-width: 520px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #f59e0b; font-size: 20px; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 13px; line-height: 1.6; }
    .spinner { display: inline-block; width: 28px; height: 28px; border: 3px solid rgba(245, 158, 11, 0.2); border-top-color: #f59e0b; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .files { margin-top: 16px; text-align: left; background: #0b1019; border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; font-family: monospace; font-size: 11px; color: #38bdf8; max-height: 140px; overflow-y: auto; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>🍳 Station Chefs Cooking Your Dish</h1>
    <p>Waiting for <code>index.html</code> to be plated in your workspace...</p>
    <p style="color: #64748b; font-size: 11px;">This preview automatically refreshes every 2 seconds when files are written.</p>
    ${files.length > 0 ? `<div class="files"><strong>Workspace files (${files.length}):</strong><br/>${files.map((f) => "📄 " + f).join("<br/>")}</div>` : ""}
  </div>
</body>
</html>`);
    });

    this.previewServer.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[PreviewServer] Port ${this.PREVIEW_PORT} in use, preview server already active.`);
      } else {
        console.error("[PreviewServer] Error:", err);
      }
    });

    try {
      this.previewServer.listen(this.PREVIEW_PORT, "127.0.0.1", () => {
        console.log(`[PreviewServer] Running on http://127.0.0.1:${this.PREVIEW_PORT}`);
      });
    } catch {}
  }

  public closePreviewServer(): void {
    if (this.previewServer) {
      try {
        this.previewServer.close();
      } catch {}
      this.previewServer = null;
    }
  }

  /**
   * Binds Engine Events to push real-time updates to the Electron Renderer Window
   */
  private bindEngineEvents(getMainWindow: IpcControllerOptions["getMainWindow"]): void {
    // Pipe PTY stdout to UI xterm.js tabs
    this.ptyManager.on("ptyData", (data) => {
      const win = getMainWindow();
      win?.webContents.send(IPC_CHANNELS.ON_PTY_DATA, data);
    });

    // Pipe Unix Socket status changes to UI Roster badges
    this.hookServer.on("agentStatusChanged", (status) => {
      const win = getMainWindow();
      win?.webContents.send(IPC_CHANNELS.ON_STATUS_CHANGED, status);
    });

    // Pipe Unix Socket hook events to UI
    this.hookServer.on("hookReceived", (hook) => {
      const win = getMainWindow();
      win?.webContents.send(IPC_CHANNELS.ON_HOOK_RECEIVED, hook);
    });

    // Pipe Hive Router message deliveries to UI Inbox
    this.router.on("messageDelivered", (msg) => {
      const win = getMainWindow();
      win?.webContents.send(IPC_CHANNELS.ON_MESSAGE_DELIVERED, msg);
    });
  }
}
