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

    <!-- 边角设置（仅在选择矩形或五角形时显示） -->
    <div v-if="selectedShape === 'rect' || selectedShape === 'star'" class="roundness-selector">
      <div class="roundness-label">边角</div>
      <div class="roundness-options">
        <div
          :class="['roundness-item', { active: roundness === 'round' }]"
          @click="handleRoundnessSelect('round')"
        >
          <div class="roundness-icon round" title="圆角"></div>
        </div>
        <div
          :class="['roundness-item', { active: roundness === 'sharp' }]"
          @click="handleRoundnessSelect('sharp')"
        >
          <div class="roundness-icon sharp" title="尖角"></div>
        </div>
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
  },
  roundness: {
    type: String,
    default: 'round'
  }
})

const emit = defineEmits(['update:modelValue', 'update:roundness'])

const selectedShape = ref(props.modelValue)

const shapes = [
  { type: 'line', icon: 'line' },
  { type: 'circle', icon: 'circle' },
  { type: 'rect', icon: 'rect' },
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

function handleRoundnessSelect(type) {
  emit('update:roundness', type)
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

.roundness-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #e5e5e5;
}

.roundness-label {
  font-size: 11px;
  color: #666;
  font-weight: 500;
  padding: 0 4px;
}

.roundness-options {
  display: flex;
  gap: 4px;
  padding: 4px;
}

.roundness-item {
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

.roundness-icon {
  width: 20px;
  height: 20px;
  border: 1.5px solid #333;
  border-radius: 3px;

  &.round {
    border-radius: 6px;
  }

  &.sharp {
    border-radius: 0;
  }
}
</style>
