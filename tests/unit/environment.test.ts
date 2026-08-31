/**
 * The environment contract fails LOUDLY where a fallback would mislead.
 *
 * A developer fallback is a convenience on a workstation and a hazard anywhere
 * else. With one, a missing `APP_DATABASE_URL` in CI became a refused
 * connection to port 55432 -- a symptom three layers from its cause, reported
 * as "the database is unreachable" when the truth was "nobody set the variable".
 */
import { afterEach, describe, expect, it } from 'vitest'
import { appUrl, LOCAL_APP_URL, ownerUrl, REQUIRED_DATABASE_ENV } from '../fixtures/local-database'

const saved = { ...process.env }
afterEach(() => {
  process.env = { ...saved }
})

describe('the environment contract', () => {
  it('declares every variable the suite needs, with what each is for', () => {
    expect(Object.keys(REQUIRED_DATABASE_ENV)).toEqual(['DATABASE_URL', 'APP_DATABASE_URL'])
    for (const [name, why] of Object.entries(REQUIRED_DATABASE_ENV)) {
      expect(why.length, `${name} needs a reason a reviewer can judge`).toBeGreaterThan(20)
    }
  })

  it('uses the developer fallback on a workstation', () => {
    process.env.CI = undefined
    // biome-ignore lint/performance/noDelete: the absence is the condition under test
    delete process.env.CI
    delete process.env.APP_DATABASE_URL
    expect(appUrl()).toBe(LOCAL_APP_URL)
  })

  it('THROWS under CI rather than falling back to a developer URL', () => {
    process.env.CI = 'true'
    delete process.env.APP_DATABASE_URL
    expect(() => appUrl()).toThrow(/APP_DATABASE_URL is not set/)
    delete process.env.DATABASE_URL
    expect(() => ownerUrl()).toThrow(/DATABASE_URL is not set/)
  })

  it('and the message says what the variable is for, not just that it is missing', () => {
    process.env.CI = 'true'
    delete process.env.APP_DATABASE_URL
    expect(() => appUrl()).toThrow(/non-owner app_user/)
  })

  it('an explicitly provided URL is used under CI', () => {
    process.env.CI = 'true'
    process.env.APP_DATABASE_URL = 'postgres://app_user:x@localhost:5432/xforge'
    expect(appUrl()).toBe('postgres://app_user:x@localhost:5432/xforge')
  })
})
