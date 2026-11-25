import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noInlineModifierCheck } from "./no-inline-modifier-check.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const expectedMessage =
  "Use hasShortcutModifier from src/renderer/ui/has-shortcut-modifier.ts instead of checking ctrlKey, metaKey, and altKey inline. For a specific shortcut chord, use matchesKeyCombo or disable this rule with a reason."

ruleTester.run("no-inline-modifier-check", noInlineModifierCheck, {
  valid: [
    {
      code: "export const hasShortcutModifier = (event) => event.ctrlKey || event.metaKey || event.altKey",
      filename: "src/renderer/ui/has-shortcut-modifier.ts",
    },
    "if (event.ctrlKey && event.shiftKey) return",
    "if (first.ctrlKey || second.ctrlKey) return",
    "event.ctrlKey && dispatch(event.altKey)",
    "const primaryKey = isMac ? event.metaKey : event.ctrlKey",
  ],
  invalid: [
    {
      code: "if (event.ctrlKey || event.metaKey || event.altKey) return",
      filename: "src/renderer/ui/use-roving-focus.ts",
      errors: [{ message: expectedMessage }],
    },
    {
      code: "if (event.ctrlKey || event.metaKey) return",
      errors: [{ messageId: "inlineModifierCheck" }],
    },
    {
      code: 'if (event.key === "Enter" && !(event.ctrlKey || event.metaKey)) return',
      errors: [{ messageId: "inlineModifierCheck" }],
    },
    {
      code: "if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) return",
      errors: [{ messageId: "inlineModifierCheck" }],
    },
    {
      code: "if (event.ctrlKey === false && event.altKey === false) return",
      errors: [{ messageId: "inlineModifierCheck" }],
    },
    {
      code: 'if (event?.["ctrlKey"] || event?.metaKey) return',
      errors: [{ messageId: "inlineModifierCheck" }],
    },
    {
      code: "const { ctrlKey, metaKey } = event; if (ctrlKey || metaKey) return",
      errors: [{ messageId: "inlineModifierCheck" }],
    },
    {
      code: "if ((event.ctrlKey as boolean) || event.altKey!) return",
      filename: "handler.ts",
      errors: [{ messageId: "inlineModifierCheck" }],
    },
    {
      code: "const blocked = isMac ? (event.metaKey || event.altKey) : (event.ctrlKey || event.altKey)",
      errors: [{ messageId: "inlineModifierCheck" }, { messageId: "inlineModifierCheck" }],
    },
    {
      code: "export const check = (event) => event.ctrlKey || event.metaKey",
      filename: "src/renderer/features/has-shortcut-modifier.ts",
      errors: [{ messageId: "inlineModifierCheck" }],
    },
  ],
})
