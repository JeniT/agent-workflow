# A grill

A `grill` issue is a conversation with the owner that settles a design before anyone builds it: use the `grilling` and
`domain-modeling` skills, and record what is settled in `docs/adr/` and the glossary (`CONTEXT.md`) as it is settled.
Its outcome is ordinary `ready` tasks; the grill issue closes with links to them. `aw claim` refuses a grill, because
nothing is built.

## Make the worktree before the first question

A grill writes docs as it goes, so its edits must never land on the shared `main` checkout. From the main checkout:

```bash
git fetch origin
git worktree add .worktrees/issue-<n> -b issue-<n> origin/main
```

Then the project's install in it (`pnpm install`). Do all the reading, editing and checks there. Skills such as
`grill-with-docs` do not know about worktrees, so this step is yours even when the skill is the first thing that runs.

If docs were already edited in the main checkout, move them: `git diff > ../grill.patch`, add the worktree,
`git apply ../grill.patch` there, then `git restore` the files in the main checkout.

## During it

- **Before recommending a library, font or tool,** check `package.json` and the project's dependency notes for what it
  already ships, and extend that rather than adding a second.
- **Before filing its tasks,** search the roadmap and `gh issue list --state all --search "<keywords>"`; extend an issue
  that already covers the work and file only what is new (the `file-issue` skill).

## Ending it

Commit the docs, run the project's check, and land by hand: the `land` skill's steps up to the push (`aw land` needs a
claimed issue and a remote branch, which a grill does not have). Then remove the worktree and branch
(`git worktree remove .worktrees/issue-<n>`, `git branch -d issue-<n>`), file the tasks under the epic, and close the
grill issue with links to them.
