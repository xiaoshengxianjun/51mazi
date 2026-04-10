<template>
  <div class="editor-panel">
    <!-- 菜单栏 -->
    <EditorMenubar
      v-model="menubarState"
      :editor="editor"
      :book-name="bookName"
      @toggle-search="toggleSearchPanel"
      @save="saveContent"
      @export="handleExport"
      @update-style="handleStyleUpdate"
    />
    <!-- 章节标题 -->
    <div class="chapter-title">
      <el-input
        v-model="chapterTitle"
        :placeholder="t('editorPanel.chapterTitle')"
        maxlength="20"
        class="chapter-title-input"
        @blur="handleTitleBlur"
      />
      <!-- 人物高亮开关 -->
      <el-switch
        v-if="editorStore.file?.type === 'chapter'"
        v-model="characterHighlightEnabled"
        :active-text="t('editorPanel.characterHighlight')"
        :inactive-text="t('editorPanel.characterHighlight')"
        inline-prompt
        style="--el-switch-off-color: #999999"
        class="character-highlight-switch"
        @change="handleCharacterHighlightChange"
      />
      <!-- 禁词提示开关 -->
      <el-switch
        v-if="editorStore.file?.type === 'chapter'"
        v-model="bannedWordsHintEnabled"
        :active-text="t('editorPanel.bannedWordsHint')"
        :inactive-text="t('editorPanel.bannedWordsHint')"
        inline-prompt
        style="--el-switch-off-color: #999999"
        class="banned-words-hint-switch"
        @change="handleBannedWordsHintChange"
      />
    </div>
    <!-- 正文内容编辑区（含右上角 AI 润色按钮） -->
    <div class="editor-content-wrap">
      <EditorContent class="editor-content" :editor="editor" />
      <!-- 仅章节模式显示：固定于编辑区右上角的 AI 润色下拉（段落/整章） -->
      <div v-if="editorStore.file?.type === 'chapter'" class="ai-polish-wrap">
        <el-dropdown trigger="click" @command="handlePolishCommand">
          <el-button type="primary" size="small" class="ai-polish-btn" :loading="polishLoading">
            {{ t('editorPanel.aiPolish') }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="selection">
                {{ t('editorPanel.polishSelection') }}
              </el-dropdown-item>
              <el-dropdown-item command="chapter">
                {{ t('editorPanel.polishChapter') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button
          type="success"
          size="small"
          class="ai-continue-btn"
          :loading="continueLoading"
          @click="handleContinueClick"
        >
          {{ t('editorPanel.aiContinue') }}
        </el-button>
        <el-button
          type="warning"
          size="small"
          class="ai-scene-btn"
          @click="handleAISceneImageClick"
        >
          {{ t('editorPanel.aiSceneImage') }}
        </el-button>
      </div>
    </div>
    <!-- AI 润色结果确认弹框（段落 / 整章共用） -->
    <el-dialog
      v-model="polishDialogVisible"
      :title="
        polishMode === 'chapter'
          ? t('editorPanel.aiPolishResultChapter')
          : t('editorPanel.aiPolishResultSelection')
      "
      width="80%"
      class="polish-dialog"
      destroy-on-close
      @close="polishDialogVisible = false"
    >
      <div class="polish-dialog-body">
        <div class="polish-block">
          <div class="polish-label">{{ t('editorPanel.originalText') }}</div>
          <div class="polish-content original">{{ polishOriginalText }}</div>
        </div>
        <div class="polish-block">
          <div class="polish-label">{{ t('editorPanel.polishedText') }}</div>
          <div class="polish-content polished">{{ polishResultText }}</div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="polishDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button @click="copyPolishedText">{{ t('editorPanel.copyOneClick') }}</el-button>
          <el-button type="primary" @click="confirmPolishReplace">
            {{
              polishMode === 'chapter'
                ? t('editorPanel.confirmReplaceChapter')
                : t('editorPanel.confirmReplace')
            }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- AI 续写：续写要求输入弹框 -->
    <el-dialog
      v-model="continuePromptDialogVisible"
      :title="t('editorPanel.aiContinue')"
      width="520px"
      class="continue-prompt-dialog"
      destroy-on-close
      :close-on-click-modal="false"
      @close="continuePromptDialogVisible = false"
    >
      <el-form label-width="80px">
        <el-form-item :label="t('editorPanel.continuePrompt')">
          <el-input
            v-model="continuePromptText"
            type="textarea"
            :rows="4"
            :placeholder="t('editorPanel.continuePromptPlaceholder')"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item :label="t('editorPanel.canContinue')">
          <span class="continue-words-tip">
            {{ t('editorPanel.continueAllowWords', { words: continueAllowWords }) }}
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button :disabled="continueLoading" @click="continuePromptDialogVisible = false">
            {{ t('common.cancel') }}
          </el-button>
          <el-button type="primary" :loading="continueLoading" @click="confirmContinuePrompt">
            {{ t('common.confirm') }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- AI 续写：结果展示弹框 -->
    <el-dialog
      v-model="continueResultDialogVisible"
      :title="t('editorPanel.aiContinueResult')"
      width="80%"
      class="continue-result-dialog"
      destroy-on-close
      @close="continueResultDialogVisible = false"
    >
      <div class="continue-result-body">
        <div class="continue-block">
          <div class="continue-label">{{ t('editorPanel.continueContent') }}</div>
          <div class="continue-content">{{ continueResultText }}</div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="continueResultDialogVisible = false">
            {{ t('common.cancel') }}
          </el-button>
          <el-button @click="copyContinueText">{{ t('editorMenubar.copy') }}</el-button>
          <el-button type="primary" @click="confirmContinueInsert">
            {{ t('editorPanel.confirmInsertEnd') }}
          </el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 编辑器内容配置组件（隐藏，仅提供逻辑） -->
    <ChapterEditorContent
      ref="chapterEditorContentRef"
      :editor-store="editorStore"
      :menubar-state="menubarState"
      :is-composing="isComposing"
      :get-font-family="getFontFamily"
      :auto-save-content="autoSaveContent"
    />
    <NoteEditorContent
      ref="noteEditorContentRef"
      :editor-store="editorStore"
      :menubar-state="menubarState"
      :is-composing="isComposing"
      :get-font-family="getFontFamily"
      :auto-save-content="autoSaveContent"
    />
    <!-- 码字进度 -->
    <EditorProgress
      v-if="editorStore.file?.type === 'chapter'"
      :current-words="contentWordCount"
      :target-words="editorStore.chapterTargetWords"
      :book-name="bookName"
    />
    <!-- 编辑器统计 -->
    <EditorStats
      v-if="editorStore.file?.type === 'chapter'"
      ref="editorStatsRef"
      :book-name="bookName"
      :content-word-count="contentWordCount"
      :file-type="editorStore.file?.type"
    />

    <AISceneImageDialog
      v-model="sceneDialogVisible"
      :book-name="bookName"
      :excerpt="sceneExcerpt"
    />

    <!-- 搜索面板 -->
    <SearchPanel :visible="searchPanelVisible" :editor="editor" @close="closeSearchPanel" />
  </div>
</template>

<script setup>
import {
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  computed,
  nextTick
} from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { EditorContent } from '@tiptap/vue-3'
import { TextSelection } from 'prosemirror-state'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@renderer/stores/editor'
import SearchPanel from '@renderer/components/Editor/SearchPanel.vue'
import EditorMenubar from '@renderer/components/Editor/EditorMenubar.vue'
import EditorStats from '@renderer/components/Editor/EditorStats.vue'
import EditorProgress from '@renderer/components/Editor/EditorProgress.vue'
import ChapterEditorContent from '@renderer/components/Editor/ChapterEditorContent.vue'
import NoteEditorContent from '@renderer/components/Editor/NoteEditorContent.vue'
import AISceneImageDialog from '@renderer/components/Editor/AISceneImageDialog.vue'

const editorStore = useEditorStore()
const { t } = useI18n()

const props = defineProps({
  bookName: String
})

watch(
  () => props.bookName,
  (name) => {
    if (name) {
      editorStore.currentBookName = name
      // 书籍切换时，加载对应书籍的人物高亮开关状态
      loadCharacterHighlightState(name)
      // 书籍切换时，加载对应书籍的禁词提示开关状态
      loadBannedWordsHintState(name)
    }
  },
  { immediate: true }
)

// 计算属性
const contentWordCount = computed(() => editorStore.contentWordCount)
const MIN_CONTINUE_WORDS_WITHOUT_PREVIOUS = 200
const PREVIOUS_CHAPTER_CONTEXT_LENGTH = 1200
/** AI 场景图：选区有效字数（与全书统计一致，不含空白） */
const SCENE_SELECTION_MIN_WORDS = 100
const SCENE_SELECTION_MAX_WORDS = 1000

function getPlainTextWordCount(text) {
  if (!text) return 0
  return String(text).replace(/[\s\n\r\t]/g, '').length
}

const continueAllowWords = computed(() => {
  const targetWords = Number(editorStore.chapterTargetWords) || 0
  const currentWords = Number(contentWordCount.value) || 0
  const maxTotal = Math.floor(targetWords * 1.2)
  const allow = maxTotal - currentWords
  return allow > 0 ? allow : 0
})

// EditorStats 组件引用
const editorStatsRef = ref(null)

const chapterTitle = computed({
  get: () => editorStore.chapterTitle,
  set: (val) => editorStore.setChapterTitle(val)
})

// 字体映射表：为每种字体提供完整的字体族配置（包含回退字体）
const fontFamilyMap = {
  inherit: '',
  SimSun: "'STSong', 'SimSun', 'NSimSun', '宋体', serif",
  SimHei: "'SimHei', '黑体', 'STHeiti', sans-serif",
  KaiTi: "'STKaiti', 'KaiTi', '楷体', serif",
  FangSong: "'FangSong', '仿宋', 'STFangsong', serif",
  SourceHanSans: "'Noto Sans CJK SC', 'Source Han Sans SC', '思源黑体', 'PingFang SC', sans-serif",
  SourceHanSerif: "'Noto Serif CJK SC', 'Source Han Serif SC', '思源宋体', 'SimSun', serif",
  PingFang: "'PingFang SC', '苹方', 'Hiragino Sans GB', 'STHeiti', sans-serif"
}

// 菜单栏状态
const menubarState = ref({
  fontFamily: 'SimHei',
  fontSize: '16px',
  lineHeight: '1.6',
  paragraphSpacing: '0.5em', // 段落之间间距
  isBold: false,
  isItalic: false
})

const editor = ref(null)
let saveTimer = ref(null)
let styleUpdateTimer = null
let isComposing = false // 是否正在进行输入法输入（composition）
let compositionStartHandler = null
let compositionEndHandler = null
let isTitleSaving = false

// 编辑器内容组件引用
const chapterEditorContentRef = ref(null)
const noteEditorContentRef = ref(null)

// 人物高亮相关状态
const characterHighlightEnabled = ref(false) // 人物高亮开关状态，默认关闭
const characters = ref([]) // 人物数据列表
let characterHighlightTimer = null // 人物高亮定时器
const defaultHighlightColor = '#ffeb3b' // 默认高亮颜色（黄色）

/**
 * 将人物高亮颜色变淡，避免过于刺眼
 * @param {string} hex - 如 #ffeb3b
 * @returns {string} 混合白色后的浅色 hex
 */
function lightenHighlightColor(hex) {
  if (!hex || typeof hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return hex || defaultHighlightColor
  }
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const mix = 0.58 // 约 58% 向白色混合，使高亮更淡
  const r2 = Math.round(r + (255 - r) * mix)
  const g2 = Math.round(g + (255 - g) * mix)
  const b2 = Math.round(b + (255 - b) * mix)
  return '#' + [r2, g2, b2].map((x) => x.toString(16).padStart(2, '0')).join('')
}

// 禁词提示相关状态
const bannedWordsHintEnabled = ref(false) // 禁词提示开关状态，默认关闭
const bannedWords = ref([]) // 禁词数据列表
let bannedWordsHintTimer = null // 禁词提示定时器

async function handleTitleBlur() {
  const fileType = editorStore.file?.type
  if (!fileType || (fileType !== 'chapter' && fileType !== 'note')) return
  if (isTitleSaving) return
  try {
    isTitleSaving = true
    await saveFile(false)
  } finally {
    isTitleSaving = false
  }
}

// 搜索面板状态
const searchPanelVisible = ref(false)

// AI 润色：加载中、弹框可见、原文/润色结果；mode 为 selection | chapter，选中时记录替换范围
const polishLoading = ref(false)
const polishDialogVisible = ref(false)
const polishMode = ref('chapter') // 'selection' | 'chapter'
const polishOriginalText = ref('')
const polishResultText = ref('')

// AI 续写相关状态
const continueLoading = ref(false)
const continuePromptDialogVisible = ref(false)
const continuePromptText = ref('')
const continueResultDialogVisible = ref(false)
const continueResultText = ref('')
const polishReplaceFrom = ref(0)
const polishReplaceTo = ref(0)

// AI 场景图（选中文本）
const sceneDialogVisible = ref(false)
const sceneExcerpt = ref('')

// 获取当前编辑器内容组件
function getEditorContentComponent() {
  const isNote = editorStore.file?.type === 'note'
  return isNote ? noteEditorContentRef.value : chapterEditorContentRef.value
}

/** 销毁 TipTap 前：取消防抖自动保存，并把当前笔记 HTML 写入 store 快照（消除竞态空窗） */
function prepareEditorDestroy() {
  noteEditorContentRef.value?.cancelNoteAutoSaveTimer?.()
  const f = editorStore.file
  if (f?.type === 'note' && f.path && editor.value && noteEditorContentRef.value) {
    const html = noteEditorContentRef.value.getSaveContent(editor.value)
    if (typeof html === 'string') {
      editorStore.updateNoteDraftHtml(f.path, html)
    }
  }
}

// 获取完整的字体族配置
function getFontFamily(fontKey) {
  return fontKey === 'inherit' || !fontKey
    ? ''
    : fontFamilyMap[fontKey] || `'${fontKey}', sans-serif`
}

// 更新编辑器样式
function updateEditorStyle() {
  if (!editor.value) return

  // TipTap的DOM结构：editor.view.dom 就是 .tiptap 元素
  const editorElement = editor.value.view.dom
  if (editorElement) {
    // 使用setProperty with 'important' 确保样式优先级最高
    // 获取完整的字体族配置（包含回退字体）
    const fullFontFamily = getFontFamily(menubarState.value.fontFamily)
    editorElement.style.setProperty('font-family', fullFontFamily, 'important')
    editorElement.style.setProperty('font-size', menubarState.value.fontSize, 'important')
    editorElement.style.setProperty('line-height', menubarState.value.lineHeight, 'important')
    editorElement.style.setProperty(
      '--paragraph-spacing',
      menubarState.value.paragraphSpacing ?? '0',
      'important'
    )
    // 根据文件类型设置首行缩进（章节：2em；笔记：0）
    const isChapter = editorStore.file?.type === 'chapter'
    editorElement.style.setProperty('text-indent', isChapter ? '2em' : '0', 'important')
  }
}

// 处理样式更新
function handleStyleUpdate() {
  updateEditorStyle()
  // 防抖保存设置
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)
  styleUpdateTimer = setTimeout(() => {
    editorStore.saveEditorSettings({
      fontFamily: menubarState.value.fontFamily,
      fontSize: menubarState.value.fontSize,
      lineHeight: menubarState.value.lineHeight,
      paragraphSpacing: menubarState.value.paragraphSpacing,
      globalBoldMode: menubarState.value.isBold,
      globalItalicMode: menubarState.value.isItalic
    })
  }, 500)
}

// 处理导出事件
function handleExport() {
  // 导出功能已在 EditorMenubar 组件中实现，这里只需要处理事件
}

// 监听 store 内容变化，回显到编辑器
watch(
  () => editorStore.file,
  async (newFile, oldFile) => {
    // 如果编辑器不存在且新文件存在，初始化编辑器
    if (!editor.value && newFile) {
      try {
        await initEditor()
        await nextTick()
        setupCompositionHandlers()
        // 初始化后，initEditor 已经设置了内容，这里不需要再次设置
        // 如果是章节编辑器，等待内容渲染完成后加载状态并应用高亮/划线
        if (newFile?.type === 'chapter' && props.bookName) {
          await nextTick()
          await nextTick()
          await new Promise((resolve) => setTimeout(resolve, 50))
          await loadCharacterHighlightState(props.bookName)
          await loadBannedWordsHintState(props.bookName)
        }
        return
      } catch (error) {
        console.error('初始化编辑器失败:', error)
        return
      }
    }

    if (!newFile) return

    // 如果文件类型发生变化，需要重新初始化编辑器
    const fileTypeChanged = newFile?.type !== oldFile?.type

    if (fileTypeChanged && editor.value) {
      try {
        prepareEditorDestroy()
        // 销毁旧编辑器
        editor.value.destroy()
        editor.value = null
        // 等待一下确保完全销毁
        await nextTick()
        // 重新初始化编辑器（initEditor 内部会设置内容）
        await initEditor()
        // 等待编辑器完全初始化
        await nextTick()
        setupCompositionHandlers()
        // 重新初始化后，initEditor 已经设置了内容，这里不需要再次设置
        // 如果是章节编辑器，等待内容渲染完成后加载状态并应用高亮/划线
        if (newFile?.type === 'chapter' && props.bookName) {
          await nextTick()
          await nextTick()
          await new Promise((resolve) => setTimeout(resolve, 50))
          await loadCharacterHighlightState(props.bookName)
          await loadBannedWordsHintState(props.bookName)
        }
        return
      } catch (error) {
        console.error('重新初始化编辑器失败:', error)
        // 出错时尝试恢复编辑器
        if (oldFile) {
          try {
            await initEditor()
          } catch (retryError) {
            console.error('恢复编辑器失败:', retryError)
          }
        }
        return
      }
    }

    // 只有在文件路径变化且编辑器已存在时才设置内容
    if (editor.value && newFile?.path !== oldFile?.path) {
      // 文件变化时，先开始编辑会话（设置初始化标志），再设置内容
      const newContent = editorStore.content || ''
      const isNote = newFile?.type === 'note'

      // 先开始编辑会话，设置 isInitializing = true，避免加载已有内容时被计入码字速度
      editorStore.startEditingSession(newContent)

      // 根据文件类型使用对应的内容设置方法
      if (isNote) {
        noteEditorContentRef.value.setNoteContent(editor.value, newContent)
      } else {
        chapterEditorContentRef.value.setChapterContent(editor.value, newContent)
      }

      // 书籍总字数由 EditorStats 组件通过 watch fileType 自动加载

      // 更新样式
      updateEditorStyle()

      // 如果开启了人物高亮，重新应用高亮
      if (characterHighlightEnabled.value && !isNote) {
        nextTick(() => {
          loadCharacters().then(() => {
            applyCharacterHighlights()
            // 确保定时器在运行
            if (!characterHighlightTimer) {
              startCharacterHighlightTimer()
            }
          })
        })
      }

      // 如果开启了禁词提示，重新应用划线
      if (bannedWordsHintEnabled.value && !isNote) {
        nextTick(() => {
          loadBannedWords().then(() => {
            applyBannedWordsStrikes()
            // 确保定时器在运行
            if (!bannedWordsHintTimer) {
              startBannedWordsHintTimer()
            }
          })
        })
      }

      // 如果全局格式模式开启，应用到新内容
      nextTick(() => {
        if (!editor.value) return
        const docSize = editor.value.state.doc.content.size
        if (docSize === 0) return

        if (menubarState.value.isBold || menubarState.value.isItalic) {
          setTimeout(() => {
            if (!editor.value) return
            const currentDocSize = editor.value.state.doc.content.size
            if (currentDocSize === 0) return

            let chain = editor.value.chain().focus().selectAll()
            if (menubarState.value.isBold) {
              chain = chain.setBold()
            }
            if (menubarState.value.isItalic) {
              chain = chain.setItalic()
            }
            chain.run()

            // 恢复光标到末尾
            if (currentDocSize > 0) {
              editor.value.chain().focus().setTextSelection(currentDocSize).run()
            }
          }, 100)
        }
      })
    }
  }
)

// 键盘快捷键处理
function handleKeydown(event) {
  // Cmd/Ctrl + F: 打开搜索面板
  if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
    event.preventDefault()
    if (!searchPanelVisible.value) {
      searchPanelVisible.value = true
    }
  }

  // Cmd/Ctrl + S: 保存内容
  if ((event.metaKey || event.ctrlKey) && event.key === 's') {
    event.preventDefault()
    saveContent()
  }
}

// 窗口关闭前保存设置
function handleWindowClose() {
  // 清除定时器
  if (saveTimer.value) clearTimeout(saveTimer.value)
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)

  // 同步保存编辑器设置（窗口关闭时无法使用 async/await）
  editorStore
    .saveEditorSettings({
      fontFamily: menubarState.value.fontFamily,
      fontSize: menubarState.value.fontSize,
      lineHeight: menubarState.value.lineHeight,
      paragraphSpacing: menubarState.value.paragraphSpacing,
      globalBoldMode: menubarState.value.isBold,
      globalItalicMode: menubarState.value.isItalic
    })
    .catch((error) => {
      console.error('保存编辑器设置失败:', error)
    })

  // 保存最后的内容
  autoSaveContent().catch((error) => {
    console.error('自动保存失败:', error)
  })
}

// 初始化编辑器的函数
async function initEditor() {
  if (editor.value) {
    prepareEditorDestroy()
    // 如果编辑器已存在，先销毁
    editor.value.destroy()
    editor.value = null
  }

  // 加载编辑器设置
  await editorStore.loadEditorSettings()

  // 应用加载的设置
  if (editorStore.editorSettings) {
    const settings = editorStore.editorSettings
    // 只在值为 undefined 或 null 时才使用默认值，避免覆盖空字符串等有效值
    menubarState.value = {
      fontFamily:
        settings.fontFamily !== undefined && settings.fontFamily !== null
          ? settings.fontFamily
          : 'SimHei',
      fontSize:
        settings.fontSize !== undefined && settings.fontSize !== null ? settings.fontSize : '16px',
      lineHeight:
        settings.lineHeight !== undefined && settings.lineHeight !== null
          ? settings.lineHeight
          : '1.6',
      paragraphSpacing:
        settings.paragraphSpacing !== undefined && settings.paragraphSpacing !== null
          ? settings.paragraphSpacing
          : '0.5em',
      isBold: settings.globalBoldMode !== undefined ? settings.globalBoldMode : false,
      isItalic: settings.globalItalicMode !== undefined ? settings.globalItalicMode : false
    }
  }

  // 获取对应的编辑器内容组件
  const editorContentComponent = getEditorContentComponent()
  if (!editorContentComponent) {
    console.error('编辑器内容组件未找到')
    return
  }

  // 使用组件提供的方法创建编辑器
  editor.value = editorContentComponent.createEditor()

  // 设置初始内容
  const initialContent = editorStore.content || ''

  // 如果有初始内容，先开始编辑会话（设置初始化标志），再设置内容
  if (initialContent) {
    editorStore.startEditingSession(initialContent)
  }

  if (editorStore.file?.name) {
    editorStore.setChapterTitle(editorStore.file.name)
  }

  // 根据文件类型使用对应的内容设置方法
  const isNote = editorStore.file?.type === 'note'
  if (isNote) {
    noteEditorContentRef.value.setNoteContent(editor.value, initialContent)
  } else {
    chapterEditorContentRef.value.setChapterContent(editor.value, initialContent)
  }

  // 等待DOM渲染完成后应用样式
  await nextTick()
  updateEditorStyle()

  // 如果加载了加粗或倾斜状态，应用到所有内容
  if (menubarState.value.isBold || menubarState.value.isItalic) {
    if (initialContent) {
      // 等待编辑器完全初始化后再应用格式
      await nextTick()

      // 给编辑器更多时间来渲染内容
      setTimeout(() => {
        if (!editor.value) return

        // 确保有内容再应用格式
        const docSize = editor.value.state.doc.content.size
        if (docSize === 0) return

        // 保存当前选择位置
        const currentFrom = editor.value.state.selection.from
        const currentTo = editor.value.state.selection.to

        // 在同一个命令链中选择所有内容并应用格式
        let chain = editor.value.chain().focus().selectAll()

        if (menubarState.value.isBold) {
          chain = chain.setBold()
        }
        if (menubarState.value.isItalic) {
          chain = chain.setItalic()
        }

        chain.run()

        // 恢复之前的选择位置（如果有的话）
        if (docSize > 0) {
          const newFrom = Math.min(currentFrom, docSize - 1)
          const newTo = Math.min(currentTo, docSize - 1)
          editor.value.chain().focus().setTextSelection({ from: newFrom, to: newTo }).run()
        }
      }, 100)
    }
  }

  // 注意：startEditingSession 已经在上面调用过了，这里不需要重复调用

  // 设置输入法事件监听器
  setupCompositionHandlers()
}

// 设置输入法事件监听器的函数
function setupCompositionHandlers() {
  if (!editor.value || !editor.value.view || !editor.value.view.dom) return

  const editorElement = editor.value.view.dom

  // 先移除旧的监听器（如果存在）
  if (compositionStartHandler) {
    editorElement.removeEventListener('compositionstart', compositionStartHandler)
  }
  if (compositionEndHandler) {
    editorElement.removeEventListener('compositionend', compositionEndHandler)
  }

  // compositionstart: 开始输入法输入
  compositionStartHandler = () => {
    isComposing = true
  }
  editorElement.addEventListener('compositionstart', compositionStartHandler)

  // compositionend: 输入法确认（回车或选择）
  compositionEndHandler = () => {
    isComposing = false
    // 输入法确认后，立即更新字数统计
    if (editor.value) {
      const content = editor.value.getText()
      editorStore.setContent(content)
    }
  }
  editorElement.addEventListener('compositionend', compositionEndHandler)
}

onMounted(async () => {
  // 书籍总字数由 EditorStats 组件通过 watch fileType 自动加载
  // registerExternalSaveHandler / keydown 在 onActivated 中注册，避免 keep-alive 停用后仍响应快捷键

  // 延迟初始化编辑器，等待文件加载完成
  // 如果 file 已经存在，立即初始化；否则等待 file 变化后再初始化
  if (editorStore.file) {
    await initEditor()
    await nextTick()
    setupCompositionHandlers()

    // 等待编辑器内容完全渲染后再加载状态并应用高亮/划线
    // 确保内容已经设置完成，特别是对于章节编辑器
    if (editorStore.file?.type === 'chapter') {
      // 多等待几个 tick，确保内容已经渲染到 DOM
      await nextTick()
      await nextTick()
      // 额外等待一小段时间，确保 TipTap 编辑器内容已经完全渲染
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // 在编辑器初始化完成后，加载当前书籍的人物高亮和禁词提示开关状态
    // 这样 loadCharacterHighlightState 和 loadBannedWordsHintState 中的自动应用逻辑才能正常工作
    if (props.bookName && editor.value && editorStore.file?.type === 'chapter') {
      await loadCharacterHighlightState(props.bookName)
      await loadBannedWordsHintState(props.bookName)
    }
  }
  // 如果 file 不存在，watch 会在文件加载后触发初始化

  // 监听窗口关闭事件，确保设置被保存（组件在 keep-alive 中仍可能收到 beforeunload）
  window.addEventListener('beforeunload', handleWindowClose)
})

onActivated(async () => {
  editorStore.registerExternalSaveHandler(saveFile)
  document.addEventListener('keydown', handleKeydown)
  await nextTick()
  resumeChapterDecorationTimers()
})

onDeactivated(async () => {
  editorStore.registerExternalSaveHandler(null)
  document.removeEventListener('keydown', handleKeydown)

  stopCharacterHighlightTimer()
  stopBannedWordsHintTimer()

  if (saveTimer.value) clearTimeout(saveTimer.value)
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)

  await editorStore.saveEditorSettings({
    fontFamily: menubarState.value.fontFamily,
    fontSize: menubarState.value.fontSize,
    lineHeight: menubarState.value.lineHeight,
    paragraphSpacing: menubarState.value.paragraphSpacing,
    globalBoldMode: menubarState.value.isBold,
    globalItalicMode: menubarState.value.isItalic
  })

  await autoSaveContent()
})

onBeforeUnmount(async () => {
  editorStore.registerExternalSaveHandler(null)
  // 移除窗口关闭监听器
  window.removeEventListener('beforeunload', handleWindowClose)

  // 移除输入法事件监听器
  if (editor.value && editor.value.view && editor.value.view.dom) {
    const editorElement = editor.value.view.dom
    if (compositionStartHandler) {
      editorElement.removeEventListener('compositionstart', compositionStartHandler)
    }
    if (compositionEndHandler) {
      editorElement.removeEventListener('compositionend', compositionEndHandler)
    }
  }

  // 停止人物高亮定时器
  stopCharacterHighlightTimer()

  // 停止禁词提示定时器
  stopBannedWordsHintTimer()

  if (saveTimer.value) clearTimeout(saveTimer.value)
  if (styleUpdateTimer) clearTimeout(styleUpdateTimer)

  // 保存编辑器设置
  await editorStore.saveEditorSettings({
    fontFamily: menubarState.value.fontFamily,
    fontSize: menubarState.value.fontSize,
    lineHeight: menubarState.value.lineHeight,
    paragraphSpacing: menubarState.value.paragraphSpacing,
    globalBoldMode: menubarState.value.isBold,
    globalItalicMode: menubarState.value.isItalic
  })

  // 保存最后的内容
  await autoSaveContent()

  // 重置编辑会话
  editorStore.resetEditingSession()

  // 移除键盘事件监听器
  document.removeEventListener('keydown', handleKeydown)

  // 销毁编辑器
  editor.value && editor.value.destroy()
})

// 保存内容的通用函数
async function saveFile(showMessage = false) {
  const file = editorStore.file
  if (!file) {
    if (showMessage) ElMessage.warning(t('editorPanel.noChapterOrNoteSelected'))
    return false
  }

  const isNote = file.type === 'note'
  let contentToSave

  if (editor.value) {
    const editorContentComponent = getEditorContentComponent()
    if (editorContentComponent) {
      contentToSave = editorContentComponent.getSaveContent(editor.value)
      if (isNote) {
        const textContent = noteEditorContentRef.value.htmlToPlainText(contentToSave)
        editorStore.setContent(textContent)
        editorStore.updateNoteDraftHtml(file.path, contentToSave)
      } else {
        editorStore.setContent(contentToSave)
      }
    }
  }

  if (contentToSave === undefined) {
    if (isNote) {
      const draft = editorStore.getNoteDraftForPersist(file.path)
      if (draft === null) {
        return false
      }
      contentToSave = draft
    } else {
      contentToSave = editorStore.content
    }
  }

  const saveParams = {
    bookName: props.bookName,
    newName: editorStore.chapterTitle,
    content: contentToSave
  }

  let result
  if (file.type === 'note') {
    result = await window.electron.editNote({
      ...saveParams,
      notebookName: file.notebook,
      noteName: file.name
    })
    if (showMessage && result.success) emit('refresh-notes')
  } else if (file.type === 'chapter') {
    result = await window.electron.saveChapter({
      ...saveParams,
      volumeName: file.volume,
      chapterName: file.name
    })
    if (showMessage && result.success) {
      emit('refresh-chapters')
      // 保存成功后，重新加载书籍总字数（确保与服务器同步）
      if (editorStatsRef.value) {
        await editorStatsRef.value.loadBookTotalWords(true)
      }
    }
  }

  if (result?.success) {
    if (result.name && result.name !== file.name) {
      editorStore.setFile({ ...file, name: result.name })
      if (file.type === 'note') {
        emit('refresh-notes')
      } else if (file.type === 'chapter') {
        emit('refresh-chapters')
      }
    }
    if (showMessage) ElMessage.success(t('editorPanel.saveSuccess'))
    return true
  } else {
    if (showMessage) ElMessage.error(result?.message || t('editorPanel.saveFailed'))
    else ElMessage.error(result?.message || t('editorPanel.autoSaveFailed'))
    return false
  }
}

// 手动保存内容
async function saveContent() {
  await saveFile(true)
}

// 搜索面板控制
function toggleSearchPanel() {
  searchPanelVisible.value = !searchPanelVisible.value
}

function closeSearchPanel() {
  searchPanelVisible.value = false
}

/**
 * 将润色后的纯文本转为编辑器 HTML（按双换行分段为 <p>，段内 \n 转 <br>）
 * @param {string} text - 纯文本
 * @returns {string} HTML
 */
function plainTextToEditorHtml(text) {
  if (!text || !text.trim()) return '<p></p>'
  const escape = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  const paragraphs = text.trim().split(/\n\n+/)
  return (
    paragraphs.map((p) => '<p>' + escape(p.trim()).replace(/\n/g, '<br>') + '</p>').join('') ||
    '<p></p>'
  )
}

function normalizeAppendText(appendText) {
  const cleaned = String(appendText || '').trim()
  if (!cleaned) return ''
  // 插入到章节末尾时，尽量从新段落开始
  return `\n\n${cleaned}`
}

async function getPreviousChapterContextInfo() {
  const currentFile = editorStore.file
  if (!props.bookName || !currentFile || currentFile.type !== 'chapter') {
    return { hasPrevious: false, contextText: '' }
  }
  if (!window.electron?.loadChapters || !window.electron?.readChapter) {
    return { hasPrevious: false, contextText: '' }
  }

  try {
    const chaptersTree = await window.electron.loadChapters(props.bookName)
    if (!Array.isArray(chaptersTree) || chaptersTree.length === 0) {
      return { hasPrevious: false, contextText: '' }
    }

    const flatChapters = []
    chaptersTree.forEach((volume) => {
      if (!volume || volume.type !== 'volume' || !Array.isArray(volume.children)) return
      volume.children.forEach((chapter) => {
        if (!chapter || chapter.type !== 'chapter') return
        flatChapters.push({
          name: chapter.name,
          path: chapter.path,
          volumeName: volume.name
        })
      })
    })

    if (flatChapters.length === 0) {
      return { hasPrevious: false, contextText: '' }
    }

    const currentIndex = flatChapters.findIndex(
      (chapter) =>
        chapter.path === currentFile.path ||
        (chapter.name === currentFile.name && chapter.volumeName === currentFile.volume)
    )
    if (currentIndex <= 0) {
      return { hasPrevious: false, contextText: '' }
    }

    const previousChapter = flatChapters[currentIndex - 1]
    const readRes = await window.electron.readChapter(
      props.bookName,
      previousChapter.volumeName,
      previousChapter.name
    )
    if (!readRes?.success || !readRes.content) {
      return { hasPrevious: true, contextText: '' }
    }

    const previousText = String(readRes.content).trim()
    if (!previousText) {
      return { hasPrevious: true, contextText: '' }
    }

    const tailContext = previousText.slice(-PREVIOUS_CHAPTER_CONTEXT_LENGTH)
    return { hasPrevious: true, contextText: tailContext }
  } catch (error) {
    console.error('获取上一章上下文失败:', error)
    return { hasPrevious: false, contextText: '' }
  }
}

/** 下拉选择：润色选中文本 / 润色整章 */
function handlePolishCommand(command) {
  if (command === 'selection') {
    handlePolishSelection()
  } else if (command === 'chapter') {
    handlePolishChapter()
  }
}

function handleContinueClick() {
  const targetWords = Number(editorStore.chapterTargetWords) || 0
  const currentWords = Number(contentWordCount.value) || 0
  if (targetWords > 0 && currentWords >= targetWords) {
    ElMessage.warning(t('editorPanel.chapterReachedTarget'))
    return
  }
  if (continueAllowWords.value <= 0) {
    ElMessage.warning(t('editorPanel.continueWordsNotEnough'))
    return
  }
  continuePromptText.value = ''
  continuePromptDialogVisible.value = true
}

async function confirmContinuePrompt() {
  const ed = editor.value
  if (!ed) {
    ElMessage.warning(t('editorPanel.editorNotReady'))
    return
  }
  const fullText = ed.getText() || ''
  const currentWords = getPlainTextWordCount(fullText)
  if (!window.electron?.continueWriteWithAI) {
    ElMessage.error(t('editorPanel.aiContinueUnsupported'))
    return
  }

  const previousInfo = await getPreviousChapterContextInfo()
  if (!previousInfo.hasPrevious && currentWords < MIN_CONTINUE_WORDS_WITHOUT_PREVIOUS) {
    ElMessage.warning(
      t('editorPanel.noContinuableContent', { min: MIN_CONTINUE_WORDS_WITHOUT_PREVIOUS })
    )
    return
  }

  let sourceText = fullText.trim()
  if (!sourceText) {
    if (previousInfo.contextText) {
      sourceText = previousInfo.contextText
      ElMessage.info(t('editorPanel.chapterEmptyUsePrevious'))
    } else {
      ElMessage.warning(
        t('editorPanel.noContinuableContent', { min: MIN_CONTINUE_WORDS_WITHOUT_PREVIOUS })
      )
      return
    }
  }

  const maxAddWords = continueAllowWords.value
  if (!maxAddWords || maxAddWords <= 0) {
    ElMessage.warning(t('editorPanel.continueWordsNotEnough'))
    return
  }
  continueLoading.value = true
  try {
    const res = await window.electron.continueWriteWithAI({
      text: sourceText,
      prompt: continuePromptText.value,
      maxAddWords
    })
    if (!res?.success) {
      ElMessage.error(res?.message || t('editorPanel.continueFailed'))
      return
    }
    const content = (res.content || '').trim()
    if (!content) {
      ElMessage.error(t('editorPanel.continueEmpty'))
      return
    }
    // 兜底：若 AI 返回过长，仍展示结果；后续插入时会导致超限，但主约束已通过 maxAddWords 尽量控制
    continueResultText.value = content
    continuePromptDialogVisible.value = false
    continueResultDialogVisible.value = true
  } catch (e) {
    ElMessage.error(e?.message || t('editorPanel.continueRequestError'))
  } finally {
    continueLoading.value = false
  }
}

async function copyContinueText() {
  if (!continueResultText.value) return
  try {
    await navigator.clipboard.writeText(continueResultText.value)
    ElMessage.success(t('editorPanel.copiedToClipboard'))
  } catch {
    ElMessage.error(t('editorPanel.copyFailed'))
  }
}

function confirmContinueInsert() {
  const ed = editor.value
  const text = continueResultText.value
  if (!ed || !text) return

  const appendText = normalizeAppendText(text)
  if (!appendText) return

  // 追加到章节末尾：先聚焦到末尾，再插入纯文本（TipTap 会按换行分段）
  ed.chain().focus('end').insertContent(appendText).run()

  // 额外安全：若插入后已超过 120% 上限，这里不拦截（按需求“前置控制字数”）
  const targetWords = Number(editorStore.chapterTargetWords) || 0
  const maxTotal = Math.floor(targetWords * 1.2)
  const afterText = ed.getText()
  const afterWords = getPlainTextWordCount(afterText)
  if (maxTotal > 0 && afterWords > maxTotal) {
    ElMessage.warning(t('editorPanel.insertedButOverLimit', { max: maxTotal }))
  } else {
    ElMessage.success(t('editorPanel.insertedContinueContent'))
  }

  continueResultDialogVisible.value = false
  continueResultText.value = ''
}

/** 润色选中文本：根据当前选区获取范围与文本 */
async function handlePolishSelection() {
  const ed = editor.value
  if (!ed) {
    ElMessage.warning(t('editorPanel.editorNotReady'))
    return
  }
  const { state } = ed
  const { from, to } = state.selection
  if (from === to) {
    ElMessage.warning(t('editorPanel.selectTextToPolish'))
    return
  }
  const text = state.doc.textBetween(from, to, '\n')
  if (!text.trim()) {
    ElMessage.warning(t('editorPanel.selectedTextEmpty'))
    return
  }
  if (!window.electron?.polishTextWithAI) {
    ElMessage.error(t('editorPanel.aiPolishUnsupported'))
    return
  }
  polishLoading.value = true
  try {
    const res = await window.electron.polishTextWithAI(text)
    if (!res.success) {
      ElMessage.error(res.message || t('editorPanel.polishFailed'))
      return
    }
    polishMode.value = 'selection'
    polishOriginalText.value = text
    polishResultText.value = res.content || ''
    polishReplaceFrom.value = from
    polishReplaceTo.value = to
    polishDialogVisible.value = true
  } catch (e) {
    ElMessage.error(e?.message || t('editorPanel.polishRequestError'))
  } finally {
    polishLoading.value = false
  }
}

/** AI 场景图：校验选区字数后打开场景图抽屉（图像服务在抽屉内选择） */
function handleAISceneImageClick() {
  const ed = editor.value
  if (!ed) {
    ElMessage.warning(t('editorPanel.editorNotReady'))
    return
  }
  const { state } = ed
  const { from, to } = state.selection
  if (from === to) {
    ElMessage.warning(t('editorPanel.selectTextToGenerateScene'))
    return
  }
  const text = state.doc.textBetween(from, to, '\n')
  if (!text.trim()) {
    ElMessage.warning(t('editorPanel.selectedTextEmptySimple'))
    return
  }
  const words = getPlainTextWordCount(text)
  if (words < SCENE_SELECTION_MIN_WORDS) {
    ElMessage.warning(
      t('editorPanel.sceneSelectionTooShort', { current: words, min: SCENE_SELECTION_MIN_WORDS })
    )
    return
  }
  if (words > SCENE_SELECTION_MAX_WORDS) {
    ElMessage.warning(
      t('editorPanel.sceneSelectionTooLong', { current: words, max: SCENE_SELECTION_MAX_WORDS })
    )
    return
  }
  const name = (props.bookName || '').trim()
  if (!name) {
    ElMessage.error(t('editorPanel.invalidBookName'))
    return
  }
  sceneExcerpt.value = text
  sceneDialogVisible.value = true
}

/** 润色整章 */
async function handlePolishChapter() {
  const ed = editor.value
  if (!ed) {
    ElMessage.warning(t('editorPanel.editorNotReady'))
    return
  }
  const fullText = ed.getText()
  if (!fullText || !fullText.trim()) {
    ElMessage.warning(t('editorPanel.chapterContentEmptyCannotPolish'))
    return
  }
  if (!window.electron?.polishTextWithAI) {
    ElMessage.error(t('editorPanel.aiPolishUnsupported'))
    return
  }
  polishLoading.value = true
  try {
    const res = await window.electron.polishTextWithAI(fullText)
    if (!res.success) {
      ElMessage.error(res.message || t('editorPanel.polishFailed'))
      return
    }
    polishMode.value = 'chapter'
    polishOriginalText.value = fullText
    polishResultText.value = res.content || ''
    polishDialogVisible.value = true
  } catch (e) {
    ElMessage.error(e?.message || t('editorPanel.polishRequestError'))
  } finally {
    polishLoading.value = false
  }
}

/** 一键复制：将润色后的文本复制到剪贴板 */
async function copyPolishedText() {
  if (!polishResultText.value) return
  try {
    await navigator.clipboard.writeText(polishResultText.value)
    ElMessage.success(t('editorPanel.copiedToClipboard'))
  } catch {
    ElMessage.error(t('editorPanel.copyFailed'))
  }
}

/** 确认替换：根据 polishMode 替换选中文本或整章 */
function confirmPolishReplace() {
  const ed = editor.value
  if (!ed || !polishResultText.value) return
  if (polishMode.value === 'selection') {
    ed.chain()
      .focus()
      .insertContentAt(
        { from: polishReplaceFrom.value, to: polishReplaceTo.value },
        polishResultText.value
      )
      .run()
    ElMessage.success(t('editorPanel.replacedWithPolishedText'))
  } else {
    const html = plainTextToEditorHtml(polishResultText.value)
    ed.chain().focus().setContent(html).run()
    ElMessage.success(t('editorPanel.replacedWholeChapterWithPolish'))
  }
  polishDialogVisible.value = false
  polishOriginalText.value = ''
  polishResultText.value = ''
}

// 自动保存内容
async function autoSaveContent() {
  await saveFile(false)
}

// 加载人物数据
async function loadCharacters() {
  if (!props.bookName) return
  try {
    const data = await window.electron.readCharacters(props.bookName)
    characters.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('加载人物数据失败:', error)
    characters.value = []
  }
}

// 清除所有人物高亮（不改变光标位置）
function clearCharacterHighlights() {
  if (!editor.value) return

  const { state, view } = editor.value
  const { tr } = state

  // 保存当前选择位置（使用数字位置，而不是选择对象）
  const selectionFrom = state.selection.from
  const selectionTo = state.selection.to

  // 获取 highlight mark 类型
  const highlightType = state.schema.marks.highlight

  // 遍历文档，移除所有高亮标记
  state.doc.descendants((node, pos) => {
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'highlight') {
          // 移除高亮标记，但不改变选择
          const from = pos
          const to = pos + node.nodeSize
          tr.removeMark(from, to, highlightType)
        }
      })
    }
  })

  // 恢复选择位置（使用 TextSelection.create 创建新的选择对象）
  if (tr.steps.length > 0) {
    const newSelection = TextSelection.create(tr.doc, selectionFrom, selectionTo)
    tr.setSelection(newSelection)
    tr.setMeta('addToHistory', false) // 装饰性更新不入撤销栈，避免清空 redo 导致回退按钮闪一下又变灰
    view.dispatch(tr)
  }
}

