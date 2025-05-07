<template>
  <div class="book" @contextmenu.prevent="showMenu($event)">
    <div class="cover">
      <img :src="coverUrl" :alt="name" />
    </div>
    <div class="info">
      <h3>{{ name }}</h3>
      <p class="type">{{ type }}</p>
      <p class="stats">
        <span>字数：{{ wordCount }}</span>
        <span>更新：{{ updateTime }}</span>
      </p>
    </div>
    <el-dropdown
      v-if="menuVisible"
      ref="dropdownRef"
      :visible="menuVisible"
      trigger="manual"
      :teleported="false"
      :style="{ position: 'fixed', left: menuX + 'px', top: menuY + 'px', zIndex: 9999 }"
      @visible-change="onMenuVisibleChange"
    >
      <span></span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="handleEdit">编辑</el-dropdown-item>
          <el-dropdown-item divided @click="handleDelete">删除</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
const emit = defineEmits(['edit', 'delete'])
defineProps({
  name: String,
  type: String,
  wordCount: String,
  updateTime: String,
  coverUrl: String
})

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const dropdownRef = ref(null)

function showMenu(e) {
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
  nextTick(() => {
    dropdownRef.value?.show?.()
  })
}
function onMenuVisibleChange(val) {
  if (!val) menuVisible.value = false
}
function handleEdit() {
  emit('edit')
  menuVisible.value = false
}
function handleDelete() {
  emit('delete')
  menuVisible.value = false
}
</script>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

.book {
  width: 250px;
  height: max-content;
  background: white;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $shadow;
  transition: transform $transition-time;
  cursor: pointer;

  // &:hover {
  //   transform: translateY(-5px);
  // }

  .cover {
    width: 100%;
    height: 347px;
    overflow: hidden;
    background-color: #1e3d59;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .info {
    padding: 10px;

    h3 {
      margin-bottom: 5px;
      font-size: 15px;
      font-weight: 500;
      color: $text-primary;
      padding: 0;
      line-height: normal;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .type {
      color: $text-secondary;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: $text-primary;
      font-style: italic;
    }
  }
}
</style>
