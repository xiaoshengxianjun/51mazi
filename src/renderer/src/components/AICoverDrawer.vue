<template>
  <el-drawer
    :model-value="modelValue"
    title="AI生成封面"
    size="900px"
    direction="rtl"
    class="ai-cover-drawer"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="ai-cover-drawer-content">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="ai-cover-drawer-form"
      >
        <el-row :gutter="16">
          <el-col :span="10">
            <el-form-item prop="penName" label="笔名">
              <el-input
                v-model="form.penName"
                placeholder="请输入笔名"
                maxlength="10"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="14">
            <el-form-item prop="coverSize" label="封面尺寸">
              <el-select v-model="form.coverSize" placeholder="请选择封面尺寸" style="width: 100%">
                <el-option
                  v-for="size in coverSizeOptions"
                  :key="size.value"
                  :label="size.label"
                  :value="size.value"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center">
                    <span>{{ size.label }}</span>
                    <span style="color: #909399; font-size: 11px">{{ size.platform }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 封面要求：拆分为三部分，让提示词更明确 -->
        <el-form-item prop="titlePrompt" label="书名要求">
          <el-input
            v-model="form.titlePrompt"
            type="textarea"
            :rows="2"
            placeholder="请输入书名排版要求：例如“书名居中大字、金色描边、毛笔字、可读性强、不要变形”等（可选，最多300字）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="authorPrompt" label="笔名要求">
          <el-input
            v-model="form.authorPrompt"
            type="textarea"
            :rows="2"
            placeholder="请输入笔名排版要求：例如“笔名放底部小字、白色、简洁清晰”等（可选，最多300字）"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="backgroundPrompt" label="背景要求">
          <div v-if="selectedPromptTags.length > 0" class="selected-tags">
            <el-tag
              v-for="(tag, index) in selectedPromptTags"
              :key="index"
              class="prompt-tag"
              closable
              @close="removePromptTag(index)"
            >
              {{ tag }}
            </el-tag>
          </div>
          <el-input
            v-model="form.backgroundPrompt"
            type="textarea"
            :rows="4"
            placeholder="请输入封面背景/画面要求：风格、元素、色彩、构图、氛围等（支持中英文，最多300字）。也可点击下方标签快速选择。"
            maxlength="300"
            show-word-limit
          />
          <div class="prompt-presets">
            <div
              v-for="category in promptPresetCategories"
              :key="category.key"
              class="preset-category"
            >
              <div class="category-title">
                <span>{{ category.label }}</span>
                <el-button
                  v-if="category.recommended && form.bookType"
                  text
                  type="primary"
                  size="small"
                  @click="applyRecommendedTags(category.key)"
                >
                  一键应用推荐
                </el-button>
              </div>
              <div class="preset-tags">
                <el-tag
                  v-for="tag in getCategoryTags(category.key)"
                  :key="tag"
                  :type="isTagSelected(tag) ? 'primary' : 'info'"
                  class="preset-tag"
                  :class="{ selected: isTagSelected(tag) }"
                  @click="togglePromptTag(tag)"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <!-- 已生成的封面：多图排列，点击选择一张后确认使用 -->
      <div v-if="generatedList.length > 0" class="generated-section">
        <div class="section-title">
          已生成的封面（共 {{ generatedList.length }} 张，点击选择一张后确认使用）
        </div>
        <div class="generated-grid">
          <div
            v-for="(item, index) in generatedList"
            :key="item.localPath"
            class="generated-item"
            :class="{ selected: selectedPath === item.localPath }"
            @click="selectedPath = item.localPath"
          >
            <img :src="item.previewUrl" :alt="`封面 ${index + 1}`" />
          </div>
        </div>
      </div>

      <el-alert v-if="generating" type="info" :closable="false" show-icon class="generating-hint">
        正在努力生图中，请勿关闭弹框
      </el-alert>
      <div class="ai-cover-drawer-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">
          {{ generatedList.length > 0 ? '再生成一张' : '生成封面' }}
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
import { generateAICover, confirmAICover, discardAICovers } from '@renderer/service/tongyiwanxiang'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  bookName: { type: String, default: '' },
  bookType: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'cover-generated'])

