<template>
  <div class="dictionary-manager">
    <div class="dictionary-header">
      <el-button class="back-btn" :icon="ArrowLeftBold" text @click="handleBack">
        <span>返回</span>
      </el-button>
      <h2 class="header-title">词条字典</h2>
      <el-button type="primary" @click="handleCreateEntry">
        <el-icon><Plus /></el-icon>
        <span>创建词条</span>
      </el-button>
    </div>

    <div class="dictionary-main">
      <el-table
        :data="tableData"
        row-key="id"
        border
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        style="width: 100%"
      >
        <el-table-column prop="name" label="名称" min-width="100">
          <template #default="{ row }">
            <span class="entry-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="introduction" label="介绍" min-width="250">
          <template #default="{ row }">
            <div class="entry-intro">{{ row.introduction }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEditEntry(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDeleteEntry(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>

  <!-- 创建/编辑词条弹框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑词条' : '创建词条'"
    width="600px"
    @close="resetForm"
  >
    <el-form ref="formRef" :model="entryForm" :rules="formRules" label-width="80px">
      <el-form-item label="名称" prop="name">
        <el-input v-model="entryForm.name" placeholder="请输入词条名称" clearable />
      </el-form-item>
      <el-form-item label="父级" prop="parentId">
        <el-tree-select
          v-model="entryForm.parentId"
          :data="treeSelectData"
          placeholder="请选择父级词条"
          clearable
          style="width: 100%"
          :props="{
            children: 'children',
            label: 'name',
            value: 'id'
          }"
          node-key="id"
          check-strictly
          :render-after-expand="false"
        />
      </el-form-item>
      <el-form-item label="介绍" prop="introduction">
        <el-input
          v-model="entryForm.introduction"
          placeholder="请输入词条介绍"
          type="textarea"
          :rows="6"
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmSave">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, watch, toRaw, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeftBold, Plus } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const dialogVisible = ref(false)
const isEdit = ref(false)
const dictionary = ref([])
const bookName = route.query.name || ''
const formRef = ref(null)

// 表单数据
const entryForm = reactive({
  id: '',
  name: '',
  parentId: 0,
  introduction: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入词条名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  introduction: [
    { required: true, message: '请输入词条介绍', trigger: 'blur' },
    { min: 1, max: 1000, message: '介绍长度在 1 到 1000 个字符', trigger: 'blur' }
  ]
}

// 生成唯一ID
function genId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

// 返回上一页
function handleBack() {
  router.back()
}

// 加载词条数据
async function loadDictionary() {
  try {
    const data = await window.electron.readDictionary(bookName)
    dictionary.value = data || []
  } catch (error) {
    console.error('加载词条数据失败:', error)
    dictionary.value = []
  }
}

// 保存词条数据
async function saveDictionary() {
  try {
    const rawDictionary = JSON.parse(JSON.stringify(toRaw(dictionary.value)))
    const result = await window.electron.writeDictionary(bookName, rawDictionary)
    if (!result.success) {
      throw new Error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存词条数据失败:', error)
    ElMessage.error('保存词条数据失败')
  }
}

// 将树结构转换为扁平数组（用于查找和操作）
function treeToArray(treeData) {
  const result = []

  function traverse(nodes, parentId = 0) {
    nodes.forEach((node) => {
      const { children, ...item } = node
      result.push({ ...item, parentId })
      if (children && children.length > 0) {
        traverse(children, item.id)
      }
    })
  }

  traverse(treeData)
  return result
}

// 计算表格数据（直接使用树结构）
const tableData = computed(() => {
  return dictionary.value.map((item) => ({
    ...item,
    parentName: getParentName(item.id)
  }))
})

// 获取父级名称
function getParentName(itemId) {
  const flatData = treeToArray(dictionary.value)
  const item = flatData.find((item) => item.id === itemId)
  if (!item || item.parentId === 0) return ''

  const parent = flatData.find((parent) => parent.id === item.parentId)
  return parent ? parent.name : ''
}

// 父级选项（排除当前编辑的项及其子项）
const treeSelectData = computed(() => {
  if (isEdit.value) {
    // 编辑模式：排除当前项及其所有子项
    const excludeIds = getDescendantIds(entryForm.id)
    const flatData = treeToArray(dictionary.value)
    const filteredData = flatData.filter((item) => !excludeIds.includes(item.id))
    return buildTreeSelectData(filteredData)
  }
  return buildTreeSelectData(treeToArray(dictionary.value))
})

// 构建树形选择数据
function buildTreeSelectData(data) {
  const map = {}
  const result = []

  // 创建映射
  data.forEach((item) => {
    map[item.id] = { ...item, children: [] }
  })

  // 构建树形结构
  data.forEach((item) => {
    const node = map[item.id]
    if (item.parentId === 0) {
      result.push(node)
    } else {
      const parent = map[item.parentId]
      if (parent) {
        parent.children.push(node)
      }
    }
  })

  // 添加"无父级"选项
  return [
    {
      id: 0,
      name: '无父级',
      parentId: 0,
      introduction: '',
      children: []
    },
    ...result
  ]
}

// 获取所有后代ID
function getDescendantIds(id) {
  const descendants = [id]
  const flatData = treeToArray(dictionary.value)
  const children = flatData.filter((item) => item.parentId === id)

  children.forEach((child) => {
    descendants.push(...getDescendantIds(child.id))
  })

  return descendants
}

// 在树结构中查找并删除指定ID的节点
function removeNodeFromTree(treeData, targetId) {
  for (let i = 0; i < treeData.length; i++) {
    if (treeData[i].id === targetId) {
      treeData.splice(i, 1)
      return true
    }
    if (treeData[i].children && treeData[i].children.length > 0) {
      if (removeNodeFromTree(treeData[i].children, targetId)) {
        return true
      }
    }
  }
  return false
}

// 在树结构中查找并更新指定ID的节点
function updateNodeInTree(treeData, targetId, newData) {
  for (let i = 0; i < treeData.length; i++) {
    if (treeData[i].id === targetId) {
      treeData[i] = { ...treeData[i], ...newData }
      return true
    }
    if (treeData[i].children && treeData[i].children.length > 0) {
      if (updateNodeInTree(treeData[i].children, targetId, newData)) {
        return true
      }
    }
  }
  return false
}

// 在树结构中添加新节点
function addNodeToTree(treeData, newNode) {
  if (newNode.parentId === 0 || !newNode.parentId) {
    treeData.push(newNode)
  } else {
    // 找到父节点并添加到其children中
    function addToParent(nodes, parentId) {
      for (let node of nodes) {
        if (node.id === parentId) {
          if (!node.children) node.children = []
          node.children.push(newNode)
          return true
        }
        if (node.children && node.children.length > 0) {
          if (addToParent(node.children, parentId)) {
            return true
          }
        }
      }
      return false
    }
    addToParent(treeData, newNode.parentId)
  }
}

// 创建词条
function handleCreateEntry() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑词条
function handleEditEntry(entry) {
  isEdit.value = true
  Object.assign(entryForm, entry)
  dialogVisible.value = true
}

// 删除词条
async function handleDeleteEntry(entry) {
  try {
    await ElMessageBox.confirm(`确定要删除词条"${entry.name}"吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    removeNodeFromTree(dictionary.value, entry.id)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消，无需处理
  }
}

// 确认保存
async function confirmSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    if (isEdit.value) {
      // 编辑模式：更新现有关键词
      const oldParentId = getCurrentParentId(entryForm.id)
      const newParentId = entryForm.parentId

      // 如果父级发生了变化，需要重新组织树结构
      if (oldParentId !== newParentId) {
        // 先删除原节点（保留子节点）
        const nodeToMove = removeNodeFromTreeKeepChildren(dictionary.value, entryForm.id)
        if (nodeToMove) {
          // 更新节点信息
          nodeToMove.name = entryForm.name
          nodeToMove.introduction = entryForm.introduction
          nodeToMove.parentId = newParentId

          // 添加到新位置
          addNodeToTree(dictionary.value, nodeToMove)
        }
      } else {
        // 父级没有变化，只更新属性
        updateNodeInTree(dictionary.value, entryForm.id, {
          name: entryForm.name,
          introduction: entryForm.introduction
        })
      }
    } else {
      // 创建模式：添加新词条
      const newNode = {
        id: genId(),
        name: entryForm.name,
        introduction: entryForm.introduction,
        parentId: entryForm.parentId,
        children: []
      }
      addNodeToTree(dictionary.value, newNode)
    }

    dialogVisible.value = false
    ElMessage.success(isEdit.value ? '编辑成功' : '创建成功')
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 获取当前节点的父级ID
function getCurrentParentId(nodeId) {
  const flatData = treeToArray(dictionary.value)
  const item = flatData.find((item) => item.id === nodeId)
  return item ? item.parentId : 0
}

// 从树结构中删除节点但保留其子节点
function removeNodeFromTreeKeepChildren(treeData, targetId) {
  for (let i = 0; i < treeData.length; i++) {
    if (treeData[i].id === targetId) {
      const nodeToRemove = treeData[i]
      const children = nodeToRemove.children || []

      // 将子节点提升到当前层级
      treeData.splice(i, 1, ...children)
      return nodeToRemove
    }
    if (treeData[i].children && treeData[i].children.length > 0) {
      const result = removeNodeFromTreeKeepChildren(treeData[i].children, targetId)
      if (result) return result
    }
  }
  return null
}

// 重置表单
function resetForm() {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(entryForm, {
    id: '',
    name: '',
    parentId: 0,
    introduction: ''
  })
}

// 监听数据变化，自动保存
watch(dictionary, saveDictionary, { deep: true })

// 组件挂载时加载数据
onMounted(() => {
  loadDictionary()
})
</script>

<style lang="scss" scoped>
.dictionary-manager {
  padding: 8px 16px;
  background-color: var(--bg-primary);
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.dictionary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .header-title {
    margin: 0;
    font-size: 20px;
    color: var(--text-primary);
  }
}

.dictionary-main {
  flex: 1;
  overflow-y: auto;
}

.entry-name {
  font-weight: 600;
  color: var(--text-primary);
}

.parent-name {
  color: var(--text-secondary);
  font-size: 14px;
}

.no-parent {
  color: var(--text-muted);
  font-style: italic;
  font-size: 14px;
}

.entry-intro {
  color: var(--text-primary);
  line-height: 1.5;
  max-height: 100px;
  overflow-y: auto;
  word-break: break-word;
}

// 表格样式优化
:deep(.el-table) {
  background-color: var(--bg-base);

  .el-table__header {
    background-color: var(--bg-mute);
  }

  .el-table__row {
    &:hover {
      background-color: var(--bg-soft);
    }
  }

  .el-table__expand-icon {
    color: var(--text-secondary);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .dictionary-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;

    .back-btn {
      align-self: flex-start;
    }
  }

  .dictionary-main {
    .el-table {
      font-size: 12px;
    }
  }
}
</style>
