# End-to-End Testing Pipeline - Implementation Log
**Date:** 2026-06-29  
**Project:** AgentTestAutomation  
**Objective:** Create an executable pipeline that automates the entire E2E test lifecycle from user story to test execution and reporting

---

## Implementation Overview

The pipeline automates the complete E2E testing workflow defined in `endToEndTestPrompt.md` without requiring manual GitHub Copilot interaction. It accepts a user story name as input and executes 7 sequential steps, from reading the story to generating a comprehensive HTML report.

**Command:**
```powershell
npx tsx execution/pipeline_runner.ts <UserStoryName>
```

**Technology Stack:**
- **Runtime:** Node.js v24.17.0, TypeScript via `tsx` (no compilation step)
- **LLM:** OpenAI GPT-4o (`gpt-4o` model)
- **Browser Automation:** Playwright MCP Server (Model Context Protocol over JSON-RPC 2.0)
- **Test Framework:** Playwright Test (`@playwright/test`)

---

## Pipeline Architecture

### 7-Step Workflow

| Step | Purpose | Implementation |
|---|---|---|
| **Step 1** | Read User Story | Loads `.md` file from `user-stories/` |
| **Step 2** | Generate Test Plan | GPT-4o + live browser exploration via MCP → saves plan to `specs/` |
| **Step 3** | Generate Test Scripts | GPT-4o direct call → writes `.spec.ts` files to `tests/` |
| **Step 4** | Execute Tests | Runs `npx playwright test` with Chromium |
| **Step 5** | Heal Failing Tests | GPT-4o analyzes failures → patches spec files |
| **Step 6** | Re-Execute Tests | Runs tests again after healing |
| **Step 7** | Generate HTML Report | Creates self-contained report in `test-results/` |

---

## Key Components

### 1. Pipeline Runner (`execution/pipeline_runner.ts`)
- **Entry point:** CLI interface for the entire pipeline
- **Features:**
  - Detects project root by finding `playwright.config.ts`
  - Generates single timestamp for all artifacts
  - Sequential execution with early exit on critical failures
  - Skips healing steps (5+6) if all tests pass in Step 4
  - Exit codes: 0 = success, 1 = failure

### 2. MCP Client (`execution/agents/mcp_client.ts`)
- **Purpose:** JSON-RPC 2.0 client for Playwright MCP server
- **Protocol:** stdio-based IPC with line-buffered readline
- **Tools:** 86 total tools (browser navigation, snapshot, interaction, test generation)
- **Lifecycle:** Spawns `npx playwright run-test-mcp-server`, initializes with protocol version `2024-11-05`
- **Timeout:** 10 minutes per tool call

### 3. OpenAI Agent (`execution/agents/openai_agent.ts`)
- **Purpose:** GPT-4o agent loop that routes tool calls to MCP
- **Features:**
  - Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s)
  - Tool call translation: MCP tools → OpenAI function schema
  - Iteration limit: 80 max iterations per agent run
  - Proxy-compatible via custom fetch implementation

### 4. Custom Fetch (`execution/agents/custom_fetch.ts`) ⚠️ CRITICAL FIX
- **Problem:** Corporate proxy (Pyramid Consulting) breaks `undici/fetch` and `node-fetch` with `ERR_STREAM_PREMATURE_CLOSE`
- **Solution:** Wraps Node.js `https.request` (which works on proxy) in a fetch-compatible interface
- **Features:**
  - Full response body buffering (no streaming)
  - Decompression support (gzip, deflate, brotli)
  - Returns standard `Response` object
- **Usage:** Injected into OpenAI SDK via `fetch: httpsRequestFetch as any`

### 5. Step 2: Test Plan Generation (`execution/steps/step2_generate_plan.ts`)
- **Method:** AI-powered browser exploration + live DOM inspection
- **Tools filtered:** 12 essential tools (from 86 total) to prevent oversized API payloads
  - `planner_setup_page`, `planner_save_plan`
  - 10 `browser_*` tools for navigation, snapshot, click, type, select, hover, press, wait, back, dialog
- **Output:** Markdown test plan in `specs/<story>-test-plan.md`
- **Duration:** 5–15 minutes (depends on site complexity)

### 6. Step 3: Test Script Generation (`execution/steps/step3_generate_scripts.ts`)
- **Method:** Direct GPT-4o call (no MCP) — text-to-code generation from test plan
- **Why no MCP:** MCP generator agent was navigating browser instead of writing tests (original design issue)
- **Output format:** Annotated code blocks with `// FILE: tests/.../*.spec.ts` headers
- **Parsing:** Regex extracts file paths and TypeScript content
- **Fallback:** If no FILE annotation, any `\`\`\`typescript` block with `import { test` is saved

