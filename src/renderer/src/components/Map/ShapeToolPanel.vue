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

    <!-- 边角设置（仅在选择矩形时显示） -->
    <div v-if="selectedShape === 'rect'" class="roundness-selector">
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
    default: 'rect'
  },
  roundness: {
    type: String,
    default: 'round'
  }
})

const emit = defineEmits(['update:modelValue', 'update:roundness'])

const selectedShape = ref(props.modelValue)

const shapes = [
  { type: 'circle', icon: 'circle' },
  { type: 'rect', icon: 'rect' },
  { type: 'star', icon: 'star' }
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
  gap: 16px;
  padding: 12px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.shape-selector {
  display: flex;
  gap: 8px;
}

.shape-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(64, 158, 255, 0.1);
  }

  &.active {
    background-color: rgba(64, 158, 255, 0.2);
  }
}

.roundness-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.roundness-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.roundness-options {
  display: flex;
  gap: 8px;
}

.roundness-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(64, 158, 255, 0.1);
  }

  &.active {
    background-color: rgba(64, 158, 255, 0.2);
  }

  span {
    font-size: 12px;
    color: #000;
  }
}

.roundness-icon {
  width: 24px;
  height: 24px;
  border: 2px solid #000;
  border-radius: 4px;

  &.round {
    border-radius: 8px;
  }

  &.sharp {
    border-radius: 0;
  }
}
</style>
