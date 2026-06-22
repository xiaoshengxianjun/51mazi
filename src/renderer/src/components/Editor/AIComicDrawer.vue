<template>
  <el-drawer
    :model-value="modelValue"
    :title="t('aiComic.title')"
    size="720px"
    direction="rtl"
    class="ai-comic-drawer"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="handleDrawerClose"
  >
    <div class="ai-comic-drawer-content">
      <div class="ai-comic-drawer-body">
        <el-alert type="info" :closable="false" show-icon class="ai-comic-tip">
          {{ t('aiComic.tip') }}
        </el-alert>

        <el-form label-width="100px" class="ai-comic-form">
          <el-form-item :label="t('aiComic.contentBasis')">
            <div class="mode-tag-row">
              <el-tag size="small" type="info">
                {{
                  inputMode === 'selection'
                    ? t('aiComic.inputModeSelection')
                    : t('aiComic.inputModeChapter')
                }}
              </el-tag>
            </div>
            <div class="excerpt-box">
              <el-scrollbar max-height="120px">
                <pre class="excerpt-text">{{ excerpt }}</pre>
              </el-scrollbar>
            </div>
            <div class="excerpt-hint">
              {{
                inputMode === 'selection'
                  ? t('aiComic.contentHintSelection')
                  : t('aiComic.contentHintChapter')
              }}
            </div>
          </el-form-item>

          <template v-if="providersLoaded">
            <el-form-item v-if="noImageProviders">
              <el-alert type="warning" :closable="false" show-icon class="ai-drawer-provider-alert">
                {{ t('imageAi.noProviderHint') }}
              </el-alert>
            </el-form-item>
            <el-form-item v-else :label="t('imageAi.serviceLabel')">
              <el-select v-model="selectedProvider" style="width: 100%">
                <el-option
                  v-for="p in imageProviders"
                  :key="p"
                  :label="labelForImageProvider(p)"
                  :value="p"
                />
              </el-select>
            </el-form-item>
          </template>

          <el-form-item :label="t('aiComic.comicStyle')" required>
            <el-select
              v-model="form.comicStyle"
              :placeholder="t('aiComic.selectComicStyle')"
              style="width: 100%"
            >
              <el-option
                v-for="opt in comicStyleOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              >
                <div class="style-option-row">
                  <span>{{ opt.label }}</span>
                  <span class="style-desc">{{ opt.desc }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item :label="t('aiComic.panelCount')">
            <el-radio-group v-model="form.panelCount">
              <el-radio v-for="n in panelCountOptions" :key="n" :value="n">
                {{ t('aiComic.panelCountOption', { count: n }) }}
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item :label="t('aiComic.outputSize')">
            <el-select v-model="form.outputSize" style="width: 100%">
              <el-option
                v-for="opt in sizeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('aiComic.negativePrompt')">
            <el-input
              v-model="form.negativePrompt"
              type="textarea"
              :rows="2"
              :placeholder="t('aiComic.negativePromptPlaceholder')"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>

        <div class="storyboard-section">
          <div class="section-header">
            <span class="section-title">{{ t('aiComic.storyboardSection') }}</span>
            <el-button
              type="primary"
              link
              :loading="storyboardLoading"
              :disabled="!excerpt.trim()"
              @click="handleGenerateStoryboard"
            >
              {{ t('aiComic.generateStoryboard') }}
            </el-button>
          </div>

          <el-alert
            v-if="storyboardLoading"
            type="info"
            :closable="false"
            show-icon
            class="generating-hint"
          >
            {{ t('aiComic.generatingStoryboard') }}
          </el-alert>

          <div v-if="panels.length > 0" class="panel-list">
            <div v-for="(panel, idx) in panels" :key="panel.index" class="panel-card">
              <div class="panel-card-header">
                {{ t('aiComic.panelIndex', { index: panel.index }) }}
              </div>
              <div v-if="panel.caption" class="panel-caption">
                <span class="field-label">{{ t('aiComic.panelCaption') }}：</span>
                {{ panel.caption }}
              </div>
              <div v-if="panel.characters?.length" class="panel-characters">
                <span class="field-label">{{ t('aiComic.panelCharacters') }}：</span>
                {{ panel.characters.join('、') }}
              </div>
              <el-input
                v-model="panels[idx].visualPrompt"
                type="textarea"
                :rows="3"
                :placeholder="t('aiComic.panelVisualPrompt')"
                maxlength="200"
                show-word-limit
              />
            </div>
          </div>
        </div>

        <el-alert
          v-if="generating && generateProgress.total > 0"
          type="info"
          :closable="false"
          show-icon
          class="generating-hint"
        >
          {{
            t('aiComic.generatingPanel', {
              current: generateProgress.current,
              total: generateProgress.total
            })
          }}
          <el-progress
            :percentage="generateProgressPercent"
            :stroke-width="6"
            style="margin-top: 8px"
          />
        </el-alert>

        <div v-if="batchDir" class="batch-path-row">
          <span class="path-label">{{ t('aiComic.batchPath') }}</span>
          <el-input :model-value="batchDir" readonly class="path-input">
            <template #append>
              <el-button @click="copyPath(batchDir)">{{ t('common.copy') }}</el-button>
            </template>
          </el-input>
        </div>

        <div v-if="generatedResults.length > 0" class="generated-section">
          <div class="section-title">{{ t('aiComic.generatedTitle') }}</div>
          <div class="comic-strip-preview">
            <div
              v-for="item in generatedResults"
              :key="item.panelIndex"
              class="generated-block"
            >
              <div class="generated-panel-label">
                {{ t('aiComic.panelIndex', { index: item.panelIndex }) }}
              </div>
              <div v-if="item.error" class="panel-error">
                {{ t('aiComic.panelGenerateFailed', { index: item.panelIndex, reason: item.error }) }}
                <el-button
                  type="primary"
                  link
                  size="small"
                  :loading="item.retrying"
                  @click="handleRetryPanel(item.panelIndex)"
                >
                  {{ t('aiComic.retryPanel') }}
                </el-button>
              </div>
              <template v-else-if="item.localPath">
                <div class="generated-thumb-wrap">
                  <img
                    :src="item.previewUrl"
                    :alt="t('aiComic.generatedAlt', { index: item.panelIndex })"
                    class="generated-thumb"
                  />
                </div>
                <div class="path-row">
                  <span class="path-label">{{ t('aiComic.savePath') }}</span>
                  <el-input :model-value="item.localPath" readonly class="path-input">
                    <template #append>
                      <el-button @click="copyPath(item.localPath)">{{ t('common.copy') }}</el-button>
                    </template>
                  </el-input>
                </div>
                <el-button
                  type="primary"
                  link
                  size="small"
                  :loading="item.retrying"
                  :disabled="generating"
                  @click="handleRetryPanel(item.panelIndex)"
                >
                  {{ t('aiComic.retryPanel') }}
                </el-button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-comic-drawer-footer">
        <el-button @click="handleDrawerClose(false)">{{ t('common.close') }}</el-button>
        <el-button
          type="primary"
          :loading="generating"
          :disabled="noImageProviders || !selectedProvider || !canGeneratePanels"
          @click="handleGeneratePanels"
        >
          {{
            generatedResults.some((r) => r.localPath)
              ? t('aiComic.generatePanelsAgain')
              : t('aiComic.generatePanels')
          }}
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch, computed, toRef } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useImageAiProviderSelect } from '@renderer/composables/useImageAiProviderSelect'
import {
  generateComicStoryboardWithAI,
  initComicBatch,
  generateAIComicPanelImage,
  readCharactersForComic,
  buildAppearanceMap
} from '@renderer/service/comicAi'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bookName: { type: String, default: '' },
  chapterTitle: { type: String, default: '' },
  excerpt: { type: String, default: '' },
  /** selection | chapter */
  inputMode: { type: String, default: 'chapter' }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const modelOpen = toRef(props, 'modelValue')
