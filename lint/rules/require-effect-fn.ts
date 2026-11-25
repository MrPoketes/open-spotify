import { defineRule, type ESTree } from "@oxlint/plugins"
import { memberPropertyName } from "../member-property-name.ts"

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
      if (expression !== undefined && isEffectGenCall(unwrapPipe(expression))) {
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

function pipeTarget(expression: ESTree.Expression): ESTree.Expression | undefined {
  if (
    expression.type !== "CallExpression" ||
    expression.callee.type !== "MemberExpression" ||
    expression.callee.object.type === "Super"
  ) {
    return undefined
  }
  return memberPropertyName(expression.callee) === "pipe" ? expression.callee.object : undefined
}

function unwrapPipe(expression: ESTree.Expression): ESTree.Expression {
  let current = expression
  let target = pipeTarget(current)
  while (target !== undefined) {
    current = target
    target = pipeTarget(current)
  }
  return current
}

function isEffectGenCall(expression: ESTree.Expression): boolean {
  return (
    expression.type === "CallExpression" &&
    expression.callee.type === "MemberExpression" &&
    expression.callee.object.type === "Identifier" &&
    expression.callee.object.name === "Effect" &&
    memberPropertyName(expression.callee) === "gen"
  )
}
