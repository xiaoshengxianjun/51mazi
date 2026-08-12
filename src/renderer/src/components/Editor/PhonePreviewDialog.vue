<template>
  <el-dialog
    :model-value="visible"
    class="phone-preview-dialog"
    width="auto"
    align-center
    destroy-on-close
    :show-close="false"
    :close-on-click-modal="true"
    @update:model-value="handleVisibleChange"
  >
    <div class="phone-preview-shell">
      <!-- 同步滚动开关：位于模拟器上方 -->
      <div class="phone-preview-sync-row">
        <span class="phone-preview-sync-label">{{ t('editorMenubar.syncViewScroll') }}</span>
        <el-switch v-model="syncScroll" size="small" @change="handleSyncScrollChange" />
      </div>

      <!-- 手机外框 -->
      <div class="phone-frame">
        <el-scrollbar
          ref="scrollbarRef"
          class="phone-screen"
          always
          @scroll="handlePhoneScroll"
        >
          <div v-if="title" class="phone-chapter-title">{{ title }}</div>
          <div
            v-if="previewHtml"
            class="phone-chapter-body"
            :style="bodyStyle"
            v-html="previewHtml"
          />
          <div v-else class="phone-empty">
            {{ t('editorMenubar.phonePreviewEmpty') }}
          </div>
        </el-scrollbar>
        <div class="phone-home-indicator" aria-hidden="true" />
      </div>
      <el-button class="phone-preview-close" circle @click="close">
        <el-icon :size="16"><Close /></el-icon>
      </el-button>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Close } from '@element-plus/icons-vue'
import {
  getEditorScrollContainer,
  getScrollAnchor,
  loadPhonePreviewSyncScroll,
  savePhonePreviewSyncScroll,
  scrollToAnchor
} from '@renderer/utils/scroll-anchor'

const EDITOR_PARA_SELECTOR = '.tiptap p'
const PREVIEW_PARA_SELECTOR = '.phone-chapter-body p'

const { t } = useI18n()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  /** 与编辑器菜单栏一致的排版样式 */
  typography: {
    type: Object,
    default: () => ({
      fontFamily: 'SimHei',
      fontSize: '16px',
      lineHeight: '1.6',
      paragraphSpacing: '0.5em',
      isBold: false,
      isItalic: false
    })
  },
  /** TipTap editor 实例，用于同步滚动定位 */
  editor: {
    type: Object,
    default: null
  }
})

/** 与 EditorPanel 一致的字体族回退配置 */
const FONT_FAMILY_MAP = {
  SimSun: "'STSong', 'SimSun', 'NSimSun', '宋体', serif",
  SimHei: "'SimHei', '黑体', 'STHeiti', sans-serif",
  KaiTi: "'STKaiti', 'KaiTi', '楷体', serif",
  FangSong: "'FangSong', '仿宋', 'STFangsong', serif",
  SourceHanSans: "'Noto Sans CJK SC', 'Source Han Sans SC', '思源黑体', 'PingFang SC', sans-serif",
  SourceHanSerif: "'Noto Serif CJK SC', 'Source Han Serif SC', '思源宋体', 'SimSun', serif",
  PingFang: "'PingFang SC', '苹方', 'Hiragino Sans GB', 'STHeiti', sans-serif"
}

function resolveFontFamily(fontKey) {
  if (!fontKey || fontKey === 'inherit') return ''
  return FONT_FAMILY_MAP[fontKey] || `'${fontKey}', sans-serif`
}

const emit = defineEmits(['update:visible'])

const scrollbarRef = ref(null)
const syncScroll = ref(loadPhonePreviewSyncScroll())
/** 程序化滚动时上锁，避免回环 */
let syncing = false
let scrollRaf = 0

/** 获取 el-scrollbar 实际滚动容器（wrap） */
function getPhoneScroller() {
  const inst = scrollbarRef.value
  if (!inst) return null
  // Element Plus 暴露 wrapRef；部分版本为 Ref，统一解包
  const wrap = inst.wrapRef
  return wrap?.value ?? wrap ?? null
}

/** 纯文本转预览 HTML（转义后按行分段，与章节编辑器一致） */
function plainTextToPreviewHtml(text) {
  if (!text) return ''
  const escape = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return ''
      let html = escape(line)
      html = html.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
      html = html.replace(/ {2,}/g, (match) => '&nbsp;'.repeat(match.length))
      return `<p>${html}</p>`
    })
    .filter(Boolean)
    .join('')
}

const previewHtml = computed(() => plainTextToPreviewHtml(props.content))

