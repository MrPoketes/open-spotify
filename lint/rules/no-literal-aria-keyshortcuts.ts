import { defineRule, type ESTree } from "@oxlint/plugins"
import { repoRelativePath } from "../repo-relative-path.ts"

const attributeName = "aria-keyshortcuts"
const allowedShortcutLiteral = "Shift+F10"
const shortcutsDirectoryPrefix = "src/renderer/features/shortcuts/"

type ReportNode = (node: ESTree.Node) => void
type LiteralNode = Extract<ESTree.Node, { readonly type: "Literal" }>

// Every shortcut announced in aria-keyshortcuts belongs in the shortcut
// registry (src/renderer/features/shortcuts/keyboard-shortcuts.ts) so the
// shortcuts dialog lists it too. Shift+F10 is the platform context-menu key
// and does not live in the registry.
export const noLiteralAriaKeyshortcuts = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow string literals in aria-keyshortcuts outside the shortcut registry so every shortcut appears in the shortcuts dialog",
    },
    messages: {
      literalAriaKeyshortcuts:
        'Take aria-keyshortcuts from the shortcut registry in src/renderer/features/shortcuts/keyboard-shortcuts.ts (via useRowShortcut or ariaKeyShortcut) instead of a literal, so the shortcuts dialog lists it too. Only "Shift+F10" is allowed as a literal.',
    },
  },
  create(context) {
    if (repoRelativePath(context.cwd, context.filename).startsWith(shortcutsDirectoryPrefix)) {
      return {}
    }

    const report: ReportNode = (node) => {
      context.report({ node, messageId: "literalAriaKeyshortcuts" })
    }

    return {
      JSXAttribute(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== attributeName ||
          node.value === null
        ) {
          return
        }
        if (node.value.type === "Literal") {
          checkStringLiteral(node.value, report)
          return
        }
        if (
          node.value.type === "JSXExpressionContainer" &&
          node.value.expression.type !== "JSXEmptyExpression"
        ) {
          checkExpression(node.value.expression, report)
        }
      },
      ObjectExpression(node) {
        for (const property of node.properties) {
          if (
            property.type === "Property" &&
            property.kind === "init" &&
            property.key.type === "Literal" &&
            property.key.value === attributeName
          ) {
            checkExpression(property.value, report)
          }
        }
      },
    }
  },
})

function checkStringLiteral(node: LiteralNode, report: ReportNode): void {
  if (typeof node.value === "string" && node.value !== allowedShortcutLiteral) {
    report(node)
  }
}

function unwrapExpression(node: ESTree.Expression): ESTree.Expression {
  let current = node
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

function checkExpression(rawNode: ESTree.Expression, report: ReportNode): void {
  const node = unwrapExpression(rawNode)
  if (node.type === "Literal") {
    checkStringLiteral(node, report)
    return
  }
  if (node.type === "TemplateLiteral") {
    checkTemplateLiteral(node, report)
    return
  }
  if (node.type === "ConditionalExpression") {
    checkExpression(node.consequent, report)
    checkExpression(node.alternate, report)
    return
  }
  if (node.type === "LogicalExpression") {
    if (node.operator !== "&&") {
      checkExpression(node.left, report)
    }
    checkExpression(node.right, report)
    return
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    checkConcatenationPart(node.left, report)
    checkConcatenationPart(node.right, report)
  }
}

function checkTemplateLiteral(node: ESTree.TemplateLiteral, report: ReportNode): void {
  if (node.expressions.length === 0) {
    const text = node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? ""
    if (text !== allowedShortcutLiteral) {
      report(node)
    }
    return
  }
  const hasDisallowedQuasi = node.quasis.some((quasi, index) =>
    isDisallowedTemplateQuasi(quasi, index, node.quasis.length),
  )
  if (hasDisallowedQuasi) {
    report(node)
  }
  for (const expression of node.expressions) {
    checkExpression(expression, report)
  }
}

function isDisallowedTemplateQuasi(
  quasi: ESTree.TemplateElement,
  index: number,
  count: number,
): boolean {
  const text = quasi.value.cooked ?? quasi.value.raw
  if (text.trim() === "") {
    return false
  }
  const hasLeadingGap = index === 0 || /^\s/.test(text)
  const hasTrailingGap = index === count - 1 || /\s$/.test(text)
  return !hasLeadingGap || !hasTrailingGap || isDisallowedShortcutPart(text)
}

function checkConcatenationPart(
  node: ESTree.Expression | ESTree.PrivateIdentifier,
  report: ReportNode,
): void {
  if (node.type === "PrivateIdentifier") {
    return
  }
  const unwrapped = unwrapExpression(node)
  if (unwrapped.type === "Literal") {
    if (typeof unwrapped.value === "string" && isDisallowedShortcutPart(unwrapped.value)) {
      report(unwrapped)
    }
    return
  }
  checkExpression(unwrapped, report)
}

function isDisallowedShortcutPart(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed === "") {
    return false
  }
  return trimmed.split(/\s+/).some((token) => token !== allowedShortcutLiteral)
}
