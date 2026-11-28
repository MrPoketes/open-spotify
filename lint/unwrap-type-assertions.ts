import type { ESTree } from "@oxlint/plugins"

export function unwrapTypeAssertions(expression: ESTree.Expression): ESTree.Expression {
  let current = expression
  while (
    current.type === "TSAsExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSNonNullExpression" ||
    current.type === "TSTypeAssertion"
  ) {
    current = current.expression
  }
  return current
}
