import type { ESTree } from "@oxlint/plugins"

export function importedExportName(node: ESTree.ImportSpecifier["imported"]): string {
  return node.type === "Identifier" ? node.name : node.value
}
