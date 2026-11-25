# Slop log

Every time an agent produces a slop pattern that could come back, record it here along with
the permanent fix (a lint rule or an `AGENTS.md` rule). Newest first.

| Date       | Pattern                                                                                           | Fix                                                          |
| ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 2026-11-25 | Keyboard handlers calling `stopPropagation()` without returning early on `hasShortcutModifier`    | Custom rule `open-spotify/no-unguarded-key-stop-propagation` |
| 2026-11-25 | Browser-drawn native controls missing `appearance-none`, letting browser colors bypass the theme  | Custom rule `open-spotify/require-appearance-none`           |
| 2026-11-25 | Headings at `text-xl` and larger missing `font-display`, skipping the theme's heading font        | Custom rule `open-spotify/require-heading-font-display`      |
| 2026-11-25 | Type and value imports from the same module split into separate import statements                 | `import/no-duplicates` with `preferInline: true`             |
| 2026-11-25 | Renderer tests spying on DOM prototypes with `vi.spyOn` without restoring them between tests      | `restoreMocks: true` in `vitest.config.ts` (renderer)        |
| 2026-11-25 | Raw invisible characters (such as U+FEFF) hidden inside string literals, templates, and JSX text  | Custom rule `open-spotify/no-raw-invisible-characters`       |
| 2026-11-25 | Relative imports placed above third-party imports and inconsistent import order across files      | `sortImports` in `.oxfmtrc.json` (`oxfmt`)                   |
| 2026-11-25 | Copy-pasted code blocks, renamed copies, and long Tailwind `className` strings across files       | Cross-file duplicate check `lint/duplicate-code.test.ts`     |
| 2026-11-25 | Running effects directly with `Effect.run*` instead of through a `ManagedRuntime`                 | Custom rule `open-spotify/no-effect-run`                     |
| 2026-11-24 | Parsing incoming date strings with `new Date(value)` instead of `Schema.DateFromString`           | Custom rule `open-spotify/no-new-date-with-arguments`        |
| 2026-11-24 | Components importing `rendererRuntime` directly instead of reading `RendererRuntimeContext`       | Custom rule `open-spotify/no-renderer-runtime-import`        |
| 2026-11-24 | Promises discarded with `void`, turning rejections into unhandled promise rejections              | `typescript/no-floating-promises` with `ignoreVoid: false`   |
| 2026-11-24 | `throw` statements bypassing typed Effect errors (unchecked by lint)                              | Custom rule `open-spotify/no-throw`                          |
| 2026-11-24 | Component tests using `fireEvent` instead of interacting through `user-event`                     | Built-in `no-restricted-imports` rule in `oxlint.config.ts`  |
| 2026-11-24 | Fallible promises wrapped in `Effect.promise`, turning rejections into untyped defects            | Custom rule `open-spotify/no-effect-promise`                 |
| 2026-11-22 | Parameterised functions wrapping `Effect.gen` instead of `Effect.fn("name")`                      | Custom rule `open-spotify/require-effect-fn`                 |
| 2026-11-22 | Tailwind `ring-offset-<width>` classes falling back to hard-coded `#fff`                          | Custom rule `open-spotify/require-ring-offset-color`         |
| 2026-11-22 | Hand-written `Effect.withSpan` calls instead of `Effect.fn("name")`                               | Custom rule `open-spotify/no-effect-with-span`               |
| 2026-11-22 | Component tests querying or walking DOM nodes instead of using Testing Library role/label queries | Custom rule `open-spotify/no-dom-node-access`                |
| 2026-11-22 | Tailwind arbitrary font, radius, and shadow classes that bypass the theme                         | Custom rule `open-spotify/no-arbitrary-theme-values`         |
| 2026-11-21 | Context values built anew on each render, so every track row re-rendered with the shell           | `no-constructed-context-values` rule; ARM-137 test           |
| 2026-11-21 | Copies of the status message test query and the drop indicator check                              | Shared helpers in ARM-136; rule 9 covers new copies          |
| 2026-11-21 | Five copies of a fake player command that Spotify rejects with a 403                              | Shared fake in ARM-131; rule 9 covers new copies             |
| 2026-11-21 | Copies of the roving list, loading message, not-found page, and paged-list footer, drifting apart | Shared components in ARM-106; rule 9 covers new copies       |
| 2026-11-21 | Six inline copies of the Ctrl/Alt/Cmd check that key handlers use                                 | Custom rule `open-spotify/no-inline-modifier-check`          |
| 2026-11-21 | Exports that no module imports (21 found, mostly error classes and types)                         | Check `lint/unused-exports.test.ts`                          |
| 2026-11-21 | A second copy of a helper, test fake, or class string that already existed                        | New `AGENTS.md` rule 9, "Reuse before you write"             |
| 2026-11-21 | Comments naming a file that was moved or deleted                                                  | Custom rule `open-spotify/no-stale-file-references`          |
| 2026-11-21 | Redundant tests again, despite the 2026-11-20 `AGENTS.md` rule                                    | PR template asks for the bug only each test catches          |
| 2026-11-20 | Hard-coded colors and Tailwind palette classes that ignore the theme                              | Custom rule `open-spotify/no-hard-coded-colors`              |
| 2026-11-20 | Redundant tests: every bug they catch, another test already catches                               | Tightened `AGENTS.md` "Do not write" test rule               |
| 2026-11-20 | Catch-all modules (`utils.ts`, `helpers.ts`)                                                      | Custom rule `open-spotify/no-junk-drawer-modules`            |
| 2026-11-20 | `try`/`catch` that erases error types                                                             | Custom rule `open-spotify/no-try-catch`                      |
| 2026-11-20 | Lint disabled without explanation                                                                 | Custom rule `open-spotify/require-disable-reason`            |
| 2026-11-20 | Vague test names (`"works"`, `"should render"`) that hide why a test exists                       | Custom rule `open-spotify/descriptive-test-names`            |
