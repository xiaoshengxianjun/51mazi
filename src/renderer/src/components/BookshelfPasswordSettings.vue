<template>
  <el-dialog
    v-model="dialogVisible"
    :title="t('bookshelfPassword.title')"
    width="500px"
    align-center
    @close="handleClose"
  >
    <div v-if="!hasPassword">
      <!-- 未设置密码：显示设置表单 -->
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        @submit.prevent="handleSetPassword"
      >
        <el-form-item :label="t('bookshelfPassword.inputPassword')" prop="password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            :placeholder="t('bookshelfPassword.passwordPlaceholder')"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('bookshelfPassword.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            :placeholder="t('bookshelfPassword.confirmPlaceholder')"
            show-password
          />
        </el-form-item>
      </el-form>
    </div>
    <div v-else>
      <!-- 已设置密码：显示缩略密码和操作按钮 -->
      <div v-if="!isModifyingPassword" class="password-display">
        <div class="masked-password-text">{{ maskedPassword }}</div>
      </div>
      <!-- 修改密码表单 -->
      <el-form
        v-else
        ref="modifyPasswordFormRef"
        :model="modifyPasswordForm"
        :rules="modifyPasswordRules"
        label-width="100px"
        @submit.prevent="handleModifyPassword"
      >
        <el-form-item :label="t('bookshelfPassword.oldPassword')" prop="oldPassword">
          <el-input
            v-model="modifyPasswordForm.oldPassword"
            type="password"
            :placeholder="t('bookshelfPassword.oldPasswordPlaceholder')"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('bookshelfPassword.newPassword')" prop="newPassword">
          <el-input
            v-model="modifyPasswordForm.newPassword"
            type="password"
            :placeholder="t('bookshelfPassword.newPasswordPlaceholder')"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('bookshelfPassword.confirmPassword')" prop="confirmNewPassword">
          <el-input
            v-model="modifyPasswordForm.confirmNewPassword"
            type="password"
            :placeholder="t('bookshelfPassword.confirmNewPlaceholder')"
            show-password
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <template v-if="!hasPassword">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button :loading="passwordLoading" type="primary" @click="handleSetPassword">
          {{ t('common.confirm') }}
        </el-button>
      </template>
      <template v-else>
        <el-button v-if="!isModifyingPassword" @click="handleClose">
          {{ t('bookshelfPassword.close') }}
        </el-button>
        <el-button v-else @click="handleCancelModify">{{ t('common.cancel') }}</el-button>
        <el-button v-if="!isModifyingPassword" type="primary" @click="isModifyingPassword = true">
          {{ t('bookshelfPassword.modify') }}
        </el-button>
        <el-button v-else :loading="passwordLoading" type="primary" @click="handleModifyPassword">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 书架密码相关状态
const storedPassword = ref('')
const hasPassword = ref(false)
const isModifyingPassword = ref(false)
const passwordLoading = ref(false)

// 密码表单
const passwordForm = ref({
  password: '',
  confirmPassword: ''
})
const passwordFormRef = ref(null)

const modifyPasswordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmNewPassword: ''
})
const modifyPasswordFormRef = ref(null)

// 密码验证规则
const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('bookshelfPassword.pleaseInputPassword')))
  } else if (!/^[a-zA-Z0-9]{8,16}$/.test(value)) {
    callback(new Error(t('bookshelfPassword.passwordRuleError')))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('bookshelfPassword.pleaseConfirmPassword')))
  } else if (value !== passwordForm.value.password) {
    callback(new Error(t('bookshelfPassword.passwordNotMatch')))
  } else {
    callback()
  }
}

const passwordRules = {
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

const validateOldPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error(t('bookshelfPassword.pleaseInputOldPassword')))
  } else if (value !== storedPassword.value) {
    callback(new Error(t('bookshelfPassword.oldPasswordIncorrect')))
  } else {
    callback()
  }
}

const validateNewPassword = (rule, value, callback) => {
  // 允许空值（表示取消密码）
  if (!value || value.trim() === '') {
    callback()
  } else if (!/^[a-zA-Z0-9]{8,16}$/.test(value)) {
    callback(new Error(t('bookshelfPassword.passwordRuleError')))
  } else {
    callback()
  }
}

