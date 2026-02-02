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
          :default-expanded-keys="chapterDefaultExpandedKeys"
          :expand-on-click-node="false"
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
import { ref, onMounted, nextTick, watch } from 'vue'
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
import ChapterSettingsDialog from '@renderer/components/Editor/ChapterSettingsDialog.vue'

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
const chapterDefaultExpandedKeys = ref([])

/**
 * 章节树（卷）展开状态管理
 *
 * 需求：
 * - 我在哪个卷创建章节，哪个卷必须展开
 * - 其他卷（已展开/已折叠）的状态不要被改变
 *
 * 根因：
 * - 之前使用 `default-expand-all="true"`，一旦 `chaptersTree` 重新赋值（loadChapters 刷新），
 *   树会按“默认全部展开”重建，导致用户折叠状态丢失。
 *
 * 方案：
 * - 移除 `default-expand-all`
 * - 通过 `node-expand/node-collapse` + “刷新前快照”记录真实展开状态
 * - 每次刷新树数据后，通过 `defaultExpandedKeys` 只做 expand（不做 collapse），避免误关其它卷
 *   - Element Plus 2.11.8 的 Tree（非 tree-v2）没有对外暴露 `setExpandedKeys/getExpandedKeys`
 *   - `defaultExpandedKeys` 内部实现是遍历 key -> `node.expand()`，只会展开，不会折叠
 * - 创建章节时，仅把目标卷加入“需要展开的集合”（不会影响其他卷）
 */
const expandedVolumeIdSet = new Set()

function getVolumeId(volumeNode) {
  // 主进程 load-chapters 返回的卷 id 是卷目录名（volumeName）
  return volumeNode?.id ?? volumeNode?.name
}

function getVolumeNodes(tree) {
  if (!Array.isArray(tree)) return []
  return tree.filter((n) => n && n.type === 'volume')
}

function normalizeAndCleanupExpandedSet(volumes) {
  const validIds = new Set(volumes.map((v) => getVolumeId(v)).filter(Boolean))
  for (const id of expandedVolumeIdSet) {
    if (!validIds.has(id)) expandedVolumeIdSet.delete(id)
  }
}

function syncExpandedVolumesFromTree() {
  // Element Plus Tree（2.11.8）官方实现中没有暴露 `setExpandedKeys/getExpandedKeys`，
  // 展开状态保存在 Node.expanded 上；因此这里从旧树的节点状态做“快照”，
  // 用于刷新数据后精确恢复，避免误关/误开其它卷。
  const tree = chapterTreeRef.value
  const store = tree?.store?.value ?? tree?.store
  const root = tree?.root?.value ?? tree?.root ?? store?.root
  const nodes = root?.childNodes
  if (!Array.isArray(nodes)) return

  // 注意：如果这里取不到节点（比如树尚未渲染完成），不要清空旧状态。
  // 否则后续恢复逻辑可能误判为“无展开状态”，进而触发默认全展开等错误行为。
  const nextExpanded = new Set()
  for (const node of nodes) {
    if (node?.data?.type === 'volume' && node.expanded) {
      const id = getVolumeId(node.data)
      if (id) nextExpanded.add(id)
    }
  }

  expandedVolumeIdSet.clear()
  for (const id of nextExpanded) expandedVolumeIdSet.add(id)
}

function restoreExpandedVolumes({ forceExpandVolumeId } = {}) {
  const volumes = getVolumeNodes(chaptersTree.value)
  if (volumes.length === 0) return

  // 仅强制展开“目标卷”（不会改变其他卷的状态）
  if (forceExpandVolumeId) {
    expandedVolumeIdSet.add(forceExpandVolumeId)
  }

  normalizeAndCleanupExpandedSet(volumes)

  // el-tree 的 node-key 是 path；默认展开 keys 只“展开”，不会折叠其它卷（符合需求）
  const expandedPaths = volumes
    .filter((v) => expandedVolumeIdSet.has(getVolumeId(v)))
    .map((v) => v.path)
    .filter(Boolean)

  // 触发 element-plus 内部 watch(defaultExpandedKeys) -> store.setDefaultExpandedKeys()，
  // 注意该实现只 expand，不会 collapse，因此不会“自动关闭其他卷”
  chapterDefaultExpandedKeys.value = Array.from(new Set(expandedPaths))
}

// 章节设置相关
const chapterSettingsVisible = ref(false)
const chapterSettings = ref({
  chapterFormat: 'number',
  suffixType: '章',
  targetWords: 2000
})

