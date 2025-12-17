<template>
  <el-drawer
    v-model="visible"
    title="禁词管理"
    direction="rtl"
    size="360px"
    :close-on-click-modal="true"
  >
    <!-- 新增禁词输入区 -->
    <div class="add-word-section">
      <el-input v-model="newWord" placeholder="请输入禁词" clearable @keyup.enter="handleAddWord">
        <template #append>
          <el-button type="primary" @click="handleAddWord">新增</el-button>
        </template>
      </el-input>
    </div>

    <!-- 禁词标签列表 -->
    <div class="words-list">
      <div v-if="bannedWords.length === 0" class="empty-tip">暂无禁词，请添加</div>
      <el-tag
        v-for="word in bannedWords"
        :key="word"
        class="word-tag"
        closable
        @close="handleDeleteWord(word)"
      >
        {{ word }}
      </el-tag>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  bookName: {
    type: String,
    default: ''
  }
})

const visible = ref(false)
const newWord = ref('')
const bannedWords = ref([])

// 打开抽屉
const open = () => {
  visible.value = true
  loadBannedWords()
}

// 加载禁词列表
const loadBannedWords = async () => {
  if (!props.bookName) return
  try {
    const result = await window.electron.getBannedWords(props.bookName)
    if (result.success) {
      bannedWords.value = result.data || []
    }
  } catch (error) {
    console.error('加载禁词失败:', error)
  }
}

// 新增禁词
const handleAddWord = async () => {
  const word = newWord.value.trim()

  // 校验：是否为空
  if (!word) {
    ElMessage.warning('请输入禁词')
    return
  }

  // 校验：是否已存在
  if (bannedWords.value.includes(word)) {
    ElMessage.warning('该禁词已存在')
    return
  }

  try {
    const result = await window.electron.addBannedWord(props.bookName, word)
    if (result.success) {
      bannedWords.value.push(word)
      newWord.value = ''
      ElMessage.success('添加成功')
    } else {
      ElMessage.error(result.message || '添加失败')
    }
  } catch (error) {
    console.error('添加禁词失败:', error)
    ElMessage.error('添加失败')
  }
}

// 删除禁词
const handleDeleteWord = async (word) => {
  try {
    const result = await window.electron.removeBannedWord(props.bookName, word)
    if (result.success) {
      const index = bannedWords.value.indexOf(word)
      if (index > -1) {
        bannedWords.value.splice(index, 1)
      }
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(result.message || '删除失败')
    }
  } catch (error) {
    console.error('删除禁词失败:', error)
    ElMessage.error('删除失败')
  }
}

// 监听bookName变化，重新加载
watch(
  () => props.bookName,
  () => {
    if (visible.value) {
      loadBannedWords()
    }
  }
)

// 暴露方法给父组件
defineExpose({
  open
})
</script>

<style lang="scss" scoped>
.add-word-section {
  margin-bottom: 20px;
}

.words-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  .empty-tip {
    width: 100%;
    text-align: center;
    color: var(--text-secondary);
    padding: 40px 0;
  }

  .word-tag {
    font-size: 14px;
  }
}
</style>
