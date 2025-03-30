<script setup>
import { ref } from 'vue'
import { Plus, ArrowDown } from '@element-plus/icons-vue'

// 模拟数据
const novels = ref([
  {
    id: 1,
    title: '月光森林秘境',
    author: '奇幻',
    wordCount: '128,567',
    updateTime: '2024-01-15',
    coverUrl: '/src/assets/covers/cover_demo.jpg'
  },
  {
    id: 2,
    title: '都市之巅',
    author: '都市',
    wordCount: '256,789',
    updateTime: '2024-01-14',
    coverUrl: '/src/assets/covers/cover_demo.jpg'
  },
  {
    id: 3,
    title: '长安幻梦',
    author: '古风',
    wordCount: '198,234',
    updateTime: '2024-01-13',
    coverUrl: '/src/assets/covers/cover_demo.jpg'
  },
  {
    id: 4,
    title: '赛博未来',
    author: '科幻',
    wordCount: '167,990',
    updateTime: '2024-01-12',
    coverUrl: '/src/assets/covers/cover_demo.jpg'
  }
])
</script>

<template>
  <div class="app-container">
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="logo">51码字</div>
      <div class="menu">
        <div class="menu-item active">
          <i class="el-icon-document"></i>
          我的作品
        </div>
        <div class="menu-item">
          <i class="el-icon-setting"></i>
          主题设置
        </div>
        <div class="menu-item">
          <i class="el-icon-setting"></i>
          系统设置
        </div>
        <div class="menu-item">
          <i class="el-icon-reading"></i>
          写作指南
        </div>
        <div class="menu-item">
          <i class="el-icon-question"></i>
          帮助中心
        </div>
        <div class="menu-item">
          <i class="el-icon-money"></i>
          打赏作者
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部操作栏 -->
      <div class="top-bar">
        <el-button type="primary" class="new-novel-btn">
          <el-icon><Plus /></el-icon>
          新建小说
        </el-button>
        <el-dropdown class="update-dropdown">
          <span class="el-dropdown-link">
            最近更新
            <el-icon class="el-icon--right">
              <arrow-down />
            </el-icon>
          </span>
        </el-dropdown>
      </div>

      <!-- 小说卡片网格 -->
      <div class="novel-grid">
        <div class="novel-card" v-for="novel in novels" :key="novel.id">
          <div class="cover">
            <img :src="novel.coverUrl" :alt="novel.title">
          </div>
          <div class="info">
            <h3>{{ novel.title }}</h3>
            <p class="author">{{ novel.author }}</p>
            <p class="stats">
              <span>字数：{{ novel.wordCount }}</span>
              <span>更新：{{ novel.updateTime }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- 图表区域占位 -->
      <div class="chart-area">
        <!-- 图表将在后续添加 -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background-color: #f5f7fa;
}

.sidebar {
  width: 200px;
  background-color: #f0f0ff;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
}

.logo {
  font-size: 24px;
  font-weight: bold;
  color: #6366f1;
  padding: 0 20px;
  margin-bottom: 30px;
}

.menu {
  display: flex;
  flex-direction: column;
}

.menu-item {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #666;
  transition: all 0.3s;
}

.menu-item:hover, .menu-item.active {
  background-color: #e0e7ff;
  color: #6366f1;
}

.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.new-novel-btn {
  display: flex;
  align-items: center;
  gap: 5px;
}

.novel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.novel-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.novel-card:hover {
  transform: translateY(-5px);
}

.cover {
  height: 200px;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  padding: 15px;
}

.info h3 {
  margin: 0 0 10px;
  font-size: 16px;
  color: #333;
}

.author {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.chart-area {
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-height: 300px;
  margin-top: 30px;
}
</style>
