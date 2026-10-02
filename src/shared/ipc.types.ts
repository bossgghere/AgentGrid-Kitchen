import type { ChefRole, HiveMessage, OrderTicket, BrigadeRegistry } from "../domain/types/hive.types.ts";
import type { PtyProcessInfo, PtyDataEvent, PtySpawnOptions } from "../domain/types/pty.types.ts";
import type { AgentStatusChangeEvent, HookEventPayload } from "../domain/types/hooks.types.ts";

/**
 * IPC Channel Identifiers for Electron Main <-> Renderer Communication
 */
export const IPC_CHANNELS = {
  SPAWN_AGENT: "ag:spawn-agent",
  WRITE_AGENT: "ag:write-agent",
  KILL_AGENT: "ag:kill-agent",
  GET_ACTIVE_AGENTS: "ag:get-active-agents",
  GET_REGISTRY: "ag:get-registry",
  GET_TICKETS: "ag:get-tickets",
  CREATE_TICKET: "ag:create-ticket",
  SELECT_DIRECTORY: "ag:select-directory",
  // Event Push Streams (Main -> Renderer)
  ON_PTY_DATA: "ag:on-pty-data",
  ON_STATUS_CHANGED: "ag:on-status-changed",
  ON_MESSAGE_DELIVERED: "ag:on-message-delivered",
  ON_HOOK_RECEIVED: "ag:on-hook-received",
} as const;

/**
 * Window.agentgrid API contract exposed via ContextBridge in preload.ts
 */
export interface AgentGridApi {
  spawnAgent: (options: PtySpawnOptions) => Promise<PtyProcessInfo>;
  writeToAgent: (role: ChefRole, data: string) => Promise<boolean>;
  killAgent: (role: ChefRole) => Promise<boolean>;
  getActiveAgents: () => Promise<PtyProcessInfo[]>;
  getRegistry: () => Promise<BrigadeRegistry>;
  getTickets: () => Promise<OrderTicket[]>;
  createTicket: (ticket: Omit<OrderTicket, "id" | "createdAt" | "updatedAt">) => Promise<OrderTicket>;
  selectDirectory: () => Promise<string | null>;
  // Event Subscriptions
  onPtyData: (callback: (data: PtyDataEvent) => void) => () => void;
  onStatusChanged: (callback: (status: AgentStatusChangeEvent) => void) => () => void;
  onMessageDelivered: (callback: (message: HiveMessage) => void) => () => void;
  onHookReceived: (callback: (hook: HookEventPayload) => void) => () => void;
}

declare global {
  interface Window {
    agentgrid?: AgentGridApi;
  }
}
