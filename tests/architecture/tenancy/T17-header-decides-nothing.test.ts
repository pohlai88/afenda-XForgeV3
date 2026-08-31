/**
 * T17 -- a client-supplied tenant header decides nothing.
 *
 * §8.6: a network-provided `x-tenant-id` is a ROUTING HINT, never an
 * authorisation claim. The strongest way to honour that is for no code to read
 * it at all, so this asserts both halves: the resolver cannot be influenced by
 * a session that claims another tenant, and nothing in the application reads a
 * tenant-bearing header in the first place.
 *
 * The second half is a static check rather than a request, because "the header
 * is ignored" is a property of the whole codebase, not of one endpoint. A test
 * that sent one request would pass while a second endpoint read the header.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeAll, HOST_A, MEMBER_OF_BOTH, reachable, resolveFor, seed, TENANT_A } from './harness'

beforeAll(async () => {
  if (reachable) {
    await seed()
  }
})
afterAll(closeAll)

const ROOT = join(import.meta.dirname, '../../..')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.turbo') {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out)
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/**
 * In a STRING LITERAL, not merely mentioned. Reading a header requires naming
 * it in quotes; prose about why it must never be trusted does not -- and the
 * first version of this check flagged its own comment saying exactly that.
 *
 * Matching quotes rather than stripping comments also avoids a stripper that
 * could swallow real code and quietly turn this into a check that passes by
 * seeing less, which is the wrong direction for a security assertion to fail in.
 */
const readsTenantHeader = (src: string) => /['"`]x-tenant(-id)?['"`]/i.test(src)

describe('T17 -- the header is a hint, not a claim', () => {
  it('the check rejects a file that really does read the header', () => {
    // A scan never observed to reject is not yet trusted -- it would report a
    // clean repository just as happily if the regex were wrong.
    expect(readsTenantHeader("const t = c.req.header('x-tenant-id')")).toBe(true)
    expect(readsTenantHeader('const t = headers["X-Tenant-Id"]')).toBe(true)
    expect(readsTenantHeader('// never trust a client-supplied x-tenant-id')).toBe(false)
  })

  it.skipIf(!reachable)("a session claiming tenant B does not move A's host to B", async () => {
    const resolved = await resolveFor(HOST_A, MEMBER_OF_BOTH)
    expect(resolved).toMatchObject({ context: { tenantId: TENANT_A }, kind: 'verified' })
  })

  it('no application code reads a tenant-bearing header', () => {
    const offenders: string[] = []
    for (const dir of ['apps', 'modules', 'packages']) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const src = readFileSync(file, 'utf8')
        if (readsTenantHeader(src)) {
          offenders.push(file.slice(ROOT.length + 1))
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
