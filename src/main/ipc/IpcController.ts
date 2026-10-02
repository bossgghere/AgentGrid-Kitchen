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

    // 7. Create Order Ticket
    ipcMain.handle(
      IPC_CHANNELS.CREATE_TICKET,
      (_event, ticketInput: Omit<OrderTicket, "id" | "createdAt" | "updatedAt">) => {
        const ticketsPath = path.join(this.initializer.getHiveRoot(), "tickets.json");
        const raw = fs.existsSync(ticketsPath) ? fs.readFileSync(ticketsPath, "utf-8") : "[]";
        const tickets: OrderTicket[] = JSON.parse(raw);

        const newTicket: OrderTicket = {
          ...ticketInput,
          id: `tkt-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        tickets.push(newTicket);
        fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
        return newTicket;
      }
    );
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
