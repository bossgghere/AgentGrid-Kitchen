import { spawn, ChildProcess } from "child_process";
import EventEmitter from "events";
import path from "path";
import os from "os";
import { createRequire } from "module";
import { DEFAULT_SOCKET_PATH } from "../../domain/constants/socket.constants.ts";
import { DEFAULT_HIVE_ROOT } from "../../domain/constants/paths.constants.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";
import type {
  PtySpawnOptions,
  PtyProcessInfo,
  PtyDataEvent,
  PtyExitEvent,
} from "../../domain/types/pty.types.ts";

const requireModule = typeof require !== "undefined" ? require : createRequire(import.meta.url);
let nodePty: any = null;
try {
  nodePty = requireModule("node-pty");
} catch {
  // node-pty optional
}

interface ActiveProcess {
  info: PtyProcessInfo;
  process?: ChildProcess;
  ptyProcess?: any;
}

export class PtyManager extends EventEmitter {
  private activeProcesses: Map<ChefRole, ActiveProcess> = new Map();
  private readonly defaultSocketPath: string;
  private readonly defaultHiveRoot: string;

  constructor(socketPath?: string, hiveRoot?: string) {
    super();
    this.defaultSocketPath = socketPath || DEFAULT_SOCKET_PATH;
    this.defaultHiveRoot = hiveRoot || DEFAULT_HIVE_ROOT;
  }

  /**
   * Spawns a real operating system terminal process for a Station Chef
   */
  public spawnAgent(options: PtySpawnOptions): PtyProcessInfo {
    const { role, command, args = [], cwd, env = {} } = options;

    // Terminate existing process if already running for this role
    if (this.activeProcesses.has(role)) {
      this.killAgent(role);
    }

    const workingDir = cwd || path.join(this.defaultHiveRoot, "agents", role);

    const augmentedPath = [
      path.join(os.homedir(), ".local", "bin"),
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
      process.env.PATH || "",
    ].filter(Boolean).join(":");

    // Inject system environment variables
    const processEnv = {
      ...process.env,
      HOME: os.homedir(),
      USER: os.userInfo().username,
      PATH: augmentedPath,
      ...env,
      HIVE_SOCK: this.defaultSocketPath,
      HIVE_ROOT: this.defaultHiveRoot,
      AGENT_ROLE: role,
      FORCE_COLOR: "1",
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    };

    // 1. Try spawning with node-pty if interactive session requested
    let ptyProcess: any = null;
    if (options.interactive && nodePty && typeof nodePty.spawn === "function") {
      try {
        ptyProcess = nodePty.spawn(command, args, {
          name: "xterm-256color",
          cols: options.cols || 100,
          rows: options.rows || 30,
          cwd: workingDir,
          env: processEnv,
        });
      } catch (err) {
        ptyProcess = null;
      }
    }

    if (ptyProcess) {
      const info: PtyProcessInfo = {
        id: `pty-${role}-${Date.now()}`,
        role,
        pid: ptyProcess.pid || 0,
        command: `${command} ${args.join(" ")}`.trim(),
        status: "running",
        startedAt: new Date().toISOString(),
      };

      const activeItem: ActiveProcess = { info, ptyProcess };
      this.activeProcesses.set(role, activeItem);

      ptyProcess.onData((data: string) => {
        const dataEvent: PtyDataEvent = { role, data };
        this.emit("ptyData", dataEvent);
      });

      ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        info.status = "exited";
        this.activeProcesses.delete(role);
        const exitEvent: PtyExitEvent = {
          role,
          exitCode: exitCode ?? 0,
          signal: signal ?? 0,
        };
        this.emit("ptyExit", exitEvent);
      });

