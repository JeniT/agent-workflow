# This machine

Several sessions share one Mac, each in its own worktree.

- **Editing:** `sed` is BSD `sed`, so `sed -i 's/a/b/' file` fails ("undefined label", "illegal option"; not a
  permissions problem). Use the Edit tool, or `perl -pi -e 's/a/b/' <files>` for one change across files.
- **Servers:** stop one you started by its port, `kill $(lsof -nP -iTCP:<port> -sTCP:LISTEN -t)`, or by the pid it
  printed. A name pattern (`pkill -f tsx`) also stops other sessions' servers.
- **Setting work aside:** a WIP commit. The stash stack is shared by every worktree, so another session can pop yours.
- **Busy machine:** a test that times out in a full run but passes alone was starved, not broken: rerun it alone
  before deciding it is a flake, and say so in your wrap-up.
- **Keys** go into the app's own field. A key typed into a chat with an agent is leaked.
- **Exit codes:** run a check, merge, rebase or push bare. A pipe (`… | tail`) hides the exit code, so the command after
  `&&` runs on a failure.
