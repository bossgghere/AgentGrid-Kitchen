import { describe, it } from "node:test";
import assert from "node:assert";
import { useKitchenStore } from "../src/renderer/store/kitchenStore.ts";
import type { HiveMessage } from "../src/domain/types/hive.types.ts";
import type { AgentStatusChangeEvent } from "../src/domain/types/hooks.types.ts";

describe("Phase 5: React UI Store & Frontend Engine", () => {
  it("should handle PTY stdout data streaming and update terminal logs", () => {
    const store = useKitchenStore.getState();

    store.handlePtyData({ role: "linecook", data: "COOKING_SOUP" });

    const updatedLog = useKitchenStore.getState().terminalLogs.linecook;
    assert.strictEqual(updatedLog.includes("COOKING_SOUP"), true);
  });

  it("should handle status change events and update chef roster badge", () => {
    const store = useKitchenStore.getState();

    const statusEvent: AgentStatusChangeEvent = {
      agentRole: "plating",
      status: "working",
      lastEvent: "PreToolUse",
      toolName: "plate_ui",
      timestamp: new Date().toISOString(),
    };

    store.handleStatusChange(statusEvent);

    const registry = useKitchenStore.getState().registry;
    assert.strictEqual(registry.plating?.status, "working");
  });

  it("should handle message delivery events and update inbox dispatches", () => {
    const store = useKitchenStore.getState();

    const msg: HiveMessage = {
      id: "msg-ui-1",
      from: "linecook",
      to: "headchef",
      act: "done",
      subject: "Auth Route Ready",
      body: "Tested POST /login",
      timestamp: new Date().toISOString(),
    };

    store.handleMessageDelivered(msg);

    const messages = useKitchenStore.getState().messages;
    assert.strictEqual(messages.length > 0, true);
    assert.strictEqual(messages[0].id, "msg-ui-1");
    assert.strictEqual(messages[0].from, "linecook");
  });
});
