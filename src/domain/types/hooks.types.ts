import type { ChefRole } from "./hive.types.ts";

/**
 * Agent Lifecycle Hook Event Types
 */
export type HookEventType = "PreToolUse" | "PostToolUse" | "Stop" | "Notification";

/**
 * Real-time Lifecycle Hook Event Payload emitted over /tmp/ag.sock
 */
export interface HookEventPayload {
  agentRole: ChefRole;
  event: HookEventType;
  toolName?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Processed Agent Telemetry Event for UI status badges
 */
export interface AgentStatusChangeEvent {
  agentRole: ChefRole;
  status: "working" | "idle" | "blocked";
  lastEvent: HookEventType;
  currentTool?: string;
  timestamp: string;
}
