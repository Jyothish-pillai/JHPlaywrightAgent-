# Playwright MCP Setup Guide (Local, Repo-Specific)

This repository already contains MCP integration points for local Playwright automation through VS Code and sandbox TypeScript clients.

This guide is written for the exact current state of this repo on Windows.

## 1. What Is Implemented in This Repo

Confirmed MCP integration files:
- `.vscode/mcp.json`
- `sandbox/test_local_mcp_browser.ts`
- `sandbox/test_local_mcp_google_android.ts`
- `sandbox/observe_amazon_search_mcp.ts`
- `.github/agents/playwright-test-planner.agent.md`
- `.github/agents/playwright-test-generator.agent.md`
- `.github/agents/playwright-test-healer.agent.md`

Important current-state note:
- `package.json` defines `pipeline` as `tsx execution/pipeline_runner.ts`
- `execution/` is not present in this checkout
- Any `pipeline_runner.ts` command will fail until those files are restored

## 2. How This Project Actually Communicates with MCP

There are two active MCP paths.

### A) VS Code Agent Path (Copilot/Agent Mode)
1. VS Code reads `.vscode/mcp.json`
2. It launches one of these stdio MCP servers:
   - `node_modules/.bin/playwright-mcp-server.cmd` (server name: `playwright`)
   - `node_modules/.bin/playwright.cmd run-test-mcp-server` (server name: `playwright-test`)
3. Agent tool calls are sent over stdio JSON-RPC
4. MCP server executes browser/test actions and returns tool results

### B) Local Scripted MCP Client Path (`sandbox/*.ts`)
1. Script creates `StdioClientTransport` from `@modelcontextprotocol/sdk`
2. Script starts one MCP server command from `node_modules/.bin`
3. Script connects MCP `Client`
4. Script lists/calls tools (`planner_setup_page`, `browser_navigate`, `browser_snapshot`, etc.)
5. Script closes transport

### Traceability in this repo
- Server commands are hardcoded in `sandbox/test_local_mcp_browser.ts`
- `playwright-test` flow starts with `planner_setup_page` in `sandbox/test_local_mcp_browser.ts`, `sandbox/test_local_mcp_google_android.ts`, and `sandbox/observe_amazon_search_mcp.ts`
- VS Code server wiring is in `.vscode/mcp.json`

## 3. Prerequisites

Install and verify:
1. Node.js 20+ (Node 24.x is already used in prior logs)
2. npm (bundled with Node)
3. Google Chrome installed (repo is configured for Chrome channel)
4. Playwright browser binaries installed
5. VS Code with GitHub Copilot Chat (for agent-driven MCP usage)

Recommended Windows shell: PowerShell 7+.

## 4. Clone, Install, and Bootstrap

From repo root:

```powershell
npm ci
npx playwright install chrome
```

Optional full browser install:

```powershell
npx playwright install
```

## 5. Required and Optional Config Files

## 5.1 `.vscode/mcp.json` (already present)
This file already defines:
- `playwright` stdio server
- `playwright-test` stdio server
- optional `github` HTTP MCP server

No changes required for local Playwright MCP smoke tests.

## 5.2 `.env` (create locally, gitignored)
Create `.env` at repo root if you use OpenAI-driven pipeline components or custom reporting metadata.

Suggested template:

```env
# Needed only if you run pipeline/LLM orchestration code (not present in current checkout)
OPENAI_API_KEY=your_key_here

# Report metadata
TEST_ENV=QA
STORY_NAME=TC002_ApiHealthCheck

# Test data strategy
TEST_DATA_STRATEGY=inline
TEST_DATA_SOURCE=excel

# Optional for sandbox google script
SEARCH_ENGINE=google

# Optional bootstrap controls
BOOTSTRAP_APP=Alloy
BOOTSTRAP_FUNCTIONALITY=alloyJourney
BOOTSTRAP_STORY=TC002_ApiHealthCheck
BOOTSTRAP_ENV=QA
BOOTSTRAP_TEST_IDS=ALLOY_ALLOYJOURNEY_TC001
BOOTSTRAP_DRY_RUN=false
BOOTSTRAP_SCOPE=STORY
```

## 6. Exact Commands: Start and Verify MCP Servers

Use these commands from repo root.

### 6.1 Verify binaries exist

```powershell
Get-Item .\node_modules\.bin\playwright.cmd
Get-Item .\node_modules\.bin\playwright-mcp-server.cmd
```

### 6.2 Start server manually (foreground check)

Playwright test MCP server:

```powershell
.\node_modules\.bin\playwright.cmd run-test-mcp-server
```

Playwright MCP server:

```powershell
.\node_modules\.bin\playwright-mcp-server.cmd
```

Expected behavior: command stays running (stdio server waiting for client). Stop with `Ctrl+C`.

### 6.3 Functional smoke test via local MCP client scripts

Test `playwright-test` server against Example domain:

```powershell
npx tsx sandbox/test_local_mcp_browser.ts playwright-test https://example.com
```

