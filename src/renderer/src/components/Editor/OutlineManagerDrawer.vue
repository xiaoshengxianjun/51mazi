<template>
  <el-drawer
    v-model="visible"
    :title="t('outlineManager.title')"
    size="70%"
    destroy-on-close
    class="outline-manager-drawer"
  >
    <div class="outline-layout">
      <div class="outline-tree-panel">
        <div class="panel-title">{{ t('outlineManager.outlineDirectory') }}</div>
        <el-tree
          ref="treeRef"
          class="outline-tree"
          :data="outlineTree"
          node-key="id"
          :props="treeProps"
          :current-node-key="selectedNodeId"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        />
      </div>

      <div class="outline-content-panel">
        <div class="panel-title">{{ t('outlineManager.outlineContent') }}</div>
        <el-form class="outline-form" label-position="top">
          <el-form-item>
            <el-input
              v-model="selectedNode.title"
              :placeholder="t('outlineManager.outlineTitlePlaceholder')"
              :disabled="isRootSelected"
            />
          </el-form-item>
          <el-form-item class="content-form-item">
            <el-input
              v-model="selectedNode.content"
              type="textarea"
              :placeholder="t('outlineManager.outlineContentPlaceholder')"
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <div class="footer-left-actions">
          <el-button type="primary" @click="openCreateDialog">
            {{ t('outlineManager.addOutline') }}
          </el-button>
          <el-button type="success" :disabled="!hasSelectedContent" @click="openAiWorkbench('refine')">
            {{ t('outlineManager.aiRefine') }}
          </el-button>
          <el-button
            type="success"
            plain
            :disabled="!hasSelectedContent"
            @click="openAiWorkbench('split')"
          >
            {{ t('outlineManager.aiSplit') }}
          </el-button>
        </div>
        <div v-if="autoSaveError" class="footer-save-warning">
          {{ autoSaveError }}
        </div>
        <div class="footer-right-actions">
          <el-button
            v-if="canDeleteSelectedOutline"
            type="danger"
            plain
            @click="handleDeleteSelectedOutline"
          >
            {{ t('common.delete') }}
          </el-button>
          <el-button @click="visible = false">
            {{ t('common.cancel') }}
          </el-button>
          <el-button type="primary" :loading="isSaving" @click="handleConfirmSave">
            {{ t('common.confirm') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-drawer>

  <el-dialog
    v-model="createDialogVisible"
    :title="t('outlineManager.addOutline')"
    width="420px"
  >
    <el-form label-position="top">
      <el-form-item :label="t('outlineManager.outlineName')">
        <el-input
          v-model="newOutlineTitle"
          :placeholder="t('outlineManager.outlineNamePlaceholder')"
          clearable
          @keyup.enter="handleCreateOutline"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createDialogVisible = false">
        {{ t('common.cancel') }}
      </el-button>
      <el-button type="primary" @click="handleCreateOutline">
        {{ t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>

  <OutlineAiWorkbenchDialog
    ref="outlineAiWorkbenchRef"
    :book-name="props.bookName"
    :selected-node="selectedNode"
    :selected-node-id="selectedNodeId"
    :apply-draft="applyOutlineAiDraft"
    :undo-draft="undoOutlineAiDraft"
  />
</template>

<script setup>
import { computed, nextTick, ref, toRaw, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { genId } from '@renderer/utils/utils'
import { useI18n } from 'vue-i18n'
import OutlineAiWorkbenchDialog from './OutlineAiWorkbenchDialog.vue'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  }
})
const { t } = useI18n()

const ROOT_ID = 'outline-root'

const visible = ref(false)
const createDialogVisible = ref(false)
const newOutlineTitle = ref('')
const selectedNodeId = ref(ROOT_ID)
const isLoadingOutline = ref(false)
const isSaving = ref(false)
const autoSaveError = ref('')

const treeRef = ref(null)
const outlineAiWorkbenchRef = ref(null)

const outlineTree = ref([
  {
    id: ROOT_ID,
    title: t('outlineManager.rootTitle'),
    content: '',
    children: []
  }
])

const treeProps = {
  children: 'children',
  label: 'title'
}

const selectedNode = computed(() => {
  const node = findNodeById(outlineTree.value, selectedNodeId.value)
  return node || outlineTree.value[0]
})

const isRootSelected = computed(() => selectedNodeId.value === ROOT_ID)
const canDeleteSelectedOutline = computed(
  () =>
    selectedNodeId.value !== ROOT_ID &&
    Boolean(findNodeById(outlineTree.value, selectedNodeId.value))
)
const hasSelectedContent = computed(() => Boolean(String(selectedNode.value?.content || '').trim()))

function normalizeOutlineTree(rawData) {
  const children = Array.isArray(rawData?.children) ? rawData.children : []
  return [
    {
      id: ROOT_ID,
      title: t('outlineManager.rootTitle'), // 总纲标题固定，不允许被存储数据覆盖
      content: typeof rawData?.content === 'string' ? rawData.content : '',
      children
    }
  ]
}

async function loadOutlineData() {
  if (!props.bookName) return
  isLoadingOutline.value = true
  try {
    const parsed = await window.electron.readOutlines(props.bookName)
    if (!parsed) {
      outlineTree.value = normalizeOutlineTree(null)
      return
    }
    outlineTree.value = normalizeOutlineTree(parsed)
  } catch (err) {
    console.error('加载大纲失败:', err)
    outlineTree.value = normalizeOutlineTree(null)
  } finally {
    isLoadingOutline.value = false
  }
}

async function saveOutlineData() {
  if (!props.bookName) return
  try {
    const root = outlineTree.value[0]
    // 通过 toRaw + JSON 序列化去除 Vue Proxy，避免 IPC clone 异常
    const plainChildren = JSON.parse(JSON.stringify(toRaw(root?.children ?? [])))
    const payload = {
      content: root?.content ?? '',
      children: plainChildren
    }
    const result = await window.electron.writeOutlines(props.bookName, payload)
    if (result && result.success === false) {
      throw new Error(result.message || t('outlineManager.saveFailed'))
    }
    autoSaveError.value = ''
    return true
  } catch (err) {
    console.error('保存大纲失败:', err)
    throw err
  }
}

let saveTimer = null
function scheduleSave() {
  if (isLoadingOutline.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await saveOutlineData()
    } catch {
      autoSaveError.value = t('outlineManager.autoSaveFailedVisible')
      ElMessage.error(autoSaveError.value)
    }
  }, 250)
}

