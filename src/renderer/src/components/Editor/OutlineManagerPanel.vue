<template>
  <div class="outline-manager-panel" :class="{ 'is-compact': props.compact }">
    <div class="outline-layout">
      <div class="outline-tree-panel">
        <template v-if="props.compact">
          <div class="outline-tree-panel-header">
            <div class="panel-title">{{ t('outlineManager.outlineDirectory') }}</div>
            <el-tooltip :content="t('outlineManager.addOutline')" placement="bottom">
              <el-button
                class="outline-tree-add-btn"
                type="primary"
                text
                circle
                size="small"
                :icon="Plus"
                @click="openCreateDialog"
              />
            </el-tooltip>
          </div>
        </template>
        <div v-else class="panel-title">{{ t('outlineManager.outlineDirectory') }}</div>
        <el-tree
          ref="treeRef"
          class="outline-tree"
          :data="outlineTree"
          node-key="id"
          :props="treeProps"
          :indent="props.compact ? 12 : 18"
          :current-node-key="selectedNodeId"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        />
      </div>

      <div class="outline-content-panel">
        <div class="content-panel-header">
          <template v-if="props.compact">
            <div class="content-panel-title-row">
              <div class="panel-title">{{ t('outlineManager.outlineContent') }}</div>
              <el-tooltip :content="t('outlineManager.switchToLarge')" placement="bottom">
                <el-button
                  class="outline-fullscreen-btn"
                  type="primary"
                  text
                  circle
                  size="small"
                  :icon="FullScreen"
                  @click="handleOpenOutlineFullPage"
                />
              </el-tooltip>
            </div>
          </template>
          <div v-else class="panel-title">{{ t('outlineManager.outlineContent') }}</div>
          <div class="header-right-actions">
            <!-- 大屏：三个 AI 操作平铺；小屏嵌入：合并为下拉节省宽度 -->
            <template v-if="props.compact">
              <el-dropdown
                trigger="click"
                class="outline-ai-dropdown"
                @command="handleAiMenuCommand"
              >
                <el-button size="small" type="success">
                  {{ t('outlineManager.aiActionsMenu') }}
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="refine" :disabled="!hasSelectedContent">
                      {{ t('outlineManager.aiRefine') }}
                    </el-dropdown-item>
                    <el-dropdown-item command="split" :disabled="!hasSelectedContent">
                      {{ t('outlineManager.aiSplit') }}
                    </el-dropdown-item>
                    <el-dropdown-item
                      command="generate-chapter"
                      divided
                      :disabled="!canGenerateChapterFromOutline"
                    >
                      {{ t('outlineManager.aiGenerateChapter') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <el-button
                size="small"
                type="success"
                :disabled="!hasSelectedContent"
                @click="openAiWorkbench('refine')"
              >
                {{ t('outlineManager.aiRefine') }}
              </el-button>
              <el-button
                size="small"
                type="success"
                plain
                :disabled="!hasSelectedContent"
                @click="openAiWorkbench('split')"
              >
                {{ t('outlineManager.aiSplit') }}
              </el-button>
              <el-button
                size="small"
                type="warning"
                plain
                :disabled="!canGenerateChapterFromOutline"
                @click="openGenerateChapterDialog"
              >
                {{ t('outlineManager.aiGenerateChapter') }}
              </el-button>
            </template>
            <span class="outline-toolbar-group outline-toolbar-save-delete">
              <el-button
                class="toolbar-save-btn"
                size="small"
                type="primary"
                :loading="isSaving"
                @click="handleConfirmSave"
              >
                {{ t('common.save') }}
              </el-button>
              <el-button
                v-if="canDeleteSelectedOutline"
                class="toolbar-delete-btn"
                size="small"
                type="danger"
                plain
                @click="handleDeleteSelectedOutline"
              >
                {{ t('common.delete') }}
              </el-button>
            </span>
            <template v-if="!props.compact">
              <span class="outline-toolbar-group outline-toolbar-legacy">
                <el-divider direction="vertical" class="outline-toolbar-divider" />
                <el-button
                  size="small"
                  type="primary"
                  plain
                  :loading="isLegacyPersisting"
                  :disabled="!props.bookName"
                  @click="handleSaveAsLegacyVersion"
                >
                  {{ t('outlineManager.saveAsLegacyVersion') }}
                </el-button>
                <el-button
                  size="small"
                  :disabled="!props.bookName"
                  @click="legacyDrawerVisible = true"
                >
                  {{ t('outlineManager.legacyVersions') }}
                </el-button>
              </span>
            </template>
          </div>
        </div>
        <div v-if="autoSaveError" class="footer-save-warning">
          {{ autoSaveError }}
        </div>
        <el-form class="outline-form" label-position="top" @submit.prevent>
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

    <el-dialog v-model="createDialogVisible" :title="t('outlineManager.addOutline')" width="420px">
      <el-form label-position="top" @submit.prevent="handleCreateOutline">
        <el-form-item :label="t('outlineManager.parentOutlineCategoryLabel')">
          <el-input :model-value="createOutlineParentCategoryDisplay" disabled />
        </el-form-item>
        <el-form-item :label="t('outlineManager.outlineName')">
          <el-input
            v-model="newOutlineTitle"
            :placeholder="t('outlineManager.outlineNamePlaceholder')"
            clearable
            @keydown.enter.prevent="handleCreateOutline"
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

    <el-dialog
      v-model="generateChapterDialogVisible"
      :title="t('outlineManager.generateChapterDialogTitle')"
      width="560px"
      :close-on-click-modal="!generateChapterLoading"
      :close-on-press-escape="!generateChapterLoading"
      :show-close="!generateChapterLoading"
    >
      <el-form label-position="top" @submit.prevent="handleGenerateChapterPreview">
        <el-form-item :label="t('outlineManager.targetVolumeLabel')">
          <el-select
            v-model="targetVolumeName"
            :disabled="generateChapterLoading"
            :placeholder="t('outlineManager.targetVolumePlaceholder')"
            style="width: 100%"
          >
            <el-option
              v-for="volume in chapterVolumeOptions"
              :key="volume"
              :label="volume"
              :value="volume"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('outlineManager.targetChapterNameLabel')">
          <el-input
            v-model="targetChapterName"
            :disabled="generateChapterLoading"
            :placeholder="t('outlineManager.targetChapterNamePlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('outlineManager.generateChapterRequirementLabel')">
          <el-input
            v-model="generateChapterRequirement"
            type="textarea"
            :rows="4"
            :disabled="generateChapterLoading"
            :placeholder="t('outlineManager.generateChapterRequirementPlaceholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="generateChapterLoading" @click="generateChapterDialogVisible = false">
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="generateChapterLoading"
          @click="handleGenerateChapterPreview"
        >
          {{ t('outlineManager.generateChapterPreview') }}
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="legacyDrawerVisible"
      :title="t('outlineManager.legacyVersionDrawerTitle')"
      size="440px"
      append-to-body
      class="legacy-versions-drawer"
    >
      <template v-if="!currentNodeLegacyVersions.length">
        <el-empty :description="t('outlineManager.legacyVersionEmpty')" />
      </template>
      <div v-else class="legacy-version-list">
        <div v-for="row in currentNodeLegacyVersions" :key="row.id" class="legacy-version-item">
          <header class="legacy-version-header">
            <span class="legacy-version-title-text">{{
              row.title?.trim() ? row.title : t('outlineManager.unnamedOutline')
            }}</span>
            <span class="legacy-version-time">{{ formatLegacySavedAt(row.savedAt) }}</span>
          </header>
          <main class="legacy-version-main">
            <div v-if="!legacyBodyHasContent(row.content)" class="legacy-version-empty-hint">
              {{ t('outlineManager.currentContentEmpty') }}
            </div>
            <div v-else class="legacy-version-main-text">
              {{ formatLegacyBodyDisplay(row.content) }}
            </div>
          </main>
          <footer class="legacy-version-footer">
            <el-button size="small" type="primary" link @click="applyLegacyVersionRecord(row)">
              {{ t('outlineManager.applyLegacyVersion') }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              link
              :loading="deletingLegacyVersionId === row.id"
              @click="confirmDeleteLegacyVersionRecord(row)"
            >
              {{ t('outlineManager.deleteLegacyVersion') }}
            </el-button>
          </footer>
        </div>
      </div>
    </el-drawer>

    <el-dialog
      v-model="generateChapterResultDialogVisible"
      :title="t('outlineManager.generateChapterResultTitle')"
      width="860px"
      :close-on-click-modal="!chapterUpsertLoading"
      :close-on-press-escape="!chapterUpsertLoading"
      :show-close="!chapterUpsertLoading"
    >
      <el-input
        v-model="generatedChapterContent"
        type="textarea"
        :rows="18"
        :disabled="chapterUpsertLoading"
        :placeholder="t('outlineManager.generateChapterResultPlaceholder')"
      />
      <template #footer>
        <el-button :disabled="chapterUpsertLoading" @click="copyGeneratedChapterContent">
          {{ t('outlineManager.copyContent') }}
        </el-button>
        <el-button
          :disabled="chapterUpsertLoading"
          @click="generateChapterResultDialogVisible = false"
        >
          {{ t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="chapterUpsertLoading"
          @click="confirmCreateOrOverwriteChapter"
        >
          {{ t('outlineManager.confirmCreateChapter') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, FullScreen, Plus } from '@element-plus/icons-vue'
import { genId } from '@renderer/utils/utils'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  setOutlineDisplayMode,
  OUTLINE_DISPLAY_MODE_LARGE
} from '@renderer/composables/useOutlineDisplayMode'
import OutlineAiWorkbenchDialog from './OutlineAiWorkbenchDialog.vue'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  },
  /** 编辑器小屏嵌入：收窄大纲目录与整体留白 */
  compact: {
    type: Boolean,
    default: false
  }
})
const { t } = useI18n()
const router = useRouter()

const ROOT_ID = 'outline-root'

/** 每个大纲节点最多保留的旧版条数（超出则丢弃更早的快照） */
const MAX_OUTLINE_LEGACY_VERSIONS = 50

const createDialogVisible = ref(false)
const newOutlineTitle = ref('')
const selectedNodeId = ref(ROOT_ID)
const isLoadingOutline = ref(false)
const isSaving = ref(false)
const autoSaveError = ref('')
const generateChapterDialogVisible = ref(false)
const generateChapterResultDialogVisible = ref(false)
const generateChapterLoading = ref(false)
const chapterUpsertLoading = ref(false)
const chapterVolumeOptions = ref([])
const targetVolumeName = ref('')
const targetChapterName = ref('')
const generateChapterRequirement = ref('')
const generatedChapterContent = ref('')

/** 与磁盘 outlines.json 中 `nodeVersions` 字段对应：nodeId -> 旧版列表 */
const outlineNodeVersions = ref({})
const legacyDrawerVisible = ref(false)
const isLegacyPersisting = ref(false)
const deletingLegacyVersionId = ref('')

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
const canGenerateChapterFromOutline = computed(
  () => hasSelectedContent.value && !isRootSelected.value
)

const createOutlineParentCategoryDisplay = computed(() => {
  const raw = String(selectedNode.value?.title || '').trim()
  return raw || t('outlineManager.unnamedOutline')
})

/** 当前选中节点对应的旧版列表（按保存时间降序） */
const currentNodeLegacyVersions = computed(() => {
  const list = outlineNodeVersions.value[selectedNodeId.value]
  if (!Array.isArray(list) || !list.length) {
    return []
  }
  return [...list].sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')))
})

function normalizeOutlineTree(rawData) {
  const children = Array.isArray(rawData?.children) ? rawData.children : []
  return [
    {
      id: ROOT_ID,
      title: t('outlineManager.rootTitle'),
      content: typeof rawData?.content === 'string' ? rawData.content : '',
      children
    }
  ]
}

/**
 * 将磁盘上的 nodeVersions 规范为安全结构（忽略非法项）
 * @param {unknown} raw
 * @returns {Record<string, Array<{ id: string, savedAt: string, title: string, content: string }>>}
 */
function normalizeNodeVersionsFromFile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  /** @type {Record<string, Array<{ id: string, savedAt: string, title: string, content: string }>>} */
  const out = {}
  for (const [nodeId, arr] of Object.entries(raw)) {
    if (typeof nodeId !== 'string' || !nodeId || !Array.isArray(arr)) {
      continue
    }
    const normalized = arr
      .filter((item) => item && typeof item.id === 'string' && item.id && item.savedAt)
      .map((item) => ({
        id: item.id,
        savedAt: String(item.savedAt),
        title: typeof item.title === 'string' ? item.title : '',
        content: typeof item.content === 'string' ? item.content : ''
      }))
    if (normalized.length) {
      out[nodeId] = normalized
    }
  }
  return out
}

/**
 * 收集当前大纲树中所有节点 id，用于保存前剔除已删除节点残留的旧版桶
 * @param {unknown[]} nodes
 * @param {Set<string>} acc
 */
function collectOutlineNodeIds(nodes, acc = new Set()) {
  for (const node of nodes) {
    if (node?.id) {
      acc.add(node.id)
    }
    if (Array.isArray(node?.children) && node.children.length) {
      collectOutlineNodeIds(node.children, acc)
    }
  }
  return acc
}

/**
 * 仅保留仍存在于大纲树中的 nodeId，避免 outlines.json 无限堆积
 * @param {Record<string, unknown[]>} versions
 * @param {unknown[]} tree
 */
function trimOrphanNodeVersions(versions, tree) {
  const validIds = collectOutlineNodeIds(tree)
  /** @type {typeof versions} */
  const out = {}
  for (const [k, v] of Object.entries(versions)) {
    if (validIds.has(k) && Array.isArray(v)) {
      out[k] = v
    }
  }
  return out
}

function formatLegacySavedAt(iso) {
  const d = new Date(String(iso || ''))
  if (Number.isNaN(d.getTime())) {
    return String(iso || '')
  }
  return d.toLocaleString()
}

/** 旧版抽屉：正文完整展示（换行保留），由外层容器滚动 */
function normalizeLegacyNewlines(text) {
  return String(text ?? '').replace(/\r\n/g, '\n')
}

function legacyBodyHasContent(text) {
  return Boolean(normalizeLegacyNewlines(text).trim())
}

function formatLegacyBodyDisplay(text) {
  return normalizeLegacyNewlines(text)
}

async function loadOutlineData() {
  if (!props.bookName) return
  isLoadingOutline.value = true
  try {
    const parsed = await window.electron.readOutlines(props.bookName)
    if (!parsed) {
      outlineTree.value = normalizeOutlineTree(null)
      outlineNodeVersions.value = {}
      return
    }
    outlineTree.value = normalizeOutlineTree(parsed)
    outlineNodeVersions.value = normalizeNodeVersionsFromFile(parsed.nodeVersions)
  } catch (err) {
    console.error('加载大纲失败:', err)
    outlineTree.value = normalizeOutlineTree(null)
    outlineNodeVersions.value = {}
  } finally {
    isLoadingOutline.value = false
  }
}

async function saveOutlineData() {
  if (!props.bookName) return
  try {
    const root = outlineTree.value[0]
    const plainChildren = JSON.parse(JSON.stringify(toRaw(root?.children ?? [])))
    const trimmed = trimOrphanNodeVersions(outlineNodeVersions.value, outlineTree.value)
    /** 脱离 Vue Proxy，否则 IPC structuredClone 会报 DataCloneError */
    const plainVersions = JSON.parse(JSON.stringify(trimmed))
    outlineNodeVersions.value = plainVersions

    const payload = {
      content: String(root?.content ?? ''),
      children: plainChildren,
      nodeVersions: plainVersions
    }
    const result = await window.electron.writeOutlines(
      props.bookName,
      JSON.parse(JSON.stringify(payload))
    )
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

/**
 * 仅在此处追加旧版快照；编辑大纲时的自动保存不会新增旧版条目，只会把已有 nodeVersions 一并写盘。
 */
async function handleSaveAsLegacyVersion() {
  if (!props.bookName) return
  const node = selectedNode.value
  const nodeId = selectedNodeId.value
  if (!node || !nodeId) {
    return
  }

  isLegacyPersisting.value = true
  try {
    const newRecord = {
      id: genId(),
      savedAt: new Date().toISOString(),
      title: String(node.title ?? ''),
      content: String(node.content ?? '')
    }
    const prev = outlineNodeVersions.value[nodeId] ?? []
    const merged = [newRecord, ...prev]
    merged.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
    outlineNodeVersions.value = {
      ...outlineNodeVersions.value,
      [nodeId]: merged.slice(0, MAX_OUTLINE_LEGACY_VERSIONS)
    }
    await saveOutlineData()
    ElMessage.success(t('outlineManager.saveAsLegacyVersionSuccess'))
  } catch {
    ElMessage.error(t('outlineManager.saveAsLegacyVersionFailed'))
  } finally {
    isLegacyPersisting.value = false
  }
}

function applyLegacyVersionRecord(record) {
  const node = findNodeById(outlineTree.value, selectedNodeId.value)
  if (!node || !record) {
    return
  }
  if (node.id !== ROOT_ID) {
    node.title = String(record.title ?? '')
  }
  node.content = String(record.content ?? '')
  ElMessage.success(t('outlineManager.applyLegacyVersionSuccess'))
}

async function confirmDeleteLegacyVersionRecord(record) {
  if (!record?.id || !props.bookName) return
  const nodeId = selectedNodeId.value
  try {
    await ElMessageBox.confirm(
      t('outlineManager.legacyVersionDeleteConfirm'),
      t('outlineManager.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  deletingLegacyVersionId.value = record.id
  try {
    const list = (outlineNodeVersions.value[nodeId] ?? []).filter((v) => v.id !== record.id)
    const next = { ...outlineNodeVersions.value }
    if (list.length) {
      next[nodeId] = list
    } else {
      delete next[nodeId]
    }
    outlineNodeVersions.value = next
    await saveOutlineData()
    ElMessage.success(t('outlineManager.deleteLegacyVersionSuccess'))
  } catch {
    ElMessage.error(t('outlineManager.saveFailed'))
  } finally {
    deletingLegacyVersionId.value = ''
  }
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

/** 大纲内容区：合并后的 AI 下拉菜单 */
function handleAiMenuCommand(command) {
  if (command === 'refine') {
    openAiWorkbench('refine')
  } else if (command === 'split') {
    openAiWorkbench('split')
  } else if (command === 'generate-chapter') {
    void openGenerateChapterDialog()
  }
}

/** 小屏：全屏按钮 — 切换为大屏大纲页并持久化模式 */
async function handleOpenOutlineFullPage() {
  const name = String(props.bookName || '').trim()
  if (!name) return
  await setOutlineDisplayMode(name, OUTLINE_DISPLAY_MODE_LARGE)
  router.push({
    path: '/outline-manager',
    query: { name }
  })
}

async function loadVolumeOptions() {
  if (!props.bookName || !window.electron?.loadChapters) {
    chapterVolumeOptions.value = []
    return
  }
  try {
    const chaptersTree = await window.electron.loadChapters(props.bookName)
    const volumes = Array.isArray(chaptersTree)
      ? chaptersTree
          .filter((item) => item?.type === 'volume' && item?.name)
          .map((item) => String(item.name).trim())
          .filter(Boolean)
      : []
    chapterVolumeOptions.value = volumes
  } catch (error) {
    console.error('加载卷列表失败:', error)
    chapterVolumeOptions.value = []
  }
}

async function openGenerateChapterDialog() {
  if (!canGenerateChapterFromOutline.value) return
  await loadVolumeOptions()
  if (!chapterVolumeOptions.value.length) {
    ElMessage.warning(t('outlineManager.targetVolumeEmpty'))
    return
  }
  targetVolumeName.value = chapterVolumeOptions.value[0]
  targetChapterName.value = String(selectedNode.value?.title || '').trim()
  generateChapterRequirement.value = ''
  generatedChapterContent.value = ''
  generateChapterDialogVisible.value = true
}

const PREV_CHAPTER_TAIL_MAX = 2800
async function loadPreviousChapterExcerptForAi() {
  const bookName = String(props.bookName || '').trim()
  const volumeName = String(targetVolumeName.value || '').trim()
  const targetName = String(targetChapterName.value || '').trim()
  if (!bookName || !volumeName || !targetName) return ''
  if (!window.electron?.loadChapters || !window.electron?.readChapter) return ''
  try {
    const tree = await window.electron.loadChapters(bookName)
    const vol = Array.isArray(tree)
      ? tree.find((v) => v?.type === 'volume' && String(v.name).trim() === volumeName)
      : null
    const list = (vol?.children || []).filter((c) => c?.type === 'chapter' && c?.name)
    if (list.length < 2) return ''
    const idx = list.findIndex((c) => String(c.name).trim() === targetName)
    if (idx <= 0) return ''
    const prev = list[idx - 1]
    const prevName = prev?.name != null ? String(prev.name).trim() : ''
    if (!prevName) return ''
    const res = await window.electron.readChapter(bookName, volumeName, prevName)
    if (!res?.success || res.content == null) return ''
    let text = String(res.content).trim().replace(/\r\n/g, '\n')
    if (!text) return ''
    if (text.length > PREV_CHAPTER_TAIL_MAX) {
      text = `…\n${text.slice(-PREV_CHAPTER_TAIL_MAX)}`
    }
    return text
  } catch {
    return ''
  }
}

async function handleGenerateChapterPreview() {
  const outlineContent = String(selectedNode.value?.content || '').trim()
  if (!outlineContent) {
    ElMessage.warning(t('outlineManager.cannotGenerateChapterEmpty'))
    return
  }
  if (!targetVolumeName.value) {
    ElMessage.warning(t('outlineManager.targetVolumeRequired'))
    return
  }
  const chapterName = String(targetChapterName.value || '').trim()
  if (!chapterName) {
    ElMessage.warning(t('outlineManager.targetChapterNameRequired'))
    return
  }
  if (!window.electron?.generateChapterFromOutline) {
    ElMessage.error(t('outlineManager.aiUnsupported'))
    return
  }

  generateChapterLoading.value = true
  try {
    let targetWords = 2000
    if (window.electron?.getChapterSettings) {
      const settingsRes = await window.electron.getChapterSettings(props.bookName)
      targetWords = Number(settingsRes?.targetWords) || targetWords
    }

    const previousChapterExcerpt = await loadPreviousChapterExcerptForAi()
    const result = await window.electron.generateChapterFromOutline({
      bookName: String(props.bookName || '').trim(),
      outlineTitle: String(selectedNode.value?.title || '').trim(),
      outlineContent,
      userRequirement: String(generateChapterRequirement.value || '').trim(),
      targetWords,
      previousChapterExcerpt
    })
    if (!result?.success) {
      throw new Error(result?.message || t('outlineManager.generateChapterFailed'))
    }
    const content = String(result.content || '').trim()
    if (!content) {
      throw new Error(t('outlineManager.aiEmptyResult'))
    }
    generatedChapterContent.value = content
    generateChapterDialogVisible.value = false
    generateChapterResultDialogVisible.value = true
  } catch (error) {
    ElMessage.error(error?.message || t('outlineManager.generateChapterFailed'))
  } finally {
    generateChapterLoading.value = false
  }
}

async function copyGeneratedChapterContent() {
  if (!generatedChapterContent.value) return
  try {
    await navigator.clipboard.writeText(generatedChapterContent.value)
    ElMessage.success(t('outlineManager.copiedToClipboard'))
  } catch {
    ElMessage.error(t('outlineManager.copyFailed'))
  }
}

async function confirmCreateOrOverwriteChapter() {
  const chapterName = String(targetChapterName.value || '').trim()
  const content = String(generatedChapterContent.value || '').trim()
  if (!targetVolumeName.value || !chapterName || !content) {
    ElMessage.warning(t('outlineManager.generateChapterParamsInvalid'))
    return
  }
  if (!window.electron?.checkChapterExists || !window.electron?.upsertChapter) {
    ElMessage.error(t('outlineManager.generateChapterUnsupported'))
    return
  }

  chapterUpsertLoading.value = true
  try {
    const checkRes = await window.electron.checkChapterExists({
      bookName: props.bookName,
      volumeName: targetVolumeName.value,
      chapterName
    })
    if (!checkRes?.success) {
      throw new Error(checkRes?.message || t('outlineManager.generateChapterCheckFailed'))
    }

    let overwrite = false
    if (checkRes.exists) {
      await ElMessageBox.confirm(
        t('outlineManager.chapterExistsOverwriteConfirm', { chapter: chapterName }),
        t('outlineManager.chapterExistsOverwriteTitle'),
        {
          confirmButtonText: t('outlineManager.confirmOverwrite'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      overwrite = true
    }

    const upsertRes = await window.electron.upsertChapter({
      bookName: props.bookName,
      volumeName: targetVolumeName.value,
      chapterName,
      content,
      overwrite
    })
    if (!upsertRes?.success) {
      throw new Error(upsertRes?.message || t('outlineManager.generateChapterWriteFailed'))
    }

    window.dispatchEvent(new CustomEvent('refresh-chapters-requested'))
    generateChapterResultDialogVisible.value = false
    ElMessage.success(
      overwrite
        ? t('outlineManager.chapterOverwriteSuccess', { chapter: chapterName })
        : t('outlineManager.chapterCreateSuccess', { chapter: chapterName })
    )
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error?.message || t('outlineManager.generateChapterWriteFailed'))
  } finally {
    chapterUpsertLoading.value = false
  }
}

async function setCurrentNode(nodeId) {
  selectedNodeId.value = nodeId
  await nextTick()
  treeRef.value?.setCurrentKey?.(nodeId)
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

  if (outlineNodeVersions.value[currentId]) {
    const nextVersions = { ...outlineNodeVersions.value }
    delete nextVersions[currentId]
    outlineNodeVersions.value = nextVersions
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

watch(
  () => props.bookName,
  async () => {
    if (!props.bookName) return
    await loadOutlineData()
    await setCurrentNode(ROOT_ID)
  }
)

watch(
  outlineTree,
  () => {
    scheduleSave()
  },
  { deep: true }
)

onMounted(async () => {
  if (!props.bookName) return
  await loadOutlineData()
  await setCurrentNode(ROOT_ID)
})

defineExpose({
  openCreateDialog
})
</script>

<style lang="scss" scoped>
.outline-manager-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.outline-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 18px;
  padding: 2px;
}

.outline-tree-panel {
  width: 260px;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 12px;
  background: var(--bg-soft);
  overflow: auto;
}

.outline-manager-panel.is-compact {
  .outline-layout {
    gap: 0;
    padding: 0;
  }

  .outline-tree-panel {
    width: 156px;
    padding: 8px 6px;
    border-radius: 0;
    border-right: none;
  }

  .outline-tree-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    margin-bottom: 8px;
    min-width: 0;

    .panel-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .outline-tree-add-btn {
    flex-shrink: 0;
  }

  .outline-content-panel {
    padding: 8px 10px;
    border-radius: 0;
    border-left: none;
  }

  /* 小屏：标题行（含全屏）+ 下一行操作按钮 */
  .content-panel-header {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    margin-bottom: 6px;
  }

  .content-panel-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .outline-fullscreen-btn {
    flex-shrink: 0;
  }

  .header-right-actions {
    margin-left: 0;
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 6px;

    .outline-ai-dropdown {
      flex: 1;
      min-width: 0;
    }

    :deep(.outline-ai-dropdown .el-button) {
      width: 100%;
      margin: 0;
      justify-content: center;
      padding-left: 6px;
      padding-right: 6px;
    }

    :deep(.outline-ai-dropdown .el-button span) {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .outline-toolbar-save-delete .toolbar-save-btn,
    .outline-toolbar-save-delete .toolbar-delete-btn {
      flex: 0 0 auto;
      margin: 0;
    }

    .outline-toolbar-save-delete .toolbar-save-btn {
      min-width: 52px;
    }
  }

  .panel-title {
    font-size: 12px;
    font-weight: 600;
  }

  .outline-tree {
    font-size: 12px;
  }

  .outline-tree-panel :deep(.el-tree-node__content) {
    height: 26px;
    font-size: 12px;
    padding-right: 4px;
    padding-left: 4px;
    gap: 0;
  }

  /* 小屏：去掉展开箭头占位（仍保留层级缩进，由 indent 控制） */
  .outline-tree-panel :deep(.el-tree-node__expand-icon) {
    display: none !important;
  }

  .outline-tree-panel :deep(.el-tree-node__label) {
    font-size: 12px;
    line-height: 1.25;
    padding-left: 0;
  }

  .outline-tree-panel :deep(.el-tree-node__label-wrapper) {
    padding-left: 0;
  }
}

.outline-content-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
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
  margin: 0;
}

.outline-tree {
  background: transparent;
}

.content-panel-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.header-right-actions .toolbar-save-btn,
.header-right-actions .toolbar-delete-btn {
  flex-shrink: 0;
}

.outline-toolbar-group {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
}

.outline-toolbar-legacy {
  flex-shrink: 0;
}

/* 独立大纲页：同样使用 small 按钮后略收紧行高 */
.header-right-actions :deep(.el-button--small) {
  padding-top: 5px;
  padding-bottom: 5px;
}

.footer-save-warning {
  font-size: 12px;
  color: var(--el-color-danger);
  margin-bottom: 12px;
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

.outline-toolbar-divider {
  margin: 0 4px;
  height: 20px;
  align-self: center;
}

.legacy-versions-drawer :deep(.el-drawer__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.legacy-version-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 8px;
  flex: 1;
  min-height: 0;
}

/* 上：标题 + 时间 | 中：正文滚动（撑满宽） | 下：操作 */
.legacy-version-item {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: min(300px, 40vh);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-soft, var(--el-fill-color-lighter));
  overflow: hidden;
}

.legacy-version-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  min-width: 0;
  padding: 12px 14px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 70%, transparent);
}

.legacy-version-title-text {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-base);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legacy-version-time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.02em;
  text-align: right;
}

.legacy-version-main {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 14px;
  -webkit-overflow-scrolling: touch;
}

.legacy-version-main-text {
  width: 100%;
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.legacy-version-empty-hint {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  font-style: italic;
  background: color-mix(in srgb, var(--el-fill-color) 65%, transparent);
  border: 1px dashed color-mix(in srgb, var(--border-color) 70%, transparent);
}

.legacy-version-footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 10px 14px 12px;
  border-top: 1px solid color-mix(in srgb, var(--border-color) 65%, transparent);
  background: color-mix(in srgb, var(--el-fill-color-lighter) 40%, transparent);
}
</style>
