// A panel at the Overlay level (docs/design.md, Elevation) that fades in and
// rises 8 px as it appears (docs/design.md, Motion): the device picker, modal
// dialogs, and the status message.
export const overlayPanelClassName =
  "rounded-large bg-surface-overlay shadow-overlay transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0"
