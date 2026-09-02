/**
 * The primitives every foundation policy needs, and NOT a second copy of them.
 *
 * `contract.mjs` already imports `deepFreeze` from here, so this file is not
 * optional -- without it the policy contract does not load at all.
 *
 * WHY IT RE-EXPORTS RATHER THAN DEFINES. `deepFreeze`, `toPixels` and `tierOf`
 * are not foundation facts; they are vocabulary the token kernel has owned since
 * it was scaffolded, and `tooling/design-system/token-policy/vocabulary.mjs` is
 * where every existing table freezes itself and every name is classified.
 * Re-declaring them here would put one function in two files on the day this
 * tree was created -- which is the defect CLAUDE.md names, arriving before the
 * tree has governed anything.
 *
 * IT IS ALSO THE ONLY SEAM. `projection/tailwind.mjs` needs `tierOf` and reaches
 * it through here rather than opening a second path into the kernel, so the
 * import direction below is stated once and ends once.
 *
 * THE IMPORT DIRECTION IS THE TRANSITIONAL PART, and it is stated rather than
 * hidden: `packages/` reaches into `tooling/`, which nothing else in this
 * repository does. It is correct only while `foundations/` is being extracted
 * FROM `token-policy/`. It ends one of two ways, and either is fine:
 *
 *   the extraction completes  -- `vocabulary.mjs` keeps these utilities and the
 *                                foundations tree keeps importing them, at which
 *                                point this file collapses to nothing and its
 *                                consumers import the kernel directly
 *   the kernel moves too      -- `vocabulary.mjs` lands beside this file and the
 *                                re-export becomes a definition
 *
 * What must NOT happen is this file quietly growing its own `deepFreeze` while
 * the kernel keeps one. Two implementations of "freeze this table" agree until
 * one of them learns about `Map`.
 */

export {
  deepFreeze,
  tierOf,
  toPixels,
} from '../../../../tooling/design-system/token-policy/vocabulary.mjs'
