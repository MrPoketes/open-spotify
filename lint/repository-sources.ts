import { globSync, readFileSync } from "node:fs"

export const sourcesIn = (patterns: ReadonlyArray<string>) =>
  new Map(
    globSync(patterns, { exclude: ["**/node_modules/**", "**/*.gen.ts", "**/*.d.ts"] }).map(
      (file) => [file.replaceAll("\\", "/"), readFileSync(file, "utf8")],
    ),
  )
