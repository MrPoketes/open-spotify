# Slop log

Every time an agent produces a slop pattern that could come back, record it here along with
the permanent fix (a lint rule or an `AGENTS.md` rule). Newest first.

| Date       | Pattern                                                                     | Fix                                                 |
| ---------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| 2026-11-21 | Exports that no module imports (21 found, mostly error classes and types)   | Check `lint/unused-exports.test.ts`                 |
| 2026-11-21 | A second copy of a helper, test fake, or class string that already existed  | New `AGENTS.md` rule 9, "Reuse before you write"    |
| 2026-11-21 | Comments naming a file that was moved or deleted                            | Custom rule `open-spotify/no-stale-file-references` |
| 2026-11-21 | Redundant tests again, despite the 2026-11-20 `AGENTS.md` rule              | PR template asks for the bug only each test catches |
| 2026-11-20 | Hard-coded colors and Tailwind palette classes that ignore the theme        | Custom rule `open-spotify/no-hard-coded-colors`     |
| 2026-11-20 | Redundant tests: every bug they catch, another test already catches         | Tightened `AGENTS.md` "Do not write" test rule      |
| 2026-11-20 | Catch-all modules (`utils.ts`, `helpers.ts`)                                | Custom rule `open-spotify/no-junk-drawer-modules`   |
| 2026-11-20 | `try`/`catch` that erases error types                                       | Custom rule `open-spotify/no-try-catch`             |
| 2026-11-20 | Lint disabled without explanation                                           | Custom rule `open-spotify/require-disable-reason`   |
| 2026-11-20 | Vague test names (`"works"`, `"should render"`) that hide why a test exists | Custom rule `open-spotify/descriptive-test-names`   |
