import { parseSync, type ESTree } from "vite"
import { lineAtOffset, lineStartsOf } from "./source-lines.ts"
import { tailwindClassSet } from "./tailwind-classes.ts"

export interface CodeToken {
  readonly kind: "syntax" | "fixed" | "ident" | "string" | "literal" | "boundary"
  readonly text: string
  readonly line: number
}

export interface ClassListOccurrence {
  readonly line: number
  readonly classes: ReadonlySet<string>
}

export interface FileAnalysis {
  readonly tokens: ReadonlyArray<CodeToken>
  readonly classLists: ReadonlyArray<ClassListOccurrence>
}

interface WalkContext {
  readonly lineStarts: ReadonlyArray<number>
  readonly minTailwindClasses: number
  readonly tokens: Array<CodeToken>
  readonly classLists: Array<ClassListOccurrence>
  boundaryCount: number
}

interface NodeRelation {
  readonly parent: ESTree.Node | null
  readonly key: string
}

const skippedNodeTypes = new Set([
  "ImportDeclaration",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSTypeAnnotation",
  "TSTypeParameterDeclaration",
  "TSTypeParameterInstantiation",
])

const skippedChildKeys = new Set([
  "type",
  "start",
  "end",
  "loc",
  "range",
  "raw",
  "optional",
  "shorthand",
  "computed",
  "async",
  "generator",
  "prefix",
  "method",
  "closingElement",
  "closingFragment",
])

const testFunctionNames = new Set(["it", "test"])

const isEstreeNode = (value: unknown): value is ESTree.Node =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"

const lineOf = (context: WalkContext, node: ESTree.Node): number =>
  lineAtOffset(context.lineStarts, node.start)

function recordClassList(context: WalkContext, text: string, line: number) {
  const classes = tailwindClassSet(text, context.minTailwindClasses)
  if (classes !== null) {
    context.classLists.push({ line, classes })
  }
}

function isFixedIdentifier(parent: ESTree.Node | null, parentKey: string): boolean {
  if (parent === null) {
    return false
  }
  if (parent.type === "MemberExpression") {
    return !parent.computed && parentKey === "property"
  }
  if (parent.type === "Property") {
    return !parent.computed && !parent.shorthand && parentKey === "key"
  }
  if (parent.type === "MethodDefinition" || parent.type === "PropertyDefinition") {
    return !parent.computed && parentKey === "key"
  }
  return false
}

function isTestCaseCall(node: ESTree.Node): boolean {
  if (node.type !== "CallExpression") {
    return false
  }
  const { callee } = node
  if (callee.type === "Identifier") {
    return testFunctionNames.has(callee.name)
  }
  if (callee.type === "MemberExpression" && callee.object.type === "Identifier") {
    return testFunctionNames.has(callee.object.name)
  }
  return false
}

function pushBoundary(context: WalkContext, line: number) {
  context.boundaryCount += 1
  context.tokens.push({ kind: "boundary", text: `$B${context.boundaryCount}`, line })
}

const quasiText = (quasi: ESTree.TemplateElement): string => quasi.value.cooked ?? quasi.value.raw

const templateStaticText = (node: ESTree.TemplateLiteral): string =>
  node.quasis.map(quasiText).join(" ")

type LiteralNode = Extract<ESTree.Node, { readonly type: "Literal" }>

function recordLiteralToken(context: WalkContext, node: LiteralNode, line: number) {
  if (typeof node.value === "string") {
    context.tokens.push({ kind: "string", text: `S:${node.value}`, line })
    recordClassList(context, node.value, line)
    return
  }
  context.tokens.push({ kind: "literal", text: `L:${String(node.value)}`, line })
}

function recordTextToken(context: WalkContext, node: ESTree.Node, line: number): boolean {
  if (node.type === "TemplateElement") {
    const text = quasiText(node)
    if (text.length > 0) {
      context.tokens.push({ kind: "string", text: `S:${text}`, line })
    }
    return true
  }
  if (node.type === "JSXText") {
    const trimmed = node.value.trim()
    if (trimmed.length > 0) {
      context.tokens.push({ kind: "string", text: `T:${trimmed}`, line })
    }
    return true
  }
  return false
}

