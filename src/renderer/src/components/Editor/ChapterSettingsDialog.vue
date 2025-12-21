<template>
  <el-dialog
    :model-value="visible"
    title="正文设置"
    width="580px"
    center
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
    @update:model-value="(val) => emit('update:visible', val)"
  >
    <div class="settings-content">
      <!-- 编号格式设置 -->
      <div class="setting-section">
        <h4>章节编号格式</h4>
        <div class="format-options">
          <el-radio-group v-model="settings.chapterFormat">
            <el-radio value="number">数字编号</el-radio>
            <el-radio value="hanzi">汉字编号</el-radio>
          </el-radio-group>
        </div>
      </div>

      <!-- 后缀类型设置 -->
      <div class="setting-section">
        <h4>后缀类型</h4>
        <div class="suffix-options">
          <el-radio-group v-model="settings.suffixType">
            <el-radio value="章">章</el-radio>
            <el-radio value="集">集</el-radio>
            <el-radio value="回">回</el-radio>
            <el-radio value="节">节</el-radio>
            <el-radio value="部">部</el-radio>
            <el-radio value="卷">卷</el-radio>
          </el-radio-group>
        </div>
      </div>

      <!-- 预览效果 -->
      <div class="setting-section">
        <h4>预览效果</h4>
        <div class="preview-examples">
          <div class="preview-item">
            <span class="label">第1个：</span>
            <span class="preview-text">{{ getPreviewText(1) }}</span>
          </div>
          <div class="preview-item">
            <span class="label">第12个：</span>
            <span class="preview-text">{{ getPreviewText(12) }}</span>
          </div>
          <div class="preview-item">
            <span class="label">第123个：</span>
            <span class="preview-text">{{ getPreviewText(123) }}</span>
          </div>
        </div>
      </div>

      <!-- 警告提示 -->
      <div class="warning-section">
        <el-alert
          title="注意：修改设置后，所有现有章节将被重命名"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>

      <!-- 章节目标字数 -->
      <div class="setting-section">
        <h4>章节目标字数</h4>
        <el-select
          v-model="settings.targetWords"
          placeholder="选择章节目标字数"
          class="target-select"
        >
          <el-option
            v-for="option in targetWordOptions"
            :key="option"
            :label="`${option} 字`"
            :value="option"
          />
        </el-select>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="warning" :loading="reformatLoading" @click="handleReformat">
          重新格式化章节编号
        </el-button>
        <el-button type="primary" :loading="loading" @click="handleConfirm"> 确认修改 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  bookName: {
    type: String,
    required: true
  },
  currentSettings: {
    type: Object,
    default: () => ({
      suffixType: '章',
      targetWords: 2000
    })
  }
})

const emit = defineEmits(['update:visible', 'settings-changed', 'reformat-requested'])

// 设置状态
const targetWordOptions = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]

const settings = ref({
  chapterFormat: 'number',
  suffixType: '章',
  targetWords: 2000
})

const chineseDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const chineseUnits = ['', '十', '百', '千']

function convertNumberToChinese(num) {
  const numeric = Number(num)
  if (!Number.isFinite(numeric) || numeric <= 0) return String(num)
  if (numeric >= 10000) {
    const high = Math.floor(numeric / 10000)
    const rest = numeric % 10000
    let result = `${convertNumberToChinese(high)}万`
    if (rest > 0) {
      let restChinese = convertNumberToChinese(rest)
      if (rest < 100 && restChinese.startsWith('十')) {
        restChinese = `一${restChinese}`
      }
      result += rest < 1000 ? `零${restChinese}` : restChinese
    }
    return result
  }
  const str = String(Math.floor(numeric))
  let result = ''
  let zeroFlag = false
  for (let i = 0; i < str.length; i++) {
    const digit = Number(str[i])
    const position = str.length - i - 1
    if (digit === 0) {
      zeroFlag = result.length > 0
      continue
    }
    if (zeroFlag) {
      result += chineseDigits[0]
      zeroFlag = false
    }
    result += chineseDigits[digit] + (chineseUnits[position] || '')
  }
  result = result.replace(/^一十/, '十')
  return result || chineseDigits[0]
}

