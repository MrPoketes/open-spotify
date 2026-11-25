import { defineRule, type ESTree, type SourceCode, type Variable } from "@oxlint/plugins"
import { findVariable } from "../find-variable.ts"
import { findJsxAttribute } from "../jsx-attributes.ts"
import { memberPropertyName } from "../member-property-name.ts"
import {
  isRovingType,
  objectPatternBinding,
  type RovingTypeIndex,
  typeAnnotationOf,
  typeHasRovingProperty,
  type VariableDef,
  type VariableName,
} from "../roving-row-types.ts"

const rovingFocusModulePattern = /(?:^|\/)use-roving-focus(?:\.tsx?)?$/
const renderListProps = new Map([
  ["RovingList", "renderRow"],
  ["TreeView", "renderItem"],
])

interface FileAnalysis extends RovingTypeIndex {
  readonly sourceCode: SourceCode
  readonly rovingHookNames: Set<string>
}

interface Resolver {
  readonly analysis: FileAnalysis
  readonly visited: Set<Variable>
}

interface DisabledSpreadElement {
  readonly disabledAttribute: ESTree.JSXAttribute
  readonly spreads: ReadonlyArray<ESTree.JSXSpreadAttribute>
}

// An unavailable row in a roving-focus list stays focusable with aria-disabled
// instead of disabled (docs/design.md). A disabled element cannot take focus,
// which stalls arrow navigation and drops the list from the tab order when that
// row holds the tab stop.
export const noDisabledRovingRow = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow the disabled attribute on elements that spread roving-focus row props so unavailable rows stay focusable",
    },
    messages: {
      disabledRovingRow:
        'Do not set "disabled" on a roving-focus row: a disabled element cannot take focus, stalling arrow navigation or dropping the list from the tab order. Use aria-disabled instead and keep the row focusable (docs/design.md).',
    },
  },
  create(context) {
    const analysis: FileAnalysis = {
      sourceCode: context.sourceCode,
      rovingTypeNames: new Set(["RovingRowProps", "TreeItemProps"]),
      interfaces: new Map(),
      rovingHookNames: new Set(["useRovingFocus"]),
    }
    const disabledElements: Array<DisabledSpreadElement> = []

    return {
      ImportDeclaration(node) {
        recordRovingFocusImports(node, analysis)
      },
      TSInterfaceDeclaration(node) {
        analysis.interfaces.set(node.id.name, node)
      },
      JSXOpeningElement(element) {
        const disabledAttribute = findJsxAttribute(element, "disabled")
        if (disabledAttribute === undefined) return
        const spreads = element.attributes.filter(
          (attribute): attribute is ESTree.JSXSpreadAttribute =>
            attribute.type === "JSXSpreadAttribute",
        )
        if (spreads.length > 0) {
          disabledElements.push({ disabledAttribute, spreads })
        }
      },
      "Program:exit"() {
        for (const { disabledAttribute, spreads } of disabledElements) {
          const resolver: Resolver = { analysis, visited: new Set() }
          if (spreads.some((spread) => isRovingExpression(spread.argument, resolver))) {
            context.report({ node: disabledAttribute, messageId: "disabledRovingRow" })
          }
        }
      },
    }
  },
})

function recordRovingFocusImports(node: ESTree.ImportDeclaration, analysis: FileAnalysis): void {
  if (!rovingFocusModulePattern.test(node.source.value)) return
  for (const specifier of node.specifiers) {
    if (specifier.type !== "ImportSpecifier") continue
    const imported =
      specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value
    if (imported === "RovingRowProps") analysis.rovingTypeNames.add(specifier.local.name)
    if (
      imported === "useRovingFocus" &&
      node.importKind !== "type" &&
      specifier.importKind !== "type"
    ) {
      analysis.rovingHookNames.add(specifier.local.name)
    }
  }
}

function isRovingExpression(expression: ESTree.Expression, resolver: Resolver): boolean {
  if (expression.type === "ObjectExpression") {
    return expression.properties.some(
      (property) =>
        property.type === "SpreadElement" && isRovingExpression(property.argument, resolver),
    )
  }
  if (expression.type === "CallExpression") return isRowPropsCall(expression, resolver)
  if (expression.type === "MemberExpression") {
    const property = memberPropertyName(expression)
    return (
      property !== undefined &&
      identifierHasRovingProperty(expression.object, property, resolver.analysis)
    )
  }
  if (expression.type === "Identifier") {
    return isRovingVariable(resolveIdentifier(expression, resolver.analysis), resolver)
  }
  return false
}

function resolveIdentifier(
  identifier: ESTree.IdentifierReference,
  analysis: FileAnalysis,
): Variable | undefined {
  return findVariable(analysis.sourceCode.getScope(identifier), identifier.name)
}

function withVisited(
  variable: Variable | undefined,
  resolver: Resolver,
  check: (resolved: Variable) => boolean,
): boolean {
  if (variable === undefined || resolver.visited.has(variable)) return false
  resolver.visited.add(variable)
  const matched = check(variable)
  resolver.visited.delete(variable)
  return matched
}

