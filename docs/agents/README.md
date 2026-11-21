# The autonomous pipeline

The owner is not in the loop. Agents plan, build, review, and merge. The one exception is a
pull request from an outside contributor's fork: the owner starts its review and merges it
([CONTRIBUTING.md](../../CONTRIBUTING.md)).

```
 Linear (team ARM, project "Open Spotify")
        │  Todo issues, ordered by priority and "blocked by" links
        ▼
 Orchestrator ── scheduled T3 task, runs every 30 minutes ──────────────┐
  │ reconciles Linear, GitHub, and threads; keeps at most 2 workers     │
  │ busy; writes new issues from docs/roadmap.md                        │
  ▼                                                                     │
 Worker thread (one per issue, own git worktree)                        │
  │ implements with tests → opens PR → asks for review                  │
  ▼                                                                     │
 Reviewer agent (fresh context, never the author)                       │
  │ reviews against AGENTS.md → sets the `agent-review` status          │
  ▼                                                                     │
 GitHub auto-merge when `check`, `package (×3)` and `agent-review` pass │
  │                                                                     │
  └── worker marks the issue Done and triggers the orchestrator ────────┘
```

| Playbook                           | Read it if you are…                |
| ---------------------------------- | ---------------------------------- |
| [orchestrator.md](orchestrator.md) | the scheduled orchestrator run     |
| [worker.md](worker.md)             | a thread assigned one Linear issue |
| [reviewer.md](reviewer.md)         | asked to review a pull request     |
| [slop-log.md](slop-log.md)         | adding a rule after finding slop   |

## Fixed facts

- Repository: `MrPoketes/open-spotify`, default branch `main`, squash merges only.
- T3 project id: `276c2197-0a35-4b86-8cd4-7af8cc7023e2`.
- Orchestrator scheduled task id:
  `scheduled-task:command:mcp:d4e2c9ef-131f-44c3-8d2d-f462f297ae71:schedule-task:open-spotify-orchestrator-v1`.
- Linear: team `Armintas` (key `ARM`), project `Open Spotify`, label `Open-Spotify`.
  Statuses: Backlog → Todo → In Progress → In Review → Done (or Canceled).
- Required checks on `main`: `check`, `package (ubuntu-latest)`, `package (windows-latest)`,
  `package (macos-latest)`, `agent-review`.
- Nobody pushes to `main` directly. Every change, including docs, goes through a PR.
