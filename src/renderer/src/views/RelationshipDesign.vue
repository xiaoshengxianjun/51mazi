<template>
  <LayoutTool :title="relationshipName || t('relationshipDesign.titleFallback')">
    <template #headrAction>
      <el-button type="primary" :loading="saving" @click="handleSave">
        <el-icon><Check /></el-icon>
        <span>{{ t('common.save') }}</span>
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
                :is-root="isSelectedNodeRoot"
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
            </template>
            <template #node="{ node }">
              <div class="custom-node" :style="getNodeStyle(node)">
                <div class="node-text">
                  {{ node.text }}
                </div>
              </div>
            </template>
          </RelationGraph>
        </div>
      </div>
    </template>
  </LayoutTool>
  <el-dialog
    v-model="infoDialogVisible"
    :title="isAddMode ? t('relationshipDesign.addNodeTitle') : t('relationshipDesign.editNodeTitle')"
    width="500px"
  >
    <el-form label-width="80px" @submit.prevent="saveNodeInfo">
      <el-form-item :label="t('relationshipDesign.nodeText')">
        <el-select
          v-model="infoForm.characterId"
          :placeholder="t('relationshipDesign.nodeTextPlaceholder')"
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
      <el-form-item :label="t('relationshipDesign.gender')">
        <el-radio-group v-model="infoForm.gender">
          <el-radio value="male">{{ t('characterProfile.genderMale') }}</el-radio>
          <el-radio value="female">{{ t('characterProfile.genderFemale') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="t('relationshipDesign.backgroundColor')">
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
      <el-form-item :label="t('relationshipDesign.avatar')">
        <div style="width: 100%; display: flex; gap: 8px; align-items: flex-start">
          <el-input
            v-model="infoForm.avatar"
            :placeholder="t('relationshipDesign.avatarPlaceholder')"
          />
          <el-button @click="selectLocalImage">{{ t('characterProfile.selectLocalImage') }}</el-button>
          <div v-if="infoForm.avatar" class="avatar-preview">
            <el-image
              :src="getAvatarSrc(infoForm.avatar)"
              alt="头像预览"
              class="preview-image"
              :fit="'cover'"
            />
          </div>
        </div>
      </el-form-item>
      <el-form-item :label="t('relationshipDesign.description')">
        <el-input
          v-model="infoForm.description"
          type="textarea"
          :rows="3"
          :placeholder="t('relationshipDesign.descriptionPlaceholder')"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="saveNodeInfo">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>

  <!-- 连线编辑弹框 -->
  <el-dialog v-model="edgeDialogVisible" :title="t('relationshipDesign.editEdgeTitle')" width="400px">
    <el-form label-width="80px" @submit.prevent="saveEdgeInfo">
      <el-form-item :label="t('relationshipDesign.edgeDescription')">
        <el-input
          v-model="edgeForm.text"
          :placeholder="t('relationshipDesign.edgeDescriptionPlaceholder')"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeEdgeDialog">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="saveEdgeInfo">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Check } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import RelationGraph from 'relation-graph-vue3'
import RadialMenu from '@renderer/components/RadialMenu.vue'
import { genId } from '@renderer/utils/utils'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
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
  creatingLinePlot: false, // 连线创建模式
  layouts: [
    {
      layoutName: 'center'
    }
  ],
  defaultJunctionPoint: 'border',
  defaultLineFontColor: '#409eff', // 设置默认线条文字颜色为蓝色
  // 自定义节点渲染
  defaultNodeShape: 0, // 使用矩形节点
  defaultNodeWidth: 100,
  defaultNodeHeight: 100,
  // 节点文字样式
  defaultNodeFontColor: '#333333',
  defaultNodeFontSize: 16,
  // 允许自定义节点HTML
  allowNodeCustomHTML: true
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
            // 确保头像字段存在
            if (!node.data.avatar) {
              node.data.avatar = ''
            }
            // 确保字体大小字段存在并迁移到 data 中
            if (!node.data.fontSize) {
              const level = calculateNodeLevel(node.id, data.nodes, data.lines)
              const size = calculateNodeSize(node.id, data.nodes, data.lines, level)
              node.data.fontSize = size.fontSize
            }
            // 如果旧数据中有 fontSize 属性，迁移到 data 中
            if (node.fontSize && !node.data.fontSize) {
              node.data.fontSize = node.fontSize
              delete node.fontSize
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
      await graphRef.value.setJsonData(relationshipData)
      // const graphInstance = graphRef.value.getInstance()
      // await graphInstance.moveToCenter()
      // await graphInstance.zoomToFit()
      // applyNodeSizes() // 加载数据后应用节点大小
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
    ElMessage.error(t('relationshipDesign.loadFailed'))
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

    syncGraphNodePositions()

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

    ElMessage.success(t('relationshipDesign.saveSuccess'))
  } catch (error) {
    console.error('保存关系图失败:', error)
    ElMessage.error(t('relationshipDesign.saveFailed'))
  } finally {
    saving.value = false
  }
}

function getGraphInstance() {
  return graphRef.value?.getInstance?.()
}

// 手动拖拽后的坐标保存在图实例里；持久化和增量更新前先同步，避免下次加载或局部更新丢布局。
function syncGraphNodePositions() {
  const graphInstance = getGraphInstance()
  if (!graphInstance?.getNodeById) return

  relationshipData.nodes = relationshipData.nodes.map((node) => {
    const graphNode = graphInstance.getNodeById(node.id)
    if (!graphNode) return node

    return {
      ...node,
      x: graphNode.x,
      y: graphNode.y
    }
  })
}

function getNodePosition(nodeId) {
  const graphNode = getGraphInstance()?.getNodeById?.(nodeId)
  const dataNode = relationshipData.nodes.find((node) => node.id === nodeId)

  return {
    x: graphNode?.x ?? dataNode?.x ?? 0,
    y: graphNode?.y ?? dataNode?.y ?? 0
  }
}

function getNewNodePosition(parentNodeId) {
  if (!parentNodeId) return { x: 0, y: 0 }

  const siblingCount = relationshipData.lines.filter((line) => line.from === parentNodeId).length
  const parentPosition = getNodePosition(parentNodeId)
  const direction = siblingCount % 2 === 0 ? 1 : -1
  const horizontalOffset = Math.ceil(siblingCount / 2) * 120 * direction

  return {
    x: parentPosition.x + horizontalOffset,
    y: parentPosition.y + 130
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

// 计算当前选中的节点是否为根节点
const isSelectedNodeRoot = computed(() => {
  if (!selectedNode.value) return false
  // 根节点判断：没有父节点（没有连线指向该节点）
  const hasParent = relationshipData.lines.some((line) => line.to === selectedNode.value.id)
  return !hasParent
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
  // 如果有头像路径，转换为 file:// 协议以便预览
  const avatarPath = selectedNode.value.data?.avatar || ''
  infoForm.avatar = getAvatarSrc(avatarPath)

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

  // 如果节点有保存的 characterId，优先使用，并回填人物信息
  if (selectedNode.value.data?.characterId) {
    infoForm.characterId = selectedNode.value.data.characterId
    // 根据characterId查找对应的人物，回填头像等信息
    const matchedCharacter = characters.value.find(
      (c) => c.id === selectedNode.value.data.characterId
    )
    if (matchedCharacter) {
      // 如果节点没有头像或人物有头像，使用人物的头像
      if (!infoForm.avatar && matchedCharacter.avatar) {
        infoForm.avatar = matchedCharacter.avatar
      }
      // 同步人物的描述信息（如果节点没有描述）
      if (!infoForm.description && (matchedCharacter.biography || matchedCharacter.introduction)) {
        infoForm.description = matchedCharacter.biography || matchedCharacter.introduction || ''
      }
      // 同步人物的性别（如果节点没有性别或人物有性别）
      if (matchedCharacter.gender) {
        infoForm.gender = matchedCharacter.gender === '女' ? 'female' : 'male'
      }
    }
  } else if (existingCharacter && existingCharacter.avatar) {
    // 如果通过名称匹配到人物且人物有头像，回填头像
    if (!infoForm.avatar) {
      infoForm.avatar = existingCharacter.avatar
    }
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

  // 隐藏环绕菜单
  showRadialMenu.value = false

  // 使用RelationGraph的正确连线API
  const graphInstance = graphRef.value?.getInstance()
  if (graphInstance) {
    // 使用startCreatingLinePlot方法启动连线创建模式
    if (typeof graphInstance.startCreatingLinePlot === 'function') {
      const creatingOptions = {
        onCreateLine: (fromNode, toNode) => {
          console.log('Line created from', fromNode.id, 'to', toNode.id)

          syncGraphNodePositions()

          // 创建新连线数据
          const newLine = {
            id: genId(),
            from: fromNode.id,
            to: toNode.id,
            text: '',
            fontColor: '#409eff',
            lineShape: 1
          }

          // 添加到数据源
          relationshipData.lines.push(newLine)

          // 使用增量更新而不是重新设置整个数据
          const graphInstance = getGraphInstance()
          if (graphInstance) {
            // 添加新连线
            graphInstance.addLines([newLine])
            // 重新布局
            // graphInstance.doLayout()

            // 重新计算并应用节点大小（因为连线关系可能改变了层级）
            applyNodeSizes()
          }

          // 退出连线模式
          isLinkMode.value = false

          // 停止连线创建模式
          if (typeof graphInstance.stopCreatingLinePlot === 'function') {
            graphInstance.stopCreatingLinePlot()
          }

          ElMessage.success(t('relationshipDesign.lineCreateSuccess'))
        }
      }

      // 启动连线创建模式
      graphInstance.startCreatingLinePlot(null, creatingOptions)
      console.log('Started line creation mode with startCreatingLinePlot')

      // 设置起始节点，这样预览连线就会从当前节点开始
      if (graphInstance.options && graphInstance.options.editingLineController) {
        // 设置起始节点位置
        const startNode = graphInstance.getNodeById(selectedNode.value.id)
        if (startNode) {
          graphInstance.options.editingLineController.startPoint = {
            x: startNode.x,
            y: startNode.y
          }
          graphInstance.options.editingLineController.endPoint = {
            x: startNode.x,
            y: startNode.y
          }
          graphInstance.updateEditingLineView()
        }
      }
    } else {
      console.warn('startCreatingLinePlot method not found')
      ElMessage.error(t('relationshipDesign.lineUnavailable'))
      return
    }
  }

  // 显示连线模式提示
  ElMessage.info(t('relationshipDesign.linkModeTip'))
}
function handleNodeDelete() {
  if (!selectedNode.value) return

  const nodeName = selectedNode.value.text || t('relationshipDesign.unknownNode')

  ElMessageBox.confirm(t('relationshipDesign.deleteNodeConfirm', { name: nodeName }), t('relationshipDesign.deleteTitle'), {
    confirmButtonText: t('relationshipDesign.confirmDelete'),
    cancelButtonText: t('common.cancel'),
    type: 'warning',
    dangerouslyUseHTMLString: false
  })
    .then(() => {
      syncGraphNodePositions()

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

        // 使用增量更新而不是重新设置整个数据
        const graphInstance = getGraphInstance()
        if (graphInstance) {
          // 删除节点和连线
          toDeleteIds.forEach((nodeId) => {
            graphInstance.removeNodeById(nodeId)
          })

          // 重新计算并应用节点大小（因为删除节点可能改变了层级关系）
          applyNodeSizes()
        }

        // 清空选中的节点
        selectedNode.value = null
        showRadialMenu.value = false

        // 显示删除结果
        if (deleteCount === 1) {
          ElMessage.success(t('relationshipDesign.nodeDeleted'))
        } else {
          ElMessage.success(t('relationshipDesign.nodesDeletedCount', { count: deleteCount }))
        }
      } catch (error) {
        console.error('删除节点失败:', error)
        ElMessage.error(t('relationshipDesign.deleteFailed'))
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
  characterId: '', // 选中的人物谱id
  avatar: '' // 头像路径或链接
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

const presetColors = [
  { label: t('relationshipDesign.colors.blue'), value: '#409eff' },
  { label: t('relationshipDesign.colors.orange'), value: '#ff5819' },
  { label: t('relationshipDesign.colors.red'), value: '#f56c6c' },
  { label: t('relationshipDesign.colors.green'), value: '#67c23a' }
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

// 选择人物谱时自动同步性别、描述、背景色、头像
function onCharacterChange(val) {
  // 检查是否是已存在的人物ID
  const character = characters.value.find((c) => c.id === val)
  if (character) {
    // 选择已存在的人物
    infoForm.text = character.name
    infoForm.gender = character.gender || 'male' // 如果没有性别信息，默认男性
    infoForm.description = character.introduction || character.biography || ''
    infoForm.color = character.gender === 'female' ? '#ff5819' : '#409eff'
    // 如果人物有头像，回填头像信息
    infoForm.avatar = character.avatar || ''
    customColor.value = ''
  } else {
    // 输入新名称，设置默认值
    infoForm.text = val
    infoForm.gender = 'male' // 新名称默认男性
    infoForm.description = ''
    infoForm.color = '#409eff'
    infoForm.avatar = '' // 清空头像
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

// 选择本地图片
async function selectLocalImage() {
  try {
    const result = await window.electron.selectImage()
    if (result && result.filePath) {
      // 将本地文件路径转换为 file:// 协议，以便在浏览器中正确显示
      infoForm.avatar = `file://${result.filePath}`
      ElMessage.success(t('characterProfile.selectImageSuccess'))
    }
  } catch (error) {
    console.error('选择图片失败:', error)
    ElMessage.error(t('characterProfile.selectImageFailed'))
  }
}

// 重置表单到默认值
function resetForm() {
  infoForm.text = ''
  infoForm.gender = 'male' // 重置为默认男性
  infoForm.color = ''
  infoForm.description = ''
  infoForm.characterId = ''
  infoForm.avatar = ''
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

// 保存节点信息
function saveNodeInfo() {
  if (isAddMode.value) {
    // 新增模式：创建新节点
    if (!infoForm.characterId.trim()) {
      ElMessage.warning(t('relationshipDesign.inputNodeName'))
      return
    }
    syncGraphNodePositions()

    const newNodeId = genId()

    // 计算新节点的层级
    let newNodeLevel = 0
    if (selectedNode.value) {
      // 如果有选中的父节点，计算新节点的层级
      const parentLevel = calculateNodeLevel(
        selectedNode.value.id,
        relationshipData.nodes,
        relationshipData.lines
      )
      newNodeLevel = parentLevel + 1
    }

    // 根据层级计算节点大小
    const nodeSize = calculateNodeSize(
      newNodeId,
      relationshipData.nodes,
      relationshipData.lines,
      newNodeLevel
    )

    // 检查是否是已存在的人物ID
    let nodeText = infoForm.characterId.trim()
    let nodeCharacterId = nodeText
    const matchedCharacter = characters.value.find((c) => c.id === nodeText)
    if (matchedCharacter) {
      // 如果是已存在的人物，使用人物名称作为节点文本，人物ID作为characterId
      nodeText = matchedCharacter.name
      nodeCharacterId = matchedCharacter.id
    }

    const position = getNewNodePosition(selectedNode.value?.id)
    const newNode = {
      id: newNodeId,
      text: nodeText,
      type: 'character',
      color: infoForm.color || customColor.value || '#409eff',
      width: nodeSize.width,
      height: nodeSize.height,
      x: position.x,
      y: position.y,
      data: {
        description: infoForm.description || '',
        gender: infoForm.gender || 'male',
        characterId: nodeCharacterId,
        avatar: infoForm.avatar ? infoForm.avatar.replace(/^file:\/\//, '') : '',
        fontSize: nodeSize.fontSize
      }
    }
    relationshipData.nodes.push(newNode)
    if (selectedNode.value) {
      // Create link to parent if a node was selected
      relationshipData.lines.push({
        id: genId(),
        from: selectedNode.value.id,
        to: newNodeId,
        text: '',
        fontColor: '#409eff'
      })
    }

    // 使用增量更新而不是重新设置整个数据
    const graphInstance = getGraphInstance()
    if (graphInstance) {
      // 添加新节点
      graphInstance.addNodes([newNode])

      // 如果有连线，也添加连线
      if (selectedNode.value) {
        const newLine = relationshipData.lines[relationshipData.lines.length - 1]
        graphInstance.addLines([newLine])
      }

      graphInstance.dataUpdated?.()
    }

    infoDialogVisible.value = false
    isAddMode.value = false
    ElMessage.success(t('relationshipDesign.newNodeCreated'))
  } else {
    // 编辑模式：更新现有节点
    if (!infoForm.characterId.trim()) {
      ElMessage.warning(t('relationshipDesign.inputNodeName'))
      return
    }
    syncGraphNodePositions()

    // 检查是否是已存在的人物ID
    const existingCharacter = characters.value.find((c) => c.id === infoForm.characterId)
    if (existingCharacter) {
      // 选择已存在的人物
      selectedNode.value.text = existingCharacter.name
      // 确保 data 对象存在
      if (!selectedNode.value.data) {
        selectedNode.value.data = {}
      }
      selectedNode.value.data.characterId = existingCharacter.id
      // 如果表单中没有头像但人物有头像，使用人物的头像
      if (!infoForm.avatar && existingCharacter.avatar) {
        infoForm.avatar = existingCharacter.avatar
      }
      // 如果表单中没有描述但人物有描述，使用人物的描述
      if (
        !infoForm.description &&
        (existingCharacter.biography || existingCharacter.introduction)
      ) {
        infoForm.description = existingCharacter.biography || existingCharacter.introduction || ''
      }
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
    selectedNode.value.data.avatar = infoForm.avatar
      ? infoForm.avatar.replace(/^file:\/\//, '')
      : ''

    // 同步到数据源
    const node = relationshipData.nodes.find((n) => n.id === selectedNode.value.id)
    if (node) {
      node.text = selectedNode.value.text
      node.color = selectedNode.value.color
      node.x = selectedNode.value.x
      node.y = selectedNode.value.y
      // 确保目标节点的 data 对象存在
      if (!node.data) {
        node.data = {}
      }
      node.data.gender = selectedNode.value.data.gender
      node.data.description = selectedNode.value.data.description
      node.data.characterId = selectedNode.value.data.characterId
      node.data.avatar = selectedNode.value.data.avatar
    }

    // 使用增量更新而不是重新设置整个数据
    const graphInstance = getGraphInstance()
    if (graphInstance) {
      // 通知数据已更新，让RelationGraph重新渲染
      graphInstance.dataUpdated()
    }

    infoDialogVisible.value = false
    ElMessage.success(t('relationshipDesign.nodeUpdated'))
  }
}

// 保存连线信息
function saveEdgeInfo() {
  if (!selectedEdge.value) {
    ElMessage.warning(t('relationshipDesign.noSelectedEdge'))
    return
  }

  if (!edgeForm.text.trim()) {
    ElMessage.warning(t('relationshipDesign.inputEdgeDescription'))
    return
  }

  try {
    syncGraphNodePositions()

    // 更新连线文本
    selectedEdge.value.text = edgeForm.text.trim()

    // 同步到本地数据
    const line = relationshipData.lines.find((l) => l.id === selectedEdge.value.id)
    if (line) {
      line.text = edgeForm.text.trim()
      // 确保文字颜色设置
      line.fontColor = line.fontColor || '#409eff'
    }

    // 使用增量更新而不是重新设置整个数据
    const graphInstance = getGraphInstance()
    if (graphInstance) {
      // 通知数据已更新，让RelationGraph重新渲染
      graphInstance.dataUpdated()
    }

    edgeDialogVisible.value = false
    ElMessage.success(t('relationshipDesign.edgeUpdated'))
  } catch (error) {
    console.error('Error saving edge info:', error)
    ElMessage.error(t('relationshipDesign.saveRetry'))
  }
}

// 根据节点层级计算节点大小和字体大小
function calculateNodeSize(nodeId, nodes, lines, level = 0) {
  // 根节点最大
  if (level === 0) {
    return { width: 100, height: 100, fontSize: 20 }
  }
  // 第一级子节点中等
  else if (level === 1) {
    return { width: 90, height: 90, fontSize: 18 }
  }
  // 第二级子节点较小
  else if (level === 2) {
    return { width: 80, height: 80, fontSize: 16 }
  }
  // 第三级及以后节点最小且一致
  else {
    return { width: 70, height: 70, fontSize: 14 }
  }
}

// 计算节点的层级
function calculateNodeLevel(nodeId, nodes, lines, visited = new Set()) {
  if (visited.has(nodeId)) return 0

  visited.add(nodeId)

  // 找到根节点（没有父节点的节点）
  const hasParent = lines.some((line) => line.to === nodeId)
  if (!hasParent) {
    return 0
  }

  // 找到父节点
  const parentLine = lines.find((line) => line.to === nodeId)
  if (parentLine) {
    const parentLevel = calculateNodeLevel(parentLine.from, nodes, lines, visited)
    return parentLevel + 1
  }

  return 0
}

// 应用节点大小
function applyNodeSizes() {
  const graphInstance = graphRef.value?.getInstance()
  if (!graphInstance) return

  relationshipData.nodes.forEach((node) => {
    const level = calculateNodeLevel(node.id, relationshipData.nodes, relationshipData.lines)
    const size = calculateNodeSize(node.id, relationshipData.nodes, relationshipData.lines, level)

    // 更新节点大小和字体大小
    node.width = size.width
    node.height = size.height

    // 确保 data 对象存在
    if (!node.data) {
      node.data = {}
    }
    node.data.fontSize = size.fontSize

    // 更新RelationGraph中的节点
    const graphNode = graphInstance.getNodeById(node.id)
    if (graphNode) {
      graphNode.width = size.width
      graphNode.height = size.height
      if (!graphNode.data) {
        graphNode.data = {}
      }
      graphNode.data.fontSize = size.fontSize
    }
  })

  // 通知数据已更新
  graphInstance.dataUpdated()
}

// 获取节点样式
function getNodeStyle(node) {
  return {
    width: node.width + 'px',
    height: node.height + 'px',
    backgroundColor: node.data?.avatar ? 'transparent' : node.color || '#409eff',
    backgroundImage: node.data?.avatar ? `url(${getAvatarSrc(node.data.avatar)})` : 'none',
    fontSize: (node.data?.fontSize || 16) + 'px'
  }
}

// 获取头像源地址
function getAvatarSrc(avatarPath) {
  if (!avatarPath) return ''

  // 如果已经是完整的URL（包含协议），直接返回
  if (
    avatarPath.startsWith('http://') ||
    avatarPath.startsWith('https://') ||
    avatarPath.startsWith('file://') ||
    avatarPath.startsWith('data:')
  ) {
    return avatarPath
  }

  // 如果是本地文件路径，添加 file:// 协议
  return `file://${avatarPath}`
}

onMounted(async () => {
  // 等待下一个 tick 确保图表组件完全挂载
  await nextTick()
  loadCharacters()
  loadRelationshipData()
})
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
  background-color: var(--bg-primary);
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
  background-color: var(--bg-primary);
}

.node-detail {
  .node-description {
    margin: 8px 0;
    line-height: 1.5;
  }

  .node-info {
    p {
      margin: 4px 0;
      color: var(--text-base);
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

/* 头像预览样式 */
.avatar-preview {
  width: 80px;
  height: 80px;
  position: absolute;
  top: -100px;
  right: 0;
}
.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* 自定义节点样式 */
.custom-node {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

.node-text {
  color: white;
  font-weight: bold;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  line-height: 1.2;
  word-break: break-word;
  padding: 4px;
}
</style>
