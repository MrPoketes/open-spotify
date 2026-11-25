import { defineRule, type ESTree } from "@oxlint/plugins"
import { memberPropertyName } from "../member-property-name.ts"

// Direct DOM queries and tree-walking properties bypass the accessibility tree
// that users rely on. Component tests and their helpers should reach elements
// through Testing Library's role or label queries instead.
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

const testFilePattern = /\.test\.tsx?$/

const isTestPackage = (specifier: string) =>
  specifier.startsWith("@testing-library/") || specifier === "vitest"

export const noDomNodeAccess = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow direct DOM queries and node traversal in component tests and helpers",
    },
    messages: {
      domNodeAccess:
        'Avoid DOM node access through "{{property}}" in component tests and test helpers. Use Testing Library role or label queries (such as getByRole, getByLabelText, or within) instead.',
    },
  },
  create(context) {
    let inTestModule = testFilePattern.test(context.filename)
    const accesses: Array<{ readonly node: ESTree.MemberExpression; readonly property: string }> =
      []

    return {
      ImportDeclaration(node) {
        if (isTestPackage(node.source.value)) {
          inTestModule = true
        }
      },
      MemberExpression(node) {
        const property = memberPropertyName(node)
        if (property !== undefined && domAccessMembers.has(property)) {
          accesses.push({ node, property })
        }
      },
      "Program:exit"() {
        if (!inTestModule) {
          return
        }
        for (const { node, property } of accesses) {
          context.report({ node, messageId: "domNodeAccess", data: { property } })
        }
      },
    }
  },
})
