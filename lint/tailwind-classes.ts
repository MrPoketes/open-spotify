import type { ESTree, Visitor } from "@oxlint/plugins"

// Tailwind 3 writes the important flag before the utility (`!bg-red-500`) and
// Tailwind 4 after it (`bg-red-500!`); both still apply the class. Variants
// are separated by top-level colons only, so colons inside an arbitrary value
// (`font-[family-name:Inter]`) stay part of the utility.
export function tailwindUtilityName(className: string): string {
  const splitAt = lastTopLevelColon(className)
  const withoutVariants = className.slice(splitAt + 1)
  return withoutVariants.replace(/^!|!$/g, "")
}

function lastTopLevelColon(className: string): number {
  let bracketDepth = 0
  let lastColon = -1
  for (let index = 0; index < className.length; index += 1) {
    const character = className[index]
    if (character === "[") {
      bracketDepth += 1
    } else if (character === "]" && bracketDepth > 0) {
      bracketDepth -= 1
    } else if (character === ":" && bracketDepth === 0) {
      lastColon = index
    }
  }
  return lastColon
}

// Interpolated expressions become a single placeholder token so dynamic
// arbitrary values such as `rounded-[${radius}px]` stay one class name.
export function stringTextVisitor(onText: (node: ESTree.Node, text: string) => void): Visitor {
  return {
    Literal(node) {
      if (typeof node.value === "string") {
        onText(node, node.value)
      }
    },
    TemplateLiteral(node) {
      const text = node.quasis.map((quasi) => quasi.value.raw).join("${…}")
      onText(node, text)
    },
  }
}
