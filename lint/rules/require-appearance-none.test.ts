import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { requireAppearanceNone } from "./require-appearance-none.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const validCases = [
  '<input type="range" className="appearance-none bg-transparent" />',
  '<input type="checkbox" className="size-4 appearance-none rounded-small bg-surface-raised" />',
  '<input type="radio" className="size-4 appearance-none rounded-full bg-surface-raised" />',
  '<progress className="appearance-none bg-muted" value={0.5} />',
  '<meter className="appearance-none bg-muted" value={0.5} />',
  '<input type="range" className="!appearance-none" />',
  '<input type="range" className="appearance-none!" />',
  '<input type="range" className={"appearance-none w-full"} />',
  '<input type="range" className={`appearance-none ${extra}`} />',
  '<input type="radio" className={selected ? "appearance-none bg-accent" : "appearance-none bg-surface-raised"} />',
  '<input type="text" className="bg-surface-raised" />',
  '<input className="bg-surface-raised" />',
  '<input type="color" className="bg-surface-raised" />',
  '<input type={inputType} className="bg-surface-raised" />',
  '<Input type="range" className="w-full" />',
  '<Progress className="w-full" />',
  '<Meter className="w-full" />',
]

ruleTester.run("require-appearance-none", requireAppearanceNone, {
  valid: validCases.map((code) => ({ code, filename: "view.tsx" })),
  invalid: [
    {
      code: '<input type="range" className="w-full accent-accent" />',
      filename: "view.tsx",
      errors: [
        {
          message:
            '<input type="range"> is partly drawn by the browser unless its className includes appearance-none, bypassing theme tokens. Add appearance-none and style its parts with theme tokens.',
        },
      ],
    },
    {
      code: '<input type="checkbox" className="size-4 accent-accent" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="checkbox"' } }],
    },
    {
      code: '<input type="radio" className="size-4 accent-accent" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="radio"' } }],
    },
    {
      code: '<progress className="w-full accent-accent" value={0.5} />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: "progress" } }],
    },
    {
      code: '<meter className="w-full accent-accent" value={0.5} />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: "meter" } }],
    },
    {
      code: '<input type="radio" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="radio"' } }],
    },
    {
      code: '<input type={"range"} className="w-full" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="range"' } }],
    },
    {
      code: '<input type="RANGE" className="w-full" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="range"' } }],
    },
    {
      code: '<input type={multi ? "checkbox" : "radio"} className="w-full" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="checkbox"' } }],
    },
    {
      code: '<input type="range" className="hover:appearance-none" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="range"' } }],
    },
    {
      code: '<input type="range" className="[&::-webkit-slider-thumb]:appearance-none bg-transparent" />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="range"' } }],
    },
    {
      code: '<input type="range" className={`w-full ${extra}`} />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="range"' } }],
    },
    {
      code: '<input type="radio" className={selected ? "appearance-none bg-accent" : "bg-surface-raised"} />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="radio"' } }],
    },
    {
      code: '<input type="range" className={sliderClasses} />',
      filename: "view.tsx",
      errors: [{ messageId: "missingAppearanceNone", data: { control: 'input type="range"' } }],
    },
  ],
})
