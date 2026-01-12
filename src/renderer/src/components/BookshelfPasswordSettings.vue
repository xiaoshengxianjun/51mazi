<template>
  <el-dialog
    v-model="dialogVisible"
    title="书架密码设置"
    width="500px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-if="!hasPassword">
      <!-- 未设置密码：显示设置表单 -->
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
      >
        <el-form-item label="输入密码" prop="password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            placeholder="8-16位数字或字母组合"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
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
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="modifyPasswordForm.oldPassword"
            type="password"
            placeholder="请输入原密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="modifyPasswordForm.newPassword"
            type="password"
            placeholder="8-16位数字或字母组合，留空则取消密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmNewPassword">
          <el-input
            v-model="modifyPasswordForm.confirmNewPassword"
            type="password"
            placeholder="请再次输入新密码，取消密码时留空"
            show-password
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <template v-if="!hasPassword">
        <el-button @click="handleClose">取消</el-button>
        <el-button :loading="passwordLoading" type="primary" @click="handleSetPassword">
          确认
        </el-button>
      </template>
      <template v-else>
        <el-button v-if="!isModifyingPassword" @click="handleClose">关闭</el-button>
        <el-button v-else @click="handleCancelModify">取消</el-button>
        <el-button v-if="!isModifyingPassword" type="primary" @click="isModifyingPassword = true">
          修改
        </el-button>
        <el-button v-else :loading="passwordLoading" type="primary" @click="handleModifyPassword">
          确认
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

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
    callback(new Error('请输入密码'))
  } else if (!/^[a-zA-Z0-9]{8,16}$/.test(value)) {
    callback(new Error('密码长度8-16位，只能包含数字或字母'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请确认密码'))
  } else if (value !== passwordForm.value.password) {
    callback(new Error('两次输入的密码不一致'))
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
    callback(new Error('请输入原密码'))
  } else if (value !== storedPassword.value) {
    callback(new Error('原密码错误'))
  } else {
    callback()
  }
}

const validateNewPassword = (rule, value, callback) => {
  // 允许空值（表示取消密码）
  if (!value || value.trim() === '') {
    callback()
  } else if (!/^[a-zA-Z0-9]{8,16}$/.test(value)) {
    callback(new Error('密码长度8-16位，只能包含数字或字母'))
  } else {
    callback()
  }
}

const validateConfirmNewPassword = (rule, value, callback) => {
  const newPassword = modifyPasswordForm.value.newPassword
  // 如果新密码为空，确认密码也应该为空
  if (!newPassword || newPassword.trim() === '') {
    if (value && value.trim() !== '') {
      callback(new Error('取消密码时确认密码也应为空'))
    } else {
      callback()
    }
  } else {
    // 如果新密码不为空，确认密码不能为空且必须一致
    if (!value) {
      callback(new Error('请确认新密码'))
    } else if (value !== newPassword) {
      callback(new Error('两次输入的新密码不一致'))
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
        ElMessage.success('密码设置成功')
        handleClose()
        // 刷新页面，进入认证流程
        window.location.reload()
      } catch {
        ElMessage.error('密码设置失败')
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
          ElMessage.success('密码已取消')
        } else {
          // 设置新密码
          await window.electronStore?.set('bookshelfPassword', newPassword)
          storedPassword.value = newPassword
          hasPassword.value = true
          ElMessage.success('密码修改成功')
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
        ElMessage.error('操作失败')
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
