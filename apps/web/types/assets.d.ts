/**
 * Asset imports this application relies on.
 *
 * These declarations were previously supplied by `next-env.d.ts`, via its
 * `/// <reference types="next" />`. That file is written by Next itself and its
 * CONTENT DEPENDS ON WHICH COMMAND LAST RAN -- `next dev` writes
 * `./.next/dev/types/...` and `next build` writes `./.next/types/...`. Tracking
 * it therefore guarantees a dirty tree: whichever command runs second rewrites
 * a committed file, and law 33 fails the gate.
 *
 * So the dependency is inverted. We declare what WE need, in a file we own, and
 * next-env.d.ts becomes untracked build output that Next may rewrite freely.
 *
 * This is not a duplicate of Next's declaration in the sense law 7 forbids: it
 * is not a second home for a value, it is this application stating which asset
 * types its own source imports. Add to it deliberately -- reaching back for the
 * generated file to obtain a type is how the non-determinism returns.
 */
declare module '*.css' {
  const content: string
  export default content
}
