// The pre-push hook end to end: a real push from a throwaway clone to a throwaway remote.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOOKS = fileURLToPath(new URL('../hooks', import.meta.url))
const AW = fileURLToPath(new URL('../bin/aw.mjs', import.meta.url))

function setUp() {
  const top = mkdtempSync(join(tmpdir(), 'agent-workflow-push-'))
  const remote = join(top, 'remote.git')
  const work = join(top, 'work')
  const run = (cwd, cmd, args, env = {}) =>
    spawnSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } })
  run(top, 'git', ['init', '-q', '--bare', '-b', 'main', remote])
  run(top, 'git', ['clone', '-q', remote, work])
  const git = (...args) => run(work, 'git', args)
  git('config', 'user.email', 't@example.com')
  git('config', 'user.name', 't')
  git('config', 'commit.gpgsign', 'false')
  git('checkout', '-q', '-b', 'main')
  writeFileSync(join(work, 'agent-workflow.config.json'), '{"checkCommand": "pnpm verify"}\n')
  writeFileSync(join(work, 'a.txt'), 'one\n')
  git('add', '-A')
  git('commit', '-qm', 'first')
  git('config', 'core.hooksPath', HOOKS)
  return {
    git,
    push: (env) => run(work, 'git', ['push', '-q', 'origin', 'HEAD:main'], env),
    pushBranch: () => run(work, 'git', ['push', '-q', 'origin', 'HEAD:refs/heads/issue-7']),
    stamp: () => run(work, process.execPath, [AW, 'stamp']),
    done: () => rmSync(top, { recursive: true, force: true }),
  }
}

test('refuses a push to main until the check has passed on that content, naming the check', () => {
  const t = setUp()
  try {
    const refused = t.push()
    assert.notEqual(refused.status, 0)
    assert.match(refused.stderr, /Not pushed: `pnpm verify` has not passed/)
    assert.equal(t.stamp().status, 0)
    assert.equal(t.push().status, 0)
  } finally {
    t.done()
  }
})

test('a branch push is not checked, and AW_SKIP_STAMP=1 lets a push to main through', () => {
  const t = setUp()
  try {
    assert.equal(t.pushBranch().status, 0)
    assert.equal(t.push({ AW_SKIP_STAMP: '1' }).status, 0)
  } finally {
    t.done()
  }
})
