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
      <!-- 手机外框 -->
      <div class="phone-frame">
        <div class="phone-screen">
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
        </div>
        <div class="phone-home-indicator" aria-hidden="true" />
      </div>
      <el-button class="phone-preview-close" circle @click="close">
        <el-icon :size="16"><Close /></el-icon>
      </el-button>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Close } from '@element-plus/icons-vue'

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
  gap: 16px;
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
  overflow-y: auto;
  padding: 16px 18px 24px;
  color: #1a1a1a;
  /* 隐藏滚动条，保留滚动 */
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
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
