import type { KeyCombo } from "./key-combo"

interface KeyboardShortcut {
  readonly description: string
  readonly group: "Playback" | "General"
  readonly keys: KeyCombo
  // Set only where macOS has its own convention.
  readonly macKeys?: KeyCombo
}

// Every app-wide shortcut, in the order the shortcuts dialog lists them.
export const keyboardShortcuts = {
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

export type KeyboardShortcutName = keyof typeof keyboardShortcuts

export const shortcutKeys = (shortcut: KeyboardShortcut, isMac: boolean) =>
  isMac ? (shortcut.macKeys ?? shortcut.keys) : shortcut.keys
