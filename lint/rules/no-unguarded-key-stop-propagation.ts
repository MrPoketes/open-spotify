import { defineRule, type ESTree, type SourceCode } from "@oxlint/plugins"
import {
  isKeyboardHandler,
  recordKeyboardListenerHandler,
  recordKeyboardObjectHandlers,
  recordKeyboardPropertyHandler,
  type CollectedKeyboardHandlers,
  type FunctionNode,
  type KeyboardEventOwner,
} from "../keyboard-event-handlers.ts"
import { memberPropertyName } from "../member-property-name.ts"

// App-wide shortcuts (Alt+Arrow, Alt+Shift+Q, Cmd+[/]) listen on window.
// A keyboard handler that stops propagation without returning early on
// hasShortcutModifier swallows those shortcuts while its element has focus.
const stopPropagationMethods = new Set(["stopPropagation", "stopImmediatePropagation"])
const shortcutGuardName = "hasShortcutModifier"

export const noUnguardedKeyStopPropagation = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require keyboard event handlers to return early on hasShortcutModifier before calling stopPropagation",
    },
    messages: {
      unguardedStopPropagation:
        "Return early when hasShortcutModifier(event) is true before calling stopPropagation() in a keyboard handler, so app-wide shortcuts still reach window.",
    },
  },
  create(context) {
    const collected: CollectedKeyboardHandlers = { functions: new Set(), variables: new Set() }
    const stopPropagationCalls: Array<ESTree.CallExpression> = []

    return {
      JSXAttribute(node) {
        recordKeyboardPropertyHandler(node, context.sourceCode.getScope(node), collected)
      },
      ObjectExpression(node) {
        recordKeyboardObjectHandlers(node, context.sourceCode, collected)
      },
      CallExpression(node) {
        recordKeyboardListenerHandler(node, context.sourceCode.getScope(node), collected)
        if (stoppedEventName(node) !== undefined) {
          stopPropagationCalls.push(node)
        }
      },
      "Program:exit"() {
        for (const call of stopPropagationCalls) {
          if (isUnguardedStopPropagation(call, context.sourceCode, collected)) {
            context.report({ node: call, messageId: "unguardedStopPropagation" })
          }
        }
      },
    }
  },
})

function isUnguardedStopPropagation(
  call: ESTree.CallExpression,
  sourceCode: SourceCode,
  collected: CollectedKeyboardHandlers,
): boolean {
  const eventName = stoppedEventName(call)
  if (eventName === undefined) return false
  const owner = findEventOwner(call, eventName)
  if (owner === undefined) return false
  if (!isKeyboardHandler(owner, sourceCode, collected)) return false
  return !hasPriorShortcutReturn(call, owner.handler, eventName)
}

function stoppedEventName(call: ESTree.CallExpression): string | undefined {
  if (call.callee.type !== "MemberExpression") return undefined
  const method = memberPropertyName(call.callee)
  if (method === undefined || !stopPropagationMethods.has(method)) return undefined
  return eventIdentifierName(call.callee.object)
}

function eventIdentifierName(node: ESTree.Node): string | undefined {
  if (node.type === "Identifier") return node.name
  if (
    node.type === "MemberExpression" &&
    memberPropertyName(node) === "nativeEvent" &&
    node.object.type === "Identifier"
  ) {
    return node.object.name
  }
  return undefined
}

function findEventOwner(
  call: ESTree.CallExpression,
  eventName: string,
): KeyboardEventOwner | undefined {
  let current: ESTree.Node | null = call.parent
  while (current !== null) {
    if (isFunctionNode(current)) {
      const match = findNamedParameter(current, eventName)
      if (match !== undefined) return match
    }
    current = current.parent
  }
  return undefined
}

function isFunctionNode(node: ESTree.Node): node is FunctionNode {
  return (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  )
}

function findNamedParameter(
  handler: FunctionNode,
  eventName: string,
): KeyboardEventOwner | undefined {
  for (const [parameterIndex, parameter] of handler.params.entries()) {
    if (parameter.type === "Identifier" && parameter.name === eventName) {
      return { handler, parameter, parameterIndex }
    }
  }
  return undefined
}

function hasPriorShortcutReturn(
  call: ESTree.CallExpression,
  handler: FunctionNode,
  eventName: string,
): boolean {
  let current: ESTree.Node = call
  while (current !== handler) {
    const parent: ESTree.Node | null = current.parent
    if (parent === null) return false
    const statements = enclosingStatements(parent)
    if (statements !== undefined && hasShortcutReturnBefore(statements, current, eventName)) {
      return true
    }
    current = parent
  }
  return false
}

function enclosingStatements(node: ESTree.Node): ReadonlyArray<ESTree.Statement> | undefined {
  if (node.type === "BlockStatement") return node.body
  if (node.type === "SwitchCase") return node.consequent
  return undefined
}

function hasShortcutReturnBefore(
  statements: ReadonlyArray<ESTree.Statement>,
  stopAt: ESTree.Node,
  eventName: string,
): boolean {
  for (const statement of statements) {
    if (statement === stopAt) return false
    if (
      statement.type === "IfStatement" &&
      matchesShortcutModifier(statement.test, eventName) &&
      alwaysReturns(statement.consequent)
    ) {
      return true
    }
  }
  return false
}

function matchesShortcutModifier(expression: ESTree.Expression, eventName: string): boolean {
  if (expression.type === "LogicalExpression" && expression.operator === "||") {
    return (
      matchesShortcutModifier(expression.left, eventName) ||
      matchesShortcutModifier(expression.right, eventName)
    )
  }
  if (
    expression.type !== "CallExpression" ||
    expression.callee.type !== "Identifier" ||
    expression.callee.name !== shortcutGuardName
  ) {
    return false
  }
  const [argument] = expression.arguments
  return argument !== undefined && eventIdentifierName(argument) === eventName
}

function alwaysReturns(statement: ESTree.Statement): boolean {
  if (statement.type === "ReturnStatement") return true
  if (statement.type === "BlockStatement") return statement.body.some(alwaysReturns)
  return false
}
