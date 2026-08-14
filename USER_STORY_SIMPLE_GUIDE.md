# User Story Guide — The Simple Version

For anyone writing a user story that will be automated by this framework.
No framework knowledge needed. Read this once, then copy a template.

> Want the deep version (framework internals, reporter behaviour, code contracts)?
> See [USER_STORY_AUTHORING_GUIDE.md](USER_STORY_AUTHORING_GUIDE.md).

---

## 1. What a user story is here

A user story is a **markdown file you write by hand**. It is the input to an automation pipeline.

You write the story. The pipeline then does the rest, automatically:

```
YOU WRITE                    THE PIPELINE PRODUCES
─────────                    ─────────────────────
user story  ────────────►    test plan  ────►  test script  ────►  HTML report
(.md file)                   (.md file)        (.spec.ts)          (final-reports/)
```

**The only thing you control is the story.** If the story is vague, everything downstream is vague.
There is no "the automation engineer will figure it out" step — so write the story as if the reader knows nothing about the application.

---

## 2. The 4 rules that matter most

### Rule 1 — One story = one happy path

The pipeline generates **one positive test case per story**. That's it.

❌ **Wrong** — one story with 5 scenarios (only the first gets automated, the rest silently vanish):
```
TC001_Login.md
  Scenario 1: valid login
  Scenario 2: wrong password
  Scenario 3: locked account
  Scenario 4: empty fields
```

✅ **Right** — one story per scenario:
```
TC001_LoginWithValidCredentials.md
TC002_LoginWithWrongPassword.md
TC003_LoginWithLockedAccount.md
TC004_LoginWithEmptyFields.md
```

Many *checks* inside one story are fine and encouraged. Many *scenarios* are not.

### Rule 2 — Your file goes in exactly this place

```
user-stories/<Application>/<Feature>/TC001_WhatItDoes.md
```

Three parts, always:

| Part | Meaning | Examples |
|---|---|---|
| `<Application>` | The product | `SauceDemo`, `Amazon`, `FakeRestAPI`, `MagicBox` |
| `<Feature>` | The area of that product | `Checkout`, `AddToCart`, `Search`, `User` |
| `TC001_WhatItDoes.md` | Your story | `TC001_CompleteCheckout.md` |

Real examples already in the repo:
```
user-stories/SauceDemo/AddToCart/add_product_to_cart_and_remove.md
user-stories/FakeRestAPI/User/create_user.md
user-stories/Amazon/Search/TC001_Amazon.md
```

**Naming:** `TC` + 3 digits + `_` + a name in PascalCase. Check the folder first — **no two stories in the same folder may share a TC number.**

### Rule 3 — Say whether it's UI or API

This is the first thing the pipeline needs to know, because the two paths are completely different.

| | **UI story** | **API story** |
|---|---|---|
| It's about | Screens, clicks, forms, logins | HTTP requests and responses |
| You provide | A URL and what the user does | A method, endpoint, payload |
| The pipeline will | Open Chrome and explore the app | Call the endpoint directly (no browser) |

If your story does both, say **Hybrid** and cover both sections.

### Rule 4 — Describe *what the user sees*, never *how to find it*

The pipeline explores the live application itself and discovers the real buttons and fields. Your guesses actively mislead it.

❌ **Don't write:**
```
Click the button with CSS selector .btn-primary#submit-order
Fill input[name="firstName"]
```

✅ **Do write:**
```
The user clicks the "Continue" button.
The user enters their first name.
```

Same for outcomes — describe what's visible, not what's in the code:

❌ `The orderComplete flag is set to true`
✅ `The message "Thank you for your order!" is displayed`

---

## 3. What goes in every story

Nine sections. Skip none of them.

| # | Section | What to write | Why it matters |
|---|---|---|---|
| 1 | **Title** | `TC001_CompleteCheckout — Complete checkout with one product` | Becomes the report title |
| 2 | **Info table** | Story ID, type (UI/API), application, feature, environment, priority | Lets anyone route the story without reading it |
| 3 | **User story** | `As a <role>, I want <goal>, so that <benefit>.` | The purpose in one sentence |
| 4 | **Business value** | 1–2 lines: why this matters | Helps prioritise |
| 5 | **Preconditions** | What must be true before step 1 | Otherwise the test starts in the wrong state |
| 6 | **Acceptance criteria** | Given / When / Then (UI) or a numbered check list (API) | This becomes the test steps |
| 7 | **Test data** | URL, username, password, and any business values | The test cannot run without real values |
| 8 | **Expected result** | The observable outcome | This becomes the pass/fail decision |
| 9 | **Specific details** | UI: navigation, formats, quirks · API: method, endpoint, payload | Everything that stops the pipeline guessing |

