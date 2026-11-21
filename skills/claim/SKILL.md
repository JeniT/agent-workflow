---
name: claim
description: Claiming an issue before working on it, or starting a grill. Use when picking up, starting or claiming an issue, or choosing what to work on next.
---

# Claim an issue

GitHub Issues is the board, and every change goes through a worktree on its issue's branch: local `main` is shared by
every session, so a commit left there is invisible to the rest. The labels are in
[board.md](../../reference/board.md).

## Steps

1. **Choose.** `gh issue list --label ready`. A `grill` issue is a design conversation, not a build: follow
   [grill.md](../../reference/grill.md) instead of these steps. `aw claim` refuses an `epic` (claim one of its tasks), a
   `decision` (the owner's) and anything already `in-progress`.
2. **The project's own checks.** If the project has `docs/agents/claim.md`, read it now: it says what to look at before
   claiming (CI on `main`, for one) and the project's likely conflict spots.
3. **Claim.** From the main checkout, `pnpm exec aw claim <n>`. It creates the issue's branch on GitHub (atomic: only
   one agent can), swaps `ready` for `in-progress`, comments, and adds `.worktrees/issue-<n>` with the install run in it.
   "Reference already exists" means someone else has it: choose another. Done when it prints `Claimed #<n>`.
4. **Move in.** Work in `.worktrees/issue-<n>` from here to landing. Read [machine.md](../../reference/machine.md) once
   per session.
5. **Read what the issue sits in:** the issue and every issue it links; its epic's sub-issues, open **and** closed
   (the command is in [board.md](../../reference/board.md#epics)); the ADRs and glossary terms it names.
6. **Find what already exists:** `git log --oneline --grep="<feature>"` and a search of the code. When part of it is
   already built, say what is there and how it differs from the issue, and ask the owner before finishing it, so the
   spec is not bent to fit what was built.
7. **List what the issue does not settle** (what a screen asks for, defaults, what each state shows). Ask the owner
   about each one that changes what a person sees; record the rest as `(assumed)`
   ([definition of done](../../reference/definition-of-done.md), item 6). Done when every open question is asked or
   recorded.

## While you work

- **Outside your task:** file it as an observation with the `file-issue` skill, and carry on.
- **The owner's call** (a service to choose, a product trade-off, anything costing money): file a `decision` issue and
  work on something else.
- **Setting work aside:** a WIP commit. The stash stack is shared across worktrees.

When the work is done: [the definition of done](../../reference/definition-of-done.md), then the `land` skill.
