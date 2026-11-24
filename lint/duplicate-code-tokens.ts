import { parseSync } from "vite"
import { tailwindClassSet } from "./tailwind-classes.ts"

export interface CodeToken {
  readonly kind: "syntax" | "fixed" | "ident" | "string" | "literal" | "boundary"
  readonly exact: string
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

type SyntaxNode = Readonly<Record<string, unknown>>

interface WalkContext {
  readonly lineStarts: ReadonlyArray<number>
  readonly tokens: Array<CodeToken>
  readonly classLists: Array<ClassListOccurrence>
  boundaryCount: number
}

interface NodeRelation {
  readonly parent: SyntaxNode | null
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

const unwrappedChildKey: Readonly<Record<string, string>> = {
  ExportDefaultDeclaration: "declaration",
  ExportNamedDeclaration: "declaration",
  TSAsExpression: "expression",
  TSSatisfiesExpression: "expression",
}

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

const minTrackedTailwindClasses = 6
const testFunctionNames = new Set(["it", "test"])

const isRecord = (value: unknown): value is SyntaxNode =>
  typeof value === "object" && value !== null

const isSyntaxNode = (value: unknown): value is SyntaxNode =>
  isRecord(value) && typeof value["type"] === "string"

function lineStartsOf(source: string): ReadonlyArray<number> {
  const starts = [0]
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === 10) {
      starts.push(index + 1)
    }
  }
  return starts
}

function lineAt(starts: ReadonlyArray<number>, offset: number): number {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const middle = Math.floor((low + high + 1) / 2)
    if ((starts[middle] ?? 0) <= offset) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  return low + 1
}

const nodeLine = (context: WalkContext, node: SyntaxNode): number =>
  typeof node["start"] === "number" ? lineAt(context.lineStarts, node["start"]) : 1

function recordClassList(context: WalkContext, text: string, line: number) {
  const classes = tailwindClassSet(text, minTrackedTailwindClasses)
  if (classes !== null) {
    context.classLists.push({ line, classes })
  }
}

function isFixedIdentifier(parent: SyntaxNode | null, parentKey: string): boolean {
  if (parent === null || parent["computed"] === true) {
    return false
  }
  const parentType = parent["type"]
  if (parentType === "MemberExpression" && parentKey === "property") {
    return true
  }
  if (parentType === "Property" && parentKey === "key" && parent["shorthand"] !== true) {
    return true
  }
  return (
    (parentType === "MethodDefinition" || parentType === "PropertyDefinition") &&
    parentKey === "key"
  )
}

function isTestCaseCall(node: SyntaxNode): boolean {
  if (node["type"] !== "CallExpression") {
    return false
  }
  const callee = node["callee"]
  if (!isSyntaxNode(callee)) {
    return false
  }
  if (callee["type"] === "Identifier" && typeof callee["name"] === "string") {
    return testFunctionNames.has(callee["name"])
  }
  if (callee["type"] === "MemberExpression" && isSyntaxNode(callee["object"])) {
    const objectName = callee["object"]["name"]
    return typeof objectName === "string" && testFunctionNames.has(objectName)
  }
  return false
}

function pushBoundary(context: WalkContext, line: number) {
  context.boundaryCount += 1
  context.tokens.push({ kind: "boundary", exact: `$B${context.boundaryCount}`, line })
}

function quasiText(quasi: SyntaxNode): string {
  const value = quasi["value"]
  if (!isRecord(value)) {
    return ""
  }
  if (typeof value["cooked"] === "string") {
    return value["cooked"]
  }
  if (typeof value["raw"] === "string") {
    return value["raw"]
  }
  return ""
}

function templateStaticText(node: SyntaxNode): string {
  const quasis = node["quasis"]
  if (!Array.isArray(quasis)) {
    return ""
  }
  return quasis.filter(isSyntaxNode).map(quasiText).join(" ")
}

function recordStringOrLiteral(context: WalkContext, node: SyntaxNode, line: number) {
  const value = node["value"]
  if (typeof value === "string") {
    context.tokens.push({ kind: "string", exact: `S:${value}`, line })
    recordClassList(context, value, line)
    return
  }
  context.tokens.push({ kind: "literal", exact: `L:${String(value)}`, line })
}

