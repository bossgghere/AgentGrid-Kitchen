import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";
import os from "os";
import { HiveInitializer } from "../src/application/initializer/HiveInitializer.ts";
import { HiveRouter } from "../src/application/router/HiveRouter.ts";
import { CHEF_ROLES } from "../src/domain/constants/paths.constants.ts";
import type { HiveMessage } from "../src/domain/types/hive.types.ts";

describe("Phase 1: Hive Storage & File Router Engine", () => {
  it("should initialize walk-in fridge directory structure and default files", () => {
    const tempDir = path.join(os.tmpdir(), `test-hive-init-${Date.now()}`);
    const initializer = new HiveInitializer(tempDir);
    initializer.initialize();

    assert.strictEqual(fs.existsSync(tempDir), true);
    assert.strictEqual(fs.existsSync(path.join(tempDir, "registry.json")), true);
    assert.strictEqual(fs.existsSync(path.join(tempDir, "tickets.json")), true);
    assert.strictEqual(fs.existsSync(path.join(tempDir, "recipe_plan.md")), true);
    assert.strictEqual(fs.existsSync(path.join(tempDir, "log.jsonl")), true);

    const agentsDir = path.join(tempDir, "agents");
    assert.strictEqual(fs.existsSync(agentsDir), true);

    for (const role of CHEF_ROLES) {
      const chefDir = path.join(agentsDir, role);
      assert.strictEqual(fs.existsSync(path.join(chefDir, "inbox")), true);
      assert.strictEqual(fs.existsSync(path.join(chefDir, "outbox")), true);
      assert.strictEqual(fs.existsSync(path.join(chefDir, "identity.md")), true);
      assert.strictEqual(fs.existsSync(path.join(chefDir, "memory.md")), true);
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should move valid messages from sender outbox to recipient inbox", () => {
    const tempDir = path.join(os.tmpdir(), `test-hive-router-${Date.now()}`);
    const initializer = new HiveInitializer(tempDir);
    initializer.initialize();

    const router = new HiveRouter({ hiveRoot: tempDir, pollIntervalMs: 50 });

    const msg: HiveMessage = {
      id: "msg-001",
      from: "linecook",
      to: "headchef",
      act: "done",
      subject: "Auth API route built",
      body: "Created POST /login with unit tests passing.",
      timestamp: new Date().toISOString(),
    };

    const outboxPath = path.join(tempDir, "agents", "linecook", "outbox", "msg-001.json");
    fs.writeFileSync(outboxPath, JSON.stringify(msg, null, 2));

    const deliveredCount = router.poll();
    assert.strictEqual(deliveredCount, 1);

    // Outbox file moved
    assert.strictEqual(fs.existsSync(outboxPath), false);

    // Inbox file created
    const inboxPath = path.join(tempDir, "agents", "headchef", "inbox", "msg-001.json");
    assert.strictEqual(fs.existsSync(inboxPath), true);

    const delivered = JSON.parse(fs.readFileSync(inboxPath, "utf-8"));
    assert.strictEqual(delivered.id, "msg-001");
    assert.strictEqual(delivered.from, "linecook");

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should discard messages violating Single-Writer rule", () => {
    const tempDir = path.join(os.tmpdir(), `test-hive-security-${Date.now()}`);
    const initializer = new HiveInitializer(tempDir);
    initializer.initialize();

    const router = new HiveRouter({ hiveRoot: tempDir, pollIntervalMs: 50 });

    const invalidMsg: HiveMessage = {
      id: "msg-forged",
      from: "plating", // Claims to be plating...
      to: "headchef",
      act: "request",
      subject: "Unauthorized message",
      body: "Forged sender in linecook outbox",
      timestamp: new Date().toISOString(),
    };

    // Placed in linecook outbox!
    const outboxPath = path.join(tempDir, "agents", "linecook", "outbox", "msg-forged.json");
    fs.writeFileSync(outboxPath, JSON.stringify(invalidMsg, null, 2));

    const deliveredCount = router.poll();
    assert.strictEqual(deliveredCount, 0);

    // File removed from outbox
    assert.strictEqual(fs.existsSync(outboxPath), false);

    // Not delivered to recipient inbox
    const inboxPath = path.join(tempDir, "agents", "headchef", "inbox", "msg-forged.json");
    assert.strictEqual(fs.existsSync(inboxPath), false);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
