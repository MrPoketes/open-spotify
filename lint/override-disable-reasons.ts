import { type ESTree, type ParseResult, parseSync } from "vite"

const configPath = "oxlint.config.ts"

type SourceComment = ParseResult["comments"][number]

interface ParsedConfig {
  readonly source: string
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

const lineAt = (source: string, offset: number): number =>
  source.slice(0, offset).split("\n").length

function hasCommentBetween(parsed: ParsedConfig, bounds: CommentBounds): boolean {
  return parsed.comments.some((comment) => {
    if (comment.start <= bounds.after || comment.end >= bounds.before) {
      return false
    }
    if (bounds.afterNewline && !parsed.source.slice(bounds.after, comment.start).includes("\n")) {
      return false
    }
    return hasReasonText(comment)
  })
}

function propertyName(property: ESTree.ObjectProperty): string | null {
  if (property.computed) {
    return null
  }
  if (property.key.type === "Identifier") {
    return property.key.name
  }
  if (property.key.type === "Literal" && typeof property.key.value === "string") {
    return property.key.value
  }
  return null
}

function findProperty(object: ESTree.ObjectExpression, name: string): FoundProperty | null {
  let previousEnd: number | null = null
  for (const entry of object.properties) {
    if (entry.type === "Property" && propertyName(entry) === name) {
      return { property: entry, previousEnd }
    }
    previousEnd = entry.end
  }
  return null
}

function findConfigObject(program: ESTree.Program): ESTree.ObjectExpression | null {
  for (const statement of program.body) {
    if (statement.type !== "ExportDefaultDeclaration") {
      continue
    }
    const { declaration } = statement
    if (declaration.type === "ObjectExpression") {
      return declaration
    }
    if (declaration.type === "CallExpression") {
      const firstArgument = declaration.arguments[0]
      if (firstArgument !== undefined && firstArgument.type === "ObjectExpression") {
        return firstArgument
      }
    }
  }
  return null
}

const isOffLiteral = (node: ESTree.Expression | ESTree.SpreadElement | null | undefined): boolean =>
  node !== null &&
  node !== undefined &&
  node.type === "Literal" &&
  (node.value === "off" || node.value === 0)

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
    if (entry.type !== "Property" || !isOffSeverity(entry.value)) {
      continue
    }
    if (hasCommentBetween(parsed, { after, before: entry.start, afterNewline })) {
      continue
    }
    const ruleName = propertyName(entry) ?? "<computed>"
    const line = lineAt(parsed.source, entry.start)
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
  if (rulesProperty === null || rulesProperty.property.value.type !== "ObjectExpression") {
    return []
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
    return [`${configPath}: expected a default-exported config object`]
  }
  const overridesEntry = findProperty(config, "overrides")
  if (overridesEntry === null) {
    return []
  }
  if (overridesEntry.property.value.type !== "ArrayExpression") {
    return [`${configPath}: expected overrides to be an array literal`]
  }

  const parsed: ParsedConfig = { source, comments: parsedFile.comments }
  const violations: Array<string> = []
  let previousEnd = overridesEntry.property.value.start
  for (const element of overridesEntry.property.value.elements) {
    if (element === null) {
      continue
    }
    if (element.type === "ObjectExpression") {
      violations.push(...unexplainedRulesInOverride(parsed, element, previousEnd))
    }
    previousEnd = element.end
  }
  return violations
}
