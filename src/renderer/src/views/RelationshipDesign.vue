<template>
  <LayoutTool :title="relationshipName || '关系图编辑'">
    <template #headrAction>
      <el-button type="primary" :loading="saving" @click="handleSave">
        <el-icon><Check /></el-icon>
        <span>保存</span>
      </el-button>
    </template>
    <template #default>
      <div class="relationship-design">
        <!-- 移除顶部工具栏 -->
        <div ref="canvasRef" class="design-canvas">
          <RelationGraph
            ref="graphRef"
            :options="graphOptions"
            :on-line-click="onLineClick"
            :on-node-click="onNodeClick"
            @canvas-click="onCanvasClick"
          >
            <template #graph-plug>
              <RadialMenu
                v-if="showRadialMenu"
                :style="{
                  width: nodeMenuPanel.width + 'px',
                  height: nodeMenuPanel.height + 'px',
                  left: nodeMenuPanel.x + 'px',
                  top: nodeMenuPanel.y + 'px'
                }"
                @info="handleNodeInfo"
                @add="handleNodeAdd"
                @link="handleNodeLink"
                @delete="handleNodeDelete"
              />

              <!-- 连线预览线条 -->
              <div
                v-if="isLinkMode && linkPreviewLine"
                class="link-preview"
                :style="{
                  left: linkPreviewLine.x + 'px',
                  top: linkPreviewLine.y + 'px',
                  width: linkPreviewLine.width + 'px',
                  transform: `rotate(${linkPreviewLine.angle}deg)`
                }"
              ></div>

              <!-- 调试信息 -->
              <div
                v-if="isLinkMode"
                style="
                  position: absolute;
                  top: 10px;
                  left: 10px;
                  background: red;
                  color: white;
                  padding: 5px;
                  z-index: 9999;
                "
              >
                Debug: isLinkMode={{ isLinkMode }}, linkPreviewLine={{ linkPreviewLine }}
              </div>
            </template>
          </RelationGraph>
        </div>
      </div>
    </template>
  </LayoutTool>
  <el-dialog
    v-model="infoDialogVisible"
    :title="isAddMode ? '新增节点' : '编辑节点信息'"
    width="400px"
  >
    <el-form label-width="80px">
      <el-form-item label="节点文本">
        <el-select
          v-model="infoForm.characterId"
          placeholder="选择人物或输入新名称"
          style="width: 100%"
          filterable
          allow-create
          default-first-option
          :filter-method="filterCharacters"
          @change="onCharacterChange"
          @visible-change="onSelectVisibleChange"
        >
          <el-option
            v-for="character in filteredCharacters"
            :key="character.id"
            :label="character.name"
            :value="character.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="infoForm.gender">
          <el-radio value="male">男</el-radio>
          <el-radio value="female">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="背景色">
        <div style="display: flex; gap: 8px; align-items: center">
          <div class="color-squares">
            <div
              v-for="c in presetColors"
              :key="c.value"
              class="color-square"
              :class="{ 'color-square-selected': infoForm.color === c.value }"
              :style="{ background: c.value }"
              @click="selectPresetColor(c.value)"
            ></div>
          </div>
          <el-color-picker v-model="customColor" style="margin-left: 8px" @change="onCustomColor" />
        </div>
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="infoForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入描述"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="saveNodeInfo">保存</el-button>
    </template>
  </el-dialog>

  <!-- 连线编辑弹框 -->
  <el-dialog v-model="edgeDialogVisible" title="编辑关系" width="400px">
    <el-form label-width="80px">
      <el-form-item label="关系描述">
        <el-input v-model="edgeForm.text" placeholder="请输入关系描述" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeEdgeDialog">取消</el-button>
      <el-button type="primary" @click="saveEdgeInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import RelationGraph from 'relation-graph-vue3'
import RadialMenu from '@renderer/components/RadialMenu.vue'
import { genId } from '@renderer/utils/utils'

const route = useRoute()
const bookName = route.query.name
const relationshipName = route.query.id

