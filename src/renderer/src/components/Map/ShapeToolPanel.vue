<template>
  <Transition name="fade">
    <div v-if="visible" ref="panelRef" class="shape-tool-panel-wrapper" @click.stop>
      <div class="shape-tool-panel">
        <!-- 形状选择 -->
        <div class="shape-selector">
          <div
            v-for="shape in shapes"
            :key="shape.type"
            :class="['shape-item', { active: selectedShape === shape.type }]"
            @click="handleShapeSelect(shape.type)"
          >
            <SvgIcon :name="shape.icon" :size="20" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'line'
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'update:visible'])

const selectedShape = ref(props.modelValue)
const panelRef = ref(null)

const shapes = [
  { type: 'line', icon: 'line' },
  { type: 'circle', icon: 'circle' },
  { type: 'rect', icon: 'rect' },
  { type: 'rounded-rect', icon: 'rounded-rect' },
  { type: 'star', icon: 'star' },
  { type: 'arrow', icon: 'right-arrow' }
]

watch(
  () => props.modelValue,
  (val) => {
    selectedShape.value = val
  }
)

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

function handleShapeSelect(type) {
  selectedShape.value = type
  emit('update:modelValue', type)
  // 选择后关闭弹出层
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
.shape-tool-panel-wrapper {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

.shape-tool-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
  border-radius: 8px;
  min-width: 180px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.shape-selector {
  display: flex;
  gap: 4px;
  padding: 4px;
}

.shape-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: rgba(64, 158, 255, 0.08);
  }

  &.active {
    background-color: rgba(64, 158, 255, 0.15);
  }
}
</style>