### 7. Step 4: Execute Tests (`execution/steps/step4_execute_tests.ts`)
- **Command:** `npx playwright test tests/<story> --project=chromium`
- **Guard:** Returns mock result if test directory empty (prevents Playwright error)
- **Output parsing:** Extracts passed/failed counts from stdout
- **Report:** Playwright's built-in reporter + custom `final-html-reporter`

### 8. Step 5: Heal Failing Tests (`execution/steps/step5_heal_tests.ts`)
- **Method:** GPT-4o structured output (`response_format: {type: 'json_object'}`)
- **Input:** Test files + last 4000 chars of failure output
- **Output:** JSON with `{files: [{relativePath, content}], summary}`
- **Rounds:** Up to 3 healing attempts
- **Stop condition:** All tests pass or max rounds reached
- **Log:** Writes healing summary to `test-results/<story>-healing-log-<ts>.md`

### 9. Step 7: HTML Report (`execution/steps/step7_generate_report.ts`)
- **Format:** Self-contained HTML (embedded CSS, no external dependencies)
- **Sections:**
  1. Banner with story name, timestamp, pass/fail counts
  2. Summary cards (passed, failed, healed status)
  3. Results table (all test cases with status)
  4. Failed test details (errors, stack traces)
  5. Screenshots (embedded as base64 if available)
  6. Healing summary (rounds, changes made)
  7. Environment info (Node version, Playwright version, OS)
  8. Test plan (full Markdown content)
  9. Raw Playwright output (collapsible section)
- **Output:** `test-results/<story>-test-report-<ts>.html`

### 10. Artifact Manager (`execution/utils/artifact_manager.ts`)
- **Purpose:** Centralized path management for all artifacts
- **Paths managed:**
  - `userStoryPath`: `user-stories/<story>.md`
  - `testPlanPath`: `specs/<story>-test-plan.md`
  - `testsDir`: `tests/<story>/`
  - `healingLogPath`: `test-results/<story>-healing-log-<ts>.md`
  - `reportPath`: `test-results/<story>-test-report-<ts>.html`
  - `screenshotsDir`: `test-results/<story>-<project>/`
  - `runLogPath`: `test-results/<story>-run-<ts>.log`

### 11. Logger (`execution/utils/logger.ts`)
- **Levels:** INFO (green), WARN (yellow), ERROR (red), STEP (cyan)
- **Outputs:** Console + file (run log)
- **Format:** `[timestamp] [LEVEL] message`

---

## Major Fixes Applied

### Fix 1: Corporate Proxy Issue (CRITICAL)
**Problem:** OpenAI API calls failed with `ERR_STREAM_PREMATURE_CLOSE` — Pyramid Consulting proxy strips response body from stream-based HTTP clients (`undici/fetch`, `node-fetch`)

**Root Cause:** OpenAI SDK uses `undici/fetch` by default; proxy allows request but drops response body stream mid-transfer

**Solution:** Created `custom_fetch.ts` using Node.js `https.request` with full body buffering
- Collects response chunks into Buffer
- Decompresses (gzip/deflate/brotli) before returning
- Wraps result in standard `Response` object
- Injected into OpenAI SDK: `new OpenAI({ fetch: httpsRequestFetch as any })`

**Verification:** `npx tsx -e "..." → SUCCESS: PROXY_OK`

**Impact:** Enabled all OpenAI API calls (Steps 2, 3, 5)

---

### Fix 2: Step 3 Navigation Loop (MAJOR)
**Problem:** MCP generator agent navigated browser for 8+ iterations but never called `generator_write_test` — no spec files written

**Root Cause:** Original design expected agent to:
1. Call `generator_setup_page` → launch browser
2. Execute test plan steps live using `browser_*` tools
3. Read execution log via `generator_read_log`
4. Write spec via `generator_write_test`

**Reality:** Agent got stuck in exploration phase, never progressed to writing phase

**Solution:** Completely rewrote Step 3 to bypass MCP:
- Direct GPT-4o call (no agent loop)
- Input: test plan text
- Output: Annotated TypeScript code blocks
- Regex parsing to extract file paths and content
- Fallback parser for non-annotated blocks

**Result:** Step 3 now completes in seconds instead of timing out

---

