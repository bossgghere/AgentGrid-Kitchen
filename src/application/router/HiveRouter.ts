import fs from "fs";
import path from "path";
import EventEmitter from "events";
import { DEFAULT_HIVE_ROOT, DEFAULT_ROUTER_POLL_INTERVAL_MS, CHEF_ROLES } from "../../domain/constants/paths.constants.ts";
import type { ChefRole, HiveMessage } from "../../domain/types/hive.types.ts";

export interface HiveRouterOptions {
  hiveRoot?: string;
  pollIntervalMs?: number;
}

export class HiveRouter extends EventEmitter {
  private readonly hiveRoot: string;
  private readonly pollIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(options: HiveRouterOptions = {}) {
    super();
    this.hiveRoot = options.hiveRoot || DEFAULT_HIVE_ROOT;
    this.pollIntervalMs = options.pollIntervalMs || DEFAULT_ROUTER_POLL_INTERVAL_MS;
  }

  /**
   * Starts the 200ms Router polling loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => this.poll(), this.pollIntervalMs);
    this.emit("started");
  }

  /**
   * Stops the Router loop
   */
  public stop(): void {
    if (!this.isRunning) return;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.emit("stopped");
  }

  /**
   * Performs a single polling tick scanning outboxes and delivering messages
   */
  public poll(): number {
    let deliveredCount = 0;
    const agentsDir = path.join(this.hiveRoot, "agents");

    if (!fs.existsSync(agentsDir)) return 0;

    for (const senderRole of CHEF_ROLES) {
      const outboxDir = path.join(agentsDir, senderRole, "outbox");
      if (!fs.existsSync(outboxDir)) continue;

      const files = fs.readdirSync(outboxDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const sourcePath = path.join(outboxDir, file);
        try {
          const content = fs.readFileSync(sourcePath, "utf-8");
          const message: HiveMessage = JSON.parse(content);

          // Enforce Single-Writer Rule: sender outbox must match message.from
          if (message.from !== senderRole) {
            console.warn(
              `[HiveRouter Security Alert] Message from '${message.from}' found in invalid outbox '${senderRole}'. File discarded.`
            );
            fs.unlinkSync(sourcePath);
            continue;
          }

          // Validate recipient existence
          const recipientRole = message.to;
          if (!CHEF_ROLES.includes(recipientRole)) {
            console.warn(
              `[HiveRouter] Unknown recipient role '${recipientRole}' for message ${message.id}. File discarded.`
            );
            fs.unlinkSync(sourcePath);
            continue;
          }

          // Deliver atomically to recipient inbox
          const targetInboxDir = path.join(agentsDir, recipientRole, "inbox");
          const targetPath = path.join(targetInboxDir, file);

          fs.renameSync(sourcePath, targetPath);
          deliveredCount++;

          // Append to log.jsonl
          this.appendAuditLog({
            ts: Date.now(),
            event: "message_delivered",
            messageId: message.id,
            from: message.from,
            to: message.to,
            act: message.act,
          });

          this.emit("messageDelivered", message);
        } catch (err) {
          console.error(`[HiveRouter Error] Failed to process message file '${file}':`, err);
        }
      }
    }

    return deliveredCount;
  }

  /**
   * Helper to write audit entries to log.jsonl
   */
  private appendAuditLog(entry: object): void {
    const logPath = path.join(this.hiveRoot, "log.jsonl");
    try {
      fs.appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
    } catch (err) {
      console.error("[HiveRouter] Failed to write to log.jsonl:", err);
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
