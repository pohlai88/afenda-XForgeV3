/**
 * The one HTTP path from the browser to the API (ADR-012).
 *
 * Every generated hook goes through here, which is exactly why there is only
 * one transport: rate limiting, correlation IDs, idempotency handling and the
 * RFC 9457 error envelope all live at the HTTP layer. An in-process facade
 * would bypass them and have different failure semantics for the same read --
 * a second path in behaviour, which an operationId parity guard cannot detect.
 */

export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly problem: {
      type?: string
      title?: string
      detail?: string
      instance?: string
      request_id?: string | null
    },
  ) {
    super(problem.title ? `${problem.title}: ${problem.detail ?? ''}`.trim() : `HTTP ${status}`)
    this.name = 'ApiProblem'
  }

  /** ADR-013: the UI must treat a stale write as a first-class state, not an error blob. */
  get isVersionConflict(): boolean {
    return this.status === 409
  }

  get isForbidden(): boolean {
    return this.status === 403
  }
}

export const apiFetch = async <T>(
  url: string,
  init?: RequestInit & { params?: Record<string, unknown> },
): Promise<T> => {
  const { params, ...rest } = init ?? {}
  const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''

  // Only default the content type when the caller has not set one.
  //
  // Setting it unconditionally produced `content-type: application/json,
  // application/json` -- fetch merges duplicate headers by comma-joining them,
  // and the result is no longer a valid media type, so the server's JSON parser
  // sees no body and every POST failed validation with "expected string,
  // received undefined". The generated client already sets the header; this
  // fetcher only fills the gap.
  const headers = new Headers(rest.headers as HeadersInit | undefined)
  if (!headers.has('content-type') && rest.body !== undefined) {
    headers.set('content-type', 'application/json')
  }

  const res = await fetch(url + qs, { ...rest, headers })

  if (!res.ok) {
    let problem: Record<string, unknown> = {}
    try {
      problem = await res.json()
    } catch {
      problem = { title: res.statusText }
    }
    throw new ApiProblem(res.status, problem)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export default apiFetch
