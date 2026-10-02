import chalk from "chalk";
import { getProvider } from "../providers/index.js";
import { runShell } from "../tools/shell.js";
import { readFile, writeFile, listDir } from "../tools/file.js";

export async function coderNode(state) {
  console.log(
    chalk.hex("#22c55e")(`\n  [Coder] Executing (iteration ${state.iterations + 1}/3)...`)
  );

  const provider = await getProvider();

  const prompt = `You are a coder agent inside AgentGrid. Execute the plan by generating a sequence of actions.

Task: ${state.task}
Plan:
${state.plan}
Working Directory: ${state.workingDir}
${state.review ? `\nReviewer Feedback (fix this): ${state.review}` : ""}

Generate a JSON array of actions. Each action must be one of:

Write a file:
{"action": "write_file", "path": "relative/path/file.js", "content": "full file content"}

Run a shell command:
{"action": "run_shell", "command": "npm install express"}

Read a file:
{"action": "read_file", "path": "relative/path/file.js"}

List a directory:
{"action": "list_dir", "path": "."}

Rules:
- Use relative paths only (relative to workingDir)
- Write complete file contents, not partial
- Run commands needed to make the code work (npm install, etc.)
- Return ONLY a valid JSON array. No markdown, no explanation.`;

  const raw = await provider.complete(prompt, 8096);

  let actions;
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\n?/i, "")
      .replace(/^```\n?/, "")
      .replace(/\n?```$/, "")
      .trim();
    actions = JSON.parse(cleaned);
  } catch (parseErr) {
    console.log(chalk.red("  ✗ Could not parse action JSON — model returned non-JSON output"));
    console.log(chalk.dim(`    Hint: raw response starts with: ${raw.slice(0, 120)}`));
    return {
      code: raw,
      executionResult: `Parse error (${parseErr.message}). Raw: ${raw.slice(0, 500)}`,
      iterations: state.iterations + 1,
    };
  }

  console.log(chalk.dim(`  ${actions.length} action${actions.length !== 1 ? "s" : ""} to execute`));

  const results = [];
  let code = "";

  for (const action of actions) {
    try {
      switch (action.action) {
        case "write_file": {
          const fullPath = action.path.startsWith("/")
            ? action.path
            : `${state.workingDir}/${action.path}`;
          writeFile(fullPath, action.content);
          console.log(chalk.green(`  ✓ write  ${action.path}`));
          code += `\n// --- ${action.path} ---\n${action.content}\n`;
          results.push(`Written: ${action.path}`);
          break;
        }
        case "run_shell": {
          console.log(chalk.cyan(`  $ ${action.command}`));
          const out = runShell(action.command, state.workingDir);
          const preview = out.slice(0, 300) + (out.length > 300 ? "..." : "");
          console.log(chalk.dim(`    ${preview}`));
          results.push(`$ ${action.command}\n${out}`);
          break;
        }
        case "read_file": {
          const fullPath = action.path.startsWith("/")
            ? action.path
            : `${state.workingDir}/${action.path}`;
          const content = readFile(fullPath);
          results.push(`Read ${action.path}:\n${content.slice(0, 800)}`);
          break;
        }
        case "list_dir": {
          const fullPath = action.path.startsWith("/")
            ? action.path
            : `${state.workingDir}/${action.path}`;
          const files = listDir(fullPath);
          console.log(chalk.dim(`  ls  ${action.path}: ${files.join(", ")}`));
          results.push(`ls ${action.path}: ${files.join(", ")}`);
          break;
        }
        default:
          results.push(`Unknown action: ${action.action}`);
      }
    } catch (err) {
      console.log(chalk.red(`  ✗ ${action.action} failed: ${err.message}`));
      results.push(`Error in ${action.action}: ${err.message}`);
    }
  }

  return {
    code,
    executionResult: results.join("\n"),
    iterations: state.iterations + 1,
  };
}
