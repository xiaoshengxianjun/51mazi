<template>
  <div class="map-list">
    <div class="header">
      <el-button class="back-btn" :icon="ArrowLeftBold" text @click="handleBack">
        <span>返回</span>
      </el-button>
      <h2>地图列表</h2>
      <el-button class="create-btn" type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        <span>创建地图</span>
      </el-button>
    </div>

    <div class="content">
      <div class="map-grid">
        <div v-for="map in maps" :key="map.id" class="map-item" @click="handleEditMap(map)">
          <div class="map-image">
            <img :src="map.thumbnail" :alt="map.name" />
          </div>
          <div class="map-name">{{ map.name }}</div>
        </div>
      </div>
      <el-empty v-if="maps.length === 0" :image-size="200" description="暂无地图" />
    </div>

    <!-- 创建地图弹框 -->
    <el-dialog
      v-model="showCreateDialog"
      title="创建新地图"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="createForm" :rules="rules" ref="createFormRef" label-width="80px">
        <el-form-item label="地图名称" prop="name">
          <el-input
            v-model="createForm.name"
            clearable
            maxlength="20"
            placeholder="请输入地图名称"
          />
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
          <el-button type="primary" @click="handleCreateMap" :loading="creating"> 创建 </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeftBold, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name

const maps = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref(null)

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

const handleBack = () => {
  router.back()
}

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

const handleCreateMap = async () => {
  if (!createFormRef.value) return

  try {
    await createFormRef.value.validate()
    creating.value = true

    // 用canvas生成空白图片
    const imageData = createBlankPngBase64(createForm.value.width, createForm.value.height)
    await window.electron.saveMap({
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

const handleEditMap = (map) => {
  router.push({
    path: '/map-design',
    query: {
      name: bookName,
      id: map.id
    }
  })
}
</script>

<style lang="scss" scoped>
.map-list {
  height: 100%;
  padding: 8px 16px;
  background-color: var(--bg-primary);
  height: 100vh;

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;

    .back-btn {
      margin-right: 16px;
    }

    h2 {
      margin: 0;
      font-size: 20px;
      color: var(--text-primary);
    }
  }

  .content {
    .map-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;

      .map-item {
        width: 280px;
        cursor: pointer;
        overflow: hidden;

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

        .map-name {
          padding: 12px;
          text-align: center;
          color: var(--text-primary);
        }
      }
    }
  }
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}
</style>
