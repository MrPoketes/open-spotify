import {
  type ClassListOccurrence,
  type CodeToken,
  type FileAnalysis,
  analyzeSourceFile,
} from "./duplicate-code-tokens.ts"

// Thresholds tuned so real copies from PR #25 (spotifyApiWith at 44 exact
// tokens, useLibraryEntries at 100 renamed tokens, AccentButton at 13 classes)
// fail while short idiomatic snippets and 4-line test assertions pass.
const minExactTokens = 44
const minExactLines = 6
const minRenamedTokens = 80
const minRenamedLines = 8
const minExactTailwindClasses = 6
const minSharedTailwindClasses = 11

interface TokenLocation {
  readonly file: string
  readonly start: number
  readonly startLine: number
  readonly endLine: number
}

interface CloneSpan {
  readonly fileA: string
  readonly startA: number
  endA: number
  readonly startLineA: number
  endLineA: number
  readonly fileB: string
  readonly startB: number
  endB: number
  readonly startLineB: number
  endLineB: number
}

interface ReportedClone {
  readonly fileA: string
  readonly startLineA: number
  readonly endLineA: number
  readonly fileB: string
  readonly startLineB: number
  readonly endLineB: number
  readonly tokenCount: number
}

interface IndexedClassList {
  readonly file: string
  readonly classList: ClassListOccurrence
}

type WindowEncoder = (tokens: ReadonlyArray<CodeToken>, start: number, length: number) => string

function encodeExactWindow(
  tokens: ReadonlyArray<CodeToken>,
  start: number,
  length: number,
): string {
  const parts: Array<string> = []
  for (let offset = 0; offset < length; offset += 1) {
    parts.push(tokens[start + offset]?.exact ?? "")
  }
  return parts.join("\x00")
}

// Baker's parameterized encoding: each variable identifier or string literal
// becomes its distance since its previous occurrence in the window, so
// consistent renamings match while unrelated variable patterns do not.
function encodeRenamedWindow(
  tokens: ReadonlyArray<CodeToken>,
  start: number,
  length: number,
): string {
  const lastSeen = new Map<string, number>()
  const parts: Array<string> = []
  for (let offset = 0; offset < length; offset += 1) {
    const token = tokens[start + offset]
    if (token === undefined) {
      continue
    }
    if (token.kind === "ident" || token.kind === "string") {
      const prefix = token.kind === "ident" ? "$I" : "$S"
      const previous = lastSeen.get(token.exact)
      parts.push(previous === undefined ? `${prefix}0` : `${prefix}${offset - previous}`)
      lastSeen.set(token.exact, offset)
      continue
    }
    parts.push(token.kind === "literal" ? "$L" : token.exact)
  }
  return parts.join("\x00")
}

function windowContainsBoundary(
  tokens: ReadonlyArray<CodeToken>,
  start: number,
  length: number,
): boolean {
  for (let offset = 0; offset < length; offset += 1) {
    if (tokens[start + offset]?.kind === "boundary") {
      return true
    }
  }
  return false
}

function indexWindows(
  analyses: ReadonlyMap<string, FileAnalysis>,
  windowSize: number,
  encode: WindowEncoder,
): ReadonlyMap<string, ReadonlyArray<TokenLocation>> {
  const index = new Map<string, Array<TokenLocation>>()
  for (const [file, { tokens }] of analyses) {
    for (let start = 0; start <= tokens.length - windowSize; start += 1) {
      const firstToken = tokens[start]
      const lastToken = tokens[start + windowSize - 1]
      if (
        firstToken === undefined ||
        lastToken === undefined ||
        windowContainsBoundary(tokens, start, windowSize)
      ) {
        continue
      }
      const location: TokenLocation = {
        file,
        start,
        startLine: firstToken.line,
        endLine: lastToken.line,
      }
      const key = encode(tokens, start, windowSize)
      const list = index.get(key)
      if (list === undefined) {
        index.set(key, [location])
      } else {
        list.push(location)
      }
    }
  }
  return index
}

function recordPairMatch(
  diagonals: Map<string, Array<CloneSpan>>,
  pair: readonly [TokenLocation, TokenLocation],
  windowSize: number,
) {
  const [left, right] = pair[0].file < pair[1].file ? [pair[0], pair[1]] : [pair[1], pair[0]]
  const key = `${left.file}|${right.file}|${right.start - left.start}`
  const span: CloneSpan = {
    fileA: left.file,
    startA: left.start,
    endA: left.start + windowSize,
    startLineA: left.startLine,
    endLineA: left.endLine,
    fileB: right.file,
    startB: right.start,
    endB: right.start + windowSize,
    startLineB: right.startLine,
    endLineB: right.endLine,
  }
  const existing = diagonals.get(key)
  if (existing === undefined) {
    diagonals.set(key, [span])
  } else {
    existing.push(span)
  }
}

function mergeContiguousSpans(spans: ReadonlyArray<CloneSpan>): ReadonlyArray<CloneSpan> {
  const sorted = spans.toSorted((left, right) => left.startA - right.startA)
  const merged: Array<CloneSpan> = []
  for (const span of sorted) {
    const previous = merged.at(-1)
    if (previous !== undefined && span.startA <= previous.endA) {
      previous.endA = Math.max(previous.endA, span.endA)
      previous.endLineA = Math.max(previous.endLineA, span.endLineA)
      previous.endB = Math.max(previous.endB, span.endB)
      previous.endLineB = Math.max(previous.endLineB, span.endLineB)
    } else {
      merged.push({ ...span })
    }
  }
  return merged
}

