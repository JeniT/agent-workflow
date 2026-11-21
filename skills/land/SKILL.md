---
name: land
description: Landing finished work — rebasing onto origin/main, pushing to main and closing the issue. Use when the work is committed and ready to merge.
---

# Land

The main checkout is shared by every session and may hold other sessions' unpushed commits, so you publish your own
branch, never local `main`. Run each command bare and on its own, reading its result before the next. The
[definition of done](../../reference/definition-of-done.md) is met before you start.

## Steps

1. **See what is coming in, then rebase.** In your worktree: `git fetch origin`, then `pnpm exec aw rebase-overlap`
   (it must run **before** the rebase, while it can still see what came in; exit 1 means overlap, an answer, not a
   failure), then `git rebase origin/main`. Resolve conflicts keeping the other session's changes.
2. **Rerun what the rebase put at risk.** "Already up to date": nothing to rerun. Otherwise do what `aw rebase-overlap`
   advised, plus what the project's `docs/agents/landing.md` adds. The pre-push hook refuses content the check has not
   passed on, so after a rebase that brought changes in, run the check (bare) with nothing changed after it.
3. **Only your commits.** `git log origin/main..HEAD` lists only your own. If anything else is there, stop and sort it
   out. Every unfixed finding is already filed (definition of done, item 5). One of them says `Closes #<n>`; if none
   does, `git commit --amend` the last to add it now, before anything is published.
4. **Push.** `git push origin HEAD:main`. It is a plain
   fast-forward; if it is rejected, go back to step 1. A refusal from the pre-push hook means the check has not passed
   on this content: run it, then push again.
5. **Finish.** From the main checkout, `pnpm exec aw land <n>`: it removes `in-progress`, closes the issue if the push did not
   (and says so), deletes the remote branch, promotes the issues this one unblocked, fast-forwards the main checkout and removes your worktree and branch. Name
   the promoted issues in your final message. Done when it exits 0.
6. **If it reports the fast-forward was refused,** local `main` holds another session's unpushed commits: in the main
   checkout run `git merge origin/main` (it keeps their commits as they are), resolve conflicts keeping both sides,
   rerun the check, and commit the merge. Leave that merge unpushed: those commits belong to the other session. Then
   remove your worktree and branch by hand (`git worktree remove .worktrees/issue-<n>`, `git branch -d issue-<n>`).

## Guardrails

Each protects another session's work; the safe form is beside it.

- Publish with `git push origin HEAD:main`; `git push origin main` publishes whatever is on local `main`.
- Rebase onto, and merge from, `origin/main`, never local `main`.
- Get past a rejected push by rebasing. `main` is never force-pushed.
- Bring the main checkout up to date with `git merge`. `git rebase`, `git reset --hard` and `git checkout .` there
  rewrite or destroy another session's unpushed commits and break their worktrees.
- Remove only your own worktree; other sessions' may be in use. A branch the issue says to delete (a spike's) may have a
  worktree: remove it only when `git -C <path> status --short` is empty and the owner has said the branch is finished.
- Unmerged work: leave the worktree and say why in a comment on the issue.
