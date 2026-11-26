# 0006: Prettier for code formatting

**Status:** accepted (2026-11-26)

## Context

The repository previously formatted files with `oxfmt` (`.oxfmtrc.json`), including `sortImports`
with `newlinesBetween: false` to keep Node built-ins and third-party imports ahead of relative
imports with no blank lines between groups.

The owner wants the project formatted with Prettier instead. Running two formatters on the same
files would fight each other, so Prettier replaces `oxfmt` while `oxlint` stays as the linter.

Options weighed for automatic import sorting under Prettier:

1. **`@ianvs/prettier-plugin-sort-imports` (`4.7.1`, pinned exact).** Maintained Prettier 3
   plugin. Supports `<BUILTIN_MODULES>`, `<THIRD_PARTY_MODULES>`, and relative patterns with no
   blank lines between groups, does not reorder across side-effect imports, and combines inline
   type and value imports when `importOrderTypeScriptVersion` is set to `4.5.0` or higher (which
   matches `oxlint`'s `import/no-duplicates` with `preferInline: true`).
2. **`@trivago/prettier-plugin-sort-imports`.** Can reorder across side-effect imports and does
   not merge mixed inline type/value imports the way `import/no-duplicates` expects.
3. **`prettier-plugin-organize-imports`.** Runs TypeScript's language service and deletes unused
   imports as a side effect of formatting, rather than only sorting them.

## Decision

Replace `oxfmt` with **Prettier** (`prettier@3.10.1`) and
**`@ianvs/prettier-plugin-sort-imports`** (`4.7.1`), both pinned as dev dependencies:

- `.prettierrc.json` preserves the existing code style (`printWidth: 100`, `semi: false`,
  `singleQuote: false`, `trailingComma: "all"`) and sets
  `importOrder: ["<BUILTIN_MODULES>", "<THIRD_PARTY_MODULES>", "^[.]"]` and
  `importOrderTypeScriptVersion: "7.0.2"` (the installed TypeScript version; bump alongside
  `typescript` in `package.json`).
- `.prettierignore` ignores tracked generated files (`src/renderer/routeTree.gen.ts`,
  `pnpm-lock.yaml`); build and test outputs stay excluded through `.gitignore`, which Prettier 3
  reads by default.
- `pnpm format` and `pnpm format:check` run `prettier --write .` and `prettier --check .`.
- Remove `oxfmt` and `.oxfmtrc.json`.

## Consequences

- Standard Prettier editor integrations format files the same way CI checks them.
- Import order remains enforced automatically by `pnpm format:check` without regressing the
  slop-log rule.
- Formatting is slightly slower than `oxfmt` because Prettier runs in Node instead of native
  Rust, though still only a few seconds for the whole repository.
- `oxlint` stays unchanged as the linter.