function recordLocationPairs(
  diagonals: Map<string, Array<CloneSpan>>,
  locations: ReadonlyArray<TokenLocation>,
  windowSize: number,
) {
  for (let first = 0; first < locations.length; first += 1) {
    const left = locations[first]
    if (left === undefined) {
      continue
    }
    for (let second = first + 1; second < locations.length; second += 1) {
      const right = locations[second]
      if (right !== undefined && left.file !== right.file) {
        recordPairMatch(diagonals, [left, right], windowSize)
      }
    }
  }
}

function collectCloneSpans(
  index: ReadonlyMap<string, ReadonlyArray<TokenLocation>>,
  windowSize: number,
): ReadonlyArray<CloneSpan> {
  const diagonals = new Map<string, Array<CloneSpan>>()
  for (const locations of index.values()) {
    if (locations.length >= 2) {
      recordLocationPairs(diagonals, locations, windowSize)
    }
  }
  return [...diagonals.values()].flatMap(mergeContiguousSpans)
}

function findTokenClones(
  analyses: ReadonlyMap<string, FileAnalysis>,
  config: { readonly minTokens: number; readonly minLines: number; readonly encode: WindowEncoder },
): ReadonlyArray<ReportedClone> {
  const index = indexWindows(analyses, config.minTokens, config.encode)
  return collectCloneSpans(index, config.minTokens)
    .filter(
      (span) =>
        span.endLineA - span.startLineA + 1 >= config.minLines &&
        span.endLineB - span.startLineB + 1 >= config.minLines,
    )
    .map((span) => ({
      fileA: span.fileA,
      startLineA: span.startLineA,
      endLineA: span.endLineA,
      fileB: span.fileB,
      startLineB: span.startLineB,
      endLineB: span.endLineB,
      tokenCount: span.endA - span.startA,
    }))
}

const spansOverlap = (first: ReportedClone, second: ReportedClone) =>
  first.fileA === second.fileA &&
  first.fileB === second.fileB &&
  first.startLineA <= second.endLineA &&
  second.startLineA <= first.endLineA &&
  first.startLineB <= second.endLineB &&
  second.startLineB <= first.endLineB

const countSharedClasses = (left: ReadonlySet<string>, right: ReadonlySet<string>) =>
  [...left].filter((className) => right.has(className)).length

const flattenClassLists = (analyses: ReadonlyMap<string, FileAnalysis>) =>
  [...analyses].flatMap(([file, { classLists }]) =>
    classLists.map((classList): IndexedClassList => ({ file, classList })),
  )

function duplicateClassMessage(left: IndexedClassList, right: IndexedClassList): string | null {
  if (left.file === right.file) {
    return null
  }
  const shared = countSharedClasses(left.classList.classes, right.classList.classes)
  const isExact =
    shared === left.classList.classes.size &&
    shared === right.classList.classes.size &&
    shared >= minExactTailwindClasses
  if (!isExact && shared < minSharedTailwindClasses) {
    return null
  }
  const [first, second] = left.file < right.file ? [left, right] : [right, left]
  return `Duplicate Tailwind classes (${shared} shared): ${first.file}:${first.classList.line} and ${second.file}:${second.classList.line}`
}

function findDuplicateClassLists(
  analyses: ReadonlyMap<string, FileAnalysis>,
): ReadonlyArray<string> {
  const occurrences = flattenClassLists(analyses)
  const findings: Array<string> = []
  for (let first = 0; first < occurrences.length; first += 1) {
    const left = occurrences[first]
    if (left === undefined) {
      continue
    }
    for (let second = first + 1; second < occurrences.length; second += 1) {
      const right = occurrences[second]
      const message = right === undefined ? null : duplicateClassMessage(left, right)
      if (message !== null) {
        findings.push(message)
      }
    }
  }
  return findings
}

const formatClone = (label: string, clone: ReportedClone) =>
  `${label} (${clone.tokenCount} tokens): ${clone.fileA}:${clone.startLineA}-${clone.endLineA} and ${clone.fileB}:${clone.startLineB}-${clone.endLineB}`

// Takes sources keyed by their path from the repository root, with forward
// slashes, and lists duplicated code blocks and long Tailwind class strings
// across distinct files.
export function findDuplicateCode(sources: ReadonlyMap<string, string>): ReadonlyArray<string> {
  const analyses = new Map(
    [...sources].map(([file, source]) => [file, analyzeSourceFile(file, source)]),
  )

  const exactClones = findTokenClones(analyses, {
    minTokens: minExactTokens,
    minLines: minExactLines,
    encode: encodeExactWindow,
  })
  const renamedClones = findTokenClones(analyses, {
    minTokens: minRenamedTokens,
    minLines: minRenamedLines,
    encode: encodeRenamedWindow,
  }).filter((clone) => !exactClones.some((exact) => spansOverlap(clone, exact)))

  return [
    ...exactClones.map((clone) => formatClone("Duplicate code", clone)),
    ...renamedClones.map((clone) => formatClone("Duplicate code with renamed identifiers", clone)),
    ...findDuplicateClassLists(analyses),
  ].toSorted()
}
