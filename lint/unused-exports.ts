import path from "node:path"

// Lint looks at one file at a time, so it cannot tell whether another module
// imports an export. This check reads the sources as text instead. It matches
// exported declarations and named imports with regular expressions, which is
// enough because the code base has no barrel files, re-exports, or local
// namespace imports.

// Exports that a framework looks up by name instead of importing.
const frameworkExports = [
  { file: /^src\/renderer\/routes\//, name: "Route" },
  { file: /^src\/renderer\/router\.tsx$/, name: "getRouter" },
  { file: /^scripts\/vmp-sign-package\.ts$/, name: "afterPack" },
  { file: /^scripts\/vmp-sign-package\.ts$/, name: "afterSign" },
]

const exportedDeclaration =
  /^export (?:declare )?(?:abstract )?(?:async )?(?:const enum|const|let|function\*?|class|type|interface|enum) ([\w$]+)/gm

// Export lists and re-exports, which this check cannot follow.
const unreadableExport = /^export\s*(?:type\s*)?[{*]/m

const namedImport = /import\s+(?:type\s+)?(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*"([^"]+)"/g

const withoutExtension = (file: string) => file.replace(/\.(?:d\.)?tsx?$|\.js$/, "")

const importedName = (specifier: string) =>
  specifier
    .trim()
    .replace(/^type\s+/, "")
    .split(/\s+as\s+/)[0]

// Keys look like "src/main/folders#FolderNotFound": the importing file and
// the imported file's extensions may differ, so neither carries one.
function importedExportKeys(sources: ReadonlyMap<string, string>) {
  const keys = new Set<string>()
  for (const [file, source] of sources) {
    for (const [, names = "", from = ""] of source.matchAll(namedImport)) {
      if (!from.startsWith(".")) {
        continue
      }
      const imported = withoutExtension(path.posix.join(path.posix.dirname(file), from))
      for (const name of names.split(",").map(importedName)) {
        keys.add(`${imported}#${name}`)
      }
    }
  }
  return keys
}

const isFrameworkExport = (file: string, name: string) =>
  frameworkExports.some((entry) => entry.name === name && entry.file.test(file))

// Takes sources keyed by their path from the repository root, with forward
// slashes, and lists every exported declaration no other module imports. An
// export list or re-export is listed too, because it could hide an unused name.
export function findUnusedExports(sources: ReadonlyMap<string, string>) {
  const imported = importedExportKeys(sources)
  const unused: Array<string> = []
  for (const [file, source] of sources) {
    if (unreadableExport.test(source)) {
      unused.push(`${file}: an export list or re-export; export each declaration instead`)
    }
    for (const [, name = ""] of source.matchAll(exportedDeclaration)) {
      if (!imported.has(`${withoutExtension(file)}#${name}`) && !isFrameworkExport(file, name)) {
        unused.push(`${file}: ${name}`)
      }
    }
  }
  return unused
}
