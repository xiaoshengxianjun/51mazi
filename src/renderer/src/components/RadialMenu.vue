<template>
  <div class="radial-menu-panel">
    <svg class="radial-menu-svg" width="160" height="160" viewBox="0 0 400 400">
      <path
        class="c-svg-button"
        :class="{ active: hover === 'info' }"
        d="M9.99,187.09c0,-40.82 27.53,-97.86 62.21,-128.85c32.5,-29.07 66.91,-43.91 114.6,-49.41l7.15,-0.82l0,61.85l0,61.92l-4.5,0c-23.57,0 -58.05,34.02 -58.19,57.38l0,4.47l-60.64,0l-60.64,0l0,-6.53z"
        @mouseenter="hover = 'info'"
        @mouseleave="hover = ''"
        @click.stop="$emit('info')"
      />
      <path
        class="c-svg-button"
        :class="{ active: hover === 'delete' }"
        d="M269.59,188.46c-4.36,-26.73 -34.27,-56.7 -56.69,-56.7l-3.95,0l0,-61.78l0,-61.71l7.84,0.69c91.98,8.52 166.11,82.6 174.22,174l0.95,10.65l-60.78,0l-60.78,0l-0.82,-5.15z"
        @mouseenter="hover = 'delete'"
        @mouseleave="hover = ''"
        @click.stop="handleDelete"
      />
      <path
        class="c-svg-button"
        :class="{ active: hover === 'link' }"
        d="M176.93,393.32c-89.32,-11.68 -166.93,-94.36 -166.93,-177.92l0,-6.67l60.44,0l60.5,0l0.68,5.98c2.52,23.09 29.03,50.99 52.12,55.05c11.31,1.99 10.22,-4.88 10.22,63.43l0,61.09l-6.47,-0.21c-3.54,-0.14 -8.31,-0.41 -10.56,-0.76z"
        @mouseenter="hover = 'link'"
        @mouseleave="hover = ''"
        @click.stop="$emit('link')"
      />
      <path
        class="c-svg-button"
        :class="{ active: hover === 'add' }"
        d="M209.29,332.99l0.34,-61.57l7.49,-1.65c7.09,-1.51 11.51,-3.23 21.12,-8.45c6.06,-3.23 20.03,-18.28 23.44,-25.22c4.97,-10.17 7.22,-15.94 7.22,-18.62c0,-1.37 0.41,-3.92 0.89,-5.64l0.82,-3.09l60.44,0l60.5,0l0,5.15c-0.07,86.31 -81.63,171.87 -171.36,179.78l-11.24,0.96l0.34,-61.64z"
        @mouseenter="hover = 'add'"
        @mouseleave="hover = ''"
        @click.stop="$emit('add')"
      />
    </svg>
    <!-- 四个icon绝对定位到四个象限 -->
    <div
      class="icon info"
      @click.stop="$emit('info')"
      @mouseenter="hover = 'info'"
      @mouseleave="hover = ''"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <g>
          <g>
            <path
              d="M11.5,15.001c0,0.643,1,0.645,1,0l0,0v-4.018c0-0.643-1-0.645-1,0V15.001z"
            ></path>
            <circle cx="12" cy="9.001" r="0.5"></circle>
          </g>
          <path
            d="M12,2.067c5.478,0,9.934,4.456,9.934,9.933S17.478,21.933,12,21.933S2.066,17.477,2.066,12 S6.522,2.067,12,2.067z M12,20.933c4.926,0,8.934-4.007,8.934-8.933S16.926,3.067,12,3.067S3.066,7.074,3.066,12 S7.074,20.933,12,20.933z"
          ></path>
        </g>
      </svg>
    </div>
    <div
      class="icon delete"
      @click.stop="handleDelete"
      @mouseenter="hover = 'delete'"
      @mouseleave="hover = ''"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <g>
          <path
            d="M6,19c0,1.1,0.9,2,2,2h8c1.1,0,2-0.9,2-2V7H6V19z M19,4h-3.5l-1-1h-5l-1,1H5v2h14V4z"
          />
        </g>
      </svg>
    </div>
    <div
      class="icon link"
      @click.stop="$emit('link')"
      @mouseenter="hover = 'link'"
      @mouseleave="hover = ''"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <g>
          <path
            d="M3.065,16.16c0-0.65,1-0.65,1,0v3.07l0.01-0.01c2.02-2.02,4.05-4.05,6.07-6.07 c0.46-0.45,1.16,0.25,0.71,0.71c-0.29,0.29-0.58,0.57-0.87,0.86c-1.74,1.74-3.47,3.48-5.21,5.22h3.07c0.65,0,0.64,1,0,1h-4.28 c-0.15,0-0.26-0.05-0.34-0.14c-0.01-0.01-0.02-0.01-0.02-0.02c-0.07-0.06-0.12-0.15-0.13-0.26 C3.066,20.442,3.065,16.16,3.065,16.16z"
          ></path>
          <path
            d="M20.935,3.56v4.28c0,0.65-1,0.65-1,0V4.77l-0.01,0.01c-2.03,2.02-4.05,4.05-6.07,6.07 c-0.46,0.45-1.16-0.25-0.71-0.71c0.29-0.29,0.58-0.57,0.86-0.86c1.75-1.74,3.48-3.48,5.22-5.22h-3.07c-0.65,0-0.65-1,0-1h4.28 c0.15,0,0.26,0.05,0.34,0.14c0.01,0.01,0.02,0.01,0.02,0.02C20.885,3.3,20.935,3.41,20.935,3.56z"
          ></path>
        </g>
      </svg>
    </div>
    <div
      class="icon add"
      @click.stop="$emit('add')"
      @mouseenter="hover = 'add'"
      @mouseleave="hover = ''"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <g>
          <path
            d="M15.001,12.501h-2.5v2.5c0,0.64-1,0.64-1,0v-2.5h-2.5c-0.65,0-0.64-1,0-1h2.5v-2.5 c0-0.64,1-0.64,1,0v2.5h2.5C15.641,11.501,15.641,12.501,15.001,12.501z"
          ></path>
          <path
            d="M12,21.933c-5.477,0-9.933-4.456-9.933-9.933S6.523,2.067,12,2.067S21.933,6.523,21.933,12 S17.477,21.933,12,21.933z M12,3.067c-4.926,0-8.933,4.007-8.933,8.933S7.074,20.933,12,20.933s8.933-4.007,8.933-8.933 S16.926,3.067,12,3.067z"
          ></path>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
