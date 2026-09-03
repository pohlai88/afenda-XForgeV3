/**
 * The package's public Button, today a pass-through of the vendored primitive.
 *
 * `components/ui/**` is unexported (ADR-033) and unedited (ADR-031 rule 7), so
 * anything the application may import lives here, one level up. When Button's
 * component policy exists this file becomes its projection; until then it is
 * the thin hand-authored facade ADR-031 names as the control case.
 */
export * from '#components/ui/button'
