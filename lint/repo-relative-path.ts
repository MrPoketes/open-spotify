import path from "node:path"

export function repoRelativePath(cwd: string, filePath: string): string {
  return path.relative(cwd, path.resolve(cwd, filePath)).replaceAll("\\", "/")
}
