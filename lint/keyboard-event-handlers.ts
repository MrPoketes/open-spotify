import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins"
import { findVariable } from "./find-variable.ts"
import { memberPropertyName } from "./member-property-name.ts"

export type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function

export interface CollectedKeyboardHandlers {
  readonly functions: Set<FunctionNode>
  readonly variables: Set<Variable>
}

export interface KeyboardEventOwner {
  readonly handler: FunctionNode
  readonly parameter: ESTree.BindingIdentifier
  readonly parameterIndex: number
}

const keyboardPropertyNames = new Set([
  "onKeyDown",
  "onKeyUp",
  "onKeyPress",
  "onKeyDownCapture",
  "onKeyUpCapture",
  "onKeyPressCapture",
])
const keyboardDomEvents = new Set(["keydown", "keyup", "keypress"])
const reactCallbackHooks = new Set(["useCallback", "useEffectEvent"])
const keyboardEventTypeName = "KeyboardEvent"
const keyboardEventHandlerTypeName = "KeyboardEventHandler"

export function recordKeyboardPropertyHandler(
  node: ESTree.JSXAttribute,
  scope: Scope,
  collected: CollectedKeyboardHandlers,
): void {
  if (
    node.name.type !== "JSXIdentifier" ||
    !keyboardPropertyNames.has(node.name.name) ||
    node.value?.type !== "JSXExpressionContainer" ||
    node.value.expression.type === "JSXEmptyExpression"
  ) {
    return
  }
  collectKeyboardHandlers(node.value.expression, scope, collected)
}

export function recordKeyboardObjectHandlers(
  node: ESTree.ObjectExpression,
  sourceCode: SourceCode,
  collected: CollectedKeyboardHandlers,
): void {
  for (const property of node.properties) {
    if (property.type !== "Property") continue
    const keyName = propertyKeyName(property)
    if (keyName !== undefined && keyboardPropertyNames.has(keyName)) {
      collectKeyboardHandlers(property.value, sourceCode.getScope(property), collected)
    }
  }
}

export function recordKeyboardListenerHandler(
  call: ESTree.CallExpression,
  scope: Scope,
  collected: CollectedKeyboardHandlers,
): void {
  const listenerArgument = keyboardListenerArgument(call)
  if (listenerArgument !== undefined) {
    collectKeyboardHandlers(listenerArgument, scope, collected)
  }
}

export function isKeyboardHandler(
  owner: KeyboardEventOwner,
  sourceCode: SourceCode,
  collected: CollectedKeyboardHandlers,
): boolean {
  if (hasTypeReferenceName(owner.parameter.typeAnnotation?.typeAnnotation, keyboardEventTypeName)) {
    return true
  }
  if (owner.parameterIndex !== 0) return false
  if (collected.functions.has(owner.handler)) return true
  const binding = handlerBindingNode(owner.handler)
  if (binding === undefined) return false
  if (
    binding.type === "VariableDeclarator" &&
    binding.id.type === "Identifier" &&
    hasTypeReferenceName(binding.id.typeAnnotation?.typeAnnotation, keyboardEventHandlerTypeName)
  ) {
    return true
  }
  return sourceCode
    .getDeclaredVariables(binding)
    .some((variable) => collected.variables.has(variable))
}

function propertyKeyName(node: ESTree.ObjectProperty): string | undefined {
  if (!node.computed && node.key.type === "Identifier") return node.key.name
  if (node.key.type === "Literal" && typeof node.key.value === "string") return node.key.value
  return undefined
}

function keyboardListenerArgument(call: ESTree.CallExpression): ESTree.Expression | undefined {
  if (
    call.callee.type !== "MemberExpression" ||
    memberPropertyName(call.callee) !== "addEventListener"
  ) {
    return undefined
  }
  const [eventArgument, listenerArgument] = call.arguments
  if (
    eventArgument?.type !== "Literal" ||
    typeof eventArgument.value !== "string" ||
    !keyboardDomEvents.has(eventArgument.value)
  ) {
    return undefined
  }
  return listenerArgument !== undefined && listenerArgument.type !== "SpreadElement"
    ? listenerArgument
    : undefined
}

function collectKeyboardHandlers(
  node: ESTree.Node,
  scope: Scope,
  collected: CollectedKeyboardHandlers,
): void {
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    collected.functions.add(node)
    return
  }
  if (node.type === "Identifier") {
    const variable = findVariable(scope, node.name)
    if (variable !== undefined) collected.variables.add(variable)
    return
  }
  for (const nested of nestedHandlerExpressions(node)) {
    collectKeyboardHandlers(nested, scope, collected)
  }
}

function nestedHandlerExpressions(node: ESTree.Node): ReadonlyArray<ESTree.Node> {
  if (node.type === "ConditionalExpression") return [node.consequent, node.alternate]
  if (node.type === "LogicalExpression") return [node.left, node.right]
  if (node.type === "CallExpression" && isReactCallbackHookCall(node)) {
    const [callback] = node.arguments
    return callback !== undefined && callback.type !== "SpreadElement" ? [callback] : []
  }
  return []
}

function isReactCallbackHookCall(call: ESTree.CallExpression): boolean {
  if (call.callee.type === "Identifier") return reactCallbackHooks.has(call.callee.name)
  if (call.callee.type === "MemberExpression") {
    const property = memberPropertyName(call.callee)
    return property !== undefined && reactCallbackHooks.has(property)
  }
  return false
}

function handlerBindingNode(
  handler: FunctionNode,
): ESTree.Function | ESTree.VariableDeclarator | undefined {
  if (handler.type === "FunctionDeclaration") return handler
  let current: ESTree.Node = handler
  let parent: ESTree.Node = handler.parent
  while (
    parent.type === "CallExpression" &&
    isReactCallbackHookCall(parent) &&
    parent.arguments[0] === current
  ) {
    current = parent
    parent = parent.parent
  }
  return parent.type === "VariableDeclarator" && parent.init === current ? parent : undefined
}

function hasTypeReferenceName(typeNode: ESTree.TSType | undefined, expected: string): boolean {
  if (typeNode === undefined) return false
  if (typeNode.type === "TSTypeReference") {
    return rightmostTypeName(typeNode.typeName) === expected
  }
  if (typeNode.type === "TSUnionType") {
    return typeNode.types.some((member) => hasTypeReferenceName(member, expected))
  }
  return false
}

function rightmostTypeName(typeName: ESTree.TSTypeName): string | undefined {
  if (typeName.type === "Identifier") return typeName.name
  if (typeName.type === "TSQualifiedName") return typeName.right.name
  return undefined
}
