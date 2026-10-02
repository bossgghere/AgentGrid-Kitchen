# Changelog

## v0.1.0 — Initial Release

- Multi-agent graph: Orchestrator → Planner → Coder → Reviewer
- Provider abstraction: Anthropic, OpenAI, Gemini switchable via `.env`
- Persistent JSON memory across sessions
- CLI commands: `help`, `history`, `config`, `exit`
- `MAX_ITERATIONS` and `SHELL_TIMEOUT` env vars
- Elapsed time, task counter, graceful Ctrl+C
