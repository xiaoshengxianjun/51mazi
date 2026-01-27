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

    <!-- 新建/编辑书籍抽屉 -->
    <el-drawer
      v-model="dialogVisible"
      :title="isEdit ? '编辑书籍' : '新建书籍'"
      size="700px"
      direction="rtl"
      class="book-drawer"
    >
      <div class="drawer-content">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" class="drawer-form">
          <el-form-item prop="name" label="书名">
            <el-input
              v-model="form.name"
              placeholder="请输入书籍名称（最多15个字符）"
              maxlength="15"
              show-word-limit
            />
          </el-form-item>
          <el-form-item prop="type" label="类型">
            <el-cascader
              v-model="form.type"
              :options="bookTypeCascaderOptions"
              :props="{ expandTrigger: 'hover', emitPath: false }"
              placeholder="先选大类，再选细类"
              style="width: 100%"
              clearable
            />
          </el-form-item>
          <el-form-item prop="targetCount" label="目标字数">
            <el-input
              v-model="form.targetCount"
              placeholder="请输入目标字数"
              type="number"
              :min="10000"
              :max="10000000"
              :step="100000"
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
              <div v-else class="cover-buttons">
                <el-button type="primary" :icon="Plus" @click="handleSelectCoverImage">
                  选择封面图片
                </el-button>
                <el-button
                  type="success"
                  :icon="MagicStick"
                  :disabled="!form.name || !form.type"
                  :title="!form.name || !form.type ? '请先填写书名和类型' : ''"
                  @click="handleOpenAICoverDialog"
                >
                  AI生成封面
                </el-button>
              </div>
              <div v-if="form.coverImagePath" class="cover-path">
                {{ form.coverImagePath }}
              </div>
            </div>
          </el-form-item>
        </el-form>
        <div class="drawer-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleConfirm">
            {{ isEdit ? '保存' : '创建' }}
          </el-button>
        </div>
      </div>
    </el-drawer>

    <!-- AI生成封面抽屉 -->
    <el-drawer
      v-model="aiCoverDialogVisible"
      title="AI生成封面"
      size="700px"
      direction="rtl"
      class="ai-cover-drawer"
      :close-on-click-modal="false"
    >
      <div class="ai-cover-drawer-content">
        <el-form
          ref="aiCoverFormRef"
          :model="aiCoverForm"
          :rules="aiCoverRules"
          label-width="100px"
          class="ai-cover-drawer-form"
        >
          <el-form-item prop="penName" label="笔名">
            <el-input
              v-model="aiCoverForm.penName"
              placeholder="请输入笔名"
              maxlength="10"
              show-word-limit
            />
          </el-form-item>
          <el-form-item prop="coverSize" label="封面尺寸">
            <el-select
              v-model="aiCoverForm.coverSize"
              placeholder="请选择封面尺寸"
              style="width: 100%"
            >
              <el-option
                v-for="size in coverSizeOptions"
                :key="size.value"
                :label="size.label"
                :value="size.value"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ size.label }}</span>
                  <span style="color: #909399; font-size: 12px">{{ size.platform }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item prop="prompt" label="封面要求">
            <!-- 已选择的标签 -->
            <div v-if="selectedPromptTags.length > 0" class="selected-tags">
              <el-tag
                v-for="(tag, index) in selectedPromptTags"
                :key="index"
                class="prompt-tag"
                closable
                @close="removePromptTag(index)"
              >
                {{ tag }}
              </el-tag>
            </div>
            <!-- 提示词输入框 -->
            <el-input
              v-model="aiCoverForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请详细描述您想要的封面风格、元素、色彩等，或点击下方标签快速选择（支持中英文，最多500个字符）"
              maxlength="500"
              show-word-limit
            />
            <!-- 预设标签选择区域 -->
            <div class="prompt-presets">
              <div
                v-for="category in promptPresetCategories"
                :key="category.key"
                class="preset-category"
              >
                <div class="category-title">
                  <span>{{ category.label }}</span>
                  <el-button
                    v-if="category.recommended && aiCoverForm.bookType"
                    text
                    type="primary"
                    size="small"
                    @click="applyRecommendedTags(category.key)"
                  >
                    一键应用推荐
                  </el-button>
                </div>
                <div class="preset-tags">
                  <el-tag
                    v-for="tag in getCategoryTags(category.key)"
                    :key="tag"
                    :type="isTagSelected(tag) ? 'primary' : 'info'"
                    class="preset-tag"
                    :class="{ selected: isTagSelected(tag) }"
                    @click="togglePromptTag(tag)"
                  >
                    {{ tag }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>
        <div class="ai-cover-drawer-footer">
          <el-button @click="aiCoverDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="aiCoverGenerating" @click="handleGenerateAICover">
            生成封面
          </el-button>
        </div>
      </div>
    </el-drawer>

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
import { Plus, Refresh, Delete, MagicStick } from '@element-plus/icons-vue'
import { useMainStore } from '@renderer/stores'
import { BOOK_TYPES, BOOK_TYPE_GROUPS } from '@renderer/constants/config'

// 书籍类型转为级联选择器数据：先选大类，展开后再选细类
const bookTypeCascaderOptions = BOOK_TYPE_GROUPS.map((g) => ({
  label: g.groupLabel,
  value: g.groupLabel,
  children: g.options.map((o) => ({ label: o.label, value: o.value }))
}))
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

// 封面尺寸选项（根据各平台标准尺寸）
const coverSizeOptions = [
  {
    value: '600x800',
    label: '600×800 像素',
    platform: '多数主流平台（起点、番茄、创世、云起等）',
    targetWidth: 600,
    targetHeight: 800,
    // 生成时使用的API尺寸（保持宽高比，符合API要求）
    apiWidth: 1200,
    apiHeight: 1600
  },
  {
    value: '200x280',
    label: '200×280 像素',
    platform: '晋江文学城作品封面',
    targetWidth: 200,
    targetHeight: 280,
    apiWidth: 1280,
    apiHeight: 1792
  },
  {
    value: '400x560',
    label: '400×560 像素',
    platform: '黑岩小说',
    targetWidth: 400,
    targetHeight: 560,
    apiWidth: 1280,
    apiHeight: 1792
  },
  {
    value: '300x400',
    label: '300×400 像素',
    platform: '逐浪小说',
    targetWidth: 300,
    targetHeight: 400,
    apiWidth: 1200,
    apiHeight: 1600
  },
  {
    value: '240x320',
    label: '240×320 像素',
    platform: '纵横中文网',
    targetWidth: 240,
    targetHeight: 320,
    apiWidth: 1200,
    apiHeight: 1600
  }
]

// 提示词预设选项（按分类组织）
const promptPresets = {
  style: [
    '古风',
    '现代',
    '科幻',
    '唯美',
    '写实',
    '二次元',
    '水墨',
    '油画',
    '水彩',
    '插画',
    '简约',
    '华丽',
    '暗黑',
    '清新',
    '复古'
  ],
  element: [
    '主角',
    '双人',
    '群像',
    '场景',
    '道具',
    '武器',
    '建筑',
    '风景',
    '天空',
    '云朵',
    '山峰',
    '海洋',
    '森林',
    '城市',
    '古建筑'
  ],
  color: [
    '暖色调',
    '冷色调',
    '高对比度',
    '低饱和度',
    '高饱和度',
    '黑白',
    '金色',
    '红色',
    '蓝色',
    '绿色',
    '紫色',
    '粉色',
    '橙色',
    '渐变色',
    '单色调'
  ],
  composition: [
    '居中构图',
    '对称构图',
    '三分法构图',
    '远景',
    '中景',
    '近景',
    '特写',
    '仰视',
    '俯视',
    '平视',
    '留白',
    '满构图',
    '对角线构图',
    'S型构图',
    '框架构图'
  ],
  atmosphere: [
    '神秘',
    '浪漫',
    '热血',
    '悲伤',
    '温馨',
    '紧张',
    '宁静',
    '激烈',
    '梦幻',
    '史诗',
    '悬疑',
    '恐怖',
    '治愈',
    '激昂',
    '忧郁'
  ]
}

// 根据书籍类型推荐的标签映射
const bookTypeRecommendations = {
  xuanhua: {
    style: ['古风', '玄幻', '神秘'],
    element: ['主角', '武器', '古建筑'],
    color: ['金色', '紫色', '渐变色'],
    atmosphere: ['神秘', '热血', '史诗']
  },
  xianxia: {
    style: ['古风', '唯美', '水墨'],
    element: ['主角', '山峰', '云朵'],
    color: ['蓝色', '白色', '渐变色'],
    atmosphere: ['神秘', '宁静', '梦幻']
  },
  qihuan: {
    style: ['奇幻', '唯美', '插画'],
    element: ['主角', '魔法', '森林'],
    color: ['紫色', '蓝色', '渐变色'],
    atmosphere: ['神秘', '梦幻', '浪漫']
  },
  dushi: {
    style: ['现代', '写实', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['暖色调', '高对比度'],
    atmosphere: ['温馨', '紧张', '治愈']
  },
  kehuan: {
    style: ['科幻', '未来', '写实'],
    element: ['主角', '科技', '城市'],
    color: ['蓝色', '冷色调', '高对比度'],
    atmosphere: ['紧张', '神秘', '史诗']
  },
  wuxia: {
    style: ['古风', '写实', '水墨'],
    element: ['主角', '武器', '山峰'],
    color: ['暖色调', '渐变色'],
    atmosphere: ['热血', '激昂', '神秘']
  },
  yanqing: {
    style: ['唯美', '清新', '插画'],
    element: ['双人', '浪漫', '风景'],
    color: ['粉色', '暖色调', '渐变色'],
    atmosphere: ['浪漫', '温馨', '治愈']
  },
  lishi: {
    style: ['古风', '写实', '复古'],
    element: ['主角', '古建筑', '场景'],
    color: ['暖色调', '低饱和度'],
    atmosphere: ['史诗', '神秘', '宁静']
  },
  xuanyi: {
    style: ['暗黑', '写实', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['冷色调', '低饱和度', '黑白'],
    atmosphere: ['悬疑', '紧张', '神秘']
  },
  junshi: {
    style: ['写实', '现代', '简约'],
    element: ['主角', '武器', '场景'],
    color: ['冷色调', '高对比度'],
    atmosphere: ['紧张', '激烈', '热血']
  },
  youxi: {
    style: ['二次元', '插画', '写实'],
    element: ['主角', '武器', '场景'],
    color: ['高对比度', '渐变色', '暖色调'],
    atmosphere: ['热血', '紧张', '激昂']
  },
  tiyu: {
    style: ['写实', '现代', '简约'],
    element: ['主角', '场景', '运动'],
    color: ['暖色调', '高对比度', '高饱和度'],
    atmosphere: ['热血', '激昂', '紧张']
  },
  xianshi: {
    style: ['写实', '现代', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['暖色调', '低饱和度', '高对比度'],
    atmosphere: ['温馨', '治愈', '宁静']
  },
  tongren: {
    style: ['二次元', '插画', '唯美'],
    element: ['主角', '双人', '场景'],
    color: ['暖色调', '渐变色', '高饱和度'],
    atmosphere: ['浪漫', '热血', '梦幻']
  },
  qingchun: {
    style: ['清新', '唯美', '插画'],
    element: ['主角', '双人', '校园'],
    color: ['暖色调', '粉色', '清新'],
    atmosphere: ['治愈', '温馨', '浪漫']
  },
  zhichang: {
    style: ['现代', '写实', '简约'],
    element: ['主角', '城市', '建筑'],
    color: ['暖色调', '冷色调', '高对比度'],
    atmosphere: ['紧张', '治愈', '温馨']
  },
  xiaoyuan: {
    style: ['清新', '唯美', '插画'],
    element: ['主角', '双人', '校园'],
    color: ['暖色调', '清新', '渐变色'],
    atmosphere: ['治愈', '温馨', '浪漫']
  },
  erciyuan: {
    style: ['二次元', '插画', '唯美'],
    element: ['主角', '双人', '场景'],
    color: ['高饱和度', '渐变色', '暖色调'],
    atmosphere: ['梦幻', '治愈', '浪漫']
  },
  qingxiaoshuo: {
    style: ['二次元', '插画', '清新'],
    element: ['主角', '双人', '风景'],
    color: ['暖色调', '渐变色', '清新'],
    atmosphere: ['治愈', '浪漫', '温馨']
  },
  duanpian: {
    style: ['简约', '写实', '唯美'],
    element: ['主角', '场景', '留白'],
    color: ['暖色调', '低饱和度', '渐变色'],
    atmosphere: ['宁静', '治愈', '神秘']
  },
  other: {
    style: ['写实', '唯美', '简约'],
    element: ['主角', '场景', '风景'],
    color: ['暖色调', '渐变色', '高对比度'],
    atmosphere: ['温馨', '宁静', '治愈']
  }
}

// 提示词预设分类
const promptPresetCategories = [
  { key: 'style', label: '风格', recommended: true },
  { key: 'element', label: '元素', recommended: true },
  { key: 'color', label: '色彩', recommended: true },
  { key: 'composition', label: '构图', recommended: false },
  { key: 'atmosphere', label: '氛围', recommended: true }
]

// AI生成封面相关
const aiCoverDialogVisible = ref(false)
const aiCoverFormRef = ref(null)
const aiCoverGenerating = ref(false)
const selectedPromptTags = ref([]) // 已选择的标签
const aiCoverForm = ref({
  bookType: '',
  penName: '',
  coverSize: '600x800', // 默认600×800
  prompt: ''
})

const aiCoverRules = ref({
  penName: [
    { required: true, message: '请输入笔名', trigger: 'blur' },
    { max: 10, message: '笔名不能超过10个字符', trigger: 'blur' }
  ],
  coverSize: [{ required: true, message: '请选择封面尺寸', trigger: 'change' }],
  prompt: [
    { required: true, message: '请输入封面要求', trigger: 'blur' },
    { min: 10, message: '封面要求至少10个字符', trigger: 'blur' }
  ]
})

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

// 获取分类标签
function getCategoryTags(categoryKey) {
  return promptPresets[categoryKey] || []
}

// 检查标签是否已选择
function isTagSelected(tag) {
  return selectedPromptTags.value.includes(tag)
}

// 切换标签选择状态
function togglePromptTag(tag) {
  const index = selectedPromptTags.value.indexOf(tag)
  if (index > -1) {
    // 已选择，移除
    selectedPromptTags.value.splice(index, 1)
  } else {
    // 未选择，添加
    selectedPromptTags.value.push(tag)
  }
  updatePromptFromTags()
}

// 移除标签
function removePromptTag(index) {
  selectedPromptTags.value.splice(index, 1)
  updatePromptFromTags()
}

// 根据已选择的标签更新提示词
function updatePromptFromTags() {
  // 将标签用逗号连接，添加到提示词中
  const tagsText = selectedPromptTags.value.join('，')
  // 如果用户手动输入了内容，保留手动输入的部分
  const manualText = aiCoverForm.value.prompt
    ? aiCoverForm.value.prompt
        .split('，')
        .filter((text) => !selectedPromptTags.value.includes(text.trim()))
        .join('，')
    : ''
  // 合并标签和手动输入的内容
  const parts = [tagsText, manualText].filter(Boolean)
  aiCoverForm.value.prompt = parts.join('，')
}

// 按书籍类型取推荐配置：有细类用细类，否则用大类（value 中 _ 前一段）
function getRecommendationsForBookType(bookType) {
  if (bookTypeRecommendations[bookType]) return bookTypeRecommendations[bookType]
  const parent = bookType && bookType.includes('_') ? bookType.split('_')[0] : null
  return parent ? bookTypeRecommendations[parent] : null
}

// 应用推荐标签
function applyRecommendedTags(categoryKey) {
  if (!aiCoverForm.value.bookType) {
    ElMessage.warning('请先选择书籍类型')
    return
  }
  const recommendations = getRecommendationsForBookType(aiCoverForm.value.bookType)
  if (!recommendations || !recommendations[categoryKey]) {
    return
  }
  // 添加推荐标签（不重复）
  recommendations[categoryKey].forEach((tag) => {
    if (!selectedPromptTags.value.includes(tag)) {
      selectedPromptTags.value.push(tag)
    }
  })
  updatePromptFromTags()
  ElMessage.success('已应用推荐标签')
}

// 打开AI生成封面弹框（需已有书名和类型）
function handleOpenAICoverDialog() {
  if (!form.value.name?.trim() || !form.value.type) {
    ElMessage.warning('请先填写书名和类型')
    return
  }
  // 初始化表单数据，从当前书籍信息中获取
  aiCoverForm.value.bookType = form.value.type || ''
  aiCoverForm.value.penName = ''
  aiCoverForm.value.coverSize = '600x800' // 默认600×800
  aiCoverForm.value.prompt = ''
  selectedPromptTags.value = [] // 清空已选择的标签
  aiCoverDialogVisible.value = true
}

// 生成AI封面（第一步只做UI，实际API调用后续实现）
async function handleGenerateAICover() {
  try {
    await aiCoverFormRef.value.validate()

    // 获取选中的尺寸配置
    const selectedSize = coverSizeOptions.find(
      (option) => option.value === aiCoverForm.value.coverSize
    )

    if (!selectedSize) {
      ElMessage.error('请选择有效的封面尺寸')
      return
    }

    // 目标尺寸（最终保存的尺寸）
    const targetWidth = selectedSize.targetWidth
    const targetHeight = selectedSize.targetHeight

    // API生成尺寸（符合通义万相API要求的尺寸）
    const apiWidth = selectedSize.apiWidth
    const apiHeight = selectedSize.apiHeight

    console.log('生成封面配置:', {
      目标尺寸: `${targetWidth}×${targetHeight}`,
      API生成尺寸: `${apiWidth}×${apiHeight}`,
      书籍类型: aiCoverForm.value.bookType,
      笔名: aiCoverForm.value.penName,
      提示词: aiCoverForm.value.prompt
    })

    // TODO: 后续接入通义万相API
    // 这里先模拟生成过程
    aiCoverGenerating.value = true

    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 2000))

    ElMessage.info('AI生成封面功能将在下一步接入通义万相API后实现')

    // 关闭弹框
    aiCoverDialogVisible.value = false
    aiCoverGenerating.value = false
  } catch (error) {
    console.error('生成AI封面失败:', error)
    if (error !== false) {
      // false表示验证失败，不需要显示错误
      ElMessage.error('请检查表单输入')
    }
    aiCoverGenerating.value = false
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

// 抽屉组件样式
:deep(.book-drawer) {
  .el-drawer__header {
    margin-bottom: 16px;
  }
  .el-drawer__body {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
}

// 抽屉内容区域
.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

// 抽屉表单区域（可滚动）
.drawer-form {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 0;
}

// 抽屉底部按钮区域（固定在底部）
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  flex-shrink: 0; // 防止被压缩
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05); // 添加阴影，增强固定效果
}

// AI生成封面抽屉样式
:deep(.ai-cover-drawer) {
  .el-drawer__header {
    margin-bottom: 16px;
  }
  .el-drawer__body {
    padding: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
}

.ai-cover-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.ai-cover-drawer-form {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 0;
}

.ai-cover-drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  flex-shrink: 0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
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
    width: 100%;
    max-width: 400px;
    height: 200px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
    img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain; // 完整显示图片，不裁剪
    }
    .remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
    }
  }
  .cover-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .cover-path {
    font-size: 12px;
    color: #909399;
    word-break: break-all;
  }
}

// AI生成封面弹框样式
// 已选择的标签样式
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  min-height: 40px;
  .prompt-tag {
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
      transform: scale(1.05);
    }
  }
}

// 提示词预设区域样式
.prompt-presets {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  max-height: 400px;
  overflow-y: auto;
}

.preset-category {
  margin-bottom: 20px;
  &:last-child {
    margin-bottom: 0;
  }
  .category-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }
  .preset-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    .preset-tag {
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
      }
      &.selected {
        background-color: #409eff;
        color: #fff;
        border-color: #409eff;
      }
    }
  }
}
</style>
