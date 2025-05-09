<template>
  <div class="book" @click="emit('onOpen')" @contextmenu.prevent="showMenu($event)">
    <div class="spine"></div>
    <div class="cover-bg">
      <div class="title-block">
        <div class="vertical-title">{{ name }}</div>
      </div>
      <div class="cover-illustration">
        <slot name="cover-illustration">
          <!-- 可插入插画SVG或图片 -->
        </slot>
      </div>
    </div>
    <div class="info">
      <div class="type">{{ typeName }}</div>
      <div class="stats">
        <div>字数：{{ wordCount }}</div>
        <div>更新：{{ updateTime }}</div>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="menuVisible"
        :key="id"
        class="context-menu"
        :style="{ left: menuX + 'px', top: menuY + 'px' }"
        @click.stop
      >
        <div class="menu-item" @click="handleEdit">
          <el-icon><Edit /></el-icon> 编辑
        </div>
        <div class="menu-item delete" @click="handleDelete">
          <el-icon><Delete /></el-icon> 删除
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'

const emit = defineEmits(['onOpen', 'onEdit', 'onDelete'])
defineProps({
  id: String,
  name: String,
  type: String,
  typeName: String,
  wordCount: String,
  updateTime: String,
  coverUrl: String
})

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

function showMenu(e) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
  document.addEventListener('click', hideMenu)
}
function hideMenu() {
  menuVisible.value = false
  document.removeEventListener('click', hideMenu)
}
function handleEdit() {
  emit('onEdit')
  hideMenu()
}
function handleDelete() {
  emit('onDelete')
  hideMenu()
}

onBeforeUnmount(() => {
  document.removeEventListener('click', hideMenu)
})
</script>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

.book {
  position: relative;
  width: 220px;
  height: 310px;
  background: #22345c;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.15);
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 10px;
  border: 2px solid #e5e2d7;
  box-sizing: border-box;
  transition: transform 0.3s ease;
  cursor: pointer;
  &:hover {
    transform: scale(1.02);
  }

  .spine {
    position: absolute;
    left: 0;
    top: 0;
    width: 20px;
    height: 100%;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
    border-right: 2px solid #e5e2d7;
    z-index: 2;
  }

  .cover-bg {
    position: relative;
    flex: 1;
    border-radius: 8px;
    box-sizing: border-box;
    padding: 0 18px 0 32px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-start;
    height: 100%;
    overflow: hidden;
  }

  .title-block {
    position: absolute;
    right: 18px;
    top: 20px;
    width: 60px;
    height: 180px;
    background: #f9f6e7;
    border: 2px solid #bfae7c;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 3;
    padding: 8px 0;
  }
  .vertical-title {
    writing-mode: vertical-rl;
    font-size: 22px;
    line-height: 1.2;
    font-weight: bold;
    color: #22345c;
    letter-spacing: 1px;
    // margin-bottom: 8px;
    text-align: center;
    font-family: 'STKaiti', 'KaiTi', serif;
  }
  .subtitle {
    writing-mode: vertical-rl;
    font-size: 13px;
    color: #666;
    text-align: center;
    font-family: 'STKaiti', 'KaiTi', serif;
  }
  .cover-illustration {
    position: absolute;
    left: 40px;
    bottom: 20px;
    width: 120px;
    height: 60px;
    opacity: 0.22;
    z-index: 2;
  }

  .info {
    padding: 8px 16px 8px 36px;
    background: transparent;
    font-size: 14px;
    color: #f9f6e7;
    font-family: 'STKaiti', 'KaiTi', serif;
    letter-spacing: 1px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    .type {
      font-size: 16px;
      color: #fff;
      margin-bottom: 4px;
      font-family: 'STKaiti', 'KaiTi', serif;
    }
    .stats {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 14px;
      color: #fff;
      font-family: 'STKaiti', 'KaiTi', serif;
    }
  }
}
.context-menu {
  position: absolute;
  min-width: 100px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 999;
  padding: 4px 0;
  user-select: none;
  .menu-item {
    padding: 8px 20px;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    display: flex;
    align-items: center;
    gap: 4px;
    &:hover {
      background: #f5f7fa;
    }
    &.delete {
      color: #e74c3c;
    }
  }
}
</style>
