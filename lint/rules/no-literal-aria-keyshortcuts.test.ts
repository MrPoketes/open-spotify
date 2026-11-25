import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noLiteralAriaKeyshortcuts } from "./no-literal-aria-keyshortcuts.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const expectedMessage =
  'Take aria-keyshortcuts from the shortcut registry in src/renderer/features/shortcuts/keyboard-shortcuts.ts (via useRowShortcut or ariaKeyShortcut) instead of a literal, so the shortcuts dialog lists it too. Only "Shift+F10" is allowed as a literal.'

const validCases = [
  {
    code: "<Link aria-keyshortcuts={pinShortcut.ariaKeyShortcuts} />",
    filename: "src/renderer/features/library/library-entry-row.tsx",
  },
  {
    code: "<Link aria-keyshortcuts={ariaKeyShortcuts} />",
    filename: "src/renderer/features/folders/sidebar-folder-tree-rows.tsx",
  },
  {
    code: "<button aria-keyshortcuts={onDelete === null ? undefined : deleteShortcut.ariaKeyShortcuts} />",
    filename: "src/renderer/features/themes/theme-option.tsx",
  },
  {
    code: "<input aria-keyshortcuts={ariaKeyShortcut(shortcutKeys(windowShortcuts.focusSearch, isMac), isMac)} />",
    filename: "src/renderer/features/search/search-field.tsx",
  },
  {
    code: "<Link aria-keyshortcuts={`${renameShortcut.ariaKeyShortcuts} ${ariaKeyShortcuts}`} />",
    filename: "src/renderer/features/folders/sidebar-folder-tree-rows.tsx",
  },
  {
    code: '<Link aria-keyshortcuts={renameShortcut.ariaKeyShortcuts + " " + ariaKeyShortcuts} />',
    filename: "view.tsx",
  },
  {
    code: '<header aria-keyshortcuts="Shift+F10" />',
    filename: "view.tsx",
  },
  {
    code: '<header aria-keyshortcuts={opensMenu ? "Shift+F10" : undefined} />',
    filename: "src/renderer/ui/page-header.tsx",
  },
  {
    code: "<header aria-keyshortcuts={`Shift+F10`} />",
    filename: "view.tsx",
  },
  {
    code: "<header aria-keyshortcuts={`${renameShortcut.ariaKeyShortcuts} Shift+F10`} />",
    filename: "view.tsx",
  },
  {
    code: '<header aria-keyshortcuts={opensMenu && "Shift+F10"} />',
    filename: "view.tsx",
  },
  {
    code: 'const props = { "aria-keyshortcuts": "Shift+F10" }',
    filename: "view.tsx",
  },
  {
    code: '<button aria-keyshortcuts="F2" />',
    filename: "src/renderer/features/shortcuts/shortcuts-dialog.tsx",
  },
  {
    code: '<input aria-label="Search" />',
    filename: "view.tsx",
  },
]

ruleTester.run("no-literal-aria-keyshortcuts", noLiteralAriaKeyshortcuts, {
  valid: validCases,
  invalid: [
    {
      code: '<input aria-keyshortcuts="/" />',
      filename: "src/renderer/features/search/search-field.tsx",
      errors: [{ message: expectedMessage }],
    },
    {
      code: '<div aria-keyshortcuts="F2" />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<header aria-keyshortcuts="shift+f10" />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts="F2 Shift+F10" />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts="" />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<input aria-keyshortcuts={"/"} />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: "<div aria-keyshortcuts={`F2`} />",
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: "<div aria-keyshortcuts={`${renameShortcut.ariaKeyShortcuts} F2`} />",
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: "<div aria-keyshortcuts={`Alt+${key}`} />",
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: "<div aria-keyshortcuts={`${prefix}Shift+F10`} />",
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts={`${isMac ? "Meta+K" : "Control+K"} ${ariaKeyShortcuts}`} />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }, { messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts={canRename ? "F2" : undefined} />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts={canRename && "F2"} />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts={shortcut ?? "F2"} />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts={renameShortcut.ariaKeyShortcuts + " F2"} />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts={"F2" as string} />',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: 'const props = { "aria-keyshortcuts": "F2" }',
      filename: "view.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
    {
      code: '<div aria-keyshortcuts="F2" />',
      filename: "src/renderer/features/shortcuts-help/panel.tsx",
      errors: [{ messageId: "literalAriaKeyshortcuts" }],
    },
  ],
})
