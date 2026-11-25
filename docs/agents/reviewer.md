# Reviewer playbook

You review one pull request. You did not write it, and you do not trust the author's account
of it. Your job is to keep the codebase readable and correct. Approving slop is worse than
asking for one more round.

## Prepare

1. Read `AGENTS.md` in full. It is the standard you review against.
2. `gh pr view <number> --json title,body,headRefOid,isCrossRepository,files` and
   `gh pr diff <number>`. Record `headRefOid`: your verdict applies to that commit only.
   `isCrossRepository: true` means the PR comes from an outside contributor's fork, whatever
   its title says.
3. Read the issue the PR closes to learn what was asked. Agents' PRs close a Linear issue
   (`ARM-…` in the title): read it with `get_issue` and `list_comments`. A PR from an outside
   contributor closes a GitHub issue instead (`Closes #<n>` in the body): read it with
   `gh issue view <n> --comments`. A PR that closes no issue is a blocking finding:
   [CONTRIBUTING.md](../../CONTRIBUTING.md) asks for the issue before the build.
4. Check out the branch (`gh pr checkout <number>`) and run `pnpm install && pnpm check`. This
   runs the PR's code on your machine, so for a PR from a fork read the whole diff first. If it
   touches anything the issue does not need, such as `.github/workflows`, package scripts,
   dependencies, `pnpm-workspace.yaml` (it decides which install scripts run), or network
   calls, request changes without running it.

## Release PRs

A PR titled `Release v<version>: <milestone name>` with `isCrossRepository: false` comes from
the orchestrator ([orchestrator.md](orchestrator.md) step 5) and has no Linear issue. A PR from a
fork is never a release PR, whatever its title says. Skip Prepare steps 3 and 4 and the Review
section. Do not check the branch out: you run in the orchestrator's project root, which must
stay on `main`, and the required `check` job already runs `pnpm check` on the PR.
Check instead:

- The diff changes only `version` in `package.json`.
- `<version>` is the version on `main` with the minor part raised by one and the patch part set
  to 0. Read it with `git fetch origin` and `git show origin/main:package.json`.
- Every issue in the milestone is `Done` or `Canceled`: use `list_issues` for project
  `Open Spotify` with the `projectMilestone` and `status` fields.
- Every item under the milestone's heading in `docs/roadmap.md` has an issue in the milestone.
- The body names the milestone and lists its `Done` issues.

Request changes for anything that does not hold, then continue with the Verdict.

## Review

Read every changed line. For each file, ask:

**Correctness**

- Does the code do what the issue asks? Is anything missing?
- Are errors handled as typed Effect errors, and can a user actually recover from them?
- Are inputs from outside (IPC, Spotify, files, user input) decoded with a Schema?
- If the PR adds or changes shell commands in `docs/agents/*.md`, run or spot-check the
  read-only commands against the repo to confirm they work as described, and verify the PR's
  `Tests` section lists the commands the author ran.

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

1. Post the review as one PR comment. Write it to `review-<number>.md` in your session
   scratchpad directory (or in `$TEMP/arm-<n>/` named after the issue, never a fixed path
   directly in `$TEMP`, which parallel agents share) and post it with
   `gh pr comment <number> --body-file <that path>`:

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
