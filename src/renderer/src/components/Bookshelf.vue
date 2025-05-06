<template>
  <div class="bookshelf">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <el-button type="primary" class="new-book-btn" @click="dialogVisible = true">
        <el-icon><Plus /></el-icon>
        新建书籍
      </el-button>
      <el-dropdown class="update-dropdown">
        <span class="el-dropdown-link">
          最近更新
          <el-icon class="el-icon--right">
            <ArrowDown />
          </el-icon>
        </span>
      </el-dropdown>
    </div>

    <!-- 新建书籍弹窗 -->
    <el-dialog v-model="dialogVisible" title="新建书籍" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item prop="name" label="书名">
          <el-input v-model="form.name" placeholder="请输入书籍名称" />
        </el-form-item>
        <el-form-item prop="type" label="类型">
          <el-select v-model="form.type" placeholder="请选择类型">
            <el-option label="玄幻" value="fantasy" />
            <el-option label="仙侠" value="xianxia" />
            <el-option label="奇幻" value="fantasy" />
            <el-option label="都市" value="urban" />
            <el-option label="科幻" value="scifi" />
            <el-option label="武侠" value="wuxia" />
            <el-option label="言情" value="romance" />
            <el-option label="历史" value="historical" />
            <el-option label="悬疑" value="mystery" />
            <el-option label="军事" value="military" />
            <el-option label="游戏" value="game" />
            <el-option label="体育" value="sports" />
            <el-option label="现实" value="realistic" />
            <el-option label="同人" value="fanfic" />
            <el-option label="青春" value="youth" />
            <el-option label="职场" value="workplace" />
            <el-option label="校园" value="campus" />
            <el-option label="二次元" value="anime" />
            <el-option label="轻小说" value="lightnovel" />
            <el-option label="短篇" value="short" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item prop="wordCount" label="目标字数">
          <el-input
            v-model="form.wordCount"
            placeholder="请输入目标字数"
            type="number"
            :min="10000"
            :max="10000000"
            :step="10000"
          />
        </el-form-item>
        <el-form-item prop="desc" label="简介">
          <el-input v-model="form.desc" type="textarea" :rows="5" placeholder="请输入简介" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 书籍列表 -->
    <div class="books-box">
      <div v-if="books.length === 0" class="books-box-empty">
        <el-empty description="暂无书籍" />
      </div>
      <Book
        v-for="book in books"
        :key="book.id"
        :title="book.title"
        :type="book.type"
        :word-count="book.wordCount"
        :update-time="book.updateTime"
        :cover-url="book.coverUrl"
      />
    </div>

    <!-- 图表区域占位 -->
    <div class="chart-area">
      <!-- 图表将在后续添加 -->
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Book from './Book.vue'
import { Plus, ArrowDown } from '@element-plus/icons-vue'

defineProps({})

// 新建书籍弹窗相关
const dialogVisible = ref(false)
const form = ref({
  name: '',
  type: '',
  wordCount: 10000,
  desc: ''
})

function handleCreate() {
  // 这里只做关闭弹窗，实际可扩展为添加到 books
  dialogVisible.value = false
}

// 模拟数据
const books = ref([])
</script>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

.bookshelf {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100vh;
  padding: 20px;
  overflow: hidden;
}
.top-bar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.books-box {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  background: white;
  border-radius: $border-radius;
}
.books-box-empty {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.chart-area {
  flex-shrink: 0;
  background: white;
  border-radius: $border-radius;
  padding: 20px;
  min-height: 100px;
  margin-top: 0;
}
</style>
