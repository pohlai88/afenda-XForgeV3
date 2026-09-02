'use client'

import { MenuIcon, SearchIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'

/**
 * The application shell: a binding bar, a navigation rail, and the screen.
 *
 * TAKES ITS DATA AS PROPS AND FETCHES NOTHING. Composed here rather than in a
 * route so it renders in every state without a server, and so the app stays
 * untouched until the cutover. The route that mounts it stays thin: resolve,
 * then hand over.
 *
 * SYNTHESISED FROM THE STUDIO SHELLS, NOT COPIED. What was worth taking is the
 * layout DNA -- a persistent rail with grouped sections, a Sheet standing in for
 * it on small screens, a visible search affordance that fronts a keyboard-first
 * palette, and an account menu anchored opposite. What was left is everything
 * built on the Radix registry, the stock avatars, and the animation library.
 *
 * THREE THINGS NONE OF THEM HAD, and each answers something this product owes:
 *
 *   a skip link        the rail is the first thing in the tab order, and a
 *                      keyboard user should not traverse it on every screen
 *   the binding bar    below
 *   `aria-current`     a highlighted row that says nothing to a screen reader
 *                      is colour carrying meaning alone
 */

export interface NavItem {
  readonly href: string
  readonly icon?: ReactNode
  readonly label: string
}

export interface NavSection {
  readonly items: readonly NavItem[]
  readonly title: string
}

export interface Binding {
  /** The legal entity payroll and statutory scope run against — never the tenant. */
  readonly legalEntity: string
  /** Where a person goes to bind a different tenant. A URL, never a callback. */
  readonly switchHref: string
  readonly tenant: string
}

export interface Account {
  readonly name: string
  readonly onSignOut: () => void
}

/**
 * THE SIGNATURE OF THIS PRODUCT, and the one place it spends vertical space.
 *
 * An outsourced payroll bureau moves between client companies all day, and the
 * most expensive error available to them is running a payroll against the wrong
 * company. It is unrecoverable: payroll history is immutable and corrected by
 * reversal, never by editing (law 18).
 *
 * SO THE BINDING IS A PLACE YOU ARE IN, NOT A CONTROL YOU FLICK. Full width,
 * part of the chrome, always present, never a dropdown in a corner. Nobody
 * should look at this screen and be unsure which company they are operating on.
 *
 * SWITCHING IS AN ANCHOR, AND THAT IS ARCHITECTURE RATHER THAN STYLE. ADR-022
 * decided the bound tenant comes from the host or route and is re-verified
 * against membership on every request -- "`activeTenantId` may exist as a
 * navigation preference. It never grants access." A client-side toggle would
 * imply the binding is app state changeable in place. It is not: two tabs on two
 * tenants are independent, and switching is a real navigation.
 *
 * The legal entity sits beside the tenant because they are different scopes and
 * conflating them is its own expensive error -- one tenant may hold several
 * legal entities, and payroll scopes to the entity.
 */
function BindingBar({ binding }: { readonly binding: Binding }) {
  return (
    <div className="flex items-center gap-tight border-border border-b bg-card px-row-x py-control-y text-body-compact">
      <span className="text-muted-foreground">Operating on</span>
      <span className="font-label text-card-foreground">{binding.tenant}</span>
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
      <span className="truncate text-card-foreground">{binding.legalEntity}</span>
      {/*
        WCAG 2.5.8, AND `inline-flex` IS THE LOAD-BEARING HALF. Measured in the
        running shell this was 39.9 x 20 -- under the 24px floor, on the one
        control that changes which company a payroll runs against.

        `min-h-*` alone would have changed nothing and looked like a fix: an
        inline box ignores height outright, so the element has to become a flex
        box before a minimum applies to it. axe passes the 20px version on the
        spacing exception, so nothing here would have gone red either way.
      */}
      <a
        className="focus-visible:focus-ring ml-auto inline-flex min-h-target-minimum shrink-0 items-center rounded-precise text-muted-foreground underline underline-offset-4 hover:text-card-foreground"
        href={binding.switchHref}
      >
        Switch
      </a>
    </div>
  )
}

function NavList({
  currentHref,
  onNavigate,
  sections,
}: {
  readonly currentHref: string
  readonly onNavigate?: () => void
  readonly sections: readonly NavSection[]
}) {
  return (
    <>
      {sections.map((section) => (
        <div className="mb-loose last:mb-0" key={section.title}>
          <h2 className="mb-tight px-control-x font-caption text-caption text-muted-foreground">
            {section.title}
          </h2>
          <ul className="flex list-none flex-col gap-tight p-0">
            {section.items.map((item) => {
              const current = item.href === currentHref
              return (
                <li key={item.href}>
                  <a
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-tight rounded-control px-control-x py-control-y font-label text-label no-underline',
                      current
                        ? 'bg-accent text-accent-foreground'
                        : 'text-card-foreground hover:bg-muted',
                      'focus-visible:focus-ring',
                    )}
                    href={item.href}
                    onClick={onNavigate}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}

export function AppShell({
  account,
  binding,
  children,
  currentHref,
  onOpenPalette,
  sections,
  title,
}: {
  readonly account?: Account
  readonly binding: Binding
  readonly children: ReactNode
  readonly currentHref: string
  /** Opens the command palette. The palette owns its own ⌘K binding. */
  readonly onOpenPalette?: () => void
  readonly sections: readonly NavSection[]
  readonly title: string
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-body text-foreground">
      {/* The rail is the first thing in the tab order. Without this, reaching the
          content by keyboard means traversing every nav item on every screen.
          Visible only on focus, because it is for the people who need it. */}
      <a
        className="focus-visible:focus-ring focus:layer-overlay sr-only rounded-control bg-card px-control-x py-control-y text-card-foreground focus:not-sr-only focus:absolute focus:top-tight focus:left-tight"
        href="#main"
      >
        Skip to content
      </a>

      <BindingBar binding={binding} />

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Sections"
          className="medium:block hidden w-shell-nav-expanded shrink-0 border-border border-r bg-card p-normal"
        >
          <NavList currentHref={currentHref} sections={sections} />
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-tight border-border border-b px-row-x py-control-y">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    aria-label="Open navigation"
                    className="medium:hidden"
                    size="icon-sm"
                    variant="ghost"
                  />
                }
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent className="w-72 p-normal" side="left">
                <SheetHeader className="sr-only">
                  <SheetTitle>Sections</SheetTitle>
                </SheetHeader>
                <NavList currentHref={currentHref} sections={sections} />
              </SheetContent>
            </Sheet>

            <h1 className="m-0 truncate font-heading text-foreground text-title">{title}</h1>

            {/* THE DISCOVERABLE HALF OF A KEYBOARD-FIRST PALETTE. ⌘K is the fast
                path and it is invisible; a person who has never been told cannot
                find it. The shortcut is shown on the control that opens it. */}
            {onOpenPalette ? (
              <Button
                className="ml-auto gap-tight text-muted-foreground"
                onClick={onOpenPalette}
                size="sm"
                variant="outline"
              >
                <SearchIcon />
                Search
                <kbd className="rounded-precise bg-muted px-related font-mono text-body-compact">
                  ⌘K
                </kbd>
              </Button>
            ) : null}

            {account ? (
              <DropdownMenu>
                <Avatar
                  className="size-7"
                  render={
                    <button
                      aria-label={`Account: ${account.name}`}
                      className="focus-visible:focus-ring rounded-full"
                      type="button"
                    />
                  }
                >
                  <AvatarFallback>{account.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{account.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={account.onSignOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </header>

          <main className="min-w-0 flex-1 p-section" id="main">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
