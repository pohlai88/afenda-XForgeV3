/**
 * A hook that fails open is only as good as its refusals, and a hook nobody
 * tests is a green light that means nothing -- the same objection ADR-024
 * raises against a tool that passes having read zero files.
 *
 * These drive the real script over its real contract: a JSON payload on stdin,
 * an exit code out. Exit 2 blocks the write; 0 lets it through.
 */
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../..')
const HOOK = join(ROOT, 'tooling/hooks/no-hand-edit.mjs')

/** @returns {{code: number, stderr: string}} */
const runHook = (input) => {
  const r = spawnSync(process.execPath, [HOOK], {
    encoding: 'utf8',
    input: typeof input === 'string' ? input : JSON.stringify(input),
  })
  return { code: r.status, stderr: r.stderr }
}

const edit = (file_path) => ({ tool_input: { file_path }, tool_name: 'Edit' })

describe('law 27: generated state is refused at authorship time', () => {
  it('blocks the generated contract', () => {
    const { code, stderr } = runHook(edit('contracts/openapi.generated.json'))
    expect(code).toBe(2)
    expect(stderr).toMatch(/Law 27/)
    expect(stderr).toMatch(/pnpm generate/)
  })

  it('blocks generated client output', () => {
    expect(runHook(edit('packages/api-client/src/generated/model/index.ts')).code).toBe(2)
  })

  it('blocks BUILD OUTPUT identified by name rather than directory', () => {
    // next-env.d.ts is output, not generated: there is no generator to re-run,
    // and its content records which of `next dev` or `next build` ran last.
    const { code, stderr } = runHook(edit('apps/web/next-env.d.ts'))
    expect(code).toBe(2)
    expect(stderr).toMatch(/build output/)
  })

  it('blocks a write into a build directory', () => {
    expect(runHook(edit('apps/web/.next/server/app/page.js')).code).toBe(2)
  })

  it('resolves an absolute path, which is what the hook is actually handed', () => {
    expect(runHook(edit(join(ROOT, 'contracts/openapi.generated.json'))).code).toBe(2)
  })

  it('lets ordinary source through', () => {
    expect(runHook(edit('packages/db/src/platform-access.ts')).code).toBe(0)
  })

  it('lets its own test through -- a guard that blocks its author is unusable', () => {
    expect(runHook(edit('tooling/hooks/tests/no-hand-edit.test.mjs')).code).toBe(0)
  })
})

describe('the phase authority is not edited in passing', () => {
  it('blocks the canonical phase file', () => {
    const { code, stderr } = runHook(edit('.architecture/state.json'))
    expect(code).toBe(2)
    expect(stderr).toMatch(/XFORGE_PHASE/)
  })

  it('does not block the rest of .architecture', () => {
    expect(runHook(edit('.architecture/evidence-register.md')).code).toBe(0)
  })
})

describe('it fails open on anything it does not understand', () => {
  it('allows a payload that is not JSON', () => {
    expect(runHook('not json at all').code).toBe(0)
  })

  it('allows a payload with no file_path', () => {
    expect(runHook({ tool_input: { command: 'ls' }, tool_name: 'Bash' }).code).toBe(0)
  })

  it('allows a path outside the repository', () => {
    expect(runHook(edit(resolve(ROOT, '../elsewhere/contracts/thing.json'))).code).toBe(0)
  })
})
