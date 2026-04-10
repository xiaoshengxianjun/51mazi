<template>
  <el-dialog
    v-model="visible"
    title="灵感笔记"
    width="800px"
    :close-on-click-modal="false"
    @close="onClose"
  >
    <el-tabs v-model="activeTab" class="inspiration-tabs">
      <el-tab-pane label="记录灵感" name="create">
        <el-input
          v-model="content"
          type="textarea"
          :rows="10"
          placeholder="记录你的灵感..."
          resize="none"
          class="inspiration-input"
          @keydown.ctrl.enter="debouncedSave"
          @keydown.meta.enter="debouncedSave"
        />
        <div class="create-action">
          <el-button @click="visible = false">关闭</el-button>
          <el-button type="primary" :loading="saving" :disabled="!content.trim()" @click="debouncedSave">
            保存灵感
          </el-button>
        </div>
      </el-tab-pane>
      <el-tab-pane label="我的灵感" name="view">
        <div v-if="notes.length === 0" class="empty-state">
          <el-icon class="empty-icon"><EditPen /></el-icon>
          <div class="empty-text">暂无灵感记录</div>
          <div class="empty-hint">点击上方"记录灵感"开始你的创作</div>
        </div>
        <div v-else class="notes-list">
          <div
            v-for="note in notes"
            :key="note.id"
            class="note-card"
          >
            <template v-if="editingNote?.id === note.id">
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span class="card-time">{{ note.timestamp }}</span>
              </div>
              <el-input
                v-model="editContent"
                type="textarea"
                :rows="5"
                resize="none"
                class="edit-textarea"
              />
              <div class="card-actions edit-actions">
                <el-button size="small" @click="cancelEdit">取消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="handleUpdate">
                  保存
                </el-button>
              </div>
            </template>
            <template v-else>
              <div class="card-header">
                <el-icon><Clock /></el-icon>
                <span class="card-time">{{ note.timestamp }}</span>
                <div class="card-actions">
                  <el-button link type="primary" @click="startEdit(note)">
                    <el-icon><Edit /></el-icon>
                    修改
                  </el-button>
                  <el-button link type="danger" @click="confirmDelete(note)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-button>
                </div>
              </div>
              <div class="card-content">{{ note.content }}</div>
              <div class="card-footer">
                <span class="word-count">{{ note.content.length }} 字</span>
              </div>
            </template>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { debounce } from 'lodash'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen, Clock, Delete, Edit } from '@element-plus/icons-vue'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  }
})

const visible = ref(false)
const activeTab = ref('create')
const content = ref('')
const saving = ref(false)
const notes = ref([])
const editingNote = ref(null)
const editContent = ref('')

const open = () => {
  visible.value = true
  activeTab.value = 'create'
  content.value = ''
  editingNote.value = null
  loadNotes()
  window.electron.cleanupInspirationNotes(props.bookName)
}

const loadNotes = async () => {
  if (!props.bookName) return
  try {
    notes.value = await window.electron.loadInspirationNotes(props.bookName)
    notes.value.sort((a, b) => b.id - a.id)
  } catch (error) {
    console.error('加载灵感笔记失败:', error)
  }
}

const onClose = () => {
  content.value = ''
  editingNote.value = null
}

const startEdit = (note) => {
  editingNote.value = note
  editContent.value = note.content
}

const cancelEdit = () => {
  editingNote.value = null
  editContent.value = ''
}

const handleUpdate = async () => {
  if (!editingNote.value || !editContent.value.trim()) return

  saving.value = true
  try {
    const result = await window.electron.updateInspirationNote(
      props.bookName,
      editingNote.value.id,
      editContent.value
    )
    if (result.success) {
      ElMessage.success('修改成功')
      editingNote.value = null
      editContent.value = ''
      loadNotes()
    } else {
      ElMessage.error(result.message || '修改失败')
    }
  } catch (error) {
    console.error('修改灵感笔记失败:', error)
    ElMessage.error('修改失败')
  } finally {
    saving.value = false
  }
}

const doSave = async () => {
  if (!content.value.trim() || !props.bookName) {
    ElMessage.warning('请输入内容')
    return
  }

  saving.value = true
  try {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const result = await window.electron.saveInspirationNote(props.bookName, timestamp, content.value)
    if (result.success) {
      ElMessage.success('保存成功')
      content.value = ''
      loadNotes()
      activeTab.value = 'view'
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存灵感笔记失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const debouncedSave = debounce(doSave, 500)

const confirmDelete = async (note) => {
  try {
    await ElMessageBox.confirm('确定要删除这条灵感笔记吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const result = await window.electron.deleteInspirationNote(props.bookName, note.id)
    if (result.success) {
      ElMessage.success('删除成功')
      loadNotes()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

defineExpose({ open })
</script>

<style lang="scss">
.inspiration-tabs {
  .el-tabs__header {
    margin-bottom: 20px;
  }
  
  .el-tabs__item {
    font-size: 15px;
    
    &.is-active {
      font-weight: 600;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  
  .empty-icon {
    font-size: 64px;
    color: #dcdfe6;
    margin-bottom: 16px;
  }
  
  .empty-text {
    font-size: 16px;
    color: #909399;
    margin-bottom: 8px;
  }
  
  .empty-hint {
    font-size: 13px;
    color: #c0c4cc;
  }
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 450px;
  overflow-y: auto;
  padding: 4px;
}

.note-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  
  &:hover {
    border-color: #c0c4cc;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    color: #909399;
    font-size: 13px;
    
    .el-icon {
      font-size: 14px;
    }
    
    .card-time {
      flex: 1;
    }
    
    .card-actions {
      display: flex;
      gap: 8px;
      
      .el-button {
        padding: 4px 8px;
        font-size: 12px;
      }
    }
  }
  
  .card-content {
    color: #303133;
    font-size: 14px;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  .card-footer {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
    
    .word-count {
      font-size: 12px;
      color: #c0c4cc;
    }
  }
  
  .edit-textarea {
    margin-bottom: 12px;
  }
  
  .edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}

.create-action {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
</style>