const { imageProviders, selectedProvider, noImageProviders, providersLoaded } =
  useImageAiProviderSelect(modelOpen)

function labelForImageProvider(id) {
  const keys = {
    tongyi: 'imageAi.providerTongyi',
    gemini: 'imageAi.providerGemini',
    doubao: 'imageAi.providerDoubao'
  }
  return t(keys[id] || id)
}

const storyboardLoading = ref(false)
const generating = ref(false)
const cancelled = ref(false)
const batchDir = ref('')
const charactersList = ref([])
const panels = ref([])
const generatedResults = ref([])
const generateProgress = ref({ current: 0, total: 0 })

const panelCountOptions = [4, 6, 8]

const form = ref({
  comicStyle: 'manga',
  panelCount: 6,
  outputSize: '720*1280',
  negativePrompt: ''
})

const comicStyleOptions = computed(() => [
  {
    value: 'manga',
    label: t('aiComic.styles.manga.label'),
    desc: t('aiComic.styles.manga.desc'),
    prompt: t('aiComic.stylePrompts.manga')
  },
  {
    value: 'manhwa',
    label: t('aiComic.styles.manhwa.label'),
    desc: t('aiComic.styles.manhwa.desc'),
    prompt: t('aiComic.stylePrompts.manhwa')
  },
  {
    value: 'americanComic',
    label: t('aiComic.styles.americanComic.label'),
    desc: t('aiComic.styles.americanComic.desc'),
    prompt: t('aiComic.stylePrompts.americanComic')
  },
  {
    value: 'guoman',
    label: t('aiComic.styles.guoman.label'),
    desc: t('aiComic.styles.guoman.desc'),
    prompt: t('aiComic.stylePrompts.guoman')
  }
])

