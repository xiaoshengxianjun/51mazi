import { createI18n } from 'vue-i18n'
import zhCN from '@renderer/locales/zh-CN.json'
import enUS from '@renderer/locales/en-US.json'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US']
export const DEFAULT_LOCALE = 'zh-CN'

const messages = {
  'zh-CN': zhCN,
  'en-US': enUS
}

function normalizeLocale(rawLocale) {
  if (!rawLocale || typeof rawLocale !== 'string') return DEFAULT_LOCALE
  const lowered = rawLocale.toLowerCase()
  if (lowered.startsWith('zh')) return 'zh-CN'
  if (lowered.startsWith('en')) return 'en-US'
  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages,
  missingWarn: false,
  fallbackWarn: false
})

export function getCurrentLocale() {
  return i18n.global.locale.value
}

export function setLocale(locale) {
  const normalized = normalizeLocale(locale)
  i18n.global.locale.value = normalized
  return normalized
}

export async function initLocale() {
  const stored = await window.electronStore?.get('config.locale')
  const browserLocale =
    typeof navigator !== 'undefined' ? navigator.language || navigator.languages?.[0] : DEFAULT_LOCALE
  const finalLocale = setLocale(stored || browserLocale)
  await window.electronStore?.set('config.locale', finalLocale)
  return finalLocale
}
