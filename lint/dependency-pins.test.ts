import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { findDependencyPinViolations } from "./dependency-pins.ts"

const manifestWith = (fields: object) => JSON.stringify({ name: "open-spotify", ...fields })

describe("findDependencyPinViolations", () => {
  // electron-builder packs production dependencies into the app, so a package
  // there ships even though the bundles already include what they import.
  it("reports every package in dependencies and optionalDependencies", () => {
    const manifest = manifestWith({
      dependencies: { cn: "^0.5.2" },
      optionalDependencies: { fsevents: "2.3.3" },
      devDependencies: { vite: "8.3.8" },
    })

    expect(findDependencyPinViolations(manifest)).toEqual([
      'package.json: "cn" is in dependencies, which electron-builder packs into the app. Install it as an exact-version dev dependency (AGENTS.md → Dependencies)',
      'package.json: "fsevents" is in optionalDependencies, which electron-builder packs into the app. Install it as an exact-version dev dependency (AGENTS.md → Dependencies)',
    ])
  })

  it.each([
    "^8.3.8",
    "~8.3.8",
    ">=8.3.8",
    "8.x",
    "*",
    "latest",
    "npm:vite@^8.3.8",
    "github:vitejs/vite",
    "github:vitejs/vite#semver:^8.3.8",
    "github:vitejs/vite#main",
    "git+https://github.com/vitejs/vite.git#develop",
  ])("reports the dev dependency version %s, which is not exact", (version) => {
    const manifest = manifestWith({ devDependencies: { vite: version } })

    expect(findDependencyPinViolations(manifest)).toEqual([
      `package.json: dev dependency "vite" is "${version}", which is not an exact version. Pin it (AGENTS.md → Dependencies)`,
    ])
  })

  it.each([
    "8.3.8",
    "1.0.0-rc.6",
    "github:castlabs/electron-releases#v45.2.1+wvcus",
    "git+https://github.com/vitejs/vite.git#v8.3.8",
    "github:vitejs/vite#0123456789abcdef0123456789abcdef01234567",
  ])("accepts the pinned dev dependency version %s", (version) => {
    const manifest = manifestWith({ devDependencies: { vite: version } })

    expect(findDependencyPinViolations(manifest)).toEqual([])
  })

  it("reports a manifest it cannot decode instead of passing silently", () => {
    const manifest = manifestWith({ devDependencies: { vite: 8 } })

    expect(findDependencyPinViolations(manifest)).toEqual([
      'package.json: could not decode the dependency fields: Expected string\n  at ["devDependencies"]["vite"]',
    ])
  })

  // The packaged app ships no node_modules (decision 0004), and an unpinned
  // version lets an install pick up code nobody reviewed.
  it("finds only exact-version dev dependencies in package.json", () => {
    const manifest = readFileSync("package.json", "utf8")

    expect(findDependencyPinViolations(manifest)).toEqual([])
  })
})