const sizeOptions = computed(() => [
  { value: '720*1280', label: t('aiComic.sizePortrait') },
  { value: '1280*1280', label: t('aiComic.sizeSquare') },
  { value: '1280*720', label: t('aiComic.sizeLandscape') }
])

const generateProgressPercent = computed(() => {
  const { current, total } = generateProgress.value
  if (!total) return 0
  return Math.min(100, Math.round((current / total) * 100))
})

const canGeneratePanels = computed(() => {
  return panels.value.some((p) => String(p.visualPrompt || '').trim().length >= 5)
})

function resetDrawerState() {
  cancelled.value = false
  storyboardLoading.value = false
  generating.value = false
  batchDir.value = ''
  panels.value = []
  generatedResults.value = []
  generateProgress.value = { current: 0, total: 0 }
  form.value = {
    comicStyle: 'manga',
    panelCount: 6,
    outputSize: '720*1280',
    negativePrompt: t('aiComic.defaultNegativePrompt')
  }
}

async function loadCharacters() {
  const name = (props.bookName || '').trim()
  if (!name) {
    charactersList.value = []
    return
  }
  try {
    charactersList.value = await readCharactersForComic(name)
  } catch {
    charactersList.value = []
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetDrawerState()
      loadCharacters()
    }
  }
)

function getStylePrompt() {
  const key = form.value.comicStyle
  const opt = comicStyleOptions.value.find((o) => o.value === key)
  return opt?.prompt || ''
}

function getFramePrompt() {
  const size = form.value.outputSize
  if (size === '720*1280') return t('aiComic.promptPortraitFrame')
  if (size === '1280*720') return t('aiComic.promptLandscapeFrame')
  return t('aiComic.promptSquareFrame')
}

function buildPanelPrompt(panel) {
  const parts = [getStylePrompt(), getFramePrompt()]
  parts.push(`漫画分镜第${panel.index}格`)
  parts.push(panel.visualPrompt.trim())

  const appearMap = buildAppearanceMap(charactersList.value, panel.characters)
  const appearLines = Object.entries(appearMap).map(([name, appear]) => `${name}：${appear}`)
  if (appearLines.length) {
    parts.push(t('aiComic.characterAppearancePrefix') + appearLines.join('；'))
  }

  parts.push(t('aiComic.promptNoText'))
  return parts.filter(Boolean).join('，')
}

