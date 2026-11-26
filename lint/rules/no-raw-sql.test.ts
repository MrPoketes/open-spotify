import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noRawSql } from "./no-raw-sql.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const expectedMessage =
  "Use the Drizzle query builder through Database (src/main/database.ts) and src/main/database-schema.ts instead of raw SQL."

ruleTester.run("no-raw-sql", noRawSql, {
  valid: [
    "database.run((drizzle) => drizzle.select().from(settingsTable).where(eq(settingsTable.key, key)))",
    "html`<div>ok</div>`",
    "String.raw`hello`",
    'schema.literal("ok")',
    'parser.unsafe("input")',
    'sql[method]("SELECT 1")',
    { code: 'import type { sql as RawSql } from "drizzle-orm"; RawSql`ok`', filename: "module.ts" },
    { code: 'import { type sql as RawSql } from "drizzle-orm"; RawSql`ok`', filename: "module.ts" },
  ],
  invalid: [
    {
      code: "sql`SELECT value FROM settings WHERE key = ${key}`",
      errors: [{ message: expectedMessage }],
    },
    {
      code: "sql<string>`lower(${settingsTable.key})`",
      filename: "query.ts",
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'sql.unsafe("SELECT * FROM settings")',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'sql.literal("ORDER BY position")',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'sql.raw("SELECT 1")',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'sql["unsafe"]("SELECT 1")',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'drizzle.$client.unsafe("SELECT 1")',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'import { sql as rawSql } from "drizzle-orm"; rawSql`SELECT 1`',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'import { sql as rawSql } from "drizzle-orm/sql"; rawSql.raw("SELECT 1")',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'import * as drizzle from "drizzle-orm"; drizzle.sql`SELECT 1`',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'import * as drizzle from "drizzle-orm"; drizzle.sql.raw("SELECT 1")',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: "function* run() { const client = yield* SqlClient.SqlClient; yield* client`SELECT 1` }",
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'function* run() { const client = yield* SqlClient.SqlClient; yield* client.unsafe("SELECT 1") }',
      errors: [{ messageId: "noRawSql" }],
    },
    {
      code: 'function* run() { const client = yield* SqliteClient; yield* client.literal("ASC") }',
      errors: [{ messageId: "noRawSql" }],
    },
  ],
})
