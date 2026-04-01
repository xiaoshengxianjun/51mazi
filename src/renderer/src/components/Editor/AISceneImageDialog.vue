<template>
  <el-drawer
    :model-value="modelValue"
    :title="t('aiSceneImage.title')"
    size="700px"
    direction="rtl"
    class="ai-scene-drawer"
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="ai-scene-drawer-content">
      <div class="ai-scene-drawer-body">
        <el-alert type="info" :closable="false" show-icon class="ai-scene-tip">
          {{ t('aiSceneImage.tip') }}
        </el-alert>

        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="100px"
          class="ai-scene-form"
        >
          <el-form-item :label="t('aiSceneImage.excerptBasis')">
            <div class="excerpt-box">
              <el-scrollbar max-height="140px">
                <pre class="excerpt-text">{{ excerpt }}</pre>
              </el-scrollbar>
            </div>
            <div class="excerpt-hint">
              {{ t('aiSceneImage.excerptHint') }}
            </div>
          </el-form-item>

          <el-form-item :label="t('aiSceneImage.outputSize')">
            <el-select v-model="form.outputSize" :placeholder="t('aiSceneImage.selectRatio')" style="width: 100%">
              <el-option
                v-for="opt in sizeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('aiSceneImage.style')">
            <el-select
              v-model="form.style"
              :placeholder="t('aiSceneImage.optionalStyle')"
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="opt in styleOptions"
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

          <el-form-item :label="t('aiSceneImage.shotRange')">
            <el-select v-model="form.shotRange" :placeholder="t('aiSceneImage.optional')" style="width: 100%" clearable>
              <el-option
                v-for="opt in shotRangeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('aiSceneImage.setting')">
            <el-select v-model="form.setting" :placeholder="t('aiSceneImage.optional')" style="width: 100%" clearable>
              <el-option
                v-for="opt in settingOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('aiSceneImage.lighting')">
            <el-select v-model="form.lighting" :placeholder="t('aiSceneImage.optional')" style="width: 100%" clearable>
              <el-option
                v-for="opt in lightingOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('aiSceneImage.prompt')" prop="prompt">
            <el-input
              v-model="form.prompt"
              type="textarea"
              :rows="5"
              :placeholder="t('aiSceneImage.promptPlaceholder')"
              maxlength="500"
              show-word-limit
            />
            <div class="refine-row">
              <el-button
                type="primary"
                link
                :loading="refining"
                :disabled="!excerpt.trim()"
                @click="handleRefinePrompt"
              >
                {{ t('aiSceneImage.refineWithDeepSeek') }}
              </el-button>
              <span v-if="refineError" class="refine-error">{{ refineError }}</span>
            </div>
          </el-form-item>

          <el-form-item :label="t('aiSceneImage.negativePrompt')">
            <el-input
              v-model="form.negativePrompt"
              type="textarea"
              :rows="2"
              :placeholder="t('aiSceneImage.negativePromptPlaceholder')"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>

        <el-alert v-if="generating" type="info" :closable="false" show-icon class="generating-hint">
          {{ t('aiSceneImage.generating') }}
        </el-alert>

        <div v-if="generatedList.length > 0" class="generated-section">
          <div class="section-title">{{ t('aiSceneImage.generatedTitle') }}</div>
          <div v-for="(item, index) in generatedList" :key="item.localPath" class="generated-block">
            <div class="generated-thumb-wrap">
              <img
                :src="item.previewUrl"
                :alt="t('aiSceneImage.generatedAlt', { index: index + 1 })"
                class="generated-thumb"
              />
            </div>
            <div class="path-row">
              <span class="path-label">{{ t('aiSceneImage.savePath') }}</span>
              <el-input :model-value="item.localPath" readonly class="path-input">
                <template #append>
                  <el-button @click="copyPath(item.localPath)">{{ t('common.copy') }}</el-button>
                </template>
              </el-input>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-scene-drawer-footer">
        <el-button @click="handleClose">{{ t('common.close') }}</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">
          {{
            generatedList.length > 0 ? t('aiSceneImage.generateOneMore') : t('aiSceneImage.generate')
          }}
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { generateAISceneImage } from '@renderer/service/tongyiwanxiang'
import { refineSceneVisualPromptWithAI } from '@renderer/service/deepseek'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bookName: { type: String, default: '' },
  /** 完整选中文本（只读展示 + 提炼依据） */
  excerpt: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const formRef = ref(null)
const generating = ref(false)
const refining = ref(false)
const refineError = ref('')
const generatedList = ref([])

const form = ref({
  outputSize: '1280*720',
  style: '',
  shotRange: '',
  setting: '',
  lighting: '',
  prompt: '',
  negativePrompt: ''
})

const sizeOptions = [
  { value: '1280*720', label: t('aiSceneImage.sizeLandscape') },
  { value: '1280*1280', label: t('aiSceneImage.sizeSquare') }
]

