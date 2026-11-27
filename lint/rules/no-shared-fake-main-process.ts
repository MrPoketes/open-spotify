import { defineRule, type ESTree } from "@oxlint/plugins"

const fakeMainProcessFactories = new Set([
  "fakeMainProcess",
  "fakeRendererRuntime",
  "appShellRuntimeWith",
])

const runOnceFunctions = new Set(["describe", "beforeAll"])

// A fake main process keeps saved settings, themes, and folders in memory. One
// made at module or describe level, or in beforeAll, is shared by every test
// that uses it, so a test reading a setting back sees what an earlier test
// saved and passes or fails depending on which tests ran before it.
export const noSharedFakeMainProcess = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow creating a fake main process or runtime outside a test or helper",
    },
    messages: {
      noSharedFakeMainProcess:
        "Create the fake main process or runtime inside the test (or a helper it calls), so no test reads what another test saved.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          fakeMainProcessFactories.has(node.callee.name) &&
          !isInsideTestOrHelper(node)
        ) {
          context.report({ node, messageId: "noSharedFakeMainProcess" })
        }
      },
    }
  },
})

// A describe or beforeAll callback runs once for all its tests, so it does not count.
function isInsideTestOrHelper(node: ESTree.Node): boolean {
  let current: ESTree.Node | null = node.parent
  while (current !== null) {
    if (isFunction(current) && !isRunOnceCallback(current)) {
      return true
    }
    current = current.parent
  }
  return false
}

function isFunction(node: ESTree.Node): boolean {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  )
}

function isRunOnceCallback(node: ESTree.Node): boolean {
  const parent = node.parent
  return parent?.type === "CallExpression" && isRunOnceCall(parent.callee)
}

// Matches describe(...), describe.skip(...), describe.each(table)(...), and
// beforeAll(...).
function isRunOnceCall(callee: ESTree.Node): boolean {
  let current = callee
  while (current.type === "CallExpression" || current.type === "MemberExpression") {
    current = current.type === "CallExpression" ? current.callee : current.object
  }
  return current.type === "Identifier" && runOnceFunctions.has(current.name)
}
