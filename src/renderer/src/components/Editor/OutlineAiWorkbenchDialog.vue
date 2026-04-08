<template>
  <el-dialog
    v-model="visible"
    :title="workbenchTitle"
    width="1180px"
    destroy-on-close
    class="outline-ai-workbench"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    :show-close="!loading"
  >
    <div class="workbench-layout">
      <aside class="history-panel">
        <div class="panel-heading">{{ t('outlineManager.workbenchHistory') }}</div>
        <div class="history-toolbar">
          <el-radio-group v-model="taskType" size="small" :disabled="loading">
            <el-radio-button label="refine">
              {{ t('outlineManager.aiRefine') }}
            </el-radio-button>
            <el-radio-button label="split">
              {{ t('outlineManager.aiSplit') }}
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="history-list">
          <el-empty
            v-if="!currentTaskVersions.length"
            :description="t('outlineManager.workbenchNoHistory')"
          />
          <button
            v-for="version in currentTaskVersions"
            :key="version.id"
            type="button"
            class="history-item"
            :class="{ active: version.id === selectedVersionId }"
            @click="selectVersion(version.id)"
          >
            <div class="history-item-header">
              <span class="history-item-title">
                {{ formatVersionLabel(version) }}
              </span>
              <span class="history-item-time">{{ formatDateTime(version.createdAt) }}</span>
            </div>
            <div class="history-item-meta">
              {{ formatVersionStatus(version) }}
            </div>
            <div class="history-item-instruction">
              {{ version.userInstruction || t('outlineManager.noExtraRequirement') }}
            </div>
          </button>
        </div>
      </aside>

      <div class="workbench-main">
        <div class="base-config-card">
          <div class="panel-heading">{{ t('outlineManager.workbenchTaskConfig') }}</div>
          <div class="current-outline">
            <div class="current-outline-title">
              {{
                t('outlineManager.currentSelected', {
                  title: currentNodeTitle
                })
              }}
            </div>
            <el-input :model-value="currentOutlinePreview" type="textarea" :rows="4" readonly />
          </div>

          <el-form label-position="top">
            <el-form-item :label="t('outlineManager.workbenchBaseSource')">
              <el-radio-group v-model="baseStrategy" :disabled="loading">
                <el-radio-button label="original">
                  {{ t('outlineManager.workbenchBaseOriginal') }}
                </el-radio-button>
                <el-radio-button label="latest-draft" :disabled="!canUseLatestDraft">
                  {{ t('outlineManager.workbenchBaseLatest') }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item
              v-if="taskType === 'refine'"
              :label="t('outlineManager.refineDirection')"
            >
              <el-radio-group v-model="refineMode" class="ai-radio-group" :disabled="loading">
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

            <template v-else>
              <el-form-item :label="t('outlineManager.splitStyle')">
                <el-radio-group v-model="splitMode" class="ai-radio-group" :disabled="loading">
                  <el-radio-button label="plot">
                    {{ t('outlineManager.splitModes.plot') }}
                  </el-radio-button>
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
                <el-input-number v-model="splitCount" :min="2" :max="12" :disabled="loading" />
              </el-form-item>
            </template>

            <el-form-item :label="t('outlineManager.workbenchPrompt')">
              <el-input
                v-model="instruction"
                type="textarea"
                :rows="4"
                :disabled="loading"
                :placeholder="t('outlineManager.workbenchPromptPlaceholder')"
              />
            </el-form-item>
          </el-form>

          <div class="suggested-text">
            {{ t('outlineManager.recommendedRequirement') }}:
            <span class="suggested-text-value">{{ suggestedRequirement }}</span>
          </div>
        </div>

        <div class="draft-grid">
          <section class="draft-panel">
            <div class="panel-heading">{{ t('outlineManager.workbenchBasePreview') }}</div>
            <el-input :model-value="baseContentPreview" type="textarea" :rows="12" readonly />
          </section>

          <section class="draft-panel">
            <div class="panel-heading">{{ t('outlineManager.workbenchDraftResult') }}</div>

            <template v-if="taskType === 'refine'">
              <el-input
                v-model="draftText"
                type="textarea"
                :rows="12"
                :disabled="loading"
                :placeholder="t('outlineManager.workbenchDraftPlaceholder')"
              />
            </template>

            <template v-else>
              <el-alert
                v-if="splitParseError"
                type="warning"
                show-icon
                :closable="false"
                class="split-alert"
                :title="splitParseError"
              />

              <div v-if="splitItems.length" class="split-item-list">
                <div
                  v-for="(item, index) in splitItems"
                  :key="`${selectedVersionId || 'draft'}-${index}`"
                  class="split-item-card"
                >
                  <el-input
                    v-model="item.title"
                    :placeholder="t('outlineManager.outlineTitlePlaceholder')"
                    :disabled="loading"
                    class="split-item-title"
                  />
                  <el-input
                    v-model="item.content"
                    type="textarea"
                    :rows="4"
                    :disabled="loading"
                    :placeholder="t('outlineManager.workbenchSplitContentPlaceholder')"
                  />
                </div>
              </div>

              <el-input
                v-else
                v-model="rawSplitDraft"
                type="textarea"
                :rows="12"
                :disabled="loading"
                :placeholder="t('outlineManager.workbenchSplitRawPlaceholder')"
              />
            </template>
          </section>
        </div>

        <div class="apply-config-card">
          <div class="panel-heading">{{ t('outlineManager.workbenchApplyStrategy') }}</div>
          <el-radio-group v-model="applyAction" :disabled="loading">
            <el-radio-button
              v-for="option in applyActionOptions"
              :key="option.value"
              :label="option.value"
            >
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>

          <el-alert
            v-if="sessionSaveError"
            type="error"
            :closable="false"
            :title="sessionSaveError"
            class="session-alert"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="workbench-footer">
        <div class="footer-left">
          <el-button :disabled="loading || !selectedVersion" @click="saveCurrentDraftEdits">
            {{ t('outlineManager.workbenchSaveDraft') }}
          </el-button>
          <el-button
            v-if="taskType === 'split' && !splitItems.length"
            :disabled="loading || !rawSplitDraft.trim()"
            @click="reparseSplitDraft"
          >
            {{ t('outlineManager.workbenchReparse') }}
          </el-button>
          <el-button :disabled="loading || !canUndoLastApply" @click="handleUndoLastApply">
            {{ t('outlineManager.undoLastAiApply') }}
          </el-button>
        </div>

        <div class="footer-right">
          <el-button :disabled="loading" @click="handleCopyDraft">
            {{ t('outlineManager.copyContent') }}
          </el-button>
          <el-button :disabled="loading" @click="visible = false">
            {{ t('common.cancel') }}
          </el-button>
          <el-button type="primary" :loading="loading" @click="handleGenerate">
            {{ generateButtonLabel }}
          </el-button>
          <el-button type="success" :disabled="loading || !canApplyCurrentDraft" @click="handleApplyDraft">
            {{ applyButtonLabel }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { genId } from '@renderer/utils/utils'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  },
  selectedNode: {
    type: Object,
    default: null
  },
  selectedNodeId: {
    type: String,
    default: ''
  },
  applyDraft: {
    type: Function,
    required: true
  },
  undoDraft: {
    type: Function,
    required: true
  }
})

