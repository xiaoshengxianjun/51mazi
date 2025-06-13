<template>
  <div class="map-list">
    <div class="header">
      <el-button class="back-btn" @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
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
          <el-input v-model="createForm.name" placeholder="请输入地图名称" />
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
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
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

const handleCreateMap = async () => {
  if (!createFormRef.value) return

  try {
    await createFormRef.value.validate()
    creating.value = true

    await window.electron.createBlankMap({
      bookName,
      mapName: createForm.value.name,
      width: createForm.value.width,
      height: createForm.value.height
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
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;

      .map-item {
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        background: var(--bg-soft);
        transition: transform 0.2s;

        &:hover {
          transform: translateY(-2px);
        }

        .map-image {
          width: 100%;
          height: 150px;
          overflow: hidden;

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
