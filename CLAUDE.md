# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Install dependencies: `npm install`
- Build TypeScript to `dist/`: `npm run build`
- Type-check only: `npm run typecheck`
- Run all tests (Node test runner via tsx): `npm run test`
- Run a single test file: `npx tsx --test src/path/to/file.test.ts`
- Run CLI from built output: `npm run dev`
- Run CLI (same as dev script): `npm run start`

Notes:
- `dev`/`start` execute `dist/index.js`, so rebuild after source changes.
- Test script targets `src/**/*.test.ts`.

## High-level architecture

### 1) Terminal UI loop (Ink)
- `src/index.tsx` is the interactive app entrypoint.
- Responsibilities:
  - Maintain in-memory chat state (`system/user/assistant` messages).
  - Capture keyboard input (`useInput`), delegate slash commands to dispatcher.
  - Submit user prompts to query layer and stream assistant output incrementally.

### 2) Command dispatch layer (V3)
- `src/commands/` decouples slash command handling from UI:
  - `types.ts`: CommandResult union types (`not_command`, `append_assistant`, `reset_messages`, `exit`)
  - `builtins.ts`: Built-in commands (`/help`, `/clear`, `/exit`)
  - `dispatcher.ts`: Routes input to command handlers
- UI calls `dispatchCommand()` and applies the returned action.

### 3) Query engine (LLM + tool loop)
- `src/query.ts` is the public entry point (backward compatible).
- Internal modules in `src/querylib/`:
  - `auth.ts`: Config resolution, credential normalization, Anthropic client creation
  - `engine.ts`: Message building, response parsing (text/tool blocks), error serialization
- Core flow:
  1. Resolve auth with priority: options > env (`MINI_CLAUDE_AUTH_TOKEN`) > config file
  2. Build API message payload (system message separated from conversation messages)
  3. Send request to Anthropic SDK with auth fallback attempts
  4. Yield assistant text blocks as stream chunks
  5. If response contains `tool_use`, execute local tools and append `tool_result` blocks, then continue loop
  6. Stop when no tool calls remain or when max tool-loop count is reached

### 4) Tool subsystem
- `src/tools/registry.ts` provides a registry abstraction with permission checking:
  - Register tools
  - Expose API tool schemas (filtered by policy)
  - Execute by name with standardized error shaping
  - Permission gate via `canUseTool(name)` hook
- `src/tools/index.ts` wires default tools:
  - `file_read` (`src/tools/fileReadTool.ts`): safe project-local file reads with line slicing
  - `grep` (`src/tools/grepTool.ts`): recursive regex search with excluded dirs (`.git`, `node_modules`, `dist`) and result caps

### 5) Permission system (V3)
- `src/permissions/` provides tool access control:
  - `toolPolicy.ts`: `createDefaultToolPolicy()` returns a `CanUseTool` checker
  - Default policy: allowlist-based (empty = allow all)
- ToolRegistry filters `getToolDefinitionsForApi()` and blocks `executeTool()` by policy.

### 6) Logging and observability
- `src/log.ts` writes newline-delimited JSON logs.
- Default log path resolution:
  1. `MINI_CLAUDE_LOG`
  2. `MINI_CLAUDE_LLM_LOG` (backward-compatible)
  3. `/tmp/mini-claude-cli.log`
- Query layer logs session start/end, requests/responses, tool execution, and errors.

### 7) Runtime config surface
- `mini-claude-cli.config.json` is the local runtime config file (model/base URL only).
- **Credentials should be set via environment variables**, not in config:
  - `MINI_CLAUDE_AUTH_TOKEN` (bearer token auth)
  - `MINI_CLAUDE_API_KEY` (API key auth)
- `.env.example` provides a template for local development.

## Testing

- Test files are in `src/*.test.ts`
- Test fixtures are created in `test-fixtures/` and `test-fixtures-grep/`
- Run tests: `npm run test`
- Current test coverage (V3):
  - `ToolRegistry.test.ts`: unknown tool, policy denial, API filtering
  - `dispatchCommand.test.ts`: `/help`, `/clear`, `/exit`, unknown command
  - `fileReadTool.test.ts`: file read, path escape rejection
  - `grepTool.test.ts`: pattern match, maxResults cap
