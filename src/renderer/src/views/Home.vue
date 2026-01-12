<template>
  <div class="home-page">
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="logo">
        <img src="/src/assets/images/logo_big.png" alt="logo" class="logo-img" />
      </div>
      <div class="menu">
        <div class="menu-item active">
          <i class="el-icon-document"></i>
          我的书架
        </div>
        <div class="menu-item" @click="showThemeDialog = true">
          <i class="el-icon-setting"></i>
          主题设置
        </div>
        <div class="menu-item" @click="showDirDialog = true">
          <i class="el-icon-setting"></i>
          系统设置
        </div>
        <div class="menu-item" @click="goToUserGuide">
          <i class="el-icon-reading"></i>
          写作指南
        </div>
        <div class="menu-item" @click="showHelpDialog = true">
          <i class="el-icon-question"></i>
          帮助中心
        </div>
        <div class="menu-item" @click="showSponsorDialog = true">
          <i class="el-icon-money"></i>
          赞助作者
        </div>
        <div class="menu-item" @click="handleOpenPasswordDialog">
          <i class="el-icon-lock"></i>
          书架密码
        </div>
      </div>
    </div>

    <!-- 认证页面（全屏白色覆盖层） -->
    <div v-if="showAuthPage" class="auth-page">
      <div class="auth-container">
        <h2 class="auth-title">请输入书架密码</h2>
        <el-form class="auth-form" @submit.prevent="handleAuthSubmit">
          <el-form-item>
            <el-input
              v-model="authPassword"
              type="password"
              placeholder="请输入密码"
              size="large"
              clearable
              @keyup.enter="handleAuthSubmit"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              :loading="authLoading"
              type="primary"
              size="large"
              style="width: 100%"
              @click="handleAuthSubmit"
            >
              确认
            </el-button>
          </el-form-item>
          <el-form-item class="password-hint-item">
            <el-button
              type="text"
              style="width: 100%"
              @click="showPasswordHint = !showPasswordHint"
            >
              {{ showPasswordHint ? '隐藏密码提示' : '显示密码提示' }}
            </el-button>
            <div v-if="showPasswordHint" class="password-hint">密码提示：{{ maskedPassword }}</div>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 书架区 -->
    <Bookshelf />

    <!-- 选择书籍目录弹窗 -->
    <el-dialog
      v-model="showDirDialog"
      title="请选择书籍主目录"
      width="600px"
      :close-on-click-modal="false"
      :show-close="false"
      align-center
    >
      <el-form label-width="80px">
        <el-form-item label="书籍目录">
          <el-row :gutter="10" style="width: 100%">
            <el-col :span="18">
              <el-input v-model="bookDir" readonly placeholder="请选择目录" />
            </el-col>
            <el-col :span="6">
              <el-button type="primary" style="width: 100%" @click="handleChooseDir">
                选择目录
              </el-button>
            </el-col>
          </el-row>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :disabled="!bookDir" @click="handleConfirmDir">确定</el-button>
      </template>
    </el-dialog>

    <!-- 主题设置弹框 -->
    <el-dialog v-model="showThemeDialog" title="主题设置" width="600" :close-on-click-modal="false">
      <div class="theme-selector">
        <div
          v-for="theme in availableThemes"
          :key="theme.key"
          class="theme-option"
          :class="{ active: themeStore.currentTheme === theme.key }"
          @click="handleThemeChange(theme.key)"
        >
          <div class="theme-preview" :class="theme.key" :style="getPreviewStyle(theme.key)">
            <div class="preview-content">
              <div class="preview-header"></div>
              <div class="preview-body"></div>
            </div>
          </div>
          <span>{{ theme.name }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 帮助中心弹框 -->
    <el-dialog v-model="showHelpDialog" title="帮助中心" width="420px" align-center>
      <div class="dialog-content">
        <img :src="qqGroupQrcode" alt="QQ 群二维码" class="dialog-image" />
        <p class="dialog-text">
          问题反馈 / 商务合作邮箱：
          <a class="dialog-link" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </p>
      </div>
    </el-dialog>

    <!-- 赞助作者弹框 -->
    <el-dialog v-model="showSponsorDialog" title="赞助作者" width="420px" align-center>
      <div class="dialog-content">
        <img :src="rewardQrcode" alt="赞助二维码" class="dialog-image" />
      </div>
    </el-dialog>

    <!-- 书架密码设置弹框 -->
    <el-dialog
      v-model="showPasswordDialog"
      title="书架密码设置"
      width="500px"
      align-center
      :close-on-click-modal="false"
    >
      <div v-if="!hasPassword">
        <!-- 未设置密码：显示设置表单 -->
        <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="100px">
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
          <el-button @click="showPasswordDialog = false">取消</el-button>
          <el-button :loading="passwordLoading" type="primary" @click="handleSetPassword">
            确认
          </el-button>
        </template>
        <template v-else>
          <el-button @click="handleCancelModify">
            {{ isModifyingPassword ? '取消' : '关闭' }}
          </el-button>
          <el-button v-if="!isModifyingPassword" type="primary" @click="isModifyingPassword = true">
            修改
          </el-button>
          <el-button v-else :loading="passwordLoading" type="primary" @click="handleModifyPassword">
            确认
          </el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import Bookshelf from '@renderer/components/Bookshelf.vue'
import { useThemeStore } from '@renderer/stores/theme'
import { ElDialog, ElMessage, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus'

const router = useRouter()
const showDirDialog = ref(false)
const bookDir = ref('')
const showThemeDialog = ref(false)
const showHelpDialog = ref(false)
const showSponsorDialog = ref(false)
const showPasswordDialog = ref(false)
const themeStore = useThemeStore()
const qqGroupQrcode = new URL('../../../../static/51mazi_qq_qrcode.jpg', import.meta.url).href
const rewardQrcode = new URL('../../../../static/wx_reward_qrcode.png', import.meta.url).href
const contactEmail = 'fomazi@163.com'

// 书架密码相关状态
const storedPassword = ref('')
const hasPassword = ref(false)
const showAuthPage = ref(false)
const authPassword = ref('')
const authLoading = ref(false)
const showPasswordHint = ref(false)
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

// 检查本地存储是否有bookDir
onMounted(async () => {
  const dir = await window.electronStore?.get('booksDir')
  if (!dir) {
    showDirDialog.value = true
  } else {
    bookDir.value = dir
  }
  // 初始化主题
  await themeStore.initTheme()

  // 检查是否设置了书架密码
  await checkPassword()
})

// 加载密码数据（不控制认证页面显示）
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

// 检查密码设置状态（用于初始化，会控制认证页面显示）
async function checkPassword() {
  await loadPassword()
  if (hasPassword.value) {
    // 显示认证页面
    showAuthPage.value = true
  } else {
    showAuthPage.value = false
  }
}

// 打开密码设置弹框
async function handleOpenPasswordDialog() {
  // 只加载密码数据，不触发认证页面（因为用户已经在首页，说明已经通过认证）
  await loadPassword()
  showPasswordDialog.value = true
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
        showPasswordDialog.value = false
        // 重置表单
        passwordForm.value = { password: '', confirmPassword: '' }
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
  showPasswordDialog.value = false
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
        showPasswordDialog.value = false
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

// 认证提交
async function handleAuthSubmit() {
  if (!authPassword.value) {
    ElMessage.warning('请输入密码')
    return
  }
  authLoading.value = true
  try {
    if (authPassword.value === storedPassword.value) {
      showAuthPage.value = false
      authPassword.value = ''
      ElMessage.success('认证成功')
    } else {
      ElMessage.error('密码错误，请重新输入')
      authPassword.value = ''
    }
  } finally {
    authLoading.value = false
  }
}

// 选择目录
async function handleChooseDir() {
  const result = await window.electron?.selectBooksDir()
  if (result && result.filePaths && result.filePaths[0]) {
    bookDir.value = result.filePaths[0]
    await window.electronStore.set('booksDir', bookDir.value)
    showDirDialog.value = false
  }
}

// 确认目录
async function handleConfirmDir() {
  await window.electronStore.set('booksDir', bookDir.value)
  showDirDialog.value = false
}

// 获取可用主题列表
const availableThemes = themeStore.getAvailableThemes()

// 获取主题预览样式
const getPreviewStyle = (themeKey) => {
  const config = themeStore.getThemeConfig(themeKey)
  return {
    '--preview-bg-primary': config.bgPrimary,
    '--preview-bg-soft': config.bgSoft,
    '--preview-bg-mute': config.bgMute,
    '--preview-border-color': config.borderColor
  }
}

// 处理主题切换
const handleThemeChange = (theme) => {
  themeStore.setTheme(theme)
  const themeName = themeStore.getThemeName(theme)
  ElMessage.success(`已切换到${themeName}主题`)
}

// 跳转到写作指南
const goToUserGuide = () => {
  router.push('/user-guide')
}
</script>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

.home-page {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--bg-primary);
}

.sidebar {
  width: 200px;
  background-color: var(--bg-soft);
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
}

.logo {
  font-size: 24px;
  font-weight: bold;
  padding: 0 20px;
  margin-bottom: 30px;
}

.logo-img {
  display: block;
  width: 100%;
}

.menu {
  display: flex;
  flex-direction: column;
}

.menu-item {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: var(--text-base);
  transition: all 0.3s;
}

.menu-item:hover,
.menu-item.active {
  background-color: var(--bg-mute);
  // color: #6366f1;
}

.theme-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 15px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    background-color: var(--bg-mute);
  }

  &.active {
    border: 2px solid var(--primary-color);
    background-color: var(--bg-mute);
  }

  span {
    font-size: 14px;
    color: var(--text-base);
  }
}

.theme-preview {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;

  .preview-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  // 使用CSS变量，从主题配置中动态获取颜色
  background: var(--preview-bg-primary);
  border-color: var(--preview-border-color);

  .preview-header {
    height: 20px;
    border-bottom: 1px solid;
    background: var(--preview-bg-soft);
    border-color: var(--preview-border-color);
  }

  .preview-body {
    flex: 1;
    background: var(--preview-bg-mute);
  }
}

.theme-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 20px 0;
  padding: 10px;
}

.dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.dialog-image {
  width: 260px;
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.dialog-text {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.dialog-link {
  color: var(--primary-color);
}

:deep(.el-radio) {
  display: flex;
  align-items: center;
  margin-right: 0;
  height: 32px;
}

// 认证页面样式
.auth-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #ffffff;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-container {
  width: 400px;
  padding: 40px;
  background-color: #ffffff;
}

.auth-title {
  text-align: center;
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 30px;
  color: #303133;
}

.auth-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .password-hint-item {
    position: relative;
  }
}

.password-hint {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 10px;
  text-align: center;
  font-size: 14px;
  color: #909399;
  padding: 10px 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 10;
}

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
