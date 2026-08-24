<script setup>
import { useI18n } from 'vue-i18n'

/** 与写作指南、官网常量保持一致，点击后由主进程 shell.openExternal 打开 */
const officialWebsite = 'https://www.51mazi.com'
const officialWebsiteLabel = 'www.51mazi.com'

const { t } = useI18n()
</script>

<template>
  <!-- 停维护说明：始终展示，不可关闭 -->
  <p class="deprecated-notice" role="status">
    <span class="deprecated-notice__text">{{ t('home.sunsetNotice.text') }}</span>
    <a
      class="deprecated-notice__link"
      :href="officialWebsite"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ officialWebsiteLabel }}
    </a>
  </p>
</template>

<style lang="scss" scoped>
.deprecated-notice {
  flex: 1;
  min-width: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px 8px;
  padding: 0 16px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--danger-color);
  user-select: text;
}

.deprecated-notice__text {
  color: inherit;
}

.deprecated-notice__link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  word-break: break-all;

  &:hover {
    opacity: 0.85;
  }
}
</style>
