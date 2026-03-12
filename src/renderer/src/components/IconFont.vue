<template>
  <i
    :class="['iconfont', `icon-${name}`, className]"
    :style="{ fontSize: size + 'px', color: color }"
    @click="handleClick"
  ></i>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: 16
  },
  color: {
    type: String,
    default: 'currentColor'
  },
  className: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  emit('click', event)
}
</script>

<style scoped>
.iconfont {
  font-style: normal;
  vertical-align: baseline;
  text-align: center;
  text-transform: none;
  line-height: 1;
  text-rendering: optimizeLegibility;
  display: inline-block;
}
</style>
