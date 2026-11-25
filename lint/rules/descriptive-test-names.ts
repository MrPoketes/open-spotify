import { defineRule, type ESTree } from "@oxlint/plugins"

const testFunctionNames = new Set(["it", "test"])
const minimumWordCount = 4

// A test name must state the behaviour it protects, e.g. "serves the app
// shell for client-side routes". Names like "works" or "should render" say
// nothing about why the test exists.
export const descriptiveTestNames = defineRule({
  meta: {
    type: "suggestion",
    docs: { description: "Require test names that describe a behaviour" },
  },
  create(context) {
    return {
      CallExpression(node) {
        const title = testTitle(node)
        if (title === undefined) {
          return
        }
        if (/^should\b/i.test(title)) {
          context.report({
            node,
            message: `Write the test name as a statement of behaviour, without "should": "${title}".`,
          })
        } else if (title.trim().split(/\s+/).length < minimumWordCount) {
          context.report({
            node,
            message: `Test name "${title}" is too vague. Describe the behaviour this test protects.`,
          })
        }
      },
    }
  },
})

// Matches it("..."), test("...") and member forms such as it.effect("...").
function testTitle(node: ESTree.CallExpression): string | undefined {
  const [firstArgument] = node.arguments
  if (firstArgument?.type !== "Literal" || typeof firstArgument.value !== "string") {
    return undefined
  }
  const rootName = calleeRootName(node.callee)
  return rootName !== undefined && testFunctionNames.has(rootName) ? firstArgument.value : undefined
}

function calleeRootName(callee: ESTree.Expression): string | undefined {
  if (callee.type === "Identifier") {
    return callee.name
  }
  if (callee.type === "MemberExpression" && callee.object.type === "Identifier") {
    return callee.object.name
  }
  return undefined
}
