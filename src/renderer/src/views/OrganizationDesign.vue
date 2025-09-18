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
          </RelationGraph>
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
        <el-color-picker v-model="infoForm.color" />
      </el-form-item>
      <el-form-item label="节点级别">
        <el-input-number v-model="infoForm.level" :min="1" :max="10" placeholder="节点级别" />
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
  defaultLineShape: 2, // 使用弧线样式
  lineUseTextPath: true,
  defaultExpandHolderPosition: 'bottom',
  useAnimationWhenRefresh: true,
  placeSingleNode: true,
  useHorizontalView: false, // 禁用水平视图，使用垂直视图
  defaultJunctionPoint: 'tb' // 连接点位置
})

// 节点相关
const selectedNode = ref(null)

// 弹框相关
const infoDialogVisible = ref(false)
const isAddMode = ref(false)

// 表单数据
const infoForm = ref({
  text: '',
  description: '',
  color: '#409eff',
  level: 1
})

// 画布点击事件
const onCanvasClick = () => {
  // 可以在这里添加画布点击逻辑
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
      color: selectedNode.value.color || '#409eff',
      level: selectedNode.value.level || 1
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
      level: infoForm.value.level,
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
        lineShape: 2, // 弧线样式
        showEndArrow: true // 显示箭头
      }
      organizationData.value.lines.push(newLine)
    }

    // 重新设置图表数据
    graphRef.value.setJsonData({
      rootId: organizationData.value.nodes[0]?.id,
      nodes: organizationData.value.nodes,
      lines: organizationData.value.lines
    })

    ElMessage.success('节点添加成功')
  } else {
    // 更新现有节点
    if (selectedNode.value) {
      selectedNode.value.text = infoForm.value.text
      selectedNode.value.description = infoForm.value.description
      selectedNode.value.color = infoForm.value.color
      selectedNode.value.level = infoForm.value.level
      selectedNode.value.data = {
        ...selectedNode.value.data,
        fontSize: 14
      }

      // 同步到本地数据
      const nodeIndex = organizationData.value.nodes.findIndex(
        (n) => n.id === selectedNode.value.id
      )
      if (nodeIndex !== -1) {
        organizationData.value.nodes[nodeIndex] = { ...selectedNode.value }
      }

      graphRef.value.refresh()
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

  // 设置图形数据
  if (graphRef.value && organizationData.value.nodes && organizationData.value.nodes.length > 0) {
    graphRef.value.setJsonData({
      rootId: organizationData.value.nodes[0].id,
      nodes: organizationData.value.nodes,
      lines: organizationData.value.lines
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
            nodes: organizationData.value.nodes,
            lines: organizationData.value.lines
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
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
