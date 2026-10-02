import type { ChefRole } from "./hive.types.ts";

export type PtyProcessStatus = "running" | "exited" | "error";

/**
 * Options for spawning a PTY Agent Process
 */
export interface PtySpawnOptions {
  role: ChefRole;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  interactive?: boolean;
}

/**
 * Metadata info for an active or exited PTY process
 */
export interface PtyProcessInfo {
  id: string;
  role: ChefRole;
  pid: number;
  command: string;
  status: PtyProcessStatus;
  startedAt: string;
}

/**
 * Event payload emitted when raw PTY data arrives (to pipe to xterm.js)
 */
export interface PtyDataEvent {
  role: ChefRole;
  data: string;
}

/**
 * Event payload emitted when a PTY process exits
 */
export interface PtyExitEvent {
  role: ChefRole;
  exitCode: number;
  signal?: number;
}
