<template>
  <el-drawer
    :model-value="modelValue"
    title="AI 生成人物图"
    size="700px"
    direction="rtl"
    class="ai-character-drawer"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="ai-character-drawer-content">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="ai-character-drawer-form"
      >
        <el-form-item v-if="characterName" label="当前人物">
          <span class="character-name-tip">{{ characterName }}</span>
        </el-form-item>

        <el-form-item prop="style" label="图片风格">
          <el-select v-model="form.style" placeholder="请选择画风" style="width: 100%" clearable>
            <el-option
              v-for="opt in styleOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            >
              <div class="style-option">
                <span>{{ opt.label }}</span>
                <span class="style-desc">{{ opt.desc }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item prop="prompt" label="形象描述">
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="4"
            placeholder="描述人物外貌、气质、穿着、表情等，用于生成竖版全身人物图。可结合「形象介绍」填写，支持中英文，最多 500 字。"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="构图与姿态">
          <el-select
            v-model="form.pose"
            placeholder="可选：人物姿态/构图"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="opt in poseOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="反向提示词">
          <el-input
            v-model="form.negativePrompt"
            type="textarea"
            :rows="2"
            placeholder="不希望出现的元素，如：模糊、变形、多手、多脚（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <div class="form-tip">输出尺寸：720×1280 竖版全身人物图</div>
      </el-form>

      <!-- 已生成的人物图列表 -->
      <div v-if="generatedList.length > 0" class="generated-section">
        <div class="section-title">
          已生成的人物图（共 {{ generatedList.length }} 张，点击选择一张后确认使用）
        </div>
        <div class="generated-grid">
          <div
            v-for="(item, index) in generatedList"
            :key="item.localPath"
            class="generated-item"
            :class="{ selected: selectedPath === item.localPath }"
            @click="selectedPath = item.localPath"
          >
            <img :src="item.previewUrl" :alt="`人物图 ${index + 1}`" />
          </div>
        </div>
      </div>

      <el-alert v-if="generating" type="info" :closable="false" show-icon class="generating-hint">
        正在生成人物图中，请勿关闭
      </el-alert>
      <div class="ai-character-drawer-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">
          {{ generatedList.length > 0 ? '再生成一张' : '生成人物图' }}
        </el-button>
        <el-button
          v-if="generatedList.length > 0"
          type="success"
          :disabled="!selectedPath"
          @click="handleConfirmUse"
        >
          确认使用
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  generateAICharacterImage,
  confirmAICharacterImage,
  discardAICharacterImages
} from '@renderer/service/tongyiwanxiang'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 书籍名称，用于保存路径 */
  bookName: { type: String, default: '' },
  /** 当前编辑的人物姓名，仅用于展示 */
  characterName: { type: String, default: '' },
  /** 人物形象介绍，打开抽屉时预填到提示词 */
  appearance: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'character-image-generated'])

const formRef = ref(null)
const generating = ref(false)
const generatedList = ref([]) // { localPath, previewUrl }
const selectedPath = ref('')

const form = ref({
  style: '',
  prompt: '',
  pose: '',
  negativePrompt: ''
})

// 固定尺寸：竖版全身
const FIXED_SIZE = '720*1280'

/**
 * 图片风格选项
 * 设计原则：用户选项名清晰好选；prompt 使用通义万相文档推荐的「风格」维度用词（如漫画、摄影、水彩、皮克斯等），
 * 简短、单一概念，便于模型准确匹配画风。参考：提示词 = 主体 + 场景 + 风格。
 */
const styleOptions = [
  {
    value: 'anime',
    label: '日系动画',
    desc: '现代日本动画、二次元',
    prompt: '日本动画风格，二次元，精致插画'
  },
  {
    value: 'ghibli',
    label: '吉卜力风格',
    desc: '手绘动画、治愈系',
    prompt: '吉卜力动画风格，手绘感，柔和色彩，治愈系'
  },
  {
    value: 'retro_anime',
    label: '复古日漫',
    desc: '赛璐璐、怀旧动画',
    prompt: '复古日本动画风格，赛璐璐上色，怀旧'
  },
  {
    value: 'photorealistic',
    label: '写实摄影',
    desc: '真人、自然光影',
    prompt: '写实摄影风格，真人，自然光影'
  },
  {
    value: '3d_render',
    label: '3D 渲染',
    desc: '游戏 CG、立体感',
    prompt: '3D 渲染，CG 插画，立体感'
  },
  {
    value: 'pixar',
    label: '欧美卡通',
    desc: '皮克斯/迪士尼风',
    prompt: '欧美3D动画风格，皮克斯风格，卡通渲染'
  },
  {
    value: 'guofeng',
    label: '国风插画',
    desc: '古风、古典服饰',
    prompt: '国风插画，古风，古典服饰'
  },
  {
    value: 'watercolor',
    label: '水彩插画',
    desc: '柔和晕染、纸感',
    prompt: '水彩插画，柔和晕染'
  },
  {
    value: 'ink_wash',
    label: '水墨画',
    desc: '中国水墨、留白',
    prompt: '中国水墨画风格，留白，意境'
  },
  {
    value: 'oil_painting',
    label: '厚涂插画',
    desc: '油画质感、笔触',
    prompt: '厚涂插画，油画质感，笔触明显'
  },
  {
    value: 'cyberpunk',
    label: '赛博朋克',
    desc: '科幻、霓虹',
    prompt: '赛博朋克风格，霓虹灯，科幻'
  },
  {
    value: 'pixel_art',
    label: '像素艺术',
    desc: '复古游戏风',
    prompt: '像素艺术，复古游戏风格'
  }
]

