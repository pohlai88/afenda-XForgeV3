/**
 * Where the E2E server lives. One owner, read by everything that needs it.
 *
 * The port was written six times across three files -- package.json, this
 * directory's preflight, playwright.config.ts (three of them) and the verify
 * stage -- and had no owner at all. Six agreeing literals look exactly like one
 * fact right up until someone changes five of them.
 *
 * A VALUE, not a command. The scripts that USE this port stay owned by
 * package.json, because the script name is the interface: `pnpm e2e`,
 * `pnpm e2e:port`. Moving a command string into a TypeScript constant would
 * relocate the duplication rather than remove it.
 *
 * 127.0.0.1 rather than localhost, deliberately. `localhost` resolves to ::1
 * first on a dual-stack machine while a server bound to 0.0.0.0 is not
 * listening there, which fails as a connection refused that names no cause.
 */
export const E2E_PORT = 3100

export const E2E_HOST = '127.0.0.1'

export const E2E_ORIGIN = `http://${E2E_HOST}:${E2E_PORT}`
