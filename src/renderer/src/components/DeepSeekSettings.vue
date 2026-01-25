<template>
  <el-dialog
    v-model="dialogVisible"
    title="DeepSeek AI 设置"
    width="500px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="120px">
      <el-form-item label="API Key">
        <el-input
          v-model="apiKey"
          type="password"
          show-password
          placeholder="请输入 DeepSeek API Key"
          clearable
        />
        <div style="margin-top: 8px; font-size: 12px; color: #999">
          <el-link
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            type="primary"
            :underline="false"
          >
            获取 API Key →
          </el-link>
        </div>
        <div style="margin-top: 4px; font-size: 12px; color: #999">
          配置 API Key 后可使用 AI 随机起名功能
        </div>
      </el-form-item>
      <el-form-item v-if="apiKeyStatus !== null">
        <el-alert
          :type="apiKeyStatus ? 'success' : 'error'"
          :title="apiKeyStatus ? 'API Key 验证成功' : 'API Key 验证失败'"
          :closable="false"
          show-icon
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button :loading="validating" @click="handleValidate">验证</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getDeepSeekApiKey,
  setDeepSeekApiKey,
  validateDeepSeekApiKey
} from '@renderer/service/deepseek'

const dialogVisible = ref(false)
const apiKey = ref('')
const saving = ref(false)
const validating = ref(false)
const apiKeyStatus = ref(null) // null: 未验证, true: 有效, false: 无效

function open() {
  dialogVisible.value = true
  loadApiKey()
}

function handleClose() {
  dialogVisible.value = false
  apiKeyStatus.value = null
}

async function loadApiKey() {
  try {
    const result = await getDeepSeekApiKey()
    if (result.success) {
      apiKey.value = result.apiKey || ''
    }
  } catch (error) {
    console.error('加载 API Key 失败:', error)
  }
}

async function handleSave() {
  if (!apiKey.value.trim()) {
    ElMessage.warning('请输入 API Key')
    return
  }

  saving.value = true
  try {
    const result = await setDeepSeekApiKey(apiKey.value.trim())
    if (result.success) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleValidate() {
  if (!apiKey.value.trim()) {
    ElMessage.warning('请先输入 API Key')
    return
  }

  validating.value = true
  apiKeyStatus.value = null
  try {
    // 先保存临时 API Key 用于验证
    await setDeepSeekApiKey(apiKey.value.trim())
    const result = await validateDeepSeekApiKey()
    if (result.success && result.isValid) {
      apiKeyStatus.value = true
      ElMessage.success('API Key 验证成功')
    } else {
      apiKeyStatus.value = false
      ElMessage.error(result.message || 'API Key 验证失败，请检查 Key 是否正确')
    }
  } catch (error) {
    console.error('验证失败:', error)
    apiKeyStatus.value = false
    ElMessage.error('验证失败，请检查网络连接')
  } finally {
    validating.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.el-form-item {
  margin-bottom: 20px;
}
</style>
