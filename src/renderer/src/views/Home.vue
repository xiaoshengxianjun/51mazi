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
        <div class="menu-item">
          <i class="el-icon-reading"></i>
          写作指南
        </div>
        <div class="menu-item">
          <i class="el-icon-question"></i>
          帮助中心
        </div>
        <div class="menu-item">
          <i class="el-icon-money"></i>
          打赏作者
        </div>
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
    <el-dialog v-model="showThemeDialog" title="主题设置" width="500" :close-on-click-modal="false">
      <div class="theme-selector">
        <div
          class="theme-option"
          :class="{ active: themeStore.currentTheme === 'light' }"
          @click="handleThemeChange('light')"
        >
          <div class="theme-preview light"></div>
          <span>亮色</span>
        </div>
        <div
          class="theme-option"
          :class="{ active: themeStore.currentTheme === 'dark' }"
          @click="handleThemeChange('dark')"
        >
          <div class="theme-preview dark"></div>
          <span>暗色</span>
        </div>
        <div
          class="theme-option"
          :class="{ active: themeStore.currentTheme === 'yellow' }"
          @click="handleThemeChange('yellow')"
        >
          <div class="theme-preview yellow"></div>
          <span>黄色</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Bookshelf from '@renderer/components/Bookshelf.vue'
import { useThemeStore } from '@renderer/stores/theme'
import { ElDialog, ElButton, ElInput, ElForm, ElFormItem, ElMessage } from 'element-plus'

const showDirDialog = ref(false)
const bookDir = ref('')
const showThemeDialog = ref(false)
const themeStore = useThemeStore()

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
})

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

// 处理主题切换
const handleThemeChange = (theme) => {
  themeStore.setTheme(theme)
  ElMessage.success(
    `已切换到${theme === 'light' ? '亮色' : theme === 'dark' ? '暗色' : '黄色'}主题`
  )
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
  color: var(--text-primary);
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
    color: var(--text-primary);
  }
}

.theme-preview {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 2px solid var(--border-color);
  transition: all 0.3s ease;

  &.light {
    background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
    border-color: #e0e0e0;
  }

  &.dark {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    border-color: #7f8c8d;
  }

  &.yellow {
    background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    border-color: #d68910;
  }
}

.theme-selector {
  display: flex;
  justify-content: center;
  gap: 50px;
  margin: 20px 0;
}

:deep(.el-radio) {
  display: flex;
  align-items: center;
  margin-right: 0;
  height: 32px;
}
</style>
