<template>
  <LayoutTool :title="t('settingManager.title')">
    <template #headrAction>
      <el-button type="primary" :disabled="!canCreateItem" @click="handleCreateItem">
        <el-icon><Plus /></el-icon>
        <span>{{ t('settingManager.createSetting') }}</span>
      </el-button>
    </template>

    <template #default>
      <div class="setting-manager">
        <aside class="category-panel">
          <div class="panel-header">
            <h3 class="panel-title">{{ t('settingManager.categoryTitle') }}</h3>
            <el-button size="small" type="primary" plain @click="handleCreateCategory">
              <el-icon><Plus /></el-icon>
              <span>{{ t('settingManager.createRootCategory') }}</span>
            </el-button>
          </div>

          <el-empty
            v-if="!categories.length"
            :description="t('settingManager.emptyCategory')"
            :image-size="80"
          />
          <el-tree
            v-else
            class="category-tree"
            :data="categories"
            node-key="id"
            draggable
            default-expand-all
            highlight-current
            :current-node-key="activeCategoryId"
            :expand-on-click-node="false"
            :props="treeProps"
            :allow-drop="allowCategoryDrop"
            @node-click="handleCategorySelect"
            @node-drop="handleCategoryDrop"
          >
            <template #default="{ data }">
              <div class="category-tree-node" :class="{ active: data.id === activeCategoryId }">
                <div class="category-info">
                  <span class="category-name">{{ data.name }}</span>
                </div>
                <div class="category-actions" @click.stop>
                  <el-tooltip
                    :content="t('settingManager.createChildCategory')"
                    placement="top"
                    :show-after="800"
                  >
                    <el-icon @click="handleCreateChildCategory(data)"><Plus /></el-icon>
                  </el-tooltip>
                  <el-tooltip
                    :content="t('settingManager.editCategory')"
                    placement="top"
                    :show-after="800"
                  >
                    <el-icon @click="handleEditCategory(data)"><Edit /></el-icon>
                  </el-tooltip>
                  <el-tooltip :content="t('common.delete')" placement="top" :show-after="800">
                    <el-icon class="danger-action" @click="handleDeleteCategory(data)">
                      <Delete />
                    </el-icon>
                  </el-tooltip>
                </div>
              </div>
            </template>
          </el-tree>
        </aside>

        <section class="setting-panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">
                {{ currentCategory?.name || t('settingManager.noCategory') }}
              </h3>
            </div>
            <el-tag v-if="currentCategory" :type="isLeafCategory ? 'success' : 'info'">
              {{
                isLeafCategory
                  ? t('settingManager.leafCategory')
                  : t('settingManager.branchCategory')
              }}
            </el-tag>
            <el-tag v-if="currentCategory" type="info">
              {{ t('settingManager.settingCount', { count: currentCategorySettingCount }) }}
            </el-tag>
          </div>

          <div v-if="currentCategory?.introduction" class="category-introduction">
            {{ currentCategory.introduction }}
          </div>
          <el-alert
            v-if="currentCategory && !isLeafCategory"
            class="leaf-only-alert"
            :title="t('settingManager.leafOnlyTip')"
            type="info"
            :closable="false"
          />

          <div class="setting-table-wrapper">
            <el-table
              ref="tableRef"
              :data="currentItems"
              row-key="id"
              border
              style="width: 100%"
              :empty-text="settingEmptyText"
            >
              <el-table-column prop="name" :label="t('settingManager.settingName')" min-width="90">
                <template #default="{ row }">
                  <span class="setting-name">{{ row.name }}</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="introduction"
                :label="t('settingManager.settingIntroduction')"
                min-width="300"
              >
                <template #default="{ row }">
                  <div class="setting-introduction">{{ row.introduction }}</div>
                </template>
              </el-table-column>
              <el-table-column :label="t('settingManager.actions')" width="96" fixed="right">
                <template #default="{ row }">
                  <div class="setting-action-column">
                    <el-button size="small" @click="handleEditItem(row)">
                      {{ t('common.edit') }}
                    </el-button>
                    <el-button size="small" type="danger" @click="handleDeleteItem(row)">
                      {{ t('common.delete') }}
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </section>
      </div>
    </template>
  </LayoutTool>

  <el-dialog
    v-model="categoryDialogVisible"
    :title="
      isEditingCategory ? t('settingManager.editCategory') : t('settingManager.createCategory')
    "
    width="420px"
    @close="resetCategoryForm"
  >
    <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-width="90px">
      <el-form-item :label="t('settingManager.categoryName')" prop="name">
        <el-input
          v-model="categoryForm.name"
          :placeholder="t('settingManager.categoryNamePlaceholder')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('settingManager.categoryIntroduction')" prop="introduction">
        <el-input
          v-model="categoryForm.introduction"
          :placeholder="t('settingManager.categoryIntroductionPlaceholder')"
          type="textarea"
          :rows="5"
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="categoryDialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmSaveCategory">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="settingDialogVisible"
    :title="isEditingItem ? t('settingManager.editSetting') : t('settingManager.createSetting')"
    width="620px"
    @close="resetSettingForm"
  >
    <el-form ref="settingFormRef" :model="settingForm" :rules="settingRules" label-width="90px">
      <el-form-item :label="t('settingManager.settingName')" prop="name">
        <el-input
          v-model="settingForm.name"
          :placeholder="t('settingManager.settingNamePlaceholder')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('settingManager.settingIntroduction')" prop="introduction">
        <el-input
          v-model="settingForm.introduction"
          :placeholder="t('settingManager.settingIntroductionPlaceholder')"
          type="textarea"
          :rows="14"
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="settingDialogVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmSaveItem">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { genId } from '@renderer/utils/utils'
import Sortable from 'sortablejs'