### Two formatting details that are not optional

**A. Test data must use these exact bullet labels** — a script reads them automatically:

```markdown
## Test Data

- URL: https://www.saucedemo.com/
- Username: standard_user
- Password: secret_sauce
- Product: Sauce Labs Backpack
```

**B. The heading must be exactly `## Expected Result`** (singular). The same script reads the first line under it.

> 🔒 **Never put real production or customer passwords in a story file.** Use test accounts. For a real secret, write the variable name (`UI_PASSWORD_ENC`), not the value.

---

## 4. UI story template — copy this

```markdown
# TC001_<WhatItDoes> — <Plain English title>

| Field | Value |
|---|---|
| Story ID | US_<APP>_<FEATURE>_001 |
| Story Type | UI |
| Application | <Application> |
| Feature | <Feature> |
| Environment | QA |
| Priority | High |
| Author / Date | <your name> / YYYY-MM-DD |

## User Story

As a <role>, I want <goal>, so that <benefit>.

## Business Value

<Why this flow matters in 1–2 lines.>

## Preconditions

1. <The application is reachable at the URL below.>
2. <The test account exists and is not locked.>
3. <Any data that must already exist.>

## Acceptance Criteria

### Scenario 1: <name of the happy path>

**Given**
- <the starting state>

**When**
- <what the user does, step by step>
- <one action per line>

**Then**
- <what the user should see>
- <another visible outcome>
- No error occurs during navigation.

## Test Data

- URL: <https://...>
- Username: <user>
- Password: <password>
- <Any other business values: Product, Amount, Name...>

## Expected Result

- <The main outcome — put the most important one first.>
- <Other outcomes.>

## UI Details

| Aspect | Detail |
|---|---|
| Starting page | <e.g. the login page> |
| Navigation path | <Login → Products → Cart → Checkout> |
| Popups / messages | <e.g. none; or "a confirmation dialog appears"> |
| Formats | <date format, currency, character limits> |
| Known quirks | <anything odd you already know about this screen> |

## Out of Scope

- <Other scenarios, each with the TC number you gave it.>
```

---

## 5. API story template — copy this

````markdown
# TC001_<VerbResource> — <Plain English title>

| Field | Value |
|---|---|
| Story ID | US_<APP>_<RESOURCE>_001 |
| Story Type | API |
| Application | <Application> |
| Feature | <Resource, e.g. User, Books> |
| Environment | QA |
| Priority | High |
| Author / Date | <your name> / YYYY-MM-DD |

## User Story

As an API consumer, I want to <operation>, so that <what it proves>.

## API Details

| Field | Value |
|---|---|
| Method | `GET` / `POST` / `PUT` / `PATCH` / `DELETE` |
| Base URL | `https://...` |
| Endpoint | `/api/v1/...` |
| Full URL | `https://.../api/v1/...` |
| Authentication | Not required / Bearer token / API key |
| Content-Type | `application/json` |
| Accept | `application/json` |

## Preconditions

1. Network access to the base URL.
2. <Auth token available, or "no auth required".>
3. <Any record that must already exist.>

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
4. `<field>` is of type `<number / string / boolean / array>`.
5. `<field>` equals `<value>`.
6. The response contains exactly these keys: `[...]`.

## Expected Result

- Status: `<code>`
- Body:

```json
{ "id": 1, "field": "value" }
```

## Things I Already Know About This API

- <e.g. the id is generated by the server, so don't check for a fixed value.>
- <e.g. this is a mock API and does not save records.>

## Out of Scope

- <Other scenarios, each with the TC number you gave it.>
````

---

## 6. Writing good API acceptance criteria

For an API story, the acceptance criteria **are** the checks. Cover all six of these, not just the status code:

| Check | Example |
|---|---|
| 1. Status code | The API returns `200` |
| 2. Headers | `Content-Type` contains `application/json` |
| 3. Field exists | The response contains `id` |
| 4. Field value | `userName` equals `testuser` |
| 5. Data type | `id` is a number; `title` is a string |
| 6. Shape | The response has exactly the keys `id`, `userName`, `password` |

**Aim for at least 5 checks.** A story that only checks the status code proves almost nothing.

### Three traps that have already caused problems here

