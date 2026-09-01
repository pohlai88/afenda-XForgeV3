/**
 * The one freeze, shared by every table in the package.
 *
 * It lived beside the tables when they lived in one file. Split out rather than
 * duplicated: a policy package whose modules each froze their own data would
 * have as many definitions of "canonical" as it has domains.
 *
 * EXPORTED DATA IS FROZEN, ALL THE WAY DOWN: a canonical fact another module can
 * edit is not one. `Object.freeze` alone is shallow, and shallow is the whole
 * risk here -- every table in this package nests, so a shallow freeze leaves
 * `COLOR_ROLE_POLICIES['text.default'].kind` writable while the table it sits in
 * looks protected. That degradation is invisible: replacing this function with a
 * bare `Object.freeze` leaves the entire unit suite and every architecture guard
 * green, which is why `tokens.test.ts` now walks the exports and asserts the
 * depth rather than trusting the name of this function.
 *
 * NO CYCLE GUARD, deliberately. Every call site freezes an object or array
 * literal written in source, so a cyclic table cannot occur; a `WeakSet` here
 * would be defending against input the package cannot construct, which is
 * infrastructure ahead of a measured pain (law 30). If a table ever holds a
 * reference back to its own root, this recurses forever and the stack trace says
 * so -- which is a better failure than a guard nobody could have justified.
 */
export const deepFreeze = (value) => {
  // A PRIMITIVE IS A PROGRAMMING ERROR HERE, not a value to pass through. The
  // recursion below only ever hands this function an object, so the only way a
  // primitive arrives is a call site freezing something that is not a table --
  // and `Object.values(null)` would answer that with "Cannot convert undefined
  // or null to object", which names neither the caller nor the reason.
  if (value === null || typeof value !== 'object') {
    throw new Error(
      `deepFreeze received ${value === null ? 'null' : `a ${typeof value}`}, which is not a ` +
        'table -- only objects and arrays carry canonical data, and freezing a primitive ' +
        'would report success while protecting nothing',
    )
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      deepFreeze(child)
    }
  }
  return Object.freeze(value)
}
