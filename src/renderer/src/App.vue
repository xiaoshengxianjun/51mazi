<script setup>
import { RouterView } from 'vue-router'
import { ElConfigProvider } from 'element-plus'
import { useElementLocale } from './i18n/element-locale'

const { elementLocale } = useElementLocale()
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <RouterView />
  </el-config-provider>
</template>

<style lang="scss" scoped></style>
