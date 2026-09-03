/**
 * The package's public Button, today a pass-through of the vendored primitive.
 *
 * `components/ui/**` is unexported (ADR-033) and unedited (ADR-031 Decision 7),
 * so anything the application may import lives here, one level up.
 *
 * NOT YET AN ADAPTER, AND ADR-031 SAYS SO. `export *` re-exports upstream's
 * `Props & VariantProps<…>` as the public Target, which is the shape the
 * No-Leakage Law forbids. ADR-031 Migration step 2 replaces this with an
 * Xforge-owned props interface and a deliberate translation, after
 * Verification 5 has been seen RED on this file.
 */
export * from '#components/ui/button'
