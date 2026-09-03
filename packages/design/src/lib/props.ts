import type { ComponentProps, ElementType } from 'react'

/**
 * THE INTRINSIC PROPS A TARGET MAY INHERIT (ADR-031 Decision 12).
 *
 * A public Target that extended `ComponentProps<'div'>` accepted `className` and `style`
 * without ever naming them, so `<Button className="bg-red-500 rounded-[13px]" />`
 * type-checked and bypassed the whole design language -- thirteen of fifteen Targets did,
 * measured 2026-09-03. Components select style through `STYLE` symbols; screens compose
 * components. This is the one place the two props are removed, and `adapter-schema.test.ts`
 * refuses `ComponentProps<'…'>` in authored files so the removal cannot be forgotten.
 */
export type NativeProps<T extends ElementType> = Omit<ComponentProps<T>, 'className' | 'style'>
