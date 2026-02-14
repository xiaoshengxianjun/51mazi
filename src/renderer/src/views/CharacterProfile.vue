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
              <!-- details 和 tags 的容器 -->
              <div class="character-info-wrapper">
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
                <!-- 标签显示区域 -->
                <div v-if="character.tags && character.tags.length > 0" class="character-tags">
                  <el-tag v-for="tag in character.tags" :key="tag" size="small" class="tag-item">
                    {{ tag }}
                  </el-tag>
                </div>
              </div>
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
            <!-- 人物图列表：卡片下方一行多张 -->
            <div class="character-portrait-row">
              <div class="portrait-label">人物图</div>
              <div v-if="getCharacterImages(character).length" class="character-portrait-list">
                <div
                  v-for="(img, idx) in getCharacterImages(character)"
                  :key="idx"
                  class="character-portrait-thumb"
                  @click.stop="previewCharacterImages(character, idx)"
                >
                  <el-image :src="getAvatarSrc(img)" alt="人物图" fit="cover" />
                </div>
              </div>
              <div v-else class="character-portrait-placeholder">暂无人物图</div>
            </div>
          </div>
          <div class="character-actions">
            <el-icon @click.stop="handleDeleteCharacter(character)"><Delete /></el-icon>
          </div>
        </div>
      </div>

      <!-- 表格模式 -->
      <div v-else-if="viewMode === 'table'" class="character-table">
        <el-table
          ref="tableRef"
          :data="characters"
          row-key="id"
          border
          style="width: 100%"
          @row-click="handleEditCharacter"
        >
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
          <el-table-column label="人物图" width="120" align="center">
            <template #default="{ row }">
              <div
                v-if="getCharacterImages(row).length"
                class="table-portrait-list"
                @click.stop="previewCharacterImages(row, 0)"
              >
                <div
                  v-for="(img, idx) in getCharacterImages(row).slice(0, 3)"
                  :key="idx"
                  class="table-portrait table-portrait-vertical"
                >
                  <el-image :src="getAvatarSrc(img)" alt="人物图" fit="cover" />
                </div>
                <span v-if="getCharacterImages(row).length > 3" class="table-portrait-more">
                  +{{ getCharacterImages(row).length - 3 }}
                </span>
              </div>
              <span v-else class="no-portrait">无</span>
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

  <!-- 创建/编辑人物抽屉 -->
  <el-drawer
    v-model="drawerVisible"
    :title="isEdit ? '编辑人物' : '创建人物'"
    size="700px"
    direction="rtl"
    class="character-form-drawer"
    @close="resetForm"
  >
    <el-form ref="formRef" :model="characterForm" :rules="formRules" label-width="80px">
      <!-- 头像：用于列表/卡片小图 -->
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
      <!-- 人物图列表：多张竖版全身，可 AI 生成或本地添加 -->
      <el-form-item label="人物图" class="character-image-form-item">
        <div class="character-image-form-section">
          <div
            v-if="characterForm.characterImages.length"
            class="character-image-list"
          >
            <div
              v-for="(img, idx) in characterForm.characterImages"
              :key="idx"
              class="character-image-preview-wrap"
            >
              <div
                class="character-image-preview"
                @click="previewFormCharacterImages(idx)"
              >
                <el-image :src="getAvatarSrc(img)" alt="人物图" fit="cover" />
              </div>
              <el-button
                type="danger"
                size="small"
                circle
                class="character-image-remove"
                @click="removeCharacterImage(idx)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <div v-else class="character-image-placeholder">暂无人物图，可添加多张（竖版全身）</div>
          <div class="character-image-input-section">
            <div class="input-row">
              <el-button @click="selectLocalImageForCharacterImage">选择本地图片</el-button>
              <el-button type="success" @click="openAICharacterDrawer">
                <el-icon><MagicStick /></el-icon>
                AI 生成人物图
              </el-button>
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
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmSave">确认</el-button>
    </template>
  </el-drawer>

  <!-- AI 生成人物图抽屉 -->
  <AICharacterDrawer
    v-model="aiCharacterDrawerVisible"
    :book-name="bookName"
    :character-name="characterForm.name"
    :appearance="characterForm.appearance"
    @character-image-generated="onAICharacterImageGenerated"
  />

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
import { ref, reactive, onMounted, watch, toRaw, computed, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Grid, List, Edit, MagicStick } from '@element-plus/icons-vue'
import AICharacterDrawer from '@renderer/components/AICharacterDrawer.vue'
import { genId } from '@renderer/utils/utils'
import Sortable from 'sortablejs'

