import { defineRule, type ESTree, type Scope, type Variable } from "@oxlint/plugins"
import { findVariable } from "../find-variable.ts"

// Errors belong in typed Effect failures so callers handle them through the
// type system. TanStack Router is the only exception: it signals redirects and
// not-found responses by throwing redirect(...) or notFound(...) from loaders
// and beforeLoad hooks.
const tanstackRouterModule = "@tanstack/react-router"
const routeControlExports = new Set(["redirect", "notFound"])

export const noThrow = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow throw except TanStack Router redirect and notFound" },
    messages: {
      noThrow:
        "Return a typed Effect failure instead of throwing. Only TanStack Router's redirect(...) and notFound(...) may be thrown.",
    },
  },
  create(context) {
    return {
      ThrowStatement(node) {
        if (!isTanStackRouteControlCall(node.argument, context.sourceCode.getScope(node))) {
          context.report({ node, messageId: "noThrow" })
        }
      },
    }
  },
})

function isTanStackRouteControlCall(argument: ESTree.Expression, scope: Scope): boolean {
  if (argument.type !== "CallExpression") {
    return false
  }
  const { callee } = argument
  if (callee.type === "Identifier") {
    return isRouterControlImport(findVariable(scope, callee.name))
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.property.type === "Identifier" &&
    routeControlExports.has(callee.property.name)
  ) {
    return isRouterNamespaceImport(findVariable(scope, callee.object.name))
  }
  return false
}

function isRouterControlImport(variable: Variable | undefined): boolean {
  if (variable === undefined) {
    return false
  }
  return variable.defs.some(
    (definition) =>
      definition.type === "ImportBinding" &&
      definition.node.type === "ImportSpecifier" &&
      definition.node.importKind !== "type" &&
      isRouterValueImport(definition.parent) &&
      routeControlExports.has(importedExportName(definition.node.imported)),
  )
}

function isRouterNamespaceImport(variable: Variable | undefined): boolean {
  if (variable === undefined) {
    return false
  }
  return variable.defs.some(
    (definition) =>
      definition.type === "ImportBinding" &&
      definition.node.type === "ImportNamespaceSpecifier" &&
      isRouterValueImport(definition.parent),
  )
}

function isRouterValueImport(node: ESTree.Node | null): boolean {
  return (
    node !== null &&
    node.type === "ImportDeclaration" &&
    node.importKind !== "type" &&
    node.source.value === tanstackRouterModule
  )
}

function importedExportName(imported: ESTree.ImportSpecifier["imported"]): string {
  return imported.type === "Identifier" ? imported.name : imported.value
}
