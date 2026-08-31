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
export const LOCAL_OWNER_URL = 'postgres://postgres:xforge@127.0.0.1:55432/xforge'
export const LOCAL_APP_URL = 'postgres://app_user:app_user_dev_only@127.0.0.1:55432/xforge'

/** The owner connection: used only to seed and to mutate policy in T11. */
export const ownerUrl = (): string => process.env.DATABASE_URL ?? LOCAL_OWNER_URL

/** The application connection: the non-owner role, without BYPASSRLS. */
export const appUrl = (): string => process.env.APP_DATABASE_URL ?? LOCAL_APP_URL
