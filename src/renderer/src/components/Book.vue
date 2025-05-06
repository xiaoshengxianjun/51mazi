<template>
  <div class="book">
    <div class="cover">
      <img :src="coverUrl" :alt="title" />
    </div>
    <div class="info">
      <h3>{{ title }}</h3>
      <p class="type">{{ type }}</p>
      <p class="stats">
        <span>字数：{{ wordCount }}</span>
        <span>更新：{{ updateTime }}</span>
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  type: String,
  wordCount: String,
  updateTime: String,
  coverUrl: String
})
</script>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

.book {
  width: 250px;
  height: max-content;
  background: white;
  border-radius: $border-radius;
  overflow: hidden;
  box-shadow: $shadow;
  transition: transform $transition-time;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
  }

  .cover {
    width: 100%;
    height: 347px;
    overflow: hidden;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .info {
    padding: 10px;

    h3 {
      margin-bottom: 5px;
      font-size: 15px;
      font-weight: 500;
      color: $text-primary;
      padding: 0;
      line-height: normal;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .type {
      color: $text-secondary;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: $text-primary;
      font-style: italic;
    }
  }
}
</style>