| Trap | What to write instead |
|---|---|
| Content-Type is rarely exactly `application/json` — real responses look like `application/json; charset=utf-8; v=1.0` | "`Content-Type` **contains** `application/json`" |
| Some test APIs don't actually save anything — reading the record back returns 404 | Don't add a "then read it back" check unless you know it persists |
| Some values are generated by the server or change daily (ids, dates) | Check the **type**, not a fixed value: "`id` is a number" |

If you don't know which of these applies, **say so in the story**. Writing "I'm not sure whether this API persists records" is far more useful than guessing.

---

## 7. Two complete examples

### 7.1 UI example

**File:** `user-stories/SauceDemo/Checkout/TC001_CompleteCheckout.md`

```markdown
# TC001_CompleteCheckout — Complete checkout with a single product

| Field | Value |
|---|---|
| Story ID | US_SAUCEDEMO_CHECKOUT_001 |
| Story Type | UI |
| Application | SauceDemo |
| Feature | Checkout |
| Environment | QA |
| Priority | High |
| Author / Date | QA Team / 2026-08-14 |

## User Story

As a customer, I want to check out a single product with my personal details,
so that my order is confirmed and I know the purchase went through.

## Business Value

Checkout is the revenue path. If it breaks, no one can buy anything,
so this is the highest-priority check for every release.

## Preconditions

1. https://www.saucedemo.com/ is reachable.
2. The `standard_user` account is active and not locked.
3. The shopping cart is empty when the test starts.

## Acceptance Criteria

### Scenario 1: Check out one product successfully

**Given**
- The user is logged in and on the Products page.

**When**
- The user adds "Sauce Labs Backpack" to the cart.
- The user opens the cart and clicks Checkout.
- The user enters first name, last name and postal code, then continues.
- The user reviews the order and finishes it.

**Then**
- The order confirmation page is displayed.
- The message "Thank you for your order!" is shown.
- The cart icon no longer shows an item count.
- No error occurs during navigation.

## Test Data

- URL: https://www.saucedemo.com/
- Username: standard_user
- Password: secret_sauce
- Product: Sauce Labs Backpack
- First Name: John
- Last Name: Doe
- Postal Code: 12345

## Expected Result

- The order is placed and "Thank you for your order!" is displayed.
- The cart count badge is gone.
- The order summary lists exactly one product.

## UI Details

| Aspect | Detail |
|---|---|
| Starting page | The login page at `/` |
| Navigation path | Login → Products → Cart → Checkout (2 pages) → Complete |
| Popups / messages | None — each click goes straight to the next page |
| Formats | Prices display like `$29.99`; postal code is free text |
| Known quirks | When the cart is empty the count badge disappears completely — it never shows "0" |

## Out of Scope

- Checking out with an empty cart → TC002_CheckoutWithEmptyCart.md
- Missing required fields → TC003_CheckoutWithMissingInformation.md
```

### 7.2 API example

**File:** `user-stories/FakeRestAPI/Books/TC001_GetBookById.md`

````markdown
# TC001_GetBookById — Retrieve a book by its ID

| Field | Value |
|---|---|
| Story ID | US_FAKERESTAPI_BOOKS_001 |
| Story Type | API |
| Application | FakeRestAPI |
| Feature | Books |
| Environment | QA |
| Priority | High |
| Author / Date | QA Team / 2026-08-14 |

## User Story

As an API consumer, I want to retrieve a single book by its ID,
so that I can confirm the API returns the correct book with the expected structure.

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
2. No authentication needed.
3. Book ID 1 exists.

## Request Headers

```text
Accept: application/json
```

## Request Body

None — this is a GET request.

## Acceptance Criteria

1. The API returns HTTP status `200`.
2. The response `Content-Type` **contains** `application/json`.
3. The response is a single object, not a list.
4. The response contains `id`, and `id` equals `1`.
5. `id` is a number.
6. The response contains a non-empty `title`, and `title` is a string.
7. The response contains `pageCount`, and `pageCount` is a number.
8. The response contains `description`, `excerpt` and `publishDate`.
9. `publishDate` is a valid date string.
10. The response contains exactly these keys: `id`, `title`, `description`, `pageCount`, `excerpt`, `publishDate`.

## Expected Result

- Status: `200 OK`
- Body looks like:

```json
{
  "id": 1,
  "title": "Book 1",
  "description": "<some text>",
  "pageCount": 100,
  "excerpt": "<some text>",
  "publishDate": "<a date>"
}
```

## Things I Already Know About This API

