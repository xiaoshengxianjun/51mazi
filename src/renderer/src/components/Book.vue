<template>
  <div
    class="book"
    :class="{ 'has-cover-image': hasCoverImage }"
    :style="{ backgroundColor: coverColor }"
    @click="emit('onOpen')"
    @contextmenu.prevent="showMenu($event)"
  >
    <!-- 书脊：只在没有封面图片时显示 -->
    <div v-if="!hasCoverImage" class="spine">
      <div v-for="i in 4" :key="i" class="stitch"></div>
    </div>
    <div class="cover-bg" :style="coverBgStyle">
      <!-- 标题块：只在没有封面图片时显示 -->
      <div v-if="!hasCoverImage" class="title-block">
        <div class="vertical-title" :style="{ fontSize: getTitleFontSize() + 'px' }">
          {{ name }}
        </div>
      </div>
      <!-- 插画区域：只在没有封面图片时显示 -->
      <div v-if="!hasCoverImage" class="cover-illustration">
        <slot name="cover-illustration">
          <!-- 可插入插画SVG或图片 -->
        </slot>
      </div>
    </div>
    <!-- 信息区域：有封面图片时默认隐藏，悬停时显示 -->
    <div class="info" :class="{ 'show-on-hover': hasCoverImage }">
      <div class="type">{{ typeName }}</div>
      <div class="stats">
        <div class="word-count">字数：{{ totalWords }}</div>
        <div class="update-time">更新：{{ formattedUpdatedAt }}</div>
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
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const emit = defineEmits(['onOpen', 'onEdit', 'onDelete'])
const props = defineProps({
  id: String,
  name: String,
  type: String,
  typeName: String,
  totalWords: {
    type: [String, Number],
    default: '0'
  },
  updatedAt: {
    type: String,
    default: '暂无更新'
  },
  coverUrl: String,
  coverColor: {
    type: String,
    default: '#22345c'
  },
  bookName: String // 用于构建封面图片路径
})

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const coverImageUrl = ref('')

// 判断是否有封面图片
const hasCoverImage = computed(() => {
  return !!coverImageUrl.value
})

// 封面背景样式
const coverBgStyle = computed(() => {
  if (coverImageUrl.value) {
    return {
      backgroundImage: `url(${coverImageUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  }
  return {}
})

// 加载封面图片
async function loadCoverImage() {
  if (!props.coverUrl || !props.bookName) {
    coverImageUrl.value = ''
    return
  }
  try {
    const booksDir = await window.electronStore.get('booksDir')
    const coverPath = `${booksDir}/${props.bookName}/${props.coverUrl}`
    // 添加时间戳参数避免浏览器缓存
    // 使用 updatedAt 的时间戳，确保书籍更新时图片也会刷新
    // 如果 updatedAt 不可用，使用当前时间戳
    let timestamp = Date.now()
    if (props.updatedAt && props.updatedAt !== '暂无更新') {
      try {
        const date = new Date(props.updatedAt)
        if (!isNaN(date.getTime())) {
          timestamp = date.getTime()
        }
      } catch (e) {
        // 如果解析失败，使用当前时间戳
      }
    }
    coverImageUrl.value = `file://${coverPath}?t=${timestamp}`
  } catch (error) {
    console.error('加载封面图片失败:', error)
    coverImageUrl.value = ''
  }
}

onMounted(() => {
  loadCoverImage()
})

// 监听封面URL、书名和更新时间变化
// 当 updatedAt 变化时也会重新加载图片，确保封面图片更新后能正确显示
watch(
  () => [props.coverUrl, props.bookName, props.updatedAt],
  () => {
    loadCoverImage()
  },
  { immediate: false }
)

// 格式化更新时间
const formattedUpdatedAt = computed(() => {
  if (!props.updatedAt || props.updatedAt === '暂无更新') {
    return '暂无更新'
  }
  const date = dayjs(props.updatedAt)
  return date.isValid() ? date.format('YYYY/MM/DD HH:mm:ss') : props.updatedAt
})

// 根据书名长度动态计算字号
function getTitleFontSize() {
  const nameLength = props.name ? props.name.length : 0
  if (nameLength <= 4) {
    return 28
  } else if (nameLength === 5) {
    return 26
  } else if (nameLength === 6) {
    return 24
  } else if (nameLength === 7) {
    return 22
  } else {
    return 20
  }
}

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
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.15);
  overflow: hidden; // 有封面图片时隐藏溢出
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

  // 有封面图片时的样式
  &.has-cover-image {
    overflow: hidden;
    .cover-bg {
      padding: 0; // 移除内边距，让图片占满整个区域
      border-radius: 8px;
    }
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
    .stitch {
      width: 20px;
      height: 2px;
      background: #e5e2d7;
    }
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

    // 有封面图片时，移除内边距，让图片占满
    .has-cover-image & {
      padding: 0;
    }
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
    padding: 0;
  }
  .vertical-title {
    writing-mode: vertical-rl;
    line-height: 1.2;
    font-weight: bold;
    color: #22345c;
    text-align: center;
    font-family: 'STKaiti', 'KaiTi', serif;
    // 字号通过内联样式动态设置
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
    padding: 8px 8px 8px 32px;
    background: transparent;
    font-size: 14px;
    color: #f9f6e7;
    font-family: 'STKaiti', 'KaiTi', serif;
    letter-spacing: 1px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    transition:
      opacity 0.3s ease,
      transform 0.3s ease;

    // 有封面图片时，默认隐藏，悬停时显示
    &.show-on-hover {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.85) 0%,
        rgba(0, 0, 0, 0.7) 60%,
        transparent 100%
      );
      opacity: 0;
      transform: translateY(100%);
      pointer-events: none;
      z-index: 10; // 确保信息显示在图片上方
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }

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
      font-size: 13px;
      color: #fff;
      font-family: 'STKaiti', 'KaiTi', serif;
    }
  }

  // 悬停时显示信息
  &.has-cover-image:hover {
    .info.show-on-hover {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
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
