import { defineRule } from "@oxlint/plugins"

const disableDirective = /^\s*(oxlint|eslint)-disable/
const explainedDirective = /\s--\s+\S/

// A lint rule may be switched off only with a written reason, e.g.
// `// oxlint-disable-next-line no-console -- printed by the CLI on purpose`.
export const requireDisableReason = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require a reason after every lint disable comment" },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (disableDirective.test(comment.value) && !explainedDirective.test(comment.value)) {
            context.report({
              loc: comment.loc,
              message: 'Explain why the rule is disabled: append " -- <reason>" to the comment.',
            })
          }
        }
      },
    }
  },
})
