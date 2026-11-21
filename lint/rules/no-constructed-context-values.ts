import { defineRule } from "@oxlint/plugins"

// Every reader of a context re-renders when the value changes identity, so a
// value built during render re-renders all of them each time the provider
// renders: an open page's track rows did whenever the queue opened. The
// built-in react/jsx-no-constructed-context-values sees a context only when
// createContext is called in the same file, and here each context lives in
// its own module, so this rule goes by the naming instead.
const constructedValueTypes = new Set([
  "ObjectExpression",
  "ArrayExpression",
  "ArrowFunctionExpression",
  "FunctionExpression",
])

export const noConstructedContextValues = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow context values that are built anew on every render" },
  },
  create(context) {
    return {
      JSXOpeningElement(element) {
        if (element.name.type !== "JSXIdentifier" || !element.name.name.endsWith("Context")) {
          return
        }
        for (const attribute of element.attributes) {
          if (
            attribute.type === "JSXAttribute" &&
            attribute.name.name === "value" &&
            attribute.value?.type === "JSXExpressionContainer" &&
            constructedValueTypes.has(attribute.value.expression.type)
          ) {
            context.report({
              node: attribute,
              message:
                "This value is new on every render, so every reader of the context re-renders. Keep it the same with useMemo or useCallback.",
            })
          }
        }
      },
    }
  },
})
