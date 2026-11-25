import type { Scope, Variable } from "@oxlint/plugins"

export function findVariable(scope: Scope, name: string): Variable | undefined {
  let current: Scope | null = scope
  while (current !== null) {
    const variable = current.set.get(name)
    if (variable !== undefined) {
      return variable
    }
    current = current.upper
  }
  return undefined
}
