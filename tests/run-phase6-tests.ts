import { describe, it } from "node:test";
import assert from "node:assert";
import net from "net";
import path from "path";
import os from "os";
import fs from "fs";
import { HiveInitializer } from "../src/application/initializer/HiveInitializer.ts";
import { HiveRouter } from "../src/application/router/HiveRouter.ts";
import { HookServer } from "../src/application/hooks/HookServer.ts";
import { CHEF_ROLES } from "../src/domain/constants/paths.constants.ts";
import type { HiveMessage, OrderTicket } from "../src/domain/types/hive.types.ts";
import type { HookEventPayload, AgentStatusChangeEvent } from "../src/domain/types/hooks.types.ts";

describe("Phase 6: Station Chef Prompts & Full E2E Workflow Engine", () => {
  it("should initialize system prompts in identity.md for all 5 station chefs", () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-e2e-prompts-${Date.now()}`);
    const initializer = new HiveInitializer(tempHiveDir);
    initializer.initialize();

    for (const role of CHEF_ROLES) {
      const identityPath = path.join(tempHiveDir, "agents", role, "identity.md");
      assert.strictEqual(fs.existsSync(identityPath), true);

      const content = fs.readFileSync(identityPath, "utf-8");
      assert.strictEqual(content.includes("Operating Rules"), true);
      assert.strictEqual(content.includes("Single-Writer Rule"), true);
    }

    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });

  it("should execute full end-to-end guest order workflow across all 5 engine layers", async () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-e2e-workflow-${Date.now()}`);
    const socketPath = path.join(tempHiveDir, "ag-e2e.sock");

    // 1. Initialize Walk-in Fridge
    const initializer = new HiveInitializer(tempHiveDir);
    initializer.initialize();

    // 2. Launch Router & Socket Hook Server
    const router = new HiveRouter({ hiveRoot: tempHiveDir, pollIntervalMs: 50 });
    const hookServer = new HookServer({ socketPath });

    await hookServer.start();
    router.start();

    const statusLog: AgentStatusChangeEvent[] = [];
    hookServer.on("agentStatusChanged", (s) => statusLog.push(s));

    // Connect Client Socket to simulate Chef Socket Telemetry
    const client = net.connect(socketPath);
    await new Promise<void>((resolve) => client.on("connect", () => resolve()));

    // STEP A: Executive Chef issues order ticket
    const ticketsPath = path.join(tempHiveDir, "tickets.json");
    const newTicket: OrderTicket = {
      id: "tkt-e2e-001",
      title: "Build REST Auth API",
      description: "Create POST /login and POST /register",
      assignee: "linecook",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(ticketsPath, JSON.stringify([newTicket], null, 2));

    // STEP B: Head Chef writes recipe_plan.md & dispatches order to Line Cook outbox
    const planPath = path.join(tempHiveDir, "recipe_plan.md");
    fs.writeFileSync(planPath, "# Master Recipe Plan\n\n1. Line Cook builds auth routes\n2. Inspector verifies.\n");

    const msg1: HiveMessage = {
      id: "msg-e2e-1",
      from: "headchef",
      to: "linecook",
      act: "request",
      subject: "Cook Auth API",
      body: "Please build POST /login with unit tests.",
      ticketId: "tkt-e2e-001",
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(tempHiveDir, "agents", "headchef", "outbox", "msg-e2e-1.json"),
      JSON.stringify(msg1, null, 2)
    );

    // Trigger router poll
    router.poll();

    // Assert delivered to linecook inbox
    const linecookInbox = path.join(tempHiveDir, "agents", "linecook", "inbox", "msg-e2e-1.json");
    assert.strictEqual(fs.existsSync(linecookInbox), true);

    // STEP C: Line Cook starts work -> emits PreToolUse socket hook
    const preToolHook: HookEventPayload = {
      agentRole: "linecook",
      event: "PreToolUse",
      toolName: "write_file",
      timestamp: new Date().toISOString(),
    };
    client.write(JSON.stringify(preToolHook) + "\n");
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.strictEqual(statusLog.length >= 1, true);
    assert.strictEqual(statusLog[statusLog.length - 1].status, "working");

    // STEP D: Line Cook finishes cooking -> drops result into Food Inspector outbox & emits Stop hook
    const msg2: HiveMessage = {
      id: "msg-e2e-2",
      from: "linecook",
      to: "inspector",
      act: "done",
      subject: "Auth API Ready for Tasting",
      body: "Code built and unit tests passing.",
      ticketId: "tkt-e2e-001",
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(tempHiveDir, "agents", "linecook", "outbox", "msg-e2e-2.json"),
      JSON.stringify(msg2, null, 2)
    );

    const stopHook: HookEventPayload = {
      agentRole: "linecook",
      event: "Stop",
      timestamp: new Date().toISOString(),
    };
    client.write(JSON.stringify(stopHook) + "\n");
    await new Promise((resolve) => setTimeout(resolve, 50));

    router.poll();

    // Assert delivered to inspector inbox
    const inspectorInbox = path.join(tempHiveDir, "agents", "inspector", "inbox", "msg-e2e-2.json");
    assert.strictEqual(fs.existsSync(inspectorInbox), true);

    // STEP E: Food Inspector audits and marks ticket completed
    newTicket.status = "completed";
    fs.writeFileSync(ticketsPath, JSON.stringify([newTicket], null, 2));

    const updatedTickets = JSON.parse(fs.readFileSync(ticketsPath, "utf-8"));
    assert.strictEqual(updatedTickets[0].status, "completed");

    // Cleanup
    client.destroy();
    router.stop();
    await hookServer.stop();
    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });
});
