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
        <div class="design-toolbar">
          <el-button-group>
            <el-button @click="addNode" :icon="Plus" size="small">添加节点</el-button>
            <el-button @click="addEdge" :icon="Connection" size="small">添加连线</el-button>
            <el-button @click="clearCanvas" :icon="Delete" size="small">清空画布</el-button>
          </el-button-group>
        </div>

        <div class="design-canvas" ref="canvasRef">
          <RelationGraph
            ref="graphRef"
            :options="graphOptions"
            :data="graphData"
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @canvas-click="onCanvasClick"
          />
        </div>
      </div>
    </template>
  </LayoutTool>

  <!-- 添加节点弹框 -->
  <el-dialog v-model="nodeDialogVisible" title="添加节点" width="500px">
    <el-form ref="nodeFormRef" :model="nodeForm" :rules="nodeRules" label-width="80px">
      <el-form-item label="节点类型" prop="nodeType">
        <el-radio-group v-model="nodeForm.nodeType">
          <el-radio label="character">人物</el-radio>
          <el-radio label="custom">自定义</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 人物选择 -->
      <el-form-item v-if="nodeForm.nodeType === 'character'" label="选择人物" prop="characterId">
        <el-select v-model="nodeForm.characterId" placeholder="请选择人物" style="width: 100%">
          <el-option
            v-for="character in characters"
            :key="character.id"
            :label="character.name"
            :value="character.id"
          >
            <span>{{ character.name }}</span>
            <span style="float: right; color: #8492a6; font-size: 13px">
              {{ character.age }}岁 {{ character.gender }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 自定义节点 -->
      <template v-if="nodeForm.nodeType === 'custom'">
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="nodeForm.name" placeholder="请输入节点名称" />
        </el-form-item>
        <el-form-item label="节点类型" prop="type">
          <el-select v-model="nodeForm.type" placeholder="请选择节点类型" style="width: 100%">
            <el-option label="人物" value="character" />
            <el-option label="地点" value="location" />
            <el-option label="事件" value="event" />
            <el-option label="物品" value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="nodeForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入节点描述"
          />
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <el-button @click="nodeDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAddNode">确认</el-button>
    </template>
  </el-dialog>

  <!-- 添加连线弹框 -->
  <el-dialog v-model="edgeDialogVisible" title="添加连线" width="500px">
    <el-form ref="edgeFormRef" :model="edgeForm" :rules="edgeRules" label-width="80px">
      <el-form-item label="起始节点" prop="source">
        <el-select v-model="edgeForm.source" placeholder="请选择起始节点" style="width: 100%">
          <el-option
            v-for="node in graphData.nodes"
            :key="node.id"
            :label="node.text"
            :value="node.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目标节点" prop="target">
        <el-select v-model="edgeForm.target" placeholder="请选择目标节点" style="width: 100%">
          <el-option
            v-for="node in graphData.nodes"
            :key="node.id"
            :label="node.text"
            :value="node.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="关系类型" prop="type">
        <el-input v-model="edgeForm.type" placeholder="请输入关系类型" />
      </el-form-item>
      <el-form-item label="关系描述" prop="description">
        <el-input
          v-model="edgeForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入关系描述"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="edgeDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAddEdge">确认</el-button>
    </template>
  </el-dialog>

  <!-- 节点详情弹框 -->
  <el-dialog v-model="nodeDetailVisible" title="节点详情" width="400px">
    <div v-if="selectedNode" class="node-detail">
      <h3>{{ selectedNode.text }}</h3>
      <p v-if="selectedNode.description" class="node-description">
        {{ selectedNode.description }}
      </p>
      <div class="node-info">
        <p><strong>类型:</strong> {{ getNodeTypeName(selectedNode.type) }}</p>
        <p v-if="selectedNode.characterId">
          <strong>人物ID:</strong> {{ selectedNode.characterId }}
        </p>
      </div>
    </div>
    <template #footer>
      <el-button @click="nodeDetailVisible = false">关闭</el-button>
      <el-button type="danger" @click="deleteSelectedNode">删除节点</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Check, Plus, Connection, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import RelationGraph from 'relation-graph-vue3'

const route = useRoute()
const bookName = route.query.name
const relationshipName = route.query.id

const saving = ref(false)
const nodeDialogVisible = ref(false)
const edgeDialogVisible = ref(false)
const nodeDetailVisible = ref(false)
const nodeFormRef = ref(null)
const edgeFormRef = ref(null)
const graphRef = ref(null)
const selectedNode = ref(null)

// 人物数据
const characters = ref([])

// 关系图数据
const relationshipData = reactive({
  id: '',
  name: relationshipName,
  description: '',
  nodes: [],
  edges: [],
  createdAt: '',
  updatedAt: ''
})

// 图表配置
const graphOptions = {
  defaultExpandHolderPosition: 'right'
}

// 图表数据
const graphData = computed(() => ({
  nodes: Array.isArray(relationshipData.nodes)
    ? relationshipData.nodes
        .filter(node => node && node.id != null && node.name != null)
        .map(node => ({
          id: String(node.id),
          text: String(node.name),
          type: node.type || '',
          description: node.description || '',
          characterId: node.characterId ? String(node.characterId) : '',
          color: getNodeColor(node.type),
          width: 80,
          height: 40
        }))
    : [],
  edges: Array.isArray(relationshipData.edges)
    ? relationshipData.edges
        .filter(edge => edge && edge.source != null && edge.target != null)
        .map(edge => ({
          id: String(edge.id),
          from: String(edge.source),
          to: String(edge.target),
          text: edge.type ? String(edge.type) : '',
          description: edge.description || '',
          color: '#909399',
          width: 2
        }))
    : []
}))

// 节点表单
const nodeForm = reactive({
  nodeType: 'character',
  characterId: '',
  name: '',
  type: 'character',
  description: ''
})

// 连线表单
const edgeForm = reactive({
  source: '',
  target: '',
  type: '',
  description: ''
})

// 表单验证规则
const nodeRules = {
  characterId: [{ required: true, message: '请选择人物', trigger: 'change' }],
  name: [
    { required: true, message: '请输入节点名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择节点类型', trigger: 'change' }]
}

const edgeRules = {
  source: [{ required: true, message: '请选择起始节点', trigger: 'change' }],
  target: [{ required: true, message: '请选择目标节点', trigger: 'change' }],
  type: [{ required: true, message: '请输入关系类型', trigger: 'blur' }]
}

// 生成唯一ID
function genId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

// 获取节点颜色
function getNodeColor(type) {
  const colors = {
    character: '#409eff',
    location: '#67c23a',
    event: '#e6a23c',
    item: '#f56c6c'
  }
  return colors[type] || '#909399'
}

// 获取节点类型名称
function getNodeTypeName(type) {
  const names = {
    character: '人物',
    location: '地点',
    event: '事件',
    item: '物品'
  }
  return names[type] || '未知'
}

// 加载人物数据
const loadCharacters = async () => {
  try {
    const data = await window.electron.readCharacters(bookName)
    characters.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('加载人物数据失败:', error)
    characters.value = []
  }
}

// 加载关系图数据
const loadRelationshipData = async () => {
  try {
    const data = await window.electron.readRelationshipData(bookName, relationshipName)
    if (data) {
      Object.assign(relationshipData, {
        ...data,
        nodes: Array.isArray(data.nodes) ? data.nodes : [],
        edges: Array.isArray(data.edges) ? data.edges : []
      })
    } else {
      // 保证nodes/edges为数组
      relationshipData.nodes = []
      relationshipData.edges = []
    }
  } catch (error) {
    console.error('加载关系图数据失败:', error)
    ElMessage.error('加载关系图数据失败')
    // 保证nodes/edges为数组
    relationshipData.nodes = []
    relationshipData.edges = []
  }
}

// 保存关系图
const handleSave = async () => {
  try {
    saving.value = true

    // 更新修改时间
    relationshipData.updatedAt = new Date().toISOString()

    // 保存关系图数据
    await window.electron.saveRelationshipData(bookName, relationshipName, relationshipData)

    // 生成并保存缩略图
    if (relationshipData.nodes.length > 0) {
      const thumbnailData = createRelationshipThumbnail(relationshipData)
      await window.electron.updateRelationshipThumbnail({
        bookName,
        relationshipName,
        thumbnailData
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

// 生成关系图缩略图
function createRelationshipThumbnail(relationshipData) {
  const canvas = document.createElement('canvas')
  canvas.width = 280
  canvas.height = 210
  const ctx = canvas.getContext('2d')

  // 设置背景色
  ctx.fillStyle = '#f5f7fa'
  ctx.fillRect(0, 0, 280, 210)

  // 绘制边框
  ctx.strokeStyle = '#e4e7ed'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, 280, 210)

  // 如果没有节点数据，显示默认提示
  if (!relationshipData.nodes || relationshipData.nodes.length === 0) {
    ctx.fillStyle = '#909399'
    ctx.font = '14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('关系图', 140, 105)
    return canvas.toDataURL('image/png')
  }

  // 计算节点位置
  const nodes = relationshipData.nodes
  const edges = relationshipData.edges || []
  const nodeRadius = 15
  const centerX = 140
  const centerY = 105
  const radius = 60

  // 绘制连线
  ctx.strokeStyle = '#c0c4cc'
  ctx.lineWidth = 1
  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source)
    const targetNode = nodes.find((n) => n.id === edge.target)
    if (sourceNode && targetNode) {
      const sourceIndex = nodes.indexOf(sourceNode)
      const targetIndex = nodes.indexOf(targetNode)
      const sourceAngle = (sourceIndex / nodes.length) * 2 * Math.PI
      const targetAngle = (targetIndex / nodes.length) * 2 * Math.PI

      const x1 = centerX + Math.cos(sourceAngle) * radius
      const y1 = centerY + Math.sin(sourceAngle) * radius
      const x2 = centerX + Math.cos(targetAngle) * radius
      const y2 = centerY + Math.sin(targetAngle) * radius

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  })

  // 绘制节点
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    // 节点颜色
    const colors = {
      character: '#409eff',
      location: '#67c23a',
      event: '#e6a23c',
      item: '#f56c6c'
    }
    const nodeColor = colors[node.type] || '#909399'

    // 绘制节点圆圈
    ctx.fillStyle = nodeColor
    ctx.beginPath()
    ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI)
    ctx.fill()

    // 绘制节点文字
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const displayText = node.name.length > 4 ? node.name.substring(0, 4) + '...' : node.name
    ctx.fillText(displayText, x, y)
  })

  // 绘制标题
  ctx.fillStyle = '#303133'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(relationshipData.name || '关系图', 140, 20)

  return canvas.toDataURL('image/png')
}

