import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"

// Effect.fn("name") attaches a span and captures the call-site stack trace,
// whereas Effect.withSpan only wraps a body and encourages plain arrow
// functions around Effect.gen.
export const noEffectWithSpan = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow Effect.withSpan in favour of Effect.fn" },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isEffectWithSpan(node.callee)) {
          context.report({
            node,
            message: 'Use Effect.fn("name") instead of Effect.withSpan.',
          })
        }
      },
    }
  },
})

function isEffectWithSpan(callee: ESTree.Expression): boolean {
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.object.name === "Effect" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "withSpan"
  )
}
