import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { HiveInitializer } from "../../src/application/initializer/HiveInitializer.js";
import { CHEF_ROLES } from "../../src/domain/constants/paths.constants.js";

describe("HiveInitializer (Phase 1)", () => {
  let tempHiveDir: string;
  let initializer: HiveInitializer;

  beforeEach(() => {
    tempHiveDir = path.join(os.tmpdir(), `test-hive-${Date.now()}`);
    initializer = new HiveInitializer(tempHiveDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempHiveDir)) {
      fs.rmSync(tempHiveDir, { recursive: true, force: true });
    }
  });

  it("should create the root directory and default JSON files", () => {
    initializer.initialize();

    expect(fs.existsSync(tempHiveDir)).toBe(true);
    expect(fs.existsSync(path.join(tempHiveDir, "registry.json"))).toBe(true);
    expect(fs.existsSync(path.join(tempHiveDir, "tickets.json"))).toBe(true);
    expect(fs.existsSync(path.join(tempHiveDir, "recipe_plan.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempHiveDir, "log.jsonl"))).toBe(true);
  });

  it("should create inbox/outbox/identity/memory for all 5 station chef roles", () => {
    initializer.initialize();

    const agentsDir = path.join(tempHiveDir, "agents");
    expect(fs.existsSync(agentsDir)).toBe(true);

    for (const role of CHEF_ROLES) {
      const chefDir = path.join(agentsDir, role);
      expect(fs.existsSync(path.join(chefDir, "inbox"))).toBe(true);
      expect(fs.existsSync(path.join(chefDir, "outbox"))).toBe(true);
      expect(fs.existsSync(path.join(chefDir, "identity.md"))).toBe(true);
      expect(fs.existsSync(path.join(chefDir, "memory.md"))).toBe(true);
    }
  });

  it("should seed valid registry.json containing all 5 chefs", () => {
    initializer.initialize();

    const registryPath = path.join(tempHiveDir, "registry.json");
    const raw = fs.readFileSync(registryPath, "utf-8");
    const registry = JSON.parse(raw);

    for (const role of CHEF_ROLES) {
      expect(registry[role]).toBeDefined();
      expect(registry[role].role).toBe(role);
      expect(registry[role].status).toBe("idle");
    }
  });
});
