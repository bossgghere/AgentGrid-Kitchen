import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { HiveInitializer } from "../../src/application/initializer/HiveInitializer.ts";
import { HiveRouter } from "../../src/application/router/HiveRouter.ts";
import { HiveMessage } from "../../src/domain/types/hive.types.ts";

describe("HiveRouter (Phase 1)", () => {
  let tempHiveDir: string;
  let initializer: HiveInitializer;
  let router: HiveRouter;

  beforeEach(() => {
    tempHiveDir = path.join(os.tmpdir(), `test-router-${Date.now()}`);
    initializer = new HiveInitializer(tempHiveDir);
    initializer.initialize();
    router = new HiveRouter({ hiveRoot: tempHiveDir, pollIntervalMs: 50 });
  });

  afterEach(() => {
    router.stop();
    if (fs.existsSync(tempHiveDir)) {
      fs.rmSync(tempHiveDir, { recursive: true, force: true });
    }
  });

  it("should move a valid message from outbox to recipient inbox", async () => {
    const msg: HiveMessage = {
      id: "msg-001",
      from: "linecook",
      to: "headchef",
      act: "done",
      subject: "Auth route complete",
      body: "Built POST /login",
      timestamp: new Date().toISOString(),
    };

    const outboxPath = path.join(tempHiveDir, "agents", "linecook", "outbox", "msg-001.json");
    fs.writeFileSync(outboxPath, JSON.stringify(msg, null, 2));

    let deliveredMsg: HiveMessage | null = null;
    router.on("messageDelivered", (m) => {
      deliveredMsg = m;
    });

    const deliveredCount = router.poll();
    expect(deliveredCount).toBe(1);

    // Source outbox file should be gone
    expect(fs.existsSync(outboxPath)).toBe(false);

    // Target inbox file should exist
    const inboxPath = path.join(tempHiveDir, "agents", "headchef", "inbox", "msg-001.json");
    expect(fs.existsSync(inboxPath)).toBe(true);

    const receivedContent = JSON.parse(fs.readFileSync(inboxPath, "utf-8"));
    expect(receivedContent.id).toBe("msg-001");
    expect(deliveredMsg).not.toBeNull();
    expect(deliveredMsg?.from).toBe("linecook");
  });

  it("should discard messages violating the Single-Writer rule", () => {
    // Message claims to be from 'plating', but placed in 'linecook' outbox
    const invalidMsg: HiveMessage = {
      id: "msg-bad",
      from: "plating",
      to: "headchef",
      act: "request",
      subject: "Forged message",
      body: "Testing security",
      timestamp: new Date().toISOString(),
    };

    const outboxPath = path.join(tempHiveDir, "agents", "linecook", "outbox", "msg-bad.json");
    fs.writeFileSync(outboxPath, JSON.stringify(invalidMsg, null, 2));

    const deliveredCount = router.poll();
    expect(deliveredCount).toBe(0);

    // Outbox file should be discarded
    expect(fs.existsSync(outboxPath)).toBe(false);

    // Target inbox should remain empty
    const targetPath = path.join(tempHiveDir, "agents", "headchef", "inbox", "msg-bad.json");
    expect(fs.existsSync(targetPath)).toBe(false);
  });

  it("should start and stop timer loop cleanly", async () => {
    router.start();
    expect(router.getIsRunning()).toBe(true);
    router.stop();
    expect(router.getIsRunning()).toBe(false);
  });
});
