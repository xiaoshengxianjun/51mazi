<template>
  <el-drawer
    v-model="drawerVisible"
    :title="t('aiSettings.title')"
    direction="rtl"
    size="700px"
    class="ai-settings-drawer"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="ai-settings-drawer-inner">
      <div class="ai-settings-drawer-body">
        <el-form label-width="120px" @submit.prevent="handleSave">
          <!-- 文本 AI -->
          <div class="section-heading">{{ t('aiSettings.sectionTextAi') }}</div>
          <div class="config-block">
            <div class="block-title">{{ t('aiSettings.deepseek') }}</div>
            <el-form-item :label="t('aiSettings.apiKey')">
              <div class="input-with-btn">
                <el-input
                  v-model="apiKey"
                  type="password"
                  show-password
                  :placeholder="t('aiSettings.deepseekPlaceholder')"
                  clearable
                />
                <el-button
                  type="default"
                  :loading="validating"
                  :disabled="anyLoading || !apiKey.trim()"
                  @click="handleValidateDeepSeek"
                >
                  {{ t('aiSettings.validate') }}
                </el-button>
              </div>
              <div class="form-tip">
                <el-link
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  type="primary"
                  :underline="false"
                >
                  {{ t('aiSettings.getApiKey') }}
                </el-link>
              </div>
            </el-form-item>
            <el-form-item v-if="apiKeyStatus !== null">
              <el-alert
                :type="apiKeyStatus ? 'success' : 'error'"
                :title="
                  apiKeyStatus ? t('aiSettings.validateSuccess') : t('aiSettings.validateFailed')
                "
                :closable="false"
                show-icon
              />
            </el-form-item>
          </div>

          <!-- 图像 AI -->
          <div class="section-heading section-heading-spaced">
            {{ t('aiSettings.sectionImageAi') }}
          </div>

          <!-- 通义万相 -->
          <div class="config-block">
            <div class="block-title">{{ t('aiSettings.tongyi') }}</div>
            <el-form-item :label="t('aiSettings.apiKey')">
              <div class="input-with-btn">
                <el-input
                  v-model="apiKeyTongyi"
                  type="password"
                  show-password
                  :placeholder="t('aiSettings.tongyiPlaceholder')"
                  clearable
                />
                <el-button
                  type="default"
                  :loading="validatingTongyi"
                  :disabled="anyLoading || !apiKeyTongyi.trim()"
                  @click="handleValidateTongyi"
                >
                  {{ t('aiSettings.validate') }}
                </el-button>
              </div>
              <div class="form-tip">
                <el-link
                  href="https://help.aliyun.com/zh/model-studio/get-api-key"
                  target="_blank"
                  type="primary"
                  :underline="false"
                >
                  {{ t('aiSettings.getApiKey') }}
                </el-link>
              </div>
            </el-form-item>
            <el-form-item v-if="apiKeyStatusTongyi !== null">
              <el-alert
                :type="apiKeyStatusTongyi ? 'success' : 'error'"
                :title="
                  apiKeyStatusTongyi
                    ? t('aiSettings.validateSuccess')
                    : t('aiSettings.validateFailed')
                "
                :closable="false"
                show-icon
              />
            </el-form-item>
          </div>

          <!-- Gemini Imagen -->
          <div class="config-block">
            <div class="block-title">{{ t('aiSettings.gemini') }}</div>
            <div class="form-tip gemini-tip">{{ t('aiSettings.geminiTip') }}</div>
            <el-form-item :label="t('aiSettings.apiKey')">
              <div class="input-with-btn">
                <el-input
                  v-model="apiKeyGemini"
                  type="password"
                  show-password
                  :placeholder="t('aiSettings.geminiPlaceholder')"
                  clearable
                />
                <el-button
                  type="default"
                  :loading="validatingGemini"
                  :disabled="anyLoading || !apiKeyGemini.trim()"
                  @click="handleValidateGemini"
                >
                  {{ t('aiSettings.validate') }}
                </el-button>
              </div>
              <div class="form-tip">
                <el-link
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  type="primary"
                  :underline="false"
                >
                  {{ t('aiSettings.getApiKey') }}
                </el-link>
              </div>
            </el-form-item>
            <el-form-item v-if="apiKeyStatusGemini !== null">
              <el-alert
                :type="apiKeyStatusGemini ? 'success' : 'error'"
                :title="
                  apiKeyStatusGemini
                    ? t('aiSettings.geminiValidateSuccess')
                    : t('aiSettings.geminiValidateFailed')
                "
                :closable="false"
                show-icon
              />
            </el-form-item>
          </div>

          <!-- 豆包（火山方舟） -->
          <div class="config-block">
            <div class="block-title">{{ t('aiSettings.doubao') }}</div>
            <el-form-item :label="t('aiSettings.apiKey')">
              <el-input
                v-model="doubaoApiKey"
                type="password"
                show-password
                :placeholder="t('aiSettings.doubaoPlaceholder')"
                clearable
              />
            </el-form-item>
            <el-form-item :label="t('aiSettings.doubaoModel')">
              <el-input
                v-model="doubaoModel"
                :placeholder="t('aiSettings.doubaoModelPlaceholder')"
                clearable
              />
            </el-form-item>
            <el-form-item :label="t('aiSettings.doubaoBaseUrl')">
              <el-input
                v-model="doubaoBaseUrl"
                :placeholder="t('aiSettings.doubaoBaseUrlPlaceholder')"
                clearable
              />
            </el-form-item>
            <el-form-item>
              <div class="input-with-btn">
                <el-button
                  type="default"
                  :loading="validatingDoubao"
                  :disabled="anyLoading || !doubaoApiKey.trim() || !doubaoModel.trim()"
                  @click="handleValidateDoubao"
                >
                  {{ t('aiSettings.validate') }}
                </el-button>
                <el-link
                  class="form-tip-inline"
                  href="https://console.volcengine.com/ark"
                  target="_blank"
                  type="primary"
                  :underline="false"
                >
                  {{ t('aiSettings.getApiKey') }}
                </el-link>
              </div>
            </el-form-item>
            <el-form-item v-if="apiKeyStatusDoubao !== null">
              <el-alert
                :type="apiKeyStatusDoubao ? 'success' : 'error'"
                :title="
                  apiKeyStatusDoubao
                    ? t('aiSettings.doubaoValidateSuccess')
                    : t('aiSettings.doubaoValidateFailed')
                "
                :closable="false"
                show-icon
              />
            </el-form-item>
          </div>
        </el-form>
      </div>
      <div class="ai-settings-drawer-footer">
        <el-button :disabled="anyLoading" @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" :disabled="anyLoading" @click="handleSave">
          {{ t('common.save') }}
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
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
import {
  getGeminiApiKey,
  setGeminiApiKey,
  validateGeminiApiKey,
  getDoubaoConfig,
  setDoubaoConfig,
  validateDoubaoConfig
} from '@renderer/service/imageAi'

