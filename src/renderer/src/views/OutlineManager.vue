<template>
  <LayoutTool :title="t('outlineManager.title')">
    <template #headrAction>
      <el-tooltip :content="modeSwitchTooltip" placement="bottom">
        <el-button
          class="outline-mode-switch-btn"
          :icon="isCompactMode ? FullScreen : ScaleToOriginal"
          circle
          @click="handleToggleOutlineDisplayMode"
        />
      </el-tooltip>
      <el-button type="primary" @click="handleCreateOutline">
        {{ t('outlineManager.addOutline') }}
      </el-button>
    </template>
    <div class="outline-manager-page">
      <OutlineManagerPanel ref="outlineManagerPanelRef" :book-name="bookName" />
    </div>
  </LayoutTool>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FullScreen, ScaleToOriginal } from '@element-plus/icons-vue'
import OutlineManagerPanel from '@renderer/components/Editor/OutlineManagerPanel.vue'
import {
  getOutlineDisplayMode,
  isOutlineCompactMode,
  OUTLINE_DISPLAY_MODE_COMPACT,
  OUTLINE_DISPLAY_MODE_LARGE,
  setOutlineDisplayMode
} from '@renderer/composables/useOutlineDisplayMode'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const bookName = computed(() => String(route.query.name || ''))
const outlineManagerPanelRef = ref(null)
const outlineDisplayMode = ref(OUTLINE_DISPLAY_MODE_LARGE)
const isCompactMode = computed(() => isOutlineCompactMode(outlineDisplayMode.value))
const modeSwitchTooltip = computed(() =>
  isCompactMode.value ? t('outlineManager.switchToLarge') : t('outlineManager.switchToCompact')
)

onMounted(async () => {
  outlineDisplayMode.value = await getOutlineDisplayMode(bookName.value)
})

function handleCreateOutline() {
  outlineManagerPanelRef.value?.openCreateDialog?.()
}

async function handleToggleOutlineDisplayMode() {
  if (!bookName.value) return
  const nextMode = isCompactMode.value ? OUTLINE_DISPLAY_MODE_LARGE : OUTLINE_DISPLAY_MODE_COMPACT
  outlineDisplayMode.value = nextMode
  await setOutlineDisplayMode(bookName.value, nextMode)
  if (nextMode === OUTLINE_DISPLAY_MODE_COMPACT) {
    router.push({
      path: '/editor',
      query: {
        name: bookName.value
      }
    })
  }
}
</script>

<style lang="scss" scoped>
.outline-manager-page {
  height: 100%;
  min-height: 0;
}
</style>
