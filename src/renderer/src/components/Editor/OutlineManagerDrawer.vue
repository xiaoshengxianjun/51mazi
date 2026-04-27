<template>
  <el-drawer
    v-model="visible"
    :title="t('outlineManager.title')"
    size="80%"
    destroy-on-close
    class="outline-manager-drawer"
  >
    <OutlineManagerPanel :book-name="props.bookName" />
  </el-drawer>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import OutlineManagerPanel from './OutlineManagerPanel.vue'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  }
})

const { t } = useI18n()
const visible = ref(false)

function open() {
  visible.value = true
}

defineExpose({
  open
})
</script>

<style lang="scss" scoped>
:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 16px;
}

:deep(.el-drawer__body) {
  padding: 0 16px 16px;
}
</style>
