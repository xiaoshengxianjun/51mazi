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
            @node-click="onNodeClick"
            @edge-click="onEdgeClick"
            @canvas-click="onCanvasClick"
          />
          <!-- 环绕菜单挂载点 -->
          <div v-if="showRadialMenu" :style="radialMenuStyle" class="radial-menu-wrapper">
            <RadialMenu
              :is-root="radialMenuNodeIsRoot"
              @info="handleNodeInfo"
              @add="handleNodeAdd"
              @link="handleNodeLink"
              @delete="handleNodeDelete"
            />
          </div>
        </div>
      </div>
    </template>
  </LayoutTool>
  <el-dialog v-model="infoDialogVisible" title="编辑节点信息" width="400px">
    <el-form label-width="80px">
      <el-form-item label="节点文本">
        <el-select
          v-model="infoForm.characterId"
          placeholder="选择人物"
          style="width: 100%"
          @change="onCharacterChange"
        >
          <el-option
            v-for="character in characters"
            :key="character.id"
            :label="character.name"
            :value="character.id"
          />
        </el-select>
        <el-input v-model="infoForm.text" placeholder="自定义输入" style="margin-top: 8px" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="infoForm.gender">
          <el-radio value="male">男</el-radio>
          <el-radio value="female">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="背景色">
        <div style="display: flex; gap: 8px; align-items: center">
          <el-radio-group v-model="infoForm.color">
            <el-radio v-for="c in presetColors" :key="c.value" :label="c.value">
              <span
                :style="{
                  background: c.value,
                  display: 'inline-block',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%'
                }"
              ></span>
            </el-radio>
          </el-radio-group>
          <el-color-picker v-model="customColor" @change="onCustomColor" style="margin-left: 8px" />
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
      <el-button @click="infoDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="saveNodeInfo">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import RelationGraph from 'relation-graph-vue3'
import RadialMenu from '@renderer/components/RadialMenu.vue'
import { nextTick } from 'vue'
import { genId } from '@renderer/utils/utils'

const route = useRoute()
const bookName = route.query.name
const relationshipName = route.query.id

const saving = ref(false)
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
  defaultJunctionPoint: 'border'
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
        lines: Array.isArray(data.lines) ? data.lines : []
      })
      graphRef.value.setJsonData(relationshipData)
    } else {
      // 保证nodes/edges为数组
      relationshipData.nodes = []
      relationshipData.lines = []
    }
  } catch (error) {
    console.error('加载关系图数据失败:', error)
    ElMessage.error('加载关系图数据失败')
    // 保证nodes/edges为数组
    relationshipData.nodes = []
    relationshipData.lines = []
  }
}

