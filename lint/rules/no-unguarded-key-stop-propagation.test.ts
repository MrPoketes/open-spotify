import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noUnguardedKeyStopPropagation } from "./no-unguarded-key-stop-propagation.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const expectedMessage =
  "Return early when hasShortcutModifier(event) is true before calling stopPropagation() in a keyboard handler, so app-wide shortcuts still reach window."

ruleTester.run("no-unguarded-key-stop-propagation", noUnguardedKeyStopPropagation, {
  valid: [
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          if (hasShortcutModifier(event)) return
          event.stopPropagation()
        }
      `,
      filename: "folder-rename-field.tsx",
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          if (isDisabled || hasShortcutModifier(event)) {
            return
          }
          if (event.key === "Enter") {
            event.stopPropagation()
          }
        }
      `,
      filename: "menu-list.tsx",
    },
    {
      code: `
        const preventContextMenu = (event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
        }
        export const View = () => (
          <div
            onContextMenu={(event) => {
              event.stopPropagation()
            }}
            onClick={preventContextMenu}
          />
        )
      `,
      filename: "context-menu.tsx",
    },
    {
      code: `
        element.addEventListener("contextmenu", (event) => {
          event.stopPropagation()
        })
      `,
      filename: "context-menu.ts",
    },
    {
      code: `
        function handleKey(event: KeyboardEvent) {
          if (hasShortcutModifier(event.nativeEvent)) return
          event.nativeEvent.stopImmediatePropagation()
        }
      `,
      filename: "handler.ts",
    },
  ],
  invalid: [
    {
      code: `
        function applyMenuKey(event: KeyboardEvent) {
          event.stopPropagation()
        }
      `,
      filename: "menu-list.tsx",
      errors: [{ message: expectedMessage }],
    },
    {
      code: `export const Input = () => <input onKeyDown={(event) => event.stopPropagation()} />`,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        export function Input({ active }: { readonly active: boolean }) {
          const stopKeys = useCallback((event) => {
            event.stopPropagation()
          }, [])
          return <input onKeyDown={active ? stopKeys : undefined} />
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        element.addEventListener("keydown", (event) => {
          event.stopPropagation()
        })
      `,
      filename: "listener.ts",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const handlers = {
          onKeyDown(event) {
            event.stopPropagation()
          },
        }
      `,
      filename: "handlers.ts",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
          event.stopPropagation()
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          event.stopPropagation()
          if (hasShortcutModifier(event)) return
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === "ArrowLeft" && hasShortcutModifier(event)) return
          event.stopPropagation()
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          if (hasShortcutModifier(event)) {
            if (shouldIgnore) return
          }
          event.stopPropagation()
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === "ArrowDown") {
            if (hasShortcutModifier(event)) return
          }
          event.stopPropagation()
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          if (!hasShortcutModifier(event)) return
          event.stopPropagation()
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          if (hasShortcutModifier(otherEvent)) return
          event.stopPropagation()
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
    {
      code: `
        const onKeyDown = (event: KeyboardEvent) => {
          event.nativeEvent.stopImmediatePropagation()
        }
      `,
      filename: "input.tsx",
      errors: [{ messageId: "unguardedStopPropagation" }],
    },
  ],
})