watch(
  () => editorStore.chapterTargetWords,
  (value) => {
    const numeric = Number(value)
    chapterSettings.value.targetWords =
      Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 2000
  }
)

// 切换笔记面板
function toggleNotes() {
  notesExpanded.value = !notesExpanded.value
}

// 切换章节面板
function toggleChapters() {
  chaptersExpanded.value = !chaptersExpanded.value
}

// 处理节点展开/折叠（仅记录卷）
function handleNodeExpand(data) {
  if (data?.type !== 'volume') return
  const id = getVolumeId(data)
  if (id) expandedVolumeIdSet.add(id)
}

function handleNodeCollapse(data) {
  if (data?.type !== 'volume') return
  const id = getVolumeId(data)
  if (id) expandedVolumeIdSet.delete(id)

  // 关键修复：
  // el-tree 在数据刷新/重新渲染时，如果 `current-node-key` 仍指向某个“卷内章节”，
  // 可能会为了保证当前节点可见而自动展开其祖先卷，从而出现：
  // “我手动收起第三卷，在第二卷新建/删除章节后第三卷又被展开”的现象。
  //
  // 因此：当用户收起某个卷时，如果当前选中节点属于该卷，立即把树的选中节点
  // 切换到卷本身（不会影响编辑器当前打开的章节内容，只是树选中态变化）。
  const currentKey = currentChapterNodeKey.value
  const volumePath = data.path
  if (currentKey && volumePath && currentKey.startsWith(volumePath)) {
    const nextChar = currentKey.charAt(volumePath.length)
    if (!nextChar || nextChar === '/' || nextChar === '\\') {
      currentChapterNodeKey.value = volumePath
    }
  }
}

