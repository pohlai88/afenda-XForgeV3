/**
 * Local development database URLs. FIXTURE ONLY.
 *
 * One file owns these strings so there is exactly one place to look, one entry
 * on the fixture allowlist, and no reason for anybody to paste a credential
 * into a config file "just for local". Everything else -- the application, CI,
 * preview and production -- reads a managed secret and has no fallback.
 *
 * The password here is not a secret. It is provisioned by
 * `packages/db/bootstrap.sql` on a developer's local PostgreSQL and is
 * meaningless anywhere else. The danger was never the string; it is the string
 * quietly becoming the application's real credential because a default was
 * convenient once.
 */
/**
 * THE ENVIRONMENT CONTRACT, declared once.
 *
 * Every variable the qualification suite needs in order to reach a database.
 * It exists because the requirement used to be implicit -- scattered across
 * `process.env.X ?? fallback` expressions -- so CI had to restate it by hand and
 * nothing checked the restatement. `APP_DATABASE_URL` was simply missing from
 * the workflow, and the symptom was a refused connection to a developer port
 * three layers away.
 *
 * The `ci-provides-fixture-env` guard asserts the workflow supplies all of it.
 */
export const REQUIRED_DATABASE_ENV = {
  DATABASE_URL: 'the OWNER connection: seeds fixtures and performs the T09/T11/T20 mutations',
  APP_DATABASE_URL: 'the APPLICATION connection: non-owner app_user, no BYPASSRLS',
} as const

export const LOCAL_OWNER_URL = 'postgres://postgres:xforge@127.0.0.1:55432/xforge'
export const LOCAL_APP_URL = 'postgres://app_user:app_user_dev_only@127.0.0.1:55432/xforge'

/**
 * A developer fallback is a convenience on a workstation and a HAZARD anywhere
 * else: it turns "you forgot to set this" into "connection refused to a port
 * that does not exist here", which is the same failure three layers from its
 * cause. Under CI there is no fallback, for the same reason the composition
 * root has none.
 */
function url(name: keyof typeof REQUIRED_DATABASE_ENV, developerFallback: string): string {
  const value = process.env[name]
  if (value) return value
  if (process.env.CI === 'true') {
    throw new Error(
      `${name} is not set. ${REQUIRED_DATABASE_ENV[name]}. There is no developer ` +
        'fallback under CI -- falling back would point the qualification suite at a ' +
        'local port and report the failure as an unreachable database.',
    )
  }
  return developerFallback
}

/** The owner connection: used only to seed and to mutate policy in T11. */
export const ownerUrl = (): string => url('DATABASE_URL', LOCAL_OWNER_URL)

/** The application connection: the non-owner role, without BYPASSRLS. */
export const appUrl = (): string => url('APP_DATABASE_URL', LOCAL_APP_URL)
