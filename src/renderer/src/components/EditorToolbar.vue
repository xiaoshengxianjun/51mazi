<template>
  <div class="editor-toolbar">
    <div class="toolbar-title">写作助手</div>
    <div class="toolbar-buttons">
      <el-button class="tool-btn" @click="handleRandomName">
        <SvgIcon name="naming" :size="14" />
        <span>随机起名</span>
      </el-button>
      <RandomName ref="randomNameRef" />
      <el-button class="tool-btn" @click="handleWorldMap">
        <SvgIcon name="map" :size="14" />
        <span>设计地图</span>
      </el-button>
      <el-button class="tool-btn" @click="handleTimeline">
        <SvgIcon name="timeline" :size="14" />
        <span>时间线</span>
      </el-button>
      <el-button class="tool-btn" @click="handleEntryDictionary">
        <SvgIcon name="dictionary" :size="14" />
        <span>词条字典</span>
      </el-button>
      <el-button class="tool-btn" @click="handleCharacterProfile">
        <SvgIcon name="character" :size="14" />
        <span>人物谱</span>
      </el-button>
      <el-button class="tool-btn" @click="handleRelationshipMap">
        <SvgIcon name="relationship" :size="14" />
        <span>关系图</span>
      </el-button>
      <el-button class="tool-btn" @click="handleEventsSequence">
        <SvgIcon name="gantt" :size="14" />
        <span>事序图</span>
      </el-button>
      <el-button class="tool-btn" @click="handleOrganization">
        <SvgIcon name="organization" :size="14" />
        <span>组织架构</span>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RandomName from './RandomName.vue'
import { useRouter, useRoute } from 'vue-router'
import SvgIcon from './SvgIcon.vue'

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

const handleEventsSequence = () => {
  // 跳转到事序图页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/events-sequence', query: { name: bookName } })
}

const handleOrganization = () => {
  // 跳转到组织架构列表页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/organization-list', query: { name: bookName } })
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
    color: var(--text-base);
    margin-bottom: 8px;
    text-align: center;
  }

  .toolbar-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .tool-btn {
      justify-content: flex-start;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--text-base);
      text-align: left;
      margin: 0;
      &:hover {
        color: var(--el-color-primary);
      }
      span {
        margin-left: 6px;
      }
    }
  }
}
</style>
