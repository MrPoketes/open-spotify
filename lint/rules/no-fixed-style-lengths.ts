import { defineRule, type ESTree, type Scope, type Variable } from "@oxlint/plugins"
import { findVariable } from "../find-variable.ts"
import { propertyKeyName } from "../property-key-name.ts"
import { unwrapTypeAssertions } from "../unwrap-type-assertions.ts"

const layoutLengthProperty =
  /^(?:(?:padding|margin|inset|scrollPadding|scrollMargin)(?:[A-Z]\w*)?|top|right|bottom|left|gap|rowGap|columnGap|(?:min|max)(?:Width|Height)|width|height)$/

const lengthLiteral = /\d(?:px|rem|em)\b/
const lengthUnit = /^(?:px|rem|em)\b/

interface Resolver {
  readonly scope: Scope
  readonly visited: Set<Variable>
}

// The theme's spacing token is one step of the spacing scale, and a larger
// step makes the whole app roomier (docs/themes.md). A pixel length written
// into a style prop skips the token, so a theme can no longer change it: the
// top bar once stayed 56 px tall while the icon buttons in it grew past it.
// Only a value worked out at run time, such as a pane width the user dragged,
// belongs in a style prop. Imported identifiers count as fixed, because a
// linter cannot follow them into the module that exports them.
export const noFixedStyleLengths = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow fixed layout lengths in style props, which the theme cannot scale",
    },
    messages: {
      fixedStyleLength:
        "{{property}} is a fixed length, so the theme's spacing token cannot scale it. Use a spacing-scale class such as pt-4 or h-14, or calc(var(--theme-spacing) * n). A style prop holds only values worked out at run time.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const style = styleObject(node)
        if (style === undefined) {
          return
        }
        const resolver = { scope: context.sourceCode.getScope(node), visited: new Set<Variable>() }
        for (const property of style.properties) {
          if (property.type !== "Property") {
            continue
          }
          const name = propertyKeyName(property)
          if (
            name !== undefined &&
            layoutLengthProperty.test(name) &&
            isFixedLength(property.value, resolver)
          ) {
            context.report({
              node: property,
              messageId: "fixedStyleLength",
              data: { property: name },
            })
          }
        }
      },
    }
  },
})

function styleObject(attribute: ESTree.JSXAttribute): ESTree.ObjectExpression | undefined {
  if (
    attribute.name.type !== "JSXIdentifier" ||
    attribute.name.name !== "style" ||
    attribute.value?.type !== "JSXExpressionContainer" ||
    attribute.value.expression.type !== "ObjectExpression"
  ) {
    return undefined
  }
  return attribute.value.expression
}

function isFixedLength(expression: ESTree.Expression, resolver: Resolver): boolean {
  const unwrapped = unwrapTypeAssertions(expression)
  if (unwrapped.type === "Literal") {
    return isLengthLiteral(unwrapped.value)
  }
  if (unwrapped.type === "TemplateLiteral") {
    return isFixedTemplate(unwrapped, resolver)
  }
  if (unwrapped.type === "Identifier") {
    return isFixedVariable(findVariable(resolver.scope, unwrapped.name), resolver)
  }
  if (unwrapped.type === "ConditionalExpression") {
    return [unwrapped.consequent, unwrapped.alternate].some((branch) =>
      isFixedLength(branch, resolver),
    )
  }
  if (unwrapped.type === "LogicalExpression" || unwrapped.type === "BinaryExpression") {
    return [unwrapped.left, unwrapped.right].some((operand) => isFixedOperand(operand, resolver))
  }
  return false
}

// A bare number beside a variable, as in `level - 1`, is a count or a factor
// rather than a length, so only a named length makes a sum or product fixed.
function isFixedOperand(
  operand: ESTree.Expression | ESTree.PrivateIdentifier,
  resolver: Resolver,
): boolean {
  if (operand.type === "PrivateIdentifier" || operand.type === "Literal") {
    return false
  }
  return isFixedLength(operand, resolver)
}

function isFixedVariable(variable: Variable | undefined, resolver: Resolver): boolean {
  if (variable === undefined || resolver.visited.has(variable)) {
    return false
  }
  resolver.visited.add(variable)
  const isFixed = variable.defs.some(
    (definition) =>
      definition.type === "ImportBinding" ||
      (definition.type === "Variable" &&
        definition.parent?.type === "VariableDeclaration" &&
        definition.parent.kind === "const" &&
        definition.node.type === "VariableDeclarator" &&
        definition.node.init !== null &&
        isFixedLength(definition.node.init, resolver)),
  )
  resolver.visited.delete(variable)
  return isFixed
}

function isFixedTemplate(template: ESTree.TemplateLiteral, resolver: Resolver): boolean {
  if (template.quasis.some((quasi) => lengthLiteral.test(quasi.value.raw))) {
    return true
  }
  return template.expressions.some((expression, index) => {
    const textAfter = template.quasis[index + 1]?.value.raw ?? ""
    return lengthUnit.test(textAfter) && isFixedLength(expression, resolver)
  })
}

function isLengthLiteral(value: unknown): boolean {
  if (typeof value === "number") {
    return value !== 0
  }
  return typeof value === "string" && lengthLiteral.test(value)
}