const DEFAULT_CATEGORY_ID = 'default'

const { t } = useI18n()
const route = useRoute()
const bookName = String(route.query.name || '')
const treeProps = {
  children: 'children',
  label: 'name'
}

const categories = ref([])
const activeCategoryId = ref(DEFAULT_CATEGORY_ID)
const categoryDialogParentId = ref('')
const categoryDialogVisible = ref(false)
const settingDialogVisible = ref(false)
const isEditingCategory = ref(false)
const isEditingItem = ref(false)
const categoryFormRef = ref(null)
const settingFormRef = ref(null)
const tableRef = ref(null)
const itemSortable = ref(null)

const categoryForm = reactive({
  id: '',
  name: '',
  introduction: ''
})

const settingForm = reactive({
  id: '',
  name: '',
  introduction: ''
})

const categoryRules = {
  name: [
    { required: true, message: t('settingManager.ruleCategoryNameRequired'), trigger: 'blur' },
    { min: 1, max: 30, message: t('settingManager.ruleCategoryNameLength'), trigger: 'blur' }
  ],
  introduction: [
    {
      max: 1000,
      message: t('settingManager.ruleCategoryIntroductionLength'),
      trigger: 'blur'
    }
  ]
}

const settingRules = {
  name: [
    { required: true, message: t('settingManager.ruleSettingNameRequired'), trigger: 'blur' },
    { min: 1, max: 50, message: t('settingManager.ruleSettingNameLength'), trigger: 'blur' }
  ],
  introduction: [
    {
      required: true,
      message: t('settingManager.ruleSettingIntroductionRequired'),
      trigger: 'blur'
    },
    {
      min: 1,
      max: 1000,
      message: t('settingManager.ruleSettingIntroductionLength'),
      trigger: 'blur'
    }
  ]
}

const currentCategory = computed(() => {
  return findCategoryById(categories.value, activeCategoryId.value)
})

const isLeafCategory = computed(() => {
  return Boolean(currentCategory.value && !currentCategory.value.children?.length)
})

const canCreateItem = computed(() => {
  return Boolean(currentCategory.value && isLeafCategory.value)
})

const currentItems = computed(() => {
  if (!isLeafCategory.value) return []
  return currentCategory.value?.items || []
})

const currentCategorySettingCount = computed(() => {
  if (!currentCategory.value) return 0
  return getCategorySettingCount(currentCategory.value)
})

const settingEmptyText = computed(() => {
  if (!currentCategory.value) return t('settingManager.selectCategoryFirst')
  if (!isLeafCategory.value) return t('settingManager.leafOnlyEmpty')
  return t('settingManager.emptySetting')
})

function getDefaultSettingsData() {
  return {
    categories: [
      {
        id: DEFAULT_CATEGORY_ID,
        name: t('settingManager.defaultCategory'),
        introduction: '',
        children: [],
        items: []
      }
    ]
  }
}

