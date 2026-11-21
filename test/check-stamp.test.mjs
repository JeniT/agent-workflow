import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  isChecked,
  record,
  refusedPushes,
  stampFile,
  treeOf,
  workingTree,
} from '../lib/check-stamp.mjs'

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'agent-workflow-stamp-test-'))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  git('init', '-q')
  git('config', 'user.email', 't@example.com')
  git('config', 'user.name', 't')
  writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n')
  writeFileSync(join(dir, 'a.txt'), 'one')
  git('add', '-A')
  git('commit', '-qm', 'first')
  return { dir, git, done: () => rmSync(dir, { recursive: true, force: true }) }
}

test('the working tree is what a commit of it would hold, ignoring what git ignores', () => {
  const { dir, git, done } = repo()
  try {
    assert.equal(workingTree(dir), treeOf('HEAD', dir))
    writeFileSync(join(dir, 'ignored.txt'), 'x')
    assert.equal(workingTree(dir), treeOf('HEAD', dir))
    writeFileSync(join(dir, 'a.txt'), 'two')
    writeFileSync(join(dir, 'new.txt'), 'n')
    const tree = workingTree(dir)
    assert.notEqual(tree, treeOf('HEAD', dir))
    git('add', '-A')
    git('commit', '-qm', 'second')
    assert.equal(treeOf('HEAD', dir), tree)
  } finally {
    done()
  }
})

test('a tracked file that .gitignore matches stays in the tree, as it does in a commit', () => {
  const { dir, git, done } = repo()
  try {
    writeFileSync(join(dir, 'kept.svg'), 'drawing')
    git('add', 'kept.svg')
    git('commit', '-qm', 'tracked before the ignore rule')
    writeFileSync(join(dir, '.gitignore'), 'ignored.txt\n*.svg\n')
    git('commit', '-qam', 'ignore svg files')
    assert.equal(workingTree(dir), treeOf('HEAD', dir))
  } finally {
    done()
  }
})

test('a file deleted from the working directory is left out', () => {
  const { dir, git, done } = repo()
  try {
    rmSync(join(dir, 'a.txt'))
    const tree = workingTree(dir)
    git('add', '-A')
    git('commit', '-qm', 'delete')
    assert.equal(treeOf('HEAD', dir), tree)
  } finally {
    done()
  }
})

test('does not touch the real index', () => {
  const { dir, git, done } = repo()
  try {
    writeFileSync(join(dir, 'new.txt'), 'n')
    workingTree(dir)
    assert.match(git('status', '--short'), /\?\? new\.txt/)
  } finally {
    done()
  }
})

test('remembers the trees that passed', () => {
  const { dir, done } = repo()
  try {
    const file = stampFile(dir)
    assert.equal(isChecked('abc', file), false)
    record('abc', file)
    assert.equal(isChecked('abc', file), true)
    assert.equal(isChecked('abd', file), false)
    mkdirSync(join(dir, 'sub'))
    assert.equal(stampFile(join(dir, 'sub')), file)
  } finally {
    done()
  }
})

test('refuses a push to main of unchecked content, and nothing else', () => {
  const lines = [
    'refs/heads/work 1111 refs/heads/main 2222',
    'refs/heads/other 3333 refs/heads/issue-7 0000',
    '(delete) 0000000000000000000000000000000000000000 refs/heads/main 4444',
  ].join('\n')
  assert.deepEqual(
    refusedPushes(lines, () => false),
    ['refs/heads/work'],
  )
  assert.deepEqual(
    refusedPushes(lines, () => true),
    [],
  )
})