const saving = ref(false)
const graphRef = ref(null)
const selectedNode = ref(null)

// 人物数据
const characters = ref([])
// 过滤后的人物数据
const filteredCharacters = ref([])

// 关系图数据
const relationshipData = reactive({
  id: '',
  name: relationshipName,
  description: '',
  nodes: [],
  lines: [],
  createdAt: '',
  updatedAt: ''
})

// 图表配置
const graphOptions = {
  allowShowDownloadButton: false,
  defaultNodeBorderWidth: 0,
  allowSwitchLineShape: true,
  allowSwitchJunctionPoint: true,
  defaultLineShape: 1,
  layouts: [
    {
      layoutName: 'center'
    }
  ],
  defaultJunctionPoint: 'border',
  defaultLineFontColor: '#409eff' // 设置默认线条文字颜色为蓝色
}

// 加载人物数据
const loadCharacters = async () => {
  try {
    const data = await window.electron.readCharacters(bookName)
    characters.value = Array.isArray(data) ? data : []
    // 初始化过滤后的人物数据
    filteredCharacters.value = [...characters.value]
  } catch (error) {
    console.error('加载人物数据失败:', error)
    characters.value = []
    filteredCharacters.value = []
  }
}

// 加载关系图数据
const loadRelationshipData = async () => {
  try {
    const data = await window.electron.readRelationshipData(bookName, relationshipName)
    if (data) {
      // 数据格式迁移：将旧格式的属性迁移到 data 对象中
      const migratedNodes = Array.isArray(data.nodes)
        ? data.nodes.map((node) => {
            if (!node.data) {
              node.data = {}
            }
            // 迁移旧格式的属性到 data 中
            if (node.gender !== undefined) {
              node.data.gender = node.gender
              delete node.gender
            }
            if (node.description !== undefined) {
              node.data.description = node.description
              delete node.description
            }
            if (node.characterId !== undefined) {
              node.data.characterId = node.characterId
              delete node.characterId
            }
            return node
          })
        : []

      // 确保所有连线都有正确的文字颜色
      const migratedLines = Array.isArray(data.lines)
        ? data.lines.map((line) => ({
            ...line,
            fontColor: line.fontColor || '#409eff' // 如果没有设置颜色，使用默认蓝色
          }))
        : []

      Object.assign(relationshipData, {
        ...data,
        nodes: migratedNodes,
        lines: migratedLines
      })
      graphRef.value.setJsonData(relationshipData)
    } else {
      // 保证nodes/edges为数组
      relationshipData.nodes = []
      relationshipData.lines = []
      // 初始化空图表
      if (graphRef.value && graphRef.value.setJsonData) {
        graphRef.value.setJsonData(relationshipData)
      }
    }
  } catch (error) {
    console.error('加载关系图数据失败:', error)
    ElMessage.error('加载关系图数据失败')
    // 保证nodes/edges为数组
    relationshipData.nodes = []
    relationshipData.lines = []
    // 初始化空图表
    if (graphRef.value && graphRef.value.setJsonData) {
      graphRef.value.setJsonData(relationshipData)
    }
  }
}

// 保存关系图
const handleSave = async () => {
  try {
    saving.value = true

    // 更新修改时间
    relationshipData.updatedAt = new Date().toISOString()

    // 保存关系图数据
    await window.electron.saveRelationshipData(
      bookName,
      relationshipName,
      JSON.parse(JSON.stringify(relationshipData))
    )

    // 生成并保存缩略图
    if (relationshipData.nodes.length > 0) {
      // 获取图表实例, 获取图片base64
      const imageBase64 = await graphRef.value.getInstance().getImageBase64()
      await window.electron.updateRelationshipThumbnail({
        bookName,
        relationshipName,
        thumbnailData: imageBase64
      })
    }

    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存关系图失败:', error)
    ElMessage.error('保存关系图失败')
  } finally {
    saving.value = false
  }
}