function normalizeSettingItems(items) {
  if (!Array.isArray(items)) return []

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id || genId()),
      name: String(item.name || '').trim(),
      introduction: String(item.introduction || '').trim()
    }))
}

function normalizeSettingCategories(sourceCategories) {
  if (!Array.isArray(sourceCategories)) return []

  return sourceCategories
    .filter((category) => category && typeof category === 'object')
    .map((category) => ({
      id: String(category.id || genId()),
      name: String(category.name || '').trim() || t('settingManager.unnamedCategory'),
      introduction: String(category.introduction || '').trim(),
      children: normalizeSettingCategories(category.children),
      items: normalizeSettingItems(category.items)
    }))
}

function normalizeSettingsData(data) {
  const normalizedCategories = normalizeSettingCategories(data?.categories)

  if (!normalizedCategories.length) {
    return getDefaultSettingsData()
  }

  return { categories: normalizedCategories }
}

function findCategoryById(nodes, id) {
  if (!id) return null

  for (const node of nodes) {
    if (node.id === id) return node
    const child = findCategoryById(node.children || [], id)
    if (child) return child
  }

  return null
}

function isCategoryInSubtree(category, targetId) {
  if (!category) return false
  if (category.id === targetId) return true
  return (category.children || []).some((child) => isCategoryInSubtree(child, targetId))
}

function removeCategoryFromTree(nodes, targetId) {
  const index = nodes.findIndex((node) => node.id === targetId)
  if (index !== -1) {
    nodes.splice(index, 1)
    return true
  }

  return nodes.some((node) => removeCategoryFromTree(node.children || [], targetId))
}

function findParentAndIndexById(nodes, id, parent = null) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (node.id === id) {
      return {
        parent,
        list: nodes,
        index
      }
    }

    const childResult = findParentAndIndexById(node.children || [], id, node)
    if (childResult) return childResult
  }

  return null
}

function getCategorySettingCount(category) {
  const selfCount = Array.isArray(category.items) ? category.items.length : 0
  const childCount = (category.children || []).reduce((total, child) => {
    return total + getCategorySettingCount(child)
  }, 0)

  return selfCount + childCount
}

async function loadSettings() {
  try {
    const data = await window.electron.readSettings(bookName)
    const normalized = normalizeSettingsData(data)
    categories.value = normalized.categories
    activeCategoryId.value = categories.value[0]?.id || DEFAULT_CATEGORY_ID
  } catch (error) {
    console.error('加载设定管理数据失败:', error)
    const fallback = getDefaultSettingsData()
    categories.value = fallback.categories
    activeCategoryId.value = DEFAULT_CATEGORY_ID
  }
}

async function saveSettings() {
  try {
    const payload = {
      categories: JSON.parse(JSON.stringify(toRaw(categories.value)))
    }
    const result = await window.electron.writeSettings(bookName, payload)
    if (!result.success) {
      throw new Error(result.message || t('settingManager.saveFailed'))
    }
  } catch (error) {
    console.error('保存设定管理数据失败:', error)
    ElMessage.error(t('settingManager.saveFailed'))
    throw error
  }
}

function resetCategoryForm() {
  categoryFormRef.value?.resetFields()
  Object.assign(categoryForm, {
    id: '',
    name: '',
    introduction: ''
  })
}

function resetSettingForm() {
  settingFormRef.value?.resetFields()
  Object.assign(settingForm, {
    id: '',
    name: '',
    introduction: ''
  })
}

function handleCreateCategory() {
  isEditingCategory.value = false
  categoryDialogParentId.value = ''
  resetCategoryForm()
  categoryDialogVisible.value = true
}

function handleCreateChildCategory(category) {
  if (category.items?.length) {
    ElMessage.warning(t('settingManager.categoryHasSettings'))
    return
  }

  isEditingCategory.value = false
  categoryDialogParentId.value = category.id
  resetCategoryForm()
  categoryDialogVisible.value = true
}

function handleEditCategory(category) {
  isEditingCategory.value = true
  categoryDialogParentId.value = ''
  Object.assign(categoryForm, {
    id: category.id,
    name: category.name,
    introduction: category.introduction || ''
  })
  categoryDialogVisible.value = true
}

function handleCategorySelect(category) {
  activeCategoryId.value = category.id
}

