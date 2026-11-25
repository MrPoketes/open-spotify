import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noDomNodeAccess } from "./no-dom-node-access.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run("no-dom-node-access", noDomNodeAccess, {
  valid: [
    {
      code: 'within(secondRow).queryAllByRole("presentation")',
      filename: "src/renderer/ui/view.test.tsx",
    },
    {
      code: "function Wrapper({ children }: { readonly children: ReactNode }) { return <div>{children}</div> }",
      filename: "src/renderer/ui/view.test.tsx",
    },
    {
      code: 'const row = rowsRef.current?.closest("main")?.firstElementChild; const first = node.children[0]',
      filename: "src/renderer/features/track-list/track-list.tsx",
    },
    {
      code: 'import { helper } from "./vitest-helper"; export const parent = (el: Element) => el.parentElement',
      filename: "src/renderer/ui/row.ts",
    },
  ],
  invalid: [
    {
      code: 'secondRow.querySelectorAll("img")',
      filename: "src/renderer/ui/view.test.tsx",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: 'document.getElementsByClassName("row")',
      filename: "src/renderer/ui/view.test.tsx",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: "title.parentElement",
      filename: "src/renderer/ui/view.test.tsx",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: "row?.firstChild",
      filename: "src/renderer/ui/view.test.tsx",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: 'row["children"]',
      filename: "src/renderer/ui/view.test.tsx",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: "title.parentElement",
      filename: "src/renderer/ui/view.test.ts",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: 'import { screen } from "@testing-library/react"\nexport const dropPositionOn = (name: string) => screen.getByRole("treeitem", { name }).parentElement',
      filename: "src/renderer/features/folders/sidebar-folder-tree-screen.tsx",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: 'import { userEvent } from "@testing-library/user-event"\nexport const rows = () => [...document.querySelectorAll("[role=none]")]',
      filename: "src/renderer/lib/pointer-helper.ts",
      errors: [{ messageId: "domNodeAccess" }],
    },
    {
      code: 'import { onTestFinished } from "vitest"\nexport const find = () => document.querySelector("main")',
      filename: "src/renderer/lib/helper.ts",
      errors: [{ messageId: "domNodeAccess" }],
    },
  ],
})
