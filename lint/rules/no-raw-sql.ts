import { defineRule, type ESTree } from "@oxlint/plugins"
import { importedExportName } from "../imported-export-name.ts"
import { memberPropertyName } from "../member-property-name.ts"

const sqlClientNames = new Set(["SqlClient", "SqliteClient"])
const rawSqlMethods = new Set(["unsafe", "literal", "raw"])
const drizzlePackage = "drizzle-orm"
const drizzleSubpathPrefix = "drizzle-orm/"

// Raw SQL hides column names and result shapes inside strings, so typos and
// schema renames fail only at runtime. Queries go through the Drizzle query
// builder (src/main/database.ts and src/main/database-schema.ts).
export const noRawSql = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw SQL tagged templates and sql.unsafe / sql.literal / sql.raw calls",
    },
    messages: {
      noRawSql:
        "Use the Drizzle query builder through Database (src/main/database.ts) and src/main/database-schema.ts instead of raw SQL.",
    },
  },
  create(context) {
    const sqlIdentifiers = new Set(["sql"])

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type" || !isDrizzleImport(node.source.value)) {
          return
        }
        collectDrizzleSqlAliases(node, sqlIdentifiers)
      },
      VariableDeclarator(node) {
        if (node.id.type === "Identifier" && node.init !== null && isYieldedSqlClient(node.init)) {
          sqlIdentifiers.add(node.id.name)
        }
      },
      TaggedTemplateExpression(node) {
        if (isRawSqlReference(node.tag, sqlIdentifiers)) {
          context.report({ node, messageId: "noRawSql" })
        }
      },
      CallExpression(node) {
        if (isRawSqlMethodCall(node.callee, sqlIdentifiers)) {
          context.report({ node, messageId: "noRawSql" })
        }
      },
    }
  },
})

function isDrizzleImport(source: string): boolean {
  return source === drizzlePackage || source.startsWith(drizzleSubpathPrefix)
}

function collectDrizzleSqlAliases(
  node: ESTree.ImportDeclaration,
  sqlIdentifiers: Set<string>,
): void {
  for (const specifier of node.specifiers) {
    if (
      specifier.type === "ImportSpecifier" &&
      specifier.importKind !== "type" &&
      importedExportName(specifier.imported) === "sql"
    ) {
      sqlIdentifiers.add(specifier.local.name)
    }
  }
}

function isYieldedSqlClient(init: ESTree.Expression): boolean {
  if (init.type !== "YieldExpression" || init.argument === null) {
    return false
  }
  const target = init.argument
  if (target.type === "Identifier") {
    return sqlClientNames.has(target.name)
  }
  if (
    target.type === "MemberExpression" &&
    target.object.type === "Identifier" &&
    sqlClientNames.has(target.object.name)
  ) {
    const property = memberPropertyName(target)
    return property !== undefined && sqlClientNames.has(property)
  }
  return false
}

function isRawSqlReference(node: ESTree.Expression, sqlIdentifiers: ReadonlySet<string>): boolean {
  if (node.type === "Identifier") {
    return sqlIdentifiers.has(node.name)
  }
  if (node.type === "MemberExpression") {
    return memberPropertyName(node) === "sql"
  }
  return false
}

function isRawSqlMethodCall(
  callee: ESTree.Expression,
  sqlIdentifiers: ReadonlySet<string>,
): boolean {
  if (callee.type !== "MemberExpression") {
    return false
  }
  const method = memberPropertyName(callee)
  return (
    method !== undefined &&
    rawSqlMethods.has(method) &&
    isRawSqlReference(callee.object, sqlIdentifiers)
  )
}