// 处理笔记点击
async function handleNoteClick(data, node) {
  if (data.type === 'note') {
    const currentFile = editorStore.file
    if (currentFile && currentFile.path === data.path) return
    await editorStore.saveCurrentFileThroughHandler(false)
    const parent = node.parent.data
    const res = await window.electron.readNote(props.bookName, parent.name, data.name)
    if (res.success) {
      editorStore.setFile({
        name: data.name,
        type: 'note',
        path: data.path,
        notebook: parent.name
      })
      // 确保内容至少是空字符串，即使文件为空或返回 undefined
      const content = res.content || ''
      editorStore.setContent(content, { isInitialLoad: true })
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
    const currentFile = editorStore.file
    if (currentFile && currentFile.path === data.path) return

    // 如果当前打开的文件是章节，且卷名与树节点中的卷名不一致，说明卷名已经改了
    // 需要先更新 editorStore.file.volume，确保保存时使用正确的卷名
    if (
      currentFile &&
      currentFile.type === 'chapter' &&
      currentFile.name === data.name &&
      currentFile.volume !== node.parent.data.name
    ) {
      // 卷名已经改了，更新 editorStore.file 中的卷名和路径
      editorStore.setFile({
        ...currentFile,
        volume: node.parent.data.name,
        path: data.path
      })
    }

    await editorStore.saveCurrentFileThroughHandler(false)
    // 读取章节内容
    const res = await window.electron.readChapter(props.bookName, node.parent.data.name, data.name)
    if (res.success) {
      editorStore.setFile({
        name: data.name,
        type: 'chapter',
        path: data.path,
        volume: node.parent.data.name
      })
      // 确保内容至少是空字符串，即使文件为空或返回 undefined
      const content = res.content || ''
      editorStore.setContent(content, { isInitialLoad: true })
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
    const prevVolumeIds = new Set(getVolumeNodes(chaptersTree.value).map((v) => getVolumeId(v)))
    const result = await window.electron.createVolume(props.bookName)
    if (result.success) {
      ElMessage.success('创建卷成功')

      // 等待一小段时间确保文件系统同步
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 重新加载章节数据
      await loadChapters({ detectNewVolumeFrom: prevVolumeIds })
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

      // 仅展开“创建所在卷”，其他卷状态保持不变；并选中新建章节（使用主进程返回的 filePath 精确定位）
      await loadChapters({
        forceExpandVolumeId: volumeId,
        selectChapter: { volumeId, chapterPath: result.filePath }
      })
    } else {
      ElMessage.error(result.message || '创建章节失败')
    }
  } catch {
    ElMessage.error('创建章节失败')
  }
}

// 加载章节数据
async function loadChapters(arg = false) {
  try {
    const options =
      typeof arg === 'boolean'
        ? { autoSelectLatest: arg }
        : arg && typeof arg === 'object'
          ? arg
          : { autoSelectLatest: false }

    const {
      autoSelectLatest = false,
      forceExpandVolumeId = null,
      selectChapter = null,
      // createVolume 时用：从旧的卷 id 集合推断新卷并展开它
      detectNewVolumeFrom = null
    } = options

    // 刷新前先从现有树做“展开状态快照”（真实 UI 状态），用于刷新后恢复
    syncExpandedVolumesFromTree()

    // 如果本次刷新会“切换选中节点”（创建章节/自动定位最新章节），先清空旧选中 key，
    // 避免旧的 current-node-key 触发树把其它卷自动展开。
    if (selectChapter || autoSelectLatest) {
      currentChapterNodeKey.value = null
    }

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

    // 计算本次刷新是否需要额外展开某个卷（只影响目标卷，不改变其他卷）
    let finalForceExpandVolumeId = forceExpandVolumeId
    const volumes = getVolumeNodes(chapters)

    // 1) 自动选中最新卷的最新章节时，确保“最新卷”展开（否则选中项不可见）
    if (autoSelectLatest && volumes.length > 0) {
      finalForceExpandVolumeId =
        finalForceExpandVolumeId || getVolumeId(volumes[volumes.length - 1])
    }

    // 2) 创建卷时：推断新卷并默认展开它（其他卷状态不变）
    if (
      detectNewVolumeFrom &&
      typeof detectNewVolumeFrom.has === 'function' &&
      volumes.length > 0
    ) {
      const newVolume = volumes.find((v) => {
        const id = getVolumeId(v)
        return id && !detectNewVolumeFrom.has(id)
      })
      if (newVolume) {
        finalForceExpandVolumeId = finalForceExpandVolumeId || getVolumeId(newVolume)
      }
    }

    await nextTick()
    restoreExpandedVolumes({ forceExpandVolumeId: finalForceExpandVolumeId })

    // 优先：按指定卷/章节精确选中（创建章节场景）
    if (selectChapter?.volumeId) {
      const targetVolume = volumes.find((v) => getVolumeId(v) === selectChapter.volumeId)
      const targetChapter =
        targetVolume?.children?.find((c) => c.path === selectChapter.chapterPath) ||
        targetVolume?.children?.find((c) => c.name === selectChapter.chapterName)

      if (targetVolume && targetChapter) {
        const fakeNode = { data: targetChapter, parent: { data: targetVolume } }
        await handleChapterClick(targetChapter, fakeNode)
        currentChapterNodeKey.value = targetChapter.path
        return
      }
    }

    // 兼容旧逻辑：自动选中最新卷的最新章节
    if (autoSelectLatest && volumes.length > 0) {
      const latestVolume = volumes[volumes.length - 1]
      if (latestVolume.children && latestVolume.children.length > 0) {
        const latestChapter = latestVolume.children[latestVolume.children.length - 1]
        const fakeNode = { data: latestChapter, parent: { data: latestVolume } }
        await handleChapterClick(latestChapter, fakeNode)
        currentChapterNodeKey.value = latestChapter.path
      }
    }
  } catch {
    ElMessage.error('加载章节失败')
  }
}

function ensureTrailingSpace(name) {
  const match = name.match(/^(第[^\s]+[章回集节部卷]?)(\s*)(.*)$/)
  if (!match) return name
  const [, prefix, spaces, rest] = match
  if (!rest) {
    return spaces === ' ' ? name : `${prefix} `
  }
  return spaces === '' ? name : `${prefix}${rest}`
}

function editNode(node) {
  editingNode.value = { ...node.data }
  editingName.value = ensureTrailingSpace(node.data.name)
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

  // 如果名称没有变化，直接返回
  if (editingNode.value.name === newName) {
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

      // 如果编辑的是“卷名”，卷 id 会变化（load-chapters 的卷 id = 卷目录名）
      // 为了保持“其他卷状态不变”，这里把旧 id 的展开状态迁移到新 id
      if (editingNode.value.type === 'volume') {
        const oldVolumeId = editingNode.value.name
        const wasExpanded = expandedVolumeIdSet.has(oldVolumeId)
        expandedVolumeIdSet.delete(oldVolumeId)
        if (wasExpanded) expandedVolumeIdSet.add(newName)
      }

      // 保存当前选中状态信息（使用更可靠的方式）
      const wasSelected = currentChapterNodeKey.value === editingNode.value.path
      const oldPath = editingNode.value.path

      // 重新加载章节数据
      await loadChapters()

      // 如果修改的是卷名，且当前打开的文件是该卷下的章节，需要更新 editorStore.file
      if (editingNode.value.type === 'volume') {
        const currentFile = editorStore.file
        if (
          currentFile &&
          currentFile.type === 'chapter' &&
          currentFile.volume === editingNode.value.name
        ) {
          // 当前打开的文件是被重命名卷下的章节，需要更新卷名和路径
          const newVolume = chaptersTree.value.find((v) => v.name === newName)
          if (newVolume && newVolume.children) {
            // 找到对应的章节（根据章节名匹配）
            const updatedChapter = newVolume.children.find((c) => c.name === currentFile.name)
            if (updatedChapter) {
              // 更新 editorStore.file 中的卷名和路径
              editorStore.setFile({
                ...currentFile,
                volume: newName,
                path: updatedChapter.path
              })
            }
          }
        }
      }

      // 恢复选中状态：如果之前选中的是被编辑的节点，则选中新名称对应的节点
      await nextTick()
      if (wasSelected && editingNode.value.type === 'volume') {
        // 对于卷，需要根据新名称找到对应的节点
        const newVolume = chaptersTree.value.find((v) => v.name === newName)
        if (newVolume) {
          currentChapterNodeKey.value = newVolume.path
        }
      } else if (wasSelected && editingNode.value.type === 'chapter') {
        // 对于章节，需要根据父卷名和新章节名找到对应的节点
        const parentVolume = chaptersTree.value.find((v) => v.name === node.parent.data.name)
        if (parentVolume && parentVolume.children) {
          const newChapter = parentVolume.children.find((c) => c.name === newName)
          if (newChapter) {
            currentChapterNodeKey.value = newChapter.path
          }
        }
      } else if (currentChapterNodeKey.value === oldPath) {
        // 如果当前选中的仍然是旧路径，尝试更新为新路径
        if (editingNode.value.type === 'volume') {
          const newVolume = chaptersTree.value.find((v) => v.name === newName)
          if (newVolume) {
            currentChapterNodeKey.value = newVolume.path
          }
        } else if (editingNode.value.type === 'chapter') {
          const parentVolume = chaptersTree.value.find((v) => v.name === node.parent.data.name)
          if (parentVolume && parentVolume.children) {
            const newChapter = parentVolume.children.find((c) => c.name === newName)
            if (newChapter) {
              currentChapterNodeKey.value = newChapter.path
            }
          }
        }
      }
    } else {
      ElMessage.error(result.message || '编辑失败')
    }
  } catch (error) {
    console.error('编辑失败:', error)
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
      // 删除卷时同步清理展开集合（避免残留）
      if (node.data.type === 'volume') {
        const id = getVolumeId(node.data)
        if (id) expandedVolumeIdSet.delete(id)
      }
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
  // 反转会触发树刷新，这里恢复展开集合，确保“其他卷状态不变”
  await nextTick()
  restoreExpandedVolumes()
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
      const targetValue = Number(settings.targetWords)
      chapterSettings.value = {
        chapterFormat: settings.chapterFormat || 'number',
        suffixType: settings.suffixType || '章',
        targetWords: Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 2000
      }
      editorStore.setChapterTargetWords(chapterSettings.value.targetWords)
    } else {
      editorStore.setChapterTargetWords(2000)
    }
  } catch {
    // 使用默认设置
    editorStore.setChapterTargetWords(2000)
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
async function reformatChapterNumbers(volumeName, overrideSettings) {
  try {
    // 转换为普通对象，避免 IPC 克隆问题
    const cleanSettings = {
      chapterFormat:
        overrideSettings?.chapterFormat || chapterSettings.value.chapterFormat || 'number',
      suffixType: overrideSettings?.suffixType || chapterSettings.value.suffixType || '章'
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
async function handleReformatRequested(payload) {
  try {
    // 找到第一个卷
    if (chaptersTree.value && chaptersTree.value.length > 0) {
      const firstVolume = chaptersTree.value[0]
      // 调用重新格式化函数
      await reformatChapterNumbers(firstVolume.name, payload)
    } else {
      ElMessage.warning('没有找到可格式化的卷')
    }
  } catch {
    ElMessage.error('重新格式化失败')
  }
}

// 处理设置变更
async function handleSettingsChanged(newSettings) {
  const targetValue = Number(newSettings.targetWords)
  chapterSettings.value = {
    chapterFormat: newSettings.chapterFormat || 'number',
    suffixType: newSettings.suffixType || '章',
    targetWords: Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 2000
  }
  editorStore.setChapterTargetWords(chapterSettings.value.targetWords)
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
