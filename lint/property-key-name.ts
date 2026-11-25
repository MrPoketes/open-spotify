import type { ESTree as OxlintESTree } from "@oxlint/plugins"
import type { ESTree as ViteESTree } from "vite"

export function propertyKeyName(
  node: OxlintESTree.ObjectProperty | ViteESTree.ObjectProperty,
): string | undefined {
  if (!node.computed && node.key.type === "Identifier") {
    return node.key.name
  }
  if (node.key.type === "Literal" && typeof node.key.value === "string") {
    return node.key.value
  }
  return undefined
}
