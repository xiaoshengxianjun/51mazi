<template>
  <el-dialog
    v-model="dialogVisible"
    title="AI 设置"
    width="600px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form label-width="120px">
      <!-- DeepSeek -->
      <div class="config-block">
        <div class="block-title">DeepSeek</div>
        <el-form-item label="API Key">
          <div class="input-with-btn">
            <el-input
              v-model="apiKey"
              type="password"
              show-password
              placeholder="请输入 DeepSeek API Key"
              clearable
            />
            <el-button
              type="default"
              :loading="validating"
              :disabled="anyLoading || !apiKey.trim()"
              @click="handleValidateDeepSeek"
            >
              验证
            </el-button>
          </div>
          <div class="form-tip">
            <el-link
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              type="primary"
              :underline="false"
            >
              获取 API Key →
            </el-link>
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
      </div>

      <!-- 通义万相 -->
      <div class="config-block">
        <div class="block-title">通义万相</div>
        <el-form-item label="API Key">
          <div class="input-with-btn">
            <el-input
              v-model="apiKeyTongyi"
              type="password"
              show-password
              placeholder="请输入通义万相 API Key"
              clearable
            />
            <el-button
              type="default"
              :loading="validatingTongyi"
              :disabled="anyLoading || !apiKeyTongyi.trim()"
              @click="handleValidateTongyi"
            >
              验证
            </el-button>
          </div>
          <div class="form-tip">
            <el-link
              href="https://help.aliyun.com/zh/model-studio/get-api-key"
              target="_blank"
              type="primary"
              :underline="false"
            >
              获取 API Key →
            </el-link>
          </div>
        </el-form-item>
        <el-form-item v-if="apiKeyStatusTongyi !== null">
          <el-alert
            :type="apiKeyStatusTongyi ? 'success' : 'error'"
            :title="apiKeyStatusTongyi ? 'API Key 验证成功' : 'API Key 验证失败'"
            :closable="false"
            show-icon
          />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button :disabled="anyLoading" @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="anyLoading" @click="handleSave">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getDeepSeekApiKey,
  setDeepSeekApiKey,
  validateDeepSeekApiKey
} from '@renderer/service/deepseek'
import {
  getTongyiwanxiangApiKey,
  setTongyiwanxiangApiKey,
  validateTongyiwanxiangApiKey
} from '@renderer/service/tongyiwanxiang'

const dialogVisible = ref(false)
const apiKey = ref('')
const apiKeyTongyi = ref('')
const saving = ref(false)
const validating = ref(false)
const validatingTongyi = ref(false)
const apiKeyStatus = ref(null)
const apiKeyStatusTongyi = ref(null)

const anyLoading = computed(() => saving.value || validating.value || validatingTongyi.value)

function open() {
  dialogVisible.value = true
  loadAllKeys()
}

function handleClose() {
  dialogVisible.value = false
  apiKeyStatus.value = null
  apiKeyStatusTongyi.value = null
}

async function loadAllKeys() {
  try {
    const [deepRes, tongyiRes] = await Promise.all([getDeepSeekApiKey(), getTongyiwanxiangApiKey()])
    if (deepRes?.success) apiKey.value = deepRes.apiKey || ''
    if (tongyiRes?.success) apiKeyTongyi.value = tongyiRes.apiKey || ''
  } catch (error) {
    console.error('加载 API Key 失败:', error)
  }
}

let saveTimer = null

async function handleSave() {
  if (saving.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    saving.value = true
    try {
      const errs = []
      const r1 = await setDeepSeekApiKey(apiKey.value.trim())
      if (!r1?.success) errs.push(r1?.message || 'DeepSeek 保存失败')
      const r2 = await setTongyiwanxiangApiKey(apiKeyTongyi.value.trim())
      if (!r2?.success) errs.push(r2?.message || '通义万相保存失败')
      if (errs.length) {
        ElMessage.error(errs.join('；'))
      } else {
        ElMessage.success('保存成功')
        dialogVisible.value = false
      }
    } catch (error) {
      console.error('保存失败:', error)
      ElMessage.error('保存失败')
    } finally {
      saving.value = false
      saveTimer = null
    }
  }, 300)
}

let validateDeepTimer = null

async function handleValidateDeepSeek() {
  if (validating.value) return
  if (!apiKey.value.trim()) {
    ElMessage.warning('请先输入 DeepSeek API Key')
    return
  }
  if (validateDeepTimer) clearTimeout(validateDeepTimer)
  validateDeepTimer = setTimeout(async () => {
    validating.value = true
    apiKeyStatus.value = null
    try {
      await setDeepSeekApiKey(apiKey.value.trim())
      const result = await validateDeepSeekApiKey()
      if (result?.success && result.isValid) {
        apiKeyStatus.value = true
        ElMessage.success('DeepSeek API Key 验证成功')
      } else {
        apiKeyStatus.value = false
        ElMessage.error(result?.message || 'DeepSeek API Key 验证失败')
      }
    } catch (error) {
      console.error('验证 DeepSeek 失败:', error)
      apiKeyStatus.value = false
      ElMessage.error('验证失败，请检查网络连接')
    } finally {
      validating.value = false
      validateDeepTimer = null
    }
  }, 500)
}

let validateTongyiTimer = null

async function handleValidateTongyi() {
  if (validatingTongyi.value) return
  if (!apiKeyTongyi.value.trim()) {
    ElMessage.warning('请先输入通义万相 API Key')
    return
  }
  if (validateTongyiTimer) clearTimeout(validateTongyiTimer)
  validateTongyiTimer = setTimeout(async () => {
    validatingTongyi.value = true
    apiKeyStatusTongyi.value = null
    try {
      await setTongyiwanxiangApiKey(apiKeyTongyi.value.trim())
      const result = await validateTongyiwanxiangApiKey()
      if (result?.success && result.isValid) {
        apiKeyStatusTongyi.value = true
        ElMessage.success('通义万相 API Key 验证成功')
      } else {
        apiKeyStatusTongyi.value = false
        ElMessage.error(result?.message || '通义万相 API Key 验证失败')
      }
    } catch (error) {
      console.error('验证通义万相失败:', error)
      apiKeyStatusTongyi.value = false
      ElMessage.error('验证失败，请检查网络连接')
    } finally {
      validatingTongyi.value = false
      validateTongyiTimer = null
    }
  }, 500)
}

defineExpose({ open })
</script>

<style scoped>
.config-block {
  margin-bottom: 24px;
}
.config-block:last-child {
  margin-bottom: 0;
}
.block-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.input-with-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.input-with-btn :deep(.el-input) {
  flex: 1;
}
.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}
.el-form-item {
  margin-bottom: 20px;
}
</style>