function getComicStyleLabel() {
  const opt = comicStyleOptions.value.find((o) => o.value === form.value.comicStyle)
  return opt?.label || ''
}

async function handleGenerateStoryboard() {
  const text = (props.excerpt || '').trim()
  if (!text) return

  if (!window.electron?.generateComicStoryboardWithAI) {
    ElMessage.error(t('aiComic.storyboardUnsupported'))
    return
  }

  const bookName = (props.bookName || '').trim()
  if (!bookName) {
    ElMessage.error(t('aiComic.bookNameEmpty'))
    return
  }

  storyboardLoading.value = true
  try {
    const res = await generateComicStoryboardWithAI({
      text,
      panelCount: form.value.panelCount,
      comicStyleLabel: getComicStyleLabel(),
      bookName
    })
    if (res?.success && Array.isArray(res.panels) && res.panels.length) {
      panels.value = res.panels.map((p, i) => ({
        index: Number(p.index) > 0 ? Number(p.index) : i + 1,
        caption: String(p.caption || '').trim(),
        visualPrompt: String(p.visualPrompt || '').trim(),
        characters: Array.isArray(p.characters) ? [...p.characters] : []
      }))
      generatedResults.value = []
      batchDir.value = ''
      ElMessage.success(t('aiComic.storyboardSuccess'))
    } else {
      ElMessage.error(res?.message || t('aiComic.storyboardFailed'))
    }
  } catch (e) {
    ElMessage.error(e?.message || t('aiComic.storyboardFailed'))
  } finally {
    storyboardLoading.value = false
  }
}

async function ensureBatchDir() {
  if (batchDir.value) return batchDir.value

  const bookName = (props.bookName || '').trim()
  if (!bookName) throw new Error(t('aiComic.bookNameEmpty'))

  const storyboard = {
    chapterTitle: props.chapterTitle || '',
    inputMode: props.inputMode,
    comicStyle: form.value.comicStyle,
    panelCount: form.value.panelCount,
    outputSize: form.value.outputSize,
    panels: panels.value,
    createdAt: new Date().toISOString()
  }

  const res = await initComicBatch({
    bookName,
    chapterTitle: props.chapterTitle || '章节',
    storyboard
  })

  if (!res?.success || !res.batchDir) {
    throw new Error(res?.message || t('aiComic.generateFailed'))
  }

  batchDir.value = res.batchDir
  return res.batchDir
}

function upsertGeneratedResult(panelIndex, patch) {
  const idx = generatedResults.value.findIndex((r) => r.panelIndex === panelIndex)
  const base = {
    panelIndex,
    localPath: '',
    previewUrl: '',
    error: '',
    retrying: false
  }
  if (idx >= 0) {
    generatedResults.value[idx] = { ...generatedResults.value[idx], ...patch }
  } else {
    generatedResults.value.push({ ...base, ...patch })
  }
  generatedResults.value.sort((a, b) => a.panelIndex - b.panelIndex)
}

async function generateOnePanel(panel, { isRetry = false } = {}) {
  if (!window.electron?.generateAIComicPanelImage) {
    throw new Error(t('aiComic.generateUnsupported'))
  }

  if (!selectedProvider.value) {
    throw new Error(t('imageAi.noProviderHint'))
  }

  const dir = await ensureBatchDir()
  const prompt = buildPanelPrompt(panel)
  const res = await generateAIComicPanelImage({
    prompt,
    size: form.value.outputSize,
    batchDir: dir,
    panelIndex: panel.index,
    negativePrompt: (form.value.negativePrompt || '').trim() || undefined,
    imageProvider: selectedProvider.value
  })

  if (res?.success && res.localPath) {
    upsertGeneratedResult(panel.index, {
      localPath: res.localPath,
      previewUrl: `file://${res.localPath}`,
      error: '',
      retrying: false
    })
    if (isRetry) {
      ElMessage.success(t('aiComic.panelGenerateSuccess', { index: panel.index }))
    }
    return true
  }

  const msg = res?.message || t('aiComic.generateFailed')
  upsertGeneratedResult(panel.index, {
    error: msg,
    retrying: false
  })
  ElMessage.error(t('aiComic.panelGenerateFailed', { index: panel.index, reason: msg }))
  return false
}