const formRef = ref(null)
const generating = ref(false)
const selectedPromptTags = ref([])
const generatedList = ref([]) // { localPath, previewUrl }
const selectedPath = ref('')
const form = ref({
  bookType: '',
  penName: '',
  coverSize: '600x800',
  backgroundPrompt: '',
  titlePrompt: '',
  authorPrompt: '',
  negativePrompt: '' // 负向提示词（可选）。此前被引用但未定义，这里补齐避免潜在运行时问题
})

const rules = {
  penName: [
    { required: true, message: '请输入笔名', trigger: 'blur' },
    { max: 10, message: '笔名不能超过10个字符', trigger: 'blur' }
  ],
  coverSize: [{ required: true, message: '请选择封面尺寸', trigger: 'change' }],
  backgroundPrompt: [
    { required: true, message: '请输入封面背景要求', trigger: 'blur' },
    { min: 10, message: '封面背景要求至少10个字符', trigger: 'blur' }
  ]
}

const coverSizeOptions = [
  {
    value: '600x800',
    label: '600×800 像素',
    platform: '多数主流平台（起点、番茄、创世、云起等）',
    targetWidth: 600,
    targetHeight: 800,
    apiWidth: 1200,
    apiHeight: 1600
  },
  {
    value: '200x280',
    label: '200×280 像素',
    platform: '晋江文学城作品封面',
    targetWidth: 200,
    targetHeight: 280,
    apiWidth: 1280,
    apiHeight: 1792
  },
  {
    value: '400x560',
    label: '400×560 像素',
    platform: '黑岩小说',
    targetWidth: 400,
    targetHeight: 560,
    apiWidth: 1280,
    apiHeight: 1792
  },
  {
    value: '300x400',
    label: '300×400 像素',
    platform: '逐浪小说',
    targetWidth: 300,
    targetHeight: 400,
    apiWidth: 1200,
    apiHeight: 1600
  },
  {
    value: '240x320',
    label: '240×320 像素',
    platform: '纵横中文网',
    targetWidth: 240,
    targetHeight: 320,
    apiWidth: 1200,
    apiHeight: 1600
  }
]

const promptPresets = {
  style: [
    '古风',
    '现代',
    '科幻',
    '唯美',
    '写实',
    '二次元',
    '水墨',
    '油画',
    '水彩',
    '插画',
    '简约',
    '华丽',
    '暗黑',
    '清新',
    '复古'
  ],
  element: [
    '主角',
    '双人',
    '群像',
    '场景',
    '道具',
    '武器',
    '建筑',
    '风景',
    '天空',
    '云朵',
    '山峰',
    '海洋',
    '森林',
    '城市',
    '古建筑'
  ],
  color: [
    '暖色调',
    '冷色调',
    '高对比度',
    '低饱和度',
    '高饱和度',
    '黑白',
    '金色',
    '红色',
    '蓝色',
    '绿色',
    '紫色',
    '粉色',
    '橙色',
    '渐变色',
    '单色调'
  ],
  composition: [
    '居中构图',
    '对称构图',
    '三分法构图',
    '远景',
    '中景',
    '近景',
    '特写',
    '仰视',
    '俯视',
    '平视',
    '留白',
    '满构图',
    '对角线构图',
    'S型构图',
    '框架构图'
  ],
  atmosphere: [
    '神秘',
    '浪漫',
    '热血',
    '悲伤',
    '温馨',
    '紧张',
    '宁静',
    '激烈',
    '梦幻',
    '史诗',
    '悬疑',
    '恐怖',
    '治愈',
    '激昂',
    '忧郁'
  ]
}

