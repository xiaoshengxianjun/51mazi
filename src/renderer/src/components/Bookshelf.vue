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
      <!-- <el-dropdown class="update-dropdown">
        <span class="el-dropdown-link">
          最近更新
          <el-icon class="el-icon--right">
            <ArrowDown />
          </el-icon>
        </span>
      </el-dropdown> -->
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
        <el-form-item prop="password" label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入4-8位数字或字母组合（可选）"
            maxlength="8"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword" label="确认密码">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            maxlength="8"
            show-password
          />
        </el-form-item>
        <el-form-item label="封面颜色">
          <div class="cover-color-selector">
            <div class="preset-colors">
              <div
                v-for="color in presetColors"
                :key="color.value"
                class="color-item"
                :class="{ active: form.coverColor === color.value }"
                :style="{ backgroundColor: color.value }"
                :title="color.label"
                @click="form.coverColor = color.value"
              />
            </div>
            <el-color-picker v-model="form.coverColor" />
          </div>
        </el-form-item>
        <el-form-item label="封面图片">
          <div class="cover-image-selector">
            <div v-if="form.coverImagePreview" class="cover-preview">
              <img :src="form.coverImagePreview" alt="封面预览" />
              <el-button
                type="danger"
                size="small"
                circle
                class="remove-btn"
                @click="handleRemoveCoverImage"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button v-else type="primary" :icon="Plus" @click="handleSelectCoverImage">
              选择封面图片
            </el-button>
            <div v-if="form.coverImagePath" class="cover-path">
              {{ form.coverImagePath }}
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirm">{{ isEdit ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>

    <!-- 密码验证弹框 -->
    <el-dialog v-model="passwordDialogVisible" title="密码验证" width="400px">
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="80px"
      >
        <el-form-item prop="password" label="密码">
          <el-input
            v-model="passwordForm.password"
            type="password"
            placeholder="请输入书籍密码"
            maxlength="8"
            show-password
            @keyup.enter="handlePasswordConfirm"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePasswordConfirm">确认</el-button>
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
        :cover-color="book.coverColor"
        :book-name="book.name"
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
import { Plus, Refresh, Delete } from '@element-plus/icons-vue'
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
  targetCount: 100000,
  intro: '',
  originalName: '',
  password: '',
  confirmPassword: '',
  coverColor: '#22345c', // 默认封面颜色
  coverImagePath: '', // 封面图片路径（用于保存）
  coverImagePreview: '' // 封面图片预览（base64或本地路径）
})