- Content-Type comes back as `application/json; charset=utf-8; v=1.0` — check that it *contains* `application/json`.
- `description` and `excerpt` are long generated strings — check the type, not the text.
- `publishDate` changes based on today's date — check it's a valid date, not a fixed value.

## Out of Scope

- Requesting an ID that doesn't exist → TC002_GetBookByInvalidId.md
- Creating, updating or deleting books → separate stories.
````

---

## 8. What happens after you save the story

You hand the story path to the pipeline, and three files appear alongside it:

```
user-stories/FakeRestAPI/Books/TC001_GetBookById.md            ← you wrote this
specs/FakeRestAPI/Books/TC001_GetBookById-test-plan.md         ← test plan (auto)
tests/FakeRestAPI/Books/TC001_GetBookById.spec.ts              ← test script (auto)
final-reports/TC001_GetBookById-20260814_131204.html           ← report (auto)
```

Notice the **same folder path and same file name** repeat in all four places. That's the framework's core habit.

To run your story once it's automated:

```powershell
npx playwright test tests/FakeRestAPI/Books/TC001_GetBookById.spec.ts --project=chromium
```

Then open the newest file in `final-reports/`.

### One thing to check in the generated test plan

Before accepting the automation, open the test plan and look for a **"Live Observations"** section — a table of what was actually seen in the real application or the real API response.

If it isn't there, the plan was written from assumption instead of reality. **Send it back.**

---

## 9. Before you hand over — quick checklist

- [ ] File is at `user-stories/<Application>/<Feature>/TC###_Name.md`
- [ ] The TC number isn't already used in that folder
- [ ] `Story Type` says UI, API or Hybrid
- [ ] One happy path only — other scenarios listed under **Out of Scope** with their own TC numbers
- [ ] `As a… I want… so that…` is there and makes sense
- [ ] Preconditions listed
- [ ] Acceptance criteria describe **what the user sees**, with no selectors or CSS
- [ ] Test data uses `- URL:` / `- Username:` / `- Password:` bullets
- [ ] No real production passwords
- [ ] Heading is exactly `## Expected Result`
- [ ] **UI:** the UI Details table is filled in
- [ ] **API:** method, full URL, headers and body are all given
- [ ] **API:** at least 5 checks, covering status, headers, fields, values, types and shape
- [ ] Anything you're unsure about is written down as an open question rather than guessed

---

## 10. Do's and Don'ts at a glance

| ✅ Do | ❌ Don't |
|---|---|
| One happy path per story | Pack 5 scenarios into one story |
| Describe what the user sees | Put CSS, XPath or selectors in the story |
| Give real, working test data | Leave placeholders like `<username>` unfilled |
| Give the exact API payload | Describe the payload in prose |
| Say "Content-Type **contains** application/json" | Demand an exact Content-Type match |
| Check types when values are generated | Assert a fixed id or date that changes |
| Write down what you're unsure of | Guess and let the pipeline inherit the guess |
| Use `TC###_PascalCaseName.md` | Invent a new naming style |
| Keep the folder shape `App/Feature/story.md` | Create extra folder levels |
| Use test accounts | Commit production or customer credentials |

---

## 11. Where to look when you're stuck

| Question | Look at |
|---|---|
| What does a good UI story look like? | [user-stories/Amazon/Search/TC001_Amazon.md](user-stories/Amazon/Search/TC001_Amazon.md) |
| What does a good API story look like? | [user-stories/FakeRestAPI/User/create_user.md](user-stories/FakeRestAPI/User/create_user.md) |
| What does a good test plan look like? | [specs/FakeRestAPI/User/create_user-test-plan.md](specs/FakeRestAPI/User/create_user-test-plan.md) |
| What does the final test script look like? | [tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts](tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts) |
| All the technical rules and the reasons behind them | [USER_STORY_AUTHORING_GUIDE.md](USER_STORY_AUTHORING_GUIDE.md) |
| How to set up the machine and run tests | [README.md](README.md), [docs/MCP_QUICK_START.md](docs/MCP_QUICK_START.md) |

---

### The one-paragraph summary

Put your story at `user-stories/<Application>/<Feature>/TC001_WhatItDoes.md`. Say whether it's UI or API. Cover **one** happy path. Describe what the user sees or what the API returns — never how to find it in the code. Give real test data using the `- URL:` / `- Username:` / `- Password:` bullets and an `## Expected Result` heading. For APIs, give the exact method, URL, payload, and at least five checks. Write down anything you're unsure about instead of guessing. Then run the checklist in §9 and hand it over.
