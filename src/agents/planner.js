import chalk from "chalk";
import { getProvider } from "../providers/index.js";

export async function plannerNode(state) {
  console.log(chalk.hex("#818CF8")("\n  [Planner] Breaking task into steps..."));

  const provider = await getProvider();

  const text = await provider.complete(
    `You are a software planning agent inside AgentGrid.

Break this coding task into clear, executable steps for a coder agent.

Task: ${state.task}
Working Directory: ${state.workingDir}

Rules:
- Maximum 5 steps
- Each step must be specific and actionable
- Focus on: files to create, code to write, commands to run
- Be concise — one line per step

Return a numbered list only. No explanation.`,
    1024
  );

  console.log(chalk.dim("\n" + text.split("\n").map((l) => `  ${l}`).join("\n")));
  return { plan: text };
}
