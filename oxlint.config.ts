import { defineConfig } from "oxlint"

// Lint rules are the first line of defence against unreadable code. When a
// reviewer finds the same problem twice, the fix is a rule here (or in
// lint/open-spotify-plugin.ts), not another review comment.
export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "oxc", "import", "react", "jsx-a11y", "vitest"],
  jsPlugins: ["./lint/open-spotify-plugin.ts"],
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  ignorePatterns: ["out/**", "dist/**", "release/**", "src/renderer/routeTree.gen.ts"],
  rules: {
    // Small units are easier to read and review than large ones.
    "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
    "max-depth": ["error", 3],
    "max-params": ["error", 3],
    "max-nested-callbacks": ["error", 3],
    complexity: ["error", 10],

    // Control flow should read top to bottom.
    "no-nested-ternary": "error",
    "no-else-return": "error",
    "no-param-reassign": "error",
    eqeqeq: "error",
    // Effect's tagged errors and data types use `_tag` as their discriminator.
    "no-underscore-dangle": ["error", { allow: ["_tag"] }],
    "import/no-unassigned-import": [
      "error",
      { allow: ["**/*.css", "@testing-library/jest-dom/vitest"] },
    ],
    "unicorn/no-array-reduce": "error",

    // Logging goes through Effect.log so it can be filtered and traced.
    "no-console": "error",
    // Unfinished work belongs in a Linear issue, not a comment.
    "no-warning-comments": "error",
    "unicorn/no-abusive-eslint-disable": "error",
    "unicorn/prefer-node-protocol": "error",
    "unicorn/filename-case": ["error", { case: "kebabCase" }],

    // Modules are imported from where they are defined.
    "oxc/no-barrel-file": "error",
    "import/no-default-export": "error",
    "import/no-cycle": "error",
    "import/no-duplicates": "error",

    // The type system only helps if nothing opts out of it.
    "typescript/no-explicit-any": "error",
    "typescript/no-non-null-assertion": "error",
    "typescript/ban-ts-comment": "error",
    "typescript/consistent-type-imports": "error",
    "typescript/no-unsafe-type-assertion": "error",
    "typescript/no-unsafe-argument": "error",
    "typescript/no-unsafe-assignment": "error",
    "typescript/no-unsafe-call": "error",
    "typescript/no-unsafe-member-access": "error",
    "typescript/no-unsafe-return": "error",
    "typescript/no-unnecessary-condition": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",
    "typescript/switch-exhaustiveness-check": "error",

    // Not needed with the automatic JSX runtime.
    "react/react-in-jsx-scope": "off",
    "react/rules-of-hooks": "error",
    "react/exhaustive-deps": "error",
    "react/no-array-index-key": "error",
    "react/jsx-no-useless-fragment": "error",
    "react/only-export-components": ["error", { allowExportNames: ["Route"] }],

    // Tests must be deliberate: no skipped, focused, or assertion-free tests.
    "vitest/no-disabled-tests": "error",
    "vitest/no-focused-tests": "error",
    "vitest/no-commented-out-tests": "error",
    "vitest/no-conditional-tests": "error",
    "vitest/no-conditional-in-test": "error",
    "vitest/no-conditional-expect": "error",
    "vitest/no-identical-title": "error",
    "vitest/valid-title": "error",

    "open-spotify/descriptive-test-names": "error",
    "open-spotify/no-constructed-context-values": "error",
    "open-spotify/no-effect-with-span": "error",
    "open-spotify/no-junk-drawer-modules": "error",
    "open-spotify/no-stale-file-references": "error",
    "open-spotify/no-try-catch": "error",
    "open-spotify/require-disable-reason": "error",
    "open-spotify/require-effect-fn": "error",
  },
  overrides: [
    {
      // Tool config files must use a default export.
      files: ["*.config.ts", "lint/open-spotify-plugin.ts"],
      rules: { "import/no-default-export": "off" },
    },
    {
      // TanStack Router derives URLs from these file names, and its plugin
      // handles hot reloading for route files itself.
      files: ["src/renderer/routes/**"],
      rules: { "unicorn/filename-case": "off", "react/only-export-components": "off" },
    },
    {
      // Test tables and fixtures are naturally long. A test's provider wraps
      // one screen and does not re-render with an app shell around it.
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "max-lines-per-function": "off",
        "max-nested-callbacks": "off",
        "open-spotify/no-constructed-context-values": "off",
      },
    },
    {
      // The renderer is sandboxed: it reaches the main process only through
      // the DesktopBridge, never through Electron or Node APIs.
      files: ["src/renderer/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              { group: ["electron", "node:*"], message: "Use DesktopBridge instead." },
              { group: ["**/main/**"], message: "Use DesktopBridge instead." },
            ],
          },
        ],
      },
    },
    {
      // A theme restyles only what reads a theme token, so renderer code takes
      // every color, font, radius, and shadow from the theme tokens in src/shared/theme.ts.
      files: ["src/renderer/**"],
      rules: {
        "open-spotify/no-arbitrary-theme-values": "error",
        "open-spotify/no-hard-coded-colors": "error",
        "open-spotify/require-ring-offset-color": "error",
      },
    },
    {
      // Component tests check what a user can reach through the accessibility
      // tree instead of querying or walking the DOM directly.
      files: ["src/renderer/**/*.test.tsx"],
      rules: { "open-spotify/no-dom-node-access": "error" },
    },
    {
      files: ["src/main/**", "src/preload/**", "src/shared/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              { group: ["**/renderer/**"], message: "Node code must not import UI code." },
            ],
          },
        ],
      },
    },
  ],
})
