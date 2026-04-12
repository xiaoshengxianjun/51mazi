<template>
  <div class="bookshelf">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <div>
        <el-button type="primary" class="new-book-btn" @click="handleNewBook">
          <el-icon><Plus /></el-icon>
          {{ t('bookshelf.newBook') }}
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

    <!-- 新建/编辑书籍抽屉 -->
    <BookFormDrawer
      v-model="dialogVisible"
      :form="form"
      :is-edit="isEdit"
      :rules="rules"
      :book-type-cascader-options="bookTypeCascaderOptions"
      :preset-colors="presetColors"
      @update:form="(v) => Object.assign(form, v)"
      @confirm="handleConfirm"
      @select-cover="handleSelectCoverImage"
      @remove-cover="handleRemoveCoverImage"
      @open-ai-cover="handleOpenAICoverDialog"
    />

    <!-- AI生成封面抽屉 -->
    <AICoverDrawer
      v-model="aiCoverDialogVisible"
      :book-name="form.name"
      :book-folder-name="(form.originalName || form.name || '').trim()"
      :book-type="form.type"
      @cover-generated="handleAICoverGenerated"
    />

    <!-- 密码验证弹框 -->
    <el-dialog v-model="passwordDialogVisible" :title="t('bookshelf.passwordVerify')" width="400px">
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="80px"
      >
        <el-form-item prop="password" :label="t('bookForm.password')">
          <el-input
            v-model="passwordForm.password"
            type="password"
            :placeholder="t('bookshelf.passwordPlaceholder')"
            maxlength="8"
            show-password
            @keyup.enter="handlePasswordConfirm"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handlePasswordConfirm">{{ t('common.confirm') }}</el-button>
      </template>
    </el-dialog>

    <!-- 书籍列表 -->
    <div class="books-box">
      <div v-if="books.length === 0" class="books-box-empty">
        <el-empty :description="t('bookshelf.noBooks')" />
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
        :folder-name="book.folderName || book.name"
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
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useMainStore } from '@renderer/stores'
import { BOOK_TYPES, BOOK_TYPE_GROUPS } from '@renderer/constants/config'
import { useI18n } from 'vue-i18n'

// 书籍类型转为级联选择器数据：先选大类，展开后再选细类
const bookTypeCascaderOptions = BOOK_TYPE_GROUPS.map((g) => ({
  label: g.groupLabel,
  value: g.groupLabel,
  children: g.options.map((o) => ({ label: o.label, value: o.value }))
}))
import { readBooksDir, createBook, deleteBook, updateBook } from '@renderer/service/books'
import AICoverDrawer from '@renderer/components/AICoverDrawer.vue'
import BookFormDrawer from '@renderer/components/BookFormDrawer.vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const mainStore = useMainStore()
const router = useRouter()
const { t } = useI18n()