// 环绕菜单相关响应式变量
const showRadialMenu = ref(false)
const nodeMenuPanel = ref({
  width: 160,
  height: 160,
  x: 0,
  y: 0
})

// 节点点击事件，显示环绕菜单
const onNodeClick = (nodeObject) => {
  // 如果在连线模式下，不显示环绕菜单
  if (isLinkMode.value) return

  // 设置选中的节点
  selectedNode.value = nodeObject
  showRadialMenu.value = false
  const t = setTimeout(() => {
    const graphInstance = graphRef.value?.getInstance()
    if (graphInstance) {
      const viewCoordinate = graphInstance.getClientCoordinateByCanvasCoordinate({
        x: nodeObject.x + nodeObject.el.offsetHeight / 2,
        y: nodeObject.y + nodeObject.el.offsetHeight / 2
      })
      nodeMenuPanel.value.x = viewCoordinate.x - graphInstance.options.canvasOffset.x
      nodeMenuPanel.value.y = viewCoordinate.y - graphInstance.options.canvasOffset.y
      showRadialMenu.value = true
    }
    clearTimeout(t)
  }, 100)
}

// 连线点击事件处理
const onLineClick = (line) => {
  if (!line || !line.id) {
    console.warn('Invalid line object:', line)
    return
  }

  selectedEdge.value = line
  edgeForm.text = line.text || ''
  edgeDialogVisible.value = true

  // console.log('Edge dialog opened for line:', line.id, 'with text:', line.text)
}

// 画布点击时隐藏菜单
const onCanvasClick = () => {
  showRadialMenu.value = false

  // 如果在连线模式下，退出连线模式
  if (isLinkMode.value) {
    exitLinkMode()
  }
}

// 环绕菜单事件处理函数（预留实现）
function handleNodeInfo() {
  if (!selectedNode.value) return
  // 初始化表单
  infoForm.text = selectedNode.value.text
  infoForm.gender = selectedNode.value.data?.gender || 'male' // 如果没有性别信息，默认男性
  infoForm.color = presetColors.find((c) => c.value === selectedNode.value.color)
    ? selectedNode.value.color
    : ''
  customColor.value = !infoForm.color ? selectedNode.value.color || '' : ''
  infoForm.description = selectedNode.value.data?.description || ''

  // 检查当前节点文本是否对应已存在的人物
  const existingCharacter = characters.value.find((c) => c.name === selectedNode.value.text)
  if (existingCharacter) {
    infoForm.characterId = existingCharacter.id
    // 如果人物有性别信息，使用人物的性别，否则保持当前节点的性别
    if (existingCharacter.gender) {
      infoForm.gender = existingCharacter.gender
    }
  } else {
    // 如果是新名称，设置为文本内容
    infoForm.characterId = selectedNode.value.text
  }

  // 如果节点有保存的 characterId，优先使用
  if (selectedNode.value.data?.characterId) {
    infoForm.characterId = selectedNode.value.data.characterId
  }

  // 重置过滤结果
  filteredCharacters.value = characters.value

  infoDialogVisible.value = true
  showRadialMenu.value = false
}
function handleNodeAdd() {
  // 新增一个名为“新节点”的节点，并自动连线
  if (!selectedNode.value) return
  // 重置表单为默认值
  resetForm()

  // 设置新增模式标识
  isAddMode.value = true

  // 显示节点编辑弹框
  infoDialogVisible.value = true
  showRadialMenu.value = false
}
function handleNodeLink() {
  if (!selectedNode.value) return

  // 进入连线模式
  isLinkMode.value = true
  linkStartNode.value = selectedNode.value

  // 隐藏环绕菜单
  showRadialMenu.value = false

  // 延迟创建标记线条，等待RelationGraph渲染完成
  setTimeout(() => {
    createMarkLine()
    console.log('createMarkLine called after delay, linkPreviewLine:', linkPreviewLine.value)
    console.log('isLinkMode:', isLinkMode.value)
  }, 100)

  // 添加鼠标移动事件监听
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('click', handleGlobalClick)
}
function handleNodeDelete() {
  if (!selectedNode.value) return

  const nodeName = selectedNode.value.text || '未知节点'

  ElMessageBox.confirm(
    `确定要删除节点"${nodeName}"吗？\n删除操作将同时删除当前节点和所有子节点，此操作不可恢复！`,
    '确认删除',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: false
    }
  )
    .then(() => {
      // 用户确认删除
      const nodeId = selectedNode.value.id

      // 递归查找所有子节点id
      function collectDescendants(id, nodes, lines, collected = new Set()) {
        collected.add(id)
        lines.forEach((line) => {
          if (line.from === id && !collected.has(line.to)) {
            collectDescendants(line.to, nodes, lines, collected)
          }
        })
        return collected
      }

      const toDeleteIds = collectDescendants(nodeId, relationshipData.nodes, relationshipData.lines)
      const deleteCount = toDeleteIds.size

      try {
        // 删除节点
        relationshipData.nodes = relationshipData.nodes.filter((n) => !toDeleteIds.has(n.id))
        // 删除相关连线
        relationshipData.lines = relationshipData.lines.filter(
          (l) => !toDeleteIds.has(l.from) && !toDeleteIds.has(l.to)
        )

        // 更新图表 - 使用 nextTick 确保 DOM 更新完成
        if (graphRef.value && graphRef.value.setJsonData) {
          // 先清空图表，再重新设置数据
          graphRef.value.setJsonData({
            nodes: [],
            lines: []
          })

          // 使用 nextTick 确保清空操作完成后再设置新数据
          nextTick(() => {
            if (graphRef.value && graphRef.value.setJsonData) {
              graphRef.value.setJsonData(relationshipData)
            }
          })
        }

        // 清空选中的节点
        selectedNode.value = null
        showRadialMenu.value = false

        // 显示删除结果
        if (deleteCount === 1) {
          ElMessage.success('节点已删除')
        } else {
          ElMessage.success(`已删除 ${deleteCount} 个节点及其相关连线`)
        }
      } catch (error) {
        console.error('删除节点失败:', error)
        ElMessage.error('删除失败，请重试')
      }
    })
    .catch(() => {
      // 用户取消删除
      showRadialMenu.value = false
    })
}

