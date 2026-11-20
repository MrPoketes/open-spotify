import path from "node:path"
import { defineRule } from "@oxlint/plugins"

// Files with these names collect unrelated code over time. A module should be
// named after the one thing it does, e.g. `format-duration.ts`.
const junkDrawerNames = new Set([
  "common",
  "constants",
  "functions",
  "helper",
  "helpers",
  "misc",
  "stuff",
  "types",
  "util",
  "utils",
])

export const noJunkDrawerModules = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow catch-all module names such as utils.ts or helpers.ts" },
  },
  create(context) {
    const [moduleName = ""] = path.basename(context.filename).split(".")
    if (!junkDrawerNames.has(moduleName)) {
      return {}
    }
    return {
      Program(node) {
        context.report({
          node,
          message: `"${moduleName}" is a catch-all name. Name the module after the one thing it does.`,
        })
      },
    }
  },
})
