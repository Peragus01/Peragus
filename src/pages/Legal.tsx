import { PageMetadata } from '@/components/seo/PageMetadata'
import { Container } from '@/components/ui/container'
import { Notice } from '@/components/ui/notice'
import { legalContent } from '@/content/legal'
import type { LegalPageType } from '@/content/legal/types'
import { pagePath, type Locale } from '@/i18n/routing'

export function LegalPage({ locale, type }: { locale: Locale; type: LegalPageType }) {
  const document = legalContent[locale][type]

  return (
    <main id="main-content" tabIndex={-1} className="pb-24 pt-32">
      <PageMetadata
        locale={locale}
        title={`${document.title} | Peragus`}
        description={document.description}
        canonicalPath={pagePath(locale, type)}
        alternates={{
          pt: pagePath('pt', type),
          es: pagePath('es', type),
          en: pagePath('en', type),
        }}
      />
      <Container>
        <p className="font-mono text-xs uppercase tracking-[.12em] text-sandbox">
          {document.version}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.04em] sm:text-6xl">
          {document.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-secondary">
          {document.description}
        </p>
        <p className="mt-4 text-sm text-tertiary">{document.effectiveDate}</p>
        <Notice tone="sandbox" className="mt-8">
          {document.reviewNotice}
        </Notice>
        <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_1fr]">
          <nav aria-label={document.title} className="lg:sticky lg:top-24 lg:self-start">
            <ol className="grid gap-2">
              {document.sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    className="flex min-h-11 items-center text-sm text-tertiary hover:text-primary"
                    href={`#${section.id}`}
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="grid gap-12">
            {document.sections.map((section) => (
              <section
                id={section.id}
                key={section.id}
                className="scroll-mt-24 border-t border-line pt-6"
              >
                <h2 className="text-2xl font-semibold">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-base leading-8 text-secondary">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </Container>
    </main>
  )
}
