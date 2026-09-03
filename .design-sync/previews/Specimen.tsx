import { Button, Code, Specimen, Switch } from '@xforge/design'

/**
 * Specimen previews — the frame one rendered state sits in.
 *
 * A figure: the caption names the state, the stage is the page ground with a hairline
 * round it so the state renders on the surface it will live on, and the footnote is
 * whatever should be read beneath it -- typically the STYLE symbols the state drew. A
 * catalogue word; product screens have no reason to say it.
 */

/** Caption and stage, no footnote. */
export const Plain = () => (
  <Specimen label="Primary button">
    <Button>Save</Button>
  </Specimen>
)

/** With the words the state resolved to, read beneath it. */
export const WithFootnote = () => (
  <Specimen
    footer={
      <>
        <Code>interaction.checked.background</Code> <Code>component.switch.trackWidth</Code>
      </>
    }
    label="Switch, on"
  >
    <Switch aria-label="On" defaultChecked />
  </Specimen>
)
