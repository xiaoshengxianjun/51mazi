<template>
  <div class="map-list">
    <div class="header">
      <el-button class="back-btn" @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </el-button>
      <h2>地图列表</h2>
      <el-button class="create-btn" type="primary" @click="handleCreateMap">
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
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'

const router = useRouter()

// 模拟地图数据
const maps = ref([
  {
    id: 1,
    name: '世界地图',
    thumbnail: '/path/to/thumbnail1.jpg'
  },
  {
    id: 2,
    name: '城市地图',
    thumbnail: '/path/to/thumbnail2.jpg'
  }
])

const handleBack = () => {
  router.back()
}

const handleCreateMap = () => {
  router.push('/map-design')
}

const handleEditMap = (map) => {
  router.push({
    path: '/map-design',
    query: { id: map.id }
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
</style>
