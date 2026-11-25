import { describe, expect, it } from "vitest"
import { sourcesIn } from "./repository-sources.ts"
import { findUnusedExports } from "./unused-exports.ts"

describe("findUnusedExports", () => {
  it("lists an export that no other module imports", () => {
    const sources = new Map([
      ["src/a.ts", 'import { used } from "./b"'],
      ["src/b.ts", "export const used = 1\nexport interface Unused {}"],
    ])

    expect(findUnusedExports(sources)).toEqual(["src/b.ts: Unused"])
  })

  it("counts type imports, renamed imports, and imports with an extension", () => {
    const sources = new Map([
      ["lint/a.ts", 'import { type Shape, render as draw } from "../src/b.ts"'],
      ["src/b.ts", "export type Shape = string\nexport function render() {}"],
    ])

    expect(findUnusedExports(sources)).toEqual([])
  })

  it("lists an export list, which it cannot follow", () => {
    const sources = new Map([["src/a.ts", "const shape = 1\nexport { shape }"]])

    expect(findUnusedExports(sources)).toEqual([
      "src/a.ts: an export list or re-export; export each declaration instead",
    ])
  })

  // An export nobody imports is dead code that still looks like part of a
  // module's contract (AGENTS.md rule 7).
  it("finds no unused exports in the repository", () => {
    const sources = sourcesIn([
      "*.ts",
      "src/**/*.{ts,tsx}",
      "e2e/**/*.ts",
      "lint/**/*.ts",
      "scripts/**/*.ts",
    ])

    expect(findUnusedExports(sources)).toEqual([])
  })
})
