import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"

// Effect.promise tells the compiler that the promise never rejects; if it does,
// the failure turns into an untyped defect.
export const noEffectPromise = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Effect.promise unless disabled with a reason why the promise cannot reject",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isEffectPromise(node.callee)) {
          context.report({
            node,
            message:
              "Use Effect.tryPromise with a Schema.TaggedError instead of Effect.promise, or disable this rule with a reason explaining why the promise cannot reject.",
          })
        }
      },
    }
  },
})

function isEffectPromise(callee: ESTree.Expression): boolean {
  if (
    callee.type !== "MemberExpression" ||
    callee.object.type !== "Identifier" ||
    callee.object.name !== "Effect"
  ) {
    return false
  }
  if (!callee.computed) {
    return callee.property.type === "Identifier" && callee.property.name === "promise"
  }
  return callee.property.type === "Literal" && callee.property.value === "promise"
}
