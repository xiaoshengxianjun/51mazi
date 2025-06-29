<template>
  <LayoutTool title="人物谱管理">
    <template #headrAction>
      <el-button type="primary" @click="handleCreateCharacter">
        <el-icon><Plus /></el-icon>
        <span>创建人物</span>
      </el-button>
    </template>
    <template #default>
      <div class="character-grid">
        <div
          v-for="character in characters"
          :key="character.id"
          class="character-card"
          :class="{ male: character.gender === '男', female: character.gender === '女' }"
          @click="handleEditCharacter(character)"
        >
          <div class="character-info">
            <div class="character-details">
              <span class="character-name">{{ character.name }}</span>
              <span class="character-age">{{ character.age }}岁</span>
              <!-- <span class="character-gender">{{ character.gender }}</span> -->
              <span class="character-height">{{ character.height }}cm</span>
            </div>
            <!-- 标签显示区域 -->
            <div v-if="character.tags && character.tags.length > 0" class="character-tags">
              <el-tag v-for="tag in character.tags" :key="tag" size="small" class="tag-item">
                {{ tag }}
              </el-tag>
            </div>
            <p class="character-intro">{{ character.introduction }}</p>
          </div>
          <div class="character-actions">
            <el-icon @click.stop="handleDeleteCharacter(character)"><Delete /></el-icon>
          </div>
        </div>
      </div>
      <el-empty v-if="characters.length === 0" :image-size="200" description="暂无人物" />
    </template>
  </LayoutTool>

  <!-- 创建/编辑人物弹框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑人物' : '创建人物'"
    width="500px"
    @close="resetForm"
  >
    <el-form ref="formRef" :model="characterForm" :rules="formRules" label-width="80px">
      <el-form-item label="姓名" prop="name">
        <el-input v-model="characterForm.name" placeholder="请输入人物姓名" clearable />
      </el-form-item>
      <el-form-item label="年龄" prop="age">
        <el-input-number
          v-model="characterForm.age"
          :min="1"
          :max="99999"
          placeholder="请输入年龄"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="性别" prop="gender">
        <el-radio-group v-model="characterForm.gender">
          <el-radio label="男">男</el-radio>
          <el-radio label="女">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="身高" prop="height">
        <el-input-number
          v-model="characterForm.height"
          :min="1"
          :max="99999"
          placeholder="请输入身高(cm)"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="标签" prop="tags">
        <el-tree-select
          v-model="characterForm.tags"
          :data="tagOptions"
          multiple
          filterable
          default-first-option
          placeholder="请选择标签"
          style="width: 100%"
          :props="{
            children: 'children',
            label: 'name',
            value: 'name'
          }"
          node-key="name"
          check-strictly
          :render-after-expand="false"
          clearable
        />
      </el-form-item>
      <el-form-item label="介绍" prop="introduction">
        <el-input
          v-model="characterForm.introduction"
          placeholder="请输入人物介绍"
          type="textarea"
          :rows="8"
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
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted, watch, toRaw, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'

const route = useRoute()
const dialogVisible = ref(false)
const isEdit = ref(false)
const characters = ref([])
const dictionary = ref([]) // 字典数据
const bookName = route.query.name || ''
const formRef = ref(null)

