<template>
  <LayoutTool :title="organizationName || '组织架构编辑'">
    <template #headrAction>
      <el-button type="primary" :loading="saving" @click="handleSave">
        <el-icon><Check /></el-icon>
        <span>保存</span>
      </el-button>
    </template>
    <template #default>
      <div class="organization-design">
        <div ref="canvasRef" class="design-canvas">
          <RelationGraph
            ref="graphRef"
            :options="graphOptions"
            :on-node-click="onNodeClick"
            @canvas-click="onCanvasClick"
          >
            <!-- 自定义节点模板，支持鼠标悬停事件 -->
            <template #node="{ node }">
              <div
                class="custom-node"
                @mouseover="showNodeTooltip(node)"
                @mouseout="hideNodeTooltip"
              >
                {{ node.text }}
              </div>
            </template>
          </RelationGraph>

          <!-- 节点信息浮窗 -->
          <div v-if="tooltipVisible" class="node-tooltip">
            <div class="tooltip-title">{{ hoveredNode?.text }}</div>
            <div class="tooltip-description">
              {{ hoveredNode?.data?.description || '暂无描述' }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </LayoutTool>

  <!-- 通用节点编辑弹框 -->
  <el-dialog
    v-model="nodeDialogVisible"
    :title="dialogConfig.title"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form label-width="80px">
      <el-form-item label="节点名称">
        <el-input v-model="currentForm.text" :placeholder="dialogConfig.namePlaceholder" />
      </el-form-item>
      <el-form-item label="节点描述">
        <el-input
          v-model="currentForm.description"
          type="textarea"
          :rows="3"
          :placeholder="dialogConfig.descPlaceholder"
        />
      </el-form-item>
      <el-form-item label="节点颜色">
        <div class="color-picker-container">
          <el-color-picker v-model="currentForm.color" />
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset-item"
              :style="{ backgroundColor: color }"
              @click="currentForm.color = color"
            ></div>
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <div class="dialog-footer-left">
          <el-button
            v-if="dialogConfig.showDelete && selectedNode?.type !== 'root'"
            type="danger"
            @click="showDeleteConfirm"
          >
            删除节点
          </el-button>
          <el-button v-if="dialogConfig.showAddChild" type="success" @click="switchToAddChildMode">
            添加子节点
          </el-button>
        </div>
        <div class="dialog-footer-right">
          <el-button @click="closeNodeDialog">取消</el-button>
          <el-button type="primary" @click="confirmNodeAction">确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <!-- 删除确认弹框 -->
  <el-dialog
    v-model="deleteConfirmVisible"
    title="确认删除"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="delete-confirm-content">
      <el-icon class="warning-icon"><Warning /></el-icon>
      <div class="warning-text">
        <p>
          确定要删除节点 <strong>"{{ selectedNode?.text }}"</strong> 吗？
        </p>
        <p class="warning-detail">此操作将删除该节点及其所有子节点，且不可恢复。</p>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer delete-confirm-footer">
        <el-button @click="deleteConfirmVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDeleteNode">确认删除</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import RelationGraph from 'relation-graph-vue3'
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Check, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { genId } from '@renderer/utils/utils'

const route = useRoute()
const bookName = route.query.name
const organizationId = route.query.id

const graphRef = ref(null)
const canvasRef = ref(null)
const saving = ref(false)
const organizationName = ref('')
const organizationData = ref({ nodes: [], lines: [] })

// 图形配置
const graphOptions = ref({
  debug: false,
  showDebugPanel: false,
  allowShowDownloadButton: false,
  layouts: [
    {
      label: '垂直树状布局',
      layoutName: 'tree',
      layoutDirection: 'v', // 垂直方向：v，水平方向：h
      from: 'top', // 布局起始方向：top, bottom, left, right
      centerOffset_x: 0,
      centerOffset_y: 0,
      levelDistance: [180, 150, 120], // 各级别垂直间距
      nodeDistance: [120, 100, 80] // 同级节点水平间距
    }
  ],
  defaultNodeShape: 1,
  defaultNodeWidth: 120,
  defaultNodeHeight: 40,
  defaultNodeBorderWidth: 2,
  defaultLineWidth: 1,
  defaultNodeColor: '#409eff',
  defaultLineColor: '#409eff',
  defaultNodeFontColor: '#ffffff',
  defaultNodeBorderColor: '#409eff',
  moveable: true,
  draggable: true,
  zoomable: true,
  allowSwitchLineShape: true,
  defaultLineShape: 44, // 使用圆角折线样式
  lineUseTextPath: true,
  defaultExpandHolderPosition: 'bottom',
  useAnimationWhenRefresh: true,
  placeSingleNode: true,
  useHorizontalView: false, // 禁用水平视图，使用垂直视图
  defaultJunctionPoint: 'tb' // 连接点位置
})

// 节点相关
const selectedNode = ref(null)

// 浮窗相关
const tooltipVisible = ref(false)
const hoveredNode = ref(null)

// 弹框相关
const nodeDialogVisible = ref(false)
const deleteConfirmVisible = ref(false)
const dialogMode = ref('edit') // 'edit', 'add', 'addChild'

// 表单数据
const currentForm = ref({
  text: '',
  description: '',
  color: '#409eff'
})

// 弹框配置
const dialogConfig = computed(() => {
  switch (dialogMode.value) {
    case 'edit':
      return {
        title: '编辑节点信息',
        namePlaceholder: '请输入节点名称',
        descPlaceholder: '请输入节点描述',
        showDelete: true,
        showAddChild: true
      }
    case 'add':
      return {
        title: '新增节点',
        namePlaceholder: '请输入节点名称',
        descPlaceholder: '请输入节点描述',
        showDelete: false,
        showAddChild: false
      }
    case 'addChild':
      return {
        title: '添加子节点',
        namePlaceholder: '请输入子节点名称',
        descPlaceholder: '请输入子节点描述',
        showDelete: false,
        showAddChild: false
      }
    default:
      return {
        title: '编辑节点信息',
        namePlaceholder: '请输入节点名称',
        descPlaceholder: '请输入节点描述',
        showDelete: true,
        showAddChild: true
      }
  }
})

// 颜色预设 - 基于色轮的质感色彩方案
const colorPresets = ref([
  '#2E86AB', // 深海蓝 - 沉稳专业
  '#A23B72', // 深玫瑰红 - 优雅神秘
  '#F18F01', // 琥珀橙 - 温暖活力
  '#C73E1D', // 深红 - 热情强烈
  '#6A994E', // 森林绿 - 自然生机
  '#7209B7', // 深紫 - 高贵典雅
  '#F77F00', // 金橙 - 明亮温暖
  '#D62828', // 勃艮第红 - 经典深沉
  '#023047', // 深蓝灰 - 稳重可靠
  '#8E44AD' // 紫罗兰 - 创意灵感
])

// 画布点击事件
const onCanvasClick = () => {
  // 可以在这里添加画布点击逻辑
}

// 显示删除确认弹框
const showDeleteConfirm = () => {
  deleteConfirmVisible.value = true
}

// 切换到添加子节点模式
const switchToAddChildMode = () => {
  dialogMode.value = 'addChild'
  currentForm.value = {
    text: '',
    description: '',
    color: '#409eff'
  }
}

// 关闭节点弹框
const closeNodeDialog = () => {
  nodeDialogVisible.value = false
  dialogMode.value = 'edit'
}

// 显示节点浮窗
const showNodeTooltip = (node) => {
  hoveredNode.value = node
  tooltipVisible.value = true
}

// 隐藏节点浮窗
const hideNodeTooltip = () => {
  tooltipVisible.value = false
  hoveredNode.value = null
}

// 节点点击事件
const onNodeClick = (node, event) => {
  event.stopPropagation()
  selectedNode.value = node
  handleNodeInfo()
}

// 处理节点信息
const handleNodeInfo = () => {
  if (selectedNode.value) {
    dialogMode.value = 'edit'
    currentForm.value = {
      text: selectedNode.value.text || '',
      description: selectedNode.value.data?.description || '',
      color: selectedNode.value.color || '#409eff'
    }
  }
  nodeDialogVisible.value = true
}

// 确认节点操作（统一处理编辑、添加、添加子节点）
const confirmNodeAction = () => {
  if (!currentForm.value.text.trim()) {
    ElMessage.warning('请输入节点名称')
    return
  }

  switch (dialogMode.value) {
    case 'edit':
      updateNode()
      break
    case 'add':
      addNode()
      break
    case 'addChild':
      addChildNode()
      break
  }

  closeNodeDialog()
}

// 更新节点
const updateNode = () => {
  if (!selectedNode.value) return

  const newColor = currentForm.value.color

  selectedNode.value.text = currentForm.value.text
  selectedNode.value.color = newColor
  selectedNode.value.data = {
    ...selectedNode.value.data,
    description: currentForm.value.description,
    fontSize: 14
  }

  // 同步更新与该节点相连的连线颜色
  organizationData.value.lines.forEach((line) => {
    if (line.from === selectedNode.value.id) {
      line.color = newColor
    }
  })

  // 同步到本地数据
  const nodeIndex = organizationData.value.nodes.findIndex((n) => n.id === selectedNode.value.id)
  if (nodeIndex !== -1) {
    organizationData.value.nodes[nodeIndex] = {
      id: selectedNode.value.id,
      text: selectedNode.value.text,
      color: selectedNode.value.color,
      type: selectedNode.value.type,
      data: selectedNode.value.data
    }
  }

  refreshGraph()
  ElMessage.success('节点更新成功')
}

// 添加节点
const addNode = () => {
  const newNode = {
    id: genId(),
    text: currentForm.value.text,
    color: currentForm.value.color,
    type: 'normal',
    data: {
      description: currentForm.value.description,
      fontSize: 14
    }
  }

  organizationData.value.nodes.push(newNode)

  if (selectedNode.value) {
    const newLine = {
      id: genId(),
      from: selectedNode.value.id,
      to: newNode.id,
      text: '',
      color: selectedNode.value.color, // 使用父节点的颜色
      lineWidth: 2,
      lineShape: 44,
      showEndArrow: true
    }
    organizationData.value.lines.push(newLine)
  }

  refreshGraph()
  ElMessage.success('节点添加成功')
}

// 添加子节点
const addChildNode = () => {
  if (!selectedNode.value) return

  const newChildNode = {
    id: genId(),
    text: currentForm.value.text,
    color: currentForm.value.color,
    type: 'normal',
    data: {
      description: currentForm.value.description,
      fontSize: 14
    }
  }

  organizationData.value.nodes.push(newChildNode)

  const newLine = {
    id: genId(),
    from: selectedNode.value.id,
    to: newChildNode.id,
    text: '',
    color: selectedNode.value.color, // 使用父节点的颜色
    lineWidth: 2,
    lineShape: 44,
    showEndArrow: true
  }
  organizationData.value.lines.push(newLine)

  refreshGraph()
  ElMessage.success('子节点添加成功')
}

// 刷新图表数据
const refreshGraph = () => {
  graphRef.value.setJsonData({
    rootId: organizationData.value.nodes[0]?.id,
    nodes: JSON.parse(JSON.stringify(organizationData.value.nodes)),
    lines: JSON.parse(JSON.stringify(organizationData.value.lines))
  })
}

// 确认删除节点
const confirmDeleteNode = () => {
  if (!selectedNode.value) return

  // 获取要删除的节点ID列表（包括当前节点及其所有子节点）
  const nodesToDelete = getNodeAndChildrenIds(selectedNode.value.id)

  // 删除节点
  organizationData.value.nodes = organizationData.value.nodes.filter(
    (node) => !nodesToDelete.includes(node.id)
  )

  // 删除相关的连线
  organizationData.value.lines = organizationData.value.lines.filter(
    (line) => !nodesToDelete.includes(line.from) && !nodesToDelete.includes(line.to)
  )

  refreshGraph()
  deleteConfirmVisible.value = false
  closeNodeDialog()
  ElMessage.success('节点删除成功')
}

// 获取节点及其所有子节点的ID列表
const getNodeAndChildrenIds = (nodeId) => {
  const ids = [nodeId]

  // 递归查找所有子节点
  const findChildren = (parentId) => {
    organizationData.value.lines.forEach((line) => {
      if (line.from === parentId) {
        ids.push(line.to)
        findChildren(line.to) // 递归查找子节点的子节点
      }
    })
  }

  findChildren(nodeId)
  return ids
}

// 加载组织架构数据
const loadOrganizationData = async () => {
  try {
    const result = await window.electron.readOrganization(bookName, organizationId)

    if (result.success && result.data) {
      organizationData.value = result.data
      organizationName.value = result.data.name || organizationId
    } else {
      console.error('组织架构数据加载失败:', result)
      ElMessage.error('加载组织架构数据失败')
    }
  } catch (error) {
    console.error('加载组织架构数据失败:', error)
    ElMessage.error('加载组织架构数据失败')
  }
}

// 保存组织架构数据
const handleSave = async () => {
  try {
    saving.value = true

    // 更新修改时间
    organizationData.value.updatedAt = new Date().toISOString()

    // 保存组织架构数据 - 使用深拷贝确保数据可序列化
    await window.electron.writeOrganization(
      bookName,
      organizationId,
      JSON.parse(JSON.stringify(organizationData.value))
    )

    // 生成并保存缩略图
    if (organizationData.value.nodes.length > 0) {
      // 获取图表实例, 获取图片base64
      const imageBase64 = await graphRef.value.getInstance().getImageBase64()
      await window.electron.updateOrganizationThumbnail({
        bookName,
        organizationId,
        thumbnailData: imageBase64
      })
    }

    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  // 加载数据
  await loadOrganizationData()

  // 等待下一个 tick 确保 DOM 更新
  await nextTick()

  // 设置图形数据 - 使用深拷贝避免污染原始数据
  if (graphRef.value && organizationData.value.nodes && organizationData.value.nodes.length > 0) {
    graphRef.value.setJsonData({
      rootId: organizationData.value.nodes[0].id,
      nodes: JSON.parse(JSON.stringify(organizationData.value.nodes)),
      lines: JSON.parse(JSON.stringify(organizationData.value.lines))
    })
  } else {
    console.warn('图形数据为空或图形组件未准备好:', {
      graphRef: !!graphRef.value,
      nodesLength: organizationData.value.nodes?.length || 0
    })

    // 如果数据为空，可能是刚创建的组织，等待一下再重试
    if (organizationData.value.nodes?.length === 0) {
      console.log('数据为空，等待 500ms 后重试')
      setTimeout(async () => {
        await loadOrganizationData()
        if (
          graphRef.value &&
          organizationData.value.nodes &&
          organizationData.value.nodes.length > 0
        ) {
          graphRef.value.setJsonData({
            rootId: organizationData.value.nodes[0].id,
            nodes: JSON.parse(JSON.stringify(organizationData.value.nodes)),
            lines: JSON.parse(JSON.stringify(organizationData.value.lines))
          })
        }
      }, 500)
    }
  }
})
</script>

<style scoped>
.organization-design {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.design-canvas {
  flex: 1;
  background: var(--bg-primary);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.dialog-footer-left {
  display: flex;
  gap: 12px;
}

.dialog-footer-right {
  display: flex;
  gap: 12px;
}

/* 删除确认弹框样式 */
.delete-confirm-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 0;
}

.delete-confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.warning-icon {
  font-size: 24px;
  color: #f56c6c;
  margin-top: 4px;
}

.warning-text {
  flex: 1;
}

.warning-text p {
  margin: 0 0 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

.warning-detail {
  color: #909399;
  font-size: 13px;
}

/* 颜色选择器样式 */
.color-picker-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-preset-item {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.color-preset-item:hover {
  transform: scale(1.1);
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 自定义节点样式 */
.custom-node {
  width: 100%;
  height: 100%;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #ffffff;
  font-weight: bold;
}

.custom-node:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 节点浮窗样式 */
.node-tooltip {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px 16px;
  min-width: 200px;
  max-width: 300px;
  font-size: 14px;
  line-height: 1.5;
  animation: tooltipFadeIn 0.2s ease-out;
}

.tooltip-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  font-size: 16px;
}

.tooltip-description {
  color: #606266;
  word-wrap: break-word;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
