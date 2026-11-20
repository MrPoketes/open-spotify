# Orchestrator playbook

You run on a schedule, with a fresh session each time. You do not write product code. You keep
the pipeline moving: at most **5** workers busy, every issue in the right state, and enough
well-defined work queued.

Work through the steps in order. Be brief: most runs change little.

## 0. Sync

`git pull --ff-only` in the project root, so you read the latest playbooks and roadmap.

## 1. Read the state

- Linear: issues in project `Open Spotify` in `Todo`, `In Progress`, and `In Review`
  (`list_issues` with `project` and `state`). Note each issue's priority, `blocked by` links,
  and `gitBranchName`.
- GitHub: `gh pr list --state open --json number,title,headRefName,statusCheckRollup,mergeable`
  and `gh pr list --state merged --limit 20 --json number,title,mergedAt`.
- T3: `t3_thread_list` for this project. Worker threads are titled `ARM-<n>: <title>`.

## 2. Reconcile

For each issue in `In Progress` or `In Review`:

| Situation                                                                     | Action                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Its PR is merged                                                              | Move it to `Done` and comment with the PR link (the worker may have died before doing it).                                                                                                                                                                            |
| Its thread is `failed`, `interrupted`, or `cancelled`                         | `t3_thread_read` it to see where it stopped. Then send the thread a message (`t3_thread_send`) telling it to continue from there, following `docs/agents/worker.md`. If it has already failed twice, comment on the issue with what went wrong and move it to `Todo`. |
| Its thread is idle, it has an open PR, and checks are red or the PR conflicts | Send the thread: `CI failed (or: the PR has conflicts) on #<n>. Fix it, following docs/agents/worker.md step 5.`                                                                                                                                                      |
| Its thread is idle with no PR and no progress for 2 hours                     | Send the thread a nudge to continue. On the second time, move the issue to `Todo` with a comment.                                                                                                                                                                     |
| No thread exists for it                                                       | Move it to `Todo`.                                                                                                                                                                                                                                                    |

## 3. Fill free slots

Active workers are issues in `In Progress` or `In Review` with a live thread. While there are
fewer than 5:

1. Pick the next `Todo` issue: highest priority first (Urgent, High, Medium, Low, None), then
   oldest. Skip issues with an unfinished `blocked by` issue. Skip issues whose files are likely
   to collide with an active worker's issue (same feature folder) unless nothing else is ready.
2. Move it to `In Progress`.
3. Launch its worker with `t3_thread_launch`:
   - `projectId`: `276c2197-0a35-4b86-8cd4-7af8cc7023e2`
   - `title`: `ARM-<n>: <issue title>`
   - `workspaceStrategy`: `{ "type": "worktree", "baseRef": "origin/main", "startFromOrigin": true, "branch": "<gitBranchName>" }`
   - `runtimeMode`: `full-access`
   - `message`:

     ```
     You are a worker on Open Spotify. Your issue is ARM-<n>: <title>
     (<issue url>). Follow docs/agents/worker.md exactly, from step 1.
     Work autonomously; never wait for human input.
     ```

4. Comment on the issue with the thread link.

## 4. Keep the queue full

If fewer than 5 unblocked issues are in `Todo`, create more from
[docs/roadmap.md](../roadmap.md):

- Take the earliest milestone whose items are not all in Linear yet (Linear milestones match the
  roadmap headings). Write each item as one or more issues
  that fit in a single PR. Every issue gets:
  - team `Armintas`, project `Open Spotify`, label `Open-Spotify` (plus `Feature`, `Bug`, or
    `Improvement`), and the milestone name;
  - a short description of the user-visible outcome;
  - an **Acceptance criteria** list that a reviewer can check;
  - `blocked by` links to the issues it depends on;
  - a priority: earlier milestones get higher priority.
- Before creating an issue, search Linear (by milestone and by keyword) so the same roadmap
  item is never ticketed twice. Linear is the record of what has been ticketed; do not edit
  the roadmap for that.

## 5. Release finished milestones

A milestone is **finished** when step 4 has nothing left to ticket for it and every issue in it
is `Done` or `Canceled`. Find a milestone's issues with `list_issues` for the project, asking for
the `projectMilestone` and `status` fields (`get_milestone` does not list them). A milestone is
**released** when a merged release PR names it and GitHub has a release for that PR's version.
Milestones go in Linear's order (`list_milestones`).

A release PR is titled `Release v<version>: <milestone name>` and changes only `version` in
`package.json`. List release PRs with:

```sh
gh pr list --state all --search "Release in:title" --limit 100 --json number,title,state,mergedAt \
  --jq '[.[] | select(.title | startswith("Release v"))]'
```

Do not search for `"Release v in:title"`: GitHub treats `v` as a separate word and finds nothing.

Run git commands in the project root, which stays on `main`. Branch work happens only in a
temporary worktree in your session scratchpad directory, written `<scratch>` below. Handle the
first case that applies, then go to step 6.

### 5.1 A release PR is open

Release nothing else. Read the PR's state:

```sh
gh pr view <n> --json state,headRefOid,mergeable,autoMergeRequest
gh run list --commit <headRefOid> --json databaseId,workflowName,status,conclusion,attempt
gh pr view <n> --json statusCheckRollup --jq '.statusCheckRollup[] | select(.context == "agent-review") | .state'
gh pr view <n> --json comments --jq '[.comments[] | select(.body | startswith("## Agent review: CHANGES REQUESTED"))] | length'
```

A run **failed** when its `status` is `completed` and its `conclusion` is anything but `success`
(`cancelled` and `timed_out` count too). If `gh run rerun` itself fails, treat the run as failed
on attempt 2.

Take the first row that applies, then read the state again and repeat until you reach the last
row, close the PR, or find its `state` is `MERGED` (auto-merge merges at once when every check
has passed):