/**
 * 环绕菜单组件
 * @prop {Boolean} isRoot 是否为根节点，根节点不显示删除按钮
 * @emits info, add, link, delete
 */
const props = defineProps({
  isRoot: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['info', 'add', 'link', 'delete'])
const hover = ref('')

const handleDelete = () => {
  if (props.isRoot) {
    ElMessage.error('根节点不能删除')
    return
  }
  emit('delete')
}
</script>

<style scoped>
.radial-menu-panel {
  position: absolute;
  /* left: 50%;
  top: 50%;
  transform: translate(-50%, -50%); */
  z-index: 999;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  animation: radialMenuEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes radialMenuEnter {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
}

.radial-menu-panel.leave {
  animation: radialMenuLeave 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes radialMenuLeave {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.3) rotate(180deg);
  }
}
.radial-menu-svg {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
  cursor: pointer;
}
.c-svg-button {
  transition:
    filter 0.2s,
    fill 0.2s;
  cursor: pointer;
  fill: #1a161ca6;
}
.c-svg-button.active,
.c-svg-button:hover {
  fill: #1a171cd9;
}
.icon {
  position: absolute;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: none;
  pointer-events: auto;
  cursor: pointer;
}
.icon.info {
  left: 25px;
  top: 25px;
}
.icon.link {
  left: 25px;
  bottom: 25px;
}
.icon.add {
  right: 25px;
  bottom: 25px;
}
.icon.delete {
  right: 25px;
  top: 25px;
}
</style>
