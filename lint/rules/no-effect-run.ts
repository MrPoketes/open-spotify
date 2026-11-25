import { defineRule, type ESTree } from "@oxlint/plugins"
import { memberPropertyName } from "../member-property-name.ts"

const effectModule = "effect"
const effectSubpathModule = "effect/Effect"
const forbiddenRunners = new Set([
  "runSync",
  "runSyncExit",
  "runSyncWith",
  "runSyncExitWith",
  "runPromise",
  "runPromiseExit",
  "runPromiseWith",
  "runPromiseExitWith",
  "runFork",
  "runForkWith",
  "runCallback",
  "runCallbackWith",
])

// Effects must run through a ManagedRuntime at the edges so services are wired
// in one place and component tests can supply a fake runtime.
export const noEffectRun = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow running effects directly with Effect.run* outside a ManagedRuntime",
    },
    messages: {
      noEffectRun:
        "Run effects through rendererRuntime, mainRuntime, or RendererRuntimeContext instead of calling Effect.run* directly.",
    },
  },
  create(context) {
    const effectIdentifiers = new Set(["Effect"])

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") {
          return
        }
        if (node.source.value === effectModule) {
          collectEffectAlias(node, effectIdentifiers)
          return
        }
        if (node.source.value !== effectSubpathModule) {
          return
        }
        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportNamespaceSpecifier") {
            effectIdentifiers.add(specifier.local.name)
          } else if (isForbiddenRunnerImport(specifier)) {
            context.report({ node: specifier, messageId: "noEffectRun" })
          }
        }
      },
      MemberExpression(node) {
        if (isForbiddenEffectMember(node, effectIdentifiers)) {
          context.report({ node, messageId: "noEffectRun" })
        }
      },
    }
  },
})

function collectEffectAlias(node: ESTree.ImportDeclaration, effectIdentifiers: Set<string>): void {
  for (const specifier of node.specifiers) {
    if (
      specifier.type === "ImportSpecifier" &&
      specifier.importKind !== "type" &&
      importedName(specifier.imported) === "Effect"
    ) {
      effectIdentifiers.add(specifier.local.name)
    }
  }
}

function isForbiddenRunnerImport(
  specifier: ESTree.ImportDeclaration["specifiers"][number],
): boolean {
  return (
    specifier.type === "ImportSpecifier" &&
    specifier.importKind !== "type" &&
    forbiddenRunners.has(importedName(specifier.imported))
  )
}

function isForbiddenEffectMember(
  node: ESTree.MemberExpression,
  effectIdentifiers: ReadonlySet<string>,
): boolean {
  if (node.object.type !== "Identifier" || !effectIdentifiers.has(node.object.name)) {
    return false
  }
  const propertyName = memberPropertyName(node)
  return propertyName !== undefined && forbiddenRunners.has(propertyName)
}

function importedName(imported: ESTree.ImportSpecifier["imported"]): string {
  return imported.type === "Identifier" ? imported.name : imported.value
}
