<template>
  <LayoutTool :title="t('outlineManager.title')">
    <template #headrAction>
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
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import OutlineManagerPanel from '@renderer/components/Editor/OutlineManagerPanel.vue'

const { t } = useI18n()
const route = useRoute()

const bookName = computed(() => String(route.query.name || ''))
const outlineManagerPanelRef = ref(null)

function handleCreateOutline() {
  outlineManagerPanelRef.value?.openCreateDialog?.()
}
</script>

<style lang="scss" scoped>
.outline-manager-page {
  height: 100%;
  min-height: 0;
}
</style>
