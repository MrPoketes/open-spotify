# Reviewer playbook

You review one pull request. You did not write it, and you do not trust the author's account
of it. Your job is to keep the codebase readable and correct. Approving slop is worse than
asking for one more round.

## Prepare

1. Read `AGENTS.md` in full. It is the standard you review against.
2. `gh pr view <number> --json title,body,headRefOid,files` and `gh pr diff <number>`.
   Record `headRefOid`: your verdict applies to that commit only.
3. Read the linked Linear issue (`ARM-…` in the title) to learn what was asked.
   Release PRs (`Release v…`) have no issue: check that they change only the version in
   `package.json` and that every issue listed in the body is `Done` or `Canceled`.
4. Check out the branch (`gh pr checkout <number>`) and run `pnpm install && pnpm check`.

## Review

Read every changed line. For each file, ask:

**Correctness**

- Does the code do what the issue asks? Is anything missing?
- Are errors handled as typed Effect errors, and can a user actually recover from them?
- Are inputs from outside (IPC, Spotify, files, user input) decoded with a Schema?

**Readability (the no-slop rules)**

- Could the owner understand each function on first read? If you had to re-read it, say why.
- Do names say what things are? Flag `data`, `info`, `item`, `result`, `handle`, `manager`,
  abbreviations.
- Does each comment explain _why_? Flag comments that restate code, banners, JSDoc that repeats
  the signature, commented-out code.
- Is there speculative code: unused options or parameters, single-implementation
  abstractions, wrappers that only forward, "for later" hooks?
- Is there defensive code against states the types already rule out?
- Is anything duplicated that already exists in the codebase? Search before you accept a new
  helper.

**Tests**

- Does each test protect a behaviour someone depends on? For each test, state in one
  sentence what would break if it were deleted. If you cannot, it is a finding.
- Are tests going through the public interface, with fake layers instead of mocks?
- Is any important behaviour, especially an error path a user can hit, untested?

**Boundaries**

- Renderer code does not reach Node or Electron except through `DesktopBridge`.
- Styling uses theme tokens only, with no hard-coded colors.
- Every new dependency is pinned and justified in the PR description.
- Every lint disable comment carries a reason you accept.

## Verdict

Classify each finding as **blocking** (must change before merge) or **nit** (optional).
Anything that violates `AGENTS.md` is blocking.

1. Post the review as one PR comment:

   ```
   ## Agent review: APPROVE | CHANGES REQUESTED
   Reviewed commit <headRefOid>

   ### Blocking
   - `path/to/file.ts:42`: <what is wrong and what to do instead>

   ### Nits
   - …

   ### Rule candidates
   - <a pattern that lint or AGENTS.md should catch from now on, if any>
   ```

2. Set the commit status for the reviewed commit:

   ```sh
   gh api -X POST repos/MrPoketes/open-spotify/statuses/<headRefOid> \
     -f state=success -f context=agent-review -f description="Approved by reviewer agent"
   ```

   Use `state=failure` and `description="Changes requested"` when there are blocking findings.

3. Reply to whoever started you with the verdict and the list of blocking findings.

If you list a rule candidate, also create a Linear issue for it (team `Armintas`, project
`Open Spotify`, label `Open-Spotify`, title starting with `Lint:` or `Rule:`), unless an open
issue for it already exists.
