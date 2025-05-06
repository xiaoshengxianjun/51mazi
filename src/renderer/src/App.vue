<script setup>
import Bookshelf from './components/Bookshelf.vue'
</script>

<template>
  <div class="app-container">
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="logo">
        <img src="/src/assets/images/logo_big.png" alt="logo" class="logo-img" />
      </div>
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

    <!-- 书架区 -->
    <Bookshelf />
  </div>
</template>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

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
  padding: 0 20px;
  margin-bottom: 30px;
}

.logo-img {
  display: block;
  width: 100%;
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

.menu-item:hover,
.menu-item.active {
  background-color: #e0e7ff;
  // color: #6366f1;
}
</style>
