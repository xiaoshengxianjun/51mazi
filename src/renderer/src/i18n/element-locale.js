import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const elementLocaleMap = {
  'zh-CN': zhCn,
  'en-US': en
}

export function useElementLocale() {
  const { locale } = useI18n()

  const elementLocale = computed(() => {
    return elementLocaleMap[locale.value] || zhCn
  })

  return {
    elementLocale
  }
}
