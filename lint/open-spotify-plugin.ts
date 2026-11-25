import { definePlugin } from "@oxlint/plugins"
import { descriptiveTestNames } from "./rules/descriptive-test-names.ts"
import { noArbitraryThemeValues } from "./rules/no-arbitrary-theme-values.ts"
import { noConstructedContextValues } from "./rules/no-constructed-context-values.ts"
import { noDomNodeAccess } from "./rules/no-dom-node-access.ts"
import { noEffectPromise } from "./rules/no-effect-promise.ts"
import { noEffectRun } from "./rules/no-effect-run.ts"
import { noEffectWithSpan } from "./rules/no-effect-with-span.ts"
import { noHardCodedColors } from "./rules/no-hard-coded-colors.ts"
import { noJunkDrawerModules } from "./rules/no-junk-drawer-modules.ts"
import { noNewDateWithArguments } from "./rules/no-new-date-with-arguments.ts"
import { noRendererRuntimeImport } from "./rules/no-renderer-runtime-import.ts"
import { noStaleFileReferences } from "./rules/no-stale-file-references.ts"
import { noThrow } from "./rules/no-throw.ts"
import { noTryCatch } from "./rules/no-try-catch.ts"
import { requireDisableReason } from "./rules/require-disable-reason.ts"
import { requireEffectFn } from "./rules/require-effect-fn.ts"
import { requireRingOffsetColor } from "./rules/require-ring-offset-color.ts"

// Project-specific lint rules. Each one exists because an agent produced the
// pattern it forbids; see docs/agents/slop-log.md for the history.
export default definePlugin({
  meta: { name: "open-spotify" },
  rules: {
    "descriptive-test-names": descriptiveTestNames,
    "no-arbitrary-theme-values": noArbitraryThemeValues,
    "no-constructed-context-values": noConstructedContextValues,
    "no-dom-node-access": noDomNodeAccess,
    "no-effect-promise": noEffectPromise,
    "no-effect-run": noEffectRun,
    "no-effect-with-span": noEffectWithSpan,
    "no-hard-coded-colors": noHardCodedColors,
    "no-junk-drawer-modules": noJunkDrawerModules,
    "no-new-date-with-arguments": noNewDateWithArguments,
    "no-renderer-runtime-import": noRendererRuntimeImport,
    "no-stale-file-references": noStaleFileReferences,
    "no-throw": noThrow,
    "no-try-catch": noTryCatch,
    "require-disable-reason": requireDisableReason,
    "require-effect-fn": requireEffectFn,
    "require-ring-offset-color": requireRingOffsetColor,
  },
})
