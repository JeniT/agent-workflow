// A record that the project's check passed on exactly this content, so a push to `main` can be refused when it has not. The key
// is the git tree of the working directory (what a commit of it would hold), so it does not matter which commit or branch
// carries the content, only whether it is the content that was checked.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const KEEP = 100

const git = (args, options = {}) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim()

/**
 * The git tree of the working directory in `cwd`: what a commit of it would hold. That is every tracked file (even one
 * `.gitignore` now matches) and every new file git does not ignore. It starts from a copy of the real index, because an
 * empty index would leave out a tracked file that is ignored; the real index is not touched.
 */
export function workingTree(cwd = process.cwd()) {
  const dir = mkdtempSync(join(tmpdir(), 'agent-workflow-index-'))
  try {
    const index = join(dir, 'index')
    const real = resolve(cwd, git(['rev-parse', '--git-path', 'index'], { cwd }))
    if (existsSync(real)) copyFileSync(real, index)
    const env = { ...process.env, GIT_INDEX_FILE: index }
    git(['add', '-A'], { cwd, env })
    return git(['write-tree'], { cwd, env })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** The tree a commit holds. */
export const treeOf = (commit, cwd = process.cwd()) =>
  git(['rev-parse', `${commit}^{tree}`], { cwd })

/** Where the stamps are kept: in the repository's own directory, shared by every worktree, never committed. */
export function stampFile(cwd = process.cwd()) {
  return join(
    resolve(cwd, git(['rev-parse', '--git-common-dir'], { cwd })),
    'agent-workflow-checked',
  )
}

/** Notes that the check passed on this tree. */
export function record(tree, file, now = new Date()) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : []
  lines.push(`${tree} ${now.toISOString()}`)
  writeFileSync(file, `${lines.slice(-KEEP).join('\n')}\n`)
}

/** Whether the check passed on this tree. */
export function isChecked(tree, file) {
  if (!existsSync(file)) return false
  return readFileSync(file, 'utf8')
    .split('\n')
    .some((line) => line.split(' ')[0] === tree)
}

/** What a push to `main` finds: the lines git gives a pre-push hook are `<local ref> <local sha> <remote ref> <remote sha>`. */
export function refusedPushes(stdin, isCheckedCommit) {
  const zeros = /^0+$/
  return stdin
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split(' '))
    .filter(([, localSha, remoteRef]) => remoteRef === 'refs/heads/main' && !zeros.test(localSha))
    .filter(([, localSha]) => !isCheckedCommit(localSha))
    .map(([localRef]) => localRef)
}

/** `aw stamp`: records that the check passed on the working directory as it is now. The project's check runs it last. */
export function main() {
  record(workingTree(), stampFile())
  return 0
}

/** The variable that lets a push through unchecked, for when the owner has said so. */
export const SKIP_STAMP = 'AW_SKIP_STAMP'

/**
 * `aw pre-push`: what the pre-push hook runs. Refuses a push to `main` of content the check has not passed on; pushing a
 * branch is not checked. `stdin` is what git gives the hook.
 */
export function prePush(stdin, config, env = process.env) {
  if (env[SKIP_STAMP] === '1') return 0
  const file = stampFile()
  const refused = refusedPushes(stdin, (sha) => isChecked(treeOf(sha), file))
  if (refused.length === 0) return 0
  console.error(
    `Not pushed: \`${config.checkCommand}\` has not passed on what ${refused.join(', ')} holds. Run \`${config.checkCommand}\` (bare, so you read its verdict) in this worktree, with nothing changed after it, then push again.`,
  )
  return 1
}

/** `aw install-hooks`: points git at this package's hooks, relative to each worktree, so every worktree uses its own install. */
export function installHooks(cwd = process.cwd()) {
  git(['config', 'core.hooksPath', 'node_modules/agent-workflow/hooks'], { cwd })
  return 0
}
