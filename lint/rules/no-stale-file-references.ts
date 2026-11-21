import { existsSync } from "node:fs"
import path from "node:path"
import { defineRule } from "@oxlint/plugins"

// A path from the repository root with a file extension, such as
// src/shared/theme.ts, that is not part of a longer path or URL.
const repositoryFilePath = /(?<![\w./-])(?:src|lint|e2e|docs|scripts|build)\/[\w./$-]*\.\w+/g

// A comment that names a file helps only while the file exists. When the file
// moves or is deleted, the comment sends the next reader to nothing.
export const noStaleFileReferences = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow comments that name a file that does not exist" },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          for (const [filePath] of comment.value.matchAll(repositoryFilePath)) {
            if (!existsSync(path.join(context.cwd, filePath))) {
              context.report({
                loc: comment.loc,
                message: `${filePath} does not exist. Point the comment at the file's new home.`,
              })
            }
          }
        }
      },
    }
  },
})