      this.emit("ptySpawned", info);
      return info;
    }

    // 2. Fallback to child_process.spawn
    const child = spawn(command, args, {
      cwd: workingDir,
      env: processEnv,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    const info: PtyProcessInfo = {
      id: `pty-${role}-${Date.now()}`,
      role,
      pid: child.pid || 0,
      command: `${command} ${args.join(" ")}`.trim(),
      status: "running",
      startedAt: new Date().toISOString(),
    };

    const activeItem: ActiveProcess = { info, process: child };
    this.activeProcesses.set(role, activeItem);

    // Stream stdout data
    child.stdout?.on("data", (chunk: Buffer) => {
      const dataStr = chunk.toString("utf-8");
      const dataEvent: PtyDataEvent = { role, data: dataStr };
      this.emit("ptyData", dataEvent);
    });

    // Stream stderr data
    child.stderr?.on("data", (chunk: Buffer) => {
      const dataStr = chunk.toString("utf-8");
      const dataEvent: PtyDataEvent = { role, data: dataStr };
      this.emit("ptyData", dataEvent);
    });

    // Handle spawn error (e.g. command not found)
    child.on("error", (err: Error) => {
      const errMsg = `\n❌ [PtyManager Error] Failed to execute ${command}: ${err.message}\n`;
      const dataEvent: PtyDataEvent = { role, data: errMsg };
      this.emit("ptyData", dataEvent);
      info.status = "exited";
      this.activeProcesses.delete(role);
      this.emit("ptyExit", { role, exitCode: 1, signal: 0 });
    });

    // Handle process termination
    child.on("close", (exitCode: number | null, signal: NodeJS.Signals | null) => {
      info.status = "exited";
      this.activeProcesses.delete(role);

      const exitEvent: PtyExitEvent = {
        role,
        exitCode: exitCode ?? 0,
        signal: signal ? 1 : 0,
      };
      this.emit("ptyExit", exitEvent);
    });

    child.on("error", (err: Error) => {
      info.status = "error";
      console.error(`[PtyManager Error] Agent process '${role}' failed:`, err);
      this.emit("ptyError", { role, error: err });
    });

    this.emit("ptySpawned", info);
    return info;
  }

  /**
   * Writes stdin data to an active Chef process
   */
  public writeToAgent(role: ChefRole, data: string): boolean {
    const active = this.activeProcesses.get(role);
    if (!active || active.info.status !== "running") {
      console.warn(`[PtyManager] Cannot write to agent '${role}': process not running.`);
      return false;
    }

    if (active.ptyProcess) {
      try {
        active.ptyProcess.write(data);
        return true;
      } catch (err) {
        console.error(`[PtyManager] Failed to write to PTY '${role}':`, err);
        return false;
      }
    }

    if (active.process) {
      try {
        active.process.stdin?.write(data);
        return true;
      } catch (err) {
        console.error(`[PtyManager] Failed to write to process '${role}':`, err);
        return false;
      }
    }

    return false;
  }

  /**
   * Resizes an active PTY session (columns and rows)
   */
  public resizeAgent(role: ChefRole, cols: number, rows: number): boolean {
    const active = this.activeProcesses.get(role);
    if (!active || !active.ptyProcess) return false;
    try {
      if (typeof active.ptyProcess.resize === "function") {
        active.ptyProcess.resize(cols, rows);
        return true;
      }
    } catch (err) {
      // Ignored
    }
    return false;
  }

  /**
   * Kills an active Chef process
   */
  public killAgent(role: ChefRole): boolean {
    const active = this.activeProcesses.get(role);
    if (!active) return false;

    try {
      if (active.ptyProcess) {
        active.ptyProcess.kill();
      } else if (active.process) {
        active.process.kill("SIGTERM");
      }
      this.activeProcesses.delete(role);
      return true;
    } catch (err) {
      console.error(`[PtyManager] Failed to kill process for '${role}':`, err);
      return false;
    }
  }

  /**
   * Kills all active Chef processes
   */
  public killAll(): void {
    for (const role of this.activeProcesses.keys()) {
      this.killAgent(role);
    }
  }

  /**
   * Gets process info for a specific chef role
   */
  public getAgentStatus(role: ChefRole): PtyProcessInfo | null {
    const active = this.activeProcesses.get(role);
    return active ? active.info : null;
  }

  /**
   * Gets all active process info list
   */
  public getAllActiveAgents(): PtyProcessInfo[] {
    return Array.from(this.activeProcesses.values()).map((item) => item.info);
  }
}
