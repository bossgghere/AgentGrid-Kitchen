import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import os from "os";
import fs from "fs";
import { HiveInitializer } from "../src/application/initializer/HiveInitializer.ts";
import { HiveRouter } from "../src/application/router/HiveRouter.ts";
import { HookServer } from "../src/application/hooks/HookServer.ts";
import { PtyManager } from "../src/application/pty/PtyManager.ts";
import { IpcController } from "../src/main/ipc/IpcController.ts";
import { IPC_CHANNELS } from "../src/shared/ipc.types.ts";
import type { OrderTicket } from "../src/domain/types/hive.types.ts";
import type { AgentStatusChangeEvent } from "../src/domain/types/hooks.types.ts";

describe("Phase 4: Electron IPC Bridge & Controller Engine", () => {
  it("should register IPC channel handlers and handle ticket creation", async () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-ipc-${Date.now()}`);
    const initializer = new HiveInitializer(tempHiveDir);
    initializer.initialize();

    const router = new HiveRouter({ hiveRoot: tempHiveDir });
    const hookServer = new HookServer({ socketPath: path.join(tempHiveDir, "test.sock") });
    const ptyManager = new PtyManager(path.join(tempHiveDir, "test.sock"), tempHiveDir);

    const registeredHandlers = new Map<string, Function>();

    const mockIpcMain = {
      handle: (channel: string, listener: Function) => {
        registeredHandlers.set(channel, listener);
      },
    };

    let sentMessage: { channel: string; data: any } | null = null;
    const mockWindow = {
      webContents: {
        send: (channel: string, ...args: any[]) => {
          sentMessage = { channel, data: args[0] };
        },
      },
    };

    const ipcController = new IpcController({
      initializer,
      router,
      hookServer,
      ptyManager,
      ipcMain: mockIpcMain,
      getMainWindow: () => mockWindow,
    });

    // Assert handlers are registered
    assert.strictEqual(registeredHandlers.has(IPC_CHANNELS.SPAWN_AGENT), true);
    assert.strictEqual(registeredHandlers.has(IPC_CHANNELS.WRITE_AGENT), true);
    assert.strictEqual(registeredHandlers.has(IPC_CHANNELS.KILL_AGENT), true);
    assert.strictEqual(registeredHandlers.has(IPC_CHANNELS.CREATE_TICKET), true);

    // Test CREATE_TICKET handler execution
    const createTicketHandler = registeredHandlers.get(IPC_CHANNELS.CREATE_TICKET);
    assert.notStrictEqual(createTicketHandler, undefined);

    const newTicket: OrderTicket = await createTicketHandler!({}, {
      title: "Bake Soufflé",
      description: "Prepare dessert",
      assignee: "plating",
      status: "pending",
    });

    assert.strictEqual(newTicket.title, "Bake Soufflé");
    assert.strictEqual(newTicket.assignee, "plating");

    // Verify written to tickets.json
    const raw = fs.readFileSync(path.join(tempHiveDir, "tickets.json"), "utf-8");
    const tickets = JSON.parse(raw);
    assert.strictEqual(tickets.length, 1);
    assert.strictEqual(tickets[0].title, "Bake Soufflé");

    // Verify GET_PREVIEW_URL, READ_FILE, OPEN_EXTERNAL
    assert.strictEqual(registeredHandlers.has(IPC_CHANNELS.GET_PREVIEW_URL), true);
    const getPreviewHandler = registeredHandlers.get(IPC_CHANNELS.GET_PREVIEW_URL);
    const previewUrl = await getPreviewHandler!({}, tempHiveDir);
    assert.strictEqual(previewUrl, "http://127.0.0.1:5274");

    assert.strictEqual(registeredHandlers.has(IPC_CHANNELS.READ_FILE), true);
    const readFileHandler = registeredHandlers.get(IPC_CHANNELS.READ_FILE);
    const ticketsContent = await readFileHandler!({}, path.join(tempHiveDir, "tickets.json"));
    assert.strictEqual(ticketsContent !== null && ticketsContent.includes("Bake Soufflé"), true);

    assert.strictEqual(registeredHandlers.has(IPC_CHANNELS.OPEN_EXTERNAL), true);

    ipcController.closePreviewServer();
    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });

  it("should pipe PTY stdout data to renderer IPC channel", async () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-ipc-pty-${Date.now()}`);
    const initializer = new HiveInitializer(tempHiveDir);
    initializer.initialize();

    const router = new HiveRouter({ hiveRoot: tempHiveDir });
    const hookServer = new HookServer({ socketPath: path.join(tempHiveDir, "test.sock") });
    const ptyManager = new PtyManager(path.join(tempHiveDir, "test.sock"), tempHiveDir);

    const registeredHandlers = new Map<string, Function>();

    let sentChannel = "";
    let sentPayload: any = null;
    const mockWindow = {
      webContents: {
        send: (channel: string, ...args: any[]) => {
          sentChannel = channel;
          sentPayload = args[0];
        },
      },
    };

    new IpcController({
      initializer,
      router,
      hookServer,
      ptyManager,
      ipcMain: {
        handle: (ch, fn) => registeredHandlers.set(ch, fn),
      },
      getMainWindow: () => mockWindow,
    });

    // Emit PTY data event from PtyManager
    ptyManager.emit("ptyData", { role: "linecook", data: "HEATING_OVEN" });

    assert.strictEqual(sentChannel, IPC_CHANNELS.ON_PTY_DATA);
    assert.strictEqual(sentPayload.role, "linecook");
    assert.strictEqual(sentPayload.data, "HEATING_OVEN");

    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });

  it("should pipe Hook status change event to renderer IPC channel", async () => {
    const tempHiveDir = path.join(os.tmpdir(), `test-ipc-status-${Date.now()}`);
    const initializer = new HiveInitializer(tempHiveDir);
    initializer.initialize();

    const router = new HiveRouter({ hiveRoot: tempHiveDir });
    const hookServer = new HookServer({ socketPath: path.join(tempHiveDir, "test.sock") });
    const ptyManager = new PtyManager(path.join(tempHiveDir, "test.sock"), tempHiveDir);

    let sentChannel = "";
    let sentPayload: any = null;
    const mockWindow = {
      webContents: {
        send: (channel: string, ...args: any[]) => {
          sentChannel = channel;
          sentPayload = args[0];
        },
      },
    };

    new IpcController({
      initializer,
      router,
      hookServer,
      ptyManager,
      ipcMain: {
        handle: (ch, fn) => {},
      },
      getMainWindow: () => mockWindow,
    });

    // Emit status change event from HookServer
    const statusEvent: AgentStatusChangeEvent = {
      agentRole: "headchef",
      status: "working",
      lastEvent: "PreToolUse",
      currentTool: "write_plan",
      timestamp: new Date().toISOString(),
    };

    hookServer.emit("agentStatusChanged", statusEvent);

    assert.strictEqual(sentChannel, IPC_CHANNELS.ON_STATUS_CHANGED);
    assert.strictEqual(sentPayload.agentRole, "headchef");
    assert.strictEqual(sentPayload.status, "working");

    fs.rmSync(tempHiveDir, { recursive: true, force: true });
  });
});
