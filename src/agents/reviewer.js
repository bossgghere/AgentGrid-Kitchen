import chalk from "chalk";
import { getProvider } from "../providers/index.js";

export async function reviewerNode(state) {
  const maxIter = parseInt(process.env.MAX_ITERATIONS || "3", 10);
  console.log(chalk.hex("#f59e0b")(`\n  [Reviewer] Checking output (iteration ${state.iterations}/${maxIter})...`));

  const provider = await getProvider();

  const raw = await provider.complete(
    `You are a reviewer agent inside AgentGrid. Determine if the coding task was completed correctly.

Original Task: ${state.task}
Plan:
${state.plan}

Execution Result:
${state.executionResult}
${state.code ? `\nCode Written:\n${state.code.slice(0, 3000)}` : ""}

Respond with this exact JSON (no markdown):
{
  "status": "done" or "needs_revision",
  "feedback": "one sentence — what's missing or wrong (only if needs_revision)",
  "output": "user-facing summary of what was accomplished"
}`,
    1024
  );

  let result;
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    result = JSON.parse(cleaned);
  } catch {
    result = {
      status: "done",
      feedback: "",
      output: state.executionResult || "Task execution complete.",
    };
  }

  if (result.status === "done") {
    console.log(chalk.green("  ✓ Approved"));
  } else {
    console.log(chalk.yellow(`  ↻ Needs revision: ${result.feedback}`));
  }

  return {
    review: result.feedback,
    status: result.status,
    output: result.output || state.executionResult,
  };
}
