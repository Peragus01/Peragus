export type HomeContent = {
  languageName: string
  nav: {
    product: string
    howItWorks: string
    infrastructure: string
    security: string
    signIn: string
    sandbox: string
    menuOpen: string
    menuClose: string
  }
  hero: {
    label: string
    title: string
    description: string
    primaryCta: string
    secondaryCta: string
  }
  eventPanel: {
    operation: string
    environment: string
    simulated: string
  }
  transparency: Array<{ title: string; body: string }>
  howItWorks: {
    eyebrow: string
    title: string
    description: string
    steps: Array<{ title: string; body: string }>
  }
  operations: {
    eyebrow: string
    title: string
    description: string
    items: Array<{ title: string; body: string }>
  }
  useCases: {
    eyebrow: string
    title: string
    merchant: { title: string; body: string }
    acquirer: { title: string; body: string }
  }
  infrastructure: {
    eyebrow: string
    title: string
    description: string
    nodes: [string, string, string, string]
  }
  disclosure: { eyebrow: string; title: string; body: string }
  finalCta: { eyebrow: string; title: string; body: string; primary: string; secondary: string }
  footer: {
    description: string
    product: string
    resources: string
    legal: string
    documentation: string
    terms: string
    privacy: string
    compliance: string
  }
  seo: { title: string; description: string }
}