const { t } = useI18n()

const visible = ref(false)
const loading = ref(false)
const sessionsLoading = ref(false)
const sessionSaveError = ref('')
const aiSessions = ref(createEmptySessionsPayload())

const taskType = ref('refine')
const baseStrategy = ref('original')
const refineMode = ref('overall')
const splitMode = ref('plot')
const splitCount = ref(3)
const instruction = ref('')
const applyAction = ref('replace')

const selectedVersionId = ref('')
const draftText = ref('')
const rawSplitDraft = ref('')
const splitItems = ref([])
const splitParseError = ref('')

let isHydrating = false

const currentNodeTitle = computed(
  () => String(props.selectedNode?.title || '').trim() || t('outlineManager.rootTitle')
)
const currentNodeContent = computed(() => String(props.selectedNode?.content || '').trim())
const currentOutlinePreview = computed(() => {
  if (currentNodeContent.value) return currentNodeContent.value
  return t('outlineManager.currentContentEmpty')
})

const currentNodeSession = computed(() => {
  const nodeId = props.selectedNodeId
  if (!nodeId) return null
  return aiSessions.value.nodes?.[nodeId] || null
})

const currentTaskVersions = computed(() => {
  const versions = currentNodeSession.value?.versions || []
  return versions
    .filter((version) => version.taskType === taskType.value)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const selectedVersion = computed(() => {
  return currentTaskVersions.value.find((version) => version.id === selectedVersionId.value) || null
})

const latestTaskVersion = computed(() => currentTaskVersions.value[0] || null)
const canUseLatestDraft = computed(() => Boolean(latestTaskVersion.value))
const canUndoLastApply = computed(() => Boolean(currentNodeSession.value?.lastAppliedSnapshot))

const workbenchTitle = computed(() =>
  taskType.value === 'split'
    ? t('outlineManager.aiWorkbenchSplitTitle')
    : t('outlineManager.aiWorkbenchRefineTitle')
)

const generateButtonLabel = computed(() => {
  if (baseStrategy.value === 'latest-draft' && canUseLatestDraft.value) {
    return t('outlineManager.workbenchContinueGenerate')
  }
  return t('outlineManager.workbenchGenerate')
})

const applyActionOptions = computed(() => {
  if (taskType.value === 'split') {
    return [
      {
        value: 'create-children',
        label: t('outlineManager.applyActions.createChildren')
      },
      {
        value: 'replace-with-children',
        label: t('outlineManager.applyActions.replaceWithChildren')
      },
      {
        value: 'save-only',
        label: t('outlineManager.applyActions.saveOnly')
      }
    ]
  }

  return [
    {
      value: 'replace',
      label: t('outlineManager.applyActions.replaceCurrent')
    },
    {
      value: 'append',
      label: t('outlineManager.applyActions.appendCurrent')
    },
    {
      value: 'create-child',
      label: t('outlineManager.applyActions.createChild')
    },
    {
      value: 'save-only',
      label: t('outlineManager.applyActions.saveOnly')
    }
  ]
})

const applyButtonLabel = computed(() =>
  applyAction.value === 'save-only'
    ? t('outlineManager.workbenchSaveOnly')
    : t('outlineManager.workbenchApplyDraft')
)

const suggestedRequirement = computed(() => {
  if (taskType.value === 'split') {
    switch (splitMode.value) {
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
  }

  const hasContent = currentNodeContent.value.length > 0
  const strength = hasContent
    ? t('outlineManager.refineStrengthWithContent')
    : t('outlineManager.refineStrengthWithoutContent')

  switch (refineMode.value) {
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

const baseContentPreview = computed(() => {
  if (baseStrategy.value === 'latest-draft') {
    const baseText = getBaseDraftContent()
    if (baseText) return baseText
  }
  return currentOutlinePreview.value
})

const canApplyCurrentDraft = computed(() => {
  if (taskType.value === 'split') {
    return Boolean(splitItems.value.length || rawSplitDraft.value.trim())
  }
  return Boolean(draftText.value.trim())
})

function createEmptySessionsPayload() {
  return {
    version: 1,
    nodes: {}
  }
}

function normalizeSessionsPayload(payload) {
  const normalized = createEmptySessionsPayload()
  if (!payload || typeof payload !== 'object') return normalized
  normalized.version = Number(payload.version) || 1
  normalized.nodes = payload.nodes && typeof payload.nodes === 'object' ? payload.nodes : {}
  return normalized
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value))
}

function ensureCurrentNodeSession() {
  const nodeId = props.selectedNodeId
  if (!nodeId) return null

  if (!aiSessions.value.nodes[nodeId]) {
    aiSessions.value.nodes[nodeId] = {
      sessionId: genId(),
      nodeId,
      lastTaskType: 'refine',
      latestDraftId: '',
      lastAppliedSnapshot: null,
      lastInstructions: {
        refine: '',
        split: ''
      },
      preferences: {
        baseStrategy: 'original',
        refineMode: 'overall',
        splitMode: 'plot',
        splitCount: 3,
        refineApplyAction: 'replace',
        splitApplyAction: 'create-children'
      },
      versions: []
    }
  }

  return aiSessions.value.nodes[nodeId]
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function formatVersionLabel(version) {
  if (!version) return ''
  const modeValue = version.taskMode
  if (version.taskType === 'split') {
    return (
      {
        plot: t('outlineManager.splitModes.plot'),
        conflict: t('outlineManager.splitModes.conflict'),
        timeline: t('outlineManager.splitModes.timeline'),
        chapter: t('outlineManager.splitModes.chapter')
      }[modeValue] || t('outlineManager.aiSplit')
    )
  }

  return (
    {
      details: t('outlineManager.refineModes.details'),
      conflict: t('outlineManager.refineModes.conflict'),
      pacing: t('outlineManager.refineModes.pacing'),
      world: t('outlineManager.refineModes.world'),
      overall: t('outlineManager.refineModes.overall')
    }[modeValue] || t('outlineManager.aiRefine')
  )
}

function formatVersionStatus(version) {
  if (!version) return ''
  if (version.status === 'applied') {
    return t('outlineManager.workbenchStatusApplied')
  }
  if (version.status === 'saved') {
    return t('outlineManager.workbenchStatusSaved')
  }
  if (version.parseError) {
    return t('outlineManager.workbenchStatusParseFailed')
  }
  return t('outlineManager.workbenchStatusDraft')
}

function stripCodeFence(text) {
  return String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

function extractJsonBlock(text) {
  const source = stripCodeFence(text)
  const firstObject = source.indexOf('{')
  const lastObject = source.lastIndexOf('}')
  if (firstObject !== -1 && lastObject > firstObject) {
    return source.slice(firstObject, lastObject + 1)
  }

  const firstArray = source.indexOf('[')
  const lastArray = source.lastIndexOf(']')
  if (firstArray !== -1 && lastArray > firstArray) {
    return source.slice(firstArray, lastArray + 1)
  }

  return source
}

function composeSplitItemContent(item) {
  const directContent = String(item?.content || '').trim()
  if (directContent) return directContent

  return [
    ['概述', item?.summary],
    ['目标', item?.goals],
    ['冲突', item?.conflict],
    ['推进', item?.progression],
    ['结果/悬念', item?.resultHint]
  ]
    .map(([label, value]) => [label, String(value || '').trim()])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)
    .join('\n')
}

function normalizeSplitItem(item, index) {
  return {
    title: String(item?.title || '').trim() || `第${index + 1}段`,
    content: composeSplitItemContent(item),
    summary: String(item?.summary || '').trim(),
    goals: String(item?.goals || '').trim(),
    conflict: String(item?.conflict || '').trim(),
    progression: String(item?.progression || '').trim(),
    resultHint: String(item?.resultHint || '').trim()
  }
}

function parseSplitDraftText(text) {
  const source = String(text || '').trim()
  if (!source) {
    return {
      items: [],
      parseError: t('outlineManager.splitValidationEmpty')
    }
  }

  try {
    const parsed = JSON.parse(extractJsonBlock(source))
    const itemsSource = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(itemsSource)) {
      throw new Error(t('outlineManager.workbenchSplitItemsMissing'))
    }
    const items = itemsSource
      .map((item, index) => normalizeSplitItem(item, index))
      .filter((item) => item.title && item.content)
    if (!items.length) {
      throw new Error(t('outlineManager.workbenchSplitItemsMissing'))
    }
    return {
      items,
      parseError: ''
    }
  } catch (error) {
    return {
      items: [],
      parseError: error?.message || t('outlineManager.splitParseFailed')
    }
  }
}

function serializeSplitItems(items) {
  return JSON.stringify(
    {
      items: items.map((item) => ({
        title: String(item.title || '').trim(),
        content: String(item.content || '').trim(),
        summary: String(item.summary || '').trim(),
        goals: String(item.goals || '').trim(),
        conflict: String(item.conflict || '').trim(),
        progression: String(item.progression || '').trim(),
        resultHint: String(item.resultHint || '').trim()
      }))
    },
    null,
    2
  )
}

function syncEditorFromVersion(version) {
  draftText.value = ''
  rawSplitDraft.value = ''
  splitItems.value = []
  splitParseError.value = ''

  if (!version) return

  if (version.taskType === 'split') {
    rawSplitDraft.value = String(version.rawText || '').trim()
    splitItems.value = cloneDeep(version.structuredItems || [])
    splitParseError.value = version.parseError || ''
    return
  }

  draftText.value = String(version.resultText || '').trim()
}

function selectVersion(versionId) {
  selectedVersionId.value = versionId
  syncEditorFromVersion(selectedVersion.value)
}

function getBaseDraftVersion() {
  if (baseStrategy.value !== 'latest-draft') return null
  return selectedVersion.value || latestTaskVersion.value || null
}

function getBaseDraftContent() {
  const version = getBaseDraftVersion()
  if (!version) return ''
  if (version.taskType === 'split') {
    if (version.id === selectedVersionId.value) {
      if (splitItems.value.length) {
        return serializeSplitItems(splitItems.value)
      }
      return rawSplitDraft.value.trim()
    }
    if (version.structuredItems?.length) {
      return serializeSplitItems(version.structuredItems)
    }
    return String(version.rawText || '').trim()
  }

  if (version.id === selectedVersionId.value) {
    return draftText.value.trim()
  }
  return String(version.resultText || '').trim()
}

async function loadAiSessions() {
  if (!props.bookName || !window.electron?.readOutlineAiSessions) {
    aiSessions.value = createEmptySessionsPayload()
    return
  }
  sessionsLoading.value = true
  try {
    const payload = await window.electron.readOutlineAiSessions(props.bookName)
    aiSessions.value = normalizeSessionsPayload(payload)
  } catch (error) {
    console.error('加载 AI 大纲会话失败:', error)
    aiSessions.value = createEmptySessionsPayload()
  } finally {
    sessionsLoading.value = false
  }
}

async function saveAiSessions(options = {}) {
  const { silent = false } = options
  if (!props.bookName || !window.electron?.writeOutlineAiSessions) {
    return false
  }
  sessionSaveError.value = ''
  try {
    const payload = cloneDeep(aiSessions.value)
    const result = await window.electron.writeOutlineAiSessions(props.bookName, payload)
    if (result?.success === false) {
      throw new Error(result.message || t('outlineManager.aiSessionSaveFailed'))
    }
    return true
  } catch (error) {
    sessionSaveError.value = error?.message || t('outlineManager.aiSessionSaveFailed')
    if (!silent) {
      ElMessage.error(sessionSaveError.value)
    }
    return false
  }
}

function clearCurrentDraftEditor() {
  draftText.value = ''
  rawSplitDraft.value = ''
  splitItems.value = []
  splitParseError.value = ''
}

function hydrateWorkbench(preferredTaskType = taskType.value) {
  const session = ensureCurrentNodeSession()
  if (!session) return

  isHydrating = true
  taskType.value = preferredTaskType || session.lastTaskType || 'refine'
  refineMode.value = session.preferences?.refineMode || 'overall'
  splitMode.value = session.preferences?.splitMode || 'plot'
  splitCount.value = Number(session.preferences?.splitCount) || 3
  baseStrategy.value =
    session.preferences?.baseStrategy || (session.latestDraftId ? 'latest-draft' : 'original')
  instruction.value = session.lastInstructions?.[taskType.value] || ''
  applyAction.value =
    taskType.value === 'split'
      ? session.preferences?.splitApplyAction || 'create-children'
      : session.preferences?.refineApplyAction || 'replace'

  const latestVersion = (session.versions || [])
    .filter((version) => version.taskType === taskType.value)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  if (baseStrategy.value === 'latest-draft' && !latestVersion) {
    baseStrategy.value = 'original'
  }

  if (latestVersion) {
    selectVersion(latestVersion.id)
  } else {
    selectedVersionId.value = ''
    clearCurrentDraftEditor()
  }

  nextTick(() => {
    isHydrating = false
  })
}

async function open(mode = 'refine') {
  visible.value = true
  taskType.value = mode === 'split' ? 'split' : 'refine'
  await loadAiSessions()
  hydrateWorkbench(taskType.value)
}

function updateSessionPreferences() {
  const session = ensureCurrentNodeSession()
  if (!session) return
  session.lastTaskType = taskType.value
  session.lastInstructions[taskType.value] = instruction.value.trim() || suggestedRequirement.value
  session.preferences.baseStrategy = baseStrategy.value
  session.preferences.refineMode = refineMode.value
  session.preferences.splitMode = splitMode.value
  session.preferences.splitCount = splitCount.value
  session.preferences.refineApplyAction = taskType.value === 'refine' ? applyAction.value : session.preferences.refineApplyAction
  session.preferences.splitApplyAction = taskType.value === 'split' ? applyAction.value : session.preferences.splitApplyAction
}

function createVersionFromResult(result, finalInstruction) {
  return {
    id: genId(),
    createdAt: new Date().toISOString(),
    taskType: taskType.value,
    taskMode: taskType.value === 'split' ? splitMode.value : refineMode.value,
    baseStrategy: baseStrategy.value,
    baseVersionId: getBaseDraftVersion()?.id || '',
    sourceContent: currentNodeContent.value,
    userInstruction: finalInstruction,
    targetCount: taskType.value === 'split' ? splitCount.value : undefined,
    status: 'draft',
    applyAction: '',
    appliedAt: '',
    resultText: taskType.value === 'refine' ? String(result.content || '').trim() : '',
    rawText: taskType.value === 'split' ? String(result.rawText || '').trim() : '',
    structuredItems: taskType.value === 'split' ? cloneDeep(result.items || []) : [],
    parseError: taskType.value === 'split' ? String(result.parseError || '').trim() : ''
  }
}

async function handleGenerate() {
  if (!props.selectedNodeId) return
  if (!currentNodeContent.value) {
    ElMessage.warning(
      taskType.value === 'split'
        ? t('outlineManager.cannotSplitEmpty')
        : t('outlineManager.cannotRefineEmpty')
    )
    return
  }
  if (!window.electron?.runOutlineAiTask) {
    ElMessage.error(t('outlineManager.aiUnsupported'))
    return
  }

  const finalInstruction = instruction.value.trim() || suggestedRequirement.value
  loading.value = true
  try {
    const payload = {
      taskType: taskType.value,
      nodeTitle: currentNodeTitle.value,
      sourceContent: currentNodeContent.value,
      previousDraft: baseStrategy.value === 'latest-draft' ? getBaseDraftContent() : '',
      userInstruction: finalInstruction,
      mode: taskType.value === 'split' ? splitMode.value : refineMode.value,
      count: taskType.value === 'split' ? splitCount.value : undefined
    }

    const result = await window.electron.runOutlineAiTask(payload)
    if (!result?.success) {
      throw new Error(result?.message || t('outlineManager.aiRequestFailed'))
    }

    const session = ensureCurrentNodeSession()
    const version = createVersionFromResult(result, finalInstruction)
    session.versions.push(version)
    session.latestDraftId = version.id
    updateSessionPreferences()

    selectedVersionId.value = version.id
    syncEditorFromVersion(version)
    await saveAiSessions({ silent: true })

    if (version.parseError) {
      ElMessage.warning(version.parseError)
    } else {
      ElMessage.success(t('outlineManager.workbenchDraftGenerated'))
    }
  } catch (error) {
    ElMessage.error(error?.message || t('outlineManager.aiRequestFailed'))
  } finally {
    loading.value = false
  }
}

async function saveCurrentDraftEdits(options = {}) {
  const { silent = false } = options
  const session = ensureCurrentNodeSession()
  const version = selectedVersion.value
  if (!session || !version) return false

  if (version.taskType === 'split') {
    if (splitItems.value.length) {
      version.structuredItems = cloneDeep(splitItems.value)
      version.rawText = serializeSplitItems(splitItems.value)
      version.parseError = ''
      rawSplitDraft.value = version.rawText
      splitParseError.value = ''
    } else {
      version.rawText = rawSplitDraft.value.trim()
      const parsed = parseSplitDraftText(version.rawText)
      version.structuredItems = parsed.items
      version.parseError = parsed.parseError
      splitParseError.value = parsed.parseError
      splitItems.value = cloneDeep(parsed.items)
    }
  } else {
    version.resultText = draftText.value.trim()
  }

  version.userInstruction = instruction.value.trim() || version.userInstruction
  session.latestDraftId = version.id
  updateSessionPreferences()

  const saved = await saveAiSessions({ silent })
  if (saved && !silent) {
    ElMessage.success(t('outlineManager.workbenchDraftSaved'))
  }
  return saved
}

function validateSplitItems(items, expectedCount) {
  if (!Array.isArray(items) || !items.length) {
    return t('outlineManager.splitValidationEmpty')
  }

  if (items.length !== expectedCount) {
    return t('outlineManager.splitValidationCountMismatch', {
      actual: items.length,
      expected: expectedCount
    })
  }

  const minimumLength = 120
  const tooShortIndex = items.findIndex((item) => String(item.content || '').trim().length < minimumLength)
  if (tooShortIndex !== -1) {
    return t('outlineManager.splitValidationTooShort', {
      index: tooShortIndex + 1,
      min: minimumLength
    })
  }

  return ''
}

async function handleApplyDraft() {
  const version = selectedVersion.value
  if (!version) {
    ElMessage.warning(t('outlineManager.workbenchSelectDraftFirst'))
    return
  }

  const saved = await saveCurrentDraftEdits({ silent: true })
  if (!saved) {
    return
  }

  const session = ensureCurrentNodeSession()
  if (!session) return

  if (applyAction.value === 'save-only') {
    version.status = 'saved'
    version.applyAction = 'save-only'
    version.appliedAt = new Date().toISOString()
    await saveAiSessions({ silent: true })
    ElMessage.success(t('outlineManager.workbenchSavedOnly'))
    return
  }

  loading.value = true
  try {
    const payload = {
      nodeId: props.selectedNodeId,
      draftId: version.id,
      taskType: taskType.value,
      action: applyAction.value
    }

    if (taskType.value === 'split') {
      const items = splitItems.value.length ? splitItems.value : parseSplitDraftText(rawSplitDraft.value).items
      const expectedCount = Number(version.targetCount) || Number(splitCount.value) || 3
      const splitValidationError = validateSplitItems(items, expectedCount)
      if (splitValidationError) {
        throw new Error(splitValidationError)
      }
      payload.items = cloneDeep(items)
    } else {
      const content = draftText.value.trim()
      if (!content) {
        throw new Error(t('outlineManager.aiEmptyResult'))
      }
      payload.content = content
    }

    const result = await props.applyDraft(payload)
    if (!result?.success) {
      throw new Error(result?.message || t('outlineManager.workbenchApplyFailed'))
    }

    version.status = 'applied'
    version.applyAction = applyAction.value
    version.appliedAt = new Date().toISOString()
    session.latestDraftId = version.id
    session.lastAppliedSnapshot = result.undoSnapshot || null
    updateSessionPreferences()
    await saveAiSessions({ silent: true })
    ElMessage.success(t('outlineManager.workbenchApplySuccess'))
  } catch (error) {
    ElMessage.error(error?.message || t('outlineManager.workbenchApplyFailed'))
  } finally {
    loading.value = false
  }
}

async function handleUndoLastApply() {
  const session = ensureCurrentNodeSession()
  if (!session?.lastAppliedSnapshot) return

  loading.value = true
  try {
    const result = await props.undoDraft(session.lastAppliedSnapshot)
    if (!result?.success) {
      throw new Error(result?.message || t('outlineManager.undoLastAiApplyFailed'))
    }

    session.lastAppliedSnapshot = null
    await saveAiSessions({ silent: true })
    ElMessage.success(t('outlineManager.undoLastAiApplySuccess'))
  } catch (error) {
    ElMessage.error(error?.message || t('outlineManager.undoLastAiApplyFailed'))
  } finally {
    loading.value = false
  }
}

function reparseSplitDraft() {
  const parsed = parseSplitDraftText(rawSplitDraft.value)
  splitItems.value = cloneDeep(parsed.items)
  splitParseError.value = parsed.parseError
  if (parsed.parseError) {
    ElMessage.warning(parsed.parseError)
  } else {
    ElMessage.success(t('outlineManager.workbenchReparseSuccess'))
  }
}

async function handleCopyDraft() {
  const text =
    taskType.value === 'split'
      ? splitItems.value.length
        ? serializeSplitItems(splitItems.value)
        : rawSplitDraft.value
      : draftText.value

  if (!text.trim()) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(t('outlineManager.copiedToClipboard'))
  } catch {
    ElMessage.error(t('outlineManager.copyFailed'))
  }
}

watch(
  taskType,
  async (nextTask, prevTask) => {
    if (!visible.value || isHydrating || nextTask === prevTask) return
    if (selectedVersion.value) {
      await saveCurrentDraftEdits({ silent: true })
    }

    const session = ensureCurrentNodeSession()
    if (!session) return

    instruction.value = session.lastInstructions?.[nextTask] || ''
    applyAction.value =
      nextTask === 'split'
        ? session.preferences?.splitApplyAction || 'create-children'
        : session.preferences?.refineApplyAction || 'replace'

    const latest = (session.versions || [])
      .filter((version) => version.taskType === nextTask)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

    if (baseStrategy.value === 'latest-draft' && !latest) {
      baseStrategy.value = 'original'
    }

    if (latest) {
      selectVersion(latest.id)
    } else {
      selectedVersionId.value = ''
      clearCurrentDraftEditor()
    }

    updateSessionPreferences()
    await saveAiSessions({ silent: true })
  }
)

watch(
  () => props.selectedNodeId,
  async () => {
    if (!visible.value) return
    await loadAiSessions()
    hydrateWorkbench(taskType.value)
  }
)

watch(visible, async (isOpen) => {
  if (!isOpen) {
    sessionSaveError.value = ''
    return
  }
  await nextTick()
  hydrateWorkbench(taskType.value)
})

defineExpose({
  open
})
</script>

<style lang="scss" scoped>
.workbench-layout {
  display: flex;
  gap: 16px;
  min-height: 68vh;
}

.history-panel {
  width: 280px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  background: var(--bg-soft);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-toolbar {
  display: flex;
  justify-content: center;
}

.history-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 10px 12px;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.history-item.active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.history-item-title {
  font-size: 13px;
  font-weight: 600;
}

.history-item-time,
.history-item-meta,
.history-item-instruction {
  font-size: 12px;
  color: var(--text-secondary);
}

.history-item-instruction {
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.workbench-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.base-config-card,
.apply-config-card,
.draft-panel {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  background: var(--bg-soft);
}

.panel-heading {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-base);
  margin-bottom: 12px;
}

.current-outline {
  margin-bottom: 14px;
}

.current-outline-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-base);
}

.draft-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 16px;
}

.suggested-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.suggested-text-value {
  color: var(--el-color-primary);
  font-weight: 600;
}

.split-alert,
.session-alert {
  margin-bottom: 12px;
}

.split-item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 420px;
  overflow: auto;
}

.split-item-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px;
  background: var(--bg-primary);
}

.split-item-title {
  margin-bottom: 10px;
}

.workbench-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.footer-left,
.footer-right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
</style>
