<template>
  <LayoutTool title="人物谱管理">
    <template #headrAction>
      <el-button type="primary" @click="handleCreateCharacter">
        <el-icon><Plus /></el-icon>
        <span>创建人物</span>
      </el-button>
    </template>
    <template #default>
      <div class="view-toggle">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="card">
            <el-icon><Grid /></el-icon>
            卡片模式
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><List /></el-icon>
            表格模式
          </el-radio-button>
        </el-radio-group>
      </div>
      <!-- 卡片模式 -->
      <div v-if="viewMode === 'card'" class="character-grid">
        <div
          v-for="character in characters"
          :key="character.id"
          class="character-card"
          :class="{ male: character.gender === '男', female: character.gender === '女' }"
          @click="handleEditCharacter(character)"
        >
          <div class="character-info">
            <div class="character-header">
              <div class="character-avatar" @click.stop="previewCharacterAvatar(character)">
                <el-image
                  v-if="character.avatar"
                  :src="getAvatarSrc(character.avatar)"
                  alt="头像"
                  class="avatar-image"
                  fit="cover"
                />
                <div v-else class="avatar-placeholder">
                  {{ character.name.charAt(0) }}
                </div>
              </div>
              <div class="character-details">
                <span
                  v-if="character.markerColor"
                  class="character-marker"
                  :style="{ backgroundColor: character.markerColor }"
                ></span>
                <span class="character-name">{{ character.name }}</span>
                <span class="character-age">{{ character.age }}岁</span>
                <span class="character-height">{{ character.height }}cm</span>
              </div>
            </div>
            <!-- 标签显示区域 -->
            <div v-if="character.tags && character.tags.length > 0" class="character-tags">
              <el-tag v-for="tag in character.tags" :key="tag" size="small" class="tag-item">
                {{ tag }}
              </el-tag>
            </div>
            <!-- 形象介绍 -->
            <div v-if="character.appearance" class="character-section">
              <div class="section-title">形象介绍</div>
              <p class="character-intro appearance-intro">{{ character.appearance }}</p>
            </div>
            <!-- 生平介绍 -->
            <div v-if="character.biography" class="character-section">
              <div class="section-title">生平介绍</div>
              <p class="character-intro biography-intro">{{ character.biography }}</p>
            </div>
          </div>
          <div class="character-actions">
            <el-icon @click.stop="handleDeleteCharacter(character)"><Delete /></el-icon>
          </div>
        </div>
      </div>

      <!-- 表格模式 -->
      <div v-else-if="viewMode === 'table'" class="character-table">
        <el-table :data="characters" border style="width: 100%" @row-click="handleEditCharacter">
          <el-table-column label="头像" width="80" align="center">
            <template #default="{ row }">
              <div class="table-avatar" @click.stop="previewCharacterAvatar(row)">
                <el-image
                  v-if="row.avatar"
                  :src="getAvatarSrc(row.avatar)"
                  alt="头像"
                  class="table-avatar-image"
                  fit="cover"
                />
                <div v-else class="table-avatar-placeholder">
                  {{ row.name.charAt(0) }}
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="姓名" width="140" align="center">
            <template #default="{ row }">
              <div class="table-name-cell">
                <span
                  v-if="row.markerColor"
                  class="table-marker"
                  :style="{ backgroundColor: row.markerColor }"
                ></span>
                <span>{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="age" label="年龄" width="80" align="center">
            <template #default="{ row }"> {{ row.age }}岁 </template>
          </el-table-column>
          <el-table-column prop="gender" label="性别" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
                {{ row.gender }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="height" label="身高" width="100" align="center">
            <template #default="{ row }"> {{ row.height }}cm </template>
          </el-table-column>
          <el-table-column prop="tags" label="标签" width="140" align="center">
            <template #default="{ row }">
              <div v-if="row.tags && row.tags.length > 0" class="table-tags">
                <el-tag v-for="tag in row.tags" :key="tag" size="small" class="tag-item">
                  {{ tag }}
                </el-tag>
              </div>
              <span v-else class="no-tags">无标签</span>
            </template>
          </el-table-column>
          <el-table-column prop="appearance" label="形象介绍" min-width="200" align="center" />
          <el-table-column prop="biography" label="生平介绍" min-width="300" align="center" />
          <el-table-column label="操作" width="120" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click.stop="handleEditCharacter(row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button type="danger" size="small" @click.stop="handleDeleteCharacter(row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty
        v-if="characters.length === 0"
        :image-size="200"
        description="暂无人物"
        class="empty-state"
      />
    </template>
  </LayoutTool>

  <!-- 创建/编辑人物弹框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑人物' : '创建人物'"
    width="700px"
    align-center
    @close="resetForm"
  >
    <el-form ref="formRef" :model="characterForm" :rules="formRules" label-width="80px">
      <!-- 头像操作区域 -->
      <el-form-item label="头像" class="avatar-form-item">
        <div class="avatar-form-section">
          <div class="avatar-preview" @click="previewFormAvatar">
            <el-image
              v-if="characterForm.avatar"
              :src="getAvatarSrc(characterForm.avatar)"
              alt="头像预览"
              class="form-avatar-image"
              fit="cover"
            />
            <div v-else class="form-avatar-placeholder">
              {{ characterForm.name ? characterForm.name.charAt(0) : '头' }}
            </div>
          </div>
          <div class="avatar-input-section">
            <div class="input-row">
              <el-input
                v-model="characterForm.avatar"
                placeholder="请输入图片链接或选择本地图片"
                clearable
              />
              <el-button @click="selectLocalImage">选择本地图片</el-button>
            </div>
          </div>
        </div>
      </el-form-item>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="characterForm.name" placeholder="请输入人物姓名" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="characterForm.gender">
              <el-radio value="男">男</el-radio>
              <el-radio value="女">女</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="10">
        <el-col :span="12">
          <el-form-item label="年龄" prop="age">
            <el-input-number
              v-model="characterForm.age"
              :min="1"
              :max="99999"
              placeholder="请输入年龄"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="身高" prop="height">
            <el-input-number
              v-model="characterForm.height"
              :min="1"
              :max="99999"
              placeholder="请输入身高(cm)"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="形象介绍" prop="appearance">
        <el-input
          v-model="characterForm.appearance"
          placeholder="请输入人物形象介绍（外貌、气质、穿着等）"
          type="textarea"
          :rows="4"
          clearable
        />
      </el-form-item>
      <el-form-item label="生平介绍" prop="biography">
        <el-input
          v-model="characterForm.biography"
          placeholder="请输入人物生平介绍（经历、性格、背景故事等）"
          type="textarea"
          :rows="6"
          clearable
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
      <el-form-item label="标记色">
        <div class="marker-selector">
          <button
            v-for="color in presetMarkerColors"
            :key="color || 'none'"
            type="button"
            class="marker-swatch"
            :class="{ active: color === characterForm.markerColor, empty: !color }"
            :style="color ? { backgroundColor: color } : {}"
            @click="handlePresetMarkerClick(color)"
          >
            <span v-if="!color" class="marker-none">无</span>
          </button>
          <el-color-picker
            v-model="characterForm.markerColor"
            :predefine="colorPickerPredefine"
            :show-alpha="false"
            size="small"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmSave">确认</el-button>
    </template>
  </el-dialog>

  <!-- 图片预览器 -->
  <el-image-viewer
    v-if="imageViewerVisible"
    :url-list="imageViewerSrcList"
    :initial-index="imageViewerInitialIndex"
    @close="imageViewerVisible = false"
  />
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted, watch, toRaw, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Grid, List, Edit } from '@element-plus/icons-vue'
import { genId } from '@renderer/utils/utils'

const route = useRoute()
const dialogVisible = ref(false)
const isEdit = ref(false)
const viewMode = ref('card') // 视图模式：card 或 table
const characters = ref([])
const dictionary = ref([]) // 字典数据
const bookName = route.query.name || ''
const formRef = ref(null)

const presetMarkerColors = [
  '',
  '#FF4D4F',
  '#FF9F1C',
  '#FFD600',
  '#00C853',
  '#1890FF',
  '#B368FF',
  '#FF6F91',
  '#8D99AE',
  '#A3E635',
  '#00C9A7',
  '#13C2C2',
  '#2F54EB'
]

const colorPickerPredefine = presetMarkerColors.filter((color) => !!color)

// 图片预览相关
const imageViewerVisible = ref(false)
const imageViewerSrcList = ref([])
const imageViewerInitialIndex = ref(0)

// 表单数据
const characterForm = reactive({
  id: '',
  name: '',
  age: 18,
  gender: '男',
  height: 170,
  tags: [], // 新增标签字段
  biography: '', // 生平介绍
  appearance: '', // 形象介绍
  avatar: '', // 头像路径或链接
  markerColor: '' // 标记色
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
  biography: [
    { required: true, message: '请输入生平介绍', trigger: 'blur' },
    { min: 1, max: 1000, message: '生平介绍长度在 1 到 1000 个字符', trigger: 'blur' }
  ],
  appearance: [
    { required: true, message: '请输入形象介绍', trigger: 'blur' },
    { min: 1, max: 500, message: '形象介绍长度在 1 到 500 个字符', trigger: 'blur' }
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

// 加载人物数据
async function loadCharacters() {
  try {
    const data = await window.electron.readCharacters(bookName)
    let loadedData = Array.isArray(data) ? data : []

    // 数据兼容：将旧的 introduction 字段迁移到 biography 字段
    loadedData = loadedData.map((character) => {
      // 如果存在旧的 introduction 字段且没有 biography 字段，则迁移
      if (character.introduction && !character.biography) {
        return {
          ...character,
          biography: character.introduction,
          appearance: character.appearance || '',
          avatar: character.avatar || '',
          introduction: undefined // 移除旧字段
        }
      }
      // 确保新字段存在
      return {
        ...character,
        biography: character.biography || '',
        appearance: character.appearance || '',
        avatar: character.avatar || '',
        markerColor: character.markerColor || ''
      }
    })

    characters.value = loadedData
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
    biography: '', // 生平介绍
    appearance: '', // 形象介绍
    avatar: '', // 头像
    markerColor: ''
  })
}

function handlePresetMarkerClick(color) {
  characterForm.markerColor = color
}

// 监听数据变化，自动保存
watch(characters, saveCharacters, { deep: true })

// 预览表单中的头像
function previewFormAvatar() {
  if (characterForm.avatar) {
    imageViewerSrcList.value = [getAvatarSrc(characterForm.avatar)]
    imageViewerInitialIndex.value = 0
    imageViewerVisible.value = true
  } else {
    ElMessage.warning('暂无头像可预览')
  }
}

// 预览人物头像
function previewCharacterAvatar(character) {
  if (character.avatar) {
    imageViewerSrcList.value = [getAvatarSrc(character.avatar)]
    imageViewerInitialIndex.value = 0
    imageViewerVisible.value = true
  } else {
    ElMessage.warning(`${character.name} 暂无头像可预览`)
  }
}

// 选择本地图片
async function selectLocalImage() {
  try {
    const result = await window.electron.selectImage()
    if (result && result.filePath) {
      // 将本地文件路径转换为 file:// 协议，以便在浏览器中正确显示
      characterForm.avatar = `file://${result.filePath}`
      ElMessage.success('图片选择成功')
    }
  } catch (error) {
    console.error('选择图片失败:', error)
    ElMessage.error('选择图片失败')
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

// 组件挂载时加载数据
onMounted(() => {
  loadCharacters()
  loadDictionary() // 加载字典数据
})
</script>

<style lang="scss" scoped>
.view-toggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.character-table {
  .table-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    margin: 0 auto;
    cursor: pointer;
    transition: all 0.3s ease;

    // &:hover {
    //   transform: scale(1.1);
    //   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    // }

    .table-avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .table-avatar-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 14px;
      font-weight: bold;
    }
  }

  .table-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
  }

  .no-tags {
    color: #999;
    font-size: 12px;
    text-align: center;
  }

  .table-name-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .table-marker {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px var(--border-color);
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    ::v-deep(.el-button) {
      margin: 0;
    }
  }
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

.character-card {
  background: var(--bg-primary);
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

  .character-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 0 10px;
    margin-bottom: 8px;
  }

  .character-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: bold;
    }
  }

  .character-details {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;

    .character-marker {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px var(--border-color);
    }
  }

  .character-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-base);
  }

  .character-age,
  .character-height {
    font-size: 13px;
    color: var(--text-secondary);
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

  // 介绍区域样式
  .character-section {
    padding: 0 10px;
    margin-bottom: 8px;

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
  }

  .character-intro {
    font-size: 13px;
    color: var(--text-base);
    line-height: 1.2;
    margin: 0;
    text-align: left;
    word-break: break-word;
  }

  // 形象介绍：最多显示3行
  .appearance-intro {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // 生平介绍：最多显示4行
  .biography-intro {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    overflow: hidden;
    text-overflow: ellipsis;
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
    color: var(--text-base);
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
}

// 头像表单样式
.avatar-form-item {
  ::v-deep(.el-form-item__content) {
    display: flex;
    align-items: center;
    min-height: 100px;
  }
}

.avatar-form-section {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;

  .avatar-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid var(--border-color);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .form-avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .form-avatar-placeholder {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    }
  }

  .avatar-input-section {
    flex: 1;

    .input-row {
      display: flex;
      gap: 12px;
      align-items: center;

      .el-input {
        flex: 1;
      }

      .el-button {
        flex-shrink: 0;
      }
    }
  }
}

.marker-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .marker-swatch {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: var(--bg-primary);
    padding: 0;
    transition: all 0.2s ease;

    &.empty {
      background: var(--bg-mute);
      color: var(--text-secondary);
      font-size: 12px;
    }

    &.active {
      box-shadow:
        0 0 0 2px var(--bg-primary),
        0 0 0 4px rgba(64, 158, 255, 0.4);
    }

    .marker-none {
      font-size: 12px;
    }
  }
}
</style>