/** 构图与姿态：可选，增强画面描述 */
const poseOptions = [
  { value: '', label: '不指定' },
  { value: 'standing', label: '站姿全身' },
  { value: 'half_body', label: '竖版半身特写' },
  { value: 'dynamic', label: '动态姿势' },
  { value: 'portrait', label: '正面立绘' },
  { value: 'side', label: '侧面/侧身' }
]

const rules = {
  prompt: [
    { required: true, message: '请输入人物形象描述', trigger: 'blur' },
    { min: 5, message: '描述至少 5 个字符，便于生成更准确', trigger: 'blur' }
  ]
}

// 打开抽屉时预填
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.value.prompt = (props.appearance || '').trim()
      form.value.style = ''
      form.value.pose = ''
      form.value.negativePrompt = ''
      generatedList.value = []
      selectedPath.value = ''
    } else {
      if (generatedList.value.length > 0) {
        discardAICharacterImages({ bookName: props.bookName }).catch(() => {})
      }
    }
  }
)

/** 根据表单拼接完整提示词：竖版全身 + 风格 + 形象描述 + 姿态 */
function buildFullPrompt() {
  const parts = ['竖版全身人物立绘，清晰完整的人物']
  const styleKey = form.value.style
  if (styleKey) {
    const styleOpt = styleOptions.find((o) => o.value === styleKey)
    if (styleOpt?.prompt) parts.push(styleOpt.prompt)
  }
  parts.push('。人物形象：')
  parts.push(form.value.prompt.trim())
  const poseKey = form.value.pose
  if (poseKey) {
    const poseOpt = poseOptions.find((o) => o.value === poseKey)
    if (poseOpt?.label && poseOpt.label !== '不指定') parts.push('，' + poseOpt.label)
  }
  return parts.join('')
}

async function handleGenerate() {
  try {
    await formRef.value.validate()
    const bookName = (props.bookName || '').trim()
    if (!bookName) {
      ElMessage.error('书籍名称为空，无法生成')
      return
    }
    generating.value = true
    ElMessage.info('正在生成人物图，请勿关闭')
    const fullPrompt = buildFullPrompt()
    const res = await generateAICharacterImage({
      prompt: fullPrompt,
      size: FIXED_SIZE,
      bookName,
      negativePrompt: (form.value.negativePrompt || '').trim() || undefined
    })
    if (res?.success && res.localPath) {
      const previewUrl = `file://${res.localPath}`
      generatedList.value.push({ localPath: res.localPath, previewUrl })
      selectedPath.value = res.localPath
      ElMessage.success('已生成，请选择一张确认使用或继续生成')
    } else {
      ElMessage.error(res?.message || '生成人物图失败')
    }
  } catch (error) {
    if (error !== false) ElMessage.error(error?.message || '请检查表单输入')
  } finally {
    generating.value = false
  }
}

function handleCancel() {
  if (generatedList.value.length > 0) {
    discardAICharacterImages({ bookName: props.bookName }).catch(() => {})
  }
  emit('update:modelValue', false)
}

async function handleConfirmUse() {
  if (!selectedPath.value) return
  const bookName = (props.bookName || '').trim()
  if (!bookName) return
  try {
    const res = await confirmAICharacterImage({
      bookName,
      chosenPath: selectedPath.value
    })
    if (res?.success && res.localPath) {
      emit('character-image-generated', { localPath: res.localPath })
      emit('update:modelValue', false)
      ElMessage.success('已设为人物图，保存人物后生效')
    } else {
      ElMessage.error(res?.message || '确认失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '确认失败')
  }
}
</script>

<style lang="scss" scoped>
.ai-character-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.ai-character-drawer-form {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}
.character-name-tip {
  color: var(--el-text-color-regular);
  font-weight: 500;
}
.style-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  .style-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: -8px;
  margin-bottom: 12px;
  padding: 0 4px;
}
.generated-section {
  flex: 0 0 auto;
  overflow-y: auto;
  max-height: 320px;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}
.section-title {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
}
.generated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
.generated-item {
  aspect-ratio: 9 / 16;
  border-radius: 8px;
  overflow: hidden;
  border: 3px solid transparent;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  background: var(--el-fill-color);
  &:hover {
    border-color: var(--el-border-color);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
  &.selected {
    border-color: var(--el-color-success);
    box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.3);
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}
.generating-hint {
  margin-bottom: 12px;
}
.ai-character-drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  flex-shrink: 0;
}
</style>