function isRowPropsCall(call: ESTree.CallExpression, resolver: Resolver): boolean {
  const { callee } = call
  if (callee.type === "MemberExpression") {
    return memberPropertyName(callee) === "rowProps" && isRovingHookResult(callee.object, resolver)
  }
  if (callee.type !== "Identifier") return false
  return withVisited(resolveIdentifier(callee, resolver.analysis), resolver, (resolved) =>
    resolved.defs.some(
      (definition) =>
        definition.type === "Variable" &&
        definition.node.type === "VariableDeclarator" &&
        isRowPropsFactoryDeclarator(definition.name, definition.node, resolver),
    ),
  )
}

function isRowPropsFactoryDeclarator(
  name: VariableName,
  declarator: ESTree.VariableDeclarator,
  resolver: Resolver,
): boolean {
  const { init } = declarator
  if (init === null) return false
  if (declarator.id === name) {
    return (
      init.type === "ArrowFunctionExpression" &&
      isRovingType(init.returnType?.typeAnnotation, resolver.analysis)
    )
  }
  const binding = objectPatternBinding(name)
  return (
    binding?.kind === "property" &&
    binding.name === "rowProps" &&
    binding.pattern === declarator.id &&
    isRovingHookResult(init, resolver)
  )
}

function isRovingHookCall(call: ESTree.CallExpression, analysis: FileAnalysis): boolean {
  if (call.callee.type !== "Identifier" || !analysis.rovingHookNames.has(call.callee.name)) {
    return false
  }
  const variable = resolveIdentifier(call.callee, analysis)
  if (variable === undefined) return true
  return variable.defs.some(
    (definition) =>
      definition.type === "ImportBinding" &&
      definition.parent?.type === "ImportDeclaration" &&
      rovingFocusModulePattern.test(definition.parent.source.value),
  )
}

function isRovingHookResult(expression: ESTree.Expression, resolver: Resolver): boolean {
  if (expression.type === "CallExpression") {
    return isRovingHookCall(expression, resolver.analysis)
  }
  if (expression.type !== "Identifier") return false
  return withVisited(resolveIdentifier(expression, resolver.analysis), resolver, (resolved) =>
    resolved.defs.some(
      (definition) =>
        definition.type === "Variable" &&
        definition.node.type === "VariableDeclarator" &&
        definition.node.id === definition.name &&
        definition.node.init !== null &&
        isRovingHookResult(definition.node.init, resolver),
    ),
  )
}

function isRovingVariable(variable: Variable | undefined, resolver: Resolver): boolean {
  return withVisited(variable, resolver, (resolved) =>
    resolved.defs.some((definition) => isRovingDefinition(definition, resolver)),
  )
}

function isRovingDefinition(definition: VariableDef, resolver: Resolver): boolean {
  if (isRovingType(typeAnnotationOf(definition.name), resolver.analysis)) return true
  if (definition.type === "Parameter") {
    return isRovingParameter(definition.name, resolver.analysis)
  }
  if (definition.type === "Variable" && definition.node.type === "VariableDeclarator") {
    return isRovingDeclarator(definition.name, definition.node, resolver)
  }
  return false
}

function isRovingParameter(name: VariableName, analysis: FileAnalysis): boolean {
  if (isRenderListRowParameter(name)) return true
  const binding = objectPatternBinding(name)
  if (binding === undefined) return false
  const annotation = typeAnnotationOf(binding.pattern)
  if (binding.kind === "rest") return isRovingType(annotation, analysis)
  return typeHasRovingProperty(annotation, binding.name, analysis)
}

function isRenderListRowParameter(name: VariableName): boolean {
  const callback = name.parent
  if (callback.type !== "ArrowFunctionExpression" || callback.params[1] !== name) return false
  const container = callback.parent
  if (container.type !== "JSXExpressionContainer") return false
  const attribute = container.parent
  if (attribute.type !== "JSXAttribute" || attribute.name.type !== "JSXIdentifier") return false
  const element = attribute.parent
  if (element.type !== "JSXOpeningElement" || element.name.type !== "JSXIdentifier") return false
  return renderListProps.get(element.name.name) === attribute.name.name
}

function isRovingDeclarator(
  name: VariableName,
  declarator: ESTree.VariableDeclarator,
  resolver: Resolver,
): boolean {
  const { init } = declarator
  if (init === null) return false
  if (declarator.id === name) return isRovingExpression(init, resolver)
  const binding = objectPatternBinding(name)
  return (
    binding?.kind === "property" &&
    binding.pattern === declarator.id &&
    identifierHasRovingProperty(init, binding.name, resolver.analysis)
  )
}

function identifierHasRovingProperty(
  expression: ESTree.Expression,
  propertyName: string,
  analysis: FileAnalysis,
): boolean {
  if (expression.type !== "Identifier") return false
  const variable = resolveIdentifier(expression, analysis)
  if (variable === undefined) return false
  return variable.defs.some((definition) =>
    typeHasRovingProperty(typeAnnotationOf(definition.name), propertyName, analysis),
  )
}
