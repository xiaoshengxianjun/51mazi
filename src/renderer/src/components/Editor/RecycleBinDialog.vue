<template>
  <el-dialog
    v-model="visible"
    :title="t('recycleBin.title')"
    width="960px"
    align-center
    :close-on-click-modal="false"
    destroy-on-close
    @open="loadTrash"
  >
    <div class="recycle-bin-dialog">
      <el-empty v-if="trashItems.length === 0" :description="t('recycleBin.empty')" />

      <el-table v-else :data="trashItems" max-height="420" stripe>
        <el-table-column :label="t('recycleBin.type')" width="88">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTagMap[row.type]">
              {{ typeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="t('recycleBin.name')" min-width="240" show-overflow-tooltip />
        <el-table-column :label="t('recycleBin.wordCount')" width="88" align="right">
          <template #default="{ row }">
            {{ formatWordCount(row.wordCount) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('recycleBin.location')" min-width="140">
          <template #default="{ row }">
            {{ formatLocation(row) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('recycleBin.deletedAt')" width="150">
          <template #default="{ row }">
            {{ formatDeletedAt(row.deletedAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('recycleBin.actions')" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleRestore(row)">
              {{ t('recycleBin.restore') }}
            </el-button>
            <el-button type="danger" link @click="handlePermanentDelete(row)">
              {{ t('recycleBin.deletePermanently') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          v-if="trashItems.length > 0"
          type="danger"
          plain
          @click="handleClearTrash"
        >
          {{ t('recycleBin.clearAll') }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 恢复冲突：由用户选择覆盖或重命名 -->
  <el-dialog
    v-model="conflictVisible"
    :title="t('recycleBin.conflictTitle')"
    width="480px"
    align-center
    append-to-body
    :close-on-click-modal="false"
  >
    <p class="conflict-message">{{ conflictMessage }}</p>
    <el-radio-group v-model="conflictStrategy" class="conflict-strategy">
      <el-radio value="overwrite">{{ t('recycleBin.overwrite') }}</el-radio>
      <el-radio value="rename">{{ t('recycleBin.renameRestore') }}</el-radio>
    </el-radio-group>
    <el-input
      v-if="conflictStrategy === 'rename'"
      v-model="conflictNewName"
      class="conflict-rename-input"
      maxlength="20"
      :placeholder="t('recycleBin.renamePlaceholder')"
    />
    <template #footer>
      <el-button @click="conflictVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="restoring" @click="confirmConflictRestore">
        {{ t('recycleBin.confirmRestore') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'

const props = defineProps({
  bookName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['restored'])

const { t } = useI18n()

const visible = ref(false)
const trashItems = ref([])
const restoring = ref(false)

const conflictVisible = ref(false)
const conflictStrategy = ref('overwrite')
const conflictNewName = ref('')
const conflictMessage = ref('')
const pendingRestoreItem = ref(null)

const typeTagMap = {
  volume: 'warning',
  chapter: '',
  notebook: 'success',
  note: 'info'
}

function typeLabel(type) {
  const map = {
    volume: t('recycleBin.typeVolume'),
    chapter: t('recycleBin.typeChapter'),
    notebook: t('recycleBin.typeNotebook'),
    note: t('recycleBin.typeNote')
  }
  return map[type] || type
}

function formatLocation(row) {
  if (row.type === 'chapter') {
    return `${t('recycleBin.chaptersRoot')} / ${row.volume}`
  }
  if (row.type === 'volume') {
    return t('recycleBin.chaptersRoot')
  }
  if (row.type === 'note') {
    return `${t('recycleBin.notesRoot')} / ${row.notebook}`
  }
  return t('recycleBin.notesRoot')
}

function formatDeletedAt(value) {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

function formatWordCount(count) {
  const value = Number.isFinite(count) ? count : 0
  return t('recycleBin.wordCountValue', { count: value.toLocaleString() })
}

async function loadTrash() {
  if (!props.bookName) return
  try {
    trashItems.value = (await window.electron.loadTrash(props.bookName)) || []
  } catch (error) {
    console.error('加载回收站失败:', error)
    ElMessage.error(t('recycleBin.loadFailed'))
  }
}

function open() {
  visible.value = true
}

async function handleRestore(row) {
  restoring.value = true
  try {
    const result = await window.electron.restoreTrashItem(props.bookName, row.id)
    if (result?.conflict) {
      pendingRestoreItem.value = row
      conflictStrategy.value = 'overwrite'
      conflictNewName.value = `${row.name}${t('recycleBin.restoredSuffix')}`
      conflictMessage.value = t('recycleBin.conflictMessage', { name: row.name })
      conflictVisible.value = true
      return
    }
    if (result?.success) {
      ElMessage.success(t('recycleBin.restoreSuccess'))
      await loadTrash()
      emit('restored', result)
    } else {
      ElMessage.error(result?.message || t('recycleBin.restoreFailed'))
    }
  } catch {
    ElMessage.error(t('recycleBin.restoreFailed'))
  } finally {
    restoring.value = false
  }
}

async function confirmConflictRestore() {
  const row = pendingRestoreItem.value
  if (!row) return

  if (conflictStrategy.value === 'rename') {
    const trimmed = conflictNewName.value.trim()
    if (!trimmed) {
      ElMessage.warning(t('recycleBin.renameRequired'))
      return
    }
  }

  restoring.value = true
  try {
    const payload = { conflictStrategy: conflictStrategy.value }
    if (conflictStrategy.value === 'rename') {
      payload.newName = conflictNewName.value.trim()
    }
    const result = await window.electron.restoreTrashItem(props.bookName, row.id, payload)
    if (result?.success) {
      ElMessage.success(t('recycleBin.restoreSuccess'))
      conflictVisible.value = false
      pendingRestoreItem.value = null
      await loadTrash()
      emit('restored', result)
    } else {
      ElMessage.error(result?.message || t('recycleBin.restoreFailed'))
    }
  } catch {
    ElMessage.error(t('recycleBin.restoreFailed'))
  } finally {
    restoring.value = false
  }
}

async function handlePermanentDelete(row) {
  try {
    await ElMessageBox.confirm(
      t('recycleBin.deletePermanentlyConfirm', { name: row.name }),
      t('recycleBin.deletePermanentlyTitle'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    const result = await window.electron.deleteTrashItem(props.bookName, row.id)
    if (result?.success) {
      ElMessage.success(t('recycleBin.deletePermanentlySuccess'))
      await loadTrash()
    } else {
      ElMessage.error(result?.message || t('recycleBin.deletePermanentlyFailed'))
    }
  } catch {
    // 用户取消
  }
}

async function handleClearTrash() {
  try {
    await ElMessageBox.confirm(t('recycleBin.clearAllConfirm'), t('recycleBin.clearAllTitle'), {
      confirmButtonText: t('recycleBin.clearAll'),
      cancelButtonText: t('common.cancel'),
      type: 'warning'
    })
    const result = await window.electron.clearTrash(props.bookName)
    if (result?.success) {
      ElMessage.success(t('recycleBin.clearAllSuccess'))
      trashItems.value = []
    } else {
      ElMessage.error(result?.message || t('recycleBin.clearAllFailed'))
    }
  } catch {
    // 用户取消
  }
}

defineExpose({ open })
</script>

<style lang="scss" scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.conflict-message {
  margin: 0 0 16px;
  color: var(--text-base);
  line-height: 1.6;
}

.conflict-strategy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.conflict-rename-input {
  margin-top: 12px;
}
</style>
