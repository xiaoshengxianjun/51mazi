<template>
  <div class="note-chapter">
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
          ref="noteTreeRef"
          :data="notesTree"
          :props="defaultProps"
          empty-text="暂无笔记"
          node-key="path"
          highlight-current
          :default-expand-all="true"
          :current-node-key="currentNoteNodeKey"
          @node-click="handleNoteClick"
        >
          <template #default="{ node }">
            <div class="custom-tree-node">
              <span
                v-if="!editingNoteNode || editingNoteNode.path !== node.data.path"
                class="node-name"
              >
                {{ node.label }}
              </span>
              <el-input
                v-else
                v-model="editingNoteName"
                size="small"
                maxlength="20"
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
            <el-icon @click.stop="openChapterSettings"><Setting /></el-icon>
          </el-tooltip>
        </div>
      </div>
      <div v-show="chaptersExpanded" class="section-content">
        <el-tree
          ref="chapterTreeRef"
          :data="chaptersTree"
          :props="defaultProps"
          empty-text="暂无章节"
          node-key="path"
          highlight-current
          :current-node-key="currentChapterNodeKey"
          :default-expand-all="true"
          :expand-on-click-node="false"
          :check-strictly="true"
          @node-click="handleChapterClick"
          @node-expand="handleNodeExpand"
          @node-collapse="handleNodeCollapse"
        >
          <template #default="{ node }">
            <div class="custom-tree-node">
              <span v-if="!editingNode || editingNode.path !== node.data.path" class="node-name">
                {{ node.label }}
              </span>
              <el-input
                v-else
                v-model="editingName"
                size="small"
                maxlength="20"
                @click.stop
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

    <!-- 章节设置弹框 -->
    <ChapterSettingsDialog
      v-model:visible="chapterSettingsVisible"
      :book-name="bookName"
      :current-settings="chapterSettings"
      @settings-changed="handleSettingsChanged"
      @reformat-requested="handleReformatRequested"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, defineExpose, nextTick } from 'vue'
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
import ChapterSettingsDialog from './ChapterSettingsDialog.vue'

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

// 当前笔记节点 key
const currentNoteNodeKey = ref(null)

// 当前章节节点 key
const currentChapterNodeKey = ref(null)

// 新增的 ref 和 keys
const chapterTreeRef = ref(null)
const noteTreeRef = ref(null)

// 章节设置相关
const chapterSettingsVisible = ref(false)
const chapterSettings = ref({
  chapterFormat: 'number',
  suffixType: '章'
})

// 切换笔记面板
function toggleNotes() {
  notesExpanded.value = !notesExpanded.value
}

// 切换章节面板
function toggleChapters() {
  chaptersExpanded.value = !chaptersExpanded.value
}

// 处理节点展开事件（章节树使用 default-expand-all="true" 自动展开）
function handleNodeExpand() {
  // 章节树自动展开，无需手动管理
}

// 处理节点折叠事件（章节树使用 default-expand-all="true" 自动展开）
function handleNodeCollapse() {
  // 章节树自动展开，无需手动管理
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
      editorStore.setContent(res.content, { isInitialLoad: true })
      editorStore.setChapterTitle(data.name) // 笔记名作为标题
      currentNoteNodeKey.value = data.path // 保持选中态
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
      editorStore.setContent(res.content, { isInitialLoad: true })
      editorStore.setChapterTitle(data.name) // 章节名作为标题
      currentChapterNodeKey.value = data.path // 保持选中态
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

      // 等待一小段时间确保文件系统同步
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 重新加载章节数据
      await loadChapters()

      // 章节树会自动展开（使用 default-expand-all="true"）
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

      // 等待一小段时间确保文件系统同步
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 重新加载章节数据
      await loadChapters()

      // 章节树会自动展开（使用 default-expand-all="true"）
    } else {
      ElMessage.error(result.message || '创建章节失败')
    }
  } catch {
    ElMessage.error('创建章节失败')
  }
}

// 加载章节数据
async function loadChapters(autoSelectLatest = false) {
  try {
    const chapters = await window.electron.loadChapters(props.bookName)

    if (sortOrder.value === 'desc') {
      chapters.reverse()
    }

    // 验证数据结构
    if (Array.isArray(chapters) && chapters.length > 0) {
      if (chapters[0].children) {
        // 检查章节编号连续性
        await checkChapterNumberingAndWarn(chapters[0])
      }
    }

    chaptersTree.value = chapters

    // 使用 default-expand-all="true" 自动展开所有节点

    // 自动选中最新卷的最新章节
    if (autoSelectLatest && chapters.length > 0) {
      const latestVolume = chapters[chapters.length - 1]
      if (latestVolume.children && latestVolume.children.length > 0) {
        const latestChapter = latestVolume.children[latestVolume.children.length - 1]
        const fakeNode = {
          data: latestChapter,
          parent: { data: latestVolume }
        }
        await handleChapterClick(latestChapter, fakeNode)
        currentChapterNodeKey.value = latestChapter.path
      }
    }
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
      // 保存当前选中状态
      const currentSelectedKey = currentChapterNodeKey.value

      // 重新加载章节数据
      await loadChapters()

      // 恢复选中状态
      nextTick(() => {
        if (currentSelectedKey) {
          currentChapterNodeKey.value = currentSelectedKey
        }
      })
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
      // 保存当前选中状态
      const currentSelectedKey = currentChapterNodeKey.value

      // 重新加载章节数据
      await loadChapters()

      // 恢复选中状态
      nextTick(() => {
        if (currentSelectedKey) {
          currentChapterNodeKey.value = currentSelectedKey
        }
      })
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

    // 重新加载笔记数据
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

    // 重新加载笔记数据
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

    // 重新加载笔记数据
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

      // 重新加载笔记数据
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
  try {
    sortOrder.value = await window.electron.getSortOrder(props.bookName)
    await loadChapters(true) // 首次加载时自动选中最新章节
    notesTree.value = await window.electron.loadNotes(props.bookName)
    await loadChapterSettings()
  } catch {
    ElMessage.error('加载书籍数据失败')
  }
})