function allowCategoryDrop(draggingNode, dropNode, type) {
  if (!draggingNode || !dropNode) return false
  if (dropNode.data?.id === DEFAULT_CATEGORY_ID && type === 'before') return false
  if (type !== 'inner') return true
  return !dropNode.data?.items?.length
}

async function handleCategoryDrop(draggingNode, dropNode, dropType) {
  const draggingCategory = draggingNode?.data
  const targetCategory = dropNode?.data
  if (!draggingCategory || !targetCategory || draggingCategory.id === targetCategory.id) return

  const source = findParentAndIndexById(categories.value, draggingCategory.id)
  if (!source) return
  const [movedCategory] = source.list.splice(source.index, 1)
  if (!movedCategory) return

  const target = findParentAndIndexById(categories.value, targetCategory.id)
  if (!target) return

  if (dropType === 'inner') {
    if (!Array.isArray(targetCategory.children)) targetCategory.children = []
    targetCategory.children.push(movedCategory)
  } else {
    const insertIndex = dropType === 'before' ? target.index : target.index + 1
    target.list.splice(insertIndex, 0, movedCategory)
  }

  try {
    await saveSettings()
  } catch {
    await loadSettings()
  }
}

async function confirmSaveCategory() {
  if (!categoryFormRef.value) return

  try {
    await categoryFormRef.value.validate()

    if (isEditingCategory.value) {
      const category = findCategoryById(categories.value, categoryForm.id)
      if (category) {
        category.name = categoryForm.name.trim()
        category.introduction = categoryForm.introduction.trim()
      }
    } else {
      const newCategory = {
        id: genId(),
        name: categoryForm.name.trim(),
        introduction: categoryForm.introduction.trim(),
        children: [],
        items: []
      }

      const parentCategory = findCategoryById(categories.value, categoryDialogParentId.value)
      if (parentCategory) {
        if (!Array.isArray(parentCategory.children)) parentCategory.children = []
        parentCategory.children.push(newCategory)
      } else {
        categories.value.push(newCategory)
      }
      activeCategoryId.value = newCategory.id
    }

    await saveSettings()
    categoryDialogVisible.value = false
    ElMessage.success(
      isEditingCategory.value
        ? t('settingManager.editCategorySuccess')
        : t('settingManager.createCategorySuccess')
    )
  } catch (error) {
    if (error) console.error('保存设定分类失败:', error)
  }
}