const bookTypeRecommendations = {
  xuanhua: {
    style: ['古风', '玄幻', '神秘'],
    element: ['主角', '武器', '古建筑'],
    color: ['金色', '紫色', '渐变色'],
    atmosphere: ['神秘', '热血', '史诗']
  },
  xianxia: {
    style: ['古风', '唯美', '水墨'],
    element: ['主角', '山峰', '云朵'],
    color: ['蓝色', '白色', '渐变色'],
    atmosphere: ['神秘', '宁静', '梦幻']
  },
  qihuan: {
    style: ['奇幻', '唯美', '插画'],
    element: ['主角', '魔法', '森林'],
    color: ['紫色', '蓝色', '渐变色'],
    atmosphere: ['神秘', '梦幻', '浪漫']
  },
  dushi: {
    style: ['现代', '写实', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['暖色调', '高对比度'],
    atmosphere: ['温馨', '紧张', '治愈']
  },
  kehuan: {
    style: ['科幻', '未来', '写实'],
    element: ['主角', '科技', '城市'],
    color: ['蓝色', '冷色调', '高对比度'],
    atmosphere: ['紧张', '神秘', '史诗']
  },
  wuxia: {
    style: ['古风', '写实', '水墨'],
    element: ['主角', '武器', '山峰'],
    color: ['暖色调', '渐变色'],
    atmosphere: ['热血', '激昂', '神秘']
  },
  yanqing: {
    style: ['唯美', '清新', '插画'],
    element: ['双人', '浪漫', '风景'],
    color: ['粉色', '暖色调', '渐变色'],
    atmosphere: ['浪漫', '温馨', '治愈']
  },
  lishi: {
    style: ['古风', '写实', '复古'],
    element: ['主角', '古建筑', '场景'],
    color: ['暖色调', '低饱和度'],
    atmosphere: ['史诗', '神秘', '宁静']
  },
  xuanyi: {
    style: ['暗黑', '写实', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['冷色调', '低饱和度', '黑白'],
    atmosphere: ['悬疑', '紧张', '神秘']
  },
  junshi: {
    style: ['写实', '现代', '简约'],
    element: ['主角', '武器', '场景'],
    color: ['冷色调', '高对比度'],
    atmosphere: ['紧张', '激烈', '热血']
  },
  youxi: {
    style: ['二次元', '插画', '写实'],
    element: ['主角', '武器', '场景'],
    color: ['高对比度', '渐变色', '暖色调'],
    atmosphere: ['热血', '紧张', '激昂']
  },
  tiyu: {
    style: ['写实', '现代', '简约'],
    element: ['主角', '场景', '运动'],
    color: ['暖色调', '高对比度', '高饱和度'],
    atmosphere: ['热血', '激昂', '紧张']
  },
  xianshi: {
    style: ['写实', '现代', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['暖色调', '低饱和度', '高对比度'],
    atmosphere: ['温馨', '治愈', '宁静']
  },
  tongren: {
    style: ['二次元', '插画', '唯美'],
    element: ['主角', '双人', '场景'],
    color: ['暖色调', '渐变色', '高饱和度'],
    atmosphere: ['浪漫', '热血', '梦幻']
  },
  qingchun: {
    style: ['清新', '唯美', '插画'],
    element: ['主角', '双人', '校园'],
    color: ['暖色调', '粉色', '清新'],
    atmosphere: ['治愈', '温馨', '浪漫']
  },
  zhichang: {
    style: ['现代', '写实', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['暖色调', '冷色调', '高对比度'],
    atmosphere: ['紧张', '治愈', '温馨']
  },
  xiaoyuan: {
    style: ['清新', '唯美', '插画'],
    element: ['主角', '双人', '校园'],
    color: ['暖色调', '清新', '渐变色'],
    atmosphere: ['治愈', '温馨', '浪漫']
  },
  erciyuan: {
    style: ['二次元', '插画', '唯美'],
    element: ['主角', '双人', '场景'],
    color: ['高饱和度', '渐变色', '暖色调'],
    atmosphere: ['梦幻', '治愈', '浪漫']
  },
  qingxiaoshuo: {
    style: ['二次元', '插画', '清新'],
    element: ['主角', '双人', '风景'],
    color: ['暖色调', '渐变色', '清新'],
    atmosphere: ['治愈', '浪漫', '温馨']
  },
  duanpian: {
    style: ['简约', '写实', '唯美'],
    element: ['主角', '场景', '留白'],
    color: ['暖色调', '低饱和度', '渐变色'],
    atmosphere: ['宁静', '治愈', '神秘']
  },
  other: {
    style: ['写实', '唯美', '简约'],
    element: ['主角', '场景', '风景'],
    color: ['暖色调', '渐变色', '高对比度'],
    atmosphere: ['温馨', '宁静', '治愈']
  }
}

const promptPresetCategories = [
  { key: 'style', label: '风格', recommended: true },
  { key: 'element', label: '元素', recommended: true },
  { key: 'color', label: '色彩', recommended: true },
  { key: 'composition', label: '构图', recommended: false },
  { key: 'atmosphere', label: '氛围', recommended: true }
]

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.value.bookType = props.bookType || ''
      form.value.penName = ''
      form.value.coverSize = '600x800'
      form.value.backgroundPrompt = ''
      form.value.titlePrompt = ''
      form.value.authorPrompt = ''
      form.value.negativePrompt = ''
      selectedPromptTags.value = []
      generatedList.value = []
      selectedPath.value = ''
    } else {
      if (generatedList.value.length > 0) {
        discardAICovers({ bookName: props.bookName }).catch(() => {})
      }
    }
  }
)

function getCategoryTags(key) {
  return promptPresets[key] || []
}
function isTagSelected(tag) {
  return selectedPromptTags.value.includes(tag)
}
function togglePromptTag(tag) {
  const index = selectedPromptTags.value.indexOf(tag)
  if (index > -1) selectedPromptTags.value.splice(index, 1)
  else selectedPromptTags.value.push(tag)
  updatePromptFromTags()
}
function removePromptTag(index) {
  selectedPromptTags.value.splice(index, 1)
  updatePromptFromTags()
}
function updatePromptFromTags() {
  const tagsText = selectedPromptTags.value.join('，')
  const manualText = form.value.backgroundPrompt
    ? form.value.backgroundPrompt
        .split('，')
        .filter((text) => !selectedPromptTags.value.includes(text.trim()))
        .join('，')
    : ''
  const parts = [tagsText, manualText].filter(Boolean)
  form.value.backgroundPrompt = parts.join('，')
}

function getRecommendationsForBookType(bookType) {
  if (bookTypeRecommendations[bookType]) return bookTypeRecommendations[bookType]
  const parent = bookType && bookType.includes('_') ? bookType.split('_')[0] : null
  return parent ? bookTypeRecommendations[parent] : null
}

function applyRecommendedTags(categoryKey) {
  if (!form.value.bookType) {
    ElMessage.warning('请先选择书籍类型')
    return
  }
  const recommendations = getRecommendationsForBookType(form.value.bookType)
  if (!recommendations?.[categoryKey]) return
  recommendations[categoryKey].forEach((tag) => {
    if (!selectedPromptTags.value.includes(tag)) selectedPromptTags.value.push(tag)
  })
  updatePromptFromTags()
  ElMessage.success('已应用推荐标签')
}

async function handleGenerate() {
  try {
    await formRef.value.validate()
    const selectedSize = coverSizeOptions.find((o) => o.value === form.value.coverSize)
    if (!selectedSize) {
      ElMessage.error('请选择有效的封面尺寸')
      return
    }
    const size = `${selectedSize.apiWidth}*${selectedSize.apiHeight}`
    const bookName = (props.bookName || '').trim()
    if (!bookName) {
      ElMessage.error('请先填写书名')
      return
    }
    // 构建完整提示词：强制要求封面上显示书名和笔名，再拼接用户填写的风格/元素描述
    const penName = (form.value.penName || '').trim()
    const backgroundPrompt = (form.value.backgroundPrompt || '').trim()
    const titlePrompt = (form.value.titlePrompt || '').trim()
    const authorPrompt = (form.value.authorPrompt || '').trim()

    const backgroundPart = backgroundPrompt
      ? `封面背景/画面要求：${backgroundPrompt}`
      : '封面背景/画面要求：小说封面风格，美观大气，主体明确，画面干净。'

    // 书名/笔名要求拆分：更明确地指导模型排版与清晰度
    const titlePartBase = `封面上必须清晰、醒目地显示书名《${bookName}》，书名字形端正、可读性强，不要错别字，不要变形，不要额外添加无关文字。`
    const titlePart = titlePrompt ? `${titlePartBase} 书名排版要求：${titlePrompt}` : titlePartBase

    const authorPartBase = penName
      ? `封面上必须清晰显示作者笔名：${penName}，笔名字形端正、可读性强。`
      : ''
    const authorPart =
      authorPartBase && authorPrompt
        ? `${authorPartBase} 笔名排版要求：${authorPrompt}`
        : authorPartBase

    const fullPrompt = [backgroundPart, titlePart, authorPart].filter(Boolean).join('\n')

    generating.value = true
    ElMessage.info('正在努力生图中，不要关闭弹框')
    const res = await generateAICover({
      prompt: fullPrompt,
      size,
      bookName,
      negativePrompt: (form.value.negativePrompt || '').trim() || undefined
    })
    if (res?.success && res.localPath) {
      const previewUrl = `file://${res.localPath}`
      generatedList.value.push({ localPath: res.localPath, previewUrl })
      selectedPath.value = res.localPath
      ElMessage.success('已生成，请在上方选择一张确认使用或继续生成')
    } else {
      ElMessage.error(res?.message || '生成封面失败')
    }
  } catch (error) {
    if (error !== false) ElMessage.error(error?.message || '请检查表单输入')
  } finally {
    generating.value = false
  }
}

function handleCancel() {
  if (generatedList.value.length > 0) {
    discardAICovers({ bookName: props.bookName }).catch(() => {})
  }
  emit('update:modelValue', false)
}

async function handleConfirmUse() {
  if (!selectedPath.value) return
  const bookName = (props.bookName || '').trim()
  if (!bookName) return
  try {
    const res = await confirmAICover({ bookName, chosenPath: selectedPath.value })
    if (res?.success && res.localPath) {
      emit('cover-generated', { localPath: res.localPath })
      emit('update:modelValue', false)
      ElMessage.success('已设为书籍封面，保存书籍后将写入书籍目录')
    } else {
      ElMessage.error(res?.message || '确认失败')
    }
  } catch (error) {
    ElMessage.error(error?.message || '确认失败')
  }
}
</script>

<style lang="scss" scoped>
.ai-cover-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.ai-cover-drawer-form {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}
.generated-section {
  // 定位：位于容器底部、footer 上方
  flex: 0 0 auto;
  overflow-y: auto;
  max-height: 320px;
  padding: 12px 20px;
  border-top: 1px solid #ebeef5;
  background: #fafafa;
}
.section-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}
.generated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.generated-item {
  aspect-ratio: 3/4;
  border-radius: 8px;
  overflow: hidden;
  border: 3px solid transparent;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  background: #eee;
  &:hover {
    border-color: #c0c4cc;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
  &.selected {
    border-color: #67c23a;
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

.ai-cover-drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  flex-shrink: 0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  min-height: 40px;
  .prompt-tag {
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      transform: scale(1.05);
    }
  }
}
.prompt-presets {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  max-height: 400px;
  overflow-y: auto;
}
.preset-category {
  margin-bottom: 20px;
  &:last-child {
    margin-bottom: 0;
  }
  .category-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }
  .preset-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    .preset-tag {
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
      }
      &.selected {
        background-color: #409eff;
        color: #fff;
        border-color: #409eff;
      }
    }
  }
}
</style>