const styleOptions = [
  {
    value: 'anime',
    label: t('aiSceneImage.styles.anime.label'),
    desc: t('aiSceneImage.styles.anime.desc'),
    prompt: t('aiSceneImage.stylePrompts.anime')
  },
  {
    value: 'ghibli',
    label: t('aiSceneImage.styles.ghibli.label'),
    desc: t('aiSceneImage.styles.ghibli.desc'),
    prompt: t('aiSceneImage.stylePrompts.ghibli')
  },
  {
    value: 'retro_anime',
    label: t('aiSceneImage.styles.retroAnime.label'),
    desc: t('aiSceneImage.styles.retroAnime.desc'),
    prompt: t('aiSceneImage.stylePrompts.retroAnime')
  },
  {
    value: 'photorealistic',
    label: t('aiSceneImage.styles.photorealistic.label'),
    desc: t('aiSceneImage.styles.photorealistic.desc'),
    prompt: t('aiSceneImage.stylePrompts.photorealistic')
  },
  {
    value: '3d_render',
    label: t('aiSceneImage.styles.render3d.label'),
    desc: t('aiSceneImage.styles.render3d.desc'),
    prompt: t('aiSceneImage.stylePrompts.render3d')
  },
  {
    value: 'pixar',
    label: t('aiSceneImage.styles.pixar.label'),
    desc: t('aiSceneImage.styles.pixar.desc'),
    prompt: t('aiSceneImage.stylePrompts.pixar')
  },
  {
    value: 'guofeng',
    label: t('aiSceneImage.styles.guofeng.label'),
    desc: t('aiSceneImage.styles.guofeng.desc'),
    prompt: t('aiSceneImage.stylePrompts.guofeng')
  },
  {
    value: 'watercolor',
    label: t('aiSceneImage.styles.watercolor.label'),
    desc: t('aiSceneImage.styles.watercolor.desc'),
    prompt: t('aiSceneImage.stylePrompts.watercolor')
  },
  {
    value: 'ink_wash',
    label: t('aiSceneImage.styles.inkWash.label'),
    desc: t('aiSceneImage.styles.inkWash.desc'),
    prompt: t('aiSceneImage.stylePrompts.inkWash')
  },
  {
    value: 'oil_painting',
    label: t('aiSceneImage.styles.oilPainting.label'),
    desc: t('aiSceneImage.styles.oilPainting.desc'),
    prompt: t('aiSceneImage.stylePrompts.oilPainting')
  },
  {
    value: 'cyberpunk',
    label: t('aiSceneImage.styles.cyberpunk.label'),
    desc: t('aiSceneImage.styles.cyberpunk.desc'),
    prompt: t('aiSceneImage.stylePrompts.cyberpunk')
  },
  {
    value: 'pixel_art',
    label: t('aiSceneImage.styles.pixelArt.label'),
    desc: t('aiSceneImage.styles.pixelArt.desc'),
    prompt: t('aiSceneImage.stylePrompts.pixelArt')
  }
]

const shotRangeOptions = [
  { value: '', label: t('aiSceneImage.unspecified') },
  { value: 'wide', label: t('aiSceneImage.shotRanges.wide') },
  { value: 'medium', label: t('aiSceneImage.shotRanges.medium') },
  { value: 'close', label: t('aiSceneImage.shotRanges.close') }
]

const settingOptions = [
  { value: '', label: t('aiSceneImage.unspecified') },
  { value: 'indoor', label: t('aiSceneImage.settings.indoor') },
  { value: 'outdoor', label: t('aiSceneImage.settings.outdoor') }
]

const lightingOptions = [
  { value: '', label: t('aiSceneImage.unspecified') },
  { value: 'day', label: t('aiSceneImage.lightings.day') },
  { value: 'dusk', label: t('aiSceneImage.lightings.dusk') },
  { value: 'night', label: t('aiSceneImage.lightings.night') }
]

const formRules = computed(() => ({
  prompt: [
    { required: true, message: t('aiSceneImage.rulePromptRequired'), trigger: 'blur' },
    { min: 5, message: t('aiSceneImage.rulePromptMin'), trigger: 'blur' }
  ]
}))

/**
 * 节选预填：有效字数约 120～280，尽量在句号类标点处收束
 */
function buildSceneDescriptionPrefill(excerpt) {
  const raw = String(excerpt || '').trim()
  if (!raw) return ''
  let effective = 0
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (!/[\s\n\r\t]/.test(ch)) effective++
    out += ch
    if (effective >= 280) break
    if (effective >= 120 && /[。！？]/.test(ch)) break
  }
  return out.trim()
}