// 信息编辑弹窗相关
const infoDialogVisible = ref(false)
const infoForm = reactive({
  text: '',
  gender: 'male', // 默认男性
  color: '',
  description: '',
  characterId: '' // 选中的人物谱id
})

// 连线编辑弹窗相关
const edgeDialogVisible = ref(false)
const selectedEdge = ref(null)
const edgeForm = reactive({
  text: ''
})

// 新增/编辑模式标识
const isAddMode = ref(false)

// 连线模式相关状态
const isLinkMode = ref(false)
const linkStartNode = ref(null)
const linkPreviewLine = ref({
  x: 0,
  y: 0,
  width: 0,
  angle: 0
})
const mousePosition = ref({ x: 0, y: 0 })

const presetColors = [
  { label: '蓝色', value: '#409eff' },
  { label: '橙色', value: '#ff5819' },
  { label: '红色', value: '#f56c6c' },
  { label: '绿色', value: '#67c23a' }
]
const customColor = ref('')

// 过滤人物数据
function filterCharacters(query) {
  if (query === '') {
    filteredCharacters.value = characters.value
  } else {
    filteredCharacters.value = characters.value.filter((character) =>
      character.name.toLowerCase().includes(query.toLowerCase())
    )
  }
}

// 选择人物谱时自动同步性别、描述、背景色
function onCharacterChange(val) {
  // 检查是否是已存在的人物ID
  const character = characters.value.find((c) => c.id === val)
  if (character) {
    // 选择已存在的人物
    infoForm.text = character.name
    infoForm.gender = character.gender || 'male' // 如果没有性别信息，默认男性
    infoForm.description = character.introduction
    infoForm.color = character.gender === 'female' ? '#ff5819' : '#409eff'
    customColor.value = ''
  } else {
    // 输入新名称，设置默认值
    infoForm.text = val
    infoForm.gender = 'male' // 新名称默认男性
    infoForm.description = ''
    infoForm.color = '#409eff'
    customColor.value = ''
  }
}

