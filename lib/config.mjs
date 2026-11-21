// What differs between the projects that use these commands, read from `agent-workflow.config.json` at the root of the
// repository. Everything has a default, so a project with no file gets the plain behaviour; a file that is there but
// wrong stops the command with a message that names the field.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

export const CONFIG_FILE = 'agent-workflow.config.json'

const command = z.array(z.string().min(1)).min(1)

export const configSchema = z
  .object({
    /**
     * Files where two unrelated-looking changes still interact (shared schemas, wiring, migrations, dependencies): an
     * incoming change to one is an overlap even when this branch never touched it.
     */
    sharedSpots: z.array(z.string().min(1)).default([]),
    /** Run inside a new worktree once it is made, as an argument list. */
    install: command.default(['pnpm', 'install']),
    /** What `aw rebase-overlap` tells the agent to do next. */
    afterRebase: z
      .object({
        noOverlap: z
          .string()
          .default('run the typecheck and the tests of the packages you changed, then push'),
        overlap: z.string().default('rerun the full check after rebasing'),
      })
      .strict()
      .prefault({}),
    /** The command whose pass `aw stamp` records, named when the pre-push hook refuses a push. */
    checkCommand: z.string().default('pnpm check'),
    /** Where the project's landing doc is, named when landing has to be finished by hand. */
    landingDoc: z.string().default('docs/agents/landing.md'),
  })
  .strict()

/** Parses the text of a config file, or throws an error that says which field is wrong and how. */
export function parseConfig(text, source = CONFIG_FILE) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch (e) {
    throw new Error(`${source} is not valid JSON: ${e.message}`)
  }
  const result = configSchema.safeParse(raw)
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `  ${issue.path.join('.') || '(top level)'}: ${issue.message}`,
    )
    throw new Error(`${source} is not a valid agent-workflow config:\n${problems.join('\n')}`)
  }
  return result.data
}

/** The root of the repository (or worktree) that `cwd` is in. */
export function repoRoot(cwd = process.cwd()) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

/** The config for the repository `cwd` is in: the defaults when it has no config file. */
export function loadConfig(cwd = process.cwd()) {
  const file = join(repoRoot(cwd), CONFIG_FILE)
  return existsSync(file) ? parseConfig(readFileSync(file, 'utf8'), file) : parseConfig('{}')
}