| Situation                                                            | Action                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Its milestone is no longer finished (an issue was added or reopened) | Close the PR.                                                             |
| A run failed on attempt 2, or there are three `CHANGES REQUESTED`    | Close the PR and file a Bug titled `Release v<version> blocked`.          |
| `mergeable` is `CONFLICTING`                                         | Close the PR and go to 5.3, which opens a fresh one for the same version. |
| A run failed on attempt 1                                            | `gh run rerun <databaseId> --failed`                                      |
| `agent-review` is not `SUCCESS`                                      | Get it reviewed.                                                          |
| `autoMergeRequest` is `null`                                         | `gh pr merge <n> --squash --auto`                                         |
| Anything else                                                        | Checks are still running. Leave it for the next run.                      |

- **Close the PR** with `gh pr close <n> --delete-branch`. A closed release PR releases nothing,
  so its milestone is picked up again once it is finished.
- **Get it reviewed** by starting a reviewer exactly as in worker.md step 4. If it requests
  changes to the PR body only, fix them with
  `gh pr edit <n> --body-file <scratch>/release-body.md`. You cannot fix any other finding, so
  close the PR and file a Bug titled `Release v<version> blocked` that quotes the findings.
- **File a Bug** with `save_issue`: team `Armintas`, project `Open Spotify`, labels
  `Open-Spotify` and `Bug`, priority High, and the milestone being released. Describe what
  failed (link the failed run or quote the review findings); the acceptance criterion is that
  the cause is fixed on `main`. The open Bug keeps its milestone unfinished, so the release is
  retried only after a worker fixes the cause, never in a loop.

### 5.2 The newest merged release PR has no GitHub release

The newest merged release PR is the one with the latest `mergedAt`, and its title holds
`<version>`. This case applies when `gh release view v<version>` prints `release not found` and
Linear has no issue titled `Release v<version> failed`.

1. Check the tag with `git ls-remote --tags origin refs/tags/v<version>`. If it prints nothing,
   push the tag at the PR's merge commit. That starts the release workflow; check it on the
   next run.

   ```sh
   git fetch origin
   git push origin "$(gh pr view <n> --json mergeCommit --jq .mergeCommit.oid):refs/tags/v<version>"
   ```

2. Otherwise read the release workflow's run:
   `gh run list --workflow release.yml --branch v<version> --json databaseId,status,conclusion,attempt`.
   - No run yet, or `status` is not `completed`: leave it for the next run. If there is still no
     run two hours after the PR merged, file the `Release v<version> failed` Bug described below.
   - Failed (as defined in 5.1) on attempt 1: `gh run rerun <databaseId> --failed`.
   - Failed on attempt 2: file a Bug (see 5.1) titled `Release v<version> failed`, linking the
     run. When the Bug is `Done`, the milestone is finished but not released, so 5.3 releases it
     under the next version. A pushed tag is never moved or reused.

### 5.3 The earliest finished milestone is not released

Write the PR body to `<scratch>/release-body.md`: the milestone's name and its `Done` issues as
`ARM-<n>: <title>`, without `Closes`. Then run the block below as **one** command of the Bash
tool (it is POSIX shell, not PowerShell), from the project root. It must be one command: a `cd`
does not carry over to your next tool call, so the commands after it would run in the project
root and move it off `main`. `set -e` stops it at the first error.

```sh
set -e
git fetch origin
git worktree add --detach "<scratch>/release" origin/main
cd "<scratch>/release"
version=$(npm version minor --no-git-tag-version)   # prints v<version>
git switch -c "release/$version"
git commit -am "Release $version: <milestone name>"
git push -u origin "release/$version"
gh pr create --title "Release $version: <milestone name>" --body-file "<scratch>/release-body.md"
cd -
git worktree remove "<scratch>/release"
git branch -D "release/$version"
```

`git worktree remove` keeps the local branch, which would block the next attempt at the same
version, so the block deletes it too. Then handle the new PR as in 5.1.

If the block stops with an error, first clean up with
`git worktree remove --force "<scratch>/release"` and, if it exists,
`git branch -D release/v<version>`. Then:

- `a branch named 'release/v<version>' already exists`: an earlier run crashed. If
  `git worktree list` shows the branch in another worktree, run
  `git worktree remove --force <that path>`, then `git branch -D release/v<version>`.
- `git push` was rejected: if `gh pr list --head release/v<version> --state open --json number`
  lists a PR, another run opened it first: leave that PR to the next run and stop here.
  Otherwise delete the branch an earlier run left behind with
  `git push origin --delete release/v<version>`.

Unless another run opened the PR, run the block once more. If it fails again, file a Bug (see
5.1) titled `Release v<version> blocked` with the error.

## 6. Daily quality sweep

Once per day (look for a `Quality sweep YYYY-MM-DD` issue created today), create an issue titled
`Quality sweep <date>` with priority High:

> Read every file changed on `main` in the last 24 hours (`git log --since=24.hours --name-only`).
> Find slop as defined in AGENTS.md: unclear names, comments that restate code, speculative
> code, purposeless tests, duplicated logic. Fix it. For every pattern found more than once,
> add a lint rule or tighten AGENTS.md, and log it in docs/agents/slop-log.md.

## 7. Report

Post a status update on the Linear project (`save_status_update`) only when something changed
since the last one: issues finished, workers started, problems found. Keep it to a few lines.

## Rules

- Never write product code yourself and never merge a PR you did not open. The only commit you
  make is a release's version bump (step 5).
- Never launch more than 5 workers.
- Never ask the owner for input. If something needs a human (for example, a Spotify account
  change), create an Urgent issue titled `Needs owner: …` and keep working on everything else.
