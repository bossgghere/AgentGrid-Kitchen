import { describe, it } from "node:test";
import assert from "node:assert";
import net from "net";
import path from "path";
import os from "os";
import fs from "fs";
import { HookServer } from "../src/application/hooks/HookServer.ts";
import type {
  HookEventPayload,
  AgentStatusChangeEvent,
} from "../src/domain/types/hooks.types.ts";

describe("Phase 2: Unix Socket Hook Server Engine", () => {
  it("should start socket server and accept client connections", async () => {
    const tempSocketPath = path.join(os.tmpdir(), `test-sock-${Date.now()}.sock`);
    const server = new HookServer({ socketPath: tempSocketPath });

    await server.start();
    assert.strictEqual(server.getIsListening(), true);

    // Connect client socket
    const client = net.connect(tempSocketPath);
    await new Promise<void>((resolve) => client.on("connect", () => resolve()));

    assert.strictEqual(fs.existsSync(tempSocketPath), true);

    client.destroy();
    await server.stop();
    assert.strictEqual(server.getIsListening(), false);
  });

  it("should parse PreToolUse and Stop hook payloads and emit agentStatusChanged events", async () => {
    const tempSocketPath = path.join(os.tmpdir(), `test-sock-payload-${Date.now()}.sock`);
    const server = new HookServer({ socketPath: tempSocketPath });
    await server.start();

    const receivedHooks: HookEventPayload[] = [];
    const statusEvents: AgentStatusChangeEvent[] = [];

    server.on("hookReceived", (h) => receivedHooks.push(h));
    server.on("agentStatusChanged", (s) => statusEvents.push(s));

    const client = net.connect(tempSocketPath);
    await new Promise<void>((resolve) => client.on("connect", () => resolve()));

    // 1. Send PreToolUse hook
    const preToolPayload: HookEventPayload = {
      agentRole: "linecook",
      event: "PreToolUse",
      toolName: "write_file",
      timestamp: new Date().toISOString(),
    };
    client.write(JSON.stringify(preToolPayload) + "\n");

    // 2. Send Stop hook
    const stopPayload: HookEventPayload = {
      agentRole: "linecook",
      event: "Stop",
      timestamp: new Date().toISOString(),
    };
    client.write(JSON.stringify(stopPayload) + "\n");

    // Give small buffer for event loop processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.strictEqual(receivedHooks.length, 2);
    assert.strictEqual(receivedHooks[0].agentRole, "linecook");
    assert.strictEqual(receivedHooks[0].toolName, "write_file");

    assert.strictEqual(statusEvents.length, 2);
    assert.strictEqual(statusEvents[0].status, "working");
    assert.strictEqual(statusEvents[1].status, "idle");

    client.destroy();
    await server.stop();
  });

  it("should handle chunked/fragmented data streams correctly", async () => {
    const tempSocketPath = path.join(os.tmpdir(), `test-sock-chunked-${Date.now()}.sock`);
    const server = new HookServer({ socketPath: tempSocketPath });
    await server.start();

    let deliveredPayload: HookEventPayload | null = null;
    server.on("hookReceived", (h) => {
      deliveredPayload = h;
    });

    const client = net.connect(tempSocketPath);
    await new Promise<void>((resolve) => client.on("connect", () => resolve()));

    const fullPayload: HookEventPayload = {
      agentRole: "pantry",
      event: "PreToolUse",
      toolName: "web_search",
      timestamp: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(fullPayload) + "\n";
    const chunk1 = jsonStr.slice(0, 15);
    const chunk2 = jsonStr.slice(15);

    // Send in two fragmented network chunks
    client.write(chunk1);
    await new Promise((resolve) => setTimeout(resolve, 50));
    client.write(chunk2);
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.notStrictEqual(deliveredPayload, null);
    assert.strictEqual(deliveredPayload?.agentRole, "pantry");
    assert.strictEqual(deliveredPayload?.toolName, "web_search");

    client.destroy();
    await server.stop();
  });
});
