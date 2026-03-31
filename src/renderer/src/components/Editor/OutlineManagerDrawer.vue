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
          :disabled="aiBusy"
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
              :disabled="isRootSelected || aiBusy"
            />
          </el-form-item>
          <el-form-item class="content-form-item">
            <el-input
              v-model="selectedNode.content"
              type="textarea"
              :disabled="aiBusy"
              :placeholder="t('outlineManager.outlineContentPlaceholder')"
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <div class="footer-left-actions">
          <el-button type="primary" :disabled="aiBusy" @click="openCreateDialog">
            {{ t('outlineManager.addOutline') }}
          </el-button>
          <el-button
            type="success"
            :loading="aiRefineLoading"
            :disabled="aiBusy || !hasSelectedContent"
            @click="openAiRefineDialog"
          >
            {{ t('outlineManager.aiRefine') }}
          </el-button>
          <el-button
            type="success"
            plain
            :loading="aiSplitLoading"
            :disabled="aiBusy || !hasSelectedContent"
            @click="openAiSplitDialog"
          >
            {{ t('outlineManager.aiSplit') }}
          </el-button>
        </div>
        <div class="footer-right-actions">
          <el-button
            v-if="canDeleteSelectedOutline"
            type="danger"
            plain
            :disabled="aiBusy"
            @click="handleDeleteSelectedOutline"
          >
            {{ t('common.delete') }}
          </el-button>
          <el-button :disabled="aiBusy" @click="visible = false">
            {{ t('common.cancel') }}
          </el-button>
          <el-button
            type="primary"
            :loading="isSaving"
            :disabled="aiBusy"
            @click="handleConfirmSave"
          >
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
    :close-on-click-modal="!aiBusy"
    :close-on-press-escape="!aiBusy"
    :show-close="!aiBusy"
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
      <el-button :disabled="aiBusy" @click="createDialogVisible = false">
        {{ t('common.cancel') }}
      </el-button>
      <el-button type="primary" :disabled="aiBusy" @click="handleCreateOutline">
        {{ t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="aiRefineDialogVisible"
    :title="t('outlineManager.aiRefine')"
    width="800px"
    :close-on-click-modal="!aiBusy"
    :close-on-press-escape="!aiBusy"
    :show-close="!aiBusy"
    @close="resetAiRefineDialog"
  >
    <el-form label-position="top">
      <div class="ai-current-outline">
        <div class="ai-current-outline-title">
          {{
            t('outlineManager.currentSelected', {
              title: selectedNode.title || t('outlineManager.rootTitle')
            })
          }}
        </div>
        <el-input
          :model-value="aiSelectedContentPreview"
          type="textarea"
          :rows="4"
          readonly
          class="ai-current-outline-preview"
        />
      </div>
      <el-form-item :label="t('outlineManager.refineDirection')">
        <el-radio-group v-model="aiRefineMode" class="ai-radio-group" :disabled="aiBusy">
          <el-radio-button label="details">
            {{ t('outlineManager.refineModes.details') }}
          </el-radio-button>
          <el-radio-button label="conflict">
            {{ t('outlineManager.refineModes.conflict') }}
          </el-radio-button>
          <el-radio-button label="pacing">
            {{ t('outlineManager.refineModes.pacing') }}
          </el-radio-button>
          <el-radio-button label="world">
            {{ t('outlineManager.refineModes.world') }}
          </el-radio-button>
          <el-radio-button label="overall">
            {{ t('outlineManager.refineModes.overall') }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('outlineManager.refineRequirement')">
        <el-input
          v-model="aiRefineRequirement"
          type="textarea"
          :rows="6"
          :disabled="aiBusy"
          :placeholder="t('outlineManager.refineRequirementPlaceholder')"
        />
      </el-form-item>
      <div class="ai-suggest-text">
        {{ t('outlineManager.recommendedRequirement') }}:<span class="ai-suggest-text-content">
          {{ aiRefineSuggestedRequirement }}
        </span>
      </div>
    </el-form>
    <template #footer>
      <el-button :disabled="aiBusy" @click="aiRefineDialogVisible = false">
        {{ t('common.cancel') }}
      </el-button>
      <el-button type="primary" :loading="aiRefineLoading" @click="handleAiRefineSubmit">
        {{ t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="aiRefineResultDialogVisible"
    :title="t('outlineManager.aiRefineResult')"
    width="800px"
    :close-on-click-modal="!aiBusy"
    :close-on-press-escape="!aiBusy"
    :show-close="!aiBusy"
    @close="resetAiRefineResultDialog"
  >
    <el-input v-model="aiRefineResult" type="textarea" :rows="18" readonly />
    <template #footer>
      <el-button :disabled="aiBusy" @click="copyAiRefineResult">
        {{ t('outlineManager.copyContent') }}
      </el-button>
      <el-button :disabled="aiBusy" @click="aiRefineResultDialogVisible = false">
        {{ t('common.cancel') }}
      </el-button>
      <el-button type="primary" :disabled="aiBusy" @click="confirmAiRefineResult">
        {{ t('outlineManager.confirmFillBack') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="aiSplitDialogVisible"
    :title="t('outlineManager.aiSplit')"
    width="800px"
    :close-on-click-modal="!aiBusy"
    :close-on-press-escape="!aiBusy"
    :show-close="!aiBusy"
    @close="resetAiSplitDialog"
  >
    <el-form label-position="top">
      <div class="ai-current-outline">
        <div class="ai-current-outline-title">
          {{
            t('outlineManager.currentSelected', {
              title: selectedNode.title || t('outlineManager.rootTitle')
            })
          }}
        </div>
        <el-input
          :model-value="aiSelectedContentPreview"
          type="textarea"
          :rows="4"
          readonly
          class="ai-current-outline-preview"
        />
      </div>
      <el-form-item :label="t('outlineManager.splitStyle')">
        <el-radio-group v-model="aiSplitMode" class="ai-radio-group" :disabled="aiBusy">
          <el-radio-button label="plot">{{ t('outlineManager.splitModes.plot') }}</el-radio-button>
          <el-radio-button label="conflict">
            {{ t('outlineManager.splitModes.conflict') }}
          </el-radio-button>
          <el-radio-button label="timeline">
            {{ t('outlineManager.splitModes.timeline') }}
          </el-radio-button>
          <el-radio-button label="chapter">
            {{ t('outlineManager.splitModes.chapter') }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('outlineManager.splitCount')">
        <el-input-number v-model="aiSplitCount" :min="2" :max="12" :disabled="aiBusy" />
      </el-form-item>
      <el-form-item :label="t('outlineManager.splitRequirement')">
        <el-input
          v-model="aiSplitRequirement"
          type="textarea"
          :rows="6"
          :disabled="aiBusy"
          :placeholder="t('outlineManager.splitRequirementPlaceholder')"
        />
      </el-form-item>
      <div class="ai-suggest-text">
        {{ t('outlineManager.recommendedRequirement') }}:<span class="ai-suggest-text-content">
          {{ aiSplitSuggestedRequirement }}
        </span>
      </div>
    </el-form>
    <template #footer>
      <el-button :disabled="aiBusy" @click="aiSplitDialogVisible = false">
        {{ t('common.cancel') }}
      </el-button>
      <el-button type="primary" :loading="aiSplitLoading" @click="handleAiSplitSubmit">
        {{ t('common.confirm') }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="aiSplitResultDialogVisible"
    :title="t('outlineManager.aiSplitResult')"
    width="800px"
    :close-on-click-modal="!aiBusy"
    :close-on-press-escape="!aiBusy"
    :show-close="!aiBusy"
    @close="resetAiSplitResultDialog"
  >
    <el-alert
      v-if="aiSplitQualityError"
      type="warning"
      :closable="false"
      show-icon
      :title="aiSplitQualityError"
      class="split-quality-alert"
    />
    <div v-if="aiSplitItems.length" class="split-result-list">
      <div v-for="(item, index) in aiSplitItems" :key="`split-${index}`" class="split-result-item">
        <div class="split-result-title">{{ item.title }}</div>
        <el-input :model-value="item.content" type="textarea" :rows="4" readonly />
      </div>
    </div>
    <div v-else class="split-result-fallback">
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        :title="t('outlineManager.splitParseFailed')"
      />
      <el-input v-model="aiSplitRawResult" type="textarea" :rows="12" readonly />
    </div>
    <template #footer>
      <el-button :disabled="aiBusy" @click="copyAiSplitResult">
        {{ t('outlineManager.copyContent') }}
      </el-button>
      <el-button :disabled="aiBusy" @click="aiSplitResultDialogVisible = false">
        {{ t('common.cancel') }}
      </el-button>
      <el-button
        type="primary"
        :disabled="aiBusy || !aiSplitItems.length || Boolean(aiSplitQualityError)"
        @click="confirmAiSplitResult"
      >
        {{ t('outlineManager.confirmCreate') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref, toRaw, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { genId } from '@renderer/utils/utils'
import { useI18n } from 'vue-i18n'

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
const aiRefineDialogVisible = ref(false)
const aiRefineRequirement = ref('')
const aiRefineResultDialogVisible = ref(false)
const aiRefineResult = ref('')
const aiRefineLoading = ref(false)
const aiRefineMode = ref('overall')
const aiSplitDialogVisible = ref(false)
const aiSplitCount = ref(3)
const aiSplitRequirement = ref('')
const aiSplitLoading = ref(false)
const aiSplitMode = ref('plot')
const aiSplitResultDialogVisible = ref(false)
const aiSplitItems = ref([])
const aiSplitRawResult = ref('')
const aiSplitQualityError = ref('')

const treeRef = ref(null)

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

const aiRefineSuggestedRequirement = computed(() => {
  const baseContent = String(selectedNode.value?.content || '').trim()
  const hasContent = baseContent.length > 0
  // 根据是否有内容给不同强度的推荐，避免空内容导致提示无意义
  const strength = hasContent
    ? t('outlineManager.refineStrengthWithContent')
    : t('outlineManager.refineStrengthWithoutContent')

  switch (aiRefineMode.value) {
    case 'details':
      return t('outlineManager.refineSuggestions.details', { strength })
    case 'conflict':
      return t('outlineManager.refineSuggestions.conflict', { strength })
    case 'pacing':
      return t('outlineManager.refineSuggestions.pacing', { strength })
    case 'world':
      return t('outlineManager.refineSuggestions.world', { strength })
    case 'overall':
    default:
      return t('outlineManager.refineSuggestions.overall', { strength })
  }
})

const aiSplitSuggestedRequirement = computed(() => {
  switch (aiSplitMode.value) {
    case 'conflict':
      return t('outlineManager.splitSuggestions.conflict')
    case 'timeline':
      return t('outlineManager.splitSuggestions.timeline')
    case 'chapter':
      return t('outlineManager.splitSuggestions.chapter')
    case 'plot':
    default:
      return t('outlineManager.splitSuggestions.plot')
  }
})

const aiSelectedContentPreview = computed(() => {
  const txt = String(selectedNode.value?.content || '')
  const trimmed = txt.trim()
  if (!trimmed) return t('outlineManager.currentContentEmpty')
  const max = 280
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max) + '...'
})
const hasSelectedContent = computed(() => Boolean(String(selectedNode.value?.content || '').trim()))
const aiBusy = computed(() => aiRefineLoading.value || aiSplitLoading.value)

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
      // 自动保存失败仅记录日志，避免频繁打断输入体验
    }
  }, 250)
}

async function handleConfirmSave(options = {}) {
  const { silentSuccess = false } = options
  if (aiBusy.value) return false
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
  if (aiBusy.value) return
  createDialogVisible.value = true
  newOutlineTitle.value = ''
}

function openAiRefineDialog() {
  if (aiBusy.value) return
  aiRefineDialogVisible.value = true
  aiRefineRequirement.value = ''
}

function openAiSplitDialog() {
  if (aiBusy.value) return
  aiSplitDialogVisible.value = true
  aiSplitCount.value = 3
  aiSplitRequirement.value = ''
}

function resetAiRefineDialog() {
  aiRefineRequirement.value = ''
}

function resetAiRefineResultDialog() {
  aiRefineResult.value = ''
}

function resetAiSplitDialog() {
  aiSplitCount.value = 3
  aiSplitRequirement.value = ''
}

function resetAiSplitResultDialog() {
  aiSplitItems.value = []
  aiSplitRawResult.value = ''
  aiSplitQualityError.value = ''
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

async function callAi(text) {
  if (!window.electron?.polishTextWithAI) {
    throw new Error(t('outlineManager.aiUnsupported'))
  }
  const result = await window.electron.polishTextWithAI(text)
  if (!result?.success) {
    throw new Error(result?.message || t('outlineManager.aiRequestFailed'))
  }
  return (result.content || '').trim()
}

async function handleAiRefineSubmit() {
  const current = selectedNode.value
  const originalContent = String(current?.content || '').trim()
  if (!originalContent) {
    ElMessage.warning(t('outlineManager.cannotRefineEmpty'))
    return
  }
  aiRefineLoading.value = true
  try {
    const additionalRequirement =
      aiRefineRequirement.value.trim() || aiRefineSuggestedRequirement.value
    const prompt = [
      '你是一名中文小说策划编辑，请在保持原意的前提下完善大纲内容。',
      '要求：',
      `- ${t('outlineManager.aiPromptOutlineTitle')}: ${current.title || t('outlineManager.unnamedOutline')}`,
      `- ${t('outlineManager.aiPromptUserRequirement')}: ${additionalRequirement || t('outlineManager.noExtraRequirement')}`,
      '- 输出仅返回完善后的正文内容，不要解释，不要加标题。',
      '',
      '原始大纲内容：',
      originalContent
    ].join('\n')
    const content = await callAi(prompt)
    if (!content) {
      throw new Error(t('outlineManager.aiEmptyResult'))
    }
    aiRefineResult.value = content
    aiRefineDialogVisible.value = false
    aiRefineResultDialogVisible.value = true
  } catch (err) {
    ElMessage.error(err?.message || t('outlineManager.aiRefineFailed'))
  } finally {
    aiRefineLoading.value = false
  }
}

async function copyAiRefineResult() {
  if (!aiRefineResult.value) return
  try {
    await navigator.clipboard.writeText(aiRefineResult.value)
    ElMessage.success(t('outlineManager.copiedToClipboard'))
  } catch {
    ElMessage.error(t('outlineManager.copyFailed'))
  }
}

async function confirmAiRefineResult() {
  if (!aiRefineResult.value) return
  selectedNode.value.content = aiRefineResult.value
  const saved = await handleConfirmSave()
  if (saved) {
    aiRefineResultDialogVisible.value = false
  }
}

function parseAiSplitOutput(text) {
  const source = String(text || '').trim()
  if (!source) return []
  const regex = /【段\d+：(.+?)】\s*([\s\S]*?)(?=\n\s*【段\d+：|$)/g
  const parsed = []
  let match = regex.exec(source)
  while (match) {
    const title = (match[1] || '').trim()
    const content = (match[2] || '').trim()
    if (title && content) {
      parsed.push({ title, content })
    }
    match = regex.exec(source)
  }
  return parsed
}

function validateAiSplitItems(items, expectedCount) {
  if (!Array.isArray(items) || !items.length) {
    return t('outlineManager.splitValidationEmpty')
  }
  if (items.length !== expectedCount) {
    return t('outlineManager.splitValidationCountMismatch', {
      actual: items.length,
      expected: expectedCount
    })
  }

  // 每段需具备“可独立写作”的最小信息量，避免只拆分不扩写
  const MIN_SEGMENT_LENGTH = 120
  const tooShortIndex = items.findIndex(
    (item) => String(item.content || '').trim().length < MIN_SEGMENT_LENGTH
  )
  if (tooShortIndex !== -1) {
    return t('outlineManager.splitValidationTooShort', {
      index: tooShortIndex + 1,
      min: MIN_SEGMENT_LENGTH
    })
  }

  return ''
}

async function handleAiSplitSubmit() {
  const current = selectedNode.value
  const originalContent = String(current?.content || '').trim()
  if (!originalContent) {
    ElMessage.warning(t('outlineManager.cannotSplitEmpty'))
    return
  }
  aiSplitLoading.value = true
  try {
    const additionalRequirement =
      aiSplitRequirement.value.trim() || aiSplitSuggestedRequirement.value
    const count = Number(aiSplitCount.value) || 3
    const prompt = [
      '你是一名中文小说策划编辑，请将用户提供的大纲内容拆分并扩写为多个“可独立写作”的子大纲。',
      '核心要求：',
      `1) 严格输出 ${count} 段，不能多也不能少。`,
      '2) 每段都必须是完整大纲单元，至少包含：该段目标、关键冲突、推进过程、阶段结果/悬念。',
      '3) 不是简单切分原文，要在原意上进行扩写补充，让每段都可直接用于章节策划。',
      '输出格式必须严格遵守：',
      '【段1：标题】',
      '内容',
      '',
      '【段2：标题】',
      '内容',
      '',
      `拆分段数：${count}`,
      `${t('outlineManager.aiPromptOutlineTitle')}：${current.title || t('outlineManager.unnamedOutline')}`,
      `${t('outlineManager.aiPromptSplitRequirement')}：${additionalRequirement || t('outlineManager.noExtraRequirement')}`,
      '不要输出格式说明，不要输出 JSON，不要输出其他无关内容。',
      '',
      '待拆分大纲内容：',
      originalContent
    ].join('\n')
    const content = await callAi(prompt)
    if (!content) {
      throw new Error(t('outlineManager.aiEmptyResult'))
    }
    aiSplitRawResult.value = content
    aiSplitItems.value = parseAiSplitOutput(content)
    aiSplitQualityError.value = validateAiSplitItems(aiSplitItems.value, count)
    if (aiSplitQualityError.value) {
      ElMessage.warning(aiSplitQualityError.value)
    }
    aiSplitDialogVisible.value = false
    aiSplitResultDialogVisible.value = true
  } catch (err) {
    ElMessage.error(err?.message || t('outlineManager.aiSplitFailed'))
  } finally {
    aiSplitLoading.value = false
  }
}

async function copyAiSplitResult() {
  const text = aiSplitItems.value.length
    ? aiSplitItems.value
        .map((item, idx) => `【段${idx + 1}：${item.title}】\n${item.content}`)
        .join('\n\n')
    : aiSplitRawResult.value
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(t('outlineManager.copiedToClipboard'))
  } catch {
    ElMessage.error(t('outlineManager.copyFailed'))
  }
}

async function confirmAiSplitResult() {
  if (!aiSplitItems.value.length) return
  const parentNode = selectedNode.value
  if (!parentNode.children) {
    parentNode.children = []
  }
  const createdNodes = aiSplitItems.value.map((item) => ({
    id: genId(),
    title: item.title,
    content: item.content,
    children: []
  }))
  parentNode.children.push(...createdNodes)
  await setCurrentNode(createdNodes[0].id)
  const saved = await handleConfirmSave()
  if (saved) {
    aiSplitResultDialogVisible.value = false
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
  if (aiBusy.value || !canDeleteSelectedOutline.value) return

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
  if (aiBusy.value) return
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