const route = useRoute()
const drawerVisible = ref(false)
const aiCharacterDrawerVisible = ref(false)
const isEdit = ref(false)
const bookName = route.query.name || ''

// 人物谱视图模式：按书籍记忆，默认表格模式
const VIEW_MODE_STORAGE_KEY_PREFIX = 'characterProfileViewMode_'
function getViewModeStorageKey() {
  return VIEW_MODE_STORAGE_KEY_PREFIX + (bookName || '_default')
}
const viewMode = ref(
  (typeof localStorage !== 'undefined' && localStorage.getItem(getViewModeStorageKey())) || 'table'
)
const characters = ref([])
const dictionary = ref([]) // 字典数据
const formRef = ref(null)
const tableRef = ref(null)
let sortableInstance = null // 存储 SortableJS 实例

// 切换视图模式时按当前书籍持久化，下次打开该书籍时恢复
watch(viewMode, (val) => {
  if (typeof localStorage === 'undefined') return
  const key = getViewModeStorageKey()
  if (val === 'card' || val === 'table') {
    localStorage.setItem(key, val)
  }
})

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
  tags: [],
  biography: '',
  appearance: '',
  avatar: '', // 头像（小图，用于列表/卡片）
  characterImages: [], // 人物图列表（竖版全身，可多张）
  markerColor: ''
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
  // 生平介绍：非必填，有内容时最多 1000 字
  biography: [{ max: 1000, message: '生平介绍最多 1000 个字符', trigger: 'blur' }],
  // 形象介绍：非必填，有内容时最多 500 字
  appearance: [{ max: 500, message: '形象介绍最多 500 个字符', trigger: 'blur' }]
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
      const images = normalizeCharacterImages(character)
      if (character.introduction && !character.biography) {
        return {
          ...character,
          biography: character.introduction,
          appearance: character.appearance || '',
          avatar: character.avatar || '',
          characterImages: images,
          introduction: undefined
        }
      }
      return {
        ...character,
        biography: character.biography || '',
        appearance: character.appearance || '',
        avatar: character.avatar || '',
        characterImages: images,
        markerColor: character.markerColor || ''
      }
    })

    // 直接使用数组顺序，不需要 sort 字段
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
    // 移除 sort 字段（如果存在），因为数组顺序就是最终顺序
    const rawCharacters = JSON.parse(JSON.stringify(toRaw(characters.value))).map((character) => {
      // eslint-disable-next-line no-unused-vars
      const { sort, ...rest } = character
      return rest
    })
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
  drawerVisible.value = true
}

// 编辑人物
function handleEditCharacter(character) {
  isEdit.value = true
  Object.assign(characterForm, character)
  characterForm.characterImages = getCharacterImages(character)
  drawerVisible.value = true
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
      // 创建模式：添加新人物（直接添加到数组末尾）
      characters.value.push({
        ...characterForm,
        id: genId()
      })
    }

    drawerVisible.value = false
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
    tags: [],
    biography: '',
    appearance: '',
    avatar: '',
    characterImages: [],
    markerColor: ''
  })
}

function handlePresetMarkerClick(color) {
  characterForm.markerColor = color
}