// 下拉框显示/隐藏时的处理
function onSelectVisibleChange(visible) {
  if (visible) {
    // 显示时重置过滤结果
    filteredCharacters.value = characters.value
  }
}

// 选择预设色
function onCustomColor(val) {
  infoForm.color = val
}

// 选择预设颜色
function selectPresetColor(color) {
  infoForm.color = color
  customColor.value = '' // 清空自定义颜色
}

// 重置表单到默认值
function resetForm() {
  infoForm.text = ''
  infoForm.gender = 'male' // 重置为默认男性
  infoForm.color = ''
  infoForm.description = ''
  infoForm.characterId = ''
  customColor.value = '#409eff'
}

// 关闭对话框并重置表单
function closeDialog() {
  infoDialogVisible.value = false
  isAddMode.value = false
  resetForm()
}

// 关闭连线编辑对话框
function closeEdgeDialog() {
  edgeDialogVisible.value = false
  selectedEdge.value = null
  edgeForm.text = ''
}

// 创建标记线条
function createMarkLine() {
  console.log('createMarkLine function called')
  console.log('isLinkMode:', isLinkMode.value)
  console.log('linkStartNode:', linkStartNode.value)

  if (!isLinkMode.value || !linkStartNode.value) {
    console.log('Early return: isLinkMode or linkStartNode is falsy')
    return
  }

  // 获取起始节点的位置
  let startNodeEl = document.querySelector(`[data-node-id="${linkStartNode.value.id}"]`)
  console.log('startNodeEl found with data-node-id:', startNodeEl)

  if (!startNodeEl) {
    console.log('No startNodeEl found with data-node-id, trying alternative selectors')
    // 尝试其他选择器
    startNodeEl = document.querySelector('.relation-graph-node')
    console.log('Alternative element with .relation-graph-node:', startNodeEl)

    if (!startNodeEl) {
      startNodeEl = document.querySelector('[class*="node"]')
      console.log('Alternative element with [class*="node"]:', startNodeEl)
    }

    if (!startNodeEl) {
      console.log('No node element found with any selector')
      return
    }
  }

  const startRect = startNodeEl.getBoundingClientRect()
  const startX = startRect.left + startRect.width / 2
  const startY = startRect.top + startRect.height / 2

  console.log('startRect:', startRect)
  console.log('Calculated position:', startX, startY)

  // 设置标记线条的位置信息
  linkPreviewLine.value = {
    x: startX,
    y: startY,
    width: 0,
    angle: 0
  }
  console.log('Mark line created at:', startX, startY)
  console.log('Final linkPreviewLine:', linkPreviewLine.value)
}

// 鼠标移动处理函数
function handleMouseMove(event) {
  if (!isLinkMode.value || !linkStartNode.value) return

  mousePosition.value = {
    x: event.clientX,
    y: event.clientY
  }

  console.log('Mouse moved to:', event.clientX, event.clientY)

  // 更新连线预览
  updateLinkPreview()
}

// 全局点击处理函数
function handleGlobalClick(event) {
  if (!isLinkMode.value || !linkStartNode.value) return

  // 检查是否点击了节点
  const targetElement = event.target.closest('.relation-graph-node')
  if (targetElement) {
    // 获取目标节点数据
    const targetNodeId = targetElement.getAttribute('data-node-id')
    if (targetNodeId && targetNodeId !== linkStartNode.value.id) {
      // 创建连线
      createLink(linkStartNode.value.id, targetNodeId)
    }
  }

  // 退出连线模式
  exitLinkMode()
}

