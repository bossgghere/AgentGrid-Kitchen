import chalk from "chalk";
import { getProvider } from "../providers/index.js";

export async function orchestratorNode(state) {
  console.log(chalk.hex("#6366F1")("\n  [Orchestrator] Analyzing task..."));

  const provider = await getProvider();

  const text = await provider.complete(
    `You are the orchestrator of AgentGrid, a multi-agent coding system.

Analyze this task and return a brief context summary (2-3 sentences max).
Mention what type of task it is and any key considerations.

Task: ${state.task}
Working Directory: ${state.workingDir}

Respond with just the context summary, nothing else.`,
    512
  );

  console.log(chalk.dim(`  → ${text}`));
  return { output: text };
}
