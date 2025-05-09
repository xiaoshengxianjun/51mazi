<template>
  <div class="editor-container">
    <!-- 左侧面板 -->
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <!-- 笔记部分 -->
      <div class="panel-section">
        <div class="section-header" @click="toggleNotes">
          <el-icon class="toggle-icon" :class="{ 'is-active': notesExpanded }">
            <ArrowRight />
          </el-icon>
          <span>笔记</span>
        </div>
        <div v-show="notesExpanded" class="section-content">
          <el-tree
            :data="notesTree"
            :props="defaultProps"
            node-key="id"
            default-expand-all
            @node-click="handleNoteClick"
          >
            <template #default="{ node }">
              <div class="custom-tree-node">
                <el-icon><Document /></el-icon>
                <span>{{ node.label }}</span>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 正文部分 -->
      <div class="panel-section">
        <div class="section-header" @click="toggleChapters">
          <el-icon class="toggle-icon" :class="{ 'is-active': chaptersExpanded }">
            <ArrowRight />
          </el-icon>
          <span>正文</span>
        </div>
        <div v-show="chaptersExpanded" class="section-content">
          <el-tree
            :data="chaptersTree"
            :props="defaultProps"
            node-key="id"
            default-expand-all
            @node-click="handleChapterClick"
          >
            <template #default="{ node, data }">
              <div class="custom-tree-node">
                <el-icon>
                  <component :is="data.type === 'volume' ? 'Folder' : 'Document'" />
                </el-icon>
                <span>{{ node.label }}</span>
              </div>
            </template>
          </el-tree>
        </div>
      </div>
    </div>

    <!-- 拖拽条 -->
    <div class="resize-handle" @mousedown="startResize" @dblclick="resetPanelWidth"></div>

    <!-- 右侧编辑区 -->
    <div class="right-panel">
      <div v-if="currentFile" class="editor-header">
        <span class="file-name">{{ currentFile.name }}</span>
        <div class="editor-actions">
          <el-button type="primary" size="small" @click="saveContent">保存</el-button>
        </div>
      </div>
      <div class="editor-content">
        <el-input
          v-model="editorContent"
          type="textarea"
          :rows="20"
          placeholder="开始写作..."
          resize="none"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const bookName = route.query.name

// 面板展开状态
const notesExpanded = ref(false)
const chaptersExpanded = ref(true)

// 面板宽度控制
const leftPanelWidth = ref(280)
const MIN_WIDTH = 200
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 280

// 拖拽状态
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 树形控件配置
const defaultProps = {
  children: 'children',
  label: 'name'
}

// 模拟数据 - 实际应该从主进程获取
const notesTree = ref([
  {
    id: '1',
    name: '写作大纲.md',
    type: 'note'
  },
  {
    id: '2',
    name: '人物设定.md',
    type: 'note'
  }
])

const chaptersTree = ref([
  {
    id: 'v1',
    name: '正文',
    type: 'volume',
    children: [
      {
        id: 'c1',
        name: '第一章',
        type: 'chapter'
      },
      {
        id: 'c2',
        name: '第二章',
        type: 'chapter'
      }
    ]
  }
])

// 当前编辑的文件
const currentFile = ref(null)
const editorContent = ref('')

// 切换笔记面板
function toggleNotes() {
  notesExpanded.value = !notesExpanded.value
}

// 切换章节面板
function toggleChapters() {
  chaptersExpanded.value = !chaptersExpanded.value
}

// 处理笔记点击
function handleNoteClick(data) {
  currentFile.value = {
    name: data.name,
    type: 'note',
    path: data.path
  }
  // TODO: 从主进程读取文件内容
  editorContent.value = '笔记内容...'
}

// 处理章节点击
function handleChapterClick(data) {
  if (data.type === 'chapter') {
    currentFile.value = {
      name: data.name,
      type: 'chapter',
      path: data.path
    }
    // TODO: 从主进程读取文件内容
    editorContent.value = '章节内容...'
  }
}

// 保存内容
async function saveContent() {
  if (!currentFile.value) return
  try {
    // TODO: 调用主进程保存文件
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 开始拖拽
function startResize(e) {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = leftPanelWidth.value

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
}

// 处理拖拽移动
function handleMouseMove(e) {
  if (!isResizing.value) return

  const deltaX = e.clientX - startX.value
  const newWidth = Math.min(Math.max(startWidth.value + deltaX, MIN_WIDTH), MAX_WIDTH)
  leftPanelWidth.value = newWidth
}

// 停止拖拽
function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
}

// 重置面板宽度
function resetPanelWidth() {
  leftPanelWidth.value = DEFAULT_WIDTH
}

// 组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})

// 组件挂载时加载书籍数据
onMounted(async () => {
  // TODO: 从主进程加载书籍的笔记和章节数据
})
</script>

<style lang="scss" scoped>
.editor-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.left-panel {
  background-color: #f0f0f0;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  //   transition: width 0.1s ease;
}

.resize-handle {
  width: 4px;
  background-color: transparent;
  cursor: col-resize;
  position: absolute;
  left: v-bind('leftPanelWidth + "px"');
  top: 0;
  bottom: 0;
  z-index: 10;
  transition: background-color 0.2s;

  &:hover,
  &:active {
    background-color: #409eff;
  }
}

.panel-section {
  border-bottom: 1px solid #ddd;
}

.section-header {
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;

  &:hover {
    background-color: #e8e8e8;
  }
}

.toggle-icon {
  transition: transform 0.2s;
  &.is-active {
    transform: rotate(90deg);
  }
}

.section-content {
  //   padding: 4px 0;
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  min-width: 0; // 防止内容溢出
}

.editor-header {
  height: 40px;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: #f8f8f8;
}

.file-name {
  font-size: 14px;
  color: #333;
}

.editor-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;

  :deep(.el-textarea__inner) {
    height: 100%;
    font-size: 14px;
    line-height: 1.6;
    font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }
}
</style>
