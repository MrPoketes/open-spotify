import { MonitorSpeaker } from "lucide-react"
import { useCallback, useEffect, useId, useRef, type RefObject } from "react"
import { buttonVariants } from "../../ui/button-variants"
import { cn } from "../../ui/class-names"
import { creditsLabelClassName } from "../../ui/credits-label-class-name"
import { DeviceList } from "./device-list"

interface DevicePickerProps {
  readonly deviceLabel: string
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
}

export function DevicePicker({ deviceLabel, isOpen, onOpenChange }: DevicePickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // The picker can also be opened from the bar's "no active device" message,
  // which disappears once a device is chosen, so focus always returns to the
  // picker's own button.
  const closeAndRestoreFocus = useCallback(() => {
    onOpenChange(false)
    buttonRef.current?.focus()
  }, [onOpenChange])

  // Stable callbacks keep the panel from re-adding its document listeners
  // every time a poll re-renders the bar.
  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  return (
    <div ref={pickerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Choose a device. ${deviceLabel}`}
        onClick={() => onOpenChange(!isOpen)}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-w-60 rounded-full")}
      >
        <MonitorSpeaker aria-hidden size={16} />
        <span className="truncate">{deviceLabel}</span>
      </button>
      {isOpen && (
        <DevicePickerPanel
          pickerRef={pickerRef}
          onClose={close}
          onCloseAndRestoreFocus={closeAndRestoreFocus}
        />
      )}
    </div>
  )
}

interface DevicePickerPanelProps {
  readonly pickerRef: RefObject<HTMLDivElement | null>
  readonly onClose: () => void
  readonly onCloseAndRestoreFocus: () => void
}

// Not a modal dialog: clicking or tabbing anywhere outside the picker closes
// it, and Escape closes it from the keyboard.
function DevicePickerPanel({ pickerRef, onClose, onCloseAndRestoreFocus }: DevicePickerPanelProps) {
  const headingId = useId()
  const panelRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const isOutsidePicker = (target: EventTarget | null) =>
      target instanceof Node && !pickerRef.current?.contains(target)
    const closeOnOutsideEvent = (event: Event) => {
      if (isOutsidePicker(event.target)) {
        onClose()
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseAndRestoreFocus()
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideEvent)
    document.addEventListener("focusin", closeOnOutsideEvent)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideEvent)
      document.removeEventListener("focusin", closeOnOutsideEvent)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [pickerRef, onClose, onCloseAndRestoreFocus])

  return (
    <dialog
      ref={panelRef}
      open
      aria-labelledby={headingId}
      tabIndex={-1}
      className="absolute right-0 bottom-full left-auto mb-3 flex w-80 flex-col gap-1 rounded-large bg-surface-overlay p-2 text-foreground shadow-overlay transition-[opacity,translate] duration-200 ease-out starting:translate-y-2 starting:opacity-0"
    >
      <h2 id={headingId} className={`px-3 pt-2 pb-1 ${creditsLabelClassName}`}>
        Connect to a device
      </h2>
      <DeviceList onDeviceChosen={onCloseAndRestoreFocus} />
    </dialog>
  )
}