function recordIdentifierToken(
  context: WalkContext,
  node: SyntaxNode,
  relation: NodeRelation,
): boolean {
  const type = node["type"]
  if (typeof node["name"] !== "string") {
    return false
  }
  const line = nodeLine(context, node)
  if (type === "Identifier") {
    const kind = isFixedIdentifier(relation.parent, relation.key) ? "fixed" : "ident"
    context.tokens.push({ kind, exact: node["name"], line })
    return true
  }
  if (type === "JSXIdentifier") {
    const isAttribute = relation.parent?.["type"] === "JSXAttribute" && relation.key === "name"
    context.tokens.push({ kind: isAttribute ? "fixed" : "ident", exact: node["name"], line })
    return true
  }
  return false
}

function recordTextToken(context: WalkContext, node: SyntaxNode, line: number): boolean {
  if (node["type"] === "TemplateElement") {
    const text = quasiText(node)
    if (text.length > 0) {
      context.tokens.push({ kind: "string", exact: `S:${text}`, line })
    }
    return true
  }
  if (node["type"] === "JSXText" && typeof node["value"] === "string") {
    const trimmed = node["value"].trim()
    if (trimmed.length > 0) {
      context.tokens.push({ kind: "string", exact: `T:${trimmed}`, line })
    }
    return true
  }
  return false
}

function recordLeafToken(context: WalkContext, node: SyntaxNode, relation: NodeRelation): boolean {
  if (recordIdentifierToken(context, node, relation)) {
    return true
  }
  const line = nodeLine(context, node)
  if (node["type"] === "Literal") {
    recordStringOrLiteral(context, node, line)
    return true
  }
  return recordTextToken(context, node, line)
}

function syntaxTag(node: SyntaxNode): string {
  const type = String(node["type"])
  if (typeof node["operator"] === "string") {
    return `${type}:${node["operator"]}`
  }
  if (type === "VariableDeclaration" && typeof node["kind"] === "string") {
    return `${type}:${node["kind"]}`
  }
  return type
}

function visitChildValue(context: WalkContext, value: unknown, relation: NodeRelation) {
  if (Array.isArray(value)) {
    for (const element of value) {
      if (isSyntaxNode(element)) {
        visitNode(context, element, relation)
      }
    }
    return
  }
  if (isSyntaxNode(value)) {
    visitNode(context, value, relation)
  }
}

function visitChildren(context: WalkContext, node: SyntaxNode) {
  for (const [key, value] of Object.entries(node)) {
    if (skippedChildKeys.has(key)) {
      continue
    }
    visitChildValue(context, value, { parent: node, key })
  }
}

function visitNode(context: WalkContext, node: SyntaxNode, relation: NodeRelation) {
  const type = String(node["type"])
  if (skippedNodeTypes.has(type)) {
    return
  }
  const unwrapKey = unwrappedChildKey[type]
  if (unwrapKey !== undefined) {
    visitChildValue(context, node[unwrapKey], { parent: node, key: unwrapKey })
    return
  }
  if (recordLeafToken(context, node, relation)) {
    return
  }

  const line = nodeLine(context, node)
  const isTestBlock = isTestCaseCall(node)
  if (isTestBlock) {
    pushBoundary(context, line)
  }
  if (type === "TemplateLiteral") {
    recordClassList(context, templateStaticText(node), line)
  }
  context.tokens.push({ kind: "syntax", exact: syntaxTag(node), line })
  visitChildren(context, node)
  if (isTestBlock) {
    pushBoundary(context, line)
  }
}

export function analyzeSourceFile(file: string, source: string): FileAnalysis {
  const parsed = parseSync(file, source)
  const context: WalkContext = {
    lineStarts: lineStartsOf(source),
    tokens: [],
    classLists: [],
    boundaryCount: 0,
  }
  if (isSyntaxNode(parsed.program)) {
    visitNode(context, parsed.program, { parent: null, key: "" })
  }
  return { tokens: context.tokens, classLists: context.classLists }
}
