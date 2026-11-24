import path from "node:path"
import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { descriptiveTestNames } from "./rules/descriptive-test-names.ts"
import { noArbitraryThemeValues } from "./rules/no-arbitrary-theme-values.ts"
import { noConstructedContextValues } from "./rules/no-constructed-context-values.ts"
import { noDomNodeAccess } from "./rules/no-dom-node-access.ts"
import { noEffectPromise } from "./rules/no-effect-promise.ts"
import { noEffectWithSpan } from "./rules/no-effect-with-span.ts"
import { noHardCodedColors } from "./rules/no-hard-coded-colors.ts"
import { noJunkDrawerModules } from "./rules/no-junk-drawer-modules.ts"
import { noStaleFileReferences } from "./rules/no-stale-file-references.ts"
import { noThrow } from "./rules/no-throw.ts"
import { noTryCatch } from "./rules/no-try-catch.ts"
import { requireDisableReason } from "./rules/require-disable-reason.ts"
import { requireEffectFn } from "./rules/require-effect-fn.ts"
import { requireRingOffsetColor } from "./rules/require-ring-offset-color.ts"

// These rules are the automated half of the no-slop policy. If one stops
// reporting, slop gets merged silently, so each rule is pinned to examples.
RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run("no-junk-drawer-modules", noJunkDrawerModules, {
  valid: [{ code: "export const a = 1", filename: "src/renderer/lib/format-duration.ts" }],
  invalid: [
    { code: "export const a = 1", filename: "src/renderer/lib/utils.ts", errors: 1 },
    { code: "export const a = 1", filename: "src/main/helpers.test.ts", errors: 1 },
  ],
})

ruleTester.run("no-try-catch", noTryCatch, {
  valid: ["Effect.tryPromise(() => fetch(url))"],
  invalid: [{ code: "try { run() } catch { recover() }", errors: 1 }],
})

const invalidThrows = [
  'throw new Error("boom")',
  'throw redirect({ to: "/login" })',
  'import { redirect } from "./router"; throw redirect({ to: "/login" })',
  'import { Link } from "@tanstack/react-router"; throw Link()',
  'import { redirect } from "@tanstack/react-router"; throw redirect',
  'import { redirect } from "@tanstack/react-router"; function run(redirect) { throw redirect({ to: "/login" }) }',
  'import * as router from "@tanstack/react-router"; throw router.Link()',
  'import { type redirect } from "@tanstack/react-router"; throw redirect({ to: "/login" })',
]

ruleTester.run("no-throw", noThrow, {
  valid: [
    'import { redirect } from "@tanstack/react-router"; function check() { throw redirect({ to: "/login" }) }',
    'import { notFound } from "@tanstack/react-router"; throw notFound()',
    'import { redirect as go } from "@tanstack/react-router"; throw go({ to: "/login" })',
    'import * as router from "@tanstack/react-router"; throw router.notFound()',
  ],
  invalid: invalidThrows.map((code) => ({
    code,
    filename: "route.ts",
    errors: [{ messageId: "noThrow" }],
  })),
})

const noEffectPromiseMessage =
  "Use Effect.tryPromise with a Schema.TaggedError instead of Effect.promise, or disable this rule with a reason explaining why the promise cannot reject."

ruleTester.run("no-effect-promise", noEffectPromise, {
  valid: [
    "Effect.tryPromise({ try: () => fetch(url), catch: (cause) => new FetchError({ cause }) })",
    "other.promise(() => fetch(url))",
    "Effect[promise](() => fetch(url))",
  ],
  invalid: [
    {
      code: "Effect.promise(() => fetch(url))",
      errors: [{ message: noEffectPromiseMessage }],
    },
    {
      code: 'Effect["promise"](() => fetch(url))',
      errors: [{ message: noEffectPromiseMessage }],
    },
  ],
})

ruleTester.run("no-effect-with-span", noEffectWithSpan, {
  valid: [
    'const get = Effect.fn("Settings.get")(function* (key) { return key })',
    'tracer.withSpan("Settings.get")',
    'Effect[withSpan]("Settings.get")',
  ],
  invalid: [
    {
      code: 'Effect.gen(function* () { return 1 }).pipe(Effect.withSpan("Settings.get"))',
      errors: [{ message: 'Use Effect.fn("name") instead of Effect.withSpan.' }],
    },
  ],
})

