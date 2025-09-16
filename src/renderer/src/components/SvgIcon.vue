<template>
  <svg
    :class="['svg-icon', className]"
    :style="{ width: size + 'px', height: size + 'px' }"
    @click="handleClick"
  >
    <use :xlink:href="`#icon-${name}`"></use>
  </svg>
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
.svg-icon {
  fill: currentColor;
  vertical-align: middle;
  overflow: hidden;
  display: inline-block;
}
</style>
