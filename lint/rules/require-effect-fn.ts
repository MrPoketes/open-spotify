import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"

// Wrapping Effect.gen in a parameterised function skips the tracing span and
// call-site stack trace that Effect.fn("name")(function* ...) provides.
export const requireEffectFn = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Require Effect.fn instead of parameterised functions that return Effect.gen",
    },
  },
  create(context) {
    function checkFunction(node: ESTree.ArrowFunctionExpression | ESTree.Function) {
      if (node.params.length === 0) {
        return
      }
      const expression = returnedExpression(node.body)
      if (expression !== undefined && isEffectGenCall(expression)) {
        context.report({
          node,
          message: 'Use Effect.fn("name")(function* ...) instead of returning Effect.gen.',
        })
      }
    }

    return {
      ArrowFunctionExpression: checkFunction,
      FunctionExpression: checkFunction,
      FunctionDeclaration: checkFunction,
    }
  },
})

function returnedExpression(
  body: ESTree.ArrowFunctionExpression["body"] | null,
): ESTree.Expression | undefined {
  if (body === null) {
    return undefined
  }
  if (body.type !== "BlockStatement") {
    return body
  }
  if (body.body.length !== 1) {
    return undefined
  }
  const [statement] = body.body
  if (statement?.type === "ReturnStatement" && statement.argument !== null) {
    return statement.argument
  }
  return undefined
}

function isEffectGenCall(expression: ESTree.Expression): boolean {
  return (
    expression.type === "CallExpression" &&
    expression.callee.type === "MemberExpression" &&
    !expression.callee.computed &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.object.name === "Effect" &&
    expression.callee.property.type === "Identifier" &&
    expression.callee.property.name === "gen"
  )
}
