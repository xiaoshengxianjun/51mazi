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
            <div class="tooltip-description">{{ hoveredNode?.description || '暂无描述' }}</div>
          </div>
        </div>
      </div>
    </template>
  </LayoutTool>

  <!-- 节点信息编辑弹框 -->
  <el-dialog
    v-model="infoDialogVisible"
    :title="isAddMode ? '新增节点' : '编辑节点信息'"
    width="500px"
  >
    <el-form label-width="80px">
      <el-form-item label="节点名称">
        <el-input v-model="infoForm.text" placeholder="请输入节点名称" />
      </el-form-item>
      <el-form-item label="节点描述">
        <el-input
          v-model="infoForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入节点描述"
        />
      </el-form-item>
      <el-form-item label="节点颜色">
        <div class="color-picker-container">
          <el-color-picker v-model="infoForm.color" />
          <div class="color-presets">
            <div
              v-for="color in colorPresets"
              :key="color"
              class="color-preset-item"
              :style="{ backgroundColor: color }"
              @click="infoForm.color = color"
            ></div>
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="infoDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNodeInfo">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import RelationGraph from 'relation-graph-vue3'
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Check } from '@element-plus/icons-vue'
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
      levelDistance: [150, 120, 100], // 各级别垂直间距
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
  defaultNodeFontColor: '#333',
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
const infoDialogVisible = ref(false)
const isAddMode = ref(false)

// 表单数据
const infoForm = ref({
  text: '',
  description: '',
  color: '#409eff'
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
    infoForm.value = {
      text: selectedNode.value.text || '',
      description: selectedNode.value.description || '',
      color: selectedNode.value.color || '#409eff'
    }
    isAddMode.value = false
  }
  infoDialogVisible.value = true
}

// 保存节点信息
const saveNodeInfo = () => {
  if (isAddMode.value) {
    // 添加新节点
    const newNode = {
      id: genId(),
      text: infoForm.value.text,
      description: infoForm.value.description,
      color: infoForm.value.color,
      type: 'normal',
      data: {
        fontSize: 14
      }
    }

    // 添加到本地数据
    organizationData.value.nodes.push(newNode)

    // 如果选择了父节点，创建连接线
    if (selectedNode.value) {
      const newLine = {
        id: genId(),
        from: selectedNode.value.id,
        to: newNode.id,
        text: '',
        color: '#409eff',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true // 显示箭头
      }
      organizationData.value.lines.push(newLine)
    }

    // 重新设置图表数据 - 使用深拷贝避免污染原始数据
    graphRef.value.setJsonData({
      rootId: organizationData.value.nodes[0]?.id,
      nodes: JSON.parse(JSON.stringify(organizationData.value.nodes)),
      lines: JSON.parse(JSON.stringify(organizationData.value.lines))
    })

    ElMessage.success('节点添加成功')
  } else {
    // 更新现有节点
    if (selectedNode.value) {
      const newColor = infoForm.value.color

      selectedNode.value.text = infoForm.value.text
      selectedNode.value.description = infoForm.value.description
      selectedNode.value.color = newColor
      selectedNode.value.data = {
        ...selectedNode.value.data,
        fontSize: 14
      }

      // 同步更新与该节点相连的连线颜色
      organizationData.value.lines.forEach((line) => {
        if (line.from === selectedNode.value.id) {
          line.color = newColor
        }
      })

      // 同步到本地数据 - 只更新必要的属性，避免循环引用
      const nodeIndex = organizationData.value.nodes.findIndex(
        (n) => n.id === selectedNode.value.id
      )
      if (nodeIndex !== -1) {
        organizationData.value.nodes[nodeIndex] = {
          id: selectedNode.value.id,
          text: selectedNode.value.text,
          description: selectedNode.value.description,
          color: selectedNode.value.color,
          type: selectedNode.value.type,
          data: selectedNode.value.data
        }
      }

      // 重新设置图表数据以确保连线颜色更新 - 使用深拷贝避免污染原始数据
      graphRef.value.setJsonData({
        rootId: organizationData.value.nodes[0]?.id,
        nodes: JSON.parse(JSON.stringify(organizationData.value.nodes)),
        lines: JSON.parse(JSON.stringify(organizationData.value.lines))
      })

      ElMessage.success('节点更新成功')
    }
  }
  infoDialogVisible.value = false
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
  justify-content: flex-end;
  gap: 12px;
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
