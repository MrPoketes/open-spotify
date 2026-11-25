import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { requireHeadingFontDisplay } from "./require-heading-font-display.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const validCases = [
  '<h1 className="font-display text-5xl font-bold">Album</h1>',
  '<h2 className="font-display text-xl font-bold">Queue</h2>',
  '<h3 className="font-display text-3xl font-bold">Section</h3>',
  '<h3 className="text-sm font-semibold text-muted">Folders</h3>',
  '<h2 className="text-base font-bold">Connect to a device</h2>',
  '<p className="text-xl font-bold">Summary</p>',
  '<h4 className="text-xl font-bold">Subsection</h4>',
  '<h2 className="md:text-xl font-display">Responsive</h2>',
  '<h2 className="md:text-xl md:font-display">Responsive</h2>',
  '<h2 className="!text-xl font-display!">Important</h2>',
  '<h2 className={`font-display ${large ? "text-3xl" : "text-xl"} font-bold`}>Title</h2>',
  '<h2 className={large ? "font-display text-3xl font-bold" : "text-sm font-semibold"}>Title</h2>',
  "<h2 className={headingClass}>Title</h2>",
  "<h2 className={`text-${size} font-bold`}>Title</h2>",
]

ruleTester.run("require-heading-font-display", requireHeadingFontDisplay, {
  valid: validCases.map((code) => ({ code, filename: "view.tsx" })),
  invalid: [
    {
      code: '<h2 className="text-xl font-bold">Queue</h2>',
      filename: "view.tsx",
      errors: [
        {
          message:
            '<h2> uses "text-xl" without font-display, so a theme\'s heading font skips it. Add font-display.',
        },
      ],
    },
    {
      code: '<h1 className="text-3xl font-bold">Home</h1>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h1", className: "text-3xl" } }],
    },
    {
      code: '<h1 className="text-5xl font-bold">Album</h1>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h1", className: "text-5xl" } }],
    },
    {
      code: '<h3 className="text-xl font-bold">Edit</h3>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h3", className: "text-xl" } }],
    },
    {
      code: '<h2 className={"text-xl font-bold"}>Queue</h2>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h2", className: "text-xl" } }],
    },
    {
      code: '<h2 className="text-xl/tight font-bold">Queue</h2>',
      filename: "view.tsx",
      errors: [
        { messageId: "missingFontDisplay", data: { element: "h2", className: "text-xl/tight" } },
      ],
    },
    {
      code: '<h2 className="!text-xl font-bold">Queue</h2>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h2", className: "!text-xl" } }],
    },
    {
      code: '<h2 className="text-xl hover:font-display">Queue</h2>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h2", className: "text-xl" } }],
    },
    {
      code: '<h2 className="md:text-xl lg:font-display">Queue</h2>',
      filename: "view.tsx",
      errors: [
        { messageId: "missingFontDisplay", data: { element: "h2", className: "md:text-xl" } },
      ],
    },
    {
      code: '<h2 className={`text-xl font-bold ${isCurrent ? "text-accent" : ""}`}>Queue</h2>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h2", className: "text-xl" } }],
    },
    {
      code: '<h2 className={large ? "text-3xl font-bold" : "text-sm font-semibold"}>Title</h2>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h2", className: "text-3xl" } }],
    },
    {
      code: '<h2 className={`text-xl ${useDisplay ? "font-display" : "font-body"}`}>Title</h2>',
      filename: "view.tsx",
      errors: [{ messageId: "missingFontDisplay", data: { element: "h2", className: "text-xl" } }],
    },
  ],
})
