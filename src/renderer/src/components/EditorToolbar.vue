<template>
  <div class="editor-toolbar">
    <div class="toolbar-title">写作助手</div>
    <div class="toolbar-buttons">
      <el-button class="tool-btn" @click="handleRandomName">
        <el-icon><User /></el-icon>
        <span>随机起名</span>
      </el-button>
      <el-button class="tool-btn" @click="handleWorldMap">
        <el-icon><Location /></el-icon>
        <span>设计地图</span>
      </el-button>
      <el-button class="tool-btn" @click="handleTimeline">
        <el-icon><Timer /></el-icon>
        <span>时间线</span>
      </el-button>
      <el-button class="tool-btn" @click="handleCharacterProfile">
        <el-icon><Avatar /></el-icon>
        <span>人物谱</span>
      </el-button>
      <el-button class="tool-btn" @click="handleRelationshipMap">
        <el-icon><Connection /></el-icon>
        <span>关系图</span>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { User, Location, Timer, Avatar, Connection } from '@element-plus/icons-vue'

// 工具栏功能处理函数
const handleRandomName = () => {
  ElMessage.info('随机起名功能开发中...')
}

const handleWorldMap = () => {
  ElMessage.info('设计地图功能开发中...')
}

const handleTimeline = () => {
  ElMessage.info('时间线功能开发中...')
}

const handleCharacterProfile = () => {
  ElMessage.info('人物谱功能开发中...')
}

const handleRelationshipMap = () => {
  ElMessage.info('关系图功能开发中...')
}
</script>

<style lang="scss" scoped>
.editor-toolbar {
  width: 200px;
  background: var(--bg-soft);
  border-left: 1px solid var(--border-color);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .toolbar-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .toolbar-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .tool-btn {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 8px;
      width: 100%;
      height: 40px;
      padding: 0 16px;
      border-radius: 8px;
      background: var(--bg-base);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      transition: all 0.3s ease;

      &:hover {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: white;
      }

      .el-icon {
        font-size: 18px;
      }

      span {
        font-size: 14px;
      }
    }
  }
}
</style>
