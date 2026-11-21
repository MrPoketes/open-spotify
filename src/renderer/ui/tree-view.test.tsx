import { act, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { dragTreeItemOnto, dragTreeItemOver, layOutTreeRows } from "../lib/drag-tree-item"
import type { TreeDrop } from "./tree-drop"
import { TreeView } from "./tree-view"
import type { TreeNode } from "./visible-tree-rows"

const leaf = (name: string): TreeNode<string> => ({ key: name, value: name, children: null })

const branch = (name: string, children: ReadonlyArray<TreeNode<string>>): TreeNode<string> => ({
  key: name,
  value: name,
  children,
})

const library = [
  branch("Running", [leaf("Quiet Rivers"), branch("Warm-up", [leaf("Easy Start")])]),
  branch("Focus", []),
  leaf("Loose track"),
]

interface TreeProps {
  readonly initiallyExpanded: ReadonlyArray<string>
  readonly nodes?: ReadonlyArray<TreeNode<string>>
  readonly onDrop?: (drop: TreeDrop<string>) => void
}

function Tree({ initiallyExpanded, nodes = library, onDrop = () => undefined }: TreeProps) {
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set(initiallyExpanded))
  const toggle = (key: string) => {
    const next = new Set(expandedKeys)
    if (!next.delete(key)) next.add(key)
    setExpandedKeys(next)
  }
  return (
    <>
      <h3 id="folders-heading">Folders</h3>
      <TreeView
        labelledBy="folders-heading"
        nodes={nodes}
        expandedKeys={expandedKeys}
        onToggleExpanded={toggle}
        renderItem={(name, itemProps) => <span {...itemProps}>{name}</span>}
        canDrop={({ dragged, target }) => dragged !== target}
        onDrop={onDrop}
      />
    </>
  )
}

const item = (name: string) => screen.getByRole("treeitem", { name })

const visibleItemNames = () =>
  screen.getAllByRole("treeitem").map((treeItem) => treeItem.textContent)

describe("TreeView", () => {
  it("moves down through the visible items, skipping the children of collapsed ones", async () => {
    render(<Tree initiallyExpanded={["Running"]} />)
    act(() => item("Running").focus())

    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}")

    expect(item("Focus")).toHaveFocus()
    expect(visibleItemNames()).toEqual([
      "Running",
      "Quiet Rivers",
      "Warm-up",
      "Focus",
      "Loose track",
    ])
  })

  it("expands a collapsed item with ArrowRight, then moves into its first child", async () => {
    render(<Tree initiallyExpanded={[]} />)
    act(() => item("Running").focus())

    await userEvent.keyboard("{ArrowRight}")
    expect(item("Running")).toHaveAttribute("aria-expanded", "true")
    expect(item("Running")).toHaveFocus()

    await userEvent.keyboard("{ArrowRight}")
    expect(item("Quiet Rivers")).toHaveFocus()
  })

  // The pattern moves into the first child, and an empty folder has none.
  it("keeps focus on an expanded item without children when ArrowRight is pressed", async () => {
    render(<Tree initiallyExpanded={["Focus"]} />)
    act(() => item("Focus").focus())

    await userEvent.keyboard("{ArrowRight}")

    expect(item("Focus")).toHaveFocus()
  })

  it("moves from a child to its parent with ArrowLeft, then collapses the parent", async () => {
    render(<Tree initiallyExpanded={["Running", "Warm-up"]} />)
    act(() => item("Easy Start").focus())

    await userEvent.keyboard("{ArrowLeft}")
    expect(item("Warm-up")).toHaveFocus()

    await userEvent.keyboard("{ArrowLeft}")
    expect(item("Warm-up")).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("treeitem", { name: "Easy Start" })).not.toBeInTheDocument()
  })

  // Screen readers read the level and position from these attributes, since
  // the flat rendering has no nested groups to count.
  it("tells assistive technology where each item sits in the tree", () => {
    render(<Tree initiallyExpanded={["Running"]} />)

    expect(item("Warm-up")).toHaveAttribute("aria-level", "2")
    expect(item("Warm-up")).toHaveAttribute("aria-posinset", "2")
    expect(item("Warm-up")).toHaveAttribute("aria-setsize", "2")
    expect(item("Loose track")).not.toHaveAttribute("aria-expanded")
  })

  it("keeps the whole tree one tab stop", async () => {
    render(
      <>
        <Tree initiallyExpanded={["Running"]} />
        <button type="button">After the tree</button>
      </>,
    )

    await userEvent.tab()
    expect(item("Running")).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "After the tree" })).toHaveFocus()
  })

  // Alt+Left is the back shortcut on Windows and Linux.
  it("leaves the tree alone when Alt is held with an arrow key", async () => {
    render(<Tree initiallyExpanded={["Running"]} />)
    act(() => item("Running").focus())

    await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}")

    expect(item("Running")).toHaveAttribute("aria-expanded", "true")
  })

  it("expands and collapses an item when its chevron is clicked", async () => {
    render(<Tree initiallyExpanded={[]} nodes={[branch("Running", [leaf("Quiet Rivers")])]} />)
    // The chevron is hidden from assistive technology, so it has no name.
    const chevron = screen.getByRole("button", { hidden: true })

    await userEvent.click(chevron)
    expect(item("Quiet Rivers")).toBeInTheDocument()

    await userEvent.click(chevron)
    expect(item("Running")).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("treeitem", { name: "Quiet Rivers" })).not.toBeInTheDocument()
  })

  // Otherwise collapsing the folder around the focused item would drop focus
  // to the page, and keyboard users would start again from the top.
  it("moves focus to an item whose chevron is clicked", async () => {
    render(
      <Tree initiallyExpanded={["Running"]} nodes={[branch("Running", [leaf("Quiet Rivers")])]} />,
    )
    act(() => item("Quiet Rivers").focus())

    await userEvent.click(screen.getByRole("button", { hidden: true }))

    expect(item("Running")).toHaveFocus()
  })
})