ruleTester.run("require-disable-reason", requireDisableReason, {
  valid: ["// oxlint-disable-next-line no-console -- the CLI prints to stdout\nconsole.log(1)"],
  invalid: [{ code: "// oxlint-disable-next-line no-console\nconsole.log(1)", errors: 1 }],
})

const requireEffectFnMessage =
  'Use Effect.fn("name")(function* ...) instead of returning Effect.gen.'

ruleTester.run("require-effect-fn", requireEffectFn, {
  valid: [
    'it.effect("runs the effect", () => Effect.gen(function* () { return 1 }))',
    "const get = (key) => { const trimmed = key.trim(); return Effect.gen(function* () { return trimmed }) }",
    "const get = (key) => other.gen(function* () { return key })",
    "const get = (key) => Effect[gen](function* () { return key })",
  ],
  invalid: [
    {
      code: "const get = (key) => Effect.gen(function* () { return key })",
      errors: [{ message: requireEffectFnMessage }],
    },
    {
      code: "const get = (key) => { return Effect.gen(function* () { return key }) }",
      errors: [{ message: requireEffectFnMessage }],
    },
    {
      code: "const get = function (key) { return Effect.gen(function* () { return key }) }",
      errors: [{ message: requireEffectFnMessage }],
    },
    {
      code: "function get(key) { return Effect.gen(function* () { return key }) }",
      errors: [{ message: requireEffectFnMessage }],
    },
  ],
})

// Comments name files by their path from the repository root.
const repositoryRoot = path.resolve(import.meta.dirname, "..")

ruleTester.run("no-stale-file-references", noStaleFileReferences, {
  valid: [
    { code: "// The tokens live in src/shared/theme.ts.", cwd: repositoryRoot },
    { code: "// Fetched from https://example.com/src/missing.ts", cwd: repositoryRoot },
    { code: "// Route files under src/renderer/routes/** are exempt", cwd: repositoryRoot },
  ],
  invalid: [
    { code: "// Defined in src/renderer/styles/tokens.css.", cwd: repositoryRoot, errors: 1 },
  ],
})

ruleTester.run("descriptive-test-names", descriptiveTestNames, {
  valid: [
    'it("serves the app shell for client-side routes", run)',
    'it.effect("fails when the reply does not match", run)',
  ],
  invalid: [
    { code: 'it("works", run)', errors: 1 },
    { code: 'test("renders correctly", run)', errors: 1 },
    { code: 'it.effect("should return the user profile", run)', errors: 1 },
  ],
})

