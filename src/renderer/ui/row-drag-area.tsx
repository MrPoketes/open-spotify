import {
  DndContext,
  MeasuringStrategy,
  PointerSensor,
  type PointerSensorOptions,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { type PointerEvent, type ReactNode, useState } from "react"
import { rowUnderPointer } from "./row-under-pointer"

// A press that moves less than this is a click on the row.
const dragStartDistance = 4

// A press in a text field, such as a rename field, selects text. A press in a
// menu that a row opened reaches the row through React even though the menu
// is drawn elsewhere on the page. Neither starts a drag.
const pressStartsDrag = ({ target, currentTarget }: PointerEvent) =>
  target instanceof Element &&
  currentTarget.contains(target) &&
  target.closest("input, textarea, [contenteditable]") === null

class RowPointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: "onPointerDown" as const,
      handler: (event: PointerEvent, options: PointerSensorOptions) =>
        pressStartsDrag(event) &&
        PointerSensor.activators.every(({ handler }) => handler(event, options)),
    },
  ]
}

// Letting go over the row the drag started on clicks that row, such as its
// link. dnd-kit stops that click before React sees it but leaves the browser's
// default, which would load the link's page in full, so the click is cancelled
// too. Like dnd-kit, this stops listening for the click after 50 ms.
const cancelClick = (event: MouseEvent) => event.preventDefault()

const cancelClickAfterDrag = () => {
  window.addEventListener("click", cancelClick, { capture: true })
  setTimeout(() => window.removeEventListener("click", cancelClick, { capture: true }), 50)
}

// Rows inside the area can be dragged with the mouse onto drop targets
// anywhere else inside it, such as a tree that rearranges its own rows.
// Keyboard users have the owners' own commands for the same moves, so the
// area adds no keyboard sensor, whose Space and Enter would clash with the
// rows'.
export function RowDragArea({ children }: { readonly children: ReactNode }) {
  const sensors = useSensors(
    useSensor(RowPointerSensor, { activationConstraint: { distance: dragStartDistance } }),
  )
  // dnd-kit's live region and its instructions for picking items up with the
  // keyboard would tell screen reader users about drags they cannot make, so
  // they go into an element that is never on the page. The drop targets
  // report each drop in their own words.
  const [offPageContainer] = useState(() => document.createElement("div"))
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rowUnderPointer}
      // An expanding branch puts new rows under the pointer mid-drag.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ container: offPageContainer }}
      onDragEnd={cancelClickAfterDrag}
      onDragCancel={cancelClickAfterDrag}
    >
      {children}
    </DndContext>
  )
}
