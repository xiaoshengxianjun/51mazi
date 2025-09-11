<template>
  <div class="bookshelf">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <div>
        <el-button type="primary" class="new-book-btn" @click="handleNewBook">
          <el-icon><Plus /></el-icon>
          新建书籍
        </el-button>
        <el-button
          class="refresh-btn"
          :icon="Refresh"
          circle
          @click="
            () => {
              readBooksDir()
              refreshChart()
            }
          "
        />
      </div>
      <el-dropdown class="update-dropdown">
        <span class="el-dropdown-link">
          最近更新
          <el-icon class="el-icon--right">
            <ArrowDown />
          </el-icon>
        </span>
      </el-dropdown>
    </div>

    <!-- 新建/编辑书籍弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑书籍' : '新建书籍'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item prop="name" label="书名">
          <el-input
            v-model="form.name"
            placeholder="请输入书籍名称（最多15个字符）"
            maxlength="15"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="type" label="类型">
          <el-select v-model="form.type" placeholder="请选择类型">
            <el-option
              v-for="item in BOOK_TYPES"
              :key="item.value + item.label"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item prop="targetCount" label="目标字数">
          <el-input
            v-model="form.targetCount"
            placeholder="请输入目标字数"
            type="number"
            :min="10000"
            :max="10000000"
            :step="10000"
          />
        </el-form-item>
        <el-form-item prop="intro" label="简介">
          <el-input v-model="form.intro" type="textarea" :rows="5" placeholder="请输入简介" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">{{ isEdit ? '保存' : '创建' }}</el-button>
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
        :name="book.name"
        :type="book.type"
        :type-name="book.typeName"
        :total-words="book.totalWords"
        :updated-at="book.updatedAt"
        :cover-url="book.coverUrl"
        @on-open="onOpen(book)"
        @on-edit="onEdit(book)"
        @on-delete="onDelete(book)"
      />
    </div>

    <!-- 图表区域占位 -->
    <WordCountChart ref="chartRef" height="200px" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import Book from './Book.vue'
import WordCountChart from './WordCountChart.vue'
import { Plus, ArrowDown, Refresh } from '@element-plus/icons-vue'
import { useMainStore } from '@renderer/stores'
import { BOOK_TYPES } from '@renderer/constants/config'
import { readBooksDir, createBook, deleteBook, updateBook } from '@renderer/service/books'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const mainStore = useMainStore()
const router = useRouter()

// 新建书籍弹窗相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const editBookId = ref('')
const formRef = ref(null)
const form = ref({
  name: '',
  type: '',
  targetCount: 10000,
  intro: '',
  originalName: ''
})
const rules = ref({
  name: [
    { required: true, message: '请输入书籍名称', trigger: 'blur' },
    { max: 15, message: '书名不能超过15个字符', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'blur' }],
  targetCount: [{ required: true, message: '请输入目标字数', trigger: 'blur' }],
  intro: [{ required: true, message: '请输入简介', trigger: 'blur' }]
})

// 书籍列表数据
const books = computed(() => mainStore.books)

const chartRef = ref(null)

// 打开书籍
function onOpen(book) {
  // 通过 Electron API 请求主进程打开新窗口
  if (window.electron && window.electron.openBookEditorWindow) {
    window.electron.openBookEditorWindow(book.id, book.name)
  } else {
    // 兼容老逻辑
    router.push({
      path: '/editor',
      query: {
        name: book.name
      }
    })
  }
}

// 右键菜单相关
function onEdit(book) {
  isEdit.value = true
  editBookId.value = book.id
  dialogVisible.value = true
  form.value.name = book.name
  form.value.type = book.type
  form.value.targetCount = book.targetCount
  form.value.intro = book.intro
  // 保存原始书名，用于定位文件夹
  form.value.originalName = book.name
}

async function onDelete(book) {
  try {
    console.log('准备删除书籍:', book)
    await ElMessageBox.confirm(`确定要删除《${book.name}》吗？此操作不可恢复！`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    console.log('调用删除函数，书名:', book.name)
    const result = await deleteBook(book.name)
    console.log('删除结果:', result)
    if (result) {
      ElMessage.success('删除成功')
      await readBooksDir()
    } else {
      ElMessage.error('删除失败，书籍不存在或已被删除')
    }
  } catch (e) {
    // 用户取消或删除失败
    if (e !== 'cancel') {
      console.error('删除书籍失败:', e)
      ElMessage.error('删除失败，请重试')
    }
  }
}

async function handleConfirm() {
  formRef.value.validate(async (valid) => {
    if (valid) {
      // 校验同名书籍
      const exists = books.value.some(
        (b) => b.name === form.value.name && (!isEdit.value || b.id !== editBookId.value)
      )
      if (exists) {
        ElMessage.error('已存在同名书籍，不能重复创建！')
        return
      }
      const randomId = isEdit.value
        ? editBookId.value
        : Date.now().toString() + Math.floor(Math.random() * 10000).toString()
      const bookData = {
        id: randomId,
        name: form.value.name,
        type: form.value.type,
        typeName: BOOK_TYPES.find((item) => item.value === form.value.type)?.label,
        targetCount: form.value.targetCount,
        intro: form.value.intro
      }
      if (isEdit.value && editBookId.value) {
        // 编辑模式，调用 updateBook
        const result = await updateBook({
          ...bookData,
          id: editBookId.value,
          originalName: form.value.originalName
        })
        if (!result.success) {
          ElMessage.error(result.message || '编辑失败')
          return
        }
        ElMessage.success('编辑成功')
      } else {
        // 新建模式
        await createBook(bookData)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      isEdit.value = false
      editBookId.value = ''
      await readBooksDir()
    }
  })
}

function handleNewBook() {
  isEdit.value = false
  editBookId.value = ''
  form.value.name = ''
  form.value.type = ''
  form.value.targetCount = 10000
  form.value.intro = ''
  form.value.originalName = ''
  dialogVisible.value = true
}

// 刷新图表数据
async function refreshChart() {
  chartRef.value?.updateData()
}

onMounted(() => {
  readBooksDir()
  refreshChart()
})

onBeforeUnmount(() => {
  // 清理资源
})
</script>

<style lang="scss" scoped>
@use '/src/assets/styles/variables' as *;

.bookshelf {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 15px;
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
  gap: 10px;
  border-radius: $border-radius;
}
.books-box-empty {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
