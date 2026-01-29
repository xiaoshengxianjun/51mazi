<template>
  <Teleport to="body">
    <Transition name="encourage-fade">
      <div v-if="modelValue" class="encourage-toast" role="status" aria-live="polite">
        <div class="encourage-toast__content">
          <div class="encourage-toast__title">给正在写作的你</div>
          <div class="encourage-toast__message">{{ message }}</div>
        </div>
        <button
          class="encourage-toast__close"
          type="button"
          aria-label="关闭提示"
          @click="handleClose"
        >
          <el-icon><Close /></el-icon>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  message: { type: String, default: '' },
  duration: { type: Number, default: 5000 } // 自动关闭时间（ms）
})

const emit = defineEmits(['update:modelValue', 'close'])

let autoCloseTimer = null

function clearAutoCloseTimer() {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
}

function startAutoCloseTimer() {
  clearAutoCloseTimer()
  autoCloseTimer = setTimeout(
    () => {
      emit('update:modelValue', false)
      emit('close', { reason: 'timeout' })
    },
    Math.max(0, props.duration)
  )
}

function handleClose() {
  clearAutoCloseTimer()
  emit('update:modelValue', false)
  emit('close', { reason: 'manual' })
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) startAutoCloseTimer()
    else clearAutoCloseTimer()
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  clearAutoCloseTimer()
})
</script>

<style lang="scss" scoped>
.encourage-toast {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;

  display: flex;
  align-items: flex-start;
  gap: 10px;

  width: min(360px, calc(100vw - 32px));
  padding: 12px 12px 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-soft);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.14);
  color: var(--text-base);
}

.encourage-toast__content {
  flex: 1;
  min-width: 0;
}

.encourage-toast__title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 6px;
}

.encourage-toast__message {
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-gray);
  word-break: break-word;
}

.encourage-toast__close {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-gray);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--bg-mute);
    color: var(--text-base);
  }
}

.encourage-fade-enter-active,
.encourage-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.encourage-fade-enter-from,
.encourage-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