describe("Dragging in a TreeView", () => {
  beforeEach(() => {
    const layout = layOutTreeRows()
    return () => layout.mockRestore()
  })

  it("expands a collapsed branch that a drag rests on", async () => {
    render(<Tree initiallyExpanded={[]} />)

    await dragTreeItemOver(item("Loose track"), item("Running"), 0.5)

    expect(
      await screen.findByRole("treeitem", { name: "Quiet Rivers" }, { timeout: 2000 }),
    ).toBeVisible()
    expect(item("Running")).toHaveAttribute("aria-expanded", "true")
  })

  // A drop on a branch's edge goes beside it, and opening the branch would
  // move the line the drop goes to.
  it("leaves a collapsed branch closed while a drag rests on its edge", async () => {
    render(<Tree initiallyExpanded={[]} />)

    await dragTreeItemOver(item("Loose track"), item("Running"), 0.1)
    await act(() => new Promise((resolve) => setTimeout(resolve, 1000)))

    expect(item("Running")).toHaveAttribute("aria-expanded", "false")
  })

  // The children of an expanded branch sit right below it, so a line drawn
  // below the branch would look like the line above its first child.
  it("drops above the first child when let go at the bottom edge of an expanded branch", async () => {
    const onDrop = vi.fn<(drop: TreeDrop<string>) => void>()
    render(<Tree initiallyExpanded={["Running"]} onDrop={onDrop} />)

    await dragTreeItemOnto(item("Loose track"), item("Running"), 0.9)

    expect(onDrop).toHaveBeenCalledWith({
      dragged: "Loose track",
      target: "Quiet Rivers",
      position: "before",
    })
  })

  // An item is often a link, and the browser would load its page in full on a
  // click that React never sees.
  it("cancels the click that ends a drag over the item it started on", async () => {
    render(<Tree initiallyExpanded={[]} />)
    const clicks: Array<MouseEvent> = []
    const recordClick = (event: MouseEvent) => clicks.push(event)
    window.addEventListener("click", recordClick, { capture: true })

    await dragTreeItemOnto(item("Focus"), item("Focus"), 0.9)

    window.removeEventListener("click", recordClick, { capture: true })
    expect(clicks.map((click) => click.defaultPrevented)).toEqual([true])
  })
})