// 初始化表格拖拽排序
function initTableDragSort() {
  // 清理之前的实例
  try {
    if (sortableInstance && typeof sortableInstance.destroy === 'function') {
      sortableInstance.destroy()
    }
  } catch (error) {
    console.error('清理 SortableJS 实例失败:', error)
  }
  sortableInstance = null

  // 只在表格模式下初始化
  if (viewMode.value !== 'table') return

  nextTick(() => {
    if (!tableRef.value) return

    const tableEl = tableRef.value.$el
    if (!tableEl) return

    // 查找 tbody
    const tbody = tableEl.querySelector('tbody')
    if (!tbody) return

    sortableInstance = Sortable.create(tbody, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      filter: '.el-button, .el-button__text, .table-avatar',
      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt
        if (oldIndex === newIndex) return
        reorderCharacters(oldIndex, newIndex)
      }
    })
  })
}

// 重新排序人物数组（根据拖拽后的顺序）
async function reorderCharacters(oldIndex, newIndex) {
  const list = characters.value
  if (!list || list.length === 0) return

  // 移动数组元素（数组顺序就是最终顺序）
  const movedItem = list[oldIndex]
  list.splice(oldIndex, 1)
  list.splice(newIndex, 0, movedItem)

  // 手动触发保存
  await saveCharacters()
}

// 监听数据变化，自动保存
watch(characters, saveCharacters, { deep: true })

// 监听表格数据变化，重新初始化拖拽（仅在表格模式下）
watch(
  () => [characters.value, viewMode.value],
  () => {
    if (viewMode.value === 'table') {
      nextTick(() => {
        initTableDragSort()
      })
    }
  },
  { deep: true }
)

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

// 打开 AI 生成人物图抽屉（生成竖版全身人物图）
function openAICharacterDrawer() {
  aiCharacterDrawerVisible.value = true
}

// 兼容：人物图可能是旧字段 characterImage 或新字段 characterImages
function normalizeCharacterImages(character) {
  if (Array.isArray(character.characterImages) && character.characterImages.length) {
    return character.characterImages
  }
  if (character.characterImage) {
    return [character.characterImage]
  }
  return []
}

function getCharacterImages(character) {
  return normalizeCharacterImages(character)
}

// AI 生成人物图确认使用后，追加到人物图列表
function onAICharacterImageGenerated({ localPath }) {
  const path = localPath.startsWith('file://') ? localPath : `file://${localPath}`
  characterForm.characterImages.push(path)
}

// 预览表单人物图列表（从某张开始）
function previewFormCharacterImages(initialIndex = 0) {
  const list = characterForm.characterImages.map((img) => getAvatarSrc(img))
  if (!list.length) {
    ElMessage.warning('暂无人物图可预览')
    return
  }
  imageViewerSrcList.value = list
  imageViewerInitialIndex.value = Math.min(initialIndex, list.length - 1)
  imageViewerVisible.value = true
}

// 预览人物图列表（从某张开始）
function previewCharacterImages(character, initialIndex = 0) {
  const list = getCharacterImages(character).map((img) => getAvatarSrc(img))
  if (!list.length) {
    ElMessage.warning(`${character.name} 暂无人物图可预览`)
    return
  }
  imageViewerSrcList.value = list
  imageViewerInitialIndex.value = Math.min(initialIndex, list.length - 1)
  imageViewerVisible.value = true
}

// 从表单人物图列表中移除一张
function removeCharacterImage(index) {
  characterForm.characterImages.splice(index, 1)
}