async function handleDeleteCategory(category) {
  if (category.id === DEFAULT_CATEGORY_ID) {
    ElMessage.warning(t('settingManager.keepDefaultCategory'))
    return
  }

  try {
    await ElMessageBox.confirm(
      t('settingManager.deleteCategoryConfirm', { name: category.name }),
      t('settingManager.deleteCategoryTitle'),
      {
        confirmButtonText: t('settingManager.deleteConfirmBtn'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )

    const shouldResetActive = isCategoryInSubtree(category, activeCategoryId.value)
    removeCategoryFromTree(categories.value, category.id)
    if (shouldResetActive) {
      activeCategoryId.value = categories.value[0]?.id || DEFAULT_CATEGORY_ID
    }
    await saveSettings()
    ElMessage.success(t('settingManager.deleteSuccess'))
  } catch (error) {
    if (error !== 'cancel') console.error('删除设定分类失败:', error)
  }
}

function handleCreateItem() {
  if (!currentCategory.value) {
    ElMessage.warning(t('settingManager.selectCategoryFirst'))
    return
  }

  if (!isLeafCategory.value) {
    ElMessage.warning(t('settingManager.leafOnlyTip'))
    return
  }

  isEditingItem.value = false
  resetSettingForm()
  settingDialogVisible.value = true
}

function handleEditItem(item) {
  isEditingItem.value = true
  Object.assign(settingForm, {
    id: item.id,
    name: item.name,
    introduction: item.introduction
  })
  settingDialogVisible.value = true
}

async function confirmSaveItem() {
  if (!settingFormRef.value || !currentCategory.value || !isLeafCategory.value) return

  try {
    await settingFormRef.value.validate()

    if (isEditingItem.value) {
      const item = currentCategory.value.items.find((entry) => entry.id === settingForm.id)
      if (item) {
        item.name = settingForm.name.trim()
        item.introduction = settingForm.introduction.trim()
      }
    } else {
      currentCategory.value.items.push({
        id: genId(),
        name: settingForm.name.trim(),
        introduction: settingForm.introduction.trim()
      })
    }

    await saveSettings()
    settingDialogVisible.value = false
    ElMessage.success(
      isEditingItem.value
        ? t('settingManager.editSettingSuccess')
        : t('settingManager.createSettingSuccess')
    )
  } catch (error) {
    if (error) console.error('保存设定失败:', error)
  }
}

async function handleDeleteItem(item) {
  if (!currentCategory.value) return

  try {
    await ElMessageBox.confirm(
      t('settingManager.deleteSettingConfirm', { name: item.name }),
      t('settingManager.deleteSettingTitle'),
      {
        confirmButtonText: t('settingManager.deleteConfirmBtn'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )

    currentCategory.value.items = currentCategory.value.items.filter(
      (entry) => entry.id !== item.id
    )
    await saveSettings()
    ElMessage.success(t('settingManager.deleteSuccess'))
  } catch (error) {
    if (error !== 'cancel') console.error('删除设定失败:', error)
  }
}

function destroyItemSortable() {
  if (itemSortable.value && typeof itemSortable.value.destroy === 'function') {
    itemSortable.value.destroy()
  }
  itemSortable.value = null
}

function initItemSortable() {
  destroyItemSortable()
  if (!isLeafCategory.value || !tableRef.value) return

  const tableEl = tableRef.value?.$el
  const tbody = tableEl?.querySelector('.el-table__body-wrapper tbody')
  if (!tbody) return

  itemSortable.value = Sortable.create(tbody, {
    animation: 180,
    onEnd: async ({ oldIndex, newIndex }) => {
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return
      const items = currentCategory.value?.items
      if (!Array.isArray(items)) return

      const movedItem = items.splice(oldIndex, 1)[0]
      if (!movedItem) return
      items.splice(newIndex, 0, movedItem)

      try {
        await saveSettings()
      } catch {
        // 保存失败提示在 saveSettings 内处理
      }
    }
  })
}

watch(
  () => [activeCategoryId.value, currentItems.value.length, isLeafCategory.value],
  () => {
    nextTick(() => {
      initItemSortable()
    })
  }
)

onMounted(async () => {
  await loadSettings()
  await nextTick()
  initItemSortable()
})

onBeforeUnmount(() => {
  destroyItemSortable()
})
</script>

<style lang="scss" scoped>
.setting-manager {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.category-panel,
.setting-panel {
  min-height: 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  padding: 16px;
  box-sizing: border-box;
}

.category-panel {
  display: flex;
  flex-direction: column;
  background: var(--bg-soft);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.setting-panel {
  .panel-header {
    align-items: flex-start;
  }
}

.panel-title {
  margin: 0;
  color: var(--text-base);
  font-size: 16px;
  font-weight: 600;
}

.panel-description {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.category-tree {
  flex: 1;
  overflow-y: auto;
  background: transparent;
  --el-tree-node-hover-bg-color: var(--bg-mute);
}

:deep(.el-tree-node__content) {
  height: auto;
  min-height: 34px;
  padding: 0 8px 0 0;
  border-radius: 6px;
  color: var(--text-base);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--bg-mute);
}

:deep(.el-tree-node__expand-icon) {
  color: var(--text-secondary);
}

.category-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
  font-size: 13px;
  overflow: hidden;

  &:hover {
    .category-actions {
      opacity: 1;
    }
  }

  &.active {
    .category-name {
      color: var(--el-color-primary);
      font-weight: 600;
    }
  }
}

.category-info {
  min-width: 0;
  display: flex;
  align-items: center;
  flex: 1;
}

.category-name {
  flex: 1;
  color: var(--text-base);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-actions {
  opacity: 0;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  padding-right: 6px;
  color: var(--text-secondary);
  transition: opacity 0.2s;

  .el-icon {
    cursor: pointer;

    &:hover {
      color: var(--el-color-primary);
    }
  }

  .danger-action:hover {
    color: var(--el-color-danger);
  }
}

.setting-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.category-introduction {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 6px;
  background: var(--bg-soft);
  color: var(--text-base);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.leaf-only-alert {
  margin-bottom: 16px;
}

.setting-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.setting-name {
  font-weight: 600;
  color: var(--text-base);
}

.setting-introduction {
  color: var(--text-base);
  line-height: 1.6;
  white-space: pre-wrap;
}

.setting-action-column {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .el-button {
    margin-left: 0;
  }
}
</style>