// 添加节点
const addNode = () => {
  nodeDialogVisible.value = true
  // 重置表单
  Object.assign(nodeForm, {
    nodeType: 'character',
    characterId: '',
    name: '',
    type: 'character',
    description: ''
  })
}

// 确认添加节点
const confirmAddNode = async () => {
  if (!nodeFormRef.value) return

  try {
    await nodeFormRef.value.validate()

    let newNode = {
      id: genId(),
      type: 'character',
      description: ''
    }

    if (nodeForm.nodeType === 'character') {
      // 从人物谱中选择
      const character = characters.value.find((c) => c.id === nodeForm.characterId)
      if (character) {
        newNode = {
          ...newNode,
          name: character.name,
          type: 'character',
          description: character.introduction,
          characterId: character.id
        }
      }
    } else {
      // 自定义节点
      newNode = {
        ...newNode,
        name: nodeForm.name,
        type: nodeForm.type,
        description: nodeForm.description
      }
    }

    relationshipData.nodes.push(newNode)
    nodeDialogVisible.value = false
    ElMessage.success('添加节点成功')
  } catch (error) {
    console.error('添加节点失败:', error)
  }
}

// 添加连线
const addEdge = () => {
  if (relationshipData.nodes.length < 2) {
    ElMessage.warning('至少需要两个节点才能添加连线')
    return
  }

  edgeDialogVisible.value = true
  // 重置表单
  Object.assign(edgeForm, {
    source: '',
    target: '',
    type: '',
    description: ''
  })
}