// 应用人物高亮（不改变光标位置）
function applyCharacterHighlights() {
  if (
    !editor.value ||
    editorStore.file?.type !== 'chapter' ||
    !characterHighlightEnabled.value ||
    characters.value.length === 0
  ) {
    return
  }

  const { state, view } = editor.value
  const { doc, tr, schema } = state

  // 保存当前选择位置（使用数字位置）
  const selectionFrom = state.selection.from
  const selectionTo = state.selection.to

  // 先清除之前的人物高亮（在同一事务中）
  const highlightType = schema.marks.highlight
  doc.descendants((node, pos) => {
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'highlight') {
          const from = pos
          const to = pos + node.nodeSize
          tr.removeMark(from, to, highlightType)
        }
      })
    }
  })

  // 为每个人物名创建匹配项
  const matches = []

  // 转义正则表达式特殊字符的工具函数
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // 遍历文档中的所有文本节点，查找人物名匹配
  characters.value.forEach((character) => {
    if (!character.name || !character.name.trim()) return

    const characterName = character.name.trim()
    // 转义特殊字符，用于正则表达式
    const escapedName = escapeRegExp(characterName)
    // 创建正则表达式，匹配完整的人物名（不区分大小写）
    const regex = new RegExp(escapedName, 'gi')

    // 遍历文档中的所有文本节点（使用当前事务的文档）
    tr.doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text
        let match

        // 重置正则表达式的 lastIndex
        regex.lastIndex = 0

        while ((match = regex.exec(text)) !== null) {
          matches.push({
            from: pos + match.index,
            to: pos + match.index + match[0].length,
            text: match[0],
            color: lightenHighlightColor(character.markerColor || defaultHighlightColor)
          })
        }
      }
    })
  })

  // 按位置排序，从后往前应用高亮（避免位置偏移）
  matches.sort((a, b) => b.from - a.from)

  // 批量应用高亮
  matches.forEach((match) => {
    const highlightMark = highlightType.create({ color: match.color })
    tr.addMark(match.from, match.to, highlightMark)
  })

  // 恢复选择位置（使用 TextSelection.create 创建新的选择对象）
  const newSelection = TextSelection.create(tr.doc, selectionFrom, selectionTo)
  tr.setSelection(newSelection)

  // 应用事务，但不改变焦点；装饰性更新不入撤销栈，避免清空 redo 导致回退按钮闪一下又变灰
  if (tr.steps.length > 0) {
    tr.setMeta('addToHistory', false)
    view.dispatch(tr)
  }
}

