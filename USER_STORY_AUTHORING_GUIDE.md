# User Story Authoring Guide — UI & API Testing

**Repository:** `JHPlaywrightAgent-` (Playwright + TypeScript + MCP agent pipeline)
**Audience:** QA engineers, SDETs and developers writing user stories that will be automated by this framework
**Status:** Derived from an analysis of the actual codebase (not generic advice). Every rule below cites the file that enforces it.

---

## 0. How to use this document

| If you want to… | Go to |
|---|---|
| Understand how this framework is wired | [1. Framework Analysis](#1-framework-analysis) |
| Write a **UI** user story | [3. Creating a UI User Story](#3-creating-a-ui-user-story) |
| Write an **API** user story | [4. Creating an API User Story](#4-creating-an-api-user-story) |
| Copy a ready-made template | [5. Templates](#5-copy-paste-templates) |
| See a complete end-to-end example | [6. Worked Examples](#6-worked-examples-story--plan--spec) |
| Know where files go | [7. Folder Structure](#7-folder-structure) |
| Know what to name things | [8. Naming Conventions](#8-naming-conventions) |
| Follow the delivery workflow | [9. Workflow](#9-workflow-user-story--reporting) |
| Get the short version | [11. Do's and Don'ts](#11-dos-and-donts) + [12. Final Recommendation](#12-final-recommendation) |

---

## 1. Framework Analysis

### 1.1 Technology stack

| Concern | Implementation | Source |
|---|---|---|
| Test runner | `@playwright/test` ^1.61 | [package.json](package.json) |
| Language | TypeScript ^6 (CommonJS, `type: "commonjs"`) | [package.json](package.json), [tsconfig.json](tsconfig.json) |
| Runtime helper | `tsx` for standalone scripts | [package.json](package.json) |
| Excel data | `xlsx` ^0.18 | [package.json](package.json) |
| Agent tooling | `@executeautomation/playwright-mcp-server`, `playwright run-test-mcp-server` | [.vscode/mcp.json](.vscode/mcp.json) |
| Browser policy | **Chrome only** — single `chromium` project with `channel: 'chrome'`, `--start-maximized`, `viewport: null` | [playwright.config.ts:84-94](playwright.config.ts#L84-L94) |

Notable runtime settings in [playwright.config.ts](playwright.config.ts) that your story must live within:

- `testDir: './tests'` ([:39](playwright.config.ts#L39))
- `workers: 1` — tests run serially; do not design stories that depend on parallelism ([:47](playwright.config.ts#L47))
- `timeout: 90000` per test, `expect.timeout: 10000` ([:49-51](playwright.config.ts#L49-L51))
- `headless: false` — execution is **headed** by design, so auto-healing/observation works ([:63](playwright.config.ts#L63))
- `actionTimeout: 45000`, `navigationTimeout: 30000` ([:69-72](playwright.config.ts#L69-L72))
- `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'` ([:75-76](playwright.config.ts#L75-L76))
- `ignoreHTTPSErrors: true` — internal apps with self-signed certs are supported ([:66](playwright.config.ts#L66))

### 1.2 The three-layer artifact chain (the single most important convention)

This framework is built around **one user story producing exactly three mirrored artifacts** with the *same* path segments and the *same* base file name:

```
user-stories/{application}/{functionality_path}/{story_name}.md      ← you write this (source of truth)
specs/{application}/{functionality_path}/{story_name}-test-plan.md   ← planner agent writes this
tests/{application}/{functionality_path}/{story_name}.spec.ts        ← generator agent writes this
```

This is not a suggestion — it is enforced under **"Folder Structure Enforcement (Mandatory)"** in [endToEndTestPrompt.md:280-296](endToEndTestPrompt.md#L280-L296), which also lists forbidden shapes (flat `specs/{story}-test-plan.md`, story-name-as-folder, un-prefixed spec names).

Real example of the chain that exists today:

| Layer | File |
|---|---|
| Story | [user-stories/FakeRestAPI/User/create_user.md](user-stories/FakeRestAPI/User/create_user.md) |
| Plan | [specs/FakeRestAPI/User/create_user-test-plan.md](specs/FakeRestAPI/User/create_user-test-plan.md) |
| Spec | [tests/FakeRestAPI/User/create_user.spec.ts](tests/FakeRestAPI/User/create_user.spec.ts) |

Every generated spec begins with back-links to its two upstream artifacts — keep doing this:

```typescript
// File: tests/FakeRestAPI/User/create_user.spec.ts
// spec: specs/FakeRestAPI/User/create_user-test-plan.md
// TEST_DATA_STRATEGY=inline
```

### 1.3 Why the folder depth matters (the reporter reads it)

The custom reporter derives report grouping **from the test file path**, not from metadata:

- `derivePathMetadata()` sets **Application** = the segment right after `tests/`, and **Functionality** = the next segment — [reporters/final-html-reporter.cjs:76-97](reporters/final-html-reporter.cjs#L76-L97).
- Test case IDs in the report are **positional** (`TC001`, `TC002`, … by execution index) — [:443-456](reporters/final-html-reporter.cjs#L443-L456). They are *not* stable identifiers, which is exactly why the story/spec file name must carry the real ID (see [§8](#8-naming-conventions)).
- The report file name is `final-reports/{name}-{timestamp}.html` where `{name}` is the single executed spec's base name, else `STORY_NAME`, else `CombinedExecution` — [:414-431](reporters/final-html-reporter.cjs#L414-L431). **Run one story at a time to get a story-named report.**
- The API Request/Response panel renders only when the path is classified as an API test *and* `api-*` attachments exist — `isApiTest()` at [:112-119](reporters/final-html-reporter.cjs#L112-L119) **excludes** paths matching `ui`, `page`, or `visual` next to `.spec`. Practical consequence: **never put an API test in a folder or file named `ui` / `page` / `visual`** or its API evidence panel disappears.
- Environment shown in the header comes from `TEST_ENV` (default `QA`) — [:717](reporters/final-html-reporter.cjs#L717).

**Conclusion:** exactly two path levels under each root (`{application}/{functionality_path}`) is what the reporter, the pipeline prompt and the existing 18 stories all assume. Do not add or remove levels.

### 1.4 Shared utilities (there are only two — use them; do not reinvent)

| Utility | Purpose | Applies to |
|---|---|---|
| [tests/support/api-evidence.ts](tests/support/api-evidence.ts) | `callApi()` + `ApiSnapshot` — executes an HTTP call, captures **all** evidence, returns an immutable snapshot | **API stories (mandatory)** |
| [tests/support/excel-data.ts](tests/support/excel-data.ts) | `getMergedTestData()` + `csvToList()` — merges `CommonData` with a functional sheet row by `TEST_ID` | Stories using `TEST_DATA_STRATEGY=external` |

`callApi()` exists because **a failing `expect()` throws**, so any `attach()` placed after an assertion never runs on the run that actually failed. The module enforces `EXECUTE → CAPTURE → VALIDATE` structurally ([api-evidence.ts:1-43](tests/support/api-evidence.ts#L1-L43), `callApi` at [:115](tests/support/api-evidence.ts#L115)). The contract is restated in [endToEndTestPrompt.md:732-832](endToEndTestPrompt.md#L732-L832).

`ApiSnapshot` gives you everything validation needs without touching the wire again: `status`, `statusText`, `ok`, `headers`, `bodyText`, `durationMs`, `json<T>()`, `header(name)` (case-insensitive) — [api-evidence.ts:68-87](tests/support/api-evidence.ts#L68-L87).

### 1.5 What the framework deliberately does **not** have

- **No Page Object Model.** There are no `pages/`, `components/`, `fixtures/` or `helpers/` folders, no classes, no `test.extend()`. Verified across all 20 specs. Locators live inline in the spec, and where a spec needs a shortcut it defines a small local helper — e.g. the `byTest()` one-liner in [tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts:40](tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts#L40) (SauceDemo uses `data-test`, while Playwright's `getByTestId()` resolves `data-testid`).
- **No API client/service layer.** `callApi()` *is* the API client. Endpoints are inline constants.
- **No shared config module.** Configuration is inline constants plus a handful of env vars.

> **Implication for story authors:** because there is no abstraction layer, everything the automation needs must come from **your story text + the planner's live observation**. A vague story produces a vague spec — there is no page object to hide the gaps.

### 1.6 Test-data strategies

Two switches, both defaulted in [playwright.config.ts](playwright.config.ts):

| Variable | Default | Meaning |
|---|---|---|
| `TEST_DATA_STRATEGY` | `inline` ([:33](playwright.config.ts#L33)) | How data is **generated into** the spec: `inline` = embedded constants; `external` = Excel via `getMergedTestData()` |
| `TEST_DATA_SOURCE` | `excel` ([:19](playwright.config.ts#L19)) | Where data is **read from at runtime** for Excel-driven specs |

Current reality: **`inline` is the working strategy.** `test-data/` is gitignored ([.gitignore](.gitignore)) and absent from the checkout, so the one Excel-driven spec — [tests/MagicBox/StartNewPlacement/test_start_a_pre_placement.spec.ts](tests/MagicBox/StartNewPlacement/test_start_a_pre_placement.spec.ts) — cannot run until `npm run testdata:bootstrap` regenerates the workbook.

If you do go external, [scripts/bootstrap-test-data.ts](scripts/bootstrap-test-data.ts) generates the workbook and it **parses your user story**, which constrains the story format:

- Sheet name = `{App}_{FunctionalityPath}` truncated to 31 chars — `deriveSheetName()` [:47-57](scripts/bootstrap-test-data.ts#L47-L57)
- Default `TEST_ID` = `{APP}_{FUNCTIONALITY}_TC001` — `defaultTestId()` [:89-96](scripts/bootstrap-test-data.ts#L89-L96)
- It scrapes the story for bullet labels **`URL:`**, **`Username:`**, **`Password:`** and the first line under a **`## Expected Result`** heading — [:157-163](scripts/bootstrap-test-data.ts#L157-L163) with the regex at [:106-119](scripts/bootstrap-test-data.ts#L106-L119)
- `CommonData` columns: `APP, ENV, BASE_URL, USERNAME, PASSWORD, TIMEOUT_MS` — [:30-37](scripts/bootstrap-test-data.ts#L30-L37)

**This is why the templates in [§5](#5-copy-paste-templates) use `- URL:`, `- Username:`, `- Password:` bullets and an `## Expected Result` section** — that exact shape is machine-readable today.

### 1.7 The MCP agent pipeline

Three agent definitions drive the automation, all pinned to the `playwright-test` stdio MCP server:

| Agent | Role | Key rules it will apply to your story |
|---|---|---|
| [playwright-test-planner](.github/agents/playwright-test-planner.agent.md) | Explores the live app, writes the test plan | Must call `planner_setup_page` first; explores by snapshot, not screenshots |
| [playwright-test-generator](.github/agents/playwright-test-generator.agent.md) | Writes the spec | **Locator priority** `getByTestId` → stable `#id` → `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → CSS → (XPath forbidden) [:44-75](.github/agents/playwright-test-generator.agent.md#L44-L75); prunes exploration noise; "prefer fewer high-value assertions" |
| [playwright-test-healer](.github/agents/playwright-test-healer.agent.md) | Fixes failures, re-runs until stable | Heals locators/waits/assertions; may mark a genuinely-broken product path `test.fixme()` with an explanatory comment |

The end-to-end orchestration prompt is [endToEndTestPrompt.md](endToEndTestPrompt.md) — treat it as the pipeline's specification and this guide as the human-facing input contract for it.

### 1.8 How UI and API tests are organised **today**

Everything lives in the same tree — there is **no `ui/` vs `api/` split**. The story type is expressed by the Playwright fixture (`page` vs `request`) and by naming.

| Application | Functionality folder | Type | Specs | API pattern |
|---|---|---|---|---|
| `Alloy` | `alloyJourney` | 1 UI + 8 API | 9 | ⚠️ **Legacy** — raw `request.get/post/...` |
| `Amazon` | `Search` | UI | 1 | — |
| `FakeRestAPI` | `User` | API | 1 | ✅ `callApi()` |
| `JSONPlaceholder` | `APITests` | API | 2 | ✅ `callApi()` |
| `MagicBox` | `StartNewPlacement` | UI | 3 | — (one spec is Excel-driven) |
| `MagicBoxLegacy` | *(none — flat)* | UI | 2 | ⚠️ Missing the functionality level |
| `SauceDemo` | `AddToCart` | UI | 1 | — |

Verified drift you should be aware of, and must not copy:

1. **9 Alloy specs bypass the evidence contract** — they call `request.*` directly, so a failure before the parse step yields a report with no captured response. Compare [tests/Alloy/alloyJourney/TC002_ApiHealthCheck.spec.ts](tests/Alloy/alloyJourney/TC002_ApiHealthCheck.spec.ts) (legacy) with [tests/FakeRestAPI/User/create_user.spec.ts](tests/FakeRestAPI/User/create_user.spec.ts) (correct).
2. **Duplicate misspelled folder** — `user-stories/Amazon/Serach/` alongside `user-stories/Amazon/Search/`, same file name.
3. **Colliding IDs** — `TC003_JourneyConfig.md` and `TC003_CreateJourneyConfig.md` both claim TC003 in the same functionality.
4. **`MagicBoxLegacy` is flat**, so the reporter labels its Functionality as `MagicBoxLegacy` via the backward-compatibility branch at [reporters/final-html-reporter.cjs:91-94](reporters/final-html-reporter.cjs#L91-L94).
5. **Two broken npm scripts** — `npm run pipeline` needs the absent `execution/`, and `npm run validate:strategy` points at `scripts/validate-test-data-strategy.ts`, which does not exist.
6. **`final-reports/` is not gitignored** — 148 generated HTML reports are currently untracked-but-visible in `git status`.
7. **Story quality is wildly uneven.** [user-stories/Alloy/alloyJourney/TC002_ApiHealthCheck.md](user-stories/Alloy/alloyJourney/TC002_ApiHealthCheck.md) and [user-stories/MagicBox/StartNewPlacement/Login_Pyramidcore.md](user-stories/MagicBox/StartNewPlacement/Login_Pyramidcore.md) are raw step dumps with no acceptance criteria. [user-stories/FakeRestAPI/User/create_user.md](user-stories/FakeRestAPI/User/create_user.md) and [user-stories/Amazon/Search/TC001_Amazon.md](user-stories/Amazon/Search/TC001_Amazon.md) are the models to imitate.

---

## 2. Before you write: three decisions that change everything

### 2.1 Decide the story type (mandatory first decision)

Per [endToEndTestPrompt.md:253-278](endToEndTestPrompt.md#L253-L278):

| Story type | Indicators | Fixture | Planner behaviour |
|---|---|---|---|
| **UI** | URL to navigate, screens, forms, clicks, logins, element labels | `page` | Launches Chrome and explores the live app |
| **API** | HTTP method + endpoint, headers/payload, status codes, response fields | `request` | **No browser** — issues a live API probe instead |
| **Hybrid** | Both | `page` + `request` | UI rules for the browser part, API rules for every HTTP call |

Write the type explicitly in your story. If the pipeline has to guess, it will guess wrong for hybrids.

### 2.2 One story = one happy path

STEP 2.4 of the pipeline instructs the planner to produce **one positive test case only** ([endToEndTestPrompt.md:468-478](endToEndTestPrompt.md#L468-L478)). Therefore:

- **Do not** pack the happy path + 4 negative variants into one story. You will get automation for the happy path and silently lose the rest.
- **Do** split each additional scenario into its own story file with its own TC number: `TC001_LoginWithValidCredentials.md`, `TC002_LoginWithInvalidPassword.md`.
- Multiple *assertions* per story are expected and encouraged — [user-stories/JSONPlaceholder/APITests/retrieve_post_by_id.md](user-stories/JSONPlaceholder/APITests/retrieve_post_by_id.md) explicitly demands "at least 5 meaningful assertions".

### 2.3 Choose the data strategy

Default to **`inline`**. Choose `external` only when several stories genuinely share the same data set, and accept that you must run `npm run testdata:bootstrap` first because `test-data/` is gitignored. Record the choice in the story's metadata block so the generator does not have to infer it.

---

## 3. Creating a UI User Story

### Step 1 — Locate/create the folder pair

Pick `{application}` (the product, e.g. `SauceDemo`) and `{functionality_path}` (the feature, e.g. `Checkout`). Reuse an existing pair if one fits; a new feature area means a new functionality folder in all three roots.

```
user-stories/SauceDemo/Checkout/
specs/SauceDemo/Checkout/         ← created by the planner
tests/SauceDemo/Checkout/         ← created by the generator
```

### Step 2 — Name the file

`TC{NNN}_{PascalCaseIntent}.md` — e.g. `TC001_CompleteCheckoutWithSingleProduct.md`. See [§8](#8-naming-conventions) for the full rules. Check the folder first: **TC numbers must be unique within a functionality folder.**

### Step 3 — Write the metadata block

Story ID, type (`UI`), application, functionality, environment, data strategy, priority. This is what lets a reader route the story without reading it.

### Step 4 — Write the story sentence and business value

`As a <role>, I want <capability>, so that <outcome>.` Then one or two lines of why it matters — copy the shape from [user-stories/Amazon/Search/TC001_Amazon.md](user-stories/Amazon/Search/TC001_Amazon.md).

### Step 5 — Write preconditions

Everything that must be true before step 1: app reachable, account state, cart empty, feature flag on, data seeded. `workers: 1` means tests are serial, but each test still gets a fresh browser context — state you need must be created **by** the test or guaranteed by the environment.

### Step 6 — Write acceptance criteria in Given/When/Then

One numbered scenario, Given/When/Then, in the user's language. **Never** put locators or CSS in acceptance criteria — the planner discovers real locators by exploring the live app, and a guessed selector in the story actively misleads it.

### Step 7 — Write the test data block

Use the machine-readable bullet labels so `bootstrap-test-data.ts` can parse them:

```markdown
## Test Data

- URL: https://www.saucedemo.com/
- Username: standard_user
- Password: secret_sauce
- Product: Sauce Labs Backpack
```

> **Never commit real credentials for production or customer systems.** Use dedicated test accounts. For secrets, reference the variable name (`UI_PASSWORD_ENC` from `.env.sandbox`, as [user-stories/Alloy/alloyJourney/TC001_AlloyUI.md](user-stories/Alloy/alloyJourney/TC001_AlloyUI.md) does) rather than the value.

### Step 8 — Write the expected results

Keep the heading exactly `## Expected Result` (singular) — that is the heading the bootstrap script scrapes. State observable outcomes: URL reached, message shown, badge count, row removed.

### Step 9 — Add UI-specific details

Anything that stops the planner from having to guess: entry route, navigation path, whether a dialog/toast appears, dynamic fields, known flakiness (captcha, anti-bot — Amazon and Google both trigger it, see [README.md](README.md) §9.5), date formats, required vs optional fields.

### Step 10 — Self-review, then hand off

Run the [Definition of Ready](#101-definition-of-ready-for-a-user-story) checklist, then run the pipeline (see [§9](#9-workflow-user-story--reporting)).

---

## 4. Creating an API User Story

### Step 1 — Folder pair

Same rule: `{application}/{functionality_path}` where the functionality is the **resource or capability** — `User`, `Books`, `alloyJourney`. Prefer the resource name (`FakeRestAPI/User`) over a generic bucket like `JSONPlaceholder/APITests`, which tells a reader nothing.

⚠️ Do not name an API folder or file `ui`, `page`, or `visual` — `isApiTest()` at [reporters/final-html-reporter.cjs:112-119](reporters/final-html-reporter.cjs#L112-L119) will exclude it and the report will drop the API request/response panel.

### Step 2 — Name the file

`TC{NNN}_{Verb}{Resource}.md` — `TC001_CreateUser.md`, `TC002_GetBookById.md`, `TC003_UpdateJourneyConfig.md`.

### Step 3 — Metadata block

Same as UI, with `Story Type: API`.

### Step 4 — Story sentence

`As an API consumer, I want to <operation> so that <verifiable outcome>.`

### Step 5 — API details table

Non-negotiable, and the single most valuable part of an API story. Copy the table from [user-stories/FakeRestAPI/User/create_user.md](user-stories/FakeRestAPI/User/create_user.md):

| Field | Value |
|---|---|
| Method | `POST` |
| Base URL | `https://fakerestapi.azurewebsites.net` |
| Endpoint | `/api/v1/Users` |
| Full URL | `https://fakerestapi.azurewebsites.net/api/v1/Users` |
| Authentication | Not required |
| Content-Type | `application/json` |
| Accept | `application/json` |

Only these methods are supported by the helper: `GET | POST | PUT | PATCH | DELETE | HEAD` ([api-evidence.ts:47](tests/support/api-evidence.ts#L47)).

### Step 6 — Request headers and body

Give the **exact** JSON payload in a fenced block. If any field is server-generated or environment-specific, say so — that determines whether the assertion checks a literal or a type.

### Step 7 — Acceptance criteria as a numbered assertion list

For APIs, acceptance criteria *are* the assertions. Cover all six dimensions:

1. **Status** — expected code
2. **Headers** — `Content-Type`, `Location`, rate-limit headers
3. **Field existence** — which keys must be present
4. **Field values** — echoed inputs, computed values
5. **Data types** — `number` vs `string`, integer-ness
6. **Schema shape** — exact key set; no unexpected fields

Demand a minimum count ("at least 5 meaningful assertions… do not validate only the HTTP status code") as [retrieve_post_by_id.md](user-stories/JSONPlaceholder/APITests/retrieve_post_by_id.md) does.

### Step 8 — Be honest about content-type and persistence

Two lessons already paid for in this repo, recorded in [specs/FakeRestAPI/User/create_user-test-plan.md](specs/FakeRestAPI/User/create_user-test-plan.md):

- Live `Content-Type` was `application/json; charset=utf-8; v=1.0`. Write criteria as **"contains `application/json`"**, never strict equality.
- FakeRestAPI does not persist; a read-back `GET` returns `404`. If you don't know whether the resource persists, **do not** write a read-back criterion — let the planner's live probe decide.

### Step 9 — Expected results

Show the expected response body as JSON, plus status and headers.

### Step 10 — Automation requirements (framework-specific, always include)

```markdown
## Automation Requirements

- Playwright `request` fixture; no browser.
- Every HTTP call must go through `callApi()` from `tests/support/api-evidence.ts`.
- Validation steps must be pure assertions over the returned `ApiSnapshot`.
- Minimum 5 meaningful assertions covering status, headers, structure, values and types.
```

### Step 11 — Self-review and hand off.

---

## 5. Copy-paste templates

### 5.1 UI user story template

```markdown
# TC001_<PascalCaseIntent> — <Human readable title>

| Field | Value |
|---|---|
| Story ID | US_<APP>_<FUNC>_001 |
| Story Type | UI |
| Application | <Application> |
| Functionality | <FunctionalityPath> |
| Environment | QA |
| Test Data Strategy | inline |
| Priority | High / Medium / Low |
| Author / Date | <name> / YYYY-MM-DD |

## User Story

As a <role>, I want <capability>, so that <business outcome>.

## Business Value

<1–2 lines: why this flow matters.>

## Preconditions

1. <App reachable at the URL below.>
2. <Account/state requirements.>
3. <Data that must already exist.>

## Acceptance Criteria

### Scenario 1: <happy path name>

**Given**
- <starting state>

**When**
- <user action 1>
- <user action 2>

**Then**
- <observable outcome 1>
- <observable outcome 2>
- No application error occurs during navigation.

## Test Data

- URL: <https://…>
- Username: <user>
- Password: <password or ENV_VAR_NAME>
- <Other business data: Product, Client, Amount…>

## Expected Result

- <Primary observable outcome — first line is machine-read by bootstrap-test-data.ts.>
- <Secondary outcomes.>

## UI-Specific Details

| Aspect | Detail |
|---|---|
| Entry route | <e.g. /login> |
| Navigation path | <Home → Products → Cart> |
| Dialogs / toasts | <e.g. none observed; removal is silent> |
| Conditional fields | <fields that appear based on selections> |
| Formats | <date format, currency, length limits> |
| Known risks | <captcha, slow load, flaky third-party widget> |

## Out of Scope

- <Negative cases carved out into their own stories — list the TC ids.>
```

### 5.2 API user story template

````markdown
# TC001_<Verb><Resource> — <Human readable title>

| Field | Value |
|---|---|
| Story ID | US_<APP>_<RESOURCE>_001 |
| Story Type | API |
| Application | <Application> |
| Functionality | <Resource> |
| Environment | QA |
| Test Data Strategy | inline |
| Priority | High / Medium / Low |
| Author / Date | <name> / YYYY-MM-DD |

## User Story

As an API consumer, I want to <operation> so that <verifiable outcome>.

## API Details

| Field | Value |
|---|---|
| Method | `POST` |
| Base URL | `https://…` |
| Endpoint | `/api/v1/…` |
| Full URL | `https://…/api/v1/…` |
| Authentication | Not required / Bearer token / API key |
| Content-Type | `application/json` |
| Accept | `application/json` |

## Preconditions

1. Network access to the base URL.
2. <Auth token available / no auth required.>
3. <Any resource that must exist first, with how to create it.>

## Request Headers

```text
Content-Type: application/json
Accept: application/json
```

## Request Body

```json
{ "field": "value" }
```

## Acceptance Criteria

1. The API returns HTTP status `<code>`.
2. The response `Content-Type` **contains** `application/json`.
3. The response contains the `<field>` field.
4. `<field>` is of type `<number|string|boolean|array|object>`.
5. `<field>` equals `<value>` / matches `<pattern>`.
6. The response body contains exactly the keys `[…]` (schema conformance).

## Expected Result

- Status: `<code> <reason>`
- Headers: `Content-Type: application/json…`
- Body:

```json
{ "id": 0, "field": "value" }
```

## Known API Behaviours / Constraints

- <e.g. Content-Type carries `charset=utf-8; v=1.0` suffixes — assert by containment.>
- <e.g. mock API; created resources are NOT persisted — no read-back step.>
- <e.g. server assigns `id`; assert type, not a literal.>

## Automation Requirements

- Playwright `request` fixture; no browser.
- Every HTTP call must go through `callApi()` from `tests/support/api-evidence.ts`.
- Validation steps must be pure assertions over the returned `ApiSnapshot`.
- Minimum 5 meaningful assertions covering status, headers, structure, values and types.

## Out of Scope

- <Negative/auth cases carved out into their own stories.>
````

---

## 6. Worked examples (story → plan → spec)

### 6.1 Complete UI example

**File:** `user-stories/SauceDemo/Checkout/TC001_CompleteCheckoutWithSingleProduct.md`

```markdown
# TC001_CompleteCheckoutWithSingleProduct — Complete checkout with a single product

| Field | Value |
|---|---|
| Story ID | US_SAUCEDEMO_CHECKOUT_001 |
| Story Type | UI |
| Application | SauceDemo |
| Functionality | Checkout |
| Environment | QA |
| Test Data Strategy | inline |
| Priority | High |
| Author / Date | QA Team / 2026-08-14 |

## User Story

As a customer, I want to check out a single product with my personal details,
so that my order is confirmed and I know the purchase went through.

## Business Value

Checkout is the revenue path. A break here stops all sales, so this flow is the
highest-priority regression candidate for every release.

## Preconditions

1. https://www.saucedemo.com/ is reachable from the test machine.
2. The `standard_user` account is active and not locked out.
3. The shopping cart is empty at session start (a fresh browser context per test guarantees this).

## Acceptance Criteria

### Scenario 1: Checkout one product successfully

**Given**
- The user is logged in as `standard_user` and is on the Products page.

**When**
- The user adds "Sauce Labs Backpack" to the cart.
- The user opens the shopping cart and proceeds to checkout.
- The user enters first name, last name and postal code, then continues.
- The user reviews the order summary and finishes the order.

**Then**
- The order confirmation page is displayed.
- A "Thank you for your order!" confirmation message is shown.
- The shopping cart badge is cleared.
- The item total reflects the price of the single product.
- No application error occurs during navigation.

## Test Data

- URL: https://www.saucedemo.com/
- Username: standard_user
- Password: secret_sauce
- Product: Sauce Labs Backpack
- First Name: John
- Last Name: Doe
- Postal Code: 12345

## Expected Result

- The order is placed and the confirmation message "Thank you for your order!" is displayed.
- The shopping cart badge is no longer present.
- The order summary shows exactly one line item for "Sauce Labs Backpack".

## UI-Specific Details

| Aspect | Detail |
|---|---|
| Entry route | `/` (login), then `/inventory.html` |
| Navigation path | Login → Products → Cart → Checkout Step One → Step Two → Complete |
| Dialogs / toasts | None expected; navigation is immediate |
| Conditional fields | None |
| Formats | Postal code is free text; prices render as `$29.99` |
| Known risks | The cart badge is REMOVED from the DOM when empty — it never renders "0". Assert absence, not text "0". |

## Out of Scope

- Checkout with an empty cart → `TC002_CheckoutWithEmptyCart.md`
- Missing mandatory information errors → `TC003_CheckoutWithMissingInformation.md`
```

**Resulting artifacts:**

```
user-stories/SauceDemo/Checkout/TC001_CompleteCheckoutWithSingleProduct.md
specs/SauceDemo/Checkout/TC001_CompleteCheckoutWithSingleProduct-test-plan.md
tests/SauceDemo/Checkout/TC001_CompleteCheckoutWithSingleProduct.spec.ts
final-reports/TC001_CompleteCheckoutWithSingleProduct-<timestamp>.html
```

**Shape of the generated spec** (mirrors the proven [SauceDemo AddToCart spec](tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts)):

```typescript
// spec: specs/SauceDemo/Checkout/TC001_CompleteCheckoutWithSingleProduct-test-plan.md
// story: user-stories/SauceDemo/Checkout/TC001_CompleteCheckoutWithSingleProduct.md
// Chrome-only execution (project: chromium, channel: chrome)

import { test, expect, type Locator, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// INLINE TEST DATA (TEST_DATA_STRATEGY=inline — no external files)
// ─────────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://www.saucedemo.com/';
const USERNAME = 'standard_user';
const PASSWORD = 'secret_sauce';
const PRODUCT_NAME = 'Sauce Labs Backpack';
const FIRST_NAME = 'John';
const LAST_NAME = 'Doe';
const POSTAL_CODE = '12345';
const EXPECTED_CONFIRMATION = 'Thank you for your order!';

// SauceDemo exposes `data-test`, while getByTestId() resolves `data-testid`.
const byTest = (scope: Page | Locator, id: string): Locator => scope.locator(`[data-test="${id}"]`);

test.describe('SauceDemo — Checkout', () => {
  test('SAUCEDEMO_CHECKOUT_TC001 - Complete checkout with a single product', async ({ page }) => {
    await test.step('Log in as the standard user and land on the Products page', async () => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await byTest(page, 'username').fill(USERNAME);
      await byTest(page, 'password').fill(PASSWORD);
      await byTest(page, 'login-button').click();
      await expect(page).toHaveURL(/inventory\.html/);
    });

    await test.step(`Add ${PRODUCT_NAME} to the shopping cart`, async () => {
      await byTest(page, 'add-to-cart-sauce-labs-backpack').click();
      await expect(byTest(page, 'shopping-cart-badge')).toHaveText('1');
    });

    await test.step('Open the cart and proceed to checkout', async () => {
      await byTest(page, 'shopping-cart-link').click();
      await byTest(page, 'checkout').click();
      await expect(page).toHaveURL(/checkout-step-one\.html/);
    });

    await test.step('Enter personal information and continue', async () => {
      await byTest(page, 'firstName').fill(FIRST_NAME);
      await byTest(page, 'lastName').fill(LAST_NAME);
      await byTest(page, 'postalCode').fill(POSTAL_CODE);
      await byTest(page, 'continue').click();
      await expect(page).toHaveURL(/checkout-step-two\.html/);
    });

    await test.step('Review the order summary and finish the order', async () => {
      await expect(byTest(page, 'inventory-item')).toHaveCount(1);
      await byTest(page, 'finish').click();
    });

    await test.step('Verify the order confirmation is displayed and the cart is cleared', async () => {
      await expect(page).toHaveURL(/checkout-complete\.html/);
      await expect(byTest(page, 'complete-header')).toHaveText(EXPECTED_CONFIRMATION);
      // The badge is removed from the DOM when empty — it never renders "0"
      await expect(byTest(page, 'shopping-cart-badge')).toHaveCount(0);
    });
  });

  test.afterEach(async ({ page }) => {
    await page.close();
  });
});
```

### 6.2 Complete API example

**File:** `user-stories/FakeRestAPI/Books/TC001_GetBookById.md`

````markdown
# TC001_GetBookById — Retrieve a book by ID

| Field | Value |
|---|---|
| Story ID | US_FAKERESTAPI_BOOKS_001 |
| Story Type | API |
| Application | FakeRestAPI |
| Functionality | Books |
| Environment | QA |
| Test Data Strategy | inline |
| Priority | High |
| Author / Date | QA Team / 2026-08-14 |

## User Story

As an API consumer, I want to retrieve a single book by its ID,
so that I can verify the API returns the correct book details with the expected schema.

## API Details

| Field | Value |
|---|---|
| Method | `GET` |
| Base URL | `https://fakerestapi.azurewebsites.net` |
| Endpoint | `/api/v1/Books/1` |
| Full URL | `https://fakerestapi.azurewebsites.net/api/v1/Books/1` |
| Authentication | Not required |
| Content-Type | n/a (no request body) |
| Accept | `application/json` |

## Preconditions

1. Network access to `https://fakerestapi.azurewebsites.net`.
2. No authentication required.
3. Book ID `1` exists in the mock data set.

## Request Headers

```text
Accept: application/json
```

## Request Body

None (GET request).

## Acceptance Criteria

1. The API returns HTTP status `200`.
2. The response `Content-Type` **contains** `application/json`.
3. The response body is a JSON object (not an array).
4. The response contains an `id` field whose value equals `1`.
5. `id` is of type `number` and is an integer.
6. The response contains a non-empty `title` of type `string`.
7. The response contains `pageCount` of type `number`.
8. The response contains `description`, `excerpt` and `publishDate` fields.
9. `publishDate` is a string parseable as a date.
10. The response contains exactly the keys `id`, `title`, `description`, `pageCount`, `excerpt`, `publishDate`.

## Expected Result

- Status: `200 OK`
- Headers: `Content-Type: application/json; charset=utf-8; v=1.0`
- Body shape:

```json
{
  "id": 1,
  "title": "Book 1",
  "description": "<string>",
  "pageCount": 100,
  "excerpt": "<string>",
  "publishDate": "<ISO-8601 date-time string>"
}
```

## Known API Behaviours / Constraints

- `Content-Type` carries `charset=utf-8; v=1.0` suffixes — assert by containment, never strict equality.
- `description` and `excerpt` are long generated strings; assert type and non-emptiness, not literal values.
- `publishDate` is generated relative to the current date; assert parseability, not a literal value.
- Responses are `Transfer-Encoding: chunked` — do not assert `Content-Length`.

## Automation Requirements

- Playwright `request` fixture; no browser.
- Every HTTP call must go through `callApi()` from `tests/support/api-evidence.ts`.
- Validation steps must be pure assertions over the returned `ApiSnapshot`.
- Minimum 5 meaningful assertions covering status, headers, structure, values and types.

## Out of Scope

- Non-existent ID handling → `TC002_GetBookByInvalidId.md`
- Create/update/delete → separate stories.
````

**Resulting artifacts:**

```
user-stories/FakeRestAPI/Books/TC001_GetBookById.md
specs/FakeRestAPI/Books/TC001_GetBookById-test-plan.md
tests/FakeRestAPI/Books/TC001_GetBookById.spec.ts
final-reports/TC001_GetBookById-<timestamp>.html
```

**Shape of the generated spec** (mirrors [tests/FakeRestAPI/User/create_user.spec.ts](tests/FakeRestAPI/User/create_user.spec.ts)):

```typescript
// File: tests/FakeRestAPI/Books/TC001_GetBookById.spec.ts
// spec: specs/FakeRestAPI/Books/TC001_GetBookById-test-plan.md
// story: user-stories/FakeRestAPI/Books/TC001_GetBookById.md
// TEST_DATA_STRATEGY=inline
//
// Follows the Execute → Capture → Validate contract:
//   PHASE 1+2  callApi() executes the request and captures all evidence
//   PHASE 3    every later step is a pure assertion over the returned snapshot

import { test, expect } from '@playwright/test';
import { callApi, type ApiSnapshot } from '../../support/api-evidence';

// ============================================================================
// TEST DATA CONSTANTS — all data embedded inline (no external files)
// ============================================================================
const BASE_URL = 'https://fakerestapi.azurewebsites.net';
const BOOKS_ENDPOINT = '/api/v1/Books';
const BOOK_ID = 1;
const EXPECTED_STATUS = 200;
const EXPECTED_CONTENT_TYPE = 'application/json';
const EXPECTED_RESPONSE_KEYS = ['id', 'title', 'description', 'pageCount', 'excerpt', 'publishDate'];

interface Book {
  id: number;
  title: string;
  description: string;
  pageCount: number;
  excerpt: string;
  publishDate: string;
}

test.describe('Retrieve a Book by ID', () => {
  let api: ApiSnapshot;
  let book: Book;

  test('FAKERESTAPI_BOOKS_TC001 - should retrieve book 1 with the expected schema', async ({ request }) => {
    // ── PHASE 1 + 2: EXECUTE AND CAPTURE ────────────────────────────────────
    await test.step('Send a GET request to retrieve the book by its ID', async () => {
      api = await callApi(request, {
        method: 'GET',
        url: `${BASE_URL}${BOOKS_ENDPOINT}/${BOOK_ID}`,
        headers: { Accept: 'application/json' },
        label: `Retrieve book ${BOOK_ID}`,
      });
    });

    // ── PHASE 3: VALIDATE (pure assertions over the captured snapshot) ───────
    await test.step('Verify the API responds with HTTP status 200 OK', async () => {
      expect(api.status).toBe(EXPECTED_STATUS);
      expect(api.ok).toBe(true);
    });

    await test.step('Verify the response Content-Type header is application/json', async () => {
      // Live value carries `; charset=utf-8; v=1.0`, so match by containment.
      expect(api.header('content-type')).toContain(EXPECTED_CONTENT_TYPE);
    });

    await test.step('Read and parse the book from the JSON response body', async () => {
      book = api.json<Book>();
      expect(typeof book).toBe('object');
      expect(Array.isArray(book)).toBe(false);
    });

    await test.step('Verify the returned id matches the requested book id', async () => {
      expect(typeof book.id).toBe('number');
      expect(Number.isInteger(book.id)).toBe(true);
      expect(book.id).toBe(BOOK_ID);
    });

    await test.step('Verify the title and pageCount fields carry the expected types', async () => {
      expect(typeof book.title).toBe('string');
      expect(book.title.length).toBeGreaterThan(0);
      expect(typeof book.pageCount).toBe('number');
    });

    await test.step('Verify publishDate is a parseable date string', async () => {
      expect(typeof book.publishDate).toBe('string');
      expect(Number.isNaN(Date.parse(book.publishDate))).toBe(false);
    });

    await test.step('Verify the response follows the expected book schema with no unexpected fields', async () => {
      expect(Object.keys(book).sort()).toEqual([...EXPECTED_RESPONSE_KEYS].sort());
    });
  });
});
```

### 6.3 What a good test plan looks like

You do not write the plan — the planner does — but you should review it. The two reference plans to hold it against:

- **API:** [specs/FakeRestAPI/User/create_user-test-plan.md](specs/FakeRestAPI/User/create_user-test-plan.md) — note the **Live Observations** table quoting real observed values, the acceptance-criteria **Coverage Summary**, and the explicit "Deviation from the story text" note.
- **UI:** [specs/SauceDemo/AddToCart/add_product_to_cart_and_remove-test-plan.md](specs/SauceDemo/AddToCart/add_product_to_cart_and_remove-test-plan.md) — note the per-page observation tables, the **Locator Strategy** table, and the warning that the cart badge is removed from the DOM rather than showing `0`.

**Reject a plan that has no Live Observations section.** Per [endToEndTestPrompt.md:372-395](endToEndTestPrompt.md#L372-L395), plans built from assumption instead of live exploration are not acceptable.

---

## 7. Folder Structure

### 7.1 What exists today, and what each folder is for

```
JHPlaywrightAgent-/
├── user-stories/{app}/{functionality}/{story}.md            # INPUT — human-authored source of truth
├── specs/{app}/{functionality}/{story}-test-plan.md          # Test plan (planner agent output)
├── tests/                                                    # Playwright testDir
│   ├── {app}/{functionality}/{story}.spec.ts                 #   automation (generator agent output)
│   ├── support/
│   │   ├── api-evidence.ts                                   #   callApi() + ApiSnapshot — API stories
│   │   └── excel-data.ts                                     #   getMergedTestData() + csvToList()
│   └── seed.spec.ts                                          #   seed referenced by the generator agent
├── reporters/final-html-reporter.cjs                         # Custom consolidated HTML reporter
├── final-reports/{story}-{timestamp}.html                    # Stakeholder-facing reports (output)
├── test-results/                                             # Playwright artifacts, healing logs, screenshots (gitignored)
├── playwright-report/                                        # Built-in HTML report (gitignored)
├── test-data/test-data.xlsx                                  # Excel data — ONLY for external strategy (gitignored, absent)
├── scripts/bootstrap-test-data.ts                            # Generates/updates the Excel workbook
├── sandbox/*.ts                                              # Local MCP client smoke scripts
├── .github/agents/*.agent.md                                 # planner / generator / healer agent definitions
├── .github/workflows/playwright.yml                          # CI
├── .vscode/mcp.json                                          # MCP server wiring for VS Code agent mode
├── docs/MCP_QUICK_START.md                                   # 10-minute MCP setup
├── endToEndTestPrompt.md                                     # THE pipeline specification
├── CommandToExecute.md                                       # Scratch pad of run commands
└── README.md                                                 # MCP setup + troubleshooting
```

### 7.2 Should UI and API stories be split into separate trees?

**No.** Three options were considered against the actual code:

| Option | Shape | Verdict |
|---|---|---|
| **A. Mirrored app/functionality (current)** | `user-stories/FakeRestAPI/User/TC001_CreateUser.md` | ✅ **Recommended.** Already enforced by [endToEndTestPrompt.md:280-296](endToEndTestPrompt.md#L280-L296); matches `derivePathMetadata()`; requires zero migration. |
| **B. Type-first split** | `user-stories/ui/...` / `user-stories/api/...` | ❌ Rejected. Adds a third path level that breaks Application/Functionality derivation, and a folder named `ui` trips `isApiTest()` for hybrid stories. |
| **C. Type suffix inside the functionality folder** | `FakeRestAPI/User/TC001_CreateUser_API.md` | ⚠️ Redundant. The metadata block plus the API Details table already declare the type; the suffix duplicates it and lengthens every report title. |

**How to distinguish UI from API without a folder split:**

1. The `Story Type` row in the metadata block (authoritative, machine-greppable).
2. The presence of an **API Details** table (API) vs a **UI-Specific Details** table (UI).
3. The fixture in the spec: `{ page }` vs `{ request }`.
4. The import: API specs import `callApi` from `tests/support/api-evidence`.
5. Where an application is mixed, use functionality folders that read naturally: `Alloy/alloyJourney` (API) and `Alloy/alloyUI` for the UI half — better than the current `TC001_AlloyUI.md` sitting inside the API folder.

### 7.3 Recommended structural improvements (small, safe, high value)

| # | Change | Why |
|---|---|---|
| 1 | Delete `user-stories/Amazon/Serach/` | Misspelled duplicate of `Search/` |
| 2 | Give `MagicBoxLegacy` a functionality level, e.g. `MagicBoxLegacy/PlacementWorkflow/` | Restores correct Functionality grouping in the report |
| 3 | Resolve the duplicate `TC003_*` Alloy stories | TC numbers must be unique per functionality folder |
| 4 | Add `user-stories/_TEMPLATE_UI.md` and `user-stories/_TEMPLATE_API.md` | Makes §5 templates one copy away; underscore keeps them sorted first |
| 5 | Add `/final-reports/` to `.gitignore` (keep one sample committed if the team wants a format reference) | 148 generated reports currently pollute `git status` |
| 6 | Rename `JSONPlaceholder/APITests` → `JSONPlaceholder/Posts` | Functionality should name the capability, not the test type |
| 7 | Either add `scripts/validate-test-data-strategy.ts` or drop the `validate:strategy` npm scripts; same for `pipeline` → `execution/` | Broken scripts mislead new joiners on day one |

Everything in this table is optional cleanup — **none of it changes the convention this guide teaches.**

---

## 8. Naming Conventions

### 8.1 Reference table

| Artifact | Convention | Example | Basis |
|---|---|---|---|
| **Application folder** | `PascalCase` product name | `SauceDemo`, `FakeRestAPI`, `MagicBox` | All 7 existing apps |
| **Functionality folder** | `PascalCase` capability, or existing `camelCase` where already established | `AddToCart`, `Checkout`, `User`, `alloyJourney` | Existing tree |
| **User story file** | `TC{NNN}_{PascalCaseIntent}.md` | `TC001_CompleteCheckoutWithSingleProduct.md` | Majority pattern (Alloy ×9, Amazon, MagicBoxLegacy) |
| **Test plan file** | `{story_name}-test-plan.md` — **identical** base name | `TC001_GetBookById-test-plan.md` | [endToEndTestPrompt.md:285](endToEndTestPrompt.md#L285) |
| **Spec file** | `{story_name}.spec.ts` — **identical** base name | `TC001_GetBookById.spec.ts` | [endToEndTestPrompt.md:286](endToEndTestPrompt.md#L286) |
| **Story ID (in metadata)** | `US_{APP}_{FUNCTIONALITY}_{NNN}` | `US_SAUCEDEMO_CHECKOUT_001` | Extends `US_AMZ_001` in [TC001_Amazon.md](user-stories/Amazon/Search/TC001_Amazon.md) |
| **Test case ID (in test title)** | `{APP}_{FUNCTIONALITY}_TC{NNN}` | `SAUCEDEMO_CHECKOUT_TC001` | [SauceDemo spec:43](tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts#L43) |
| **`test.describe()` title** | `{Application} — {Functionality}` or the plan's top-level item | `'SauceDemo — Checkout'`, `'Retrieve a Book by ID'` | Existing specs |
| **`test()` title** | `{TEST_CASE_ID} - {plain-English scenario}` | `'FAKERESTAPI_BOOKS_TC001 - should retrieve book 1…'` | SauceDemo spec |
| **`test.step()` title** | Plain-English user intent, **no locators** | `'Open the shopping cart'` | [endToEndTestPrompt.md:834-875](endToEndTestPrompt.md#L834-L875) (mandatory) |
| **Inline data constants** | `UPPER_SNAKE_CASE`, or one `TEST_DATA` object | `BASE_URL`, `EXPECTED_STATUS` | All inline specs |
| **Excel sheet (external)** | `{App}_{FunctionalityPath}`, ≤31 chars | `MagicBox_StartNewPlacement` | `deriveSheetName()` [:47-57](scripts/bootstrap-test-data.ts#L47-L57) |
| **Excel `TEST_ID`** | `{APP}_{FUNCTIONALITY}_TC{NNN}` | `ALLOY_ALLOYJOURNEY_TC001` | `defaultTestId()` [:89-96](scripts/bootstrap-test-data.ts#L89-L96), [README.md](README.md) |
| **Excel column names** | `UPPER_SNAKE_CASE` | `EXPECTED_SUCCESS_TEXT` | `excel-data.ts` upper-cases all keys |
| **Local spec helper** | `camelCase` | `byTest()` | SauceDemo spec |
| **TypeScript interface** | `PascalCase`, singular | `CreatedUser`, `Book`, `Post` | Existing API specs |
| **Report file** | `{story_name}-{YYYYMMDD_HHmmss}.html` (auto) | `TC001_GetBookById-20260814_131204.html` | Reporter [:427-431](reporters/final-html-reporter.cjs#L427-L431) |
| **Healing log** | `test-results/{story_name}-healing-log-{timestamp}.md` | — | [endToEndTestPrompt.md:309](endToEndTestPrompt.md#L309) |
| **Config files** | Keep the established root names | `playwright.config.ts`, `.env`, `.vscode/mcp.json` | Existing repo |

### 8.2 Two naming styles exist — pick the ID-prefixed one for new work

| Style | Files using it | Pros | Cons |
|---|---|---|---|
| **A. `TC{NNN}_{PascalCase}`** | Alloy ×9, `TC001_Amazon`, `TC001_CompleteContract…` | Stable traceable ID in the file name, sorts naturally, self-identifying report file names | Requires managing TC numbers per folder |
| **B. `lower_snake_case`** | `create_user`, `create_a_post`, `add_product_to_cart_and_remove`, `retrieve_post_by_id` | Reads as a sentence | No stable ID; report titles carry no ID; two stories can describe the same thing |

**Recommendation: Style A for all new stories.** It is the majority pattern, and because the reporter assigns `TC001…` *positionally* by execution order ([reporters/final-html-reporter.cjs:444](reporters/final-html-reporter.cjs#L444)), the file name is the **only** durable identifier a report can show.

**Do not rename existing passing artifacts opportunistically.** If you rename one layer you must rename all three in the same commit (story + plan + spec), or the pipeline's path enforcement breaks. Renaming is a deliberate task, not a drive-by edit.

### 8.3 Page objects and API clients

The framework has none today ([§1.5](#15-what-the-framework-deliberately-does-not-have)). **Do not introduce a POM as a side effect of one story.** If duplication ever justifies it, the conventions to adopt are:

| Would-be artifact | Convention | Location |
|---|---|---|
| Page object | `{Feature}Page` class in `{feature}-page.ts` | `tests/support/pages/` |
| Component object | `{Component}Component` | `tests/support/components/` |
| API client | `{Resource}Api` wrapping `callApi()` — never replacing it | `tests/support/api/` |
| Custom fixture | `test.extend()` in `tests/support/fixtures.ts` | `tests/support/` |

Any such addition is a framework change: raise it as its own task, not inside a story.

---

## 9. Workflow: User Story → Reporting

### 9.1 The chain

```
1. USER STORY        user-stories/{app}/{func}/TC001_Name.md          ← human (you)
        ↓
2. TEST SCENARIO     one happy-path scenario in the Acceptance Criteria
        ↓
3. TEST PLAN /       specs/{app}/{func}/TC001_Name-test-plan.md       ← playwright-test-planner
   TEST CASE         (live observations → steps → expected results → data)
        ↓
4. AUTOMATION        tests/{app}/{func}/TC001_Name.spec.ts            ← playwright-test-generator
        ↓
5. HEALING           re-run, fix locators/waits, log to test-results/ ← playwright-test-healer
        ↓
6. EXECUTION         npx playwright test <spec> --project=chromium
        ↓
7. REPORTING         final-reports/TC001_Name-{timestamp}.html        ← final-html-reporter.cjs
```

Mapped to the pipeline steps in [endToEndTestPrompt.md](endToEndTestPrompt.md): STEP 1 read story → STEP 2 plan (with live exploration) → STEP 2.5 data prep (skipped when `inline`) → STEP 3 generate → STEP 4 execute & heal → STEP 5 report.

### 9.2 Where UI and API diverge

| Stage | UI story | API story |
|---|---|---|
| Exploration (STEP 2) | Launch Chrome, navigate every page in the acceptance criteria, record exact labels/roles/URLs/validation messages ([:399-466](endToEndTestPrompt.md#L399-L466)) | **No browser.** Issue the real request(s) with curl or a scratch Playwright call; record actual status line, headers, body ([:374-393](endToEndTestPrompt.md#L374-L393)) |
| Plan content | Observation tables per page + Locator Strategy table | Observations table of actual status/headers/body + Coverage Summary |
| Fixture | `page` | `request` |
| Evidence | Screenshots on failure, trace retained on failure (config) | `callApi()` attaches request/response evidence on **every** call |
| Assertions | Web-first (`toBeVisible`, `toHaveText`, `toHaveURL`, `toHaveCount`) | Pure snapshot assertions (`api.status`, `api.header()`, `api.json<T>()`) |
| Healing | Locator/selector/wait healing | Locator healing N/A — heal transport and contract drift (status, content-type, schema) |
| Cleanup | `test.afterEach(() => page.close())` | Nothing to close |

### 9.3 Commands

```powershell
# One story (recommended — yields a story-named report)
npx playwright test tests/FakeRestAPI/Books/TC001_GetBookById.spec.ts --project=chromium

# One functionality folder
npx playwright test tests/SauceDemo/Checkout --project=chromium

# Whole suite, Chrome only
npm run test:chrome

# Open the built-in HTML report
npm run report

# Excel workbook (only when TEST_DATA_STRATEGY=external)
npm run testdata:bootstrap -- --app SauceDemo --functionality Checkout --story TC001_CompleteCheckoutWithSingleProduct
```

Optional env vars: `TEST_ENV=QA` (report header), `STORY_NAME=<name>` (report file name when running multiple specs), `TEST_DATA_STRATEGY`, `TEST_DATA_SOURCE`.

### 9.4 Framework-specific best practices (non-negotiable in generated specs)

1. **Wrap everything in `test.step()`** with plain-English titles — mandatory ([endToEndTestPrompt.md:834-875](endToEndTestPrompt.md#L834-L875)). Step titles become the report's step table, so a stakeholder must understand a failure from the title alone. Never use locator text as a step title.
2. **API: every call through `callApi()`.** No `request.get/post/...` in a spec, no `test.info().attach()` in a spec, no `response.text()/json()` in a spec — use `snapshot.json<T>()` and `snapshot.header()`. Self-check before finishing: grep the spec for `attach(` and `request.`; either hit means the contract is violated ([:830-832](endToEndTestPrompt.md#L830-L832)).
3. **Respect the locator priority order** from the generator agent: `getByTestId` → stable `#id` → `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → CSS. **XPath is forbidden** unless documented as unavoidable. No `.nth()` to hide ambiguity.
4. **No static waits.** Rely on auto-waiting, `waitForURL`, and web-first assertions. Never `waitForLoadState('networkidle')` — the healer agent is explicitly told never to use it.
5. **Assert business outcomes, not page furniture.** "Prefer fewer high-value assertions over many low-value assertions" ([generator agent:114-131](.github/agents/playwright-test-generator.agent.md#L114-L131)).
6. **Chrome only** — `--project=chromium` with `channel: 'chrome'`. Never add browser projects for a story.
7. **Close the browser** after each UI test (`test.afterEach`).
8. **Inline data lives at the top of the file**, `UPPER_SNAKE_CASE`, grouped and commented. In `external` mode, **nothing** business-related may be hardcoded in steps or assertions.
9. **Keep the back-link header comments** (`// spec:`, `// story:`) — they are the only machine-free trace back up the chain.
10. **Assert only what was actually observed.** For mock or generated values, assert type and shape rather than a literal that only holds today.

---

## 10. Checklists

### 10.1 Definition of Ready (for a user story)

- [ ] File is at `user-stories/{app}/{functionality}/TC{NNN}_{Name}.md`, TC number unique in that folder
- [ ] Metadata block complete, `Story Type` = UI / API / Hybrid
- [ ] `As a … I want … so that …` present and unambiguous
- [ ] Preconditions listed, including data that must pre-exist
- [ ] **Exactly one** happy-path scenario; extra scenarios split into their own stories and listed under Out of Scope
- [ ] Acceptance criteria are observable and contain **no locators/selectors**
- [ ] Test data complete, using `- URL:` / `- Username:` / `- Password:` bullets; no production secrets
- [ ] `## Expected Result` section present, first line = the primary outcome
- [ ] **UI:** UI-Specific Details table filled (entry route, navigation path, dialogs, formats, risks)
- [ ] **API:** API Details table, request headers, request body, ≥5 assertion-style criteria across status/headers/existence/values/types/schema
- [ ] **API:** Known API Behaviours noted (content-type suffixes, persistence, server-assigned fields)
- [ ] **API:** Automation Requirements section names `callApi()`
- [ ] Data strategy stated (`inline` unless there is a reason)

### 10.2 Definition of Done (for the automation)

- [ ] All three artifacts exist at mirrored paths with identical base names
- [ ] Plan contains a **Live Observations** section quoting actual observed values
- [ ] Plan contains a Coverage Summary mapping every acceptance criterion to a step
- [ ] Spec has the `// spec:` / `// story:` header comments
- [ ] Every action and assertion is inside a `test.step()` with a plain-English title
- [ ] **API:** zero occurrences of `request.` and `attach(` in the spec; all calls via `callApi()`
- [ ] **UI:** locators follow the priority order; no XPath; no static waits; page closed in `afterEach`
- [ ] Spec passes on `--project=chromium` (or remaining failures are documented as product defects/blockers)
- [ ] Healing log written to `test-results/{story}-healing-log-{timestamp}.md`
- [ ] `final-reports/{story}-{timestamp}.html` generated and reviewed
- [ ] No unrelated files touched (especially no Excel changes outside the story's scope — see [endToEndTestPrompt.md:169-187](endToEndTestPrompt.md#L169-L187))

---

## 11. Do's and Don'ts

### Do's

| # | Do |
|---|---|
| 1 | Mirror the path in all three roots: `user-stories/` → `specs/` → `tests/`, identical base name |
| 2 | Keep exactly two levels: `{application}/{functionality_path}` |
| 3 | Name stories `TC{NNN}_{PascalCaseIntent}.md`, unique TC per functionality folder |
| 4 | Declare `Story Type` (UI / API / Hybrid) in the metadata block |
| 5 | Write **one** happy path per story; split negatives into their own stories |
| 6 | Write acceptance criteria as observable outcomes in Given/When/Then (UI) or numbered assertions (API) |
| 7 | Give the exact API method, full URL, headers, and payload for API stories |
| 8 | Demand assertions across status, headers, field existence, values, types and schema |
| 9 | Assert `Content-Type` by **containment** (`application/json`) |
| 10 | Use the machine-readable data bullets (`- URL:`, `- Username:`, `- Password:`) and the `## Expected Result` heading |
| 11 | Route every API call through `callApi()` and validate only the `ApiSnapshot` |
| 12 | Keep inline test data at the top of the spec in `UPPER_SNAKE_CASE` |
| 13 | Write `test.step()` titles a non-technical stakeholder can read |
| 14 | Note known behaviours that shape assertions (badge removed from DOM; mock API doesn't persist; content-type suffixes) |
| 15 | Run one story at a time so the report is story-named |
| 16 | Review the plan's Live Observations before accepting the automation |
| 17 | Use dedicated test accounts; reference secret **names**, not values |

### Don'ts

| # | Don't | Why |
|---|---|---|
| 1 | Don't invent an alternate folder shape (`specs/{story}-test-plan.md`, story-name-as-folder, flat app folders) | Explicitly forbidden — [endToEndTestPrompt.md:288-294](endToEndTestPrompt.md#L288-L294) |
| 2 | Don't split into `ui/` and `api/` trees | Breaks Application/Functionality derivation; `ui` in a path trips `isApiTest()` |
| 3 | Don't name an API folder/file `ui`, `page` or `visual` | The report drops its API request/response panel |
| 4 | Don't put locators, CSS or XPath in a user story | Guessed selectors mislead the planner, whose job is to observe the real ones |
| 5 | Don't pack multiple scenarios into one story | Only the happy path gets automated — the rest silently disappears |
| 6 | Don't call `request.get/post/...` directly in a spec | Bypasses evidence capture; the failing run is the one that loses its evidence |
| 7 | Don't call `test.info().attach()` or `response.text()/json()` in a spec | `callApi()` owns capture; use `snapshot.json<T>()` |
| 8 | Don't place `attach()` after an assertion | A failing `expect()` throws — everything after it is dead code |
| 9 | Don't assert strict equality on `Content-Type` | Live values carry `; charset=utf-8; v=1.0` |
| 10 | Don't assert literal values that only hold for a mock | Assert type and shape instead |
| 11 | Don't add a read-back `GET` unless persistence is proven | FakeRestAPI returns `404` on read-back |
| 12 | Don't hardcode business data in steps when `TEST_DATA_STRATEGY=external` | Violates the data-separation rule |
| 13 | Don't touch Excel sheets/rows outside the current story's scope | Scope lock — [endToEndTestPrompt.md:169-187](endToEndTestPrompt.md#L169-L187) |
| 14 | Don't use `waitForTimeout` or `networkidle` | Static waits and discouraged APIs are banned |
| 15 | Don't use XPath, `.nth()`, long CSS chains, or auto-generated class names | Locator policy — [generator agent:56-72](.github/agents/playwright-test-generator.agent.md#L56-L72) |
| 16 | Don't add browser projects (Firefox/WebKit/Edge) | Chrome-only policy |
| 17 | Don't build a POM/API-client layer as a side effect of one story | Framework change; raise it separately |
| 18 | Don't rename one layer without the other two in the same commit | Path enforcement breaks |
| 19 | Don't commit real production credentials or customer data | Use test accounts and env var names |
| 20 | Don't copy the legacy Alloy API specs as your model | They predate the evidence contract |

---

## 12. Final Recommendation

**Keep the framework's existing conventions and standardise the *content* of user stories.** The structural conventions here — mirrored three-layer paths, two-level `{application}/{functionality}`, Chrome-only, `callApi()`, mandatory `test.step()` — are already correct, already enforced by [endToEndTestPrompt.md](endToEndTestPrompt.md), and already consumed by [reporters/final-html-reporter.cjs](reporters/final-html-reporter.cjs). The real gap is that **half the existing user stories are raw step dumps with no acceptance criteria**, which is why plan and spec quality varies so much across the tree.

So, for the team, in priority order:

1. **Adopt the two templates in [§5](#5-copy-paste-templates)** as the only accepted story format; add them as `user-stories/_TEMPLATE_UI.md` and `user-stories/_TEMPLATE_API.md`.
2. **Adopt `TC{NNN}_{PascalCaseIntent}` naming for new stories** (majority pattern + the only durable ID a report can display). Leave existing names alone unless you rename all three layers together.
3. **Enforce the Definition of Ready in [§10.1](#101-definition-of-ready-for-a-user-story) at story review** — before any pipeline run. A story that fails the checklist wastes a full plan-generate-heal cycle.
4. **Keep `TEST_DATA_STRATEGY=inline` as the default.** It is the strategy that actually works today (`test-data/` is gitignored and absent). Move to `external` only for genuinely shared data sets, and run `npm run testdata:bootstrap` first.
5. **Treat `callApi()` as mandatory for every new API story**, and migrate the 9 legacy Alloy specs opportunistically — each one currently loses its evidence on exactly the runs that fail.
6. **Reject any plan without a Live Observations section.** That section is the difference between the two reference plans and the weak ones.
7. **Work through the cleanup table in [§7.3](#73-recommended-structural-improvements-small-safe-high-value)** as background hygiene: the `Serach` typo, the flat `MagicBoxLegacy`, the duplicate `TC003`, `final-reports/` in `.gitignore`, and the two broken npm scripts.

### Approach comparisons, summarised

| Decision | Options | Recommendation |
|---|---|---|
| Folder structure | Mirrored app/functionality · type-first `ui/`+`api/` · type-suffixed names | **Mirrored (current)** — enforced, reporter-compatible, zero migration |
| Story naming | `TC{NNN}_{PascalCase}` · `lower_snake_case` | **`TC{NNN}_{PascalCase}`** — majority, sortable, the only stable ID |
| Data strategy | `inline` · `external` (Excel) | **`inline`** by default; `external` only for shared data sets |
| API call style | `callApi()` · raw `request.*` | **`callApi()`** — evidence survives failures, which is the whole point |
| Scenarios per story | One happy path · many scenarios | **One** — the pipeline generates one positive case per plan |
| Abstraction | Inline locators (current) · POM | **Inline** until duplication proves otherwise; POM is a separate framework task |

---

## Appendix A — Quick reference card

```
NEW STORY IN 8 LINES
1. Decide type:        UI (page) | API (request) | Hybrid
2. Pick the folder:    user-stories/{Application}/{Functionality}/
3. Name the file:      TC{NNN}_{PascalCaseIntent}.md   (unique TC in that folder)
4. Fill the template:  §5.1 (UI) or §5.2 (API)
5. One happy path.     Split everything else into its own TC.
6. Check §10.1 Definition of Ready.
7. Run the pipeline:   endToEndTestPrompt.md STEP 1 → STEP 5
8. Verify:             plan has Live Observations; spec has test.step() everywhere;
                       API spec has zero `request.` and zero `attach(`.
```

## Appendix B — File map for this guide's claims

| Claim | Source |
|---|---|
| Mirrored folder enforcement, forbidden shapes | [endToEndTestPrompt.md:280-296](endToEndTestPrompt.md#L280-L296) |
| Story-type gate, per-step behaviour | [endToEndTestPrompt.md:253-278](endToEndTestPrompt.md#L253-L278) |
| Live exploration mandate (UI) / live probe (API) | [endToEndTestPrompt.md:372-466](endToEndTestPrompt.md#L372-L466) |
| One positive test case per plan | [endToEndTestPrompt.md:468-478](endToEndTestPrompt.md#L468-L478) |
| API evidence contract, forbidden patterns, self-check | [endToEndTestPrompt.md:732-832](endToEndTestPrompt.md#L732-L832) |
| `test.step()` mandate | [endToEndTestPrompt.md:834-875](endToEndTestPrompt.md#L834-L875) |
| Report format requirements | [endToEndTestPrompt.md:910-994](endToEndTestPrompt.md#L910-L994) |
| `callApi()` / `ApiSnapshot` | [tests/support/api-evidence.ts:68-165](tests/support/api-evidence.ts#L68-L165) |
| `getMergedTestData()` / `csvToList()` | [tests/support/excel-data.ts:83-142](tests/support/excel-data.ts#L83-L142) |
| Application/Functionality derived from path | [reporters/final-html-reporter.cjs:76-97](reporters/final-html-reporter.cjs#L76-L97) |
| API panel gating (`ui`/`page`/`visual` exclusion) | [reporters/final-html-reporter.cjs:112-119](reporters/final-html-reporter.cjs#L112-L119) |
| Report naming, positional TC IDs | [reporters/final-html-reporter.cjs:408-456](reporters/final-html-reporter.cjs#L408-L456) |
| Chrome-only project, timeouts, trace/screenshot | [playwright.config.ts:38-95](playwright.config.ts#L38-L95) |
| Data strategy defaults | [playwright.config.ts:19](playwright.config.ts#L19), [:33](playwright.config.ts#L33) |
| Excel sheet/TEST_ID derivation, story scraping | [scripts/bootstrap-test-data.ts:47-163](scripts/bootstrap-test-data.ts#L47-L163) |
| Locator priority, assertion filtering | [.github/agents/playwright-test-generator.agent.md:44-131](.github/agents/playwright-test-generator.agent.md#L44-L131) |
| Healing workflow, `test.fixme()` fallback | [.github/agents/playwright-test-healer.agent.md:32-64](.github/agents/playwright-test-healer.agent.md#L32-L64) |
| Reference API plan (Live Observations) | [specs/FakeRestAPI/User/create_user-test-plan.md](specs/FakeRestAPI/User/create_user-test-plan.md) |
| Reference UI plan (Locator Strategy) | [specs/SauceDemo/AddToCart/add_product_to_cart_and_remove-test-plan.md](specs/SauceDemo/AddToCart/add_product_to_cart_and_remove-test-plan.md) |
| Reference API spec | [tests/FakeRestAPI/User/create_user.spec.ts](tests/FakeRestAPI/User/create_user.spec.ts) |
| Reference UI spec | [tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts](tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts) |
