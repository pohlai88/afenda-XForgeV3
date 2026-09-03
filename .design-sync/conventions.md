# Building with Xforge

Xforge is a **closed design language**. Every colour, size, spacing step and CSS capability
it permits was declared deliberately; anything outside that set is absent by construction,
not by oversight. Build with the components and the roles below and designs look right.
Reach past them and they will not — a class the system never declared compiles to nothing.

## Wrap everything in `Page`

`Page` sets the page background, the body font and the base text colour, and it is the only
place those three are decided. Everything else inherits them. **Without it your design
renders on the browser's white in the browser's font** — the most common way an Xforge
design comes out wrong.

```jsx
<Page>
  <Stack gap="normal">
    <Heading level={1}>Employee</Heading>
    {/* … */}
  </Stack>
</Page>
```

No other provider is needed. There is no theme provider, no context to mount, no CSS to
import beyond `styles.css`.

## Compose components; do not write classes

This is the rule that matters most, and the product code follows it absolutely: **the
application writes zero `className` and zero `style`.** Layout comes from components, not
from utilities.

| Need | Use | Not |
|---|---|---|
| stack things vertically | `<Stack gap="tight\|normal\|loose">` | `flex flex-col gap-4` |
| lay things out in a row | `<Stack direction="row" gap="…">` | `flex items-center` |
| a bounded surface | `<Card>` | `rounded-lg border p-4` |
| a list of rows | `<List>` + `<ListItem>` | `<ul>` with classes |
| any text | `<Text variant tone>` | `<p className="text-sm">` |
| a title | `<Heading level={1..3}>` | `<h1>` (preflight strips its size) |
| a code/reference span | `<Code>` | `<code>` |

Two axes carry the visual decisions, and both are closed sets:

- `Text variant`: `body` · `emphasis` · `label` · `display`
- `Text tone`: `default` · `muted` · `success` · `danger`
- `Button variant`: `primary` · `outline`
- `Alert tone`: `info` · `success` · `warning` · `danger`
- `Stack gap`: `tight` · `normal` · `loose`; `Stack direction`: `column` · `row`

There is no `size` axis on anything, and no colour prop. If you find yourself wanting one,
the answer is a different component, not a class.

**A tone names meaning, never direction, and never carries meaning alone.** `success` on a
falling number is correct when falling is good — but the number must still show its sign
(`−8.4%`), because colour alone is not an accessible signal. Every `Alert` tone binds its
own icon for the same reason.

## If you must write a class, it names a role

Rare, and only for layout glue a component cannot express. Never write a raw value: the
Tailwind namespaces for colour, text size, weight, leading, tracking, radius, shadow,
breakpoint and container are **removed**, so `bg-red-500`, `text-sm` and `rounded-xl`
produce no CSS at all. Use role names:

```
surface   bg-background · bg-card          text     text-foreground · text-muted-foreground
type      text-body · text-display         family   font-body · font-heading
spacing   gap-tight · gap-normal · gap-loose · px-row-x · py-control-y
shape     rounded-control                  border   border-stroke
focus     focus-ring   (as focus-visible:focus-ring)
motion    duration-press                   icon     size-icon        stacking  layer-overlay
```

## Where the truth is

- `styles.css` and its `@import` closure — the complete legal styling vocabulary, including
  every `--semantic-*` custom property with its alias chain intact.
- `components/<group>/<Name>/<Name>.prompt.md` — per-component usage.
- `components/<group>/<Name>/<Name>.d.ts` — the exact prop contract. Read it before
  guessing a prop; these APIs are deliberately narrow.

Read the real files rather than trusting a summary — they are the authority.

## A complete example

```jsx
<Page>
  <Stack gap="normal">
    <Heading level={1}>Employee</Heading>

    <Alert tone="warning">
      <Stack gap="tight">
        <Text>This record changed while you were editing.</Text>
        <Text>Reload to see the current version, then make your change again.</Text>
      </Stack>
    </Alert>

    <Card>
      <Stack gap="tight">
        <Heading level={2}>Emergency contacts</Heading>
        <List>
          <ListItem>
            <Stack gap="tight">
              <Text>Priya Raman · Spouse</Text>
              <Text tone="muted">+60 12-345 6789</Text>
            </Stack>
            <Button>Save</Button>
          </ListItem>
        </List>
      </Stack>
    </Card>
  </Stack>
</Page>
```

Note what is absent: no `className`, no wrapper `<div>`, no inline style, no colour value.
That is what an Xforge design looks like.
