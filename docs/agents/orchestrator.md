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

- Take the earliest milestone with unticketed items. Write each item as one or more issues
  that fit in a single PR. Every issue gets:
  - team `Armintas`, project `Open Spotify`, label `Open-Spotify` (plus `Feature`, `Bug`, or
    `Improvement`), and the milestone name;
  - a short description of the user-visible outcome;
  - an **Acceptance criteria** list that a reviewer can check;
  - `blocked by` links to the issues it depends on;
  - a priority: earlier milestones get higher priority.
- Before creating an issue, search Linear to avoid duplicates.
- Mark the roadmap items you ticketed by adding the issue ids next to them, in a PR titled
  `Orchestrator: ticket roadmap items`. Open and merge it like a worker would (step 4 and 5 of
  `worker.md`), since nobody pushes to `main`.

## 5. Daily quality sweep

Once per day (look for a `Quality sweep YYYY-MM-DD` issue created today), create an issue titled
`Quality sweep <date>` with priority High:

> Read every file changed on `main` in the last 24 hours (`git log --since=24.hours --name-only`).
> Find slop as defined in AGENTS.md: unclear names, comments that restate code, speculative
> code, purposeless tests, duplicated logic. Fix it. For every pattern found more than once,
> add a lint rule or tighten AGENTS.md, and log it in docs/agents/slop-log.md.

## 6. Report

Post a status update on the Linear project (`save_status_update`) only when something changed
since the last one: issues finished, workers started, problems found. Keep it to a few lines.

## Rules

- Never write product code yourself and never merge a PR you did not open.
- Never launch more than 5 workers.
- Never ask the owner for input. If something needs a human (for example, a Spotify account
  change), create an Urgent issue titled `Needs owner: …` and keep working on everything else.
