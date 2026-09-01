'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * WHY ITS OWN ENTRY POINT.
 *
 * An error boundary must be a class -- React has no hook for catching a
 * descendant's render error -- and a class component requires `'use client'`.
 * The `@xforge/ui` barrel is imported by server components, so putting this
 * there marks the ENTIRE design system client-only, which the build says
 * plainly: "You're importing a class component. It only works in a Client
 * Component but none of its parents are marked with 'use client'".
 *
 * So it sits behind `@xforge/ui/boundary`, alongside `/state`, `/contracts` and
 * `/runtime`, and the client-only cost is paid by the one thing that needs it.
 */

/**
 * Contains a render failure to ONE resource surface.
 *
 * The experience mapper refuses an unrecognised wire code rather than inventing
 * a meaning for it, and it runs during render -- so the refusal is a throw, and
 * an uncontained throw takes the React tree rather than the list. The producer
 * is real and already documented at the mapper: a tab open across a rolling
 * deploy meets a server emitting a reason code its bundle predates.
 *
 * SCOPED TO THE SURFACE, NOT THE SHELL. One unknown code should cost the reader
 * the collection it came from, not the whole product. A boundary at the root
 * would turn a bounded, recoverable failure into a blank application.
 *
 * A CLASS, deliberately and reluctantly, in a package that is otherwise entirely
 * function components: React has no hook for catching a descendant's render
 * error, and the alternative is a dependency for twenty lines. Law 30 wants a
 * named, measured pain before new infrastructure and there is none here.
 *
 * RELOAD, NOT RETRY. That distinction is the whole point: a stale bundle is not
 * fixed by asking the same bundle again, and `retryable` exists precisely so a
 * control does not appear for something it cannot fix.
 *
 * `onReload` is OPTIONAL and defaults to reloading. It was a required prop, so
 * that the application decided what recovery meant -- which is a nicer shape and
 * an impossible one: the boundary has to be rendered from `page.tsx`, a Server
 * Component, and a function is not serialisable across that edge. Optional keeps
 * both: the page renders it bare, and a caller with different recovery still
 * passes one.
 */
export class ResourceBoundary extends Component<
  { children: ReactNode; onReload?: () => void; testId?: string },
  { failed: boolean }
> {
  // ANNOTATED, not inferred. `= { failed: false }` alone leaves Biome's
  // type-aware inference holding the literal `false`, so it reads
  // `!this.state.failed` in render() as a constant and reports the branch as
  // unnecessary. `getDerivedStateFromError` is what widens it, and a static
  // that React calls is not a data flow that inference follows.
  override state: { failed: boolean } = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Reported, not swallowed. The boundary makes the failure survivable; it
    // does not make it uninteresting, and a contained error nobody can see is
    // how a stale client becomes a mystery ticket.
    console.error('resource surface failed to render', error, info.componentStack)
  }

  override render() {
    if (!this.state.failed) {
      return this.props.children
    }
    return (
      <div className="xf-alert" data-testid={this.props.testId} data-tone="danger" role="alert">
        <p className="xf-text">This page is out of date and cannot show this section.</p>
        <p className="xf-text" data-tone="muted">
          It was loaded before a change to the server. Reloading will fetch the current version.
        </p>
        <button
          className="xf-button"
          onClick={this.props.onReload ?? (() => window.location.reload())}
          type="button"
        >
          Reload the page
        </button>
      </div>
    )
  }
}
