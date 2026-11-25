import { defineRule, type ESTree } from "@oxlint/plugins"
import { findJsxAttribute, jsxAttributeStrings } from "../jsx-attributes.ts"
import { tailwindClasses } from "../tailwind-classes.ts"

const headingElements = new Set(["h1", "h2", "h3"])
const headingSizeUtilities = new Set(["text-xl", "text-3xl", "text-5xl"])
const displayFontUtility = "font-display"

// docs/design.md (Type) assigns font-display to headings at text-xl and larger
// so a theme can give headings their own typeface without skipping any.
export const requireHeadingFontDisplay = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require font-display on h1, h2, and h3 headings sized text-xl or larger",
    },
    messages: {
      missingFontDisplay:
        '<{{element}}> uses "{{className}}" without font-display, so a theme\'s heading font skips it. Add font-display.',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(element) {
        if (element.name.type !== "JSXIdentifier" || !headingElements.has(element.name.name)) {
          return
        }
        const classNameAttribute = findJsxAttribute(element, "className")
        if (classNameAttribute === undefined) {
          return
        }
        const offendingClass = findMissingDisplayClass(classNameAttribute)
        if (offendingClass !== undefined) {
          context.report({
            node: classNameAttribute,
            messageId: "missingFontDisplay",
            data: { element: element.name.name, className: offendingClass },
          })
        }
      },
    }
  },
})

function findMissingDisplayClass(attribute: ESTree.JSXAttribute): string | undefined {
  for (const classList of jsxAttributeStrings(attribute)) {
    const offendingClass = firstUncoveredHeadingSize(classList)
    if (offendingClass !== undefined) {
      return offendingClass
    }
  }
  return undefined
}

function firstUncoveredHeadingSize(classList: string): string | undefined {
  const classes = tailwindClasses(classList)
  const displayVariantSets = classes
    .filter(({ utility }) => utility === displayFontUtility)
    .map(({ variants }) => variants)

  for (const { className, variants, utility } of classes) {
    if (!isHeadingSizeUtility(utility)) {
      continue
    }
    const hasMatchingDisplayFont = displayVariantSets.some((displayVariants) =>
      displayVariants.every((variant) => variants.includes(variant)),
    )
    if (!hasMatchingDisplayFont) {
      return className
    }
  }
  return undefined
}

function isHeadingSizeUtility(utility: string): boolean {
  const [size = "", lineHeight, extra] = utility.split("/")
  if (extra !== undefined || lineHeight === "") {
    return false
  }
  return headingSizeUtilities.has(size)
}