// 加载人物高亮开关状态（按书籍）
async function loadCharacterHighlightState(bookName) {
  if (!bookName) {
    characterHighlightEnabled.value = false
    // 清除高亮并停止定时器
    clearCharacterHighlights()
    stopCharacterHighlightTimer()
    return
  }

  try {
    const key = `characterHighlight_${bookName}`
    const savedState = await window.electronStore.get(key)
    // 如果该书籍有保存的状态，使用保存的状态；否则默认关闭
    const newState = savedState === true
    characterHighlightEnabled.value = newState

    // 如果状态是开启的，加载人物数据并应用高亮
    if (newState) {
      await loadCharacters()
      // 等待编辑器初始化完成后再应用高亮
      await nextTick()
      // 确保编辑器内容已经设置完成（检查文档是否有内容）
      if (editor.value && editorStore.file?.type === 'chapter') {
        // 等待内容渲染完成
        await nextTick()
        // 检查文档是否有内容，如果有内容则应用高亮
        const docSize = editor.value.state.doc.content.size
        if (docSize > 0) {
          applyCharacterHighlights()
          startCharacterHighlightTimer()
        }
      }
    } else {
      // 如果状态是关闭的，确保清除高亮并停止定时器
      clearCharacterHighlights()
      stopCharacterHighlightTimer()
    }
  } catch (error) {
    console.error('加载人物高亮状态失败:', error)
    characterHighlightEnabled.value = false
    clearCharacterHighlights()
    stopCharacterHighlightTimer()
  }
}

