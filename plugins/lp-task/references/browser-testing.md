# Browser testing: best practices

Used by `/lp-task:test-browser` to build the checklist (step 2) and by the `browser-tester` agent to run it. Goal: cover the task with positive, negative and edge scenarios chosen by risk, without exploding the checklist.

## 1. Principles

- **Test the change, not the whole product.** Start from the diff and the acceptance criteria, then widen to what the change can break (regression).
- **Risk first.** Cover high-impact and high-likelihood areas first (money, auth, data loss, core navigation, anything the diff touches heavily). Low-risk cosmetic areas get one quick pass.
- **Every row has a kind and a priority.** Kind: `positive`, `negative`, `edge`, `state`, `regression`. Priority: `P1` (must pass, blocks the task), `P2` (should pass), `P3` (nice to check). Run P1 first; if time or context is short, drop P3 and say so.
- **A clear oracle.** For each row know what «correct» means: the acceptance criteria, the design, existing behaviour on the base branch, consistency with similar screens. If there is no oracle, mark the row `⚠️` instead of guessing.
- **Keep it bounded.** About 10-25 rows per project is normal. Merge rows that exercise the same code path; do not multiply near-identical cases.
- **Reproducible findings.** Every `❌` needs the steps, expected vs actual, the environment (viewport, language, user state) and the probable cause in code.
- **Pre-existing is not a regression.** If something fails, check whether it also fails without the change (compare with the base behaviour or with a similar untouched page) and label it `pre-existing`.

## 2. Scenario kinds

**Positive (happy path).** The documented flow with valid, typical input: the feature appears, works, and the result is visible and persists (reload, navigate away and back).

**Negative.** The system must reject or handle wrong use gracefully:
- invalid, empty and missing required input; wrong format; unsupported file type;
- actions without the needed state or permission (guest instead of authorized, no data, expired state);
- server and network failures: error response, empty response, slow response, offline, timeout. Provoke them only in safe, read-only ways (throttling, offline mode, blocking a request, a path that errors by itself); never mutate real data to produce an error;
- expected behaviour: a clear user-facing message, no crash, no blank screen, no raw error text or stack trace, the form keeps the user's input, the user can recover (retry, go back).

**Edge and boundary.** Where bugs live (boundary value analysis and equivalence partitioning):
- quantity: 0, 1, many, and «too many» (long lists, overflow, pagination edges, first/last item);
- text length: empty, 1 char, typical, maximum, over the maximum; very long words without spaces; long translated strings; leading/trailing spaces; line breaks;
- characters: unicode, emoji, RTL text, quotes, `<`, `&`, percent signs; the text must be shown as text, never interpreted (look for escaping problems, but do not attempt attacks);
- numbers and dates: minimum, maximum, just inside/outside the limit, negative, decimal separators, zero, time zones and midnight, locale formats;
- values that are `null`/missing in the data, optional fields absent;
- timing: fast double click, double submit, click during loading, navigating away mid-request, back/forward and reload at each step, long idle, stale data after the state changed in another tab.

**State.** The same UI in each state it can be in: empty / loading / loaded / error / partial data; guest / authorized / different roles or segments; feature on / off; first visit / returning user.

**Environment.** Where relevant to the change: mobile and desktop viewports and the breakpoints between them, portrait/landscape, each supported language and locale, light/dark theme if present, keyboard-only use (tab order, focus visible, Enter/Escape), basic accessibility (labels, alt text, contrast of what changed), browser zoom.

**Regression.** Everything that shares the changed code: parents and siblings of the changed component, other pages using the same hook/selector/style/locale key, removed entities leaving no gaps or dead links, no new console errors, no new 4xx/5xx requests.

## 3. From change type to cases

| The change is about | Add at least |
|---|---|
| Text, locale keys | every supported language, longest translation (wrapping, truncation, overlap), missing key (no raw key shown), plural/number formats |
| Styles, layout | breakpoints (narrowest, widest, between), long content, zoom, hover/focus/active/disabled states, theme |
| Form, input | empty, valid, invalid, boundary lengths, special characters, paste, double submit, validation message wording and position, input kept after an error, keyboard submit |
| List, table, feed | 0 / 1 / many items, very long item, pagination or infinite scroll edges, sorting/filter combined with an empty result, item removed while viewing |
| Button, action | disabled and loading states, repeated clicks, action without permission, action with a server error, result after reload |
| Data display (numbers, money, dates) | zero, negative, very large, rounding, formatting per locale, missing value, value update while open |
| Navigation, routing | direct URL entry, back/forward, reload on the page, unknown or invalid id in the URL, redirect for guests, deep link with query params |
| Auth-dependent UI | guest, authorized, session expired mid-flow (do not log out or change account settings yourself; ask the user if needed) |
| Feature flag, config | flag on and off, both variants render without the other's leftovers |
| Removal of an entity | its former places render cleanly, no empty wrappers, spacing, or dead links, other languages and viewports |
| Third-party widget, embed, media | blocked or failing load, slow load, empty state |

## 4. Technique cheatsheet

- **Equivalence partitioning**: one representative per class of input (valid, invalid, empty), not every value.
- **Boundary values**: min, min-1, min+1, max-1, max, max+1.
- **State transitions**: list the states and the transitions the change adds or alters; test each new transition and one illegal transition.
- **Error guessing**: from experience, the usual suspects are empty/null, long strings, double click, back button, reload mid-flow, slow network, another language, small viewport.
- **Exploratory pass**: after the checklist, spend a short, bounded time (a few minutes) around the changed area with fresh eyes, then add what you found as extra rows.
- **One variable at a time** when a case fails, to isolate the cause.

## 4a. Safety (always)

Everything above stays inside `browserTest.forbiddenActions`. In particular: no real payments or other money actions, no typing credentials, no irreversible or account-changing actions, no destructive input against real data. Negative and edge scenarios are exercised through the UI with harmless input, throttling or offline mode, and read-only inspection. If a valuable case needs a forbidden action, list it as `⚠️ не проверено` with the reason and a suggestion of how the user can check it safely.

## 5. Checklist row format

| Project | Kind | P | Item | Where / how | Expected |
|---|---|---|---|---|---|
| Web | negative | P1 | Submit with an empty required field | form page, press submit | validation message under the field, no request sent |

## 6. Report format

- Result per row: ✅ passed, ❌ failed, ⚠️ not checked (with the reason).
- For `❌`: steps, expected vs actual, environment, probable cause (`file:line`), `pre-existing` if applicable.
- Add a short coverage line: counts per kind (positive / negative / edge / state / regression) and what was deliberately not covered, so the reader sees the gaps.
- Anything useful found outside the checklist goes under «Дополнительные наблюдения», clearly separated from the checklist results.
