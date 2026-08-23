import type { Locale } from '@/i18n/routing'
import { enHome } from './en'
import { esHome } from './es'
import { ptHome } from './pt'
import type { HomeContent } from './types'

export const homeContent = {
  pt: ptHome,
  es: esHome,
  en: enHome,
} satisfies Record<Locale, HomeContent>
