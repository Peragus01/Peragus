import { Link } from 'react-router-dom'
import { PeragusLogo } from '@/components/brand/PeragusLogo'
import { Container } from '@/components/ui/container'
import type { HomeContent } from '@/content/home/types'
import {
  homePath,
  pagePath,
  sandboxPath,
  sectionPath,
  type Locale,
} from '@/i18n/routing'

interface FooterProps {
  locale: Locale
  content: HomeContent
}

export function Footer({ locale, content }: FooterProps) {
  const footerGroups = [
    {
      title: content.footer.product,
      links: [
        [content.nav.howItWorks, sectionPath(locale, 'como-funciona')],
        [content.nav.infrastructure, sectionPath(locale, 'infraestrutura')],
      ],
    },
    {
      title: content.footer.resources,
      links: [
        [content.footer.documentation, sandboxPath(locale, 'docs')],
        [content.nav.security, pagePath(locale, 'security')],
      ],
    },
    {
      title: content.footer.legal,
      links: [
        [content.footer.terms, pagePath(locale, 'terms')],
        [content.footer.privacy, pagePath(locale, 'privacy')],
        [content.footer.compliance, pagePath(locale, 'compliance')],
      ],
    },
  ] as const

  return (
    <footer className="border-t border-line bg-surface/40 py-12">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="flex max-w-sm items-start gap-4">
            <Link
              to={homePath(locale)}
              className="inline-flex min-h-11 shrink-0 items-center"
            >
              <PeragusLogo />
            </Link>
            <p className="text-sm leading-6 text-secondary">
              {content.footer.description}
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="font-mono text-xs uppercase tracking-wider text-tertiary">
                {group.title}
              </h2>
              <ul className="mt-3 grid gap-1">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      to={href}
                      className="flex min-h-11 items-center text-sm text-secondary transition-colors hover:text-primary"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 border-t border-line pt-6 font-mono text-xs text-tertiary">
          peragus.com.br
        </p>
      </Container>
    </footer>
  )
}