// 保存关系图
const handleSave = async () => {
  console.log(graphRef.value)

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
const radialMenuStyle = ref({})
const radialMenuNodeIsRoot = ref(false)

// 计算节点在画布上的位置
function getNodePosition(node) {
  // RelationGraph 提供的节点坐标为画布坐标，需转换为容器内绝对定位
  // 这里假设graphRef.value.getInstance().getNodePosition(node.id)可用
  if (!graphRef.value) return { left: 0, top: 0 }
  const inst = graphRef.value.getInstance()
  if (inst && inst.getNodePosition) {
    const pos = inst.getNodePosition(node.id)
    return { left: pos.x, top: pos.y }
  }
  return { left: 0, top: 0 }
}

// 节点点击事件，显示环绕菜单
const onNodeClick = async (node) => {
  selectedNode.value = node
  radialMenuNodeIsRoot.value = node.type === 'root'
  // 计算菜单位置
  await nextTick()
  const nodePos = getNodePosition(node)
  radialMenuStyle.value = {
    position: 'absolute',
    left: `${nodePos.left - 60}px`, // 60为菜单半径
    top: `${nodePos.top - 60}px`,
    zIndex: 10
  }
  showRadialMenu.value = true
}

// 连线点击事件
const onEdgeClick = (edge) => {
  ElMessage.info(`关系: ${edge.text}`)
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
  infoForm.gender = selectedNode.value.gender || ''
  infoForm.color = presetColors.find((c) => c.value === selectedNode.value.color)
    ? selectedNode.value.color
    : ''
  customColor.value = !infoForm.color ? selectedNode.value.color || '' : ''
  infoForm.description = selectedNode.value.description || ''
  infoForm.characterId = selectedNode.value.characterId || ''
  infoDialogVisible.value = true
  showRadialMenu.value = false
}
function handleNodeAdd() {
  // 新增一个名为“新节点”的节点，并自动连线
  if (!selectedNode.value) return
  const newNodeId = genId()
  const newNode = {
    id: newNodeId,
    text: '新节点',
    type: 'character',
    color: '#409eff',
    description: ''
  }
  // appendJsonData方式添加节点
  if (graphRef.value && graphRef.value.getInstance) {
    graphRef.value.getInstance().appendJsonData({
      nodes: [newNode],
      lines: [
        {
          id: genId(),
          from: selectedNode.value.id,
          to: newNodeId,
          text: ''
        }
      ]
    })
  }
  // 同步到本地数据
  relationshipData.nodes.push(newNode)
  relationshipData.lines.push({
    id: genId(),
    from: selectedNode.value.id,
    to: newNodeId,
    text: ''
  })
  showRadialMenu.value = false
  ElMessage.success('已添加新节点')
}
function handleNodeLink() {
  // 进入连线模式，后续实现
  showRadialMenu.value = false
}
function handleNodeDelete() {
  if (!selectedNode.value) return
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

  // 删除节点
  relationshipData.nodes = relationshipData.nodes.filter((n) => !toDeleteIds.has(n.id))
  // 删除相关连线
  relationshipData.lines = relationshipData.lines.filter(
    (l) => !toDeleteIds.has(l.from) && !toDeleteIds.has(l.to)
  )

  // 更新图表
  if (graphRef.value && graphRef.value.setJsonData) {
    graphRef.value.setJsonData(relationshipData)
  }
  showRadialMenu.value = false
  ElMessage.success('节点及其子节点已删除')
}

// 信息编辑弹窗相关
const infoDialogVisible = ref(false)
const infoForm = reactive({
  text: '',
  gender: '',
  color: '',
  description: '',
  characterId: '' // 选中的人物谱id
})
const presetColors = [
  { label: '蓝色', value: '#409eff' },
  { label: '橙色', value: '#ff5819' },
  { label: '红色', value: '#f56c6c' },
  { label: '绿色', value: '#67c23a' }
]
const customColor = ref('')

// 选择人物谱时自动同步性别、描述、背景色
function onCharacterChange(val) {
  const character = characters.value.find((c) => c.id === val)
  if (character) {
    infoForm.text = character.name
    infoForm.gender = character.gender
    infoForm.description = character.introduction
    infoForm.color = character.gender === 'female' ? '#ff5819' : '#409eff'
    customColor.value = ''
  }
}

// 选择预设色
function onCustomColor(val) {
  infoForm.color = val
}

// 保存节点信息
function saveNodeInfo() {
  if (!selectedNode.value) return
  selectedNode.value.text = infoForm.text
  selectedNode.value.gender = infoForm.gender
  selectedNode.value.color = infoForm.color || customColor.value
  selectedNode.value.description = infoForm.description
  selectedNode.value.characterId = infoForm.characterId
  // 同步到数据源
  const node = relationshipData.nodes.find((n) => n.id === selectedNode.value.id)
  if (node) {
    node.text = selectedNode.value.text
    node.gender = selectedNode.value.gender
    node.color = selectedNode.value.color
    node.description = selectedNode.value.description
    node.characterId = selectedNode.value.characterId
  }
  // 刷新图表
  if (graphRef.value && graphRef.value.setJsonData) {
    graphRef.value.setJsonData(relationshipData)
  }
  infoDialogVisible.value = false
  ElMessage.success('节点信息已更新')
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
  margin-bottom: 10px;
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
