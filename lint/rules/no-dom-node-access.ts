import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"

// Direct DOM queries and tree-walking properties bypass the accessibility tree
// that users rely on. Component tests should reach elements through Testing
// Library's role or label queries instead.
const domAccessMembers = new Set([
  "querySelector",
  "querySelectorAll",
  "getElementById",
  "getElementsByClassName",
  "getElementsByName",
  "getElementsByTagName",
  "getElementsByTagNameNS",
  "closest",
  "children",
  "childNodes",
  "childElementCount",
  "firstChild",
  "firstElementChild",
  "lastChild",
  "lastElementChild",
  "nextSibling",
  "nextElementSibling",
  "previousSibling",
  "previousElementSibling",
  "parentElement",
  "parentNode",
])

export const noDomNodeAccess = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Disallow direct DOM queries and node traversal in component tests" },
    messages: {
      domNodeAccess:
        'Avoid DOM node access through "{{property}}" in component tests. Use Testing Library role or label queries (such as getByRole, getByLabelText, or within) instead.',
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        const property = accessedPropertyName(node)
        if (property !== undefined && domAccessMembers.has(property)) {
          context.report({ node, messageId: "domNodeAccess", data: { property } })
        }
      },
    }
  },
})

function accessedPropertyName(node: ESTree.MemberExpression): string | undefined {
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name
  }
  if (
    node.computed &&
    node.property.type === "Literal" &&
    typeof node.property.value === "string"
  ) {
    return node.property.value
  }
  return undefined
}