Test `playwright` server against Example domain:

```powershell
npx tsx sandbox/test_local_mcp_browser.ts playwright https://example.com
```

Google/Bing search scenario via MCP:

```powershell
$env:SEARCH_ENGINE="bing"
npx tsx sandbox/test_local_mcp_google_android.ts "Latest Android version"
```

Amazon observational flow:

```powershell
npx tsx sandbox/observe_amazon_search_mcp.ts
```

Note: Amazon/Google may trigger anti-bot pages depending on IP/session.

## 7. Chrome-Only Test Execution Commands

This repo is configured with a `chromium` project using `channel: 'chrome'` in `playwright.config.ts`.

Run all tests on Chrome project:

```powershell
npm run test:chrome
```

Run one story:

```powershell
npx playwright test tests/Alloy/alloyJourney/TC002_ApiHealthCheck.spec.ts --project=chromium
```

Run one folder:

```powershell
npx playwright test tests/Alloy/alloyJourney --project=chromium
```

## 8. Data Strategy and Environment Variables

### Execution-time variables in this repo
- `TEST_DATA_SOURCE` (default set in config to `excel`)
- `TEST_DATA_STRATEGY` (default set in config to `inline`)
- `CI` (affects retries/forbidOnly)
- `TEST_ENV` (used by reporter)
- `STORY_NAME` (used by reporter naming)

### Script variables in this repo
- `SEARCH_ENGINE` (`google` or `bing` for sandbox script)
- `BOOTSTRAP_*` vars used by `scripts/bootstrap-test-data.ts`

## 9. Troubleshooting (Repo-Specific)

## 9.1 `pipeline_runner.ts` not found
Symptom:
- `npm run pipeline` fails with file-not-found

Cause:
- `execution/` folder is referenced but missing in this checkout

Fix:
1. Restore `execution/` from the branch/commit where pipeline code exists.
2. Or temporarily avoid `npm run pipeline` and use direct `sandbox/*.ts` + Playwright test commands.

Quick check:

```powershell
Test-Path .\execution\pipeline_runner.ts
```

## 9.2 `inspect_mcp_tools.ts` fails on missing import
Symptom:
- Cannot resolve `../execution/agents/mcp_client`

Cause:
- same missing `execution/` folder

Fix:
- Use `sandbox/test_local_mcp_browser.ts` for MCP tool checks until execution code is restored.

## 9.3 MCP server command not found
Symptom:
- `playwright.cmd` or `playwright-mcp-server.cmd` missing

Fix:
1. Run `npm ci`
2. Ensure dev dependency `@executeautomation/playwright-mcp-server` is installed
3. Re-check under `node_modules/.bin`

## 9.4 Browser launch fails or wrong browser used
Symptom:
- Test fails with Chrome channel error

Fix:
1. Install Chrome locally
2. Run `npx playwright install chrome`
3. Keep `--project=chromium`

## 9.5 Google/Amazon blocks automation
Symptom:
- Captcha, unusual traffic, or bot challenge

Fix:
1. Set `SEARCH_ENGINE=bing`
2. Retry with clean browser profile/session
3. Use less bot-sensitive internal test target for smoke verification

## 9.6 Corporate proxy/OpenAI transport issues
Observed in project logs:
- `ERR_STREAM_PREMATURE_CLOSE` with some HTTP clients under proxy

Action:
- If you restore pipeline code, preserve the custom fetch/proxy-safe transport behavior documented in `logs/EnDToEndPipleline_implementation-log-2026-06-29.md`.

## 10. Validation Checklist (Go/No-Go)

Use this before sharing setup with team.

- [ ] `npm ci` completed without errors
- [ ] `npx playwright install chrome` completed
- [ ] `.vscode/mcp.json` exists and contains `playwright` + `playwright-test` servers
- [ ] `node_modules/.bin/playwright.cmd` exists
- [ ] `node_modules/.bin/playwright-mcp-server.cmd` exists
- [ ] `npx tsx sandbox/test_local_mcp_browser.ts playwright-test https://example.com` connects and lists tools
- [ ] `planner_setup_page` call succeeds in sandbox output
- [ ] `browser_navigate` and `browser_snapshot` succeed in sandbox output
- [ ] `npm run test:chrome` executes tests on Chromium/Chrome project
- [ ] Reporter HTML is generated under `playwright-report/` and/or `final-reports/`
- [ ] If pipeline is needed: `execution/pipeline_runner.ts` is restored and discoverable

## 11. Quick Start

For a fast path, see:
- `docs/MCP_QUICK_START.md`

## 12. Recommended Next Repo Hardening

1. Restore `execution/` source files or remove stale pipeline script to avoid broken onboarding.
2. Add `.env.example` from this README template.
3. Add `@modelcontextprotocol/sdk` as a direct dev dependency for explicit sandbox script support.
4. Add a CI job that runs MCP smoke test script + `npm run test:chrome`.
