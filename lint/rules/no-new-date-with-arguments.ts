import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"

const globalObjects = new Set(["globalThis", "window", "self"])

// Constructing Date from a value in renderer or shared code skips validation: a
// malformed string becomes Invalid Date and throws RangeError while formatting.
export const noNewDateWithArguments = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow new Date(...) with arguments in favour of Schema.DateFromString",
    },
    messages: {
      noNewDateWithArguments:
        "Decode dates with Schema.DateFromString at the boundary instead of calling new Date(...) with arguments.",
    },
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.arguments.length > 0 && isDateConstructor(node.callee)) {
          context.report({ node, messageId: "noNewDateWithArguments" })
        }
      },
    }
  },
})

function isDateConstructor(callee: ESTree.Expression): boolean {
  if (callee.type === "Identifier") {
    return callee.name === "Date"
  }
  if (
    callee.type !== "MemberExpression" ||
    callee.object.type !== "Identifier" ||
    !globalObjects.has(callee.object.name)
  ) {
    return false
  }
  if (!callee.computed) {
    return callee.property.type === "Identifier" && callee.property.name === "Date"
  }
  return callee.property.type === "Literal" && callee.property.value === "Date"
}
