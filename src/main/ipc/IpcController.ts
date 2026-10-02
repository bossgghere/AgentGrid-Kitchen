import fs from "fs";
import path from "path";
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

  constructor(options: IpcControllerOptions) {
    this.initializer = options.initializer;
    this.router = options.router;
    this.hookServer = options.hookServer;
    this.ptyManager = options.ptyManager;

    this.registerHandlers(options.ipcMain, options.getMainWindow);
    this.bindEngineEvents(options.getMainWindow);
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

          const workerScript = path.join(process.cwd(), "src", "application", "chefWorker.ts");

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

          const nodeCmd = getNodeBinary();

          // 1. Spawning Head Chef Worker
          try {
            this.ptyManager.spawnAgent({
              role: "headchef",
              command: nodeCmd,
              args: ["--experimental-strip-types", workerScript, "--role", "headchef", "--project", targetProjectDir, "--task", newTicket.title],
              cwd: targetProjectDir,
            });
          } catch (e) {
            console.error("Failed to spawn headchef:", e);
          }

          // 2. Automatically spawn Line Cook Worker
          setTimeout(() => {
            try {
              this.ptyManager.spawnAgent({
                role: "linecook",
                command: nodeCmd,
                args: ["--experimental-strip-types", workerScript, "--role", "linecook", "--project", targetProjectDir, "--task", newTicket.title],
                cwd: targetProjectDir,
              });
            } catch (e) {
              console.error("Failed to spawn linecook:", e);
            }
          }, 800);

          // 3. Automatically spawn Plating Chef Worker
          setTimeout(() => {
            try {
              this.ptyManager.spawnAgent({
                role: "plating",
                command: nodeCmd,
                args: ["--experimental-strip-types", workerScript, "--role", "plating", "--project", targetProjectDir, "--task", newTicket.title],
                cwd: targetProjectDir,
              });
            } catch (e) {
              console.error("Failed to spawn plating:", e);
            }
          }, 1800);

          // 4. Automatically spawn Food Inspector Worker
          setTimeout(() => {
            try {
              this.ptyManager.spawnAgent({
                role: "inspector",
                command: nodeCmd,
                args: ["--experimental-strip-types", workerScript, "--role", "inspector", "--project", targetProjectDir, "--task", newTicket.title],
                cwd: targetProjectDir,
              });
            } catch (e) {
              console.error("Failed to spawn inspector:", e);
            }
          }, 2600);

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
        return result.filePaths[0];
      } catch (err) {
        console.error("Failed to open directory dialog:", err);
        return null;
      }
    });
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
