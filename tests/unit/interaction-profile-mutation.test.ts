import {
  type Contract,
  type ContractId,
  contracts,
  contractsOwingAtEvidence,
  PROFILES_REQUIRING_AT_EVIDENCE,
} from '@xforge/design/contracts'
import { describe, expect, it } from 'vitest'

/**
 * `interaction.profile` is load-bearing, proved by MUTATING it.
 *
 * A registry field is documentation until something changes behaviour on it. The
 * question this suite answers is not "is the profile correct" -- no test can ask
 * that -- but "would anything notice if it were wrong". Flip a value, and a
 * check downstream must move.
 *
 * MUCH SMALLER THAN IT WAS, AND THE REASON IS A DEBT, NOT A SIMPLIFICATION.
 * The previous version carried an expectation per component naming the e2e spec
 * that would catch each flip: `inert-contracts.spec.ts` for a root that must not
 * take focus, `native-control.spec.ts` for platform semantics,
 * `live-region-politeness.spec.ts` for announcement politeness. Those specs drove
 * a document-driven conformance harness that interpreted the old registry's slot
 * and prop grammar, and the new registry deliberately has no such grammar --
 * "NO SLOT GRAMMAR YET, and that is a decision". The harness and its specs were
 * deleted with the system they interpreted.
 *
 * So the expectations could not be re-pointed: they cited proofs that no longer
 * exist. Rather than delete the suite and leave nothing, it is reduced to the
 * ONE consumer that survived the cutover -- the assistive-technology evidence
 * gate (ADR-025) -- which still dispatches on the profile and still refuses a
 * release. That is a real check, and it is a fraction of the coverage that was
 * there.
 *
 * WHAT IS OWED: the conformance suites, rewritten against these contracts, and
 * this table restored to one expectation per component. Until then a profile
 * that is wrong in a way the evidence gate cannot see is a profile nothing
 * catches.
 */

const flip = (id: ContractId, profile: string): Record<string, Contract> => ({
  ...contracts,
  [id]: {
    ...contracts[id],
    interaction: { ...contracts[id].interaction, profile },
  } as Contract,
})

describe('the interaction profile changes what the repository demands', () => {
  it('has a subject set, so a passing suite cannot mean it checked nothing', () => {
    expect(Object.keys(contracts).length).toBeGreaterThan(10)
    expect(PROFILES_REQUIRING_AT_EVIDENCE.length).toBeGreaterThan(0)
  })

  /**
   * The gate reads the rule rather than a list, so this is the property that
   * makes ADR-025 self-maintaining: a component joins the accessibility gate by
   * declaring what it is, and nobody edits a roster.
   */
  it('every gated contract owes evidence, and no other one does', () => {
    const owing = new Set(contractsOwingAtEvidence())
    for (const [id, contract] of Object.entries(contracts)) {
      const gated = (PROFILES_REQUIRING_AT_EVIDENCE as readonly string[]).includes(
        contract.interaction.profile,
      )
      expect(owing.has(id), `${id} (${contract.interaction.profile})`).toBe(gated)
    }
  })

  /**
   * THE MUTATION. Flipping a gated profile to `none` must remove that component
   * from what the gate demands -- if it does not, the gate is reading something
   * other than the field, and the field is decoration.
   */
  it.each(contractsOwingAtEvidence())(
    'flipping %s to none drops it from what the evidence gate demands',
    (id: string) => {
      expect(contractsOwingAtEvidence()).toContain(id)
      expect(contractsOwingAtEvidence(flip(id as ContractId, 'none'))).not.toContain(id)
    },
  )

  /**
   * And the other direction, which is the one that catches a gate keyed to a
   * hardcoded list: a component that is NOT gated must become gated when its
   * profile says so.
   */
  it.each(
    (Object.keys(contracts) as ContractId[]).filter(
      (id) =>
        !(PROFILES_REQUIRING_AT_EVIDENCE as readonly string[]).includes(
          contracts[id].interaction.profile,
        ),
    ),
  )('flipping %s to modal makes the evidence gate demand it', (id) => {
    expect(contractsOwingAtEvidence()).not.toContain(id)
    expect(contractsOwingAtEvidence(flip(id as ContractId, 'modal'))).toContain(id)
  })
})