function recordLeafToken(context: WalkContext, node: ESTree.Node, relation: NodeRelation): boolean {
  const line = lineOf(context, node)
  if (node.type === "Identifier") {
    const kind = isFixedIdentifier(relation.parent, relation.key) ? "fixed" : "ident"
    context.tokens.push({ kind, text: node.name, line })
    return true
  }
  if (node.type === "JSXIdentifier") {
    const isAttribute = relation.parent?.type === "JSXAttribute" && relation.key === "name"
    context.tokens.push({ kind: isAttribute ? "fixed" : "ident", text: node.name, line })
    return true
  }
  if (node.type === "Literal") {
    recordLiteralToken(context, node, line)
    return true
  }
  return recordTextToken(context, node, line)
}

function syntaxTag(node: ESTree.Node): string {
  if ("operator" in node && typeof node.operator === "string") {
    return `${node.type}:${node.operator}`
  }
  if (node.type === "VariableDeclaration") {
    return `${node.type}:${node.kind}`
  }
  return node.type
}

function unwrapPassthrough(
  node: ESTree.Node,
): { readonly key: string; readonly child: ESTree.Node } | null {
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") {
    return { key: "expression", child: node.expression }
  }
  if (node.type === "ExportDefaultDeclaration") {
    return { key: "declaration", child: node.declaration }
  }
  if (node.type === "ExportNamedDeclaration" && node.declaration !== null) {
    return { key: "declaration", child: node.declaration }
  }
  return null
}

function visitChildValue(context: WalkContext, value: unknown, relation: NodeRelation) {
  if (Array.isArray(value)) {
    for (const element of value) {
      if (isEstreeNode(element)) {
        visitNode(context, element, relation)
      }
    }
    return
  }
  if (isEstreeNode(value)) {
    visitNode(context, value, relation)
  }
}

function visitChildren(context: WalkContext, node: ESTree.Node) {
  for (const [key, value] of Object.entries(node)) {
    if (skippedChildKeys.has(key)) {
      continue
    }
    visitChildValue(context, value, { parent: node, key })
  }
}

type TableEntry = NonNullable<ESTree.ArrayExpressionElement>

const isTableEntry = (element: ESTree.ArrayExpressionElement): element is TableEntry =>
  element !== null &&
  (element.type === "Literal" ||
    element.type === "TemplateLiteral" ||
    element.type === "ObjectExpression")

// Separates elements of literal/object data tables (such as lint rule test
// cases) so long lists of same-shaped entries do not match unrelated tables.
function dataTableEntries(node: ESTree.ArrayExpression): ReadonlyArray<TableEntry> | null {
  if (node.elements.length < 2) {
    return null
  }
  const entries: Array<TableEntry> = []
  for (const element of node.elements) {
    if (!isTableEntry(element)) {
      return null
    }
    entries.push(element)
  }
  return entries
}

function visitDataTableArray(
  context: WalkContext,
  node: ESTree.ArrayExpression,
  entries: ReadonlyArray<TableEntry>,
) {
  const line = lineOf(context, node)
  context.tokens.push({ kind: "syntax", text: node.type, line })
  for (const entry of entries) {
    pushBoundary(context, lineOf(context, entry))
    visitNode(context, entry, { parent: node, key: "elements" })
  }
  pushBoundary(context, line)
}

function visitNode(context: WalkContext, node: ESTree.Node, relation: NodeRelation) {
  if (skippedNodeTypes.has(node.type)) {
    return
  }
  const unwrapped = unwrapPassthrough(node)
  if (unwrapped !== null) {
    visitNode(context, unwrapped.child, { parent: node, key: unwrapped.key })
    return
  }
  if (node.type === "ExportNamedDeclaration") {
    return
  }
  if (recordLeafToken(context, node, relation)) {
    return
  }
  if (node.type === "ArrayExpression") {
    const entries = dataTableEntries(node)
    if (entries !== null) {
      visitDataTableArray(context, node, entries)
      return
    }
  }

  const line = lineOf(context, node)
  const isTestBlock = isTestCaseCall(node)
  if (isTestBlock) {
    pushBoundary(context, line)
  }
  if (node.type === "TemplateLiteral") {
    recordClassList(context, templateStaticText(node), line)
  }
  context.tokens.push({ kind: "syntax", text: syntaxTag(node), line })
  visitChildren(context, node)
  if (isTestBlock) {
    pushBoundary(context, line)
  }
}

export function analyzeSourceFile(
  file: string,
  source: string,
  minTailwindClasses: number,
): FileAnalysis {
  const parsed = parseSync(file, source)
  const context: WalkContext = {
    lineStarts: lineStartsOf(source),
    minTailwindClasses,
    tokens: [],
    classLists: [],
    boundaryCount: 0,
  }
  visitNode(context, parsed.program, { parent: null, key: "" })
  return { tokens: context.tokens, classLists: context.classLists }
}
