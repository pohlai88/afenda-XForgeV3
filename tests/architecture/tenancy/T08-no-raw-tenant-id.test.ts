/**
 * T08 -- a raw tenant id cannot reach `withTenant`.
 *
 * This case passes when the code DOES NOT COMPILE, so most of it is not
 * assertions. The `@ts-expect-error` directives below are the test: if
 * `withTenant` is ever widened back to accept a string, the suppressed error
 * disappears, the directive becomes unused, and `tsc` fails the typecheck
 * stage. The proof is enforced by the compiler on every run, not by a
 * convention someone has to remember.
 *
 * Why it matters (ADR-022): with a string parameter,
 * `withTenant(request.body.tenantId, ...)` typechecks, and the entire isolation
 * guarantee then rests on that value having been verified somewhere upstream --
 * the sort of "checked somewhere" that quietly stops being true during a
 * refactor.
 *
 * The other half, that nobody can FORGE the brand with a cast, is enforced by
 * the `no-forged-tenant-context` guard in the guards stage, which is mutation
 * tested against a violating and a clean fixture.
 */
import { withTenant } from '@xforge/db'
import { TENANT_A } from '@xforge/fixtures/tenancy'
import { candidateFromHost } from '@xforge/tenancy'
import { describe, expect, it } from 'vitest'

describe('T08 -- only a verified context reaches the chokepoint', () => {
  it('a raw tenant id does not typecheck', () => {
    const attempt = () =>
      // @ts-expect-error ADR-022: withTenant takes a VerifiedTenantContext, never an id.
      withTenant(TENANT_A, async () => 1)
    expect(attempt).toBeTypeOf('function')
  })

  it('a candidate tenant does not typecheck either', () => {
    const attempt = () =>
      // @ts-expect-error ADR-022: the host PROPOSES a candidate; it never grants authority.
      withTenant(candidateFromHost(TENANT_A), async () => 1)
    expect(attempt).toBeTypeOf('function')
  })

  it('and an empty context is refused at runtime as well', async () => {
    // Belt and braces: the type stops honest code, this stops a value that
    // arrived through `any` at a boundary the compiler could not see -- JSON,
    // an untyped library, a deserialised session.
    await expect(withTenant({} as never, async () => 1)).rejects.toThrow(
      /requires a verified tenant context/,
    )
  })
})
