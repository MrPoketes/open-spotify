import { parseSync, type ESTree, type ParseResult } from "vite"
import { propertyKeyName } from "./property-key-name.ts"
import { lineAtOffset, lineStartsOf } from "./source-lines.ts"

const configPath = "oxlint.config.ts"

type SourceComment = ParseResult["comments"][number]

interface ParsedConfig {
  readonly lineStarts: ReadonlyArray<number>
  readonly comments: ReadonlyArray<SourceComment>
}

interface FoundProperty {
  readonly property: ESTree.ObjectProperty
  readonly previousEnd: number | null
}

interface CommentBounds {
  readonly after: number
  readonly before: number
  readonly afterNewline: boolean
}

const hasReasonText = (comment: SourceComment): boolean => /[^\s*]/.test(comment.value)

function hasCommentBetween(parsed: ParsedConfig, bounds: CommentBounds): boolean {
  const afterLine = lineAtOffset(parsed.lineStarts, bounds.after)
  return parsed.comments.some((comment) => {
    if (comment.start <= bounds.after || comment.end >= bounds.before) {
      return false
    }
    if (bounds.afterNewline && lineAtOffset(parsed.lineStarts, comment.start) <= afterLine) {
      return false
    }
    return hasReasonText(comment)
  })
}

function findProperty(object: ESTree.ObjectExpression, name: string): FoundProperty | null {
  let previousEnd: number | null = null
  for (const entry of object.properties) {
    if (entry.type === "Property" && propertyKeyName(entry) === name) {
      return { property: entry, previousEnd }
    }
    previousEnd = entry.end
  }
  return null
}

function findConfigObject(program: ESTree.Program): ESTree.ObjectExpression | null {
  for (const statement of program.body) {
    if (
      statement.type === "ExportDefaultDeclaration" &&
      statement.declaration.type === "CallExpression"
    ) {
      const firstArgument = statement.declaration.arguments[0]
      if (firstArgument !== undefined && firstArgument.type === "ObjectExpression") {
        return firstArgument
      }
    }
  }
  return null
}

// Oxlint accepts "off", "allow", and 0 as disabling severities.
const isOffLiteral = (node: ESTree.Expression | ESTree.SpreadElement | null | undefined): boolean =>
  node !== null &&
  node !== undefined &&
  node.type === "Literal" &&
  (node.value === "off" || node.value === "allow" || node.value === 0)

function isOffSeverity(node: ESTree.Expression): boolean {
  if (isOffLiteral(node)) {
    return true
  }
  return node.type === "ArrayExpression" && isOffLiteral(node.elements[0])
}

function overrideHasReasonComment(
  parsed: ParsedConfig,
  override: ESTree.ObjectExpression,
  bounds: { readonly previousOverrideEnd: number; readonly rulesProperty: FoundProperty },
): boolean {
  if (
    hasCommentBetween(parsed, {
      after: bounds.previousOverrideEnd,
      before: override.start,
      afterNewline: true,
    })
  ) {
    return true
  }
  const firstProperty = override.properties[0]
  if (
    firstProperty !== undefined &&
    hasCommentBetween(parsed, {
      after: override.start,
      before: firstProperty.start,
      afterNewline: false,
    })
  ) {
    return true
  }
  return (
    bounds.rulesProperty.previousEnd !== null &&
    hasCommentBetween(parsed, {
      after: bounds.rulesProperty.previousEnd,
      before: bounds.rulesProperty.property.start,
      afterNewline: true,
    })
  )
}

function unexplainedRulesInObject(
  parsed: ParsedConfig,
  rulesObject: ESTree.ObjectExpression,
): ReadonlyArray<string> {
  const violations: Array<string> = []
  let previousEnd: number | null = null
  for (const entry of rulesObject.properties) {
    const after = previousEnd ?? rulesObject.start
    const afterNewline = previousEnd !== null
    previousEnd = entry.end
    if (entry.type !== "Property") {
      const line = lineAtOffset(parsed.lineStarts, entry.start)
      violations.push(`${configPath}:${line}: expected rule entries to be explicit properties`)
      continue
    }
    if (!isOffSeverity(entry.value)) {
      continue
    }
    if (hasCommentBetween(parsed, { after, before: entry.start, afterNewline })) {
      continue
    }
    const ruleName = propertyKeyName(entry) ?? "<computed>"
    const line = lineAtOffset(parsed.lineStarts, entry.start)
    violations.push(`${configPath}:${line}: "${ruleName}" is turned off without a reason comment`)
  }
  return violations
}

function unexplainedRulesInOverride(
  parsed: ParsedConfig,
  override: ESTree.ObjectExpression,
  previousOverrideEnd: number,
): ReadonlyArray<string> {
  const rulesProperty = findProperty(override, "rules")
  if (rulesProperty === null) {
    return []
  }
  if (rulesProperty.property.value.type !== "ObjectExpression") {
    const line = lineAtOffset(parsed.lineStarts, rulesProperty.property.value.start)
    return [`${configPath}:${line}: expected rules to be an object literal`]
  }
  if (overrideHasReasonComment(parsed, override, { previousOverrideEnd, rulesProperty })) {
    return []
  }
  return unexplainedRulesInObject(parsed, rulesProperty.property.value)
}

// Turning a rule off in oxlint.config.ts overrides counts as disabling it and
// needs a written reason (AGENTS.md). Accepts a comment above the override,
// inside the override before its first property, above `rules`, or above the
// specific disabled rule.
export function findUnexplainedOverrideDisables(source: string): ReadonlyArray<string> {
  const parsedFile = parseSync(configPath, source)
  if (parsedFile.errors.length > 0) {
    return [`${configPath}: could not parse config`]
  }
  const config = findConfigObject(parsedFile.program)
  if (config === null) {
    return [`${configPath}: expected a default-exported defineConfig call`]
  }
  const overridesEntry = findProperty(config, "overrides")
  if (overridesEntry === null) {
    return []
  }
  if (overridesEntry.property.value.type !== "ArrayExpression") {
    return [`${configPath}: expected overrides to be an array literal`]
  }

  const parsed: ParsedConfig = {
    lineStarts: lineStartsOf(source),
    comments: parsedFile.comments,
  }
  const violations: Array<string> = []
  let previousEnd = overridesEntry.property.value.start
  for (const element of overridesEntry.property.value.elements) {
    if (element === null) {
      continue
    }
    if (element.type !== "ObjectExpression") {
      const line = lineAtOffset(parsed.lineStarts, element.start)
      violations.push(`${configPath}:${line}: expected an override object literal`)
    } else {
      violations.push(...unexplainedRulesInOverride(parsed, element, previousEnd))
    }
    previousEnd = element.end
  }
  return violations
}