// 预设封面颜色
const presetColors = [
  { label: '深蓝', value: '#22345c' },
  { label: '深绿', value: '#2d4a3e' },
  { label: '深红', value: '#4a2d2d' },
  { label: '深紫', value: '#3d2d4a' },
  { label: '深棕', value: '#4a3d2d' },
  { label: '深灰', value: '#3d3d3d' },
  { label: '墨绿', value: '#1e3a2e' },
  { label: '藏青', value: '#1e2a3a' }
]
const rules = ref({
  name: [
    { required: true, message: '请输入书籍名称', trigger: 'blur' },
    { max: 15, message: '书名不能超过15个字符', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'blur' }],
  targetCount: [{ required: true, message: '请输入目标字数', trigger: 'blur' }],
  intro: [{ required: true, message: '请输入简介', trigger: 'blur' }],
  password: [
    {
      validator: (rule, value, callback) => {
        if (value && !/^[a-zA-Z0-9]{4,8}$/.test(value)) {
          callback(new Error('密码必须是4-8位数字或字母组合'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    {
      validator: (rule, value, callback) => {
        if (form.value.password && value !== form.value.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})

// 书籍列表数据
const books = computed(() => mainStore.books)

const chartRef = ref(null)

// 密码验证相关
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const passwordForm = ref({
  password: ''
})
const passwordRules = ref({
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
})
const pendingAction = ref(null) // 存储待执行的操作
const currentBook = ref(null) // 当前操作的书籍

// 打开书籍
function onOpen(book) {
  if (book.password) {
    // 有密码，需要验证
    currentBook.value = book
    pendingAction.value = 'open'
    passwordForm.value.password = ''
    passwordDialogVisible.value = true
  } else {
    // 无密码，直接打开
    executeOpenBook(book)
  }
}

// 执行打开书籍操作
function executeOpenBook(book) {
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
  if (book.password) {
    // 有密码，需要验证
    currentBook.value = book
    pendingAction.value = 'edit'
    passwordForm.value.password = ''
    passwordDialogVisible.value = true
  } else {
    // 无密码，直接编辑
    executeEditBook(book)
  }
}

// 执行编辑书籍操作
function executeEditBook(book) {
  isEdit.value = true
  editBookId.value = book.id
  dialogVisible.value = true
  form.value.name = book.name
  form.value.type = book.type
  form.value.targetCount = book.targetCount
  form.value.intro = book.intro
  form.value.password = book.password || ''
  form.value.confirmPassword = book.password || ''
  form.value.coverColor = book.coverColor || '#22345c'
  // 编辑模式下，coverImagePath 应该为空（除非用户选择新图片）
  // coverImagePreview 用于显示原有封面
  form.value.coverImagePath = ''
  // 如果有封面图片，需要加载预览
  if (book.coverUrl) {
    loadCoverImagePreview(book.name, book.coverUrl)
  } else {
    form.value.coverImagePreview = ''
  }
  // 保存原始书名，用于定位文件夹
  form.value.originalName = book.name
}

async function onDelete(book) {
  if (book.password) {
    // 有密码，需要验证
    currentBook.value = book
    pendingAction.value = 'delete'
    passwordForm.value.password = ''
    passwordDialogVisible.value = true
  } else {
    // 无密码，直接删除
    executeDeleteBook(book)
  }
}

// 执行删除书籍操作
async function executeDeleteBook(book) {
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

// 密码验证处理
async function handlePasswordConfirm() {
  try {
    await passwordFormRef.value.validate()

    if (passwordForm.value.password === currentBook.value.password) {
      // 密码正确，执行对应操作
      passwordDialogVisible.value = false

      switch (pendingAction.value) {
        case 'open':
          executeOpenBook(currentBook.value)
          break
        case 'edit':
          executeEditBook(currentBook.value)
          break
        case 'delete':
          await executeDeleteBook(currentBook.value)
          break
      }

      // 清理状态
      pendingAction.value = null
      currentBook.value = null
    } else {
      ElMessage.error('密码错误，请重新输入')
    }
  } catch (error) {
    console.error('密码验证失败:', error)
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
      // 处理封面URL：如果有新图片则使用新图片，否则在编辑模式下保留原封面
      let coverUrl = null
      if (form.value.coverImagePath) {
        // 有新图片，使用新图片（主进程会根据扩展名生成文件名）
        const ext = form.value.coverImagePath.split('.').pop()?.toLowerCase() || 'jpg'
        coverUrl = `cover.${ext}`
      } else if (isEdit.value) {
        // 编辑模式且没有新图片
        const currentBook = books.value.find((b) => b.id === editBookId.value)
        if (currentBook && currentBook.coverUrl) {
          // 如果还有预览（说明用户没有移除），保留原有封面
          if (form.value.coverImagePreview) {
            coverUrl = currentBook.coverUrl
          } else {
            // 用户移除了封面，设置为 null
            coverUrl = null
          }
        }
      }

      const bookData = {
        id: randomId,
        name: form.value.name,
        type: form.value.type,
        typeName: BOOK_TYPES.find((item) => item.value === form.value.type)?.label,
        targetCount: form.value.targetCount,
        intro: form.value.intro,
        password: form.value.password || null,
        coverColor: form.value.coverColor || '#22345c',
        coverUrl, // 封面URL（相对路径或null）
        coverImagePath: form.value.coverImagePath // 临时字段，用于主进程复制文件
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
  form.value.password = ''
  form.value.confirmPassword = ''
  form.value.coverColor = '#22345c'
  form.value.coverImagePath = ''
  form.value.coverImagePreview = ''
  dialogVisible.value = true
}

// 选择封面图片
async function handleSelectCoverImage() {
  try {
    const result = await window.electron.selectImage()
    if (result && result.filePath) {
      // 保存原始路径用于后续复制
      form.value.coverImagePath = result.filePath
      // 创建预览（使用 file:// 协议）
      form.value.coverImagePreview = `file://${result.filePath}`
    }
  } catch (error) {
    console.error('选择封面图片失败:', error)
    ElMessage.error('选择图片失败')
  }
}

// 移除封面图片
function handleRemoveCoverImage() {
  form.value.coverImagePath = ''
  form.value.coverImagePreview = ''
}

// 加载封面图片预览（编辑时使用）
async function loadCoverImagePreview(bookName, coverUrl) {
  try {
    // coverUrl 可能是相对路径（如 cover.jpg）或绝对路径
    // 如果是相对路径，需要构建完整路径
    if (coverUrl && !coverUrl.startsWith('file://') && !coverUrl.startsWith('http')) {
      const booksDir = await window.electronStore.get('booksDir')
      const coverPath = `${booksDir}/${bookName}/${coverUrl}`
      form.value.coverImagePreview = `file://${coverPath}`
    } else {
      form.value.coverImagePreview = coverUrl
    }
  } catch (error) {
    console.error('加载封面预览失败:', error)
    form.value.coverImagePreview = ''
  }
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

// 封面颜色选择器样式
.cover-color-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  .preset-colors {
    display: flex;
    gap: 8px;
    .color-item {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
      &:hover {
        transform: scale(1.1);
        border-color: #409eff;
      }
      &.active {
        border-color: #409eff;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }
  }
}

// 封面图片选择器样式
.cover-image-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  .cover-preview {
    position: relative;
    width: 200px;
    height: 120px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .remove-btn {
      position: absolute;
      top: 4px;
      right: 4px;
    }
  }
  .cover-path {
    font-size: 12px;
    color: #909399;
    word-break: break-all;
  }
}
</style>
