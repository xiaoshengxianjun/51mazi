<template>
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
          <el-icon @click.stop="createNotebook"><FolderAdd /></el-icon>
        </el-tooltip>
      </div>
    </div>
    <div v-show="notesExpanded" class="section-content">
      <el-tree
        :data="notesTree"
        :props="defaultProps"
        empty-text="暂无笔记"
        node-key="path"
        default-expand-all
        @node-click="handleNoteClick"
      >
        <template #default="{ node }">
          <div class="custom-tree-node">
            <span v-if="!editingNoteNode || editingNoteNode.path !== node.data.path">
              {{ node.label }}
            </span>
            <el-input
              v-else
              v-model="editingNoteName"
              size="small"
              @click.stop
              @keyup.enter="confirmEditNote(node)"
              @blur="confirmEditNote(node)"
            />
            <div class="chapter-actions">
              <el-icon v-if="node.data.type === 'folder'" @click.stop="createNote(node)">
                <DocumentAdd />
              </el-icon>
              <el-icon @click.stop="editNoteNode(node)"><Edit /></el-icon>
              <el-icon @click.stop="deleteNoteNode(node)"><Delete /></el-icon>
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
          <el-icon @click.stop="sortVolumes"><Sort /></el-icon>
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
        node-key="path"
        default-expand-all
        @node-click="handleChapterClick"
      >
        <template #default="{ node }">
          <div class="custom-tree-node">
            <span v-if="!editingNode || editingNode.path !== node.data.path">{{ node.label }}</span>
            <el-input
              v-else
              v-model="editingName"
              size="small"
              @click.stop
              @keyup.enter="confirmEdit(node)"
              @blur="confirmEdit(node)"
            />
            <div class="chapter-actions">
              <el-icon v-if="node.data.type === 'volume'" @click.stop="createChapter(node.data.id)">
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
</template>

<script setup>
import { ref, onMounted, defineExpose } from 'vue'
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
import { useEditorStore } from '@renderer/stores/editor'

const props = defineProps({
  bookName: {
    type: String,
    required: true
  }
})

// 树形控件配置
const defaultProps = {
  children: 'children',
  label: 'name'
}

// 面板展开状态
const notesExpanded = ref(false)
const chaptersExpanded = ref(true)

// 模拟数据 - 实际应该从主进程获取
const notesTree = ref([])
const chaptersTree = ref([])

// 编辑节点相关
const editingNode = ref(null)
const editingName = ref('')

// 笔记编辑相关
const editingNoteNode = ref(null)
const editingNoteName = ref('')

// 排序状态
const sortOrder = ref('asc')

const editorStore = useEditorStore()

// 切换笔记面板
function toggleNotes() {
  notesExpanded.value = !notesExpanded.value
}

// 切换章节面板
function toggleChapters() {
  chaptersExpanded.value = !chaptersExpanded.value
}

// 处理笔记点击
async function handleNoteClick(data, node) {
  if (data.type === 'note') {
    const parent = node.parent.data
    const res = await window.electron.readNote(props.bookName, parent.name, data.name)
    if (res.success) {
      editorStore.setFile({
        name: data.name,
        type: 'note',
        path: data.path,
        notebook: parent.name
      })
      editorStore.setContent(res.content)
      editorStore.setChapterTitle(data.name) // 笔记名作为标题
    } else {
      ElMessage.error(res.message || '读取笔记失败')
    }
  }
}

// 处理章节点击
async function handleChapterClick(data, node) {
  if (data.type === 'chapter') {
    // 读取章节内容
    const res = await window.electron.readChapter(props.bookName, node.parent.data.name, data.name)
    if (res.success) {
      editorStore.setFile({
        name: data.name,
        type: 'chapter',
        path: data.path,
        volume: node.parent.data.name
      })
      editorStore.setContent(res.content)
      editorStore.setChapterTitle(data.name) // 章节名作为标题
    } else {
      ElMessage.error(res.message || '读取章节失败')
    }
  }
}

// 创建卷
async function createVolume() {
  try {
    const result = await window.electron.createVolume(props.bookName)
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
    const result = await window.electron.createChapter(props.bookName, volumeId)
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
    const chapters = await window.electron.loadChapters(props.bookName)
    // 应用排序
    if (sortOrder.value === 'desc') {
      chapters.reverse()
    }
    chaptersTree.value = chapters
  } catch {
    ElMessage.error('加载章节失败')
  }
}

// 编辑节点
function editNode(node) {
  editingNode.value = { ...node.data }
  editingName.value = node.data.name
}

