<template>
  <div class="editor-panel">
    <!-- 菜单栏 -->
    <div class="editor-toolbar">
      <el-select v-model="fontFamily" class="toolbar-item" size="small" style="width: 100px">
        <el-option label="默认" value="inherit" />
        <el-option label="宋体" value="SimSun" />
        <el-option label="微软雅黑" value="Microsoft YaHei" />
        <el-option label="楷体" value="KaiTi" />
        <el-option label="黑体" value="SimHei" />
      </el-select>
      <el-select v-model="fontSize" class="toolbar-item" size="small" style="width: 80px">
        <el-option label="12px" value="12px" />
        <el-option label="13px" value="13px" />
        <el-option label="14px" value="14px" />
        <el-option label="15px" value="15px" />
        <el-option label="16px" value="16px" />
        <el-option label="18px" value="18px" />
        <el-option label="20px" value="20px" />
        <el-option label="22px" value="22px" />
        <el-option label="24px" value="24px" />
      </el-select>
      <el-select v-model="lineHeight" class="toolbar-item" size="small" style="width: 60px">
        <el-option label="1.2" value="1.2" />
        <el-option label="1.3" value="1.3" />
        <el-option label="1.4" value="1.4" />
        <el-option label="1.5" value="1.5" />
        <el-option label="1.6" value="1.6" />
        <el-option label="1.8" value="1.8" />
        <el-option label="2" value="2" />
      </el-select>
      <el-button
        class="toolbar-item"
        size="small"
        :type="isBold ? 'primary' : 'default'"
        @click="toggleBold"
      >
        <b>B</b>
      </el-button>
      <el-button
        class="toolbar-item"
        size="small"
        :type="isItalic ? 'primary' : 'default'"
        @click="toggleItalic"
      >
        <i>I</i>
      </el-button>
      <el-button size="small" class="toolbar-item" @click="copyContent">
        <el-icon><DocumentCopy /></el-icon>
      </el-button>
      <!-- <el-button size="small" class="toolbar-item" @click="undo"> 撤销 </el-button> -->
      <el-button size="small" class="toolbar-item" type="primary" @click="saveContent">
        保存
      </el-button>
    </div>
    <!-- 章节标题 -->
    <div class="chapter-title">
      <el-input
        v-model="chapterTitle"
        placeholder="章节标题"
        maxlength="20"
        class="chapter-title-input"
      />
    </div>
    <!-- 正文内容编辑区 -->
    <div class="editor-content">
      <EditorContent :editor="editor" />
    </div>
    <div class="editor-stats">
      <span class="word-count">章节字数：{{ chapterWords }}</span>
      <span v-if="typingSpeed.perMinute > 0" class="typing-speed">
        码字速度：{{ typingSpeed.perMinute }}字/分钟 ({{ typingSpeed.perHour }}字/小时)
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import TextAlign from '@tiptap/extension-text-align'
import { useEditorStore } from '@renderer/stores/editor'
import { Extension } from '@tiptap/core'
import { Collapsible } from '@renderer/extensions/Collapsible'

const editorStore = useEditorStore()

const props = defineProps({
  bookName: String
})

// 计算属性
const chapterWords = computed(() => editorStore.chapterWords)
const typingSpeed = computed(() => editorStore.typingSpeed)

const chapterTitle = computed({
  get: () => editorStore.chapterTitle,
  set: (val) => editorStore.setChapterTitle(val)
})

const fontFamily = ref('inherit')
const fontSize = ref('16px')
const lineHeight = ref('1.6')
const align = ref('left')

const editor = ref(null)
let saveTimer = null

function plainTextToHtml(text) {
  if (!text) return ''
  // 1. 按行分割
  const lines = text.split('\n')
  // 2. 每行处理缩进和空格
  const htmlLines = lines.map((line) => {
    // 替换Tab为8个&nbsp;
    let html = line.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
    // 替换连续空格为 &nbsp;
    html = html.replace(/ {2,}/g, (match) => '&nbsp;'.repeat(match.length))
    // 包裹为<p>
    return html ? `<p>${html}</p>` : ''
  })
  // 3. 拼接
  return htmlLines.join('')
}

// 监听 store 内容变化，回显到编辑器
watch(
  () => editorStore.file,
  (newFile, oldFile) => {
    if (editor.value && newFile?.path !== oldFile?.path) {
      editor.value.commands.setContent(plainTextToHtml(editorStore.content || ''))
    }
  }
)

// 支持Tab键插入制表符
const TabInsert = Extension.create({
  name: 'tabInsert',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        this.editor.commands.insertContent('\t')
        return true
      }
    }
  }
})