// 保存人物高亮开关状态（按书籍）
async function saveCharacterHighlightState(bookName, enabled) {
  if (!bookName) return

  try {
    const key = `characterHighlight_${bookName}`
    await window.electronStore.set(key, enabled)
  } catch (error) {
    console.error('保存人物高亮状态失败:', error)
  }
}

// 处理人物高亮开关变化
async function handleCharacterHighlightChange(enabled) {
  // 保存开关状态到当前书籍的设置中
  if (props.bookName) {
    await saveCharacterHighlightState(props.bookName, enabled)
  }

  if (enabled) {
    // 开启高亮：加载人物数据并应用高亮
    await loadCharacters()
    applyCharacterHighlights()
    // 启动定时器，定时检查并更新高亮
    startCharacterHighlightTimer()
  } else {
    // 关闭高亮：清除高亮并停止定时器
    clearCharacterHighlights()
    stopCharacterHighlightTimer()
  }
}

// 启动人物高亮定时器
function startCharacterHighlightTimer() {
  stopCharacterHighlightTimer() // 先清除旧的定时器

  // 每 2 秒检查一次并更新高亮
  characterHighlightTimer = setInterval(() => {
    if (characterHighlightEnabled.value && editor.value && editorStore.file?.type === 'chapter') {
      applyCharacterHighlights()
    }
  }, 2000)
}

