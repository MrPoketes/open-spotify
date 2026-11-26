import { pointerWithin, type CollisionDetection, type DragMoveEvent } from "@dnd-kit/core"

// dnd-kit's drag events say how far the dragged row has moved, which also
// counts scrolling and shifts of the row itself, such as when a branch above
// it opens. Only collision detection sees where the pointer is, so it passes
// that on with the row under the pointer.
export const rowUnderPointer: CollisionDetection = (args) =>
  pointerWithin(args).map((collision) => ({
    ...collision,
    data: { ...collision.data, pointerY: args.pointerCoordinates?.y },
  }))

export const pointerYOf = ({ collisions }: DragMoveEvent) => {
  const collisionData: Record<string, unknown> | undefined = collisions?.[0]?.data
  const pointerY = collisionData?.["pointerY"]
  return typeof pointerY === "number" ? pointerY : undefined
}
