import { defineRule } from "@oxlint/plugins"

// try/catch erases the error type and hides failures from the type checker.
// Effect.try / Effect.tryPromise keep them in the signature instead.
export const noTryCatch = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow try/catch in favour of typed Effect errors" },
  },
  create(context) {
    return {
      TryStatement(node) {
        context.report({
          node,
          message:
            "Use Effect.try or Effect.tryPromise with a tagged error instead of try/catch, and Effect.ensuring instead of finally.",
        })
      },
    }
  },
})
