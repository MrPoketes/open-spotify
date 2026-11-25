import type { ESTree, Variable } from "@oxlint/plugins"

export type VariableDef = Variable["defs"][number]
export type VariableName = VariableDef["name"]
type ObjectPatternNode = Extract<ESTree.Node, { readonly type: "ObjectPattern" }>

type PatternBinding =
  | { readonly kind: "property"; readonly name: string; readonly pattern: ObjectPatternNode }
  | { readonly kind: "rest"; readonly pattern: ObjectPatternNode }

export interface RovingTypeIndex {
  readonly rovingTypeNames: Set<string>
  readonly interfaces: Map<string, ESTree.TSInterfaceDeclaration>
}

export function typeAnnotationOf(
  node: VariableName | ObjectPatternNode,
): ESTree.TSType | undefined {
  return "typeAnnotation" in node ? node.typeAnnotation?.typeAnnotation : undefined
}

export function objectPatternBinding(name: VariableName): PatternBinding | undefined {
  const container = name.parent
  if (
    container.type === "Property" &&
    container.value === name &&
    container.parent.type === "ObjectPattern"
  ) {
    const key = identifierKey(container.key, container.computed)
    return key === undefined
      ? undefined
      : { kind: "property", name: key, pattern: container.parent }
  }
  if (
    container.type === "RestElement" &&
    container.argument === name &&
    container.parent.type === "ObjectPattern"
  ) {
    return { kind: "rest", pattern: container.parent }
  }
  return undefined
}

export function isRovingType(typeNode: ESTree.TSType | undefined, index: RovingTypeIndex): boolean {
  if (typeNode?.type !== "TSTypeReference" || typeNode.typeName.type !== "Identifier") {
    return false
  }
  return matchesInterfaceHierarchy(typeNode.typeName.name, index, (name) =>
    index.rovingTypeNames.has(name),
  )
}

export function typeHasRovingProperty(
  typeNode: ESTree.TSType | undefined,
  propertyName: string,
  index: RovingTypeIndex,
): boolean {
  if (typeNode?.type === "TSTypeLiteral") {
    return membersHaveRovingProperty(typeNode.members, propertyName, index)
  }
  if (typeNode?.type !== "TSTypeReference" || typeNode.typeName.type !== "Identifier") {
    return false
  }
  return matchesInterfaceHierarchy(
    typeNode.typeName.name,
    index,
    (_, declaration) =>
      declaration !== undefined &&
      membersHaveRovingProperty(declaration.body.body, propertyName, index),
  )
}

function identifierKey(key: ESTree.PropertyKey, computed: boolean): string | undefined {
  return !computed && key.type === "Identifier" ? key.name : undefined
}

function matchesInterfaceHierarchy(
  startName: string,
  index: RovingTypeIndex,
  predicate: (name: string, declaration: ESTree.TSInterfaceDeclaration | undefined) => boolean,
): boolean {
  const seen = new Set<string>()
  const visit = (name: string): boolean => {
    if (seen.has(name)) return false
    seen.add(name)
    const declaration = index.interfaces.get(name)
    if (predicate(name, declaration)) return true
    if (declaration === undefined) return false
    return declaration.extends.some(
      (heritage) => heritage.expression.type === "Identifier" && visit(heritage.expression.name),
    )
  }
  return visit(startName)
}

function membersHaveRovingProperty(
  members: ReadonlyArray<ESTree.TSSignature>,
  propertyName: string,
  index: RovingTypeIndex,
): boolean {
  for (const member of members) {
    if (
      member.type === "TSPropertySignature" &&
      identifierKey(member.key, member.computed) === propertyName
    ) {
      return isRovingType(member.typeAnnotation?.typeAnnotation, index)
    }
  }
  return false
}
