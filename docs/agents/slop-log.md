# Slop log

Every time an agent produces a slop pattern that could come back, record it here along with
the permanent fix (a lint rule or an `AGENTS.md` rule). Newest first.

| Date       | Pattern                                                                     | Fix                                               |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| 2026-11-20 | Redundant tests: every bug they catch, another test already catches         | Tightened `AGENTS.md` "Do not write" test rule    |
| 2026-11-20 | Catch-all modules (`utils.ts`, `helpers.ts`)                                | Custom rule `open-spotify/no-junk-drawer-modules` |
| 2026-11-20 | `try`/`catch` that erases error types                                       | Custom rule `open-spotify/no-try-catch`           |
| 2026-11-20 | Lint disabled without explanation                                           | Custom rule `open-spotify/require-disable-reason` |
| 2026-11-20 | Vague test names (`"works"`, `"should render"`) that hide why a test exists | Custom rule `open-spotify/descriptive-test-names` |