// 加载状态
const loading = ref(false)
const reformatLoading = ref(false)

// 监听弹框显示状态
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      // 弹框打开时，加载当前设置
      const incoming = { ...props.currentSettings }
      if (incoming.targetWords === undefined || incoming.targetWords === null) {
        incoming.targetWords = 2000
      } else {
        const targetValue = Number(incoming.targetWords)
        incoming.targetWords = Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 2000
      }
      incoming.chapterFormat =
        incoming.chapterFormat === 'hanzi' || incoming.chapterFormat === 'number'
          ? incoming.chapterFormat
          : 'number'
      settings.value = incoming
    }
  }
)

// 获取预览文本
function getPreviewText(number) {
  const numberPart =
    settings.value.chapterFormat === 'hanzi' ? convertNumberToChinese(number) : String(number)
  return `第${numberPart}${settings.value.suffixType}`
}

// 关闭弹框
function handleClose() {
  emit('update:visible', false)
}

// 确认修改
async function handleConfirm() {
  try {
    // 确认对话框
    await ElMessageBox.confirm(
      '确定要修改正文章节设置吗？这将应用到所有现有章节，此操作不可恢复！',
      '确认修改',
      {
        confirmButtonText: '确定修改',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true

    // 调用主进程修改章节名称格式
    // 确保传递的是纯对象，避免序列化问题
    const targetWordsValue = Number(settings.value.targetWords)
    const cleanSettings = {
      chapterFormat: settings.value.chapterFormat,
      suffixType: settings.value.suffixType,
      targetWords:
        Number.isFinite(targetWordsValue) && targetWordsValue > 0 ? targetWordsValue : 2000
    }

    const result = await window.electron.updateChapterFormat(props.bookName, cleanSettings)

    if (result.success) {
      ElMessage.success('正文章节设置修改成功')
      settings.value.targetWords = cleanSettings.targetWords
      emit('settings-changed', { ...settings.value })
      emit('update:visible', false)
    } else {
      ElMessage.error(result.message || '修改失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('设置修改失败:', error)
      ElMessage.error(`操作失败: ${error.message || '未知错误'}`)
    }
  } finally {
    loading.value = false
  }
}

// 重新格式化章节编号
async function handleReformat() {
  try {
    // 确认对话框
    await ElMessageBox.confirm(
      '确定要重新格式化章节编号吗？\n\n' +
        '这将按照文件顺序重新编号所有章节，保持章节内容不变。\n' +
        '此操作不可恢复！',
      '确认重新格式化',
      {
        confirmButtonText: '确定格式化',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    reformatLoading.value = true

    // 这里需要调用父组件的重新格式化方法
    // 通过 emit 事件通知父组件
    emit('reformat-requested', {
      suffixType: settings.value.suffixType,
      chapterFormat: settings.value.chapterFormat
    })

    ElMessage.success('章节编号重新格式化请求已发送')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重新格式化失败:', error)
      ElMessage.error(`操作失败: ${error.message || '未知错误'}`)
    }
  } finally {
    reformatLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.settings-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-section {
  h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-base);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 6px;
  }
}

.format-options,
.suffix-options {
  .el-radio-group {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }

  .el-radio {
    margin-right: 0;
    min-width: 70px;

    &:last-child {
      margin-right: 0;
    }
  }
}

.preview-examples {
  background: var(--bg-mute);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;

  .label {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .preview-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-base);
    background: var(--bg-primary);
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    min-width: 60px;
    text-align: center;
  }
}

.target-select {
  width: 180px;
}

.dialog-footer {
  text-align: right;
  padding-top: 12px;

  .el-button {
    min-width: 90px;
    margin-left: 10px;

    &:first-child {
      margin-left: 0;
    }
  }
}
</style>
