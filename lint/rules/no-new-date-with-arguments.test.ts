import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noNewDateWithArguments } from "./no-new-date-with-arguments.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const expectedMessage =
  "Decode dates with Schema.DateFromString at the boundary instead of calling new Date(...) with arguments."

ruleTester.run("no-new-date-with-arguments", noNewDateWithArguments, {
  valid: [
    "new Date()",
    "new globalThis.Date()",
    'new CustomDate("2026-01-01")',
    'new clock.Date("2026-01-01")',
    "Date.UTC(2026, 0, 1)",
  ],
  invalid: [
    {
      code: 'new Date("2026-01-01")',
      errors: [{ message: expectedMessage }],
    },
    {
      code: "new Date(addedAt)",
      errors: [{ messageId: "noNewDateWithArguments" }],
    },
    {
      code: "new Date(2026, 0, 1)",
      errors: [{ messageId: "noNewDateWithArguments" }],
    },
    {
      code: "new Date(...parts)",
      errors: [{ messageId: "noNewDateWithArguments" }],
    },
    {
      code: 'new globalThis.Date("2026-01-01")',
      errors: [{ messageId: "noNewDateWithArguments" }],
    },
    {
      code: "new window.Date(value)",
      errors: [{ messageId: "noNewDateWithArguments" }],
    },
    {
      code: 'new self["Date"](value)',
      errors: [{ messageId: "noNewDateWithArguments" }],
    },
  ],
})
