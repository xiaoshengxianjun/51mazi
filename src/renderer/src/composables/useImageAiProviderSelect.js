import { ref, watch, computed } from 'vue'
import {
  listConfiguredImageProviders,
  getImageAiLastProvider,
  setImageAiLastProvider
} from '@renderer/service/imageAi'

/**
 * 出图界面：已配置的图像服务商列表与当前选择（与 imageAi.lastProvider 同步）
 * @param {import('vue').Ref<boolean>} modelValueRef 抽屉/对话框是否打开
 */
export function useImageAiProviderSelect(modelValueRef) {
  const imageProviders = ref([])
  const selectedProvider = ref('')
  const providersLoaded = ref(false)

  async function refreshProviders() {
    const res = await listConfiguredImageProviders()
    imageProviders.value = res?.success && Array.isArray(res.providers) ? [...res.providers] : []
    const lastRes = await getImageAiLastProvider()
    const lastId = lastRes?.success ? lastRes.provider : null
    if (lastId && imageProviders.value.includes(lastId)) {
      selectedProvider.value = lastId
    } else if (imageProviders.value.length > 0) {
      selectedProvider.value = imageProviders.value[0]
    } else {
      selectedProvider.value = ''
    }
    providersLoaded.value = true
  }

  watch(
    modelValueRef,
    (open) => {
      if (open) refreshProviders()
    },
    { flush: 'post' }
  )

  watch(selectedProvider, (p) => {
    if (p && String(p).trim()) {
      setImageAiLastProvider(String(p).trim()).catch(() => {})
    }
  })

  const noImageProviders = computed(
    () => providersLoaded.value && imageProviders.value.length === 0
  )

  return {
    imageProviders,
    selectedProvider,
    noImageProviders,
    providersLoaded,
    refreshProviders
  }
}