async function handleConfirmSave(options = {}) {
  const { silentSuccess = false } = options
  if (!props.bookName) return
  // 用户显式点击“确定”时，取消防抖并立即落盘
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  isSaving.value = true
  try {
    await saveOutlineData()
    if (!silentSuccess) {
      ElMessage.success(t('outlineManager.saved'))
    }
    return true
  } catch {
    ElMessage.error(t('outlineManager.saveFailed'))
    return false
  } finally {
    isSaving.value = false
  }
}

async function open() {
  visible.value = true
  // 每次打开抽屉都按当前书籍加载
  await loadOutlineData()
  await setCurrentNode(ROOT_ID)
}

function handleNodeClick(node) {
  selectedNodeId.value = node.id
}

function openCreateDialog() {
  createDialogVisible.value = true
  newOutlineTitle.value = ''
}

function openAiWorkbench(mode) {
  outlineAiWorkbenchRef.value?.open(mode)
}

async function setCurrentNode(nodeId) {
  selectedNodeId.value = nodeId
  await nextTick()
  treeRef.value?.setCurrentKey?.(nodeId)
  // 滚动到当前节点，避免新增/拆分后节点不可见
  const treeEl = treeRef.value?.$el
  const currentEl = treeEl?.querySelector?.('.el-tree-node.is-current > .el-tree-node__content')
  currentEl?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
}

function cloneNodeSnapshot(node) {
  return {
    title: node?.title ?? '',
    content: node?.content ?? '',
    children: JSON.parse(JSON.stringify(toRaw(node?.children ?? [])))
  }
}

function restoreNodeSnapshot(node, snapshot) {
  if (!node || !snapshot) return
  if (node.id !== ROOT_ID) {
    node.title = snapshot.title ?? node.title
  }
  node.content = snapshot.content ?? ''
  node.children = JSON.parse(JSON.stringify(snapshot.children ?? []))
}

