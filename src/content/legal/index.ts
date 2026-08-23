import type { Locale } from '@/i18n/routing'
import { enLegal } from './en'
import { esLegal } from './es'
import { ptLegal } from './pt'
import type { LegalContent } from './types'

export const legalContent = {
  pt: ptLegal,
  es: esLegal,
  en: enLegal,
} satisfies Record<Locale, LegalContent>
