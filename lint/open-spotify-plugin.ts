import { definePlugin } from "@oxlint/plugins"
import { descriptiveTestNames } from "./rules/descriptive-test-names.ts"
import { noHardCodedColors } from "./rules/no-hard-coded-colors.ts"
import { noJunkDrawerModules } from "./rules/no-junk-drawer-modules.ts"
import { noTryCatch } from "./rules/no-try-catch.ts"
import { requireDisableReason } from "./rules/require-disable-reason.ts"

// Project-specific lint rules. Each one exists because an agent produced the
// pattern it forbids; see docs/agents/slop-log.md for the history.
export default definePlugin({
  meta: { name: "open-spotify" },
  rules: {
    "descriptive-test-names": descriptiveTestNames,
    "no-hard-coded-colors": noHardCodedColors,
    "no-junk-drawer-modules": noJunkDrawerModules,
    "no-try-catch": noTryCatch,
    "require-disable-reason": requireDisableReason,
  },
})