// 停止人物高亮定时器
function stopCharacterHighlightTimer() {
  if (characterHighlightTimer) {
    clearInterval(characterHighlightTimer)
    characterHighlightTimer = null
  }
}

// 加载禁词数据
async function loadBannedWords() {
  if (!props.bookName) return
  try {
    const result = await window.electron.getBannedWords(props.bookName)
    if (result.success) {
      bannedWords.value = result.data || []
    } else {
      bannedWords.value = []
    }
  } catch (error) {
    console.error('加载禁词数据失败:', error)
    bannedWords.value = []
  }
}

// 清除所有禁词划线（不改变光标位置）
function clearBannedWordsStrikes() {
  if (!editor.value) return

  const { state, view } = editor.value
  const { tr } = state

  // 保存当前选择位置（使用数字位置）
  const selectionFrom = state.selection.from
  const selectionTo = state.selection.to

  // 获取 strike mark 类型
  const strikeType = state.schema.marks.strike

  // 遍历文档，移除所有划线标记
  state.doc.descendants((node, pos) => {
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'strike') {
          // 移除划线标记，但不改变选择
          const from = pos
          const to = pos + node.nodeSize
          tr.removeMark(from, to, strikeType)
        }
      })
    }
  })

  // 恢复选择位置
  if (tr.steps.length > 0) {
    const newSelection = TextSelection.create(tr.doc, selectionFrom, selectionTo)
    tr.setSelection(newSelection)
    tr.setMeta('addToHistory', false) // 装饰性更新不入撤销栈，避免清空 redo
    view.dispatch(tr)
  }
}

