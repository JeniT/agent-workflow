// `aw land 7`: finishes landing issue 7 after `git push origin HEAD:main` has published its commits. Run from the
// main checkout. It refuses unless the branch's tip is already on origin/main, then in order: removes `in-progress`
// from the issue, deletes the remote branch, promotes the issues this one unblocked, fast-forwards the main checkout,
// and removes the worktree and branch (git refuses a worktree with uncommitted files).
// Exit 0: landed. Exit 1: the reason, and nothing after that step has run.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const AW = fileURLToPath(new URL('../bin/aw.mjs', import.meta.url))

/** The commands that finish landing issue `n`, in order, as argument lists. */
export function landSteps(n) {
  const branch = `issue-${n}`
  return [
    ['gh', 'issue', 'edit', String(n), '--remove-label', 'in-progress'],
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
  for (const step of landSteps(n)) {
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
