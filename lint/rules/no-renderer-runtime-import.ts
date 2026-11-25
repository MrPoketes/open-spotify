import path from "node:path"
import { defineRule, type ESTree } from "@oxlint/plugins"

// Components read the runtime from RendererRuntimeContext so tests can render
// them over a fake main process. Importing rendererRuntime directly bypasses
// that context; only route loaders (in src/renderer/routes/**) and the client
// entry (src/renderer/client.tsx) run outside React and may use it directly.
const rendererRuntimeModule = "src/renderer/lib/renderer-runtime"
const allowedClientEntry = "src/renderer/client.tsx"
const allowedRoutesPrefix = "src/renderer/routes/"
const forbiddenExport = "rendererRuntime"
const moduleExtension = /\.(?:[cm]?[jt]sx?)$/

export const noRendererRuntimeImport = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing rendererRuntime outside src/renderer/routes/** and src/renderer/client.tsx",
    },
    messages: {
      noRendererRuntimeImport:
        "Import RendererRuntimeContext instead of rendererRuntime so tests can supply a fake runtime. Only src/renderer/routes/** and src/renderer/client.tsx may import rendererRuntime.",
    },
  },
  create(context) {
    const importerPath = path.resolve(context.cwd, context.filename)
    const relativeImporter = toPosixPath(path.relative(context.cwd, importerPath))
    if (isAllowedImporter(relativeImporter)) {
      return {}
    }

    const targetsRendererRuntime = (specifier: string) =>
      resolvesToRendererRuntime(context.cwd, importerPath, specifier)

    const report = (node: ESTree.Node) => {
      context.report({ node, messageId: "noRendererRuntimeImport" })
    }

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type" || !targetsRendererRuntime(node.source.value)) {
          return
        }
        for (const specifier of node.specifiers) {
          if (isForbiddenImportSpecifier(specifier)) {
            report(specifier)
          }
        }
      },
      ExportNamedDeclaration(node) {
        if (
          node.exportKind === "type" ||
          node.source === null ||
          !targetsRendererRuntime(node.source.value)
        ) {
          return
        }
        for (const specifier of node.specifiers) {
          if (
            specifier.exportKind !== "type" &&
            moduleExportName(specifier.local) === forbiddenExport
          ) {
            report(specifier)
          }
        }
      },
      ExportAllDeclaration(node) {
        if (node.exportKind !== "type" && targetsRendererRuntime(node.source.value)) {
          report(node)
        }
      },
      ImportExpression(node) {
        if (
          node.source.type === "Literal" &&
          typeof node.source.value === "string" &&
          targetsRendererRuntime(node.source.value)
        ) {
          report(node)
        }
      },
    }
  },
})

function isAllowedImporter(relativePath: string): boolean {
  return relativePath === allowedClientEntry || relativePath.startsWith(allowedRoutesPrefix)
}

function resolvesToRendererRuntime(cwd: string, importerPath: string, specifier: string): boolean {
  if (!specifier.startsWith(".")) {
    return false
  }
  const targetPath = path.resolve(path.dirname(importerPath), specifier)
  const relativeTarget = toPosixPath(path.relative(cwd, targetPath)).replace(moduleExtension, "")
  return relativeTarget === rendererRuntimeModule
}

function isForbiddenImportSpecifier(
  specifier: ESTree.ImportDeclaration["specifiers"][number],
): boolean {
  if (specifier.type === "ImportNamespaceSpecifier") {
    return true
  }
  if (specifier.type === "ImportSpecifier") {
    return (
      specifier.importKind !== "type" && moduleExportName(specifier.imported) === forbiddenExport
    )
  }
  return false
}

function moduleExportName(node: ESTree.ImportSpecifier["imported"]): string {
  return node.type === "Identifier" ? node.name : node.value
}

function toPosixPath(filePath: string): string {
  return filePath.replaceAll("\\", "/")
}