// 更新连线预览
function updateLinkPreview() {
  if (!isLinkMode.value || !linkStartNode.value || !linkPreviewLine.value) return

  // 获取起始节点的位置
  const startNodeEl = document.querySelector(`[data-node-id="${linkStartNode.value.id}"]`)
  if (!startNodeEl) return

  const startRect = startNodeEl.getBoundingClientRect()
  const startX = startRect.left + startRect.width / 2
  const startY = startRect.top + startRect.height / 2

  // 计算连线角度和长度
  const deltaX = mousePosition.value.x - startX
  const deltaY = mousePosition.value.y - startY
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI

  console.log('Mouse position:', mousePosition.value.x, mousePosition.value.y)
  console.log('Start position:', startX, startY)
  console.log('Delta:', deltaX, deltaY)
  console.log('Calculated length:', length, 'angle:', angle)

  // 更新标记线条的位置信息
  linkPreviewLine.value.x = startX
  linkPreviewLine.value.y = startY
  linkPreviewLine.value.width = length
  linkPreviewLine.value.angle = angle

  console.log('Updated linkPreviewLine:', linkPreviewLine.value)
}

// 创建连线
function createLink(fromNodeId, toNodeId) {
  // 检查是否已存在连线
  const existingLink = relationshipData.lines.find(
    (line) => line.from === fromNodeId && line.to === toNodeId
  )

  if (existingLink) {
    ElMessage.warning('这两个节点之间已经存在连线')
    return
  }

  // 创建新连线
  const newLine = {
    id: genId(),
    from: fromNodeId,
    to: toNodeId,
    text: '',
    fontColor: '#409eff',
    lineShape: 1 // 带箭头的连线样式
  }

  // 添加到数据源
  relationshipData.lines.push(newLine)

  // 刷新图表
  if (graphRef.value && graphRef.value.setJsonData) {
    graphRef.value.setJsonData(relationshipData)
  }

  // 清除标记线条
  linkPreviewLine.value = {
    x: 0,
    y: 0,
    width: 0,
    angle: 0
  }
}

// 退出连线模式
function exitLinkMode() {
  isLinkMode.value = false
  linkStartNode.value = null

  // 清除标记线条
  linkPreviewLine.value = {
    x: 0,
    y: 0,
    width: 0,
    angle: 0
  }

  // 移除事件监听
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('click', handleGlobalClick)

  // 清除鼠标位置
  mousePosition.value = { x: 0, y: 0 }
}

// 保存节点信息
function saveNodeInfo() {
  if (isAddMode.value) {
    // 新增模式：创建新节点
    if (!infoForm.characterId.trim()) {
      ElMessage.warning('请输入节点名称')
      return
    }

    const newNodeId = genId()
    const newNode = {
      id: newNodeId,
      text: infoForm.characterId.trim(),
      type: 'character',
      color: infoForm.color || customColor.value || '#409eff',
      data: {
        description: infoForm.description || '',
        gender: infoForm.gender || 'male',
        characterId: infoForm.characterId.trim()
      }
    }

    // 添加到数据源
    relationshipData.nodes.push(newNode)

    // 创建连线到当前选中的节点
    if (selectedNode.value) {
      relationshipData.lines.push({
        id: genId(),
        from: selectedNode.value.id,
        to: newNodeId,
        text: '',
        fontColor: '#409eff'
      })
    }

    // 刷新图表
    if (graphRef.value && graphRef.value.setJsonData) {
      graphRef.value.setJsonData(relationshipData)
    }

    infoDialogVisible.value = false
    isAddMode.value = false
    ElMessage.success('新节点已创建')
  } else {
    // 编辑模式：更新现有节点
    if (!selectedNode.value) return

    // 检查是否是已存在的人物ID还是新名称
    const existingCharacter = characters.value.find((c) => c.id === infoForm.characterId)
    if (existingCharacter) {
      // 选择已存在的人物
      selectedNode.value.text = existingCharacter.name
      // 确保 data 对象存在
      if (!selectedNode.value.data) {
        selectedNode.value.data = {}
      }
      selectedNode.value.data.characterId = existingCharacter.id
    } else {
      // 输入新名称
      selectedNode.value.text = infoForm.characterId
      // 确保 data 对象存在
      if (!selectedNode.value.data) {
        selectedNode.value.data = {}
      }
      selectedNode.value.data.characterId = '' // 清空人物ID，表示是新数据
    }

    // 确保 data 对象存在
    if (!selectedNode.value.data) {
      selectedNode.value.data = {}
    }

    selectedNode.value.data.gender = infoForm.gender
    selectedNode.value.color = infoForm.color || customColor.value
    selectedNode.value.data.description = infoForm.description

    // 同步到数据源
    const node = relationshipData.nodes.find((n) => n.id === selectedNode.value.id)
    if (node) {
      node.text = selectedNode.value.text
      node.color = selectedNode.value.color
      // 确保目标节点的 data 对象存在
      if (!node.data) {
        node.data = {}
      }
      node.data.gender = selectedNode.value.data.gender
      node.data.description = selectedNode.value.data.description
      node.data.characterId = selectedNode.value.data.characterId
    }
    // 刷新图表
    if (graphRef.value && graphRef.value.setJsonData) {
      // 先清空图表，再重新设置数据，确保更新生效
      graphRef.value.setJsonData({
        nodes: [],
        lines: []
      })

      nextTick(() => {
        if (graphRef.value && graphRef.value.setJsonData) {
          graphRef.value.setJsonData(relationshipData)
        }
      })
    }
    infoDialogVisible.value = false
    ElMessage.success('节点信息已更新')
  }
}

