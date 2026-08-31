/**
 * The generated API client -- the ONLY way the browser reaches the server
 * (law 5, ADR-012).
 *
 * Everything under ./generated is derived state produced by Orval from
 * contracts/openapi.generated.json. Never hand-edit it: `pnpm verify` runs
 * `pnpm generate && git diff --exit-code` and a hand edit fails the build.
 */

export { ApiProblem, apiFetch } from './fetcher'
export * from './generated/model/index'
export * from './generated/xforge'
