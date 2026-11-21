---
name: file-issue
description: Filing an issue on the board — a follow-up, an observation, a review finding you are not fixing, a decision for the owner — and linking it under its epic or to its blockers.
---

# File an issue

Filing is pre-authorized: file without asking the owner. An issue is **filed** only when it is created, labelled,
placed under its epic and named in your final message; creating it is half the job. The labels, the epic and blocker
commands are in [board.md](../../reference/board.md).

## Steps

1. **Check for a duplicate.** List the epic's sub-issues, open **and** closed, with their labels (you need the epic to
   place the issue anyway), then `gh issue list --state all --search "<keywords>"`. If an issue covers it, comment there
   and file nothing. If that issue is a `grill` or has been talked through with the owner, only a comment goes on it: a
   second issue would be built without the owner's intent.
2. **Choose its kind:**
   - An **observation** (what you noticed while doing something else, a review finding you did not fix): `inbox` plus
     `bug` or `enhancement`, with `Seen while doing #<n>` in the body. What you noticed is not a specification, and
     `ready` means one. The exception is a fix you can fully describe (what, where, the tests) in a place no open
     `grill` or `ready` issue touches: that one is `ready`.
   - A **task** the owner asked for, fully specified: `ready`, or `backlog` with blocked-by links when it waits.
   - A **decision**: `decision`, with the question, the options and their costs, your recommendation, and what it blocks.
3. **Place it:** your best-guess milestone (the project's `docs/agents/triage.md` lists them), then link it under its
   epic with the two-step command in [board.md](../../reference/board.md#epics). A follow-up goes under the same epic
   as the issue it came from. The owner can move it. When the project's triage doc says a milestone has no epics yet,
   the milestone alone places it.
4. **Report it:** name each issue in your final message with its epic (`#118 under #26`). If you cannot name the epic,
   it is not filed yet.
