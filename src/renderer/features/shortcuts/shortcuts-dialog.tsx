import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { use, useId, useState } from "react"
import { DialogContent, DialogTitle } from "../../ui/dialog"
import { IconButton } from "../../ui/icon-button"
import { IsMacContext } from "./is-mac-context"
import {
  rowShortcuts,
  shortcutGroups,
  windowShortcuts,
  type KeyboardShortcut,
  type ShortcutGroupName,
} from "./keyboard-shortcuts"
import { ShortcutKeyCaps } from "./shortcut-key-caps"
import { useKeyboardShortcut } from "./use-keyboard-shortcut"

const allShortcuts = [...Object.values(windowShortcuts), ...Object.values(rowShortcuts)]

interface ShortcutGroupProps {
  readonly group: ShortcutGroupName
  readonly isMac: boolean
}

interface ShortcutEntryProps {
  readonly shortcut: KeyboardShortcut
  readonly isMac: boolean
}

function ShortcutEntry({ shortcut, isMac }: ShortcutEntryProps) {
  const termId = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <dt id={termId} className="text-sm">
        {shortcut.description}
      </dt>
      <dd aria-labelledby={termId} className="flex gap-1">
        <ShortcutKeyCaps shortcut={shortcut} isMac={isMac} />
      </dd>
    </div>
  )
}

function ShortcutGroup({ group, isMac }: ShortcutGroupProps) {
  const shortcuts = allShortcuts.filter((shortcut) => shortcut.group === group)
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted">{group}</h3>
      <dl className="flex flex-col gap-2">
        {shortcuts.map((shortcut) => (
          <ShortcutEntry key={shortcut.description} shortcut={shortcut} isMac={isMac} />
        ))}
      </dl>
    </section>
  )
}

export function ShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const isMac = use(IsMacContext)

  useKeyboardShortcut("showShortcuts", () => setIsOpen(true))

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <IconButton label="Close" icon={X} onClick={() => setIsOpen(false)} />
        </div>
        <div className="flex flex-col gap-4">
          {shortcutGroups.map((group) => (
            <ShortcutGroup key={group} group={group} isMac={isMac} />
          ))}
        </div>
      </DialogContent>
    </DialogPrimitive.Root>
  )
}
