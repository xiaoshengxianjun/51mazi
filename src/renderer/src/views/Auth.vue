<template>
  <div class="auth-page">
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
          <el-button type="text" style="width: 100%" @click="showPasswordHint = !showPasswordHint">
            {{ showPasswordHint ? '隐藏密码提示' : '显示密码提示' }}
          </el-button>
          <div v-if="showPasswordHint" class="password-hint">密码提示：{{ maskedPassword }}</div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authPassword = ref('')
const authLoading = ref(false)
const showPasswordHint = ref(false)
const storedPassword = ref('')

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

// 加载密码
onMounted(async () => {
  const password = await window.electronStore?.get('bookshelfPassword')
  if (password) {
    storedPassword.value = password
  } else {
    // 如果没有密码，直接跳转到首页
    router.push('/')
  }
})

// 认证提交
async function handleAuthSubmit() {
  if (!authPassword.value) {
    ElMessage.warning('请输入密码')
    return
  }
  authLoading.value = true
  try {
    if (authPassword.value === storedPassword.value) {
      // 认证成功，设置认证标记
      sessionStorage.setItem('bookshelfAuthenticated', 'true')
      // 跳转到首页
      router.push('/')
    } else {
      ElMessage.error('密码错误，请重新输入')
      authPassword.value = ''
    }
  } finally {
    authLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auth-page {
  width: 100vw;
  height: 100vh;
  background-color: #ffffff;
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
</style>
