<template>
  <LayoutTool title="关系图编辑">
    <template #headrAction>
      <el-button @click="handleSave" type="primary" :loading="saving">
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
          <div class="toolbar-info">
            <span>关系图: {{ relationshipName }}</span>
          </div>
        </div>

        <div class="design-canvas" ref="canvasRef">
          <!-- 这里将集成关系图编辑组件 -->
          <div class="canvas-placeholder">
            <el-empty description="关系图编辑功能开发中..." :image-size="200">
              <template #description>
                <p>关系图编辑功能正在开发中</p>
                <p>当前关系图: {{ relationshipName }}</p>
              </template>
            </el-empty>
          </div>
        </div>
      </div>
    </template>
  </LayoutTool>

  <!-- 添加节点弹框 -->
  <el-dialog v-model="nodeDialogVisible" title="添加节点" width="400px">
    <el-form ref="nodeFormRef" :model="nodeForm" :rules="nodeRules" label-width="80px">
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
    </el-form>
    <template #footer>
      <el-button @click="nodeDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAddNode">确认</el-button>
    </template>
  </el-dialog>

  <!-- 添加连线弹框 -->
  <el-dialog v-model="edgeDialogVisible" title="添加连线" width="400px">
    <el-form ref="edgeFormRef" :model="edgeForm" :rules="edgeRules" label-width="80px">
      <el-form-item label="起始节点" prop="source">
        <el-select v-model="edgeForm.source" placeholder="请选择起始节点" style="width: 100%">
          <el-option
            v-for="node in relationshipData.nodes"
            :key="node.id"
            :label="node.name"
            :value="node.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目标节点" prop="target">
        <el-select v-model="edgeForm.target" placeholder="请选择目标节点" style="width: 100%">
          <el-option
            v-for="node in relationshipData.nodes"
            :key="node.id"
            :label="node.name"
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
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Check, Plus, Connection, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const bookName = route.query.name
const relationshipName = route.query.id

const saving = ref(false)
const nodeDialogVisible = ref(false)
const edgeDialogVisible = ref(false)
const nodeFormRef = ref(null)
const edgeFormRef = ref(null)
const canvasRef = ref(null)

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

// 节点表单
const nodeForm = reactive({
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

// 加载关系图数据
const loadRelationshipData = async () => {
  try {
    const data = await window.electron.readRelationshipData(bookName, relationshipName)
    if (data) {
      Object.assign(relationshipData, data)
    }
  } catch (error) {
    console.error('加载关系图数据失败:', error)
    ElMessage.error('加载关系图数据失败')
  }
}

// 保存关系图
const handleSave = async () => {
  try {
    saving.value = true

    // 更新修改时间
    relationshipData.updatedAt = new Date().toISOString()

    await window.electron.saveRelationshipData(bookName, relationshipName, relationshipData)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存关系图失败:', error)
    ElMessage.error('保存关系图失败')
  } finally {
    saving.value = false
  }
}

// 添加节点
const addNode = () => {
  nodeDialogVisible.value = true
  // 重置表单
  Object.assign(nodeForm, {
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

    const newNode = {
      id: genId(),
      name: nodeForm.name,
      type: nodeForm.type,
      description: nodeForm.description,
      x: Math.random() * 400 + 100, // 随机位置
      y: Math.random() * 300 + 100
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

onMounted(() => {
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
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;

  .toolbar-info {
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.design-canvas {
  flex: 1;
  background-color: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  position: relative;

  .canvas-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
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