onMounted(() => {
  editor.value = new Editor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TabInsert,
      Collapsible
    ],
    content: editorStore.content,
    editorProps: {
      attributes: {
        style: () =>
          `font-family: ${fontFamily.value}; font-size: ${fontSize.value}; line-height: ${lineHeight.value}; text-align: ${align.value}; white-space: pre-wrap;`
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getText()
      editorStore.setContent(content)
      // 防抖保存
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        autoSaveContent()
      }, 1000)
    }
  })
  editor.value.commands.setContent(plainTextToHtml(editorStore.content || ''))
})

onBeforeUnmount(async () => {
  if (saveTimer) clearTimeout(saveTimer)
  // 保存最后的内容
  await autoSaveContent()
  // 重置码字统计
  editorStore.resetTypingTimer()
  editor.value && editor.value.destroy()
})

// 手动保存内容
async function saveContent() {
  const file = editorStore.file
  if (!file) {
    ElMessage.warning('未选择章节或笔记')
    return
  }

  let result
  if (file.type === 'note') {
    result = await window.electron.editNote({
      bookName: props.bookName,
      notebookName: file.notebook,
      noteName: file.name,
      newName: editorStore.chapterTitle,
      content: editorStore.content
    })
    if (result.success) {
      ElMessage.success('保存成功')
      if (result.name && result.name !== file.name) {
        editorStore.setFile({ ...file, name: result.name })
      }
      emit('refresh-notes')
    } else {
      ElMessage.error(result?.message || '保存失败')
    }
  } else if (file.type === 'chapter') {
    result = await window.electron.saveChapter({
      bookName: props.bookName,
      volumeName: file.volume,
      chapterName: file.name,
      newName: editorStore.chapterTitle,
      content: editorStore.content
    })
    if (result.success) {
      ElMessage.success('保存成功')
      if (result.name && result.name !== file.name) {
        editorStore.setFile({ ...file, name: result.name })
      }
      emit('refresh-chapters')
    } else {
      ElMessage.error(result?.message || '保存失败')
    }
  }
}

// 自动保存内容
async function autoSaveContent() {
  const file = editorStore.file
  if (!file) return

  let result
  if (file.type === 'note') {
    result = await window.electron.editNote({
      bookName: props.bookName,
      notebookName: file.notebook,
      noteName: file.name,
      newName: editorStore.chapterTitle,
      content: editorStore.content
    })
  } else if (file.type === 'chapter') {
    result = await window.electron.saveChapter({
      bookName: props.bookName,
      volumeName: file.volume,
      chapterName: file.name,
      newName: editorStore.chapterTitle,
      content: editorStore.content
    })
  }

  if (result?.success) {
    if (result.name && result.name !== file.name) {
      editorStore.setFile({ ...file, name: result.name })
    }
  } else {
    ElMessage.error(result?.message || '自动保存失败')
  }
}

// 菜单栏操作
const isBold = ref(false)
const isItalic = ref(false)

function toggleBold() {
  editor.value.chain().focus().toggleBold().run()
  isBold.value = editor.value.isActive('bold')
}

function toggleItalic() {
  editor.value.chain().focus().toggleItalic().run()
  isItalic.value = editor.value.isActive('italic')
}

function copyContent() {
  const html = editor.value.getHTML()
  navigator.clipboard.writeText(html)
  ElMessage.success('已复制内容')
}

const emit = defineEmits(['refresh-notes', 'refresh-chapters'])

// 监听字体、字号、行高变化，动态应用样式
watch([fontFamily, fontSize, lineHeight], () => {
  if (editor.value) {
    editor.value.options.editorProps.attributes.style = `font-family: ${fontFamily.value}; font-size: ${fontSize.value}; line-height: ${lineHeight.value}; text-align: ${align.value};`
    editor.value.view.updateState(editor.value.state)
  }
})

// 监听当前文件类型，动态设置首行缩进
watch(
  () => editorStore.file,
  (file) => {
    if (editor.value) {
      const isChapter = file?.type === 'chapter'
      const style = document.querySelector('.tiptap')
      if (style) {
        style.style.textIndent = isChapter ? '2em' : '0'
      }
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
  background: var(--bg-soft);
  color: var(--text-primary);
  min-height: 0;
  overflow: hidden;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-soft);
}
.toolbar-item {
  margin: 0;
}
.chapter-title {
  padding: 8px 15px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-soft);
}
.chapter-title-input {
  font-size: 20px;
  font-weight: bold;
}
.editor-content {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
  background: var(--bg-primary);
  white-space: pre-wrap; // 保证Tab缩进和换行显示
  font-family: inherit, monospace;
  > div {
    height: 100%;
  }
}
.editor-stats {
  height: 28px;
  width: 100%;
  line-height: 28px;
  padding: 0px 15px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--text-primary);
}
::v-deep(.tiptap) {
  height: 100%;
  white-space: pre-wrap; // 保证Tab缩进和换行显示
  font-family: inherit, monospace;
  &:focus {
    outline: none;
  }
}
</style>
