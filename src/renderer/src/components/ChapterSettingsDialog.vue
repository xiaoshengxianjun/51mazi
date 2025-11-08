<template>
  <el-dialog
    :model-value="visible"
    title="正文设置"
    width="580px"
    :close-on-click-modal="false"
    @close="handleClose"
    @update:model-value="(val) => emit('update:visible', val)"
  >
    <div class="settings-content">
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
            <span class="label">第5个：</span>
            <span class="preview-text">{{ getPreviewText(5) }}</span>
          </div>
          <div class="preview-item">
            <span class="label">第10个：</span>
            <span class="preview-text">{{ getPreviewText(10) }}</span>
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
        <el-button type="warning" :loading="reformatLoading" @click="handleReformat"
          >重新格式化章节编号</el-button
        >
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
  suffixType: '章',
  targetWords: 2000
})

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
      settings.value = incoming
    }
  }
)

// 获取预览文本
function getPreviewText(number) {
  return `第${number}${settings.value.suffixType}`
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
      '确定要修改章节名称格式吗？这将重命名所有现有章节，此操作不可恢复！',
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
      suffixType: settings.value.suffixType,
      targetWords:
        Number.isFinite(targetWordsValue) && targetWordsValue > 0 ? targetWordsValue : 2000
    }

    const result = await window.electron.updateChapterFormat(props.bookName, cleanSettings)

    if (result.success) {
      ElMessage.success('章节名称格式修改成功')
      emit('settings-changed', settings.value)
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
    emit('reformat-requested', { suffixType: settings.value.suffixType })

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
  padding: 16px 0;
}

.setting-section {
  margin-bottom: 20px;

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

.warning-section {
  margin-top: 16px;
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
