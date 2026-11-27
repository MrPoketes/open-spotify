import { Result, Schema } from "effect"

const VersionsByPackage = Schema.Record(Schema.String, Schema.String)

const PackageManifest = Schema.fromJsonString(
  Schema.Struct({
    dependencies: Schema.optional(VersionsByPackage),
    optionalDependencies: Schema.optional(VersionsByPackage),
    devDependencies: VersionsByPackage,
  }),
)

const semanticVersion = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?`

const exactVersion = new RegExp(`^${semanticVersion}$`)

// A git specifier is pinned only by a full commit hash or a version tag after
// "#". Without a ref, or with a branch name, it follows a branch as it moves.
const gitSpecifierPinnedToTag = new RegExp(
  String.raw`^(?:github:|gitlab:|bitbucket:|git://|git\+[a-z]+://)[^#]+#(?:[0-9a-f]{40}|v?${semanticVersion})$`,
)

const isPinned = (version: string): boolean =>
  exactVersion.test(version) || gitSpecifierPinnedToTag.test(version)

const packagedFieldViolations = (
  field: string,
  versions: typeof VersionsByPackage.Type | undefined,
): ReadonlyArray<string> =>
  Object.keys(versions ?? {}).map(
    (packageName) =>
      `package.json: "${packageName}" is in ${field}, which electron-builder packs into the app. Install it as an exact-version dev dependency (AGENTS.md → Dependencies)`,
  )

// The main and preload bundles include their dependencies, so the packaged
// app ships no node_modules (AGENTS.md → Dependencies, decision 0004).
export function findDependencyPinViolations(manifestJson: string): ReadonlyArray<string> {
  const decoded = Schema.decodeUnknownResult(PackageManifest)(manifestJson)
  if (Result.isFailure(decoded)) {
    return [`package.json: could not decode the dependency fields: ${decoded.failure.message}`]
  }
  const manifest = decoded.success
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
