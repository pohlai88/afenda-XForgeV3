'use client'

/**
 * Transient messages, and the one primitive here that is NOT vocabulary.
 *
 * NO CONTRACT, deliberately, and `boundary.tsx` is the precedent rather than an
 * excuse: it exports `ErrorBoundary` with no contract either, because a metadata
 * document cannot say "and catch render errors here". A toast is the same shape
 * of thing one step further on. It is not PLACED in a document -- it is PUSHED,
 * at a moment the document knows nothing about, by code reacting to something
 * that just happened. `contracts.ts` says in its own header that actions arrive
 * by identifier through the command layer; a toast is the reply to one.
 *
 * The tempting half-measure was to give `ToastViewport` a contract, since a
 * viewport IS placed. It was rejected for a reason worth recording: the viewport
 * would then declare an interaction profile, and neither answer is true. Called
 * `live-region` it claims an `aria-live` it does not carry -- Base UI puts the
 * live semantics on each Toast.Root, not on the region that holds them -- and
 * `none` routes it into an inertness suite asserting a component that announces
 * nothing, which is false of the thing as a whole. A contract that has to lie
 * about what it is buys nothing; a placement rule nobody needed is not worth a
 * dishonest declaration.
 *
 * WHAT IS DELEGATED. Base UI owns the queue, the timers, pause-on-hover and
 * pause-on-focus, the swipe dismissal, the `role`/`aria-live` pairing per toast,
 * and -- the part nobody implements correctly by hand -- moving focus into the
 * viewport when a toast arrives and returning it afterwards.
 */

import { Toast as BaseToast } from '@base-ui/react/toast'
import type { ReactNode } from 'react'

/**
 * Wraps the application once, so `useToast` has a queue to push onto.
 *
 * At the ROOT, not per screen. Two providers are two independent queues, and a
 * toast pushed on one is invisible in the other's viewport -- a failure that
 * looks exactly like a toast that was never sent.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <BaseToast.Provider>{children}</BaseToast.Provider>
}

/**
 * Where toasts appear. Rendered once, inside the provider.
 *
 * `label` names the region, and is required for the reason every other region
 * in this system requires one: a user who lands here by landmark navigation is
 * told what they have found.
 *
 * The tone vocabulary is `Alert`'s, read from the same place, so a failure that
 * appears as a banner and the same failure as a toast are the same colour and
 * carry the same mark. Two independent tone tables was how the info banner ended
 * up wearing the accent tint, and this is where the second one would have gone.
 */
export function ToastViewport({ label }: { label: string }) {
  const { toasts } = BaseToast.useToastManager()
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport aria-label={label} className="xf-toast-viewport">
        {toasts.map((toast) => (
          <BaseToast.Root className="xf-toast" key={toast.id} toast={toast}>
            <BaseToast.Title className="xf-toast-title" />
            <BaseToast.Description className="xf-toast-description" />
            <BaseToast.Close aria-label="Dismiss" className="xf-toast-close">
              {'×'}
            </BaseToast.Close>
          </BaseToast.Root>
        ))}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  )
}

/**
 * Push a toast.
 *
 * A HOOK RATHER THAN A COMPONENT, which is the whole reason this module has no
 * contract: the caller is code, not configuration.
 */
export function useToast() {
  return BaseToast.useToastManager()
}
