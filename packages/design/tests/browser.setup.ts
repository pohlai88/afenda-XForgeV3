/**
 * Setup for the `browser` Vitest project.
 *
 * WHY A STYLESHEET AT ALL. The authored components style themselves with Tailwind
 * utilities, and Tailwind compiles those only inside the application's build. In this
 * project nothing compiles them, so a `<span role="switch">` with no text has no box, and
 * Playwright refuses to click an element with no size: the first Switch run timed out on
 * "waiting for element to be visible" four times. Behaviour is what is on trial here, not
 * appearance, so the control is given a box by the slot it stamps — not by the classes
 * it wears — and nothing else is styled.
 *
 * NOT the design tokens, deliberately. Loading `generated/tokens.css` would prove nothing
 * about behaviour and would make this suite a second consumer of the stylesheet with a
 * second reason to change when a role does.
 */

const standIn = document.createElement('style')
standIn.textContent = `
  [data-slot="switch"] { display: inline-block; width: 32px; height: 18px; }
  [data-slot="switch-thumb"] { display: block; width: 16px; height: 16px; }
`
document.head.appendChild(standIn)
