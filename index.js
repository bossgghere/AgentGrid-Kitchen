import "dotenv/config";
import readline from "readline";
import chalk from "chalk";
import ora from "ora";
import { buildGraph } from "./src/graph.js";
import { loadMemory, saveMemory } from "./src/memory/store.js";
import { getProvider, PROVIDER } from "./src/providers/index.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const NODE_MAJOR = parseInt(process.versions.node.split(".")[0], 10);
if (NODE_MAJOR < 18) {
  console.error(`AgentGrid requires Node.js 18+. You have ${process.versions.node}.`);
  process.exit(1);
}

if (process.argv.includes("--version")) {
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  const pkg = require("./package.json");
  console.log(`AgentGrid v${pkg.version}`);
  process.exit(0);
}

process.on("SIGINT", () => {
  console.log(chalk.dim("\n\n  Interrupted. Goodbye.\n"));
  process.exit(0);
});

async function main() {
  console.log();
  console.log(chalk.bold.hex("#6366F1")("  ╔══════════════════════════════╗"));
  console.log(chalk.bold.hex("#6366F1")("  ║       AgentGrid  v0.1        ║"));
  console.log(chalk.bold.hex("#6366F1")("  ║   Multi-Agent Code Engine    ║"));
  console.log(chalk.bold.hex("#6366F1")("  ╚══════════════════════════════╝"));
  console.log();

  // Validate the right key is set for the chosen provider
  const keyMap = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    gemini: "GEMINI_API_KEY",
  };
  const requiredKey = keyMap[PROVIDER];
  if (!requiredKey || !process.env[requiredKey]) {
    console.log(chalk.red(`  ✗ ${requiredKey} not set for provider "${PROVIDER}".`));
    console.log(chalk.dim("    Copy .env.example → .env and add your key.\n"));
    process.exit(1);
  }

  // Warm up provider (lazy load)
  const provider = await getProvider();
  console.log(
    chalk.dim(`  Provider : `) + chalk.hex("#6366F1")(`${provider.info.name}`) +
    chalk.dim(`  Model : `) + chalk.hex("#818CF8")(provider.info.model)
  );

  const memory = loadMemory();
  const graph = buildGraph();

  const sessionCount = (memory.sessions || []).length;
  if (sessionCount > 0) {
    console.log(chalk.dim(`  Sessions : ${sessionCount} past session${sessionCount !== 1 ? "s" : ""} in memory`));
  }

  console.log(chalk.dim("  Agents   : Orchestrator → Planner → Coder → Reviewer"));
  console.log(chalk.dim("  Type a coding task. 'exit' to quit.\n"));

  let taskCount = 0;

  const rawDir = await ask(chalk.cyan("  Working directory (Enter = current): "));
  const workingDir = rawDir.trim() || process.cwd();

  const fs = await import("fs");
  if (!fs.existsSync(workingDir)) {
    console.log(chalk.red(`  ✗ Directory not found: ${workingDir}\n`));
    process.exit(1);
  }
  console.log(chalk.dim(`  Dir: ${workingDir}\n`));

  while (true) {
    const task = await ask(chalk.bold.hex("#818CF8")(`  ▶ Task #${taskCount + 1}: `));

    taskCount++;
    const cmd = task.toLowerCase().trim();
    if (cmd === "exit") break;
    if (!task.trim()) continue;

    if (cmd === "help") {
      console.log(chalk.dim("\n  Commands:"));
      console.log(chalk.dim("    help     — show this message"));
      console.log(chalk.dim("    history  — view past sessions"));
      console.log(chalk.dim("    config   — show active provider & settings"));
      console.log(chalk.dim("    exit     — quit AgentGrid\n"));
      continue;
    }

    if (cmd === "config") {
      console.log(chalk.dim("\n  Active config:"));
      console.log(chalk.dim(`    Provider  : `) + chalk.hex("#6366F1")(provider.info.name));
      console.log(chalk.dim(`    Model     : `) + chalk.hex("#818CF8")(provider.info.model));
      console.log(chalk.dim(`    Dir       : ${workingDir}`));
      console.log(chalk.dim(`    Max iters : ${process.env.MAX_ITERATIONS || 3}\n`));
      continue;
    }

    if (cmd === "history") {
      const sessions = memory.sessions || [];
      if (sessions.length === 0) {
        console.log(chalk.dim("\n  No sessions yet.\n"));
      } else {
        console.log(chalk.dim(`\n  Last ${Math.min(sessions.length, 10)} sessions:`));
        sessions.slice(-10).reverse().forEach((s, i) => {
          const ts = new Date(s.timestamp).toLocaleString();
          const status = s.status === "done" ? chalk.green("✓") : chalk.yellow("~");
          console.log(chalk.dim(`  ${status} [${ts}]  ${s.task}`));
        });
        console.log();
      }
      continue;
    }

    const spinner = ora({
      text: chalk.dim("  Agents running..."),
      color: "magenta",
    }).start();

    const startTime = Date.now();

    try {
      const result = await graph.invoke({
        task: task.trim(),
        workingDir,
        memory,
        iterations: 0,
        status: "planning",
      });

      spinner.stop();

      console.log("\n" + chalk.bold.hex("#6366F1")("  ━━━━━━━━ Result ━━━━━━━━"));
      console.log(chalk.white("  " + result.output));

      if (result.executionResult) {
        console.log(chalk.dim("\n  Execution log:"));
        result.executionResult
          .split("\n")
          .slice(0, 10)
          .forEach((l) => console.log(chalk.dim("  " + l)));
      }

      // Persist session to memory
      memory.sessions = memory.sessions || [];
      memory.sessions.push({
        task,
        status: result.status,
        provider: PROVIDER,
        timestamp: new Date().toISOString(),
      });
      saveMemory(memory);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(chalk.dim(`\n  Completed in ${elapsed}s  ─────────────────────────\n`));
    } catch (err) {
      spinner.stop();
      console.log(chalk.red(`\n  ✗ Error: ${err.message}\n`));
    }
  }

  console.log(chalk.dim("\n  Goodbye.\n"));
  rl.close();
}

main();
