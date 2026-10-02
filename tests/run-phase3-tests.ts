import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import fs from "fs";
import { PtyManager } from "../src/application/pty/PtyManager.ts";
import { HiveInitializer } from "../src/application/initializer/HiveInitializer.ts";
import type {
  PtyDataEvent,
  PtyExitEvent,
  PtyProcessInfo,
} from "../src/domain/types/pty.types.ts";

describe("Phase 3: PTY Agent Process Spawner Engine", () => {
  it("should spawn a chef process and capture stdout data stream", async () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-pty-${Date.now()}`);
    new HiveInitializer(tempHiveDir).initialize();

    const ptyManager = new PtyManager("/tmp/ag.sock", tempHiveDir);

    let capturedData = "";
    ptyManager.on("ptyData", (evt: PtyDataEvent) => {
      if (evt.role === "linecook") {
        capturedData += evt.data;
      }
    });

    const info: PtyProcessInfo = ptyManager.spawnAgent({
      role: "linecook",
      command: "node",
      args: ["-e", 'console.log("LINECOOK_READY")'],
    });

    assert.strictEqual(info.role, "linecook");
    assert.strictEqual(info.status, "running");

    // Wait for process to output data and exit
    await new Promise((resolve) => setTimeout(resolve, 300));

    assert.strictEqual(capturedData.includes("LINECOOK_READY"), true);

    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });

  it("should inject HIVE_SOCK and AGENT_ROLE environment variables", async () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-pty-env-${Date.now()}`);
    new HiveInitializer(tempHiveDir).initialize();

    const ptyManager = new PtyManager("/tmp/test-ag.sock", tempHiveDir);

    let outputData = "";
    ptyManager.on("ptyData", (evt: PtyDataEvent) => {
      outputData += evt.data;
    });

    // Node script to print env vars
    const script = `console.log(process.env.HIVE_SOCK + '|' + process.env.AGENT_ROLE)`;
    ptyManager.spawnAgent({
      role: "pantry",
      command: "node",
      args: ["-e", script],
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    assert.strictEqual(outputData.includes("/tmp/test-ag.sock|pantry"), true);

    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });

  it("should handle process termination and emit ptyExit event", async () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-pty-exit-${Date.now()}`);
    new HiveInitializer(tempHiveDir).initialize();

    const ptyManager = new PtyManager("/tmp/ag.sock", tempHiveDir);

    let exitEvent: PtyExitEvent | null = null;
    ptyManager.on("ptyExit", (evt: PtyExitEvent) => {
      exitEvent = evt;
    });

    ptyManager.spawnAgent({
      role: "inspector",
      command: "node",
      args: ["-e", "setTimeout(() => {}, 5000)"],
    });

    assert.strictEqual(ptyManager.getAgentStatus("inspector")?.status, "running");

    // Terminate agent process
    const killed = ptyManager.killAgent("inspector");
    assert.strictEqual(killed, true);

    await new Promise((resolve) => setTimeout(resolve, 150));

    assert.notStrictEqual(exitEvent, null);
    assert.strictEqual(exitEvent?.role, "inspector");

    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });
});
