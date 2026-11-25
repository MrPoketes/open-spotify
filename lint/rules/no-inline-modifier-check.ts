import path from "node:path"
import { defineRule, type ESTree } from "@oxlint/plugins"
import { memberPropertyName } from "../member-property-name.ts"

// Key handlers outside src/renderer/ui/has-shortcut-modifier.ts should not
// check Ctrl, Alt, and Cmd inline: copied checks drift apart when one copy
// changes and the rest do not.
const sharedHelperPath = "src/renderer/ui/has-shortcut-modifier.ts"
const modifierKeys = new Set(["ctrlKey", "metaKey", "altKey"])
const comparisonOperators = new Set(["===", "!==", "==", "!="])

export const noInlineModifierCheck = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline logical expressions checking multiple Ctrl/Alt/Cmd modifier keys outside the shared helper",
    },
    messages: {
      inlineModifierCheck:
        "Use hasShortcutModifier from src/renderer/ui/has-shortcut-modifier.ts instead of checking ctrlKey, metaKey, and altKey inline. For a specific shortcut chord, use matchesKeyCombo or disable this rule with a reason.",
    },
  },
  create(context) {
    const filePath = path.resolve(context.cwd, context.filename)
    const relativePath = path.relative(context.cwd, filePath).replaceAll("\\", "/")
    if (relativePath === sharedHelperPath) {
      return {}
    }

    return {
      LogicalExpression(node) {
        if (isNestedInLogicalExpression(node)) {
          return
        }
        const modifiers = new Set<string>()
        collectModifierKeys(node, modifiers)
        if (modifiers.size >= 2) {
          context.report({ node, messageId: "inlineModifierCheck" })
        }
      },
    }
  },
})

function isNestedInLogicalExpression(node: ESTree.LogicalExpression): boolean {
  let current: ESTree.Node | null = node.parent
  while (current !== null) {
    if (current.type === "LogicalExpression") {
      return true
    }
    if (!isLogicalWrapper(current)) {
      return false
    }
    current = current.parent
  }
  return false
}

function isLogicalWrapper(node: ESTree.Node): boolean {
  if (unwrapExpression(node) !== undefined) {
    return true
  }
  if (node.type === "UnaryExpression") {
    return node.operator === "!"
  }
  return node.type === "BinaryExpression" && comparisonOperators.has(node.operator)
}

function collectModifierKeys(node: ESTree.Node, modifiers: Set<string>): void {
  if (node.type === "LogicalExpression") {
    collectModifierKeys(node.left, modifiers)
    collectModifierKeys(node.right, modifiers)
    return
  }
  if (node.type === "BinaryExpression") {
    if (comparisonOperators.has(node.operator)) {
      collectModifierKeys(node.left, modifiers)
      collectModifierKeys(node.right, modifiers)
    }
    return
  }
  if (node.type === "UnaryExpression") {
    if (node.operator === "!") {
      collectModifierKeys(node.argument, modifiers)
    }
    return
  }
  const unwrapped = unwrapExpression(node)
  if (unwrapped !== undefined) {
    collectModifierKeys(unwrapped, modifiers)
    return
  }
  const modifier = modifierKeyName(node)
  if (modifier !== undefined) {
    modifiers.add(modifier)
  }
}

function unwrapExpression(node: ESTree.Node): ESTree.Node | undefined {
  if (
    node.type === "ChainExpression" ||
    node.type === "TSAsExpression" ||
    node.type === "TSNonNullExpression"
  ) {
    return node.expression
  }
  return undefined
}

function modifierKeyName(node: ESTree.Node): string | undefined {
  if (node.type === "Identifier") {
    return modifierKeys.has(node.name) ? node.name : undefined
  }
  if (node.type !== "MemberExpression") {
    return undefined
  }
  const property = memberPropertyName(node)
  return property !== undefined && modifierKeys.has(property) ? property : undefined
}
