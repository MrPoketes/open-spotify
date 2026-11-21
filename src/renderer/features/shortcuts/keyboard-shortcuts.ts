import type { KeyCombo } from "./key-combo"

// In the order the shortcuts dialog lists them.
export const shortcutGroups = ["Playback", "General", "Focused row"] as const

export type ShortcutGroupName = (typeof shortcutGroups)[number]

interface KeyboardShortcut {
  readonly description: string
  readonly group: ShortcutGroupName
  readonly keys: KeyCombo
  // Set only where macOS has its own convention.
  readonly macKeys?: KeyCombo
}

// Every shortcut that works anywhere in the window, in the order the
// shortcuts dialog lists them.
export const windowShortcuts = {
  playOrPause: { description: "Play or pause", group: "Playback", keys: { key: " " } },
  nextTrack: {
    description: "Next track",
    group: "Playback",
    keys: { key: "ArrowRight", primary: true },
  },
  previousTrack: {
    description: "Previous track",
    group: "Playback",
    keys: { key: "ArrowLeft", primary: true },
  },
  toggleShuffle: {
    description: "Turn shuffle on or off",
    group: "Playback",
    keys: { key: "s", primary: true },
  },
  // Electron's default menu takes Cmd/Ctrl+R for Reload, so repeat uses L,
  // for loop.
  cycleRepeat: {
    description: "Change repeat",
    group: "Playback",
    keys: { key: "l", primary: true },
  },
  focusSearch: { description: "Search", group: "General", keys: { key: "/" } },
  // The shortcuts each platform's browsers use, so they work from muscle
  // memory.
  goBack: {
    description: "Go back",
    group: "General",
    keys: { key: "ArrowLeft", alt: true },
    macKeys: { key: "[", primary: true },
  },
  goForward: {
    description: "Go forward",
    group: "General",
    keys: { key: "ArrowRight", alt: true },
    macKeys: { key: "]", primary: true },
  },
  toggleQueue: {
    description: "Show or hide the queue",
    group: "General",
    keys: { key: "q", alt: true, shift: true },
  },
  showShortcuts: { description: "Show keyboard shortcuts", group: "General", keys: { key: "?" } },
} satisfies Record<string, KeyboardShortcut>

export type WindowShortcutName = keyof typeof windowShortcuts

// Shortcuts that act on the focused row of a list. Their buttons stay out of
// the tab order (docs/design.md), so the shortcuts dialog is where a keyboard
// user finds them.
export const rowShortcuts = {
  togglePin: {
    description: "Pin or unpin a library entry",
    group: "Focused row",
    keys: { key: "p" },
  },
  renameFolder: {
    description: "Rename a folder in the sidebar",
    group: "Focused row",
    keys: { key: "F2" },
  },
  // Most Mac keyboards have no forward Delete key, and label Backspace "delete".
  deleteTheme: {
    description: "Delete an imported theme",
    group: "Focused row",
    keys: { key: "Delete" },
    macKeys: { key: "Backspace" },
  },
} satisfies Record<string, KeyboardShortcut>

export type RowShortcutName = keyof typeof rowShortcuts

export const shortcutKeys = (shortcut: KeyboardShortcut, isMac: boolean) =>
  isMac ? (shortcut.macKeys ?? shortcut.keys) : shortcut.keys
