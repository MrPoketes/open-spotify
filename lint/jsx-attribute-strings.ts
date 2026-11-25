import type { ESTree } from "@oxlint/plugins"
import { interpolationPlaceholder } from "./tailwind-classes.ts"

export function findJsxAttribute(
  element: ESTree.JSXOpeningElement,
  name: string,
): ESTree.JSXAttribute | undefined {
  for (const attribute of element.attributes) {
    if (
      attribute.type === "JSXAttribute" &&
      attribute.name.type === "JSXIdentifier" &&
      attribute.name.name === name
    ) {
      return attribute
    }
  }
  return undefined
}

export function jsxAttributeStrings(attribute: ESTree.JSXAttribute): ReadonlyArray<string> {
  if (attribute.value === null) {
    return []
  }
  if (attribute.value.type === "Literal") {
    return typeof attribute.value.value === "string" ? [attribute.value.value] : []
  }
  if (attribute.value.type === "JSXExpressionContainer") {
    return expressionStrings(attribute.value.expression)
  }
  return []
}

function expressionStrings(
  expression: ESTree.Expression | ESTree.JSXEmptyExpression,
): ReadonlyArray<string> {
  if (expression.type === "Literal") {
    return typeof expression.value === "string" ? [expression.value] : [interpolationPlaceholder]
  }
  if (expression.type === "TemplateLiteral") {
    return templateStrings(expression)
  }
  if (expression.type === "ConditionalExpression") {
    return [...expressionStrings(expression.consequent), ...expressionStrings(expression.alternate)]
  }
  return [interpolationPlaceholder]
}

function templateStrings(template: ESTree.TemplateLiteral): ReadonlyArray<string> {
  let values: ReadonlyArray<string> = [template.quasis[0]?.value.raw ?? ""]
  for (const [index, expression] of template.expressions.entries()) {
    const parts = expressionStrings(expression)
    const nextQuasi = template.quasis[index + 1]?.value.raw ?? ""
    values = values.flatMap((prefix) => parts.map((part) => `${prefix}${part}${nextQuasi}`))
  }
  return values
}
