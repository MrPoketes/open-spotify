import { Exit, Schema } from "effect"

const VersionsByPackage = Schema.Record(Schema.String, Schema.String)

const PackageManifest = Schema.fromJsonString(
  Schema.Struct({
    dependencies: Schema.optional(VersionsByPackage),
    optionalDependencies: Schema.optional(VersionsByPackage),
    devDependencies: VersionsByPackage,
  }),
)

const exactVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

// A git specifier is pinned when it names a ref after "#". Without one it
// follows the default branch, and "#semver:" asks for a range of tags.
const gitSpecifierWithRef =
  /^(?:github:|gitlab:|bitbucket:|git:\/\/|git\+[a-z]+:\/\/)[^#]+#(?!semver:)./

const isPinned = (version: string): boolean =>
  exactVersion.test(version) || gitSpecifierWithRef.test(version)

const packagedFieldViolations = (
  field: string,
  versions: Readonly<Record<string, string>> | undefined,
): ReadonlyArray<string> =>
  Object.keys(versions ?? {}).map(
    (packageName) =>
      `package.json: "${packageName}" is in ${field}, which electron-builder packs into the app. Install it as an exact-version dev dependency (AGENTS.md → Dependencies)`,
  )

// The main and preload bundles include their dependencies, so the packaged
// app ships no node_modules (AGENTS.md → Dependencies, decision 0004).
export function findDependencyPinViolations(manifestJson: string): ReadonlyArray<string> {
  const decoded = Schema.decodeUnknownExit(PackageManifest)(manifestJson)
  if (Exit.isFailure(decoded)) {
    return ["package.json: could not decode the dependency fields"]
  }
  const manifest = decoded.value
  const unpinnedDevDependencies = Object.entries(manifest.devDependencies)
    .filter(([, version]) => !isPinned(version))
    .map(
      ([packageName, version]) =>
        `package.json: dev dependency "${packageName}" is "${version}", which is not an exact version. Pin it (AGENTS.md → Dependencies)`,
    )
  return [
    ...packagedFieldViolations("dependencies", manifest.dependencies),
    ...packagedFieldViolations("optionalDependencies", manifest.optionalDependencies),
    ...unpinnedDevDependencies,
  ]
}