async function applyOutlineAiDraft(payload) {
  const node = findNodeById(outlineTree.value, payload?.nodeId)
  if (!node) {
    return {
      success: false,
      message: t('outlineManager.workbenchNodeNotFound')
    }
  }

  const undoSnapshot = {
    nodeId: payload.nodeId,
    snapshot: cloneNodeSnapshot(node)
  }

  if (payload.taskType === 'split') {
    const items = Array.isArray(payload.items) ? payload.items : []
    const createdNodes = items.map((item) => ({
      id: genId(),
      title: String(item.title || '').trim() || t('outlineManager.unnamedOutline'),
      content: String(item.content || '').trim(),
      children: []
    }))

    if (!node.children) {
      node.children = []
    }

    if (payload.action === 'replace-with-children') {
      node.content = ''
      node.children = createdNodes
    } else {
      node.children.push(...createdNodes)
    }

    if (createdNodes[0]) {
      await setCurrentNode(createdNodes[0].id)
    }
  } else {
    const content = String(payload.content || '').trim()
    if (payload.action === 'append') {
      node.content = [String(node.content || '').trim(), content].filter(Boolean).join('\n\n')
    } else if (payload.action === 'create-child') {
      if (!node.children) {
        node.children = []
      }
      const childNode = {
        id: genId(),
        title: `${String(node.title || t('outlineManager.rootTitle')).trim()} - AI`,
        content,
        children: []
      }
      node.children.push(childNode)
      await setCurrentNode(childNode.id)
    } else {
      node.content = content
    }
  }

  const saved = await handleConfirmSave({ silentSuccess: true })
  if (!saved) {
    restoreNodeSnapshot(node, undoSnapshot.snapshot)
    return {
      success: false,
      message: t('outlineManager.workbenchApplyFailed')
    }
  }

  return {
    success: true,
    undoSnapshot
  }
}

async function undoOutlineAiDraft(payload) {
  const node = findNodeById(outlineTree.value, payload?.nodeId)
  if (!node) {
    return {
      success: false,
      message: t('outlineManager.workbenchNodeNotFound')
    }
  }

  restoreNodeSnapshot(node, payload.snapshot)
  await setCurrentNode(payload.nodeId)
  const saved = await handleConfirmSave({ silentSuccess: true })
  if (!saved) {
    return {
      success: false,
      message: t('outlineManager.undoLastAiApplyFailed')
    }
  }

  return {
    success: true
  }
}

function removeNodeById(nodes, targetId) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.id === targetId) {
      nodes.splice(i, 1)
      return true
    }
    if (node.children?.length && removeNodeById(node.children, targetId)) {
      return true
    }
  }
  return false
}

function findParentNodeById(nodes, targetId, parent = null) {
  for (const node of nodes) {
    if (node.id === targetId) {
      return parent
    }
    if (node.children?.length) {
      const found = findParentNodeById(node.children, targetId, node)
      if (found !== undefined) {
        return found
      }
    }
  }
  return undefined
}

async function handleDeleteSelectedOutline() {
  if (!canDeleteSelectedOutline.value) return

  const current = selectedNode.value
  const currentId = selectedNodeId.value
  const parentNode = findParentNodeById(outlineTree.value, currentId)
  const nextSelectedId = parentNode?.id || ROOT_ID

  try {
    await ElMessageBox.confirm(
      t('outlineManager.deleteConfirmMessage', {
        title: current.title || t('outlineManager.unnamedOutline')
      }),
      t('outlineManager.deleteConfirmTitle'),
      {
        confirmButtonText: t('outlineManager.confirmDelete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return
  }

  const removed = removeNodeById(outlineTree.value, currentId)
  if (!removed) {
    ElMessage.error(t('outlineManager.deleteFailedNotFound'))
    return
  }

  await setCurrentNode(nextSelectedId)
  const saved = await handleConfirmSave({ silentSuccess: true })
  if (saved) {
    ElMessage.success(t('outlineManager.deleteSuccess'))
  }
}

function handleCreateOutline() {
  const title = newOutlineTitle.value.trim()
  if (!title) {
    ElMessage.warning(t('outlineManager.inputOutlineName'))
    return
  }

  const parentNode = selectedNode.value
  if (!parentNode.children) {
    parentNode.children = []
  }

  const childNode = {
    id: genId(),
    title,
    content: '',
    children: []
  }

  parentNode.children.push(childNode)
  setCurrentNode(childNode.id)
  createDialogVisible.value = false
  newOutlineTitle.value = ''
}

function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.children?.length) {
      const found = findNodeById(node.children, id)
      if (found) {
        return found
      }
    }
  }
  return null
}