// 人物图：选择本地图片并追加到列表
async function selectLocalImageForCharacterImage() {
  try {
    const result = await window.electron.selectImage()
    if (result && result.filePath) {
      characterForm.characterImages.push(`file://${result.filePath}`)
      ElMessage.success('已添加到人物图列表')
    }
  } catch (error) {
    console.error('选择图片失败:', error)
    ElMessage.error('选择图片失败')
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

// 组件挂载时加载数据并初始化拖拽
onMounted(async () => {
  await loadCharacters()
  await loadDictionary() // 加载字典数据
  // 等待数据加载完成和 DOM 更新后再初始化拖拽
  await nextTick()
  initTableDragSort()
})

// 组件卸载时清理 SortableJS 实例
onBeforeUnmount(() => {
  try {
    if (sortableInstance && typeof sortableInstance.destroy === 'function') {
      sortableInstance.destroy()
    }
  } catch (error) {
    console.error('清理 SortableJS 实例失败:', error)
  }
  sortableInstance = null
})
</script>

<style lang="scss" scoped>
.view-toggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.character-table {
  // 拖拽排序样式
  :deep(.sortable-ghost) {
    opacity: 0.4;
    background-color: var(--bg-soft);
  }

  :deep(.sortable-chosen) {
    background-color: var(--bg-soft);
  }

  :deep(.sortable-drag) {
    opacity: 0.8;
  }

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
      // 使用主题主色调和成功色创建渐变
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--success-green) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-gray-lightest);
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
    color: var(--text-gray-light);
    font-size: 12px;
    text-align: center;
  }

  .table-portrait-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    min-height: 48px;
  }
  .table-portrait {
    width: 36px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border-color-soft);
    .el-image {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  .table-portrait-vertical {
    aspect-ratio: 9 / 16;
  }
  .table-portrait-more {
    font-size: 11px;
    color: var(--text-gray-light);
    margin-left: 2px;
  }

  .no-portrait {
    color: var(--text-gray-light);
    font-size: 12px;
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 15px;
  padding: 12px 0;
  // 添加响应式优化
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  }
}

.character-card {
  background: var(--bg-soft);
  border: 1px solid var(--border-color-soft);
  // 增大圆角，让卡片更圆润
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  // 添加多层阴影，增强质感
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.05);
  // 添加微妙的背景渐变
  background: linear-gradient(180deg, var(--bg-soft) 0%, var(--bg-primary) 100%);

  &:hover {
    transform: translateY(-4px) scale(1.01);
    // 增强hover时的阴影效果
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.15),
      0 6px 12px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.08);
    border-color: var(--border-color);

    .character-actions {
      opacity: 1;
      transform: scale(1);
    }

    .character-avatar {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
  }

  &.male {
    // 男性卡片：使用固定的蓝白色背景，不跟随主题变化
    background: linear-gradient(135deg, #f5f8ff 0%, #f0f5ff 100%);
    border-color: #e0e8f5;

    // 使用伪元素实现左侧边框
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #4a90e2 0%, #5ba3f5 100%);
      border-radius: 12px 0 0 12px; // 匹配卡片圆角
      z-index: 0;
    }

    &:hover {
      background: linear-gradient(135deg, #e6f0ff 0%, #e0ebff 100%);
      border-color: #d0dbf0;
    }
  }

  &.female {
    // 女性卡片：使用固定的粉白色背景，不跟随主题变化
    background: linear-gradient(135deg, #fff9fb 0%, #fff5f8 100%);
    border-color: #f5e0e8;

    // 使用伪元素实现左侧边框
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #ff6b9d 0%, #ff8fb3 100%);
      border-radius: 12px 0 0 12px; // 匹配卡片圆角
      z-index: 0;
    }

    &:hover {
      background: linear-gradient(135deg, #fff0f5 0%, #ffebf0 100%);
      border-color: #f0d5e0;
    }
  }
}

.character-info {
  padding: 8px 12px;
  position: relative;
  z-index: 1;

  .character-header {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 10px;
    padding: 0;
    margin-bottom: 8px;
  }

  // details 和 tags 的容器
  .character-info-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .character-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    // 添加边框和阴影，增强质感
    border: 2px solid var(--bg-soft);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 0 0 1px var(--border-color-soft);
    background: var(--bg-soft);

    &:hover {
      transform: scale(1.08);
      box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.2),
        0 0 0 2px var(--primary-color);
      border-color: var(--primary-color);
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      // 使用主题主色调和成功色创建渐变
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--success-green) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-gray-lightest);
      font-size: 18px;
      font-weight: bold;
    }
  }

  .character-details {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

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
    // 固定黑色，不跟随主题变化
    color: #121212;
  }

  .character-age,
  .character-height {
    font-size: 13px;
    // 固定黑色，不跟随主题变化
    color: #121212;
    font-weight: 500; // 增加字重，提升可读性
  }

  // 标签样式
  .character-tags {
    padding: 0;
    margin-bottom: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .tag-item {
      margin: 0;
      font-size: 11px;
      border-radius: 12px;
      padding: 2px 6px;
      font-weight: 500;
      // 添加微妙的阴影
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
    }
  }

  // 介绍区域样式
  .character-section {
    padding: 0;
    margin-bottom: 8px;
    // 添加背景和边框，增强层次感
    background: transparent;
    border-radius: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border-color-soft);
    transition: all 0.3s ease;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      // 固定黑色，不跟随主题变化
      color: #121212;
      margin-bottom: 6px;
      // 添加图标样式的小装饰
      position: relative;
      padding-left: 10px;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 14px;
        // 使用固定的蓝色，不跟随主题
        background: #4a90e2;
        border-radius: 2px;
      }
    }
  }

  .character-intro {
    font-size: 12px;
    // 固定黑色，不跟随主题变化
    color: #121212;
    line-height: 1.5; // 增加行高，提升可读性
    margin: 0;
    text-align: left;
    word-break: break-word;
    font-weight: 400; // 明确设置字重
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

  // 人物图列表：卡片下方一行多张
  .character-portrait-row {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-color-soft);
    .portrait-label {
      font-size: 12px;
      color: var(--text-gray-light);
      margin-bottom: 6px;
    }
    .character-portrait-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .character-portrait-thumb {
      width: 48px;
      flex-shrink: 0;
      aspect-ratio: 9 / 16;
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
      border: 1px solid var(--border-color-soft);
      .el-image {
        width: 100%;
        height: 100%;
        display: block;
      }
    }
    .character-portrait-placeholder {
      font-size: 12px;
      color: var(--text-gray-light);
      padding: 8px 0;
    }
  }
}

