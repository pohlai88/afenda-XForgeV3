/**
 * The package's public Card, today a pass-through of the vendored primitive.
 * See `button.tsx`: the same leak, the same ADR-031 Migration step 2. Card is
 * also a beta-exit case, so question C is "no" for it until this is refined.
 */
export * from '#components/ui/card'
