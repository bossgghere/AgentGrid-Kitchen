import { execSync } from "child_process";

const SHELL_TIMEOUT = parseInt(process.env.SHELL_TIMEOUT || "30000", 10);

export function runShell(command, cwd = process.cwd()) {
  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf-8",
      timeout: SHELL_TIMEOUT,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output || "(no output)";
  } catch (err) {
    return `Error: ${err.message}\n${err.stderr || ""}`;
  }
}
