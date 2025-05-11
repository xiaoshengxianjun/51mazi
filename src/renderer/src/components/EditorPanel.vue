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
        <el-option label="14px" value="14px" />
        <el-option label="16px" value="16px" />
        <el-option label="18px" value="18px" />
        <el-option label="20px" value="20px" />
      </el-select>
      <el-select v-model="lineHeight" class="toolbar-item" size="small" style="width: 60px">
        <el-option label="1.2" value="1.2" />
        <el-option label="1.5" value="1.5" />
        <el-option label="1.8" value="1.8" />
        <el-option label="2" value="2" />
      </el-select>
      <el-button-group class="toolbar-item">
        <el-button size="small" @click="toggleBold" :type="isBold ? 'primary' : 'default'">
          <b>B</b>
        </el-button>
        <el-button size="small" @click="toggleItalic" :type="isItalic ? 'primary' : 'default'">
          <i>I</i>
        </el-button>
      </el-button-group>
      <el-button-group class="toolbar-item">
        <el-button
          size="small"
          @click="setAlign('left')"
          :type="align === 'left' ? 'primary' : 'default'"
        >
          左
        </el-button>
        <el-button
          size="small"
          @click="setAlign('center')"
          :type="align === 'center' ? 'primary' : 'default'"
        >
          中
        </el-button>
        <el-button
          size="small"
          @click="setAlign('right')"
          :type="align === 'right' ? 'primary' : 'default'"
        >
          右
        </el-button>
      </el-button-group>
      <el-button size="small" class="toolbar-item" @click="copyContent">
        <el-icon><DocumentCopy /></el-icon>
      </el-button>
      <el-button size="small" class="toolbar-item" @click="undo"> 撤销 </el-button>
      <el-button size="small" class="toolbar-item" @click="redo"> 重做 </el-button>
      <el-button size="small" class="toolbar-item" type="primary" @click="saveContent">
        保存
      </el-button>
    </div>
    <!-- 章节标题 -->
    <div class="chapter-title">
      <el-input
        v-model="chapterTitle"
        placeholder="章节标题"
        size="large"
        class="chapter-title-input"
      />
    </div>
    <!-- 正文内容编辑区 -->
    <div class="editor-content">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import TextAlign from '@tiptap/extension-text-align'
// 可引入更多扩展，如 FontFamily、FontSize、LineHeight、Collapsible（段落折叠）等

const props = defineProps({
  bookName: String
  // 可扩展章节ID、章节内容等props
})

const chapterTitle = ref('')
const fontFamily = ref('inherit')
const fontSize = ref('16px')
const lineHeight = ref('1.6')
const align = ref('left')

const editor = ref(null)

onMounted(() => {
  editor.value = new Editor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      TextAlign.configure({ types: ['heading', 'paragraph'] })
      // 后续可引入 Collapsible 扩展
    ],
    content: '',
    editorProps: {
      attributes: {
        style: () =>
          `font-family: ${fontFamily.value}; font-size: ${fontSize.value}; line-height: ${lineHeight.value}; text-align: ${align.value};`
      }
    }
  })
})

onBeforeUnmount(() => {
  editor.value && editor.value.destroy()
})

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
function setAlign(val) {
  align.value = val
  editor.value.chain().focus().setTextAlign(val).run()
}
function copyContent() {
  const html = editor.value.getHTML()
  navigator.clipboard.writeText(html)
  ElMessage.success('已复制内容')
}
function undo() {
  editor.value.chain().focus().undo().run()
}
function redo() {
  editor.value.chain().focus().redo().run()
}
function saveContent() {
  // TODO: 保存章节内容和标题到主进程
  ElMessage.success('保存成功（示例）')
}

// 监听字体、字号、行高变化，动态应用样式
watch([fontFamily, fontSize, lineHeight], () => {
  if (editor.value) {
    editor.value.options.editorProps.attributes.style = `font-family: ${fontFamily.value}; font-size: ${fontSize.value}; line-height: ${lineHeight.value}; text-align: ${align.value};`
    editor.value.view.updateState(editor.value.state)
  }
})
</script>

<style lang="scss" scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  color: #000;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid #eee;
  background: #fafbfc;
}
.chapter-title {
  padding: 12px 16px 0 16px;
  border-bottom: 1px solid #eee;
  background: #fafbfc;
}
.chapter-title-input {
  font-size: 20px;
  font-weight: bold;
}
.editor-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
</style>
