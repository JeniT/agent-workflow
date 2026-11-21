# agent-workflow

The way of working shared by wordwright and sumwright, in one place: a package of workflow commands, and a Claude Code
plugin with the skills and docs that use them. The plan and its reasons are in JeniT/agent-workflow#1.

## The plugin

| Skill        | Fires when an agent is…                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `claim`      | picking up an issue (or starting a grill): `aw claim`, then reading what it sits in |
| `land`       | ready to merge: `aw rebase-overlap`, rebase, push to `main`, `aw land`, guardrails  |
| `file-issue` | filing a follow-up, observation, review finding or decision, under its epic         |
| `close-epic` | closing an epic: the slow checks, the whole-diff review, coverage, the retro        |

They share [reference/](reference/): the definition of done, the board (labels, epics, blockers), grills, and this
machine's quirks. Triage stays with the `triage` skill of mattpocock-skills, which reads the project's own
`docs/agents/triage.md`.

To enable it in a project, add to its `.claude/settings.json` (committed, so cloud sessions get it too):

```json
{
  "extraKnownMarketplaces": {
    "agent-workflow": { "source": { "source": "github", "repo": "JeniT/agent-workflow" } }
  },
  "enabledPlugins": { "agent-workflow@agent-workflow": true }
}
```

### What a project keeps for itself

Each skill reads a project file of the same name in `docs/agents/`, when it exists, for what only that project knows.
Those files hold additions, never a second copy of what the plugin says:

- `claim.md`: checks before claiming (CI on `main`), likely conflict spots.
- `landing.md`: what to rerun after an overlapping rebase, beyond `aw rebase-overlap`'s advice.
- `definition-of-done.md`: which docs, help pages and browser tests the project's changes need.
- `triage.md`: milestones, the project's own labels and what a `ready` issue must state.
- `closing-an-epic.md`: extra gates (mutation testing, a bundle budget).

The safety lines stay in each project's `AGENTS.md` as well, because a skill loads only when it fires: work in a
worktree, and publish with `git push origin HEAD:main`, never local `main`.

## The commands

| Command                | What it does                                                                                                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aw claim 7`           | From the main checkout: refuses an issue that is closed, `in-progress`, a `decision`, a `grill` or an `epic`; otherwise creates `issue-7` on GitHub (atomic: only one agent can), swaps `ready` for `in-progress`, comments, and adds the worktree `.worktrees/issue-7` with the project's install run in it. |
| `aw rebase-overlap`    | In the worktree, after `git fetch origin` and **before** `git rebase origin/main`: exit 0 when nothing that came in touches what the branch changed or a shared spot, exit 1 naming the files. Prints the project's advice either way.                                                                        |
| `aw land 7`            | From the main checkout, after `git push origin HEAD:main`: refuses unless `issue-7` is on `origin/main`, then removes `in-progress`, deletes the remote branch, runs `aw promote-unblocked`, fast-forwards the main checkout, and removes the worktree and branch.                                            |
| `aw promote-unblocked` | Makes every `backlog` issue whose blocked-by links are all closed `ready`. `--dry-run` only lists them. A `backlog` issue with no blockers waits on a decision and is left alone.                                                                                                                             |
| `aw stamp`             | Records that the check passed on the working directory as it is now. The project's check runs it last, on a pass.                                                                                                                                                                                             |
| `aw install-hooks`     | Turns on the pre-push hook. The project's `prepare` script runs it, so `pnpm install` does.                                                                                                                                                                                                                   |

The **pre-push hook** refuses a push to `main` of content the check has not passed on: the stamp is keyed by the git
tree, so it does not matter which commit or branch carries the content, only whether it is what was checked. Pushing a
branch is not checked. `AW_SKIP_STAMP=1` lets a push through, for when the owner has said so. Stamps live in the
repository's git directory, shared by every worktree and never committed.

The commands use `gh`'s `{owner}/{repo}` placeholder, so they act on the repository they run in; nothing names a
project.

## Adding it to a project

```bash
pnpm add -D github:JeniT/agent-workflow#<commit>
```

Pin a commit (or a tag, once there are some), so an update is a change the project chooses. The repo is private, so the
machine needs git access to it: `gh auth setup-git` once, and the same in a cloud environment.

Then in the project's `package.json`:

```json
"scripts": {
  "prepare": "aw install-hooks",
  "check": "node scripts/check.mjs && aw stamp"
}
```

Run `aw stamp` only when every step of the check has passed (in a check script, after the last step). The hook path is
relative (`node_modules/agent-workflow/hooks`), so each worktree uses its own install.

### `agent-workflow.config.json`

At the root of the project. Every field is optional; a misspelt one is refused rather than ignored.

| Field                   | Default                                                                    | What it is                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `sharedSpots`           | `[]`                                                                       | Files where unrelated-looking changes still interact (shared types, wiring, migrations). List the lockfile, not `package.json`. |
| `install`               | `["pnpm", "install"]`                                                      | Run in a new worktree by `aw claim`.                                                                                            |
| `checkCommand`          | `"pnpm check"`                                                             | Named when the hook refuses a push.                                                                                             |
| `afterRebase.noOverlap` | `"run the typecheck and the tests of the packages you changed, then push"` | What `aw rebase-overlap` advises with no overlap.                                                                               |
| `afterRebase.overlap`   | `"rerun the full check after rebasing"`                                    | What it advises with overlap.                                                                                                   |
| `landingDoc`            | `"docs/agents/landing.md"`                                                 | Named when `aw land` has to be finished by hand.                                                                                |

## Working on this repo

`pnpm check` formats-checks and runs the tests (`node --test`). The tests build throwaway git repositories, including
a real push to a throwaway remote for the hook. The commands began as sumwright's `scripts/` (claim, land,
promote-unblocked, rebase-overlap, check-stamp).
