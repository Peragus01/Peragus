export type LegalPageType = 'terms' | 'privacy' | 'compliance' | 'security'

export type LegalDocument = {
  title: string
  description: string
  version: string
  effectiveDate: string
  reviewNotice: string
  sections: Array<{ id: string; title: string; paragraphs: string[]; items?: string[] }>
}

export type LegalContent = Record<LegalPageType, LegalDocument>

export type LegalRow = readonly [id: string, title: string, paragraph: string]

export function toSections(rows: readonly LegalRow[]): LegalDocument['sections'] {
  return rows.map(([id, title, paragraph]) => ({ id, title, paragraphs: [paragraph] }))
}
