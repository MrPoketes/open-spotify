import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"
import { themeTokenSchemas } from "../../src/shared/theme.ts"
import {
  interpolationPlaceholder,
  stringTextVisitor,
  tailwindClasses,
} from "../tailwind-classes.ts"

const ringOffsetPrefix = "ring-offset-"
const numericWidth = /^\d+(?:\.\d+)?$/
const arbitraryLength = /^(?:\d+(?:\.\d+)?|\.\d+)(?:[a-z]+|%)$/i
const arbitraryMathLength = /^(?:calc|min|max|clamp)\(/i
const cssLengthUnit = /(?:[a-z]+|%)$/i

const colorTokenNames = new Set(
  Object.keys(themeTokenSchemas)
    .filter((token) => token.startsWith("color-"))
    .map((token) => token.slice("color-".length)),
)

// Tailwind registers `--tw-ring-offset-color` with initial-value `#fff`, which
// `@theme inline { --color-*: initial }` does not clear. Any non-zero
// `ring-offset-<width>` therefore draws a white gap on dark themes unless
// paired with a theme token color under the same or broader variants.
export const requireRingOffsetColor = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require a theme token color whenever a ring-offset width class is used",
    },
    messages: {
      missingRingOffsetColor:
        'Ring offset class "{{className}}" falls back to Tailwind\'s hard-coded #fff offset color. Pair it with a theme token color such as ring-offset-surface.',
    },
  },
  create(context) {
    function reportMissingRingOffsetColor(node: ESTree.Node, text: string) {
      if (!text.includes(ringOffsetPrefix)) {
        return
      }
      const classes = tailwindClasses(text)
      const colorVariantSets = classes
        .filter(({ utility }) => isRingOffsetTokenColor(utility))
        .map(({ variants }) => variants)

      for (const { className, variants, utility } of classes) {
        if (!isRingOffsetWidth(utility)) {
          continue
        }
        const hasMatchingColor = colorVariantSets.some((colorVariants) =>
          colorVariants.every((variant) => variants.includes(variant)),
        )
        if (!hasMatchingColor) {
          context.report({ node, messageId: "missingRingOffsetColor", data: { className } })
        }
      }
    }
    return stringTextVisitor(reportMissingRingOffsetColor)
  },
})

function isRingOffsetWidth(utility: string): boolean {
  if (!utility.startsWith(ringOffsetPrefix)) {
    return false
  }
  const value = utility.slice(ringOffsetPrefix.length)
  if (numericWidth.test(value)) {
    return Number(value) > 0
  }
  return isArbitraryLength(value)
}

function isArbitraryLength(value: string): boolean {
  if (!value.startsWith("[") || !value.endsWith("]")) {
    return false
  }
  const inner = value.slice(1, -1)
  if (inner.startsWith("length:")) {
    return true
  }
  if (arbitraryLength.test(inner)) {
    return Number.parseFloat(inner) > 0
  }
  return (
    arbitraryMathLength.test(inner) ||
    (inner.includes(interpolationPlaceholder) && cssLengthUnit.test(inner))
  )
}

function isRingOffsetTokenColor(utility: string): boolean {
  if (!utility.startsWith(ringOffsetPrefix)) {
    return false
  }
  const [colorName = "", opacity, extra] = utility.slice(ringOffsetPrefix.length).split("/")
  if (extra !== undefined || opacity === "") {
    return false
  }
  return colorTokenNames.has(colorName)
}
