import { Link } from 'react-router-dom'
import { InfrastructureDiagram } from '@/components/marketing/InfrastructureDiagram'
import { SettlementEventPanel } from '@/components/marketing/SettlementEventPanel'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Notice } from '@/components/ui/notice'
import { SectionHeading } from '@/components/ui/section-heading'
import { Surface } from '@/components/ui/surface'
import { homeContent } from '@/content/home'
import { sandboxPath, sectionPath, type Locale } from '@/i18n/routing'

export function Landing({ locale }: { locale: Locale }) {
  const content = homeContent[locale]

  return (
    <main id="main-content" data-locale={locale} tabIndex={-1}>
      <section className="relative overflow-hidden pb-20 pt-32 sm:pb-28 sm:pt-40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-48 -top-56 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(77,224,189,0.12)_0%,rgba(77,224,189,0)_68%)]"
        />
        <Container className="relative grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.14em] text-mint">
              {content.hero.label}
            </p>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,7vw,5.8rem)] font-semibold leading-[.96] tracking-[-.055em]">
              {content.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
              {content.hero.description}
            </p>
            <p className="mt-5 max-w-2xl font-mono text-xs leading-5 text-tertiary">
              {content.hero.microDisclosure}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to={sandboxPath(locale, 'register')}>
                  {content.hero.primaryCta}
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to={sectionPath(locale, 'como-funciona')}>
                  {content.hero.secondaryCta}
                </Link>
              </Button>
            </div>
          </div>
          <SettlementEventPanel content={content.eventPanel} />
        </Container>
      </section>

      <section
        aria-label={content.transparency[0].title}
        className="border-y border-line"
      >
        <Container className="grid sm:grid-cols-2 lg:grid-cols-4">
          {content.transparency.map((item) => (
            <div
              key={item.title}
              className="border-line py-6 sm:odd:pr-5 sm:even:border-l sm:even:pl-5 lg:border-l-0 lg:border-r lg:px-5 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
            >
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-tertiary">{item.body}</p>
            </div>
          ))}
        </Container>
      </section>

      <section id="como-funciona" className="scroll-mt-24 py-24 sm:py-32">
        <Container>
          <SectionHeading
            eyebrow={content.howItWorks.eyebrow}
            title={content.howItWorks.title}
            description={content.howItWorks.description}
          />
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {content.howItWorks.steps.map((step, index) => (
              <li key={step.title} className="border-t-2 border-line pt-5">
                <span className="font-mono text-xs text-mint">0{index + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-tertiary">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section
        id="produto"
        className="scroll-mt-24 border-y border-line bg-surface py-24 sm:py-32"
      >
        <Container className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <SectionHeading
            eyebrow={content.operations.eyebrow}
            title={content.operations.title}
            description={content.operations.description}
          />
          <div>
            {content.operations.items.map((item, index) => (
              <article
                key={item.title}
                className="grid grid-cols-[2rem_1fr] gap-4 border-t border-line py-5"
              >
                <span className="font-mono text-xs text-mint">0{index + 1}</span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-tertiary">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-24 sm:py-32">
        <Container>
          <SectionHeading
            eyebrow={content.useCases.eyebrow}
            title={content.useCases.title}
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[content.useCases.merchant, content.useCases.acquirer].map((useCase) => (
              <Surface key={useCase.title} className="p-6 sm:p-8">
                <h3 className="text-xl font-semibold">{useCase.title}</h3>
                <p className="mt-4 text-sm leading-7 text-secondary">{useCase.body}</p>
              </Surface>
            ))}
          </div>
        </Container>
      </section>

      <section
        id="infraestrutura"
        className="scroll-mt-24 border-y border-line bg-surface py-24 sm:py-32"
      >
        <Container>
          <SectionHeading
            eyebrow={content.infrastructure.eyebrow}
            title={content.infrastructure.title}
            description={content.infrastructure.description}
          />
          <InfrastructureDiagram nodes={content.infrastructure.nodes} />
        </Container>
      </section>

      <section id="seguranca" className="scroll-mt-24 py-24 sm:py-32">
        <Container>
          <SectionHeading
            eyebrow={content.disclosure.eyebrow}
            title={content.disclosure.title}
          />
          <Notice tone="sandbox" className="mt-8">
            {content.disclosure.body}
          </Notice>
        </Container>
      </section>

      <section className="border-t border-line py-24 text-center sm:py-32">
        <Container>
          <SectionHeading
            align="center"
            eyebrow={content.finalCta.eyebrow}
            title={content.finalCta.title}
            description={content.finalCta.body}
          />
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={sandboxPath(locale, 'register')}>
                {content.finalCta.primary}
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to={sandboxPath(locale, 'docs')}>
                {content.finalCta.secondary}
              </Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  )
}
