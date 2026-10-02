import path from "path";
import os from "os";
import type { ChefRole } from "../types/hive.types.ts";

/**
 * Default root directory for the Hive post office on disk
 */
export const DEFAULT_HIVE_ROOT = path.join(os.homedir(), ".agentgrid", "hive");

/**
 * Default polling interval for the Hive Router (200ms)
 */
export const DEFAULT_ROUTER_POLL_INTERVAL_MS = 200;

/**
 * Complete list of Station Chef roles in the Kitchen Brigade
 */
export const CHEF_ROLES: ChefRole[] = [
  "headchef",
  "plating",
  "linecook",
  "pantry",
  "inspector",
];

/**
 * Role titles for UI display
 */
export const CHEF_TITLES: Record<ChefRole, string> = {
  headchef: "Head Chef (Orchestrator)",
  plating: "Plating Chef (UI/UX Designer)",
  linecook: "Line Cook (Full-Stack Coder)",
  pantry: "Pantry Scout (Researcher)",
  inspector: "Food Inspector (QA / Reviewer)",
};