// 保存连线信息
function saveEdgeInfo() {
  if (!selectedEdge.value) {
    ElMessage.warning('没有选中的连线')
    return
  }

  if (!edgeForm.text.trim()) {
    ElMessage.warning('请输入关系描述')
    return
  }

  try {
    // 更新连线文本
    selectedEdge.value.text = edgeForm.text.trim()

    // 同步到本地数据
    const line = relationshipData.lines.find((l) => l.id === selectedEdge.value.id)
    if (line) {
      line.text = edgeForm.text.trim()
      // 确保文字颜色设置
      line.fontColor = line.fontColor || '#409eff'
    }

    // 刷新图表
    if (graphRef.value && graphRef.value.setJsonData) {
      // 先清空图表，再重新设置数据，确保更新生效
      graphRef.value.setJsonData({
        nodes: [],
        lines: []
      })

      nextTick(() => {
        if (graphRef.value && graphRef.value.setJsonData) {
          graphRef.value.setJsonData(relationshipData)
        }
      })
    }

    edgeDialogVisible.value = false
    ElMessage.success('关系信息已更新')
  } catch (error) {
    console.error('Error saving edge info:', error)
    ElMessage.error('保存失败，请重试')
  }
}

onMounted(async () => {
  // 等待下一个 tick 确保图表组件完全挂载
  await nextTick()
  loadCharacters()
  loadRelationshipData()

  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeyDown)
})

// 键盘事件处理
function handleKeyDown(event) {
  if (event.key === 'Escape' && isLinkMode.value) {
    exitLinkMode()
  }
}
</script>

<style lang="scss" scoped>
.relationship-design {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.design-toolbar {
  display: flex;
  // justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.design-canvas {
  flex: 1;
  background-color: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

:deep(.relation-graph) {
  width: 100%;
  height: 100%;
}

:deep(.relation-graph-canvas) {
  background-color: var(--bg-base);
}

.node-detail {
  .node-description {
    color: var(--text-secondary);
    margin: 8px 0;
    line-height: 1.5;
  }

  .node-info {
    p {
      margin: 4px 0;
      color: var(--text-primary);
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .design-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}

/* 颜色方块样式 */
.color-squares {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-square {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  position: relative;
}

.color-square:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.color-square-selected {
  border: 2px solid #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.color-square-selected::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* 连线预览样式 */
.link-preview {
  height: 3px;
  background: #333;
  position: absolute;
  border-radius: 2px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  transform-origin: 0 50%;
  pointer-events: none;
  z-index: 1000;
}
</style>
