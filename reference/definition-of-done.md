# Definition of done

Read before you commit, and when you plan a task's tests and docs. The project's `docs/agents/definition-of-done.md`
adds its own items (which docs to update, which browser tests to run, what to look at); both lists apply.

1. **Tested at the right level:** unit tests for logic, component tests for each UI state (loading, empty, error, and
   the cases that change what a person sees), contract tests for adapters, a browser test for a new user-facing flow.
2. **The check passes, and you read its verdict.** Run the project's check (`pnpm check`) bare: a pipe hides its exit
   code, and the commit after `&&` goes ahead on a red run. A check that fails on existing code means fixing the code;
   loosen a check's config only for something kept on purpose, with the reason beside the entry. No new console errors.
   A change people see has been looked at in light **and** dark mode and at phone width (390px), in each state it shows;
   say in your wrap-up if you could not look.
3. **Docs match:** the glossary for a new or changed term, an ADR for a non-obvious choice, the README when setup
   changes. When you rename, move, split or remove something (a file, a script, a config entry),
   `grep -rn "<its old name>" docs/ *.md` and fix every doc that still describes it.
4. **The commit message closes the issue:** write `Closes #<n>` as you write the message (item 7), so the push
   closes the issue and links it to the commit. `aw land` closes one the push left open, as a fallback.
5. **Every remaining problem is filed** as an observation, with the `file-issue` skill: each review finding you did not
   fix and each problem you noticed but left. Named in your final message with its epic.
6. **Decisions you made for the owner are listed.** A choice the issue and the recorded decisions did not settle is
   yours only provisionally. Ask the owner when they are there; when you go on without asking, write `(assumed)` beside
   it where you record it (glossary, ADR, doc) and list each in your final message under "Decisions I made for you".
7. **Committed,** with a message that says what and why, the issue's last commit ending its subject line with
   `(Closes #<n>)`: after each feature, and at each green checkpoint of a large
   one. A change to anything that steers the product's AI (prompts) says so in the commit and asks the owner to review
   it. The session ends with everything committed.
