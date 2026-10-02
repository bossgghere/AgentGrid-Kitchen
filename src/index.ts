import chalk from "chalk";
import { HiveInitializer } from "./application/initializer/HiveInitializer.ts";
import { HiveRouter } from "./application/router/HiveRouter.ts";

async function main() {
  console.log();
  console.log(chalk.bold.hex("#F59E0B")("  ╔══════════════════════════════════════════════════╗"));
  console.log(chalk.bold.hex("#F59E0B")("  ║            AGENTGRID KITCHEN v1.0                ║"));
  console.log(chalk.bold.hex("#F59E0B")("  ║    Autonomous Michelin Multi-Agent Engine        ║"));
  console.log(chalk.bold.hex("#F59E0B")("  ╚══════════════════════════════════════════════════╝"));
  console.log();

  // Step 1: Initialize Walk-in Fridge Storage (~/.agentgrid/hive/)
  console.log(chalk.dim("  [1/2] Initializing Walk-in Fridge Storage..."));
  const initializer = new HiveInitializer();
  initializer.initialize();
  console.log(chalk.green(`  ✓ Walk-in Fridge ready at: ${initializer.getHiveRoot()}\n`));

  // Step 2: Start 200ms Single-Writer Router Engine
  console.log(chalk.dim("  [2/2] Launching Hive Message Router (200ms polling loop)..."));
  const router = new HiveRouter();

  router.on("started", () => {
    console.log(chalk.green("  ✓ Hive Router active and listening for station chef messages.\n"));
  });

  router.on("messageDelivered", (msg) => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    console.log(
      chalk.cyan(`  📩 [${time}] Message Delivered: `) +
        chalk.yellow(msg.from) +
        chalk.dim(" ──► ") +
        chalk.green(msg.to) +
        chalk.dim(` (${msg.act}: ${msg.subject})`)
    );
  });

  router.start();

  console.log(chalk.bold.hex("#10B981")("  👨‍🍳 Kitchen Brigade Engine is ONLINE. Press Ctrl+C to stop.\n"));

  process.on("SIGINT", () => {
    console.log(chalk.yellow("\n  Shutting down Kitchen Brigade Engine... Goodbye!"));
    router.stop();
    process.exit(0);
  });
}

main();
