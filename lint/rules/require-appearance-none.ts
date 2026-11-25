import { defineRule, type ESTree } from "@oxlint/plugins"
import { findJsxAttribute, jsxAttributeStrings, tailwindClasses } from "../tailwind-classes.ts"

const browserDrawnElements = new Set(["progress", "meter"])
const browserDrawnInputTypes = new Set(["range", "checkbox", "radio"])
const appearanceNoneUtility = "appearance-none"

// Browser-drawn controls take UA colors from color-scheme for parts accent-color
// cannot reach, so theme tokens only own them once appearance-none is set.
export const requireAppearanceNone = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require appearance-none on browser-drawn native controls so theme tokens own every pixel",
    },
    messages: {
      missingAppearanceNone:
        "<{{control}}> is partly drawn by the browser unless its className includes appearance-none, bypassing theme tokens. Add appearance-none and style its parts with theme tokens.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(element) {
        const control = browserDrawnControl(element)
        if (control === undefined) {
          return
        }
        const classNameAttribute = findJsxAttribute(element, "className")
        if (classNameAttribute !== undefined && hasStaticAppearanceNone(classNameAttribute)) {
          return
        }
        context.report({
          node: classNameAttribute ?? element,
          messageId: "missingAppearanceNone",
          data: { control },
        })
      },
    }
  },
})

function browserDrawnControl(element: ESTree.JSXOpeningElement): string | undefined {
  if (element.name.type !== "JSXIdentifier") {
    return undefined
  }
  const tagName = element.name.name
  if (browserDrawnElements.has(tagName)) {
    return tagName
  }
  if (tagName !== "input") {
    return undefined
  }
  const typeAttribute = findJsxAttribute(element, "type")
  if (typeAttribute === undefined) {
    return undefined
  }
  for (const value of jsxAttributeStrings(typeAttribute)) {
    const inputType = value.toLowerCase()
    if (browserDrawnInputTypes.has(inputType)) {
      return `input type="${inputType}"`
    }
  }
  return undefined
}

function hasStaticAppearanceNone(attribute: ESTree.JSXAttribute): boolean {
  const classLists = jsxAttributeStrings(attribute)
  return classLists.length > 0 && classLists.every(includesAppearanceNone)
}

function includesAppearanceNone(classList: string): boolean {
  return tailwindClasses(classList).some(
    ({ variants, utility }) => variants.length === 0 && utility === appearanceNoneUtility,
  )
}