const bodyStyle = computed(() => {
  const typo = props.typography || {}
  return {
    fontFamily: resolveFontFamily(typo.fontFamily) || undefined,
    fontSize: typo.fontSize || '16px',
    lineHeight: typo.lineHeight || '1.6',
    fontWeight: typo.isBold ? 'bold' : 'normal',
    fontStyle: typo.isItalic ? 'italic' : 'normal',
    '--paragraph-spacing': typo.paragraphSpacing ?? '0.5em'
  }
})

/** 打开时 / 开启开关时：编辑器可视段落 → 预览（不做开关判断，由调用方控制） */
function syncEditorToPreview() {
  const editorScroller = getEditorScrollContainer(props.editor)
  const phoneScroller = getPhoneScroller()
  if (!editorScroller || !phoneScroller) return

  const anchor = getScrollAnchor(editorScroller, EDITOR_PARA_SELECTOR)
  syncing = true
  scrollToAnchor(phoneScroller, anchor, PREVIEW_PARA_SELECTOR)
  requestAnimationFrame(() => {
    syncing = false
  })
}

function handleSyncScrollChange(enabled) {
  savePhonePreviewSyncScroll(Boolean(enabled))
  // el-switch @change 时 v-model 已更新；显式用 enabled 避免时序歧义
  if (enabled && props.visible) {
    nextTick(() => syncEditorToPreview())
  }
}

/** 预览滚动：预览可视段落 → 编辑器 */
function handlePhoneScroll() {
  if (!syncScroll.value || syncing) return
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    // rAF 内再次校验，避免程序化滚动刚解锁时误同步
    if (!syncScroll.value || syncing) return
    const editorScroller = getEditorScrollContainer(props.editor)
    const phoneScroller = getPhoneScroller()
    if (!editorScroller || !phoneScroller) return

    const anchor = getScrollAnchor(phoneScroller, PREVIEW_PARA_SELECTOR)
    syncing = true
    scrollToAnchor(editorScroller, anchor, EDITOR_PARA_SELECTOR)
    requestAnimationFrame(() => {
      syncing = false
    })
  })
}

watch(
  () => props.visible,
  async (open) => {
    if (!open) return
    // destroy-on-close 后需等 DOM 挂载并完成布局再定位
    await nextTick()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (syncScroll.value) {
          syncEditorToPreview()
        } else {
          const scroller = getPhoneScroller()
          if (scroller) scroller.scrollTop = 0
          else if (typeof scrollbarRef.value?.setScrollTop === 'function') {
            scrollbarRef.value.setScrollTop(0)
          }
        }
      })
    })
  }
)

onBeforeUnmount(() => {
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})

function handleVisibleChange(val) {
  emit('update:visible', val)
}

function close() {
  emit('update:visible', false)
}
</script>

<style lang="scss">
/* 弹层本身尽量透明，突出手机外框 */
.phone-preview-dialog {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;

  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 0 !important;
    background: transparent;
  }
}

.phone-preview-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.phone-preview-sync-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  color: #1a1a1a;
}

.phone-preview-sync-label {
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  user-select: none;
}

.phone-frame {
  position: relative;
  width: 360px;
  height: 720px; /* 固定高度，不随内容或视口伸缩 */
  padding: 12px 10px 8px;
  border-radius: 36px;
  background: linear-gradient(160deg, #2c2c2e 0%, #1c1c1e 55%, #0f0f10 100%);
  box-shadow:
    0 0 0 2px #3a3a3c,
    0 24px 48px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.phone-screen {
  flex: 1;
  min-height: 0;
  border-radius: 24px;
  background: #faf8f5;
  color: #1a1a1a;

  /* el-scrollbar 填满阅读屏，内容区保留内边距 */
  .el-scrollbar__wrap {
    max-height: none !important;
  }

  .el-scrollbar__view {
    padding: 16px 18px 24px;
    box-sizing: border-box;
  }
}

.phone-chapter-title {
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  word-break: break-word;
}

.phone-chapter-body {
  word-break: break-word;

  p {
    margin: 0 0 var(--paragraph-spacing, 0.5em);
    text-indent: 2em;
  }

  p:last-child {
    margin-bottom: 0;
  }
}

.phone-empty {
  color: #999;
  text-align: center;
  padding: 48px 12px;
  font-size: 14px;
}

.phone-home-indicator {
  width: 108px;
  height: 4px;
  margin: 8px auto 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.phone-preview-close {
  /* 固定白底深色图标，避免暗色主题下 text 色变浅导致看不清 */
  background: #ffffff !important;
  border: none !important;
  color: #1a1a1a !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);

  .el-icon,
  svg {
    color: #1a1a1a !important;
  }
}
</style>