// 应用禁词划线（不改变光标位置）
function applyBannedWordsStrikes() {
  if (
    !editor.value ||
    editorStore.file?.type !== 'chapter' ||
    !bannedWordsHintEnabled.value ||
    bannedWords.value.length === 0
  ) {
    return
  }

  const { state, view } = editor.value
  const { doc, tr, schema } = state

  // 保存当前选择位置（使用数字位置）
  const selectionFrom = state.selection.from
  const selectionTo = state.selection.to

  // 先清除之前的禁词划线（在同一事务中）
  const strikeType = schema.marks.strike
  doc.descendants((node, pos) => {
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type.name === 'strike') {
          const from = pos
          const to = pos + node.nodeSize
          tr.removeMark(from, to, strikeType)
        }
      })
    }
  })

  // 为每个禁词创建匹配项
  const matches = []

  // 转义正则表达式特殊字符的工具函数
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // 遍历文档中的所有文本节点，查找禁词匹配
  bannedWords.value.forEach((bannedWord) => {
    if (!bannedWord || !bannedWord.trim()) return

    const word = bannedWord.trim()
    // 转义特殊字符，用于正则表达式
    const escapedWord = escapeRegExp(word)
    // 创建正则表达式，匹配完整的禁词（不区分大小写）
    const regex = new RegExp(escapedWord, 'gi')

    // 遍历文档中的所有文本节点（使用当前事务的文档）
    tr.doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text
        let match

        // 重置正则表达式的 lastIndex
        regex.lastIndex = 0

        while ((match = regex.exec(text)) !== null) {
          matches.push({
            from: pos + match.index,
            to: pos + match.index + match[0].length,
            text: match[0]
          })
        }
      }
    })
  })

  // 按位置排序，从后往前应用划线（避免位置偏移）
  matches.sort((a, b) => b.from - a.from)

  // 批量应用划线
  matches.forEach((match) => {
    tr.addMark(match.from, match.to, strikeType.create())
  })

  // 恢复选择位置（使用 TextSelection.create 创建新的选择对象）
  const newSelection = TextSelection.create(tr.doc, selectionFrom, selectionTo)
  tr.setSelection(newSelection)

  // 应用事务，但不改变焦点；装饰性更新不入撤销栈，避免清空 redo
  if (tr.steps.length > 0) {
    tr.setMeta('addToHistory', false)
    view.dispatch(tr)
  }
}

