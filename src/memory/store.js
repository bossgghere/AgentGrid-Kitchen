import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_PATH = path.join(__dirname, "../../.agentgrid_memory.json");

export function loadMemory() {
  if (!fs.existsSync(MEMORY_PATH)) return { sessions: [] };
  try {
    return JSON.parse(fs.readFileSync(MEMORY_PATH, "utf-8"));
  } catch {
    return { sessions: [] };
  }
}

export function saveMemory(data) {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2), "utf-8");
}
