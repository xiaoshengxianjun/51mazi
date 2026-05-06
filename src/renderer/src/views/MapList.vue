<template>
  <LayoutTool :title="t('mapList.title')">
    <template #headrAction>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        <span>{{ t('mapList.create') }}</span>
      </el-button>
    </template>
    <template #default>
      <div class="map-grid">
        <el-dropdown
          v-for="map in maps"
          :key="map.id"
          trigger="contextmenu"
          @command="handleCommand($event, map)"
        >
          <div class="map-item">
            <div class="map-image" @click="handleEditMap(map)">
              <img :src="map.thumbnail" :alt="map.name" />
            </div>
            <div class="map-info">
              <span class="map-name">{{ map.name }}</span>
            </div>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">{{ t('common.edit') }}</el-dropdown-item>
              <el-dropdown-item command="delete" divided>{{ t('common.delete') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-empty v-if="maps.length === 0" :image-size="200" :description="t('mapList.empty')" />
    </template>
  </LayoutTool>

  <!-- 创建地图弹框 -->
  <el-dialog
    v-model="showCreateDialog"
    :title="t('mapList.createDialogTitle')"
    width="400px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="createFormRef"
      :model="createForm"
      :rules="rules"
      label-width="80px"
      @submit.prevent="handleCreateMap"
    >
      <el-form-item :label="t('mapList.name')" prop="name">
        <el-input
          v-model="createForm.name"
          clearable
          maxlength="20"
          :placeholder="t('mapList.namePlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="t('mapList.description')" prop="description">
        <el-input
          v-model="createForm.description"
          type="textarea"
          :rows="4"
          maxlength="200"
          :placeholder="t('mapList.descriptionPlaceholder')"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showCreateDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateMap">
          {{ t('mapList.create') }}
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 删除确认弹框 -->
  <el-dialog
    v-model="deleteDialogVisible"
    :title="t('mapList.deleteTitle')"
    width="500px"
    :close-on-click-modal="false"
  >
    <span>{{ t('mapList.deleteConfirm', { name: selectedMap?.name || '' }) }}</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="deleteDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="danger" @click="confirmDelete">{{ t('mapList.deleteConfirmBtn') }}</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name
const { t } = useI18n()

const maps = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const deleteDialogVisible = ref(false)
const selectedMap = ref(null)

const createForm = ref({
  name: '',
  description: ''
})

const rules = {
  name: [
    { required: true, message: t('mapList.ruleNameRequired'), trigger: 'blur' },
    { min: 1, max: 20, message: t('mapList.ruleNameLength'), trigger: 'blur' }
  ],
  description: [{ max: 200, message: t('mapList.ruleDescLength'), trigger: 'blur' }]
}

// 加载地图列表
const loadMaps = async () => {
  try {
    const result = await window.electron.readMaps(bookName)
    maps.value = result
  } catch (error) {
    console.error('加载地图列表失败:', error)
    ElMessage.error(t('mapList.loadFailed'))
  }
}

onMounted(() => {
  loadMaps()
})

// 生成空白图片的函数（无限画板使用默认尺寸）
function createBlankPngBase64() {
  const canvas = document.createElement('canvas')
  // 无限画板使用默认尺寸，后续会根据实际绘制内容动态调整
  canvas.width = 1920
  canvas.height = 1080
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

// 创建地图
const handleCreateMap = async () => {
  if (!createFormRef.value) return

  try {
    await createFormRef.value.validate()
    creating.value = true

    // 用canvas生成空白图片（无限画板，使用默认尺寸）
    const imageData = createBlankPngBase64()
    // 保存地图名称用于跳转
    const createdMapName = createForm.value.name

    await window.electron.createMap({
      bookName,
      mapName: createdMapName,
      description: createForm.value.description || '',
      imageData
    })

    ElMessage.success('创建成功')
    showCreateDialog.value = false

    // 重置表单
    createForm.value = { name: '', description: '' }

    // 重新加载地图列表
    await loadMaps()

    // 跳转到编辑页面
    router.push({
      path: '/map-design',
      query: {
        name: bookName,
        id: createdMapName
      }
    })
  } catch (error) {
    console.error('创建地图失败:', error)
    ElMessage.error(error.message || '创建地图失败')
  } finally {
    creating.value = false
  }
}

// 编辑地图
const handleEditMap = (map) => {
  router.push({
    path: '/map-design',
    query: { name: bookName, id: map.name }
  })
}

// 处理右键菜单命令
const handleCommand = (command, map) => {
  switch (command) {
    case 'edit':
      handleEditMap(map)
      break
    case 'delete':
      selectedMap.value = map
      deleteDialogVisible.value = true
      break
  }
}

// 确认删除
const confirmDelete = async () => {
  if (!selectedMap.value) return

  try {
    await window.electron.deleteMap({
      bookName,
      mapName: selectedMap.value.name
    })
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    selectedMap.value = null
    // 重新加载地图列表
    loadMaps()
  } catch (error) {
    console.error('删除地图失败:', error)
    ElMessage.error('删除地图失败')
  }
}
</script>

<style lang="scss" scoped>
.map-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 10px;

  .map-item {
    width: 280px;
    cursor: pointer;

    &:hover {
      .map-image {
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
      }
    }

    .map-image {
      width: 100%;
      height: 210px;
      border-radius: 8px;
      overflow: hidden;
      transition: box-shadow 0.2s;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .map-info {
      padding: 12px;
      text-align: center;
      color: var(--text-base);

      .map-name {
        font-size: 16px;
      }
    }
  }
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