const drawerVisible = ref(false)
const { t } = useI18n()
const apiKey = ref('')
const apiKeyTongyi = ref('')
const apiKeyGemini = ref('')
const doubaoApiKey = ref('')
const doubaoModel = ref('')
const doubaoBaseUrl = ref('')

const saving = ref(false)
const validating = ref(false)
const validatingTongyi = ref(false)
const validatingGemini = ref(false)
const validatingDoubao = ref(false)

const apiKeyStatus = ref(null)
const apiKeyStatusTongyi = ref(null)
const apiKeyStatusGemini = ref(null)
const apiKeyStatusDoubao = ref(null)

const anyLoading = computed(
  () =>
    saving.value ||
    validating.value ||
    validatingTongyi.value ||
    validatingGemini.value ||
    validatingDoubao.value
)

function open() {
  drawerVisible.value = true
  loadAllKeys()
}

function handleClose() {
  drawerVisible.value = false
  apiKeyStatus.value = null
  apiKeyStatusTongyi.value = null
  apiKeyStatusGemini.value = null
  apiKeyStatusDoubao.value = null
}

async function loadAllKeys() {
  try {
    const [deepRes, tongyiRes, geminiRes, doubaoRes] = await Promise.all([
      getDeepSeekApiKey(),
      getTongyiwanxiangApiKey(),
      getGeminiApiKey(),
      getDoubaoConfig()
    ])
    if (deepRes?.success) apiKey.value = deepRes.apiKey || ''
    if (tongyiRes?.success) apiKeyTongyi.value = tongyiRes.apiKey || ''
    if (geminiRes?.success) apiKeyGemini.value = geminiRes.apiKey || ''
    if (doubaoRes?.success) {
      doubaoApiKey.value = doubaoRes.apiKey || ''
      doubaoModel.value = doubaoRes.model || ''
      doubaoBaseUrl.value = doubaoRes.baseUrl || ''
    }
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
      if (!r1?.success) errs.push(r1?.message || t('aiSettings.deepseekSaveFailed'))
      const r2 = await setTongyiwanxiangApiKey(apiKeyTongyi.value.trim())
      if (!r2?.success) errs.push(r2?.message || t('aiSettings.tongyiSaveFailed'))
      const r3 = await setGeminiApiKey(apiKeyGemini.value.trim())
      if (!r3?.success) errs.push(r3?.message || t('aiSettings.geminiSaveFailed'))
      const r4 = await setDoubaoConfig({
        apiKey: doubaoApiKey.value.trim(),
        model: doubaoModel.value.trim(),
        baseUrl: doubaoBaseUrl.value.trim()
      })
      if (!r4?.success) errs.push(r4?.message || t('aiSettings.doubaoSaveFailed'))
      if (errs.length) {
        ElMessage.error(errs.join('；'))
      } else {
        ElMessage.success(t('aiSettings.saveSuccess'))
        drawerVisible.value = false
      }
    } catch (error) {
      console.error('保存失败:', error)
      ElMessage.error(t('aiSettings.saveFailed'))
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
    ElMessage.warning(t('aiSettings.pleaseInputDeepseek'))
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
        ElMessage.success(t('aiSettings.deepseekValidateSuccess'))
      } else {
        apiKeyStatus.value = false
        ElMessage.error(result?.message || t('aiSettings.deepseekValidateFailed'))
      }
    } catch (error) {
      console.error('验证 DeepSeek 失败:', error)
      apiKeyStatus.value = false
      ElMessage.error(t('aiSettings.validateNetworkFailed'))
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
    ElMessage.warning(t('aiSettings.pleaseInputTongyi'))
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
        ElMessage.success(t('aiSettings.tongyiValidateSuccess'))
      } else {
        apiKeyStatusTongyi.value = false
        ElMessage.error(result?.message || t('aiSettings.tongyiValidateFailed'))
      }
    } catch (error) {
      console.error('验证通义万相失败:', error)
      apiKeyStatusTongyi.value = false
      ElMessage.error(t('aiSettings.validateNetworkFailed'))
    } finally {
      validatingTongyi.value = false
      validateTongyiTimer = null
    }
  }, 500)
}

