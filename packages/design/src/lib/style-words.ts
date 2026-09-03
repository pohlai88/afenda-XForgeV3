/**
 * Reading the style contract back from a rendered tree: which symbols a set of classes wears,
 * and, across several frames, what they share versus what each adds. Facts about the
 * manifest and how STYLE symbols map to classes, so they live beside it; the gallery and
 * a Storybook decorator both read them from here.
 *
 * The footnote rule, as a pure function so it can be held to.
 *
 * A group of frames drew a set of STYLE symbols each. What every frame shares is the
 * group's RECIPE and is printed once; what a frame carries beyond the recipe is its
 * FOOTNOTE. One frame has nothing to differ from: its words are all recipe and its
 * footnote is empty. Output is sorted so two runs over the same page read the same.
 */
export function partition(frames: readonly ReadonlySet<string>[]): {
  readonly footnotes: readonly (readonly string[])[]
  readonly recipe: readonly string[]
} {
  const [first, ...rest] = frames
  if (!first) {
    return { footnotes: [], recipe: [] }
  }
  const byName = (a: string, b: string) => a.localeCompare(b)
  const shared = new Set([...first].filter((word) => rest.every((frame) => frame.has(word))))
  return {
    footnotes: frames.map((frame) => [...frame].filter((word) => !shared.has(word)).sort(byName)),
    recipe: [...shared].sort(byName),
  }
}

/**
 * Which symbols an element wears, given its classes.
 *
 * A symbol is worn only when EVERY class it names is present. `typography.title` is
 * `font-heading text-title` and `typography.heading` is `font-heading text-heading`;
 * looking classes up one at a time credited every heading with `title` because both share
 * `font-heading`. Sorted, for the same reason as above.
 */
export function symbolsOn(
  classes: Iterable<string>,
  symbols: Readonly<Record<string, { readonly class: string }>>,
): readonly string[] {
  const present = new Set(classes)
  return Object.entries(symbols)
    .filter(([, entry]) => entry.class.split(' ').every((cls) => present.has(cls)))
    .map(([symbol]) => symbol)
    .sort((a, b) => a.localeCompare(b))
}
