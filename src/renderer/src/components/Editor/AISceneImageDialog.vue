<template>
  <el-drawer
    :model-value="modelValue"
    title="AI 场景图"
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
          需先在设置中配置通义万相 API Key；生成结果保存在本书籍目录下的 scene_images 文件夹。
        </el-alert>

        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="100px"
          class="ai-scene-form"
        >
          <el-form-item label="节选依据">
            <div class="excerpt-box">
              <el-scrollbar max-height="140px">
                <pre class="excerpt-text">{{ excerpt }}</pre>
              </el-scrollbar>
            </div>
            <div class="excerpt-hint">
              以上为选中正文，「画面描述」请改为适合绘图的场景要素（主体、环境、光线、氛围）。
            </div>
          </el-form-item>

          <el-form-item label="输出尺寸">
            <el-select v-model="form.outputSize" placeholder="选择比例" style="width: 100%">
              <el-option
                v-for="opt in sizeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="画风">
            <el-select v-model="form.style" placeholder="可选画风" style="width: 100%" clearable>
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

          <el-form-item label="景别">
            <el-select v-model="form.shotRange" placeholder="可选" style="width: 100%" clearable>
              <el-option
                v-for="opt in shotRangeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="环境">
            <el-select v-model="form.setting" placeholder="可选" style="width: 100%" clearable>
              <el-option
                v-for="opt in settingOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="光线">
            <el-select v-model="form.lighting" placeholder="可选" style="width: 100%" clearable>
              <el-option
                v-for="opt in lightingOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="画面描述" prop="prompt">
            <el-input
              v-model="form.prompt"
              type="textarea"
              :rows="5"
              placeholder="描述场景、人物、环境、氛围等，支持中英文，建议画面向表述"
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
                AI 提炼画面（DeepSeek）
              </el-button>
              <span v-if="refineError" class="refine-error">{{ refineError }}</span>
            </div>
          </el-form-item>

          <el-form-item label="反向提示词">
            <el-input
              v-model="form.negativePrompt"
              type="textarea"
              :rows="2"
              placeholder="不希望出现的元素，如：模糊、畸形、文字水印（可选）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>

        <el-alert v-if="generating" type="info" :closable="false" show-icon class="generating-hint">
          正在生成场景图，请稍候…
        </el-alert>

        <div v-if="generatedList.length > 0" class="generated-section">
          <div class="section-title">本次生成的图片（可继续生成多张）</div>
          <div v-for="(item, index) in generatedList" :key="item.localPath" class="generated-block">
            <div class="generated-thumb-wrap">
              <img :src="item.previewUrl" :alt="`场景图 ${index + 1}`" class="generated-thumb" />
            </div>
            <div class="path-row">
              <span class="path-label">保存路径</span>
              <el-input :model-value="item.localPath" readonly class="path-input">
                <template #append>
                  <el-button @click="copyPath(item.localPath)">复制</el-button>
                </template>
              </el-input>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-scene-drawer-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">
          {{ generatedList.length > 0 ? '再生成一张' : '生成场景图' }}
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

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bookName: { type: String, default: '' },
  /** 完整选中文本（只读展示 + 提炼依据） */
  excerpt: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

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
  { value: '1280*720', label: '横版 1280×720（推荐场景）' },
  { value: '1280*1280', label: '方图 1280×1280' }
]

