# Base UI, official API reference

Downloaded from base-ui.com on **2 September 2026**, for `@base-ui/react` **1.7.0**
— the version in `pnpm-lock.yaml`. These are the upstream `.md` pages, unedited
except as noted below.

## Why these are here

`packages/ui` delegates its hardest accessibility behaviour to Base UI: the
Dialog's focus trap, the Field's labelling chain, and the Autocomplete's
`aria-activedescendant` traversal inside `CommandPalette`. Those delegations are
only sound if what the library actually promises is known, and the alternative to
having the reference here is reading `node_modules/@base-ui/react/**/*.d.ts` —
which gives signatures and no semantics.

That distinction is not academic. `CommandPalette` shipped an
`<Autocomplete.Status />` with no children, above a comment claiming it announced
the result count. The type definitions permit it; this page says the component
"renders its children only when provided", so it announced nothing. The same page
also says `Autocomplete.Empty` **must remain mounted** to announce reliably,
which decided how `.xf-command-empty` is styled. Neither fact is in the `.d.ts`.

## What was removed

Every `## Demo` section — the same component rendered in four styling flavours
(CSS Modules, Tailwind v3, Tailwind v4, plain CSS). They were 55% of the bytes
and answer no API question. `## API reference`, `## Anatomy`,
`## Usage guidelines` and the type sections are intact; the API reference alone
is 120 KB of the Autocomplete page.

Regenerate with the URLs below if a section is needed back.

## What was changed

Fourteen non-breaking spaces and zero-width characters, normalised to ordinary
spaces or removed. Not tidying: `no-control-characters-in-source` fails on them,
and it is right to — an invisible character in a code sample is copied into real
code, where it is a syntax error nobody can see. The guard found them the moment
these files were staged, and would never have seen them while they were
untracked, because it enumerates `git ls-files`.

## Provenance

| File | Source |
|---|---|
| `autocomplete.md` | https://base-ui.com/react/components/autocomplete.md |
| `button.md` | https://base-ui.com/react/components/button.md |
| `checkbox.md` | https://base-ui.com/react/components/checkbox.md |
| `combobox.md` | https://base-ui.com/react/components/combobox.md |
| `dialog.md` | https://base-ui.com/react/components/dialog.md |
| `field.md` | https://base-ui.com/react/components/field.md |
| `input.md` | https://base-ui.com/react/components/input.md |
| `handbook-composition.md` | https://base-ui.com/react/handbook/composition.md |
| `handbook-typescript.md` | https://base-ui.com/react/handbook/typescript.md |

`../base-ui.llms.txt` is the upstream index naming every page, including the ones
not downloaded here.

## These are a SNAPSHOT, and nothing checks that

No guard compares this directory against the installed version, and none should
be built for it without a measured reason (law 30). What matters is the failure
mode: bumping `@base-ui/react` leaves these pages describing the previous
release, and they will read exactly as authoritative as they do today. **Re-download
them in the same commit as the upgrade**, or delete them — a stale API reference
is worse than none, because it is consulted with the same confidence.
