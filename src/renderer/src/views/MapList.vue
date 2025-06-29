<template>
  <LayoutTool title="地图列表">
    <template #headrAction>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        <span>创建地图</span>
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
              <el-dropdown-item command="edit">编辑</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-empty v-if="maps.length === 0" :image-size="200" description="暂无地图" />
    </template>
  </LayoutTool>

  <!-- 创建地图弹框 -->
  <el-dialog
    v-model="showCreateDialog"
    title="创建新地图"
    width="400px"
    :close-on-click-modal="false"
  >
    <el-form ref="createFormRef" :model="createForm" :rules="rules" label-width="80px">
      <el-form-item label="地图名称" prop="name">
        <el-input v-model="createForm.name" clearable maxlength="20" placeholder="请输入地图名称" />
      </el-form-item>
      <el-form-item label="宽度" prop="width">
        <el-input-number v-model="createForm.width" :min="100" :max="2000" :step="100" />
      </el-form-item>
      <el-form-item label="高度" prop="height">
        <el-input-number v-model="createForm.height" :min="100" :max="2000" :step="100" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateMap"> 创建 </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 删除确认弹框 -->
  <el-dialog
    v-model="deleteDialogVisible"
    title="确认删除"
    width="500px"
    :close-on-click-modal="false"
  >
    <span>确定要删除地图 "{{ selectedMap?.name }}" 吗？此操作不可恢复。</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确认删除</el-button>
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

const router = useRouter()
const route = useRoute()
const bookName = route.query.name

const maps = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const deleteDialogVisible = ref(false)
const selectedMap = ref(null)

const createForm = ref({
  name: '',
  width: 800,
  height: 600
})

const rules = {
  name: [
    { required: true, message: '请输入地图名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  width: [{ required: true, message: '请输入地图宽度', trigger: 'blur' }],
  height: [{ required: true, message: '请输入地图高度', trigger: 'blur' }]
}

// 加载地图列表
const loadMaps = async () => {
  try {
    const result = await window.electron.readMaps(bookName)
    maps.value = result
  } catch (error) {
    console.error('加载地图列表失败:', error)
    ElMessage.error('加载地图列表失败')
  }
}

onMounted(() => {
  loadMaps()
})

// 新增：生成空白图片的函数
function createBlankPngBase64(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  return canvas.toDataURL('image/png')
}

// 创建地图
const handleCreateMap = async () => {
  if (!createFormRef.value) return

  try {
    await createFormRef.value.validate()
    creating.value = true

    // 用canvas生成空白图片
    const imageData = createBlankPngBase64(createForm.value.width, createForm.value.height)
    await window.electron.createMap({
      bookName,
      mapName: createForm.value.name,
      imageData
    })

    ElMessage.success('创建成功')
    showCreateDialog.value = false

    // 重新加载地图列表
    await loadMaps()

    // 跳转到编辑页面
    router.push({
      path: '/map-design',
      query: {
        name: bookName,
        id: createForm.value.name
      }
    })
  } catch (error) {
    console.error('创建地图失败:', error)
    ElMessage.error('创建地图失败')
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
        object-fit: contain;
      }
    }

    .map-info {
      padding: 12px;
      text-align: center;
      color: var(--text-primary);

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
