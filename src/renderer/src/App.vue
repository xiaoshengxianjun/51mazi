<script setup>
import { ElConfigProvider } from 'element-plus'
import { useElementLocale } from './i18n/element-locale'
import AppUpdateDialog from './components/AppUpdateDialog.vue'
import { useAppUpdaterWindowEvents } from './composables/useAppUpdaterWindowEvents'

/** 与对应视图 `defineOptions({ name })` 一致，供 keep-alive include 匹配 */
const cachedRouteNames = ['Editor']

const { elementLocale } = useElementLocale()
useAppUpdaterWindowEvents()
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <AppUpdateDialog />
    <!-- 仅缓存编辑器页：避免写作助手子页往返时整页卸载导致侧栏/编辑区状态丢失；:key 按 fullPath 区分不同书籍 -->
    <router-view v-slot="{ Component, route }">
      <keep-alive :include="cachedRouteNames" :max="5">
        <component :is="Component" :key="route.fullPath" />
      </keep-alive>
    </router-view>
  </el-config-provider>
</template>

<style lang="scss" scoped></style>