// 确认编辑
async function confirmEdit(node) {
  if (!editingNode.value) return
  const newName = editingName.value.trim()
  if (!newName) {
    // 为空则还原
    editingNode.value = null
    editingName.value = ''
    return
  }
  let payload = { type: editingNode.value.type, newName }
  if (editingNode.value.type === 'volume') {
    payload.volume = editingNode.value.name
  } else if (editingNode.value.type === 'chapter') {
    // 需要找到父卷名
    payload.volume = node.parent.data.name
    payload.chapter = editingNode.value.name
  }
  try {
    const result = await window.electron.editNode(props.bookName, payload)
    if (result.success) {
      ElMessage.success('编辑成功')
      await loadChapters()
    } else {
      ElMessage.error(result.message || '编辑失败')
    }
  } catch {
    ElMessage.error('编辑失败')
  }
  editingNode.value = null
  editingName.value = ''
}

// 删除节点
async function deleteNode(node) {
  let payload = { type: node.data.type }
  if (node.data.type === 'volume') {
    payload.volume = node.data.name
  } else if (node.data.type === 'chapter') {
    payload.volume = node.parent.data.name
    payload.chapter = node.data.name
  }
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
    const result = await window.electron.deleteNode(props.bookName, payload)
    if (result.success) {
      ElMessage.success('删除成功')
      await loadChapters()
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

// 排序按钮
async function sortVolumes() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  await window.electron.setSortOrder(props.bookName, sortOrder.value)
  chaptersTree.value = [...chaptersTree.value].reverse()
}

// 创建笔记本
async function createNotebook() {
  const result = await window.electron.createNotebook(props.bookName)
  if (result.success) {
    ElMessage.success(`创建笔记本"${result.notebookName}"成功`)
    notesTree.value = await window.electron.loadNotes(props.bookName)
  } else {
    ElMessage.error(result.message || '创建笔记本失败')
  }
}

// 创建笔记（可传父节点）
async function createNote(node) {
  let notebookName = '大纲'
  if (node && node.data && node.data.type === 'folder') {
    notebookName = node.data.name
  }
  const result = await window.electron.createNote(props.bookName, notebookName)
  if (result.success) {
    ElMessage.success('创建笔记成功')
    notesTree.value = await window.electron.loadNotes(props.bookName)
  } else {
    ElMessage.error(result.message || '创建笔记失败')
  }
}

// 编辑笔记本/笔记名
function editNoteNode(node) {
  editingNoteNode.value = { ...node.data }
  editingNoteName.value = node.data.name
}

// 确认编辑笔记本/笔记名
async function confirmEditNote(node) {
  if (!editingNoteNode.value) return
  const newName = editingNoteName.value.trim()
  if (!newName) {
    editingNoteNode.value = null
    editingNoteName.value = ''
    return
  }
  let result
  if (editingNoteNode.value.type === 'folder') {
    // 校验重名
    const siblings = node.parent.data.children || notesTree.value
    if (siblings.some((n) => n.name === newName && n.path !== editingNoteNode.value.path)) {
      ElMessage.error('笔记本名已存在')
      return
    }
    result = await window.electron.renameNotebook(
      props.bookName,
      editingNoteNode.value.name,
      newName
    )
  } else if (editingNoteNode.value.type === 'note') {
    // 需要父节点名
    result = await window.electron.renameNote(
      props.bookName,
      node.parent.data.name,
      editingNoteNode.value.name,
      newName
    )
  }
  if (result && result.success) {
    ElMessage.success('重命名成功')
    notesTree.value = await window.electron.loadNotes(props.bookName)
  } else {
    ElMessage.error(result?.message || '重命名失败')
  }
  editingNoteNode.value = null
  editingNoteName.value = ''
}

// 删除笔记本/笔记
async function deleteNoteNode(node) {
  let typeText = node.data.type === 'folder' ? '笔记本' : '笔记'
  try {
    await ElMessageBox.confirm(
      `确定要删除${typeText}"${node.data.name}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    let result
    if (node.data.type === 'folder') {
      result = await window.electron.deleteNotebook(props.bookName, node.data.name)
    } else if (node.data.type === 'note') {
      result = await window.electron.deleteNote(
        props.bookName,
        node.parent.data.name,
        node.data.name
      )
    }
    if (result && result.success) {
      ElMessage.success('删除成功')
      notesTree.value = await window.electron.loadNotes(props.bookName)
    } else {
      ElMessage.error(result?.message || '删除失败')
    }
  } catch {
    // 用户取消
  }
}

// 组件挂载时加载书籍数据
onMounted(async () => {
  sortOrder.value = await window.electron.getSortOrder(props.bookName)
  await loadChapters()
  // 加载笔记目录
  notesTree.value = await window.electron.loadNotes(props.bookName)
  console.log(notesTree.value)
})

defineExpose({
  reloadNotes,
  reloadChapters: loadChapters
})

async function reloadNotes() {
  notesTree.value = await window.electron.loadNotes(props.bookName)
}
</script>
<style lang="scss" scoped>
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
</style>