ruleTester.run("no-hard-coded-colors", noHardCodedColors, {
  valid: [
    {
      code: '<p className="bg-surface text-foreground hover:bg-accent/80 border-border" />',
      filename: "view.tsx",
    },
    'const classes = "bg-transparent text-current fill-current"',
    'const anchor = "#add-to-folder"',
    'const copyright = "&#169; 2026"',
    'const caption = "The red-500 swatch was removed"',
  ],
  invalid: [
    { code: 'const style = { color: "#fff" }', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const shadow = "0 0 4px #1a2b3c80"', errors: [{ messageId: "colorLiteral" }] },
    { code: "const fill = `rgb(0 0 0 / ${alpha})`", errors: [{ messageId: "colorLiteral" }] },
    { code: 'const color = "hsl(10 20% 30%)"', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const color = "oklch(0.7 0.1 30)"', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const color = "color(display-p3 1 0 0)"', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const classes = "p-4 bg-[#123456]"', errors: [{ messageId: "colorLiteral" }] },
    { code: 'const classes = "text-[rgb(1_2_3)]"', errors: [{ messageId: "colorLiteral" }] },
    {
      code: '<p className="p-4 bg-zinc-900" />',
      filename: "view.tsx",
      errors: [{ messageId: "paletteClass" }],
    },
    {
      code: "const classes = `${base} hover:text-red-500/50 !border-white`",
      errors: [{ messageId: "paletteClass" }, { messageId: "paletteClass" }],
    },
  ],
})

ruleTester.run("no-arbitrary-theme-values", noArbitraryThemeValues, {
  valid: [
    {
      code: '<div className="font-body font-display rounded-small rounded-medium rounded-large rounded-t-medium shadow-raised shadow-overlay" />',
      filename: "view.tsx",
    },
    'const classes = "rounded-full rounded-none font-normal font-semibold font-bold shadow-none inset-shadow-none drop-shadow-none text-shadow-none"',
    'const layout = "grid-cols-[1fr_auto_1fr] transition-[opacity,translate] w-[320px] font-stretch-[50%]"',
  ],
  invalid: [
    {
      code: '<div className="rounded-[3px] hover:rounded-t-[4px] rounded-tl-[0.5rem] !rounded-ss-[6px]" />',
      filename: "view.tsx",
      errors: [
        { messageId: "arbitraryRadius" },
        { messageId: "arbitraryRadius" },
        { messageId: "arbitraryRadius" },
        { messageId: "arbitraryRadius" },
      ],
    },
    {
      code: "const classes = \"font-[Inter] focus:font-[family-name:Inter] font-['Open_Sans']!\"",
      errors: [
        { messageId: "arbitraryFont" },
        { messageId: "arbitraryFont" },
        { messageId: "arbitraryFont" },
      ],
    },
    {
      code: 'const classes = "shadow-[0_0_4px_black] inset-shadow-[0_1px_2px_black]/50 drop-shadow-[0_2px_4px_black] text-shadow-[0_1px_2px_black]"',
      errors: [
        { messageId: "arbitraryShadow" },
        { messageId: "arbitraryShadow" },
        { messageId: "arbitraryShadow" },
        { messageId: "arbitraryShadow" },
      ],
    },
    {
      code: "const classes = `${base} data-[state=open]:rounded-[${radius}px]`",
      errors: [{ messageId: "arbitraryRadius" }],
    },
  ],
})

ruleTester.run("require-ring-offset-color", requireRingOffsetColor, {
  valid: [
    {
      code: '<button className="ring-2 ring-offset-2 ring-offset-surface ring-focus" />',
      filename: "view.tsx",
    },
    'const classes = "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised/80"',
    'const classes = "ring-offset-canvas focus-visible:ring-offset-2"',
    'const classes = "hover:focus-visible:ring-offset-2 focus-visible:hover:ring-offset-surface"',
    'const classes = "ring-2 ring-focus ring-offset-0 ring-offset-[0px]"',
  ],
  invalid: [
    {
      code: '<button className="ring-2 ring-offset-2 ring-focus" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingRingOffsetColor" }],
    },
    {
      code: 'const classes = "focus-visible:ring-2 focus-visible:ring-offset-2 hover:ring-offset-surface"',
      errors: [{ messageId: "missingRingOffsetColor" }],
    },
    {
      code: 'const classes = "ring-offset-2 focus-visible:ring-offset-surface"',
      errors: [{ messageId: "missingRingOffsetColor" }],
    },
    {
      code: 'const classes = "ring-offset-2 ring-offset-white hover:ring-offset-4 hover:ring-offset-unknown"',
      errors: [{ messageId: "missingRingOffsetColor" }, { messageId: "missingRingOffsetColor" }],
    },
    {
      code: "const classes = `${base} !ring-offset-1 focus-visible:ring-offset-[3px]! data-[state=open]:ring-offset-[${width}px]`",
      errors: [
        { messageId: "missingRingOffsetColor" },
        { messageId: "missingRingOffsetColor" },
        { messageId: "missingRingOffsetColor" },
      ],
    },
  ],
})

ruleTester.run("no-constructed-context-values", noConstructedContextValues, {
  valid: [
    {
      code: "<DensityContext value={densityChoice}>{children}</DensityContext>",
      filename: "view.tsx",
    },
    { code: "<Dialog value={{ open }} />", filename: "view.tsx" },
  ],
  invalid: [
    {
      code: "<DensityContext value={{ density, chooseDensity }}>{children}</DensityContext>",
      filename: "view.tsx",
      errors: 1,
    },
    {
      code: "<StatusMessageContext value={(message) => show(message)} />",
      filename: "view.tsx",
      errors: 1,
    },
  ],
})

ruleTester.run("no-dom-node-access", noDomNodeAccess, {
  valid: [
    'within(secondRow).queryAllByRole("presentation")',
    {
      code: "function Wrapper({ children }: { readonly children: ReactNode }) { return <div>{children}</div> }",
      filename: "view.test.tsx",
    },
  ],
  invalid: [
    { code: 'secondRow.querySelectorAll("img")', errors: [{ messageId: "domNodeAccess" }] },
    { code: 'document.getElementsByClassName("row")', errors: [{ messageId: "domNodeAccess" }] },
    { code: "title.parentElement", errors: [{ messageId: "domNodeAccess" }] },
    { code: "row?.firstChild", errors: [{ messageId: "domNodeAccess" }] },
    { code: 'row["children"]', errors: [{ messageId: "domNodeAccess" }] },
  ],
})
