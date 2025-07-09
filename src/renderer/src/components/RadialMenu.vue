<template>
  <div class="radial-menu">
    <button class="menu-item info" @click.stop="$emit('info')" title="信息">
      <span>i</span>
    </button>
    <button class="menu-item add" @click.stop="$emit('add')" title="新增">
      <span>+</span>
    </button>
    <button class="menu-item link" @click.stop="$emit('link')" title="连线">
      <span>⛓️</span>
    </button>
    <button v-if="!isRoot" class="menu-item delete" @click.stop="$emit('delete')" title="删除">
      <span>🗑️</span>
    </button>
  </div>
</template>

<script setup>
/**
 * 环绕菜单组件
 * @prop {Boolean} isRoot 是否为根节点，根节点不显示删除按钮
 * @emits info, add, link, delete
 */
defineProps({
  isRoot: Boolean
})
</script>

<style scoped>
.radial-menu {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.menu-item {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
}
.menu-item:hover {
  background: #f0f0f0;
}
.menu-item.info {
  left: 50%;
  top: 0;
  transform: translate(-50%, 0);
}
.menu-item.add {
  right: 0;
  top: 50%;
  transform: translate(0, -50%);
}
.menu-item.link {
  left: 50%;
  bottom: 0;
  transform: translate(-50%, 0);
}
.menu-item.delete {
  left: 0;
  top: 50%;
  transform: translate(0, -50%);
  color: #f56c6c;
}
</style>