// 加载禁词提示开关状态（按书籍）
async function loadBannedWordsHintState(bookName) {
  if (!bookName) {
    bannedWordsHintEnabled.value = false
    // 清除划线并停止定时器
    clearBannedWordsStrikes()
    stopBannedWordsHintTimer()
    return
  }

  try {
    const key = `bannedWordsHint_${bookName}`
    const savedState = await window.electronStore.get(key)
    // 如果该书籍有保存的状态，使用保存的状态；否则默认关闭
    const newState = savedState === true
    bannedWordsHintEnabled.value = newState

    // 如果状态是开启的，加载禁词数据并应用划线
    if (newState) {
      await loadBannedWords()
      // 等待编辑器初始化完成后再应用划线
      await nextTick()
      // 确保编辑器内容已经设置完成（检查文档是否有内容）
      if (editor.value && editorStore.file?.type === 'chapter') {
        // 等待内容渲染完成
        await nextTick()
        // 检查文档是否有内容，如果有内容则应用划线
        const docSize = editor.value.state.doc.content.size
        if (docSize > 0) {
          applyBannedWordsStrikes()
          startBannedWordsHintTimer()
        }
      }
    } else {
      // 如果状态是关闭的，确保清除划线并停止定时器
      clearBannedWordsStrikes()
      stopBannedWordsHintTimer()
    }
  } catch (error) {
    console.error('加载禁词提示状态失败:', error)
    bannedWordsHintEnabled.value = false
    clearBannedWordsStrikes()
    stopBannedWordsHintTimer()
  }
}

// 保存禁词提示开关状态（按书籍）
async function saveBannedWordsHintState(bookName, enabled) {
  if (!bookName) return

  try {
    const key = `bannedWordsHint_${bookName}`
    await window.electronStore.set(key, enabled)
  } catch (error) {
    console.error('保存禁词提示状态失败:', error)
  }
}

// 处理禁词提示开关变化
async function handleBannedWordsHintChange(enabled) {
  // 保存开关状态到当前书籍的设置中
  if (props.bookName) {
    await saveBannedWordsHintState(props.bookName, enabled)
  }

  if (enabled) {
    // 开启提示：加载禁词数据并应用划线
    await loadBannedWords()
    applyBannedWordsStrikes()
    // 启动定时器，定时检查并更新划线
    startBannedWordsHintTimer()
  } else {
    // 关闭提示：清除划线并停止定时器
    clearBannedWordsStrikes()
    stopBannedWordsHintTimer()
  }
}

// 启动禁词提示定时器
function startBannedWordsHintTimer() {
  stopBannedWordsHintTimer() // 先清除旧的定时器

  // 每 2 秒检查一次并更新划线
  bannedWordsHintTimer = setInterval(() => {
    if (bannedWordsHintEnabled.value && editor.value && editorStore.file?.type === 'chapter') {
      applyBannedWordsStrikes()
    }
  }, 2000)
}

