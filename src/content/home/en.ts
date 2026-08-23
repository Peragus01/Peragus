import type { HomeContent } from './types'

export const enHome = {
  languageName: 'English',
  nav: {
    product: 'Product', howItWorks: 'How it works', infrastructure: 'Infrastructure',
    security: 'Security', signIn: 'Sign in', sandbox: 'Create sandbox account',
    menuOpen: 'Open menu', menuClose: 'Close menu',
  },
  hero: {
    label: 'B2B sandbox - Polygon Amoy',
    title: 'Pix in Brazil. Settlement to your wallet.',
    description: 'Validate, in a test environment, the flow between a simulated Pix payment and MockUSDT delivery to your wallet on Polygon Amoy.',
    primaryCta: 'Create sandbox account', secondaryCta: 'Understand the flow',
  },
  eventPanel: { operation: 'OPERATION #PGS-2048', environment: 'TESTNET', simulated: 'simulated' },
  transparency: [
    { title: 'Sandbox environment', body: 'No real funds are moved.' },
    { title: 'MockUSDT', body: 'A test token with no financial value.' },
    { title: 'Customer wallet', body: 'Peragus does not hold customer balances.' },
    { title: 'Polygon Amoy', body: 'Transactions are verifiable on a test network.' },
  ],
  howItWorks: {
    eyebrow: 'Operational flow', title: 'Three states. One verifiable trail.',
    description: 'Follow the test payment from creation to the network transaction.',
    steps: [
      { title: 'Create a payment', body: 'Start a BRL test payment and receive simulated Pix instructions.' },
      { title: 'Confirm the event', body: 'Simulate confirmation and follow the operation state change.' },
      { title: 'Verify settlement', body: 'Confirm MockUSDT delivery to the provided wallet on Polygon Amoy.' },
    ],
  },
  operations: {
    eyebrow: 'For finance and operations', title: 'Less abstraction. More visibility at every stage.',
    description: 'Capabilities demonstrated in the sandbox without production claims.',
    items: [
      { title: 'Explicit states', body: 'Follow creation, confirmation and settlement.' },
      { title: 'Cross-system reference', body: 'Connect the test payment to the on-chain transaction.' },
      { title: 'Customer-controlled wallet', body: 'Set the receiving address in the test environment.' },
      { title: 'Integration-ready flow', body: 'Validate the model before selecting a gateway or BaaS.' },
    ],
  },
  useCases: {
    eyebrow: 'Who can test', title: 'Infrastructure for businesses selling to Brazil.',
    merchant: { title: 'International merchants', body: 'Test a Pix experience for Brazilian buyers and receive the test asset in your own wallet.' },
    acquirer: { title: 'Acquirers and platforms', body: 'Validate how the flow could connect to an existing payment operation.' },
  },
  infrastructure: {
    eyebrow: 'Demonstrable technology', title: 'From payment event to network transaction.',
    description: 'An explicit sequence connects each payment state to test settlement.',
    nodes: ['B2B customer', 'Simulated Pix', 'Peragus orchestration', 'MockUSDT on Amoy'],
  },
  disclosure: {
    eyebrow: 'Environment limits', title: 'A sandbox for technical validation.',
    body: 'MockUSDT is not USDT, has no financial value and operates only on Polygon Amoy. Pix remains simulated until a future gateway or BaaS integration.',
  },
  finalCta: {
    eyebrow: 'First test', title: 'Run your first test settlement.',
    body: 'Create your account, generate an API key and follow the flow through the Polygon Amoy transaction.',
    primary: 'Create sandbox account', secondary: 'Explore documentation',
  },
  footer: {
    description: 'A B2B sandbox for validating Pix and on-chain settlement flows.', product: 'Product',
    resources: 'Resources', legal: 'Legal', documentation: 'Documentation', terms: 'Terms',
    privacy: 'Privacy', compliance: 'Compliance',
  },
  seo: {
    title: 'Peragus | B2B sandbox for Pix and on-chain settlement',
    description: 'Validate a simulated Pix payment and MockUSDT settlement flow on Polygon Amoy.',
  },
} satisfies HomeContent