defineExpose({
  reloadNotes,
  reloadChapters: (autoSelectLatest = false) => loadChapters(autoSelectLatest)
})

async function reloadNotes() {
  notesTree.value = await window.electron.loadNotes(props.bookName)
}

// 打开章节设置弹框
function openChapterSettings() {
  chapterSettingsVisible.value = true
}

// 加载章节设置
async function loadChapterSettings() {
  try {
    const settings = await window.electron.getChapterSettings(props.bookName)
    if (settings) {
      chapterSettings.value = settings
    }
  } catch {
    // 使用默认设置
  }
}

// 检查章节编号连续性并提示用户
async function checkChapterNumberingAndWarn(volume) {
  if (!volume.children || volume.children.length === 0) return

  // 简单的章节编号检查
  const chapterNumbers = volume.children
    .map((chapter) => {
      const name = chapter.name
      // 先尝试数字格式：第1章、第1集等
      let match = name.match(/^第(\d+)(.+)$/)
      if (match) {
        return parseInt(match[1])
      }
      // 再尝试汉字格式：第一章、第一集等
      match = name.match(/^第(.+?)(.+)$/)
      if (match) {
        // 简单的汉字转数字（只处理1-10）
        const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
        const index = chineseNumbers.indexOf(match[1])
        return index > 0 ? index : 0
      }
      return 0
    })
    .filter((num) => num > 0)
    .sort((a, b) => a - b)

  if (chapterNumbers.length === 0) return

  const maxNumber = Math.max(...chapterNumbers)
  const totalChapters = volume.children.length
  const missingNumbers = []

  // 检查缺失的编号
  for (let i = 1; i <= maxNumber; i++) {
    if (!chapterNumbers.includes(i)) {
      missingNumbers.push(i)
    }
  }

  const isSequential = missingNumbers.length === 0 && maxNumber === totalChapters

  if (!isSequential) {
    // 检查是否有 undefined 后缀问题
    const hasUndefinedSuffix = volume.children.some((chapter) => chapter.name.includes('undefined'))

    if (hasUndefinedSuffix) {
      console.warn(
        '🚨 检测到章节名包含 "undefined"，这是格式化错误！建议立即通过"正文设置" -> "重新格式化章节编号"来修复'
      )
    } else {
      console.warn('⚠️ 章节编号不连续，建议通过"正文设置" -> "重新格式化章节编号"来修复')
    }
  }
}

// 重新格式化章节编号
async function reformatChapterNumbers(volumeName) {
  try {
    // 转换为普通对象，避免 IPC 克隆问题
    const cleanSettings = {
      chapterFormat: chapterSettings.value.chapterFormat,
      suffixType: chapterSettings.value.suffixType
    }

    const result = await window.electron.reformatChapterNumbers(
      props.bookName,
      volumeName,
      cleanSettings
    )

    if (result.success) {
      ElMessage.success(result.message)
      // 重新加载章节数据
      await loadChapters()
    } else {
      ElMessage.error(result.message || '重新格式化失败')
    }
  } catch {
    ElMessage.error('重新格式化失败')
  }
}

// 处理重新格式化请求（来自设置对话框）
async function handleReformatRequested() {
  try {
    // 找到第一个卷
    if (chaptersTree.value && chaptersTree.value.length > 0) {
      const firstVolume = chaptersTree.value[0]
      // 调用重新格式化函数
      await reformatChapterNumbers(firstVolume.name)
    } else {
      ElMessage.warning('没有找到可格式化的卷')
    }
  } catch {
    ElMessage.error('重新格式化失败')
  }
}

// 处理设置变更
async function handleSettingsChanged(newSettings) {
  chapterSettings.value = newSettings
  // 重新加载章节数据以显示新的命名格式
  await loadChapters()
}
</script>
<style lang="scss" scoped>
.note-chapter {
  height: 100%;
  background-color: var(--bg-soft);
}

.panel-section {
  border-bottom: 1px solid var(--border-color);
}

.section-header {
  padding: 10px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-base);
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
    background-color: var(--bg-mute);
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

.section-content {
  ::v-deep(.el-tree) {
    background-color: var(--bg-soft);
  }
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  // gap: 4px;
  font-size: 13px;
  width: 100%;
  overflow: hidden;
  .node-name {
    flex: 1;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chapter-actions {
    opacity: 0;
    display: flex;
    padding-right: 10px;
    align-items: center;
    gap: 12px;
  }
  &:hover {
    .chapter-actions {
      opacity: 1;
    }
  }
}
</style>