const validateConfirmNewPassword = (rule, value, callback) => {
  const newPassword = modifyPasswordForm.value.newPassword
  // 如果新密码为空，确认密码也应该为空
  if (!newPassword || newPassword.trim() === '') {
    if (value && value.trim() !== '') {
      callback(new Error(t('bookshelfPassword.confirmShouldEmptyWhenCancel')))
    } else {
      callback()
    }
  } else {
    // 如果新密码不为空，确认密码不能为空且必须一致
    if (!value) {
      callback(new Error(t('bookshelfPassword.pleaseConfirmNewPassword')))
    } else if (value !== newPassword) {
      callback(new Error(t('bookshelfPassword.newPasswordNotMatch')))
    } else {
      callback()
    }
  }
}

const modifyPasswordRules = {
  oldPassword: [{ validator: validateOldPassword, trigger: 'blur' }],
  newPassword: [{ validator: validateNewPassword, trigger: 'blur' }],
  confirmNewPassword: [{ validator: validateConfirmNewPassword, trigger: 'blur' }]
}

// 计算缩略密码
const maskedPassword = computed(() => {
  if (!storedPassword.value) return ''
  const pwd = storedPassword.value
  if (pwd.length <= 4) {
    return '****'
  }
  const start = pwd.substring(0, 2)
  const end = pwd.substring(pwd.length - 2)
  return `${start}****${end}`
})

// 加载密码数据
async function loadPassword() {
  const password = await window.electronStore?.get('bookshelfPassword')
  if (password) {
    storedPassword.value = password
    hasPassword.value = true
  } else {
    storedPassword.value = ''
    hasPassword.value = false
  }
}

// 监听弹框打开，加载密码数据
watch(
  () => props.modelValue,
  async (newVal) => {
    if (newVal) {
      await loadPassword()
    }
  }
)

// 关闭弹框
function handleClose() {
  dialogVisible.value = false
  // 重置状态
  isModifyingPassword.value = false
  passwordForm.value = { password: '', confirmPassword: '' }
  modifyPasswordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  }
  if (passwordFormRef.value) {
    passwordFormRef.value.clearValidate()
  }
  if (modifyPasswordFormRef.value) {
    modifyPasswordFormRef.value.clearValidate()
  }
}

// 设置密码
async function handleSetPassword() {
  if (!passwordFormRef.value) return
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      passwordLoading.value = true
      try {
        await window.electronStore?.set('bookshelfPassword', passwordForm.value.password)
        storedPassword.value = passwordForm.value.password
        hasPassword.value = true
        ElMessage.success(t('bookshelfPassword.setSuccess'))
        handleClose()
        // 刷新页面，进入认证流程
        window.location.reload()
      } catch {
        ElMessage.error(t('bookshelfPassword.setFailed'))
      } finally {
        passwordLoading.value = false
      }
    }
  })
}

// 取消修改密码
function handleCancelModify() {
  isModifyingPassword.value = false
  modifyPasswordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  }
  if (modifyPasswordFormRef.value) {
    modifyPasswordFormRef.value.clearValidate()
  }
}

// 修改密码
async function handleModifyPassword() {
  if (!modifyPasswordFormRef.value) return
  await modifyPasswordFormRef.value.validate(async (valid) => {
    if (valid) {
      passwordLoading.value = true
      try {
        const newPassword = modifyPasswordForm.value.newPassword?.trim()
        if (!newPassword) {
          // 新密码为空，表示取消密码
          await window.electronStore?.delete('bookshelfPassword')
          storedPassword.value = ''
          hasPassword.value = false
          ElMessage.success(t('bookshelfPassword.cancelSuccess'))
        } else {
          // 设置新密码
          await window.electronStore?.set('bookshelfPassword', newPassword)
          storedPassword.value = newPassword
          hasPassword.value = true
          ElMessage.success(t('bookshelfPassword.modifySuccess'))
        }
        isModifyingPassword.value = false
        modifyPasswordForm.value = {
          oldPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        }
        handleClose()
        // 刷新页面
        window.location.reload()
      } catch {
        ElMessage.error(t('bookshelfPassword.actionFailed'))
      } finally {
        passwordLoading.value = false
      }
    }
  })
}
</script>

<style lang="scss" scoped>
// 密码设置弹框样式
.password-display {
  padding: 20px 0;
  text-align: center;
}

.masked-password-text {
  font-size: 18px;
  color: var(--text-base);
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
}
</style>
