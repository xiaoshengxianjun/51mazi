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
      <el-radio-group
        v-model="themeStore.currentTheme"
        style="display: flex; justify-content: center; gap: 50px"
        @change="handleThemeChange"
      >
        <div class="theme-option">
          <el-radio label="light">
            <div class="theme-preview light"></div>
            亮色
          </el-radio>
        </div>
        <div class="theme-option">
          <el-radio label="dark">
            <div class="theme-preview dark"></div>
            暗色
          </el-radio>
        </div>
        <div class="theme-option">
          <el-radio label="yellow">
            <div class="theme-preview yellow"></div>
            黄色
          </el-radio>
        </div>
      </el-radio-group>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Bookshelf from '@renderer/components/Bookshelf.vue'
import { useThemeStore } from '@renderer/stores/theme'
import { ElDialog, ElRadioGroup, ElRadio } from 'element-plus'

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

// 切换主题
async function handleThemeChange(theme) {
  await themeStore.setTheme(theme)
  showThemeDialog.value = false
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
}

.theme-preview {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 8px;
  vertical-align: middle;
  border: 1px solid var(--border-color);

  &.light {
    background-color: #f8f9fa;
  }

  &.dark {
    background-color: #1a1a1a;
  }

  &.yellow {
    background-color: #faf0e6;
  }
}

:deep(.el-radio) {
  display: flex;
  align-items: center;
  margin-right: 0;
  height: 32px;
}
</style>
