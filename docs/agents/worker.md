# Worker playbook

You own exactly one Linear issue, named in your first message. You run in your own git
worktree on the issue's branch. Work without asking anyone for input: make reasonable
decisions and write them down in the PR description.

## 1. Understand the task

1. Read the issue with the Linear tools (`get_issue`, then `list_comments`). The comments may
   hold notes from an earlier attempt.
2. Read `AGENTS.md` in full, `docs/architecture.md`, and any decision record that applies.
3. Comment on the issue: `Started in T3 thread <your thread link>.`

If the issue is too large for one PR (roughly 400 changed lines, excluding tests and lock
files), split it: create sub-issues in Linear in team `Armintas`, project `Open Spotify`, with
the label `Open-Spotify`, the parent's milestone, and acceptance criteria. Implement the first
slice yourself and leave the rest in `Todo`. Say so in a comment on the parent issue.

If the issue cannot be done (an endpoint was removed, or it depends on unfinished work), comment
with the reason, add `blocked by` links where they apply, move it back to `Todo`, and stop.

## 2. Build it

1. `pnpm install`.
2. Write the failing test first for each behaviour you add or each bug you fix. Follow the test
   rules in `AGENTS.md`: every test must protect a behaviour and must be named after it.
3. Implement until the tests pass. Keep the change focused on the issue. While iterating, run
   only the test files your change affects: `pnpm vitest run <paths>`.
4. Run `pnpm check`. It must pass. If you changed `src/main`, `src/preload`, `e2e/`, or the
   packaging files (`electron-builder.yml`, `electron.vite.config.ts`, `build/`), also run
   `pnpm package:dir` and `pnpm test:e2e`; otherwise CI runs them on all three platforms.
5. If you added or changed a shell command in an agent playbook (`docs/agents/*.md`), run it
   once against the real repo (read-only where possible, substituting real arguments for
   placeholders) to confirm it returns what the playbook expects, and list the commands you ran
   in the PR's `Tests` section.
6. Read your own diff (`git diff origin/main`) against the no-slop rules as if someone else
   wrote it. Remove anything speculative, any comment that restates code, any unused export.

## 3. Open the pull request

1. Commit with a message like `ARM-123: Add playlist folder persistence`. Push the branch.
2. Fill in `.github/pull_request_template.md` and save it as `pr-body.md` in your scratch
   folder (see Rules). Open the PR with `gh pr create --body-file <that path>`, and pass the
   same file to `gh pr edit --body-file` whenever you change the body. The title matches the
   commit message. The body contains `Closes ARM-123`.
3. Link the PR to your thread with `link_pull_request`.
4. Move the Linear issue to `In Review` and add the PR URL to it as a link.

## 4. Get it reviewed

Start a reviewer with the Agent tool (`general-purpose`, foreground). Give it this prompt, with
the number filled in, and nothing else:

> Review pull request #<number> in MrPoketes/open-spotify. Follow docs/agents/reviewer.md
> exactly.

Do not tell the reviewer what you think of your own code. When it reports back:

- **APPROVE:** go to step 5.
- **CHANGES REQUESTED:** fix every blocking finding, push, and start a **new** reviewer
  (never reuse the previous one). Nits are optional, but fix them if they are cheap.

If you disagree with a finding, reply on the PR with your reasoning and let the next reviewer
weigh it. After three rounds without approval, comment on the Linear issue with what is
unresolved, move it to `Todo`, and stop.

## 5. Merge

1. Check the PR state with
   `gh pr view <number> --json state,mergeable,mergeStateStatus,autoMergeRequest`.
   - If `state` is `MERGED`, go to step 5.5.
   - If `mergeable` is `CONFLICTING` or `mergeStateStatus` is `BEHIND`, update the branch now
     (step 5.4) instead of waiting on a PR that cannot merge.
   - If `autoMergeRequest` is `null`, enable auto-merge: `gh pr merge <number> --squash --auto`.
     Do not add `--delete-branch`: it tries to check out `main`, which fails in a worktree
     because the main checkout holds it. GitHub deletes the branch on merge by itself.
2. Call `watch_pull_request` for the PR (skip if you are already watching it) and end your turn.
   You will be woken when checks finish, on conflicts, on merge, or by the orchestrator if the
   PR falls behind `main`. When woken on an unmerged PR, re-check its state as in step 5.1.
3. If a check fails, read its log (`gh run view --log-failed`), fix the cause, push, and get a
   new review (step 4: any push invalidates the per-commit `agent-review` status). Then return
   to step 5.1.
4. If the PR has merge conflicts (`mergeable` is `CONFLICTING`) or is behind `main`
   (`mergeStateStatus` is `BEHIND`):
   - run `git fetch origin` and `git rebase origin/main`, resolving any conflicts;
   - re-run `pnpm check` (and `pnpm package:dir` and `pnpm test:e2e` if step 2.4 applies);
   - push with `git push --force-with-lease`;
   - get a new review (step 4): updating the branch creates a new commit, which clears the
     per-commit `agent-review` status, so even a clean rebase needs a fresh review before
     auto-merge can run;
   - return to step 5.1.
5. When the PR is merged:
   - move the Linear issue to `Done` and comment with the PR link;
   - call `unwatch_pull_request`;
   - trigger the orchestrator so your slot is refilled at once:
     `run_scheduled_task_now` with the orchestrator task id from `docs/agents/README.md`.

## Rules

- Never push to `main`. Never merge without the reviewer's approval.
- Keep scratch files (PR bodies, notes, logs) in your session scratchpad directory, or in
  `$TEMP/arm-<n>/` named after your issue if you have none. Never write to a fixed path
  directly in `$TEMP`: other workers run on the same machine at the same time, and one once
  posted another's PR description because both used `$TEMP/pr-body.md`.
- Keep CPU use low: other workers and the owner share this machine. Never run the full test
  suite in a loop or several copies at once. To reproduce a flaky test, repeat only that file
  (`pnpm vitest run <path> --repeats <n>`). Run `pnpm check` before opening the PR and again
  after review fixes or a rebase, not after every edit.
- Never disable a lint rule to get green, whether with a disable comment or an `oxlint.config.ts`
  override, unless it carries a written reason a reviewer would accept and no rename or small
  refactor removes the need.
- Never edit files outside the scope of your issue, except to fix something that blocks you or
  to update the existing copies when your PR extracts a third-copy abstraction (`AGENTS.md` rule
  4). Mention it in the PR.
- If you find slop that is not yours, fix it in a separate issue: create it in Linear in `Todo`, in
  team `Armintas`, project `Open Spotify`, with the label `Open-Spotify`.
