#!/usr/bin/env node
// `aw <command>`: the workflow commands shared by the projects that install this package. Each reads the project's
// agent-workflow.config.json (lib/config.mjs) and exits 0 on success, 1 with the reason.
import * as claim from '../lib/claim.mjs'
import * as land from '../lib/land.mjs'
import * as promote from '../lib/promote-unblocked.mjs'
import * as overlap from '../lib/rebase-overlap.mjs'
import * as stamp from '../lib/check-stamp.mjs'
import { loadConfig } from '../lib/config.mjs'

export const COMMANDS = {
  claim: [claim.main, 'claim <n>          claim issue n: its branch on GitHub, labels, a worktree'],
  land: [
    land.main,
    'land <n>           after pushing issue n to main: labels, promotions, clean-up',
  ],
  'promote-unblocked': [
    promote.main,
    'promote-unblocked  make backlog issues whose blockers are all closed ready',
  ],
  'rebase-overlap': [
    overlap.main,
    'rebase-overlap     before rebasing: does what came in touch what you changed?',
  ],
  stamp: [stamp.main, 'stamp              record that the check passed on the working directory'],
  'install-hooks': [
    () => stamp.installHooks(),
    'install-hooks      turn on the pre-push check (from `prepare`)',
  ],
}

const [name, ...args] = process.argv.slice(2)
const command = COMMANDS[name]
if (!command) {
  console.error(
    `usage: aw <command>\n\n${Object.values(COMMANDS)
      .map(([, help]) => `  ${help}`)
      .join('\n')}`,
  )
  process.exitCode = name ? 1 : 0
} else {
  try {
    process.exitCode = command[0](args, loadConfig())
  } catch (e) {
    console.error(e.message)
    process.exitCode = 1
  }
}