function resetFormFromExcerpt() {
  refineError.value = ''
  generatedList.value = []
  form.value = {
    outputSize: '1280*720',
    style: '',
    shotRange: '',
    setting: '',
    lighting: '',
    prompt: buildSceneDescriptionPrefill(props.excerpt),
    negativePrompt: ''
  }
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      resetFormFromExcerpt()
    }
  }
)

function labelFromOptions(options, value) {
  if (!value) return ''
  const o = options.find((x) => x.value === value)
  return o && o.value ? o.label.replace(new RegExp(`^${t('aiSceneImage.unspecified')}$`), '').replace(/·/g, ' ') : ''
}

function buildFullPrompt() {
  const isSquare = form.value.outputSize === '1280*1280'
  const parts = [
    isSquare
      ? t('aiSceneImage.promptSquareFrame')
      : t('aiSceneImage.promptLandscapeFrame')
  ]
  const styleKey = form.value.style
  if (styleKey) {
    const s = styleOptions.find((o) => o.value === styleKey)
    if (s?.prompt) parts.push(s.prompt)
  }
  parts.push(t('aiSceneImage.promptScenePrefix'))
  parts.push(form.value.prompt.trim())

  const shot = labelFromOptions(shotRangeOptions, form.value.shotRange)
  if (shot) parts.push('，' + shot)

  const env = labelFromOptions(settingOptions, form.value.setting)
  if (env) parts.push('，' + env)

  const light = labelFromOptions(lightingOptions, form.value.lighting)
  if (light) parts.push('，' + light)

  return parts.join('')
}

async function handleRefinePrompt() {
  const text = (props.excerpt || '').trim()
  if (!text) {
    ElMessage.warning(t('aiSceneImage.excerptEmpty'))
    return
  }
  if (!window.electron?.refineSceneVisualPromptWithAI) {
    ElMessage.error(t('aiSceneImage.refineUnsupported'))
    return
  }
  refining.value = true
  refineError.value = ''
  try {
    const res = await refineSceneVisualPromptWithAI(text)
    if (res?.success && res.content) {
      form.value.prompt = String(res.content).trim().slice(0, 500)
      ElMessage.success(t('aiSceneImage.refineApplied'))
    } else {
      refineError.value = res?.message || t('aiSceneImage.refineFailed')
      ElMessage.error(refineError.value)
    }
  } catch (e) {
    refineError.value = e?.message || t('aiSceneImage.refineRequestError')
    ElMessage.error(refineError.value)
  } finally {
    refining.value = false
  }
}

async function handleGenerate() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  const bookName = (props.bookName || '').trim()
  if (!bookName) {
    ElMessage.error(t('aiSceneImage.bookNameEmpty'))
    return
  }
  if (!window.electron?.generateAISceneImage) {
    ElMessage.error(t('aiSceneImage.generateUnsupported'))
    return
  }
  generating.value = true
  try {
    const fullPrompt = buildFullPrompt()
    const res = await generateAISceneImage({
      prompt: fullPrompt,
      size: form.value.outputSize,
      bookName,
      negativePrompt: (form.value.negativePrompt || '').trim() || undefined
    })
    if (res?.success && res.localPath) {
      const previewUrl = `file://${res.localPath}`
      generatedList.value.push({ localPath: res.localPath, previewUrl })
      ElMessage.success(t('aiSceneImage.generateSuccess'))
    } else {
      ElMessage.error(res?.message || t('aiSceneImage.generateFailed'))
    }
  } catch (e) {
    ElMessage.error(e?.message || t('aiSceneImage.generateError'))
  } finally {
    generating.value = false
  }
}

async function copyPath(p) {
  if (!p) return
  try {
    await navigator.clipboard.writeText(p)
    ElMessage.success(t('aiSceneImage.pathCopied'))
  } catch {
    ElMessage.error(t('aiSceneImage.copyFailed'))
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
/* 抽屉内铺满高度，底部操作栏固定 */
.ai-scene-drawer {
  :deep(.el-drawer__body) {
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }
}

.ai-scene-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.ai-scene-drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px 16px;
}

.ai-scene-tip {
  margin-bottom: 16px;
}

.ai-scene-form {
  margin-top: 8px;
}

.excerpt-box {
  width: 100%;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
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
  gap: 8px;
  width: 100%;
}

.style-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.refine-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.refine-error {
  font-size: 12px;
  color: var(--el-color-danger);
}

.generating-hint {
  margin-top: 12px;
  margin-bottom: 8px;
}

.generated-section {
  margin-top: 16px;
  padding: 12px 0 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding-left: 12px;
  padding-right: 12px;
  margin-left: -4px;
  margin-right: -4px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
}

.generated-block {
  margin-bottom: 16px;
}

.generated-thumb-wrap {
  margin-bottom: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  max-width: 100%;
}

.generated-thumb {
  display: block;
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}

.path-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.path-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.path-input {
  width: 100%;
}

.ai-scene-drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
</style>
