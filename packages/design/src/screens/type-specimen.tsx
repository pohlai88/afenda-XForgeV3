/**
 * The seven roles, against each other, at the size a reader meets them.
 *
 * WHY A SPECIMEN AND NOT A DOCS TABLE. Every property of this scale that a check
 * can hold is already held: the generator proves hierarchy survives every
 * density, the compile test proves each class resolves, and the leading ratios
 * are arithmetic. What none of them can answer is the only question that decides
 * whether seven is the right number -- can a person tell these apart on one
 * screen, in a glance, without being told what to look for.
 *
 * THE RIGHT ANSWER MIGHT BE FEWER. Apple's guidance is "just a few styles and
 * sizes" and the doctrine this scale was built from says a screen should show
 * three to five apparent levels. Seven ROLES is not seven levels -- three sizes
 * are doubled by weight rather than by size, which is the whole trick -- but if
 * `body-compact` and `label` read as one thing here, then they are one thing,
 * and the split was theory.
 */

interface Role {
  readonly cls: string
  readonly name: string
  readonly spec: string
  readonly use: string
}

const ROLES: readonly Role[] = [
  {
    cls: 'font-caption text-caption',
    name: 'caption',
    spec: '12 / 16 · 400',
    use: 'timestamps, metadata, a section name in the rail',
  },
  {
    cls: 'font-body-compact text-body-compact',
    name: 'body-compact',
    spec: '14 / 20 · 400',
    use: 'table cells, form fields, the second line of a row',
  },
  {
    cls: 'font-label text-label',
    name: 'label',
    spec: '14 / 20 · 500',
    use: 'field names, column heads, navigation, controls',
  },
  {
    cls: 'font-body text-body',
    name: 'body',
    spec: '16 / 24 · 400',
    use: 'prose, descriptions, anything set in paragraphs',
  },
  {
    cls: 'font-emphasis text-emphasis',
    name: 'emphasis',
    spec: '16 / 24 · 500',
    use: 'the term against its value, a card title, a total',
  },
  {
    cls: 'font-heading text-heading',
    name: 'heading',
    spec: '20 / 28 · 600',
    use: 'a section',
  },
  {
    cls: 'font-heading text-title',
    name: 'title',
    spec: '24 / 32 · 600',
    use: 'the page',
  },
]

export function TypeSpecimen() {
  return (
    <div className="flex flex-col gap-normal">
      {ROLES.map((role) => (
        <div
          className="flex flex-col gap-tight border-border border-b pb-normal last:border-b-0"
          key={role.name}
        >
          <div className="flex flex-wrap items-baseline gap-tight">
            <span className="font-mono text-caption text-muted-foreground tabular-nums">
              {role.spec}
            </span>
            <span className="font-caption text-caption text-muted-foreground">{role.name}</span>
          </div>
          {/*
            THE SAME SENTENCE IN EVERY ROLE, because a specimen that changes the
            words changes what is being compared. Malaysian payroll vocabulary
            rather than lorem ipsum: the glyph mix a reader actually meets --
            capitals, digits, a currency prefix -- is what decides whether a size
            holds up, and Latin filler hides exactly that.
          */}
          <p className={`m-0 text-foreground ${role.cls}`}>
            Statutory contributions for October 2026 — EPF 13%, SOCSO, EIS · RM 5,200.00
          </p>
          <p className="m-0 font-caption text-caption text-muted-foreground">{role.use}</p>
        </div>
      ))}
    </div>
  )
}
