import { test } from 'node:test'
import assert from 'node:assert/strict'
import { main, promotable, unblockedBy } from '../lib/promote-unblocked.mjs'

// `blocked_by` counts the blockers still open; `total_blocked_by` counts every blocker, closed ones too.
const issue = (number, blockedBy, totalBlockedBy, extra = {}) => ({
  number,
  title: `Issue ${number}`,
  issue_dependencies_summary: { blocked_by: blockedBy, total_blocked_by: totalBlockedBy },
  ...extra,
})
const numbers = (issues) => promotable(issues).map((i) => i.number)

test('promotes an issue whose blockers are all closed', () => {
  assert.deepEqual(numbers([issue(1, 0, 2)]), [1])
})

test('leaves an issue with a blocker still open', () => {
  assert.deepEqual(numbers([issue(1, 1, 2), issue(2, 2, 2)]), [])
})

test('leaves an issue that never had a blocker: it waits on a decision, not on an issue', () => {
  assert.deepEqual(numbers([issue(1, 0, 0)]), [])
})

test('promotes only the unblocked ones among several', () => {
  assert.deepEqual(
    numbers([issue(1, 0, 1), issue(2, 1, 1), issue(3, 0, 0), issue(4, 0, 3)]),
    [1, 4],
  )
})

test('an issue with no dependency summary is left alone', () => {
  assert.deepEqual(numbers([{ number: 1, title: 'Issue 1' }]), [])
})

test('a pull request is never promoted', () => {
  assert.deepEqual(numbers([issue(1, 0, 1, { pull_request: {} })]), [])
})

// What `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocking` answers: issues from any repository.
const blocked = (repo, number, labels, blockedBy, totalBlockedBy, state = 'open') => ({
  ...issue(number, blockedBy, totalBlockedBy),
  repository_url: `https://api.github.com/repos/${repo}`,
  state,
  labels: labels.map((name) => ({ name })),
})

test('of the issues the landed one blocked, promotes only open backlog ones with no blocker left, in their own repository', () => {
  assert.deepEqual(
    unblockedBy([
      blocked('JeniT/wordwright', 464, ['backlog', 'enhancement'], 0, 2),
      blocked('JeniT/wordwright', 465, ['backlog'], 1, 2),
      blocked('JeniT/sumwright', 436, ['backlog'], 0, 2, 'closed'),
      blocked('JeniT/sumwright', 437, ['ready'], 0, 2),
    ]),
    [{ repo: 'JeniT/wordwright', number: 464, title: 'Issue 464' }],
  )
})

/** A fake `gh`: answers the blocking query and the backlog scan, and records each edit. */
function fakeGh({ blocking = [], backlog = [], blockingFails = false } = {}) {
  const edits = []
  const gh = (args) => {
    const path = args.find((a) => a.startsWith('repos/')) ?? ''
    if (path.includes('/dependencies/blocking')) {
      if (blockingFails) throw new Error('gh api … failed: HTTP 404: Not Found')
      return JSON.stringify([blocking])
    }
    if (path.includes('issues?labels=backlog')) return JSON.stringify([backlog])
    if (args[0] === 'issue' && args[1] === 'edit') {
      edits.push(args)
      return ''
    }
    throw new Error(`unexpected gh ${args.join(' ')}`)
  }
  return { gh, edits }
}

function capture(t) {
  const out = []
  t.mock.method(console, 'log', (line) => out.push(line))
  t.mock.method(console, 'error', (line) => out.push(line))
  return out
}

test('after landing, promotes an issue it unblocked in another repository, with --repo', (t) => {
  const out = capture(t)
  const { gh, edits } = fakeGh({
    blocking: [blocked('JeniT/wordwright', 464, ['backlog'], 0, 2)],
  })
  assert.equal(main(['--after', '4'], {}, gh), 0)
  assert.deepEqual(edits, [
    [
      'issue',
      'edit',
      '464',
      '--repo',
      'JeniT/wordwright',
      '--add-label',
      'ready',
      '--remove-label',
      'backlog',
    ],
  ])
  assert.ok(out.some((line) => /promoted JeniT\/wordwright#464/.test(line)))
})

test('an issue both unblocked by the landed one and found by the scan is promoted once', (t) => {
  capture(t)
  const same = blocked('JeniT/agent-workflow', 9, ['backlog'], 0, 1)
  const { gh, edits } = fakeGh({ blocking: [same], backlog: [same] })
  assert.equal(main(['--after', '4'], {}, gh), 0)
  assert.equal(edits.length, 1)
})

test('an issue that blocked nothing has nothing to promote', (t) => {
  const out = capture(t)
  const { gh, edits } = fakeGh()
  assert.equal(main(['--after', '4'], {}, gh), 0)
  assert.equal(edits.length, 0)
  assert.ok(out.includes('nothing to promote'))
})

test('when the blocking query fails, it says so and the scan still runs', (t) => {
  const out = capture(t)
  const { gh, edits } = fakeGh({
    blockingFails: true,
    backlog: [blocked('JeniT/agent-workflow', 9, ['backlog'], 0, 1)],
  })
  assert.equal(main(['--after', '4'], {}, gh), 0)
  assert.ok(out.some((line) => /issues #4 blocked.*404/.test(line)))
  assert.equal(edits.length, 1)
})

test('--dry-run edits nothing', (t) => {
  const out = capture(t)
  const { gh, edits } = fakeGh({ blocking: [blocked('JeniT/wordwright', 464, ['backlog'], 0, 2)] })
  assert.equal(main(['--after', '4', '--dry-run'], {}, gh), 0)
  assert.equal(edits.length, 0)
  assert.ok(out.some((line) => /would promote JeniT\/wordwright#464/.test(line)))
})