### Fix 3: Tool Payload Size (MINOR)
**Problem:** Sending all 86 MCP tools to OpenAI → oversized API payload warnings

**Solution:** Tool filtering per step:
- Step 2 (planner): 12 essential tools
- Step 3 (generator): 3 tools (before MCP removal, now N/A)

**Impact:** Reduced API payload size, faster response times

---

### Fix 4: TypeScript Configuration (MINOR)
**Problem:** No `tsconfig.json` → TypeScript compiler errors when editing pipeline code

**Solution:** Created `tsconfig.json` with:
- `"module": "Node16"`, `"moduleResolution": "node16"`
- `"types": ["node"]`
- `"include": ["execution/**/*.ts", "playwright.config.ts"]`

**Impact:** Zero TypeScript errors in pipeline code

---

## Known Issues & Open Questions

### Issue 1: Planner Cannot Log Into Some Pages ⚠️ HIGH PRIORITY
**Symptom:** Step 2 tries multiple selectors for login elements, all fail, saves plan with **assumed/guessed locators** never verified in DOM

**Example:** `PyramidCore1-ValidateInvalidLogin` — planner tried:
- `#nav-link-accountList-nav-line-1`
- `#nav-link-accountList`
- `a[data-nav-role='signin']`
- `span.nav-line-2.nav-progressive-content`

All failed. Planner saved test plan with `#username`, `#password`, `input[type=submit]` — guessed, not observed.

**Root Cause:** Planner's system prompt does not instruct it to handle login failures gracefully or to document when locators are assumptions vs verified

**Impact:** Test plans may contain incorrect locators → script generation uses wrong selectors → tests fail

**Proposed Fix:** Enhance Step 2 planner prompt:
- If login fails after N attempts, instruct agent to document assumptions explicitly
- Add a "locator verification status" field to test plan output
- Consider fallback: if live exploration fails, use static page snapshot + best-effort locator inference

---

### Issue 2: Script Generator Overrides Test Plan Locators ⚠️ HIGH PRIORITY
**Symptom:** Test plan provides CSS locators (e.g. `#username`, `input[type=submit]`), but script generator replaces them with semantic locators that don't exist on the page

**Example:** 
- Test plan: `#username`, `#password`, `input[type=submit]`
- Generated script: `getByPlaceholder('Username')`, `getByPlaceholder('Password')`, `getByRole('button', { name: 'Login' })`
- Result: All locators fail because placeholders don't exist and submit button is `<input>` not `<button>`

**Root Cause:** Step 3 system prompt has this rule:
> *"Locator priority: getByRole > getByLabel > getByPlaceholder > getByText > locator(css)"*

GPT-4o follows the priority hierarchy strictly, discarding CSS locators even when they're the only correct option.

**Impact:** Tests fail with "element not found" errors immediately after generation

**Proposed Fix:** Add exception to locator priority rule:
```
EXCEPTION: if the test plan explicitly provides a CSS/ID locator for an element 
(e.g. '#username', 'input[type=submit]'), USE THAT EXACT LOCATOR — do not override 
it with a semantic locator that may not exist on the page.
```

**Status:** Fix documented but not yet applied (file editing tools were disabled during diagnosis)

---

