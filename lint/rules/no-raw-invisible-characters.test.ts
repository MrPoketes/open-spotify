import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noRawInvisibleCharacters } from "./no-raw-invisible-characters.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

ruleTester.run("no-raw-invisible-characters", noRawInvisibleCharacters, {
  valid: [
    'const escaped = "\\uFEFF\\u200B\\u200C\\u200D\\u2060\\u00A0\\u2028\\u2029"',
    "const template = `\\uFEFF${value}\\u{200B}`",
    "const whitespace = `hello\tworld\nnext line`",
    {
      code: '<p title="hello&nbsp;world">Hello{"\\u00A0"}&nbsp;world</p>',
      filename: "view.tsx",
    },
  ],
  invalid: [
    {
      code: 'const bom = "\uFEFF"',
      errors: [
        {
          message:
            "Raw invisible character U+FEFF is hidden in source. Write it as \\uFEFF instead.",
        },
      ],
    },
    {
      code: 'const chars = "\u200B\u200C\u200D\u2060\u00A0"',
      errors: [
        { messageId: "rawInvisibleCharacter", data: { codePoint: "200B" } },
        { messageId: "rawInvisibleCharacter", data: { codePoint: "200C" } },
        { messageId: "rawInvisibleCharacter", data: { codePoint: "200D" } },
        { messageId: "rawInvisibleCharacter", data: { codePoint: "2060" } },
        { messageId: "rawInvisibleCharacter", data: { codePoint: "00A0" } },
      ],
    },
    {
      code: 'const separators = "\u2028\u2029"',
      errors: [
        { messageId: "rawInvisibleCharacter", data: { codePoint: "2028" } },
        { messageId: "rawInvisibleCharacter", data: { codePoint: "2029" } },
      ],
    },
    {
      code: "const template = `\uFEFF${value}\u200B`",
      errors: [
        { messageId: "rawInvisibleCharacter", data: { codePoint: "FEFF" } },
        { messageId: "rawInvisibleCharacter", data: { codePoint: "200B" } },
      ],
    },
    {
      code: "<p>Hello\u00A0world</p>",
      filename: "view.tsx",
      errors: [
        {
          message:
            'Raw invisible character U+00A0 is hidden in JSX. Write it in a string expression using \\u00A0 (for example, {"\\u00A0"}) instead.',
        },
      ],
    },
    {
      code: '<p title="Hello\u200Bworld" />',
      filename: "view.tsx",
      errors: [{ messageId: "rawInvisibleCharacterInJsx", data: { codePoint: "200B" } }],
    },
  ],
})
