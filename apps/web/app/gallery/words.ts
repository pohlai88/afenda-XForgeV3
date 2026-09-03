/**
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
