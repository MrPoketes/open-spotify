import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import type { ReactNode, RefObject } from "react"
import { cn } from "./class-names"

// shadcn/ui's Dialog, restyled to docs/design.md (Dialogs). Base UI moves
// focus into the dialog, keeps it there, closes it on Escape or a click on
// the backdrop, and gives focus back to where it was when it closes.

// Centered in the window, less a 16 px margin on every side; a dialog taller
// than that scrolls. It fades in and rises 8 px as it opens, and sinks back as
// it closes.
export function DialogContent({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 isolate z-50 bg-canvas/60 transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <DialogPrimitive.Viewport className="fixed inset-0 isolate z-50 flex items-center justify-center p-4">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "max-h-full overflow-y-auto rounded-large bg-surface-overlay text-foreground shadow-overlay",
            "transition-[opacity,translate] duration-200 ease-out data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-display text-xl font-bold", className)}
      {...props}
    />
  )
}

interface DialogProps {
  readonly title: string
  // Its buttons close it through these.
  readonly actionsRef: RefObject<DialogPrimitive.Root.Actions | null>
  readonly onClosed: () => void
  readonly children: ReactNode
}

// A 320 px dialog that opens as it mounts. Its owner unmounts it from
// onClosed, once it has faded out and given focus back.
export function Dialog({ title, actionsRef, onClosed, children }: DialogProps) {
  return (
    <DialogPrimitive.Root
      defaultOpen
      actionsRef={actionsRef}
      onOpenChangeComplete={(open) => {
        if (!open) onClosed()
      }}
    >
      <DialogContent className="flex w-80 flex-col gap-4 p-4">
        <DialogTitle>{title}</DialogTitle>
        {children}
      </DialogContent>
    </DialogPrimitive.Root>
  )
}
