<template>
  <div class="editor-toolbar">
    <div class="toolbar-title">写作助手</div>
    <div class="toolbar-buttons">
      <el-button class="tool-btn" @click="handleRandomName">
        <el-icon><User /></el-icon>
        <span>随机起名</span>
      </el-button>
      <RandomName ref="randomNameRef" />
      <el-button class="tool-btn" @click="handleWorldMap">
        <el-icon><Location /></el-icon>
        <span>设计地图</span>
      </el-button>
      <el-button class="tool-btn" @click="handleTimeline">
        <el-icon><Timer /></el-icon>
        <span>时间线</span>
      </el-button>
      <el-button class="tool-btn" @click="handleEntryDictionary">
        <el-icon><Collection /></el-icon>
        <span>词条字典</span>
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

<script setup>
import { ref } from 'vue'
import { User, Location, Timer, Avatar, Connection, Collection } from '@element-plus/icons-vue'
import RandomName from './RandomName.vue'
import { useRouter, useRoute } from 'vue-router'

const randomNameRef = ref(null)
const router = useRouter()
const route = useRoute()

// 工具栏功能处理函数
const handleRandomName = () => {
  randomNameRef.value.open()
}

const handleWorldMap = () => {
  // 跳转到地图列表页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/map-list', query: { name: bookName } })
}

const handleTimeline = () => {
  // 跳转到时间线页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/timeline', query: { name: bookName } })
}

const handleEntryDictionary = () => {
  // 跳转到词条字典页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/dictionary', query: { name: bookName } })
}

const handleCharacterProfile = () => {
  // 跳转到人物谱页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/character-profile', query: { name: bookName } })
}

const handleRelationshipMap = () => {
  // 跳转到关系图列表页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/relationship-list', query: { name: bookName } })
}
</script>

<style lang="scss" scoped>
.editor-toolbar {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: var(--bg-soft);
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
      justify-content: flex-start;
      background: var(--bg-base);
      border: 1px solid var(--border-color);
      // color: var(--text-primary);
      text-align: left;
      margin: 0;
    }
  }
}
</style>
