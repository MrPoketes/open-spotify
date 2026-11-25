import type { ESTree, Visitor } from "@oxlint/plugins"

interface ParsedTailwindClass {
  readonly className: string
  readonly variants: ReadonlyArray<string>
  readonly utility: string
}

// Tailwind 3 writes the important flag before the utility (`!bg-red-500`) and
// Tailwind 4 after it (`bg-red-500!`); both still apply the class. Variants
// are separated by top-level colons only, so colons inside an arbitrary value
// (`font-[family-name:Inter]` or `data-[state=open]:ring-offset-2`) stay intact.
export function tailwindClasses(text: string): ReadonlyArray<ParsedTailwindClass> {
  const parsed: Array<ParsedTailwindClass> = []
  for (const className of text.split(/\s+/)) {
    if (className.length === 0) {
      continue
    }
    const segments = splitOnTopLevelColons(className)
    const rawUtility = segments.pop() ?? ""
    parsed.push({
      className,
      variants: segments,
      utility: rawUtility.replace(/^!|!$/g, ""),
    })
  }
  return parsed
}

const validClassOutsideBrackets = /^[!@a-z0-9:/._-]+$/

// Real Tailwind class lists mix at most a few bare utilities (like `flex` or
// `invisible`) with prefixed or hyphenated ones, whereas plain prose consists
// mostly of bare words.
const minTailwindSyntaxShare = 0.5

function isPlausibleTailwindToken(className: string): boolean {
  if (/[.,;?]$/.test(className) || className.startsWith("/") || className.includes("://")) {
    return false
  }
  const withoutArbitrary = className.replace(/\[[^\]]*\]/g, "")
  return withoutArbitrary.length > 0 && validClassOutsideBrackets.test(withoutArbitrary)
}

const hasTailwindSyntax = (variants: ReadonlyArray<string>, utility: string) =>
  variants.length > 0 || utility.includes("-") || utility.includes("/") || utility.includes("[")

// Rejects prose sentences and URLs so duplicate-code checks compare only real
// utility-class strings, without hard-coding a finite list of bare utilities.
export function tailwindClassSet(text: string, minClasses: number): ReadonlySet<string> | null {
  const parsed = tailwindClasses(text)
  if (parsed.length < minClasses) {
    return null
  }
  const unique = new Set<string>()
  let syntaxCount = 0
  for (const entry of parsed) {
    if (!isPlausibleTailwindToken(entry.className)) {
      return null
    }
    if (!unique.has(entry.className)) {
      unique.add(entry.className)
      if (hasTailwindSyntax(entry.variants, entry.utility)) {
        syntaxCount += 1
      }
    }
  }
  if (unique.size < minClasses || syntaxCount / unique.size < minTailwindSyntaxShare) {
    return null
  }
  return unique
}

function splitOnTopLevelColons(className: string): Array<string> {
  const segments: Array<string> = []
  let bracketDepth = 0
  let start = 0
  for (let index = 0; index < className.length; index += 1) {
    const character = className[index]
    if (character === "[") {
      bracketDepth += 1
    } else if (character === "]" && bracketDepth > 0) {
      bracketDepth -= 1
    } else if (character === ":" && bracketDepth === 0) {
      segments.push(className.slice(start, index))
      start = index + 1
    }
  }
  segments.push(className.slice(start))
  return segments
}

// Interpolated expressions become a single placeholder token so dynamic
// arbitrary values such as `rounded-[${radius}px]` stay one class name.
export const interpolationPlaceholder = "${…}"

export function stringTextVisitor(onText: (node: ESTree.Node, text: string) => void): Visitor {
  return {
    Literal(node) {
      if (typeof node.value === "string") {
        onText(node, node.value)
      }
    },
    TemplateLiteral(node) {
      const text = node.quasis.map((quasi) => quasi.value.raw).join(interpolationPlaceholder)
      onText(node, text)
    },
  }
}

export function findJsxAttribute(
  element: ESTree.JSXOpeningElement,
  name: string,
): ESTree.JSXAttribute | undefined {
  for (const attribute of element.attributes) {
    if (
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === name
    ) {
      return attribute
    }
  }
  return undefined
}

export function jsxAttributeStrings(attribute: ESTree.JSXAttribute): ReadonlyArray<string> {
  if (attribute.value === null) {
    return []
  }
  if (attribute.value.type === "Literal") {
    return typeof attribute.value.value === "string" ? [attribute.value.value] : []
  }
  if (attribute.value.type === "JSXExpressionContainer") {
    return expressionStrings(attribute.value.expression)
  }
  return []
}

function expressionStrings(
  expression: ESTree.Expression | ESTree.JSXEmptyExpression,
): ReadonlyArray<string> {
  if (expression.type === "Literal") {
    return typeof expression.value === "string" ? [expression.value] : [interpolationPlaceholder]
  }
  if (expression.type === "TemplateLiteral") {
    return templateStrings(expression)
  }
  if (expression.type === "ConditionalExpression") {
    return [...expressionStrings(expression.consequent), ...expressionStrings(expression.alternate)]
  }
  return [interpolationPlaceholder]
}

function templateStrings(template: ESTree.TemplateLiteral): ReadonlyArray<string> {
  let values: ReadonlyArray<string> = [template.quasis[0]?.value.raw ?? ""]
  for (const [index, expression] of template.expressions.entries()) {
    const parts = expressionStrings(expression)
    const nextQuasi = template.quasis[index + 1]?.value.raw ?? ""
    values = values.flatMap((prefix) => parts.map((part) => `${prefix}${part}${nextQuasi}`))
  }
  return values
}
