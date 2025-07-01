<template>
  <div class="layout-tool">
    <div class="layout-tool-header">
      <el-button class="back-btn" :icon="ArrowLeftBold" text @click="handleBack">
        <span>返回</span>
      </el-button>
      <h2 class="header-title">{{ title }}</h2>
      <div class="header-action">
        <el-button class="refresh-btn" :icon="Refresh" circle @click="handleRefresh" />
        <slot name="headrAction"></slot>
      </div>
    </div>
    <div class="layout-tool-main">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { ArrowLeftBold, Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  backTo: {
    type: String,
    default: ''
  }
})

// 返回上一页
function handleBack() {
  if (props.backTo) {
    // 如果指定了返回路径，直接跳转
    router.push(props.backTo)
  } else {
    // 检查是否有历史记录可以返回
    if (window.history.length > 1) {
      router.back()
    } else {
      // 如果没有历史记录，跳转到首页
      router.push('/')
    }
  }
}

// 刷新页面
function handleRefresh() {
  window.location.reload()
}
</script>

<style lang="scss" scoped>
.layout-tool {
  padding: 8px 16px;
  background-color: var(--bg-primary);
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.layout-tool-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  .header-title {
    margin: 0;
    font-size: 20px;
    color: var(--text-primary);
  }
  .header-action {
    display: flex;
    align-items: center;
  }
}
.layout-tool-main {
  flex: 1;
  overflow-y: auto;
}
</style>