### Issue 3: Healer Misdiagnoses Locator Failures as App Bugs ⚠️ MEDIUM PRIORITY
**Symptom:** Test fails due to wrong locator (e.g. `getByPlaceholder('Username')` doesn't exist), healer wraps test in `test.fixme()` instead of fixing the selector

**Example:** `PyramidCore1-ValidateInvalidLogin` — healer saw timeout on `expect(page.locator('text=Invalid username or password')).toBeVisible()`, concluded app wasn't showing error message (app bug), wrapped entire test in `test.fixme()`

**Root Cause:** Step 5 healer prompt says:
> *"If a failure is caused by an application bug (not a test issue), mark the test with test.fixme()"*

Healer has no diagnostic logic to differentiate:
- **Locator issue** (element exists but selector is wrong) → FIX selector
- **App bug** (selector is correct but app doesn't render element) → use `test.fixme()`

**Impact:** Pipeline reports ✅ PASS (because fixme tests are skipped), masking real failures

**Proposed Fix:** Add diagnosis order to healer prompt:
```
DIAGNOSIS ORDER: First check if the failure is a SELECTOR issue (element not found, locator timed out).
If it is, fix the selector — try CSS IDs, input type selectors, or data attributes instead.
Only after ruling out all selector issues should you consider an application bug.

Only use test.fixme() when the selector is provably correct and the application itself is broken.
NEVER use test.fixme() for locator failures.
```

**Status:** Fix documented but not yet applied

---

### Issue 4: `test.fixme()` Pattern Generated by Step 3 ⚠️ LOW PRIORITY
**Symptom:** Occasionally Step 3 generates specs with entire test wrapped in `test.fixme(callback)`, rendering test unrunnable

**Root Cause:** GPT-4o occasionally interprets "if you suspect app bug, document it" as "wrap in fixme preemptively"

**Impact:** Test is skipped, never runs

**Current Fix:** Added to Step 3 prompt:
> *"NEVER use test.fixme(), test.skip(), or test.only() — all tests must be active and runnable."*

**Status:** Partially mitigated but may still occur

---

### Issue 5: Broken `||` Locator Chains ⚠️ LOW PRIORITY
**Symptom:** Generated code like `page.getByPlaceholder('Username') || page.locator('#username')` — JavaScript always evaluates first locator as truthy (Locator objects are never falsy), so `||` is useless

**Root Cause:** GPT-4o tries to write "fallback locator" logic but doesn't understand Playwright Locators are objects, not boolean values

**Current Fix:** Added to Step 3 prompt:
> *"NEVER use the JavaScript || operator to chain locators. Pick ONE locator per element."*

**Status:** Mitigated but may still occur

---

### Question 1: Should Step 2 Use Screenshot-Based Planning?
**Context:** Current planner uses live browser + DOM snapshots. When login fails, it cannot explore authenticated pages, leading to guessed locators.

**Alternative:** Use Playwright's screenshot capability + GPT-4o Vision to:
1. Take screenshots of each page state
2. Send to GPT-4o with Vision API
3. Ask it to identify locators from visual inspection
4. Fall back to DOM snapshot for confirmation

**Pros:** Can "see" the page even if automation fails  
**Cons:** Higher API cost, potentially less accurate than DOM inspection

**Status:** Needs evaluation

---

### Question 2: Should We Add a Pre-Validation Step?
**Context:** Steps 2+3 can produce invalid locators, discovered only in Step 4 execution

**Proposal:** Add Step 2.5: "Validate Test Plan Locators"
- Launch browser
- Navigate to each page in the test plan
- Verify each locator in the plan exists and is unique
- Report missing/ambiguous locators back to Step 2 for regeneration

**Pros:** Catches locator issues before script generation  
**Cons:** Adds pipeline duration, requires additional API calls

**Status:** Needs design

---

### Question 3: Should Healing Be Iterative or Batch?
**Context:** Current healer does up to 3 rounds, re-running all tests each time

**Alternative:** 
- Parse Playwright output to identify failing test files
- Heal only those files
- Re-run only healed tests (not entire suite)

**Pros:** Faster healing, lower API cost  
**Cons:** More complex orchestration, risk of missing inter-test dependencies

**Status:** Optimization candidate

---

## File Structure

```
AgentTestAutomation/
├── execution/
│   ├── agents/
│   │   ├── custom_fetch.ts       # Proxy-compatible fetch wrapper
│   │   ├── mcp_client.ts         # JSON-RPC 2.0 MCP client
│   │   └── openai_agent.ts       # GPT-4o agent loop + retry logic
│   ├── steps/
│   │   ├── step2_generate_plan.ts    # Browser-based test plan generation
│   │   ├── step3_generate_scripts.ts # Direct GPT-4o script generation
│   │   ├── step4_execute_tests.ts    # Playwright test runner
│   │   ├── step5_heal_tests.ts       # GPT-4o-based test healing
│   │   ├── step6_reexecute_tests.ts  # Re-run after healing
│   │   └── step7_generate_report.ts  # HTML report generator
│   ├── utils/
│   │   ├── artifact_manager.ts   # Centralized path management
│   │   └── logger.ts             # Console + file logger
│   ├── pipeline_runner.ts        # Main CLI entry point
│   └── tsconfig.json             # TypeScript config for execution/
├── user-stories/                 # Input: user story markdown files
├── specs/                        # Output: test plan markdown files
├── tests/                        # Output: generated .spec.ts files
├── test-results/                 # Output: HTML reports, healing logs, run logs
├── final-reports/                # Output: Playwright HTML reports
├── .env                          # OPENAI_API_KEY (gitignored)
├── package.json                  # Dependencies + pipeline script
├── playwright.config.ts          # Playwright configuration
└── tsconfig.json                 # Root TypeScript config
```

---

## Dependencies

**Production:**
- `openai@^4.77.0` — OpenAI SDK
- `dotenv@^16.4.5` — Environment variable loader
- `node-fetch@^2.7.0` — (installed but unused; custom_fetch is used instead)

**Development:**
- `@playwright/test@^1.61.0` — Playwright Test framework
- `@types/node@^25.9.3` — Node.js type definitions
- `tsx@^4.19.2` — TypeScript execution (no build step)
- `typescript@^6.0.3` — TypeScript compiler (for type checking)

---

## Environment Variables

**Required:**
- `OPENAI_API_KEY` — OpenAI API key for GPT-4o access

**Location:** `.env` file in project root (gitignored)

---

## Usage Examples

### Run Full Pipeline
```powershell
npx tsx execution/pipeline_runner.ts Amazon2-ValidateAddTCartDelete
```

### Run via npm Script
```powershell
npm run pipeline Amazon2-ValidateAddTCartDelete
```

### Output Structure
```
test-results/
├── Amazon2-ValidateAddTCartDelete-test-report-20260626_171908.html
├── Amazon2-ValidateAddTCartDelete-healing-log-20260626_171908.md
└── Amazon2-ValidateAddTCartDelete-run-20260626_171908.log

specs/
└── Amazon2-ValidateAddTCartDelete-test-plan.md

tests/
└── Amazon2-ValidateAddTCartDelete/
    └── AddToRemoveItem.spec.ts
```

---

## Success Metrics

**Completed User Stories:**
- ✅ `Amazon2-ValidateAddTCartDelete` — Full pipeline success (1 test healed in round 1, then passed)

**Partial Success:**
- ⚠️ `PyramidCore1-ValidateInvalidLogin` — Test plan generated but with wrong locators; healer wrapped test in `test.fixme()` instead of fixing selectors

**Failure Rate:** 50% (1/2 stories fully automated)

**Root Causes of Failures:**
1. Planner cannot log into pages → assumes locators
2. Script generator overrides correct CSS locators with wrong semantic ones
3. Healer misdiagnoses locator failures as app bugs

---

## Next Steps

### Immediate (P0)
1. Apply Fix 2 (Script Generator locator exception) — add to `step3_generate_scripts.ts`
2. Apply Fix 3 (Healer diagnosis order) — add to `step5_heal_tests.ts`
3. Test fixes on `PyramidCore1-ValidateInvalidLogin` story
4. Verify healing now fixes selectors instead of using `test.fixme()`

### Short-term (P1)
1. Enhance Step 2 planner prompt to handle login failures gracefully
2. Add locator verification status to test plan output format
3. Run pipeline on 5 more user stories to validate reliability
4. Document common failure patterns in memory files

### Medium-term (P2)
1. Evaluate screenshot-based planning (GPT-4o Vision)
2. Design and implement Step 2.5 (Validate Test Plan Locators)
3. Optimize healing to re-run only patched tests (not full suite)
4. Add telemetry: API call counts, token usage, duration per step

### Long-term (P3)
1. Support multiple LLM providers (Claude, local models via Ollama)
2. Add parallel test execution support
3. Build web UI for pipeline monitoring
4. Implement test result caching to avoid redundant executions

---

## Lessons Learned

1. **Corporate proxies break modern HTTP clients** — undici/fetch and node-fetch rely on streams; proxies may strip body. Always test API calls on target network before deployment.

2. **MCP agent loops are unpredictable** — agents with both navigation and write tools tend to explore indefinitely. Separate concerns: one agent for exploration, another for code generation.

3. **LLM prompt rules need explicit exceptions** — "Locator priority: A > B > C" will be followed literally even when C is the only correct option. Add exception clauses for edge cases.

4. **test.fixme() is a double-edged sword** — useful for known app bugs, but catastrophic when misapplied to test issues. Healing prompts must carefully distinguish locator failures from app failures.

5. **Buffered HTTP responses > streaming on flaky networks** — custom_fetch.ts works because it buffers the entire response before parsing. Streaming would fail mid-transfer on the proxy.

---

## References

- **Project:** `c:\Users\kamleshk\OneDrive - Pyramid Consulting, Inc\Documents\PlaywrightProject\AgentTestAutomation`
- **MCP Server Docs:** https://github.com/microsoft/playwright-mcp
- **OpenAI API Docs:** https://platform.openai.com/docs/api-reference
- **Playwright Docs:** https://playwright.dev/docs/intro

---

**Log End**
