// `aw land 7`: finishes landing issue 7 after `git push origin HEAD:main` has published its commits. Run from the
// main checkout. It refuses unless the branch's tip is already on origin/main, then in order: removes `in-progress`
// from the issue, closes it if the push did not (no `Closes #7`), deletes the remote branch, promotes the issues this
// one unblocked, fast-forwards the main checkout, and removes the worktree and branch (git refuses a worktree with
// uncommitted files).
// Exit 0: landed. Exit 1: the reason, and nothing after that step has run.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const AW = fileURLToPath(new URL('../bin/aw.mjs', import.meta.url))

/** GitHub closes an issue from a pushed `Closes #n` a few seconds after the push, so its state is read this often. */
const STATE_TRIES = 5
const STATE_WAIT_MS = 2000

/**
 * The command that closes issue `n`, landed in commit `sha`, when GitHub reports it still `OPEN` after the push;
 * undefined when the push closed it.
 */
export function closeStep(n, state, sha) {
  if (state !== 'OPEN') return undefined
  const comment = `Landed in ${sha}. Closed by \`aw land\`: no commit of the push said \`Closes #${n}\`.`
  return ['gh', 'issue', 'close', String(n), '--comment', comment]
}

/**
 * The commands that finish landing issue `n`, in order, as argument lists. `close` (from `closeStep`) goes before the
 * promotion, which finds nothing to promote while the landed issue is open.
 */
export function landSteps(n, close) {
  const branch = `issue-${n}`
  return [
    ['gh', 'issue', 'edit', String(n), '--remove-label', 'in-progress'],
    ...(close ? [close] : []),
    ['git', 'push', 'origin', '--delete', branch],
    [process.execPath, AW, 'promote-unblocked', '--after', String(n)],
    ['git', 'merge', '--ff-only', 'origin/main'],
    ['git', 'worktree', 'remove', `.worktrees/${branch}`],
    ['git', 'branch', '-d', branch],
  ]
}

/** Why `n` can't be landed from here, or undefined. `onMain` is whether the branch's tip is in origin/main's history. */
export function refusal(n, branchExists, onMain) {
  if (!branchExists) return `there is no local branch issue-${n}`
  if (!onMain) return `issue-${n} has commits that are not on origin/main: push them first`
  return undefined
}

/**
 * Whether landing goes on after this step failed. The remote branch may already be gone, and a refused fast-forward
 * means another session's commits are on local main: neither should stop the rest.
 */
export const carriesOn = (step) => step[1] === 'push' || step[1] === 'merge'

function run(args, { quiet = false } = {}) {
  return spawnSync(args[0], args.slice(1), { encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' })
}

/** Issue `n`'s state (`OPEN`, `CLOSED`), given GitHub a few seconds to act on the push; undefined if unreadable. */
function issueState(n) {
  let state
  for (let i = 0; i < STATE_TRIES; i++) {
    if (i > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, STATE_WAIT_MS)
    const view = run(['gh', 'issue', 'view', String(n), '--json', 'state', '--jq', '.state'], {
      quiet: true,
    })
    state = view.status === 0 ? view.stdout.trim() : undefined
    if (state !== 'OPEN') return state
  }
  return state
}

/** Lands the issue named in `args`; returns the exit code. */
export function main(args, config) {
  const n = Number(args[0])
  if (!Number.isInteger(n) || n < 1) {
    console.error('usage: aw land <issue number>')
    return 1
  }
  const branch = `issue-${n}`
  run(['git', 'fetch', 'origin'], { quiet: true })
  const exists =
    run(['git', 'rev-parse', '--verify', '--quiet', branch], { quiet: true }).status === 0
  const onMain =
    run(['git', 'merge-base', '--is-ancestor', branch, 'origin/main'], { quiet: true }).status === 0
  const why = refusal(n, exists, onMain)
  if (why) {
    console.error(`can't land #${n}: ${why}`)
    return 1
  }
  const sha = run(['git', 'rev-parse', '--short', branch], { quiet: true }).stdout.trim()
  const close = closeStep(n, issueState(n), sha)
  if (close)
    console.log(`#${n} is still open: no commit of the push said \`Closes #${n}\`, so closing it.`)
  for (const step of landSteps(n, close)) {
    if (run(step).status === 0) continue
    console.error(`\n\`${step.join(' ')}\` failed; landing stopped there.`)
    if (carriesOn(step)) {
      console.error(
        `Carrying on; if the fast-forward was refused, ${config.landingDoc} says how to finish by hand.`,
      )
      continue
    }
    return 1
  }
  console.log(`\nLanded #${n}.`)
  return 0
}