async function handleGeneratePanels() {
  if (!form.value.comicStyle) {
    ElMessage.warning(t('aiComic.selectComicStyleRequired'))
    return
  }

  const validPanels = panels.value.filter((p) => String(p.visualPrompt || '').trim().length >= 5)
  if (!validPanels.length) {
    ElMessage.warning(t('aiComic.noPanels'))
    return
  }

  if (!selectedProvider.value) {
    ElMessage.warning(t('imageAi.noProviderHint'))
    return
  }

  cancelled.value = false
  generating.value = true
  generateProgress.value = { current: 0, total: validPanels.length }

  if (!generatedResults.value.length) {
    generatedResults.value = validPanels.map((p) => ({
      panelIndex: p.index,
      localPath: '',
      previewUrl: '',
      error: '',
      retrying: false
    }))
  }

  let successCount = 0
  try {
    for (let i = 0; i < validPanels.length; i++) {
      if (cancelled.value) break
      generateProgress.value = { current: i + 1, total: validPanels.length }
      const ok = await generateOnePanel(validPanels[i])
      if (ok) successCount++
    }

    if (cancelled.value) return

    if (successCount === validPanels.length) {
      ElMessage.success(t('aiComic.generateSuccess'))
    } else if (successCount > 0) {
      ElMessage.warning(t('aiComic.generatePartial'))
    } else {
      ElMessage.error(t('aiComic.generateFailed'))
    }
  } catch (e) {
    ElMessage.error(e?.message || t('aiComic.generateFailed'))
  } finally {
    generating.value = false
  }
}

async function handleRetryPanel(panelIndex) {
  const panel = panels.value.find((p) => p.index === panelIndex)
  if (!panel || !String(panel.visualPrompt || '').trim()) return

  upsertGeneratedResult(panelIndex, { retrying: true, error: '' })
  try {
    await generateOnePanel(panel, { isRetry: true })
  } catch (e) {
    upsertGeneratedResult(panelIndex, {
      error: e?.message || t('aiComic.generateFailed'),
      retrying: false
    })
  }
}

async function copyPath(p) {
  if (!p) return
  try {
    await navigator.clipboard.writeText(p)
    ElMessage.success(t('aiComic.pathCopied'))
  } catch {
    ElMessage.error(t('aiComic.copyFailed'))
  }
}

function handleDrawerClose(val) {
  if (generating.value) {
    cancelled.value = true
  }
  emit('update:modelValue', val)
}
</script>

<style scoped lang="scss">
.ai-drawer-provider-alert {
  width: 100%;
}

.ai-comic-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }
}

.ai-comic-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.ai-comic-drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px 16px;
}

.ai-comic-drawer-footer {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.ai-comic-tip {
  margin-bottom: 16px;
}

.mode-tag-row {
  margin-bottom: 8px;
}

.excerpt-box {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 8px;
  background: var(--el-fill-color-light);
  width: 100%;
}

.excerpt-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);
}

.excerpt-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.style-option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.style-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.storyboard-section {
  margin-top: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}

.panel-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
  background: var(--el-fill-color-blank);
}

.panel-card-header {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 13px;
}

.panel-caption,
.panel-characters {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.field-label {
  color: var(--el-text-color-regular);
}

.generating-hint {
  margin: 12px 0;
}

.batch-path-row {
  margin: 12px 0;
}

.path-row {
  margin-top: 8px;
}

.path-label {
  display: block;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.path-input {
  width: 100%;
}

.generated-section {
  margin-top: 16px;
}

.comic-strip-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.generated-block {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
}

.generated-panel-label {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}

.panel-error {
  font-size: 13px;
  color: var(--el-color-danger);
  line-height: 1.5;
}

.generated-thumb-wrap {
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-fill-color-light);
}

.generated-thumb {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}
</style>
