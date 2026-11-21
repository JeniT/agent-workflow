import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, parseConfig } from '../lib/config.mjs'

test('an empty config gives the plain defaults', () => {
  const config = parseConfig('{}')
  assert.deepEqual(config.sharedSpots, [])
  assert.deepEqual(config.install, ['pnpm', 'install'])
  assert.equal(config.checkCommand, 'pnpm check')
  assert.match(config.afterRebase.overlap, /rerun/)
})

test("a project's values replace the defaults, and a partial afterRebase keeps the other default", () => {
  const config = parseConfig(
    JSON.stringify({ sharedSpots: ['a.ts'], afterRebase: { overlap: 'run it all' } }),
  )
  assert.deepEqual(config.sharedSpots, ['a.ts'])
  assert.equal(config.afterRebase.overlap, 'run it all')
  assert.match(config.afterRebase.noOverlap, /push/)
})

test('a wrong config names the field and the file', () => {
  assert.throws(() => parseConfig('{"sharedSpots": "a.ts"}', 'x.json'), /x\.json[\s\S]*sharedSpots/)
  assert.throws(() => parseConfig('{"install": []}'), /install/)
})

test('a misspelt field is refused rather than silently ignored', () => {
  assert.throws(() => parseConfig('{"sharedSpot": ["a.ts"]}'), /sharedSpot/)
})

test('a file that is not JSON says so', () => {
  assert.throws(() => parseConfig('{ sharedSpots: [] }'), /not valid JSON/)
})

test("reads the config at the repository's root from anywhere inside it, and the defaults without one", () => {
  const dir = mkdtempSync(join(tmpdir(), 'agent-workflow-config-'))
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir })
    mkdirSync(join(dir, 'sub'))
    assert.deepEqual(loadConfig(join(dir, 'sub')).sharedSpots, [])
    writeFileSync(join(dir, 'agent-workflow.config.json'), '{"sharedSpots": ["x"]}')
    assert.deepEqual(loadConfig(join(dir, 'sub')).sharedSpots, ['x'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