defineExpose({
  open
})

watch(
  () => props.bookName,
  async () => {
    // 切换书籍时如果当前抽屉已打开，则重新加载
    if (visible.value) {
      await loadOutlineData()
      await setCurrentNode(ROOT_ID)
    }
  }
)

watch(
  outlineTree,
  () => {
    // outline 内容变化后落盘（带节流，避免每次输入都触发写入）
    scheduleSave()
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.outline-layout {
  display: flex;
  height: calc(100vh - 128px);
  gap: 18px;
  padding: 2px;
}

.outline-tree-panel {
  width: 260px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 12px;
  background: var(--bg-soft);
  overflow: auto;
}

.outline-content-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
  background: var(--bg-soft);
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 15px;
  color: var(--text-base);
  font-weight: 600;
  margin-bottom: 14px;
}

.outline-tree {
  background: transparent;
}

.drawer-footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-left-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.footer-right-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.footer-save-warning {
  font-size: 12px;
  color: var(--el-color-danger);
  flex: 1;
  min-width: 240px;
}

.split-result-list {
  max-height: 60vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.split-result-item {
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-soft);
}

.split-result-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-base);
  margin-bottom: 8px;
}

.split-result-fallback {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.split-quality-alert {
  margin-bottom: 10px;
}

.ai-current-outline {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-soft);
  padding: 10px 12px;
  margin-bottom: 14px;
}

.ai-current-outline-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-base);
  margin-bottom: 8px;
}

.ai-current-outline-preview :deep(.el-textarea__inner) {
  background: transparent;
}

.ai-radio-group {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.ai-radio-group :deep(.el-radio-button) {
  margin: 0;
}

.ai-radio-group :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px !important;
  border: 1px solid var(--border-color) !important;
  box-shadow: none !important;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.ai-radio-group :deep(.el-radio-button:not(:first-child) .el-radio-button__inner) {
  border-left: 1px solid var(--border-color) !important;
}

.ai-radio-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: var(--el-color-primary) !important;
  background: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
  color: var(--el-color-primary);
  font-weight: 600;
}

.ai-suggest-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.ai-suggest-text-content {
  color: var(--el-color-primary);
  font-weight: 600;
}

.outline-tree-panel :deep(.el-tree-node__expand-icon) {
  visibility: hidden;
  width: 0;
  margin-right: 0;
}

.outline-tree-panel :deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.outline-tree-panel :deep(.el-tree-node:focus > .el-tree-node__content),
.outline-tree-panel :deep(.el-tree-node__content:hover) {
  background: transparent;
}

.outline-tree-panel :deep(.el-tree-node__content:hover) {
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.outline-tree-panel :deep(.el-tree-node:focus > .el-tree-node__content) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 35%, transparent);
}

.outline-tree-panel
  :deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background: color-mix(in srgb, var(--el-color-primary) 14%, transparent);
  color: var(--el-color-primary);
  font-weight: 600;
}

.outline-content-panel :deep(.el-form-item) {
  margin-bottom: 18px;
}

.outline-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-form-item {
  flex: 1;
  margin-bottom: 0 !important;
}

.content-form-item :deep(.el-form-item__content) {
  height: 100%;
}

.content-form-item :deep(.el-textarea) {
  height: 100%;
}

.outline-content-panel :deep(.el-form-item__label) {
  color: var(--text-base);
  font-weight: 500;
  margin-bottom: 6px;
}

.outline-content-panel :deep(.el-textarea__inner) {
  height: 100%;
  resize: none;
}
</style>
