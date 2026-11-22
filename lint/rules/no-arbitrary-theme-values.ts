import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"
import { stringTextVisitor, tailwindClasses } from "../tailwind-classes.ts"

const arbitraryValueGroups = [
  {
    messageId: "arbitraryRadius",
    pattern: /^rounded(?:-(?:t|r|b|l|s|e|tl|tr|br|bl|ss|se|ee|es))?-\[.+\]$/,
  },
  {
    messageId: "arbitraryFont",
    pattern: /^font-\[.+\]$/,
  },
  {
    messageId: "arbitraryShadow",
    pattern: /^(?:(?:inset|drop|text)-)?shadow-\[.+\](?:\/\S+)?$/,
  },
] as const

// src/renderer/styles/app.css clears Tailwind's default font, radius, and
// shadow scales so named classes resolve only to the tokens in
// src/shared/theme.ts. Arbitrary bracket values still bypass the theme.
export const noArbitraryThemeValues = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow arbitrary font, radius, and shadow classes that bypass the theme tokens",
    },
    messages: {
      arbitraryFont:
        'Arbitrary font class "{{className}}" ignores the theme. Use font-body or font-display.',
      arbitraryRadius:
        'Arbitrary radius class "{{className}}" ignores the theme. Use rounded-small, rounded-medium, rounded-large, rounded-full, or rounded-none.',
      arbitraryShadow:
        'Arbitrary shadow class "{{className}}" ignores the theme. Use shadow-raised, shadow-overlay, or shadow-none.',
    },
  },
  create(context) {
    function reportArbitraryThemeValues(node: ESTree.Node, text: string) {
      for (const { className, utility } of tailwindClasses(text)) {
        const matchedGroup = arbitraryValueGroups.find(({ pattern }) => pattern.test(utility))
        if (matchedGroup !== undefined) {
          context.report({ node, messageId: matchedGroup.messageId, data: { className } })
        }
      }
    }
    return stringTextVisitor(reportArbitraryThemeValues)
  },
})