.character-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  // 添加背景，增强可见性
  background: var(--bg-primary-a7);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 4px;

  .el-icon {
    font-size: 26px;
    color: var(--text-base);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--danger-color);
      color: var(--text-gray-lightest);
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
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

.character-image-form-item {
  ::v-deep(.el-form-item__content) {
    display: flex;
    align-items: flex-start;
    min-height: 80px;
  }
}

.character-image-form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  .character-image-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .character-image-preview-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .character-image-preview {
    width: 72px;
    aspect-ratio: 9 / 16;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--border-color);
    .el-image {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  .character-image-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 22px;
    height: 22px;
    padding: 0;
    min-width: 22px;
  }
  .character-image-placeholder {
    font-size: 12px;
    color: var(--text-gray-light);
    padding: 8px 0;
  }
  .character-image-input-section .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
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
      // 使用主题主色调和成功色创建渐变
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--success-green) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-gray-lightest);
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

// 人物表单抽屉内容区
.character-form-drawer {
  :deep(.el-drawer__body) {
    display: flex;
    flex-direction: column;
    padding: 20px;
    padding-bottom: 80px;
  }
  :deep(.el-drawer__footer) {
    padding: 12px 20px;
    border-top: 1px solid var(--el-border-color-lighter);
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
      // 使用主题基础文本颜色，确保在浅色和暗色模式下都有足够的对比度
      color: var(--text-base);
      font-size: 12px;
    }

    &.active {
      box-shadow:
        0 0 0 2px var(--bg-primary),
        0 0 0 4px var(--primary-color);
      opacity: 0.6; // 添加透明度以显示激活状态
    }

    .marker-none {
      font-size: 12px;
    }
  }
}
</style>
