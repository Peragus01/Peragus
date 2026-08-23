import { toSections, type LegalContent, type LegalRow } from './types'

const enMeta = {
  version: 'Editorial draft 0.1',
  effectiveDate: 'August 23, 2026',
  reviewNotice: 'Editorial content subject to qualified legal review before publication.',
}

const enHeaders = {
  terms: { title: 'Sandbox terms', description: 'Editorial conditions for technical evaluation of the test environment.' },
  privacy: { title: 'Privacy', description: 'Factual information about data on the institutional website and future sandbox.' },
  compliance: { title: 'Compliance', description: 'Current limits and criteria for future operational integrations.' },
  security: { title: 'Security', description: 'Guidance for the official domain, wallets and credentials in the test environment.' },
}

const enSections = {
  terms: [
    ['scope', 'Sandbox scope', 'The Peragus sandbox demonstrates a simulated Pix payment and MockUSDT settlement flow on Polygon Amoy. It does not process real funds or provide USDT settlement.'],
    ['token', 'MockUSDT and test network', 'MockUSDT is a test token with no financial value. Polygon Amoy is a test network and its transactions do not represent financial settlement.'],
    ['wallet', 'Customer-provided wallet', 'The participant provides its own wallet and is responsible for checking the address and network before running a test.'],
    ['use', 'Acceptable use', 'The sandbox is only for technical evaluation, without commercial payments, balance representations or promises to third parties.'],
    ['availability', 'Availability and changes', 'Peragus may change or interrupt the sandbox during development and does not provide a production SLA.'],
  ],
  privacy: [
    ['site', 'Institutional website data', 'The institutional website does not request personal documents or financial data. The hosting provider may record essential technical access data for security and operation.'],
    ['sandbox', 'Sandbox data', 'Business registration data, credentials and test-operation data will be described definitively when the self-service sandbox is implemented and receives qualified legal review.'],
    ['wallet', 'Public wallet and transaction data', 'Addresses and transactions on Polygon Amoy are public by nature. Do not provide private keys or seed phrases.'],
    ['contact', 'Requests', 'Data requests must use only a verified channel on the peragus.com.br domain.'],
  ],
  compliance: [
    ['environment', 'No-real-funds environment', 'The current sandbox does not move real funds and does not settle USDT.'],
    ['claims', 'No unsupported regulatory claims', 'Peragus does not present licenses, certifications or regulatory coverage that have not been substantiated and reviewed.'],
    ['future', 'Future integrations', 'A future gateway or BaaS integration will depend on provider selection, operational controls and applicable legal review.'],
  ],
  security: [
    ['domain', 'Official domain', 'The institutional domain defined for Peragus is peragus.com.br. Check the address before entering any data.'],
    ['secrets', 'Never share secrets', 'Peragus does not request private keys, seed phrases or a complete wallet password.'],
    ['wallet', 'Check wallet and network', 'In the sandbox, check the provided address and confirm that the selected network is Polygon Amoy.'],
    ['report', 'Incident communication', 'Use only a verified security channel on peragus.com.br when that channel is published.'],
  ],
} satisfies Record<keyof LegalContent, readonly LegalRow[]>

export const enLegal = {
  terms: { ...enHeaders.terms, ...enMeta, sections: toSections(enSections.terms) },
  privacy: { ...enHeaders.privacy, ...enMeta, sections: toSections(enSections.privacy) },
  compliance: { ...enHeaders.compliance, ...enMeta, sections: toSections(enSections.compliance) },
  security: { ...enHeaders.security, ...enMeta, sections: toSections(enSections.security) },
} satisfies LegalContent
