<template>
  <div class="editor-toolbar" :class="{ 'is-en': locale === 'en-US', 'is-compact': props.compact }">
    <div v-if="!props.compact" class="toolbar-title">{{ t('editorToolbar.title') }}</div>
    <div class="toolbar-buttons">
      <el-tooltip
        v-for="item in toolbarItems"
        :key="item.key"
        :content="item.label"
        placement="left"
        :disabled="!props.compact"
      >
        <el-button
          class="tool-btn"
          :class="{
            'tool-btn--outline-active':
              props.compact && props.outlineEmbedActive && item.key === 'outline'
          }"
          @click="item.onClick"
        >
          <SvgIcon :name="item.icon" :size="props.compact ? 12 : 14" />
          <span v-if="!props.compact">{{ item.label }}</span>
        </el-button>
      </el-tooltip>
    </div>
    <RandomName ref="randomNameRef" />
    <BannedWordsDrawer ref="bannedWordsRef" :book-name="route.query.name" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import RandomName from '@renderer/components/RandomName.vue'
import BannedWordsDrawer from './BannedWordsDrawer.vue'
import { useRouter, useRoute } from 'vue-router'
import SvgIcon from '@renderer/components/SvgIcon.vue'
import { useI18n } from 'vue-i18n'

const randomNameRef = ref(null)
const bannedWordsRef = ref(null)
const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const props = defineProps({
  compact: {
    type: Boolean,
    default: false
  },
  /** 小屏嵌入大纲时：大纲管理图标显示选中态 */
  outlineEmbedActive: {
    type: Boolean,
    default: false
  }
})

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

const handleSettingManager = () => {
  // 跳转到设定管理页面，带上当前书籍名
  const bookName = route.query.name
  router.push({ path: '/setting-manager', query: { name: bookName } })
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
  // 小屏嵌入大纲已展开且图标为选中态时，不再跳转独立大纲页（大屏请用大纲内容区全屏按钮）
  if (props.compact && props.outlineEmbedActive) {
    return
  }
  const bookName = route.query.name
  router.push({ path: '/outline-manager', query: { name: bookName } })
}

const handleBannedWords = () => {
  bannedWordsRef.value.open()
}

const toolbarItems = computed(() => [
  { key: 'outline', icon: 'resource', label: t('editorToolbar.outline'), onClick: handleOutlineManager },
  {
    key: 'setting',
    icon: 'config',
    label: t('editorToolbar.settingManager'),
    onClick: handleSettingManager
  },
  {
    key: 'random-name',
    icon: 'naming',
    label: t('editorToolbar.randomName'),
    onClick: handleRandomName
  },
  { key: 'map', icon: 'map', label: t('editorToolbar.worldMap'), onClick: handleWorldMap },
  {
    key: 'dictionary',
    icon: 'dictionary',
    label: t('editorToolbar.dictionary'),
    onClick: handleEntryDictionary
  },
  {
    key: 'organization',
    icon: 'organization',
    label: t('editorToolbar.organization'),
    onClick: handleOrganization
  },
  {
    key: 'banned-words',
    icon: 'banned-words',
    label: t('editorToolbar.bannedWords'),
    onClick: handleBannedWords
  },
  {
    key: 'character',
    icon: 'character',
    label: t('editorToolbar.characterProfile'),
    onClick: handleCharacterProfile
  },
  {
    key: 'relationship',
    icon: 'relationship',
    label: t('editorToolbar.relationship'),
    onClick: handleRelationshipMap
  },
  { key: 'timeline', icon: 'timeline', label: t('editorToolbar.timeline'), onClick: handleTimeline },
  {
    key: 'events-sequence',
    icon: 'gantt',
    label: t('editorToolbar.eventsSequence'),
    onClick: handleEventsSequence
  }
])
</script>

<style lang="scss" scoped>
.editor-toolbar {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background: var(--bg-soft);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;

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

  &.is-compact {
    padding: 8px 2px;
    gap: 8px;

    .toolbar-buttons {
      align-items: center;
      gap: 8px;

      .tool-btn {
        width: 32px;
        height: 32px;
        min-height: 32px;
        padding: 0;
        justify-content: center;
        align-items: center;
      }

      .tool-btn.tool-btn--outline-active {
        border-color: var(--el-color-primary);
        background: color-mix(in srgb, var(--el-color-primary) 18%, var(--bg-primary));
        color: var(--el-color-primary);
      }

      .tool-btn.tool-btn--outline-active:hover {
        border-color: var(--el-color-primary);
        background: color-mix(in srgb, var(--el-color-primary) 26%, var(--bg-primary));
        color: var(--el-color-primary);
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
