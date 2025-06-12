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

      <div class="editor-container">
        <!-- 这里将来会集成地图编辑器组件 -->
        <div class="editor-placeholder">地图编辑器区域</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const mapName = ref('')
const isEdit = computed(() => !!route.query.id)

// 如果是编辑模式，这里需要加载地图数据
if (isEdit.value) {
  // TODO: 根据id加载地图数据
  mapName.value = '示例地图'
}

const handleBack = () => {
  router.back()
}

const handleSave = () => {
  if (!mapName.value) {
    ElMessage.warning('请输入地图名称')
    return
  }

  // TODO: 保存地图数据
  ElMessage.success('保存成功')
  router.push('/map-list')
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

      .editor-placeholder {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
        font-size: 16px;
      }
    }
  }
}
</style>
