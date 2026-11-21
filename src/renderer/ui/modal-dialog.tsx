import { type ReactNode, type RefObject, useEffect, useId } from "react"

interface ModalDialogProps {
  readonly heading: string
  // The owner closes the dialog through it, from its buttons.
  readonly ref: RefObject<HTMLDialogElement | null>
  readonly onClose: () => void
  readonly children: ReactNode
}

// The browser traps focus inside a modal dialog, closes it on Escape, and
// gives focus back to the element that had it before.
export function ModalDialog({ heading, ref, onClose, children }: ModalDialogProps) {
  const headingId = useId()

  useEffect(() => {
    ref.current?.showModal()
  }, [ref])

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      onClose={onClose}
      className="m-auto w-80 rounded-large bg-surface-overlay p-4 text-foreground shadow-overlay transition-[opacity,translate] duration-200 ease-out backdrop:bg-canvas/60 starting:translate-y-2 starting:opacity-0"
    >
      <div className="flex flex-col gap-4">
        <h2 id={headingId} className="font-display text-xl font-bold">
          {heading}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
