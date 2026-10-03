import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS, AgentGridApi } from "../shared/ipc.types.ts";
import type { ChefRole, HiveMessage, OrderTicket } from "../domain/types/hive.types.ts";
import type { PtyProcessInfo, PtyDataEvent, PtySpawnOptions } from "../domain/types/pty.types.ts";
import type { AgentStatusChangeEvent, HookEventPayload } from "../domain/types/hooks.types.ts";

/**
 * Secure Preload ContextBridge exposing window.agentgrid API to React Renderer
 */
const api: AgentGridApi = {
  spawnAgent: (options: PtySpawnOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.SPAWN_AGENT, options),

  spawnAgy: (workspacePath?: string, role?: ChefRole) =>
    ipcRenderer.invoke(IPC_CHANNELS.SPAWN_AGY, workspacePath, role),

  restartAgy: (workspacePath?: string, role?: ChefRole) =>
    ipcRenderer.invoke(IPC_CHANNELS.RESTART_AGY, workspacePath, role),

  resizeAgent: (role: ChefRole, cols: number, rows: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.RESIZE_AGENT, role, cols, rows),

  writeToAgent: (role: ChefRole, data: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_AGENT, role, data),

  killAgent: (role: ChefRole) =>
    ipcRenderer.invoke(IPC_CHANNELS.KILL_AGENT, role),

  getActiveAgents: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ACTIVE_AGENTS),

  getRegistry: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_REGISTRY),

  getTickets: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TICKETS),

  createTicket: (ticket: Omit<OrderTicket, "id" | "createdAt" | "updatedAt">) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_TICKET, ticket),

  selectDirectory: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_DIRECTORY),

  getPreviewUrl: (workspacePath?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PREVIEW_URL, workspacePath),

  openExternal: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),

  readFile: (filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),

  // Subscription listeners with cleanup functions
  onPtyData: (callback: (data: PtyDataEvent) => void) => {
    const subscription = (_event: unknown, data: PtyDataEvent) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.ON_PTY_DATA, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_PTY_DATA, subscription);
    };
  },

  onStatusChanged: (callback: (status: AgentStatusChangeEvent) => void) => {
    const subscription = (_event: unknown, status: AgentStatusChangeEvent) => callback(status);
    ipcRenderer.on(IPC_CHANNELS.ON_STATUS_CHANGED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_STATUS_CHANGED, subscription);
    };
  },

  onMessageDelivered: (callback: (message: HiveMessage) => void) => {
    const subscription = (_event: unknown, message: HiveMessage) => callback(message);
    ipcRenderer.on(IPC_CHANNELS.ON_MESSAGE_DELIVERED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_MESSAGE_DELIVERED, subscription);
    };
  },

  onHookReceived: (callback: (hook: HookEventPayload) => void) => {
    const subscription = (_event: unknown, hook: HookEventPayload) => callback(hook);
    ipcRenderer.on(IPC_CHANNELS.ON_HOOK_RECEIVED, subscription);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_HOOK_RECEIVED, subscription);
    };
  },
};

// Expose safe API to renderer DOM context
contextBridge.exposeInMainWorld("agentgrid", api);
