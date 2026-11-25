import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"

// Raw invisible and format characters vanish in editors and diffs and can be
// stripped on copy-paste without warning. Built-in no-irregular-whitespace
// checks only between tokens, so literals and JSX text need their own check.
const rawInvisibleCharacters = /[\u00A0\u200B-\u200D\u2028\u2029\u2060\uFEFF]/g

export const noRawInvisibleCharacters = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw invisible or format characters in string literals, template literals, and JSX text",
    },
    messages: {
      rawInvisibleCharacter:
        "Raw invisible character U+{{codePoint}} is hidden in source. Write it as \\u{{codePoint}} instead.",
      rawInvisibleCharacterInJsx:
        'Raw invisible character U+{{codePoint}} is hidden in JSX. Write it in a string expression using \\u{{codePoint}} (for example, {"\\u{{codePoint}}"}) instead.',
    },
  },
  create(context) {
    function reportInvisibleCharacters(
      node: ESTree.Node,
      rawText: string,
      messageId: "rawInvisibleCharacter" | "rawInvisibleCharacterInJsx",
    ) {
      for (const [character] of rawText.matchAll(rawInvisibleCharacters)) {
        context.report({
          node,
          messageId,
          data: { codePoint: formatCodePoint(character) },
        })
      }
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") {
          return
        }
        const messageId =
          node.parent.type === "JSXAttribute"
            ? "rawInvisibleCharacterInJsx"
            : "rawInvisibleCharacter"
        reportInvisibleCharacters(node, context.sourceCode.getText(node), messageId)
      },
      TemplateElement(node) {
        reportInvisibleCharacters(node, node.value.raw, "rawInvisibleCharacter")
      },
      JSXText(node) {
        reportInvisibleCharacters(
          node,
          context.sourceCode.getText(node),
          "rawInvisibleCharacterInJsx",
        )
      },
    }
  },
})

function formatCodePoint(character: string): string {
  return character.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")
}
