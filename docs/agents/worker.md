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
files), split it: create sub-issues in Linear with the label `Open-Spotify`, the project
`Open Spotify`, and acceptance criteria. Implement the first slice yourself and leave the rest
in `Todo`. Say so in a comment on the parent issue.

If the issue cannot be done (an endpoint was removed, or it depends on unfinished work), comment
with the reason, add `blocked by` links where they apply, move it back to `Todo`, and stop.

## 2. Build it

1. `pnpm install`.
2. Write the failing test first for each behaviour you add or each bug you fix. Follow the test
   rules in `AGENTS.md`: every test must protect a behaviour and must be named after it.
3. Implement until the tests pass. Keep the change focused on the issue.
4. Run `pnpm check`, `pnpm package:dir`, and `pnpm test:e2e`. All three must pass.
5. Read your own diff (`git diff origin/main`) against the no-slop rules as if someone else
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

1. Enable auto-merge: `gh pr merge <number> --squash --auto`. Do not add `--delete-branch`:
   it tries to check out `main`, which fails in a worktree because the main checkout holds
   it. GitHub deletes the branch on merge by itself.
2. Call `watch_pull_request` for the PR and end your turn. You will be woken when checks finish.
3. If a check fails, read its log (`gh run view --log-failed`), fix the cause, push, and get a
   new review (any push invalidates the `agent-review` status). Then watch again.
4. If the PR has merge conflicts, rebase on `origin/main`, re-run `pnpm check`, push with
   `--force-with-lease`, and get a new review.
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
- Never disable a lint rule to get green, unless the disable comment carries a reason that a
  reviewer would accept.
- Never edit files outside the scope of your issue, except to fix something that blocks you.
  Mention it in the PR.
- If you find slop that is not yours, fix it in a separate issue: create it in Linear in `Todo`.
