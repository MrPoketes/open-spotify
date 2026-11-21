import { X } from "lucide-react"
import { use, useId, useRef } from "react"
import { IconButton } from "../../ui/icon-button"
import { IsMacContext } from "./is-mac-context"
import { keyComboLabels } from "./key-combo"
import { keyboardShortcuts, shortcutKeys } from "./keyboard-shortcuts"
import { useKeyboardShortcut } from "./use-keyboard-shortcut"

const shortcutGroups = ["Playback", "General"] as const

interface ShortcutGroupProps {
  readonly group: (typeof shortcutGroups)[number]
  readonly isMac: boolean
}

function ShortcutGroup({ group, isMac }: ShortcutGroupProps) {
  const shortcuts = Object.values(keyboardShortcuts).filter((shortcut) => shortcut.group === group)
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted">{group}</h3>
      <dl className="flex flex-col gap-2">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.description} className="flex items-center justify-between gap-4">
            <dt className="text-sm">{shortcut.description}</dt>
            <dd className="flex gap-1">
              {keyComboLabels(shortcutKeys(shortcut, isMac), isMac).map((label) => (
                <kbd
                  key={label}
                  className="min-w-6 rounded-small bg-surface-raised px-2 text-center text-xs font-semibold"
                >
                  {label}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

// A modal dialog: the browser traps focus inside it, closes it on Escape, and
// returns focus to where it was.
export function ShortcutsDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const isMac = use(IsMacContext)

  useKeyboardShortcut("showShortcuts", () => {
    if (dialogRef.current?.open === false) {
      dialogRef.current.showModal()
    }
  })

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      className="m-auto w-full max-w-md rounded-large bg-surface-overlay p-6 text-foreground shadow-overlay transition-[opacity,translate] duration-200 ease-out backdrop:bg-canvas/70 starting:open:translate-y-2 starting:open:opacity-0"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-xl font-bold">
          Keyboard shortcuts
        </h2>
        <IconButton label="Close" icon={X} onClick={() => dialogRef.current?.close()} />
      </div>
      <div className="flex flex-col gap-4">
        {shortcutGroups.map((group) => (
          <ShortcutGroup key={group} group={group} isMac={isMac} />
        ))}
      </div>
    </dialog>
  )
}
