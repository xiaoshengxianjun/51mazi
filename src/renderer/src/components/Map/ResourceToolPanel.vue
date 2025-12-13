<template>
  <Transition name="fade">
    <div v-if="visible" ref="panelRef" class="resource-tool-panel-wrapper" @click.stop>
      <div class="resource-tool-panel">
        <div class="resource-grid">
          <div
            v-for="(resource, index) in resources"
            :key="index"
            class="resource-item"
            @click="handleResourceSelect(resource)"
            @mousedown="handleResourceMouseDown(resource, $event)"
          >
            <SvgIcon :name="resource.icon" :size="32" />
            <span class="resource-name">{{ resource.name }}</span>
          </div>
        </div>
        <div class="resource-tip">可拖拽任意资源图标到画布中</div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SvgIcon from '../SvgIcon.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['resource-select', 'resource-mousedown', 'update:visible'])

const panelRef = ref(null)

// 资源数据定义在组件内部，使用图标资源
const resources = [
  { name: '宫殿', icon: 'gongdian' },
  { name: '村庄', icon: 'cunzhuang' },
  { name: '房屋', icon: 'fangwu' },
  { name: '森林', icon: 'senlin' },
  { name: '山', icon: 'shanmai' },
  { name: '城市', icon: 'chengshi' },
  { name: '战场', icon: 'zhanchang' },
  { name: '城堡', icon: 'chengbao' },
  { name: '湖泊', icon: 'hubo' },
  { name: '沙漠', icon: 'shamo' }
]

// 点击外部关闭弹出层
function handleClickOutside(event) {
  if (props.visible && panelRef.value && !panelRef.value.contains(event.target)) {
    emit('update:visible', false)
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function handleResourceSelect(resource) {
  emit('resource-select', resource)
}

function handleResourceMouseDown(resource, event) {
  // 拖拽时立即关闭弹框
  emit('update:visible', false)
  emit('resource-mousedown', resource, event)
}
</script>

<style lang="scss" scoped>
.resource-tool-panel-wrapper {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

.resource-tool-panel {
  background: #ffffff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 420px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  margin-bottom: 8px;
}

.resource-tip {
  text-align: center;
  font-size: 12px;
  color: #909399;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  margin-top: 8px;
}

.resource-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  padding: 8px 4px;
  border-radius: 6px;

  &:hover {
    background-color: rgba(64, 158, 255, 0.08);
  }

  .resource-name {
    text-align: center;
    word-break: break-word;
    font-size: 12px;
    color: #606266;
  }
}
</style>