// 新建/编辑书籍抽屉相关
const dialogVisible = ref(false)
const isEdit = ref(false)
const editBookId = ref('')
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
  { label: t('bookshelf.color.deepBlue'), value: '#22345c' },
  { label: t('bookshelf.color.deepGreen'), value: '#2d4a3e' },
  { label: t('bookshelf.color.deepRed'), value: '#4a2d2d' },
  { label: t('bookshelf.color.deepPurple'), value: '#3d2d4a' },
  { label: t('bookshelf.color.deepBrown'), value: '#4a3d2d' },
  { label: t('bookshelf.color.deepGray'), value: '#3d3d3d' },
  { label: t('bookshelf.color.inkGreen'), value: '#1e3a2e' },
  { label: t('bookshelf.color.navy'), value: '#1e2a3a' }
]
const rules = computed(() => ({
  name: [
    { required: true, message: t('bookshelf.ruleNameRequired'), trigger: 'blur' },
    { max: 15, message: t('bookshelf.ruleNameMax'), trigger: 'blur' }
  ],
  type: [{ required: true, message: t('bookshelf.ruleTypeRequired'), trigger: 'blur' }],
  targetCount: [{ required: true, message: t('bookshelf.ruleTargetRequired'), trigger: 'blur' }],
  intro: [{ required: true, message: t('bookshelf.ruleIntroRequired'), trigger: 'blur' }],
  password: [
    {
      validator: (rule, value, callback) => {
        if (value && !/^[a-zA-Z0-9]{4,8}$/.test(value)) {
          callback(new Error(t('bookshelf.rulePasswordFormat')))
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
          callback(new Error(t('bookshelf.rulePasswordNotMatch')))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}))

// 书籍列表数据
const books = computed(() => mainStore.books)

const chartRef = ref(null)

// AI生成封面抽屉显隐
const aiCoverDialogVisible = ref(false)

// 密码验证相关
const passwordDialogVisible = ref(false)
const passwordFormRef = ref(null)
const passwordForm = ref({
  password: ''
})
const passwordRules = computed(() => ({
  password: [{ required: true, message: t('bookshelf.rulePasswordRequired'), trigger: 'blur' }]
}))
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

// 执行打开书籍操作（使用实际目录名 folderName 定位书籍文件夹）
function executeOpenBook(book) {
  const folderName = book.folderName || book.name
  if (window.electron && window.electron.openBookEditorWindow) {
    window.electron.openBookEditorWindow(book.id, folderName)
  } else {
    router.push({
      path: '/editor',
      query: { name: folderName }
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
  // 如果有封面图片，需要加载预览（使用实际目录名定位文件）
  if (book.coverUrl) {
    loadCoverImagePreview(book.folderName || book.name, book.coverUrl)
  } else {
    form.value.coverImagePreview = ''
  }
  // 保存实际目录名，用于定位文件夹（编辑、保存时）
  form.value.originalName = book.folderName || book.name
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
    console.log('Preparing to delete book:', book)
    await ElMessageBox.confirm(
      t('bookshelf.deleteConfirmMessage', { name: book.name }),
      t('bookshelf.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    console.log('Calling delete for book:', book.name)
    const result = await deleteBook(book.folderName || book.name)
    console.log('Delete result:', result)
    if (result) {
      ElMessage.success(t('bookshelf.deleteSuccess'))
      await readBooksDir()
    } else {
      ElMessage.error(t('bookshelf.deleteFailedNotFound'))
    }
  } catch (e) {
    // 用户取消或删除失败
    if (e !== 'cancel') {
      console.error('Failed to delete book:', e)
      ElMessage.error(t('bookshelf.deleteFailedRetry'))
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
      ElMessage.error(t('bookshelf.passwordWrong'))
    }
  } catch (error) {
    console.error('Password verification failed:', error)
  }
}

// 抽屉内已校验通过，此处仅做提交逻辑
async function handleConfirm() {
  const exists = books.value.some(
    (b) => b.name === form.value.name && (!isEdit.value || b.id !== editBookId.value)
  )
  if (exists) {
    ElMessage.error(t('bookshelf.duplicateBookName'))
    return
  }
  const randomId = isEdit.value
    ? editBookId.value
    : Date.now().toString() + Math.floor(Math.random() * 10000).toString()
  let coverUrl = null
  if (form.value.coverImagePath) {
    const ext = form.value.coverImagePath.split('.').pop()?.toLowerCase() || 'jpg'
    coverUrl = `cover.${ext}`
  } else if (isEdit.value) {
    const current = books.value.find((b) => b.id === editBookId.value)
    if (current?.coverUrl) {
      coverUrl = form.value.coverImagePreview ? current.coverUrl : null
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
    coverUrl,
    coverImagePath: form.value.coverImagePath
  }
  if (isEdit.value && editBookId.value) {
    const result = await updateBook({
      ...bookData,
      id: editBookId.value,
      originalName: form.value.originalName
    })
    if (!result.success) {
      ElMessage.error(result.message || t('bookshelf.editFailed'))
      return
    }
    ElMessage.success(t('bookshelf.editSuccess'))
  } else {
    await createBook(bookData)
    ElMessage.success(t('bookshelf.createSuccess'))
  }
  dialogVisible.value = false
  isEdit.value = false
  editBookId.value = ''
  await readBooksDir()
}

function handleNewBook() {
  isEdit.value = false
  editBookId.value = ''
  form.value.name = ''
  form.value.type = ''
  form.value.targetCount = 1000000
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
    console.error('Failed to select cover image:', error)
    ElMessage.error(t('bookshelf.selectImageFailed'))
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
    console.error('Failed to load cover preview:', error)
    form.value.coverImagePreview = ''
  }
}

// 打开 AI 生成封面抽屉（需先填书名和类型）
function handleOpenAICoverDialog() {
  if (!form.value.name?.trim() || !form.value.type) {
    ElMessage.warning(t('bookForm.fillNameAndTypeFirst'))
    return
  }
  aiCoverDialogVisible.value = true
}

// AI 封面确认成功：回填编辑表单，并对已存在书籍立即同步 mazi.json 与书架封面
async function handleAICoverGenerated({ localPath }) {
  form.value.coverImagePath = localPath
  form.value.coverImagePreview = `file://${localPath}`

  if (!isEdit.value || !editBookId.value) {
    await readBooksDir()
    return
  }

  const ext = localPath.split('.').pop()?.toLowerCase() || 'png'
  const coverUrl = `cover.${ext}`
  const bookData = {
    id: editBookId.value,
    name: form.value.name,
    type: form.value.type,
    typeName: BOOK_TYPES.find((item) => item.value === form.value.type)?.label,
    targetCount: form.value.targetCount,
    intro: form.value.intro,
    password: form.value.password || null,
    coverColor: form.value.coverColor || '#22345c',
    coverUrl
  }
  const result = await updateBook({
    ...bookData,
    originalName: form.value.originalName
  })
  if (!result.success) {
    ElMessage.error(result.message || t('bookshelf.editFailed'))
    return
  }
  await readBooksDir()
}

// 刷新图表数据
async function refreshChart() {
  chartRef.value?.updateData()
}

async function reloadBookshelf() {
  await readBooksDir()
  await refreshChart()
}

defineExpose({
  reloadBookshelf
})

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
:deep(.el-drawer__header) {
  margin-bottom: 16px;
}
:deep(.el-drawer__body) {
  padding: 0;
}
</style>
