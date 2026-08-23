import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PeragusLogo } from '@/components/brand/PeragusLogo'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import type { HomeContent } from '@/content/home/types'
import {
  homePath,
  pagePath,
  sandboxPath,
  sectionPath,
  type Locale,
} from '@/i18n/routing'
import { LocaleSwitcher } from './LocaleSwitcher'

interface HeaderProps {
  locale: Locale
  content: HomeContent
}

export function Header({ locale, content }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigation = [
    { label: content.nav.product, href: sectionPath(locale, 'produto') },
    { label: content.nav.howItWorks, href: sectionPath(locale, 'como-funciona') },
    {
      label: content.nav.infrastructure,
      href: sectionPath(locale, 'infraestrutura'),
    },
    { label: content.nav.security, href: pagePath(locale, 'security') },
  ]

  return (
    <header className="border-b border-line bg-midnight/95">
      <Container className="flex min-h-16 items-center gap-5">
        <Link
          to={homePath(locale)}
          className="flex min-h-11 shrink-0 items-center"
        >
          <PeragusLogo />
        </Link>

        <nav
          aria-label={content.nav.product}
          className="ml-auto hidden items-center gap-1 lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex min-h-11 items-center px-3 text-sm text-secondary transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher locale={locale} />
          <Link
            to={sandboxPath(locale, 'login')}
            className="flex min-h-11 items-center px-3 text-sm text-secondary transition-colors hover:text-primary"
          >
            {content.nav.signIn}
          </Link>
          <Button asChild>
            <Link to={sandboxPath(locale, 'register')}>{content.nav.sandbox}</Link>
          </Button>
        </div>

        <div className="ml-auto lg:hidden">
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center"
                aria-label={content.nav.menuOpen}
              >
                <Menu aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-midnight/80" />
              <Dialog.Content
                aria-describedby={undefined}
                className="fixed inset-x-4 top-4 z-50 rounded-xl border border-line bg-surface p-5 shadow-panel lg:hidden"
              >
                <Dialog.Title className="sr-only">
                  {content.nav.product}
                </Dialog.Title>
                <Dialog.Close
                  aria-label={content.nav.menuClose}
                  className="ml-auto flex h-11 w-11 items-center justify-center"
                >
                  <X aria-hidden="true" />
                </Dialog.Close>
                <nav aria-label={content.nav.product} className="mt-6 grid gap-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-11 items-center text-secondary"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    to={sandboxPath(locale, 'login')}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center text-secondary"
                  >
                    {content.nav.signIn}
                  </Link>
                  <Button asChild className="mt-3">
                    <Link
                      to={sandboxPath(locale, 'register')}
                      onClick={() => setMobileOpen(false)}
                    >
                      {content.nav.sandbox}
                    </Link>
                  </Button>
                  <LocaleSwitcher locale={locale} />
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </Container>
    </header>
  )
}