let validateGeminiTimer = null

async function handleValidateGemini() {
  if (validatingGemini.value) return
  if (!apiKeyGemini.value.trim()) {
    ElMessage.warning(t('aiSettings.pleaseInputGemini'))
    return
  }
  if (validateGeminiTimer) clearTimeout(validateGeminiTimer)
  validateGeminiTimer = setTimeout(async () => {
    validatingGemini.value = true
    apiKeyStatusGemini.value = null
    try {
      await setGeminiApiKey(apiKeyGemini.value.trim())
      const result = await validateGeminiApiKey()
      if (result?.success && result.isValid) {
        apiKeyStatusGemini.value = true
        ElMessage.success(t('aiSettings.geminiValidateSuccess'))
      } else {
        apiKeyStatusGemini.value = false
        ElMessage.error(result?.message || t('aiSettings.geminiValidateFailed'))
      }
    } catch (error) {
      console.error('验证 Gemini 失败:', error)
      apiKeyStatusGemini.value = false
      ElMessage.error(t('aiSettings.validateNetworkFailed'))
    } finally {
      validatingGemini.value = false
      validateGeminiTimer = null
    }
  }, 500)
}

let validateDoubaoTimer = null

async function handleValidateDoubao() {
  if (validatingDoubao.value) return
  if (!doubaoApiKey.value.trim() || !doubaoModel.value.trim()) {
    ElMessage.warning(t('aiSettings.pleaseInputDoubao'))
    return
  }
  if (validateDoubaoTimer) clearTimeout(validateDoubaoTimer)
  validateDoubaoTimer = setTimeout(async () => {
    validatingDoubao.value = true
    apiKeyStatusDoubao.value = null
    try {
      await setDoubaoConfig({
        apiKey: doubaoApiKey.value.trim(),
        model: doubaoModel.value.trim(),
        baseUrl: doubaoBaseUrl.value.trim()
      })
      const result = await validateDoubaoConfig()
      if (result?.success && result.isValid) {
        apiKeyStatusDoubao.value = true
        ElMessage.success(t('aiSettings.doubaoValidateSuccess'))
      } else {
        apiKeyStatusDoubao.value = false
        ElMessage.error(result?.message || t('aiSettings.doubaoValidateFailed'))
      }
    } catch (error) {
      console.error('验证豆包配置失败:', error)
      apiKeyStatusDoubao.value = false
      ElMessage.error(t('aiSettings.validateNetworkFailed'))
    } finally {
      validatingDoubao.value = false
      validateDoubaoTimer = null
    }
  }, 500)
}

defineExpose({ open })
</script>

<style scoped>
.ai-settings-drawer-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.ai-settings-drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 20px 8px;
}
.ai-settings-drawer-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}
.section-heading {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
.section-heading-spaced {
  margin-top: 8px;
}
.config-block {
  margin-bottom: 20px;
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
.form-tip-inline {
  font-size: 12px;
}
.gemini-tip {
  margin-bottom: 12px;
  margin-top: -4px;
  line-height: 1.5;
}
.el-form-item {
  margin-bottom: 20px;
}
</style>