const styleOptions = [
  {
    value: 'anime',
    label: '日系动画',
    desc: '二次元插画',
    prompt: '日本动画风格，二次元，精致插画'
  },
  {
    value: 'ghibli',
    label: '吉卜力风格',
    desc: '手绘、治愈',
    prompt: '吉卜力动画风格，手绘感，柔和色彩，治愈系'
  },
  {
    value: 'retro_anime',
    label: '复古日漫',
    desc: '赛璐璐',
    prompt: '复古日本动画风格，赛璐璐上色，怀旧'
  },
  {
    value: 'photorealistic',
    label: '写实摄影',
    desc: '自然光影',
    prompt: '写实摄影风格，自然光影，电影感'
  },
  { value: '3d_render', label: '3D 渲染', desc: 'CG 立体感', prompt: '3D 渲染，CG 插画，立体感' },
  {
    value: 'pixar',
    label: '欧美卡通',
    desc: '动画渲染',
    prompt: '欧美3D动画风格，皮克斯风格，卡通渲染'
  },
  { value: 'guofeng', label: '国风插画', desc: '古风场景', prompt: '国风插画，古风场景，古典意境' },
  { value: 'watercolor', label: '水彩插画', desc: '柔和晕染', prompt: '水彩插画，柔和晕染' },
  { value: 'ink_wash', label: '水墨画', desc: '留白意境', prompt: '中国水墨画风格，留白，意境' },
  {
    value: 'oil_painting',
    label: '厚涂插画',
    desc: '油画质感',
    prompt: '厚涂插画，油画质感，笔触明显'
  },
  { value: 'cyberpunk', label: '赛博朋克', desc: '霓虹科幻', prompt: '赛博朋克风格，霓虹灯，科幻' },
  { value: 'pixel_art', label: '像素艺术', desc: '复古像素', prompt: '像素艺术，复古游戏风格' }
]

const shotRangeOptions = [
  { value: '', label: '不指定' },
  { value: 'wide', label: '远景·大环境' },
  { value: 'medium', label: '中景·人物与场景' },
  { value: 'close', label: '近景/特写' }
]

const settingOptions = [
  { value: '', label: '不指定' },
  { value: 'indoor', label: '室内' },
  { value: 'outdoor', label: '室外' }
]

const lightingOptions = [
  { value: '', label: '不指定' },
  { value: 'day', label: '白天' },
  { value: 'dusk', label: '黄昏' },
  { value: 'night', label: '夜晚/弱光' }
]

const formRules = computed(() => ({
  prompt: [
    { required: true, message: '请输入画面描述', trigger: 'blur' },
    { min: 5, message: '描述至少 5 个字符', trigger: 'blur' }
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
  return o && o.value ? o.label.replace(/^不指定$/, '').replace(/·/g, ' ') : ''
}

function buildFullPrompt() {
  const isSquare = form.value.outputSize === '1280*1280'
  const parts = [
    isSquare
      ? '方形画幅场景插图，环境氛围明确，构图完整'
      : '横向宽画幅场景插图，环境氛围明确，构图完整'
  ]
  const styleKey = form.value.style
  if (styleKey) {
    const s = styleOptions.find((o) => o.value === styleKey)
    if (s?.prompt) parts.push(s.prompt)
  }
  parts.push('。场景与内容：')
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
    ElMessage.warning('节选为空')
    return
  }
  if (!window.electron?.refineSceneVisualPromptWithAI) {
    ElMessage.error('当前环境不支持 AI 提炼')
    return
  }
  refining.value = true
  refineError.value = ''
  try {
    const res = await refineSceneVisualPromptWithAI(text)
    if (res?.success && res.content) {
      form.value.prompt = String(res.content).trim().slice(0, 500)
      ElMessage.success('已填入提炼后的画面描述，可继续修改')
    } else {
      refineError.value = res?.message || '提炼失败'
      ElMessage.error(refineError.value)
    }
  } catch (e) {
    refineError.value = e?.message || '提炼请求异常'
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
    ElMessage.error('书籍名称为空，无法生成')
    return
  }
  if (!window.electron?.generateAISceneImage) {
    ElMessage.error('当前环境不支持生成场景图')
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
      ElMessage.success('已生成并保存')
    } else {
      ElMessage.error(res?.message || '生成场景图失败')
    }
  } catch (e) {
    ElMessage.error(e?.message || '生成异常')
  } finally {
    generating.value = false
  }
}

async function copyPath(p) {
  if (!p) return
  try {
    await navigator.clipboard.writeText(p)
    ElMessage.success('路径已复制')
  } catch {
    ElMessage.error('复制失败')
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
