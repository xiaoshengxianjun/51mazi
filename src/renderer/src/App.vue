<script setup>
import { RouterView } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import { useElementLocale } from './i18n/element-locale'
import AppUpdateDialog from './components/AppUpdateDialog.vue'
import { useAppUpdaterWindowEvents } from './composables/useAppUpdaterWindowEvents'

const { elementLocale } = useElementLocale()
useAppUpdaterWindowEvents()
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <AppUpdateDialog />
    <RouterView />
  </el-config-provider>
</template>

<style lang="scss" scoped></style>
