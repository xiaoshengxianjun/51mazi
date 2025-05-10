<template>
  <div class="editor-container">
    <!-- 左侧面板 -->
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <!-- 笔记部分 -->
      <div class="panel-section">
        <div class="section-header" @click="toggleNotes">
          <div class="section-header-left">
            <el-icon class="toggle-icon" :class="{ 'is-active': notesExpanded }">
              <ArrowRight />
            </el-icon>
            <span>笔记</span>
          </div>
          <div class="section-header-right">
            <el-tooltip content="创建笔记本" placement="bottom" :show-after="2000">
              <el-icon><FolderAdd /></el-icon>
            </el-tooltip>
            <!-- <el-tooltip content="创建笔记" placement="bottom" show-after="2000">
              <el-icon><DocumentAdd /></el-icon>
            </el-tooltip> -->
          </div>
        </div>
        <div v-show="notesExpanded" class="section-content">
          <el-tree
            :data="notesTree"
            :props="defaultProps"
            empty-text="暂无笔记"
            node-key="id"
            default-expand-all
            @node-click="handleNoteClick"
          >
            <template #default="{ node }">
              <div class="custom-tree-node">
                <!-- <el-icon><Document /></el-icon> -->
                <span>{{ node.label }}</span>
                <div class="chapter-actions">
                  <el-icon @click.stop="editNode(node)"><Edit /></el-icon>
                  <el-icon @click.stop="deleteNode(node)"><Delete /></el-icon>
                </div>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 正文部分 -->
      <div class="panel-section">
        <div class="section-header" @click="toggleChapters">
          <div class="section-header-left">
            <el-icon class="toggle-icon" :class="{ 'is-active': chaptersExpanded }">
              <ArrowRight />
            </el-icon>
            <span>正文</span>
          </div>
          <div class="section-header-right">
            <el-tooltip content="创建卷" placement="bottom" :show-after="2000">
              <el-icon @click.stop="createVolume"><FolderAdd /></el-icon>
            </el-tooltip>
            <el-tooltip content="卷排序" placement="bottom" :show-after="2000">
              <el-icon><Sort /></el-icon>
            </el-tooltip>
            <el-tooltip content="正文设置" placement="bottom" :show-after="2000">
              <el-icon><Setting /></el-icon>
            </el-tooltip>
          </div>
        </div>
        <div v-show="chaptersExpanded" class="section-content">
          <el-tree
            :data="chaptersTree"
            :props="defaultProps"
            empty-text="暂无章节"
            node-key="id"
            default-expand-all
            @node-click="handleChapterClick"
          >
            <template #default="{ node }">
              <div class="custom-tree-node">
                <span v-if="!editingNode || editingNode.id !== node.data.id">{{ node.label }}</span>
                <el-input
                  v-else
                  v-model="editingName"
                  size="small"
                  @keyup.enter="confirmEdit(node)"
                  @blur="confirmEdit(node)"
                />
                <div class="chapter-actions">
                  <el-icon
                    v-if="node.data.type === 'volume'"
                    @click.stop="createChapter(node.data.id)"
                  >
                    <DocumentAdd />
                  </el-icon>
                  <el-icon @click.stop="editNode(node)"><Edit /></el-icon>
                  <el-icon @click.stop="deleteNode(node)"><Delete /></el-icon>
                </div>
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
import {
  ArrowRight,
  DocumentAdd,
  FolderAdd,
  Sort,
  Setting,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()

// 解析新窗口参数
let bookName = null
if (window.process && window.process.argv) {
  // Electron 传递的 additionalArguments
  for (const arg of window.process.argv) {
    if (arg.startsWith('bookName=')) bookName = decodeURIComponent(arg.replace('bookName=', ''))
  }
}
if (!bookName) {
  // 回退到 hash/query
  bookName = route.query.name
}

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
const notesTree = ref([])
const chaptersTree = ref([])

// 当前编辑的文件
const currentFile = ref(null)
const editorContent = ref('')

// 编辑节点相关
const editingNode = ref(null)
const editingName = ref('')

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
  } catch {
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

// 创建卷
async function createVolume() {
  try {
    const result = await window.electron.createVolume(bookName)
    if (result.success) {
      ElMessage.success('创建卷成功')
      // 重新加载章节数据
      await loadChapters()
    } else {
      ElMessage.error(result.message || '创建卷失败')
    }
  } catch {
    ElMessage.error('创建卷失败')
  }
}

// 创建章节
async function createChapter(volumeId) {
  try {
    const result = await window.electron.createChapter(bookName, volumeId)
    if (result.success) {
      ElMessage.success('创建章节成功')
      // 重新加载章节数据
      await loadChapters()
    } else {
      ElMessage.error(result.message || '创建章节失败')
    }
  } catch {
    ElMessage.error('创建章节失败')
  }
}

// 加载章节数据
async function loadChapters() {
  try {
    const chapters = await window.electron.loadChapters(bookName)
    chaptersTree.value = chapters
  } catch {
    ElMessage.error('加载章节失败')
  }
}

// 编辑节点
function editNode(node) {
  editingNode.value = node.data
  editingName.value = node.data.name
}

// 确认编辑
async function confirmEdit(node) {
  if (!editingNode.value) return
  const newName = editingName.value.trim()
  if (newName) {
    try {
      const result = await window.electron.editNode(bookName, editingNode.value.id, newName)
      if (result.success) {
        ElMessage.success('编辑成功')
        await loadChapters()
      } else {
        ElMessage.error(result.message || '编辑失败')
      }
    } catch {
      ElMessage.error('编辑失败')
    }
  }
  editingNode.value = null
  editingName.value = ''
}

// 删除节点
async function deleteNode(node) {
  try {
    await ElMessageBox.confirm(
      `确定要删除${node.data.type === 'volume' ? '卷' : '章节'}吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    const result = await window.electron.deleteNode(bookName, node.data.id)
    if (result.success) {
      ElMessage.success('删除成功')
      await loadChapters()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (e) {
    // 用户取消
    console.log(e)
  }
}

// 在组件挂载时加载章节数据
onMounted(async () => {
  await loadChapters()
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
  padding: 10px 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  &-right {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-right: 10px;
    font-size: 16px;
  }

  &:hover {
    background-color: #e8e8e8;
  }
}

.toggle-icon {
  transition: transform 0.2s;
  font-size: 12px;
  padding: 6px;
  box-sizing: content-box;
  padding: 6px;
  &.is-active {
    transform: rotate(90deg);
  }
}

// .section-content {
//   padding: 0px 5px;
//   background-color: #fff;
// }

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  // gap: 4px;
  font-size: 13px;
  .chapter-actions {
    display: none;
    padding-right: 10px;
    align-items: center;
    gap: 12px;
  }
  &:hover {
    .chapter-actions {
      display: flex;
    }
  }
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
