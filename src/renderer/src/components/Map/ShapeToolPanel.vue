<template>
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
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'line'
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedShape = ref(props.modelValue)

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

function handleShapeSelect(type) {
  selectedShape.value = type
  emit('update:modelValue', type)
}
</script>

<style lang="scss" scoped>
.shape-tool-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
  border-radius: 8px;
  min-width: 180px;
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
