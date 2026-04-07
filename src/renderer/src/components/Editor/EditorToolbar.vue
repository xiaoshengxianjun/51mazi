<template>
  <div class="editor-toolbar" :class="{ 'is-en': locale === 'en-US' }">
    <div class="toolbar-title">{{ t('editorToolbar.title') }}</div>
    <div class="toolbar-buttons">
      <el-button class="tool-btn" @click="handleOutlineManager">
        <SvgIcon name="resource" :size="14" />
        <span>{{ t('editorToolbar.outline') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleRandomName">
        <SvgIcon name="naming" :size="14" />
        <span>{{ t('editorToolbar.randomName') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleWorldMap">
        <SvgIcon name="map" :size="14" />
        <span>{{ t('editorToolbar.worldMap') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleEntryDictionary">
        <SvgIcon name="dictionary" :size="14" />
        <span>{{ t('editorToolbar.dictionary') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleOrganization">
        <SvgIcon name="organization" :size="14" />
        <span>{{ t('editorToolbar.organization') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleBannedWords">
        <SvgIcon name="banned-words" :size="14" />
        <span>{{ t('editorToolbar.bannedWords') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleCharacterProfile">
        <SvgIcon name="character" :size="14" />
        <span>{{ t('editorToolbar.characterProfile') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleRelationshipMap">
        <SvgIcon name="relationship" :size="14" />
        <span>{{ t('editorToolbar.relationship') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleTimeline">
        <SvgIcon name="timeline" :size="14" />
        <span>{{ t('editorToolbar.timeline') }}</span>
      </el-button>
      <el-button class="tool-btn" @click="handleEventsSequence">
        <SvgIcon name="gantt" :size="14" />
        <span>{{ t('editorToolbar.eventsSequence') }}</span>
      </el-button>
    </div>
    <RandomName ref="randomNameRef" />
    <BannedWordsDrawer ref="bannedWordsRef" :book-name="route.query.name" />
    <OutlineManagerDrawer ref="outlineManagerRef" :book-name="route.query.name" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RandomName from '@renderer/components/RandomName.vue'
import BannedWordsDrawer from './BannedWordsDrawer.vue'
import OutlineManagerDrawer from './OutlineManagerDrawer.vue'
import { useRouter, useRoute } from 'vue-router'
import SvgIcon from '@renderer/components/SvgIcon.vue'
import { useI18n } from 'vue-i18n'

const randomNameRef = ref(null)
const bannedWordsRef = ref(null)
const outlineManagerRef = ref(null)
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

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

const handleOutlineManager = () => {
  outlineManagerRef.value.open()
}

const handleBannedWords = () => {
  bannedWordsRef.value.open()
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
      align-items: flex-start;
      width: 100%;
      height: auto;
      min-height: 40px;
      white-space: normal;
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
        line-height: 1.2;
        word-break: break-word;
        white-space: normal;
        flex: 1;
      }
    }
  }

  &.is-en {
    .toolbar-buttons .tool-btn span {
      font-size: 13px;
    }
  }
}
:deep(.el-drawer__header) {
  margin-bottom: 0px;
  padding-bottom: 20px;
}
:deep(.el-drawer__body) {
  padding: 0 20px;
}
</style>
