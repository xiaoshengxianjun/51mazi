<template>
  <div class="map-design">
    <div class="header">
      <el-button class="back-btn" @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </el-button>
      <h2>{{ isEdit ? '编辑地图' : '创建地图' }}</h2>
      <el-button type="primary" @click="handleSave">保存地图</el-button>
    </div>

    <div class="content">
      <div class="toolbar">
        <el-input v-model="mapName" placeholder="请输入地图名称" class="map-name-input" />
      </div>

      <div class="editor-container" ref="editorContainerRef">
        <img
          v-if="mapImage"
          :src="mapImage"
          :style="imageStyle"
          @load="handleImageLoad"
          ref="mapImageRef"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name
const mapId = route.query.id

const mapName = ref('')
const isEdit = computed(() => !!mapId)
const mapImage = ref(null)
const editorContainerRef = ref(null)
const mapImageRef = ref(null)

// 计算图片样式，使其适应容器
const imageStyle = computed(() => {
  if (!mapImageRef.value) return {}

  const container = editorContainerRef.value
  const image = mapImageRef.value

  if (!container || !image) return {}

  const containerRatio = container.clientWidth / container.clientHeight
  const imageRatio = image.naturalWidth / image.naturalHeight

  if (containerRatio > imageRatio) {
    // 容器更宽，以高度为基准
    return {
      height: '100%',
      width: 'auto'
    }
  } else {
    // 容器更高，以宽度为基准
    return {
      width: '100%',
      height: 'auto'
    }
  }
})

// 加载地图图片
const loadMapImage = async () => {
  try {
    const result = await window.electron.readMaps(bookName)
    const map = result.find((m) => m.id === mapId)
    if (map) {
      mapImage.value = map.thumbnail
      mapName.value = map.name
    }
  } catch (error) {
    console.error('加载地图失败:', error)
    ElMessage.error('加载地图失败')
  }
}

// 图片加载完成后的处理
const handleImageLoad = () => {
  // 可以在这里添加图片加载完成后的处理逻辑
}

onMounted(() => {
  if (isEdit.value) {
    loadMapImage()
  }
})

const handleBack = () => {
  router.back()
}

const handleSave = async () => {
  if (!mapName.value) {
    ElMessage.warning('请输入地图名称')
    return
  }

  try {
    // TODO: 获取地图图片数据
    const imageData = 'data:image/png;base64,...' // 这里需要从地图编辑器获取实际的图片数据

    await window.electron.saveMap({
      bookName,
      mapName: mapName.value,
      imageData
    })

    ElMessage.success('保存成功')
    router.push({
      path: '/map-list',
      query: { name: bookName }
    })
  } catch (error) {
    console.error('保存地图失败:', error)
    ElMessage.error('保存地图失败')
  }
}
</script>

<style lang="scss" scoped>
.map-design {
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
    .toolbar {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;

      .map-name-input {
        width: 300px;
      }
    }

    .editor-container {
      height: calc(100vh - 200px);
      background: var(--bg-soft);
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;

      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }
  }
}
</style>