// 确认添加连线
const confirmAddEdge = async () => {
  if (!edgeFormRef.value) return

  try {
    await edgeFormRef.value.validate()

    if (edgeForm.source === edgeForm.target) {
      ElMessage.warning('起始节点和目标节点不能相同')
      return
    }

    // 检查是否已存在相同的连线
    const existingEdge = relationshipData.edges.find(
      (edge) => edge.source === edgeForm.source && edge.target === edgeForm.target
    )

    if (existingEdge) {
      ElMessage.warning('该连线已存在')
      return
    }

    const newEdge = {
      id: genId(),
      source: edgeForm.source,
      target: edgeForm.target,
      type: edgeForm.type,
      description: edgeForm.description
    }

    relationshipData.edges.push(newEdge)
    edgeDialogVisible.value = false
    ElMessage.success('添加连线成功')
  } catch (error) {
    console.error('添加连线失败:', error)
  }
}

// 清空画布
const clearCanvas = async () => {
  try {
    await ElMessageBox.confirm('确定要清空画布吗？此操作不可恢复！', '确认清空', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })

    relationshipData.nodes = []
    relationshipData.edges = []
    ElMessage.success('画布已清空')
  } catch {
    // 用户取消，无需处理
  }
}

// 节点点击事件
const onNodeClick = (node) => {
  selectedNode.value = node
  nodeDetailVisible.value = true
}

// 连线点击事件
const onEdgeClick = (edge) => {
  ElMessage.info(`关系: ${edge.text}`)
}

// 画布点击事件
const onCanvasClick = () => {
  // 可以在这里添加画布点击逻辑
}

// 删除选中节点
const deleteSelectedNode = async () => {
  if (!selectedNode.value) return

  try {
    await ElMessageBox.confirm(
      `确定要删除节点"${selectedNode.value.text}"吗？相关的连线也会被删除！`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 删除节点
    const nodeIndex = relationshipData.nodes.findIndex((n) => n.id === selectedNode.value.id)
    if (nodeIndex > -1) {
      relationshipData.nodes.splice(nodeIndex, 1)
    }

    // 删除相关连线
    relationshipData.edges = relationshipData.edges.filter(
      (edge) => edge.source !== selectedNode.value.id && edge.target !== selectedNode.value.id
    )

    nodeDetailVisible.value = false
    selectedNode.value = null
    ElMessage.success('删除节点成功')
  } catch {
    // 用户取消，无需处理
  }
}

onMounted(() => {
  loadRelationshipData()
  loadCharacters()
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
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.design-canvas {
  flex: 1;
  background-color: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  position: relative;

  :deep(.relation-graph) {
    width: 100%;
    height: 100%;
  }

  :deep(.relation-graph-canvas) {
    background-color: var(--bg-base);
  }
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

// 响应式设计
@media (max-width: 768px) {
  .design-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}
</style>
