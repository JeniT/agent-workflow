---
name: close-epic
description: Closing out an epic once its last task has landed — the gate where the slow checks, the review and the retro run.
---

# Close out an epic

The one place the slow checks run as a gate, so they are not run after every change. Each step is done when its
result is noted in the epic's closing comment. The project's `docs/agents/closing-an-epic.md` adds its own steps
(mutation testing, a bundle budget); run those too, in the order it gives.

1. **Everything is on `main` and checked:** `git log origin/main..` is empty in the main checkout, and the project's
   check and build pass there.
2. **The whole browser suite passes.** Fix a red result, or file it and say why it waits, before the epic closes. A
   failure that passes alone under load is rerun alone first.
3. **Every screen the epic touched has been looked at,** in light and dark and at 390px, in each state it shows. A state
   with no browser test gets one.
4. **The follow-ups are sorted:** read the epic's sub-issues, open and closed
   ([board.md](../../reference/board.md#epics)). Every `inbox` observation is triaged: made `ready`, merged into an issue
   that covers it, or closed. A `ready` issue that overlaps a `grill` issue is merged into it before anyone builds it.
5. **The assumed decisions are confirmed:** `grep -rn "(assumed)" CONTEXT.md docs/` lists every choice made without the
   owner. Each is confirmed (the mark removed), changed, or filed as a `decision`.
6. **The whole diff is reviewed,** from the commit before the epic's first to `main`, against the project's coding
   standards: repeated helpers and word tables across tasks are what a task-by-task review misses. Name any file near
   its size limit, so the next epic splits it before it trips.
7. **The epic's code is covered:** run the project's coverage, read what is red in each changed file near the top, and
   add a test for behaviour a person relies on, or delete code nothing reaches. No threshold: note the totals, so the
   next epic can see a fall.
8. **Every new screen works from the keyboard alone:** open it, use every control and close it with Tab, Enter, Escape
   and the arrows. Focus is always visible and goes back where it came from.
9. **The dependencies have not crept:** `pnpm outdated` is read. A dependency the epic added is recorded where the
   project records them; one a major version behind is filed as an observation.
10. **Docs match what shipped:** the roadmap marks the epic done, the glossary has every term it introduced, and the
    design docs describe the screens as they are.
11. **A short retro** in the closing comment: what the task-by-task reviews missed and this close-out found. When the
    same kind of miss comes up in a second epic, it becomes a lint rule, a check, or a line in the definition of done,
    so it is caught when the task lands.
