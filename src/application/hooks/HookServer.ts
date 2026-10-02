import net from "net";
import fs from "fs";
import EventEmitter from "events";
import { DEFAULT_SOCKET_PATH } from "../../domain/constants/socket.constants.ts";
import type {
  HookEventPayload,
  AgentStatusChangeEvent,
  HookEventType,
} from "../../domain/types/hooks.types.ts";
import type { ChefRole } from "../../domain/types/hive.types.ts";

export interface HookServerOptions {
  socketPath?: string;
}

export class HookServer extends EventEmitter {
  private readonly socketPath: string;
  private server: net.Server | null = null;
  private isListening: boolean = false;
  private activeSockets: Set<net.Socket> = new Set();

  constructor(options: HookServerOptions = {}) {
    super();
    this.socketPath = options.socketPath || DEFAULT_SOCKET_PATH;
  }

  /**
   * Starts the Unix Domain Socket Server listening for agent lifecycle events
   */
  public async start(): Promise<void> {
    if (this.isListening) return;

    // Clean up old socket file if it exists (macOS/Linux)
    if (process.platform !== "win32" && fs.existsSync(this.socketPath)) {
      try {
        fs.unlinkSync(this.socketPath);
      } catch (err) {
        console.warn(`[HookServer] Unable to remove existing socket file: ${this.socketPath}`, err);
      }
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.on("error", (err) => {
        console.error("[HookServer Error]:", err);
        this.emit("error", err);
        reject(err);
      });

      this.server.listen(this.socketPath, () => {
        this.isListening = true;
        this.emit("started", this.socketPath);
        resolve();
      });
    });
  }

  /**
   * Handles incoming client socket connection from an active Chef Agent CLI
   */
  private handleConnection(socket: net.Socket): void {
    this.activeSockets.add(socket);
    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
      
      // Process complete newline-delimited JSON payloads
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete trailing chunk in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const payload: HookEventPayload = JSON.parse(line.trim());
          this.processHookPayload(payload);
        } catch (err) {
          console.warn("[HookServer] Invalid JSON received over socket:", line, err);
        }
      }
    });

    socket.on("close", () => {
      this.activeSockets.delete(socket);
    });

    socket.on("error", (err) => {
      console.warn("[HookServer Socket Error]:", err.message);
      this.activeSockets.delete(socket);
    });
  }

  /**
   * Processes a validated Hook Event payload and updates status badges
   */
  private processHookPayload(payload: HookEventPayload): void {
    if (!payload.agentRole || !payload.event) {
      console.warn("[HookServer] Incomplete payload missing agentRole or event:", payload);
      return;
    }

    this.emit("hookReceived", payload);

    // Map lifecycle hook event to Chef Status
    const status = this.mapHookToStatus(payload.event);
    const statusEvent: AgentStatusChangeEvent = {
      agentRole: payload.agentRole,
      status,
      lastEvent: payload.event,
      currentTool: payload.toolName,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    this.emit("agentStatusChanged", statusEvent);
  }

  /**
   * Maps lifecycle hook type to chef status
   */
  private mapHookToStatus(event: HookEventType): "working" | "idle" | "blocked" {
    switch (event) {
      case "PreToolUse":
      case "PostToolUse":
        return "working";
      case "Stop":
        return "idle";
      case "Notification":
        return "blocked";
      default:
        return "idle";
    }
  }

  /**
   * Stops the socket server and closes all active connections
   */
  public async stop(): Promise<void> {
    if (!this.isListening || !this.server) return;

    for (const socket of this.activeSockets) {
      socket.destroy();
    }
    this.activeSockets.clear();

    return new Promise((resolve) => {
      this.server?.close(() => {
        this.isListening = false;

        // Cleanup socket file on exit
        if (process.platform !== "win32" && fs.existsSync(this.socketPath)) {
          try {
            fs.unlinkSync(this.socketPath);
          } catch {
            // Ignore cleanup error
          }
        }

        this.emit("stopped");
        resolve();
      });
    });
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getSocketPath(): string {
    return this.socketPath;
  }
}
