import fs from "fs";
import path from "path";
import { DEFAULT_HIVE_ROOT, CHEF_ROLES, CHEF_TITLES } from "../../domain/constants/paths.constants.ts";
import type { BrigadeRegistry, ChefRole } from "../../domain/types/hive.types.ts";

export class HiveInitializer {
  private readonly hiveRoot: string;

  constructor(hiveRoot: string = DEFAULT_HIVE_ROOT) {
    this.hiveRoot = hiveRoot;
  }

  /**
   * Initializes the Walk-in Fridge directory tree and seeds initial files
   */
  public initialize(): void {
    if (!fs.existsSync(this.hiveRoot)) {
      fs.mkdirSync(this.hiveRoot, { recursive: true });
    }

    const agentsDir = path.join(this.hiveRoot, "agents");
    if (!fs.existsSync(agentsDir)) {
      fs.mkdirSync(agentsDir, { recursive: true });
    }

    // Create per-chef directory structure (inbox/ outbox/ identity.md memory.md)
    for (const role of CHEF_ROLES) {
      const chefDir = path.join(agentsDir, role);
      const inboxDir = path.join(chefDir, "inbox");
      const outboxDir = path.join(chefDir, "outbox");

      fs.mkdirSync(inboxDir, { recursive: true });
      fs.mkdirSync(outboxDir, { recursive: true });

      const identityFile = path.join(chefDir, "identity.md");
      if (!fs.existsSync(identityFile)) {
        fs.writeFileSync(
          identityFile,
          `# ${CHEF_TITLES[role]}\nRole: ${role}\nStatus: Active\n`
        );
      }

      const memoryFile = path.join(chefDir, "memory.md");
      if (!fs.existsSync(memoryFile)) {
        fs.writeFileSync(
          memoryFile,
          `# Recipe Cookbook Memory — ${CHEF_TITLES[role]}\n`
        );
      }
    }

    // Seed registry.json
    const registryPath = path.join(this.hiveRoot, "registry.json");
    if (!fs.existsSync(registryPath)) {
      const initialRegistry: BrigadeRegistry = CHEF_ROLES.reduce((acc, role) => {
        acc[role] = {
          role,
          title: CHEF_TITLES[role],
          status: "idle",
          lastActive: new Date().toISOString(),
        };
        return acc;
      }, {} as BrigadeRegistry);

      fs.writeFileSync(registryPath, JSON.stringify(initialRegistry, null, 2));
    }

    // Seed tickets.json
    const ticketsPath = path.join(this.hiveRoot, "tickets.json");
    if (!fs.existsSync(ticketsPath)) {
      fs.writeFileSync(ticketsPath, JSON.stringify([], null, 2));
    }

    // Seed recipe_plan.md
    const planPath = path.join(this.hiveRoot, "recipe_plan.md");
    if (!fs.existsSync(planPath)) {
      fs.writeFileSync(planPath, "# Master Recipe Plan\n\nNo active order.\n");
    }

    // Seed log.jsonl
    const logPath = path.join(this.hiveRoot, "log.jsonl");
    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, "");
    }
  }

  /**
   * Returns the root directory path of the Hive
   */
  public getHiveRoot(): string {
    return this.hiveRoot;
  }
}