// 表单数据
const characterForm = reactive({
  id: '',
  name: '',
  age: 18,
  gender: '男',
  height: 170,
  tags: [], // 新增标签字段
  introduction: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入人物姓名', trigger: 'blur' },
    { min: 1, max: 20, message: '姓名长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  age: [{ required: true, message: '请输入年龄(岁)', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  height: [{ required: true, message: '请输入身高(cm)', trigger: 'blur' }],
  introduction: [
    { required: true, message: '请输入人物介绍', trigger: 'blur' },
    { min: 1, max: 500, message: '介绍长度在 1 到 500 个字符', trigger: 'blur' }
  ]
}

// 计算标签选项（从字典词条中获取，保持树形结构）
const tagOptions = computed(() => {
  // 深拷贝字典数据，避免修改原数据
  const cloneDictionary = JSON.parse(JSON.stringify(dictionary.value))

  // 递归处理树形结构，确保每个节点都有name属性
  function processTreeData(nodes) {
    return nodes
      .map((node) => ({
        ...node,
        children: node.children && node.children.length > 0 ? processTreeData(node.children) : []
      }))
      .filter((node) => node.name && node.name.trim()) // 过滤掉没有名称的节点
  }

  return processTreeData(cloneDictionary)
})

// 生成唯一ID
function genId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

// 加载人物数据
async function loadCharacters() {
  try {
    const data = await window.electron.readCharacters(bookName)
    characters.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('加载人物数据失败:', error)
    characters.value = []
  }
}

// 加载字典数据
async function loadDictionary() {
  try {
    const data = await window.electron.readDictionary(bookName)
    dictionary.value = data || []
  } catch (error) {
    console.error('加载字典数据失败:', error)
    dictionary.value = []
  }
}

// 保存人物数据
async function saveCharacters() {
  try {
    const rawCharacters = JSON.parse(JSON.stringify(toRaw(characters.value)))
    const result = await window.electron.writeCharacters(bookName, rawCharacters)
    if (!result.success) {
      throw new Error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存人物数据失败:', error)
    ElMessage.error('保存人物数据失败')
  }
}

// 创建人物
function handleCreateCharacter() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑人物
function handleEditCharacter(character) {
  isEdit.value = true
  Object.assign(characterForm, character)
  dialogVisible.value = true
}

// 删除人物
async function handleDeleteCharacter(character) {
  try {
    await ElMessageBox.confirm(
      `确定要删除人物"${character.name}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const index = characters.value.findIndex((c) => c.id === character.id)
    if (index > -1) {
      characters.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
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
      // 编辑模式：更新现有人物
      const index = characters.value.findIndex((c) => c.id === characterForm.id)
      if (index > -1) {
        characters.value[index] = { ...characterForm }
      }
    } else {
      // 创建模式：添加新人物
      characters.value.push({
        ...characterForm,
        id: genId()
      })
    }

    dialogVisible.value = false
    ElMessage.success(isEdit.value ? '编辑成功' : '创建成功')
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 重置表单
function resetForm() {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(characterForm, {
    id: '',
    name: '',
    age: 18,
    gender: '男',
    height: 170,
    tags: [], // 重置标签
    introduction: ''
  })
}

// 监听数据变化，自动保存
watch(characters, saveCharacters, { deep: true })

// 组件挂载时加载数据
onMounted(() => {
  loadCharacters()
  loadDictionary() // 加载字典数据
})
</script>

<style lang="scss" scoped>
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

.character-card {
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    .character-actions {
      opacity: 1;
    }
  }

  &.male {
    // border-left: 4px solid #409eff;
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(64, 158, 255, 0.02) 100%);
  }

  &.female {
    // border-left: 4px solid #f56c6c;
    background: linear-gradient(
      135deg,
      rgba(245, 108, 108, 0.05) 0%,
      rgba(245, 108, 108, 0.02) 100%
    );
  }
}

.character-info {
  padding: 5px 0px;

  .character-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .character-details {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
    color: var(--text-primary);
    font-size: 14px;
    padding: 0 10px;
    margin-bottom: 5px;
  }

  // 标签样式
  .character-tags {
    padding: 0 10px;
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;

    .tag-item {
      margin: 0;
      font-size: 12px;
      border-radius: 4px;
    }
  }

  .character-intro {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
    margin: 0;
    padding: 0 10px;
    max-height: 150px;
    overflow-y: auto;
  }
}

.character-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;

  .el-icon {
    font-size: 24px;
    color: var(--text-primary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;

    &:hover {
      background: var(--bg-mute);
      color: #f56c6c;
    }
  }
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;

  .empty-icon {
    font-size: 48px;
    color: var(--text-secondary);
    margin-bottom: 16px;
  }

  p {
    font-size: 16px;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .character-grid {
    grid-template-columns: 1fr;
  }
}
</style>
