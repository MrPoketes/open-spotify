import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noFixedStyleLengths } from "./no-fixed-style-lengths.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const expectedMessage =
  "height is a fixed length, so the theme's spacing token cannot scale it. Use a spacing-scale class such as pt-4 or h-14, or calc(var(--theme-spacing) * n). A style prop holds only values worked out at run time."

// JSX parses only in a .tsx file.
const filename = "view.tsx"

const validCases = [
  "<nav style={{ width }} />",
  "const [width, setWidth] = useState(savedWidth); <aside style={{ width }} />",
  "<div style={{ height: virtualizer.getTotalSize() }} />",
  "<div style={{ paddingLeft: `calc(var(--theme-spacing) * ${(level - 1) * levelSteps})` }} />",
  "const levelSteps = 4; function Row({ level }) { const indent = `calc(var(--theme-spacing) * ${level * levelSteps})`; return <div style={{ paddingLeft: indent }} /> }",
  "<div style={{ padding: 0 }} />",
  "<div style={{ opacity: 0.5, zIndex: 10, flexGrow: 1 }} />",
  "const coverSize = 224; <img width={coverSize} />",
  "function Row({ level }) { const indent = level - 1; return <div style={{ paddingLeft: indent }} /> }",
  "<div style={layout.style} />",
  "<div style={{ left: `${dragOffset}px`, width: `calc(100% - ${dragOffset}px)` }} />",
  "const layout = { height: 56 }",
]

const invalidCases = [
  {
    code: "const coverSize = 224; <div style={{ width: coverSize, height: coverSize }} />",
    errors: [{ messageId: "fixedStyleLength" }, { messageId: "fixedStyleLength" }],
  },
  {
    code: "<header style={{ height: 56 }} />",
    errors: [{ message: expectedMessage }],
  },
  {
    code: "const topBarHeight = 56; <header style={{ height: topBarHeight }} />",
    errors: [{ messageId: "fixedStyleLength" }],
  },
  {
    code: 'import { mainViewContentTop } from "./main-view-insets"; <main style={{ paddingTop: mainViewContentTop }} />',
    errors: [{ messageId: "fixedStyleLength" }],
  },
  {
    code: "const levelIndent = 16; function Row({ level }) { const indent = (level - 1) * levelIndent; return <div style={{ paddingLeft: indent }} /> }",
    errors: [{ messageId: "fixedStyleLength" }],
  },
  {
    code: "const collapsedWidth = 72; <nav style={{ width: isCollapsed ? collapsedWidth : width }} />",
    errors: [{ messageId: "fixedStyleLength" }],
  },
  {
    code: '<div style={{ marginTop: "16px", scrollPaddingTop: "4rem", insetInlineStart: 8 }} />',
    errors: [
      { messageId: "fixedStyleLength" },
      { messageId: "fixedStyleLength" },
      { messageId: "fixedStyleLength" },
    ],
  },
  {
    code: "const offset = 12; <div style={{ top: `${offset}px` }} />",
    errors: [{ messageId: "fixedStyleLength" }],
  },
  {
    code: "<div style={{ marginLeft: `calc(100% - 16px)` }} />",
    errors: [{ messageId: "fixedStyleLength" }],
  },
  {
    code: "<div style={{ gap: 8 as number }} />",
    errors: [{ messageId: "fixedStyleLength" }],
  },
].map((invalidCase) => ({ ...invalidCase, filename }))

ruleTester.run("no-fixed-style-lengths", noFixedStyleLengths, {
  valid: validCases.map((code) => ({ code, filename })),
  invalid: invalidCases,
})