// 停止禁词提示定时器
function stopBannedWordsHintTimer() {
  if (bannedWordsHintTimer) {
    clearInterval(bannedWordsHintTimer)
    bannedWordsHintTimer = null
  }
}

/** keep-alive 从子页回到编辑器时恢复人物高亮/禁词定时器（停用阶段已停掉，避免后台空跑） */
function resumeChapterDecorationTimers() {
  if (!editor.value || editorStore.file?.type !== 'chapter') return
  const docSize = editor.value.state.doc.content.size
  if (docSize <= 0) return
  if (characterHighlightEnabled.value) {
    startCharacterHighlightTimer()
  }
  if (bannedWordsHintEnabled.value) {
    startBannedWordsHintTimer()
  }
}

const emit = defineEmits(['refresh-notes', 'refresh-chapters'])

// 监听当前文件类型，动态设置首行缩进和编辑器模式
watch(
  () => editorStore.file,
  async (file) => {
    if (editor.value) {
      const isChapter = file?.type === 'chapter'
      const style = document.querySelector('.tiptap')
      if (style) {
        style.style.textIndent = isChapter ? '2em' : '0'
      }

      // 如果切换到笔记模式，需要重新初始化编辑器以加载 NoteOutlineParagraph 扩展
      // 但这里我们已经在 onMounted 中根据文件类型加载了扩展
      // 所以只需要确保内容正确加载即可
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  color: var(--text-base);
  min-height: 0;
  overflow: hidden;
}
.chapter-title {
  padding: 8px 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-soft);
  display: flex;
  align-items: center;
  gap: 12px;
}
.chapter-title-input {
  font-size: 20px;
  font-weight: bold;
  flex: 1;
}
.character-highlight-switch,
.banned-words-hint-switch {
  flex-shrink: 0;
}

/* 编辑区包裹层：用于固定右上角 AI 润色按钮 */
.editor-content-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.editor-content {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
  background: var(--bg-primary);
  white-space: pre-wrap; // 保证Tab缩进和换行显示
  font-family: inherit, monospace;
}

/* 编辑区右上角固定容器，保证按钮始终在编辑区右上角 */
.ai-polish-wrap {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

/* AI 润色按钮：默认半透明，悬停不透明 */
.ai-polish-btn {
  min-width: 100px;
  max-width: 132px;
  height: auto;
  justify-content: center;
  white-space: normal;
  line-height: 1.2;
  opacity: 0.45;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 1;
  }
}

.ai-continue-btn {
  min-width: 100px;
  max-width: 132px;
  height: auto;
  justify-content: center;
  white-space: normal;
  line-height: 1.2;
  opacity: 0.45;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 1;
  }
}

.ai-scene-btn {
  min-width: 100px;
  max-width: 152px;
  height: auto;
  justify-content: center;
  white-space: normal;
  line-height: 1.2;
  opacity: 0.45;
  transition: opacity 0.2s ease;
  &:hover {
    opacity: 1;
  }
}
.continue-words-tip {
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.continue-result-body {
  min-height: 320px;
}
.continue-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.continue-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.continue-content {
  min-height: 320px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
  background: var(--el-color-success-light-9);
  color: var(--el-text-color-primary);
}

/* AI 润色结果弹框：左右布局 */
.polish-dialog-body {
  display: flex;
  flex-direction: row;
  gap: 16px;
  min-height: 320px;
}
.polish-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.polish-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}
.polish-content {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-y: auto;
  &.original {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-regular);
  }
  &.polished {
    background: var(--el-color-primary-light-9);
    color: var(--el-text-color-primary);
  }
}

::v-deep(.tiptap) {
  height: max-content;
  min-height: 100%;
  white-space: pre-wrap; // 保证Tab缩进和换行显示
  // 底部留出约一屏可滚动空间，使写作时最后一行可滚动到视口上部，焦点保持在编辑区上方
  padding-bottom: 70vh;
  // 字体、字号、行高、段落间距通过 updateEditorStyle 设置到根元素（--paragraph-spacing）

  &:focus {
    outline: none;
  }

  // 段落之间间距：由菜单栏「段落间距」控制，通过 CSS 变量 --paragraph-spacing 应用
  p {
    margin-bottom: var(--paragraph-spacing, 0);
  }

  // 加粗样式 - 确保在所有情况下都生效
  strong,
  b,
  [data-type='bold'] {
    font-weight: 700;
    font-style: normal;
  }

  // 倾斜样式 - 确保在所有情况下都生效
  em,
  i,
  [data-type='italic'] {
    font-style: italic;
    font-weight: inherit;
  }

  // 同时加粗和倾斜
  strong em,
  strong i,
  b em,
  b i,
  em strong,
  i strong,
  em b,
  i b {
    font-weight: 700;
    font-style: italic;
  }

  // 删除线样式 - 用于禁词提示
  s,
  strike,
  del,
  [data-type='strike'] {
    text-decoration: line-through;
    color: red;
  }

  // 搜索高亮样式 - 使用选择高亮
  ::selection {
    background-color: #409eff;
    color: white;
  }

  // // 搜索匹配文本的高亮样式（仅用于搜索功能，不使用 data-color）
  // .search-highlight:not([data-color]) {
  //   background-color: #ffeb3b !important;
  //   color: #000 !important;
  //   padding: 1px 2px;
  //   border-radius: 2px;
  //   border: 1px solid #f4d03f;
  // }

  // .search-highlight-current {
  //   background-color: #409eff !important;
  //   color: white !important;
  //   padding: 1px 2px;
  //   border-radius: 2px;
  //   box-shadow: 0 0 4px rgba(64, 158, 255, 0.5);
  // }

  // Tiptap highlight扩展的样式（支持多颜色）
  // 确保有 data-color 属性的 mark 元素使用 TipTap 扩展设置的颜色
  // TipTap 扩展会通过内联 style 设置 background-color，优先级高于类选择器
  // mark.search-highlight[data-color] {
  //   // padding: 1px 2px;
  //   // border-radius: 2px;
  //   // 移除强制背景色，让内联样式生效
  //   // background-color: unset !important;
  //   // 颜色由 TipTap 扩展通过 style 属性设置
  // }

  // 笔记大纲样式（段落间距与正文一致，使用 --paragraph-spacing）
  p[data-note-outline] {
    position: relative;
    margin-top: 6px;
    margin-bottom: var(--paragraph-spacing, 6px);
    // 缩进通过 renderHTML 中的 style 属性控制（padding-left: level * 24px）
    // 但需要为控制按钮留出空间
    min-height: 24px;
    line-height: 1.6;
    display: block;
    width: 100%;

    &:hover {
      .note-outline-controls {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    }
  }

  // 控制按钮容器（使用全局样式，因为是通过装饰器添加的）
  :global(.note-outline-controls) {
    position: absolute;
    left: -50px;
    top: 50%;
    transform: translateY(-50%);
    height: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 10;

    .note-outline-toggle {
      width: 16px;
      height: 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 10px;
      color: var(--text-base, #333);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 2px;
      transition: background-color 0.2s;
      flex-shrink: 0;

      &:hover {
        background-color: var(--bg-mute, rgba(0, 0, 0, 0.05));
      }
    }

    .note-outline-spacer {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .note-outline-drag-handle {
      width: 12px;
      height: 12px;
      cursor: grab !important;
      font-size: 10px;
      color: var(--text-mute, #999);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      user-select: none;
      flex-shrink: 0;
      pointer-events: auto !important;

      &:hover {
        cursor: grab !important;
        color: var(--text-base, #333);
      }

      &:active {
        cursor: grabbing !important;
      }
    }
  }

  // 当段落悬停时显示控制按钮
  p[data-note-outline]:hover ~ :global(.note-outline-controls),
  p[data-note-outline]:hover :global(.note-outline-controls) {
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  // 确保段落悬停时，控制按钮可以交互
  p[data-note-outline]:hover {
    :global(.note-outline-controls) {
      opacity: 1 !important;
      pointer-events: auto !important;

      .note-outline-drag-handle {
        pointer-events: auto !important;
        cursor: grab !important;
      }
    }
  }
}
:deep(.el-drawer__header) {
  margin-bottom: 0px;
  padding-bottom: 20px;
}
:deep(.el-drawer__body) {
  padding: 0px;
}
</style>
