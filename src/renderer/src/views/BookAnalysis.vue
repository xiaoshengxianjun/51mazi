<template>
  <div class="book-analysis">
    <div class="top-navigation">
      <el-button class="back-button" type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回首页
      </el-button>
    </div>

    <div class="analysis-header">
      <h1>📚 拆书工具</h1>
      <p class="subtitle">选择TXT文件，进行智能拆书分析</p>
    </div>

    <div class="analysis-content">
      <div class="analysis-card">
        <div class="tool-section">
          <h2>📁 选择文件</h2>
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            accept=".txt,.epub"
          >
            <el-button type="primary">选择文件</el-button>
            <span class="upload-tip">支持导入TXT和EPUB格式的书籍文件</span>
          </el-upload>
          <div v-if="selectedFile" class="file-info">
            <i class="el-icon-document"></i>
            <span>{{ selectedFile.name }}</span>
          </div>
        </div>

        <div v-if="selectedFile" class="tool-section">
          <h2>🔍 选择拆书方式</h2>
          <el-radio-group v-model="analysisType">
            <el-radio label="summary">十万字总结（5000字左右）</el-radio>
            <el-radio label="chapter">按章拆书（每章200字左右）</el-radio>
          </el-radio-group>
        </div>

        <div v-if="selectedFile" class="action-buttons">
          <el-button type="primary" :loading="isAnalyzing" @click="startAnalysis" v-if="!isAnalyzing">开始分析</el-button>
          <el-button type="danger" @click="cancelAnalysis" v-if="isAnalyzing">取消分析</el-button>
          <el-button :disabled="isAnalyzing" @click="resetForm">重置</el-button>
        </div>

        <div v-if="isAnalyzing" class="tool-section">
          <h2>⏳ 分析进度</h2>
          <el-progress :percentage="analysisProgress" :status="analysisProgress === 100 ? 'success' : undefined" />
          <div class="progress-info">
            <p v-if="currentChapter">{{ currentChapter }}</p>
            <p v-if="totalChapters > 0">第 {{ currentChapterNum }} / {{ totalChapters }} 章</p>
          </div>
        </div>

        <div v-if="isAnalyzing || analysisResult || currentResult" class="tool-section">
          <h2>📝 分析结果</h2>
          <div class="result-content">{{ analysisResult || currentResult }}</div>
          <div v-if="analysisResult" class="result-buttons">
            <el-button type="success" @click="saveAnalysis">保存分析</el-button>
            <el-button type="success" @click="exportAnalysis">导出TXT</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="saveDialogVisible"
      title="保存分析结果"
      width="500px"
    >
      <el-form label-width="80px">
        <el-form-item label="文件名">
          <el-input v-model="saveFileName" placeholder="请输入文件名" />
          <div style="margin-top: 8px; font-size: 12px; color: #909399;">
            文件将保存到您的书籍文件夹中
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSaveAnalysis">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElButton, ElUpload, ElRadioGroup, ElRadio, ElInput, ElDialog } from 'element-plus'
import { getMinimaxApiKey, getMinimaxUrl } from '@renderer/service/minimax'

const router = useRouter()

const goBack = () => {
  router.push('/')
}

const selectedFile = ref(null)
const fileContent = ref('')
const analysisType = ref('summary')
const analysisResult = ref('')
const currentResult = ref('')
const isAnalyzing = ref(false)
const analysisProgress = ref(0)
const currentChapter = ref('')
const currentChapterNum = ref(0)
const totalChapters = ref(0)
let removeProgressListener = null
let removeChunkResultListener = null

const saveDialogVisible = ref(false)
const saveFileName = ref('')

const STORAGE_KEY_RESULT = 'bookAnalysisResult'
const STORAGE_KEY_CURRENT = 'bookAnalysisCurrentResult'
const STORAGE_KEY_STATE = 'bookAnalysisState'
const STORAGE_KEY_FILE_CONTENT = 'bookAnalysisFileContent'
const STORAGE_KEY_ANALYSIS_TYPE = 'bookAnalysisType'

onMounted(() => {
  const savedResult = localStorage.getItem(STORAGE_KEY_RESULT)
  const savedCurrent = localStorage.getItem(STORAGE_KEY_CURRENT)
  const savedState = localStorage.getItem(STORAGE_KEY_STATE)
  const savedFileContent = localStorage.getItem(STORAGE_KEY_FILE_CONTENT)
  const savedAnalysisType = localStorage.getItem(STORAGE_KEY_ANALYSIS_TYPE)
  
  if (savedResult) {
    analysisResult.value = savedResult
  } else if (savedCurrent) {
    currentResult.value = savedCurrent
  }
  
  if (savedFileContent) {
    fileContent.value = savedFileContent
    if (!selectedFile.value) {
      selectedFile.value = { name: '已保存的文件' }
    }
  }
  
  if (savedAnalysisType) {
    analysisType.value = savedAnalysisType
  }
  
  if (savedState && !savedResult) {
    const state = JSON.parse(savedState)
    isAnalyzing.value = state.isAnalyzing || false
    analysisProgress.value = state.analysisProgress || 0
    currentChapter.value = state.currentChapter || ''
    currentChapterNum.value = state.currentChapterNum || 0
    totalChapters.value = state.totalChapters || 0
    
    if (isAnalyzing.value && window.electron?.onMinimaxAnalyzeProgress && window.electron?.onMinimaxAnalyzeChunkResult) {
      if (removeProgressListener) {
        removeProgressListener()
        removeProgressListener = null
      }
      if (removeChunkResultListener) {
        removeChunkResultListener()
        removeChunkResultListener = null
      }
      
      removeProgressListener = window.electron.onMinimaxAnalyzeProgress((progressData) => {
        analysisProgress.value = progressData.progress
        currentChapter.value = progressData.chapter
        currentChapterNum.value = progressData.current
        totalChapters.value = progressData.total
      })

      removeChunkResultListener = window.electron.onMinimaxAnalyzeChunkResult((chunkResult) => {
        currentResult.value = chunkResult
      })
    }
  }
})

onUnmounted(() => {
  if (removeProgressListener) {
    removeProgressListener()
    removeProgressListener = null
  }
  if (removeChunkResultListener) {
    removeChunkResultListener()
    removeChunkResultListener = null
  }
})

watch(currentResult, (newVal) => {
  if (newVal) {
    localStorage.setItem(STORAGE_KEY_CURRENT, newVal)
  }
})

watch([isAnalyzing, analysisProgress, currentChapter, currentChapterNum, totalChapters], () => {
  const state = {
    isAnalyzing: isAnalyzing.value,
    analysisProgress: analysisProgress.value,
    currentChapter: currentChapter.value,
    currentChapterNum: currentChapterNum.value,
    totalChapters: totalChapters.value
  }
  localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state))
})

const handleFileChange = (file) => {
  if (file.raw) {
    selectedFile.value = file.raw
    if (file.raw.name.endsWith('.epub')) {
      // 对于 EPUB 文件，使用 ArrayBuffer 读取
      const reader = new FileReader()
      reader.onload = (e) => {
        fileContent.value = e.target.result
        ElMessage.success('EPUB文件加载成功')
      }
      reader.readAsArrayBuffer(file.raw)
    } else {
      // 对于 TXT 文件，使用文本读取
      const reader = new FileReader()
      reader.onload = (e) => {
        fileContent.value = e.target.result
        ElMessage.success('TXT文件加载成功')
      }
      reader.readAsText(file.raw)
    }
  }
}

const startAnalysis = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  if (!fileContent.value) {
    ElMessage.warning('文件内容为空')
    return
  }

  const minimaxKeyRes = await getMinimaxApiKey()
  const minimaxUrlRes = await getMinimaxUrl()
  
  if (!minimaxKeyRes?.success || !minimaxKeyRes.apiKey) {
    ElMessage.warning('请先在AI设置中配置Minimax API Key')
    return
  }

  // 检查是否是 EPUB 文件
  let finalContent = fileContent.value
  if (selectedFile.value && selectedFile.value.name.endsWith('.epub')) {
    try {
      ElMessage.info('正在解析 EPUB 文件...')
      const parseResult = await window.electron.parseEpub(fileContent.value)
      if (parseResult?.success) {
        finalContent = parseResult.content
        ElMessage.success(`EPUB 解析成功，共 ${parseResult.totalLength} 字`)
      } else {
        ElMessage.error('EPUB 解析失败: ' + parseResult?.message)
        return
      }
    } catch (error) {
      console.error('EPUB 解析失败:', error)
      ElMessage.error('EPUB 解析失败')
      return
    }
  }

  isAnalyzing.value = true
  analysisProgress.value = 0
  currentChapter.value = ''
  currentChapterNum.value = 0
  totalChapters.value = 0
  currentResult.value = ''
  
  localStorage.setItem(STORAGE_KEY_FILE_CONTENT, finalContent)
  localStorage.setItem(STORAGE_KEY_ANALYSIS_TYPE, analysisType.value)
  
  ElMessage.info('正在分析中...')

  try {
    if (window.electron?.analyzeBookWithMinimax && window.electron?.onMinimaxAnalyzeProgress && window.electron?.onMinimaxAnalyzeChunkResult) {
      removeProgressListener = window.electron.onMinimaxAnalyzeProgress((progressData) => {
        analysisProgress.value = progressData.progress
        currentChapter.value = progressData.chapter
        currentChapterNum.value = progressData.current
        totalChapters.value = progressData.total
      })

      removeChunkResultListener = window.electron.onMinimaxAnalyzeChunkResult((chunkResult) => {
        currentResult.value = chunkResult
      })

      const result = await window.electron.analyzeBookWithMinimax({
        content: finalContent,
        analysisType: analysisType.value,
        apiKey: minimaxKeyRes.apiKey,
        apiUrl: minimaxUrlRes?.url || ''
      })
      if (result?.success) {
        analysisResult.value = result.result
        localStorage.setItem(STORAGE_KEY_RESULT, result.result)
        localStorage.removeItem(STORAGE_KEY_CURRENT)
        localStorage.removeItem(STORAGE_KEY_STATE)
        localStorage.removeItem(STORAGE_KEY_FILE_CONTENT)
        localStorage.removeItem(STORAGE_KEY_ANALYSIS_TYPE)
        ElMessage.success('分析完成')
      } else {
        ElMessage.error(result?.message || '分析失败')
      }
    } else {
      setTimeout(() => {
        if (analysisType.value === 'summary') {
          analysisResult.value = '这是十万字总结的示例内容，实际应用中会根据Minimax AI生成5000字左右的总结...'
        } else {
          analysisResult.value = '第1章：这是第一章的摘要内容（200字左右）...\n\n第2章：这是第二章的摘要内容（200字左右）...\n\n第3章：这是第三章的摘要内容（200字左右）...'
        }
        ElMessage.success('分析完成')
      }, 1500)
    }
  } catch (error) {
    console.error('分析失败:', error)
    ElMessage.error('分析失败，请稍后重试')
  } finally {
    isAnalyzing.value = false
    if (!analysisResult.value) {
      localStorage.removeItem(STORAGE_KEY_STATE)
      localStorage.removeItem(STORAGE_KEY_FILE_CONTENT)
      localStorage.removeItem(STORAGE_KEY_ANALYSIS_TYPE)
    }
    if (removeProgressListener) {
      removeProgressListener()
      removeProgressListener = null
    }
    if (removeChunkResultListener) {
      removeChunkResultListener()
      removeChunkResultListener = null
    }
  }
}

const cancelAnalysis = async () => {
  try {
    if (window.electron?.cancelAnalysis) {
      await window.electron.cancelAnalysis()
    }
    ElMessage.info('正在取消分析...')
    isAnalyzing.value = false
    localStorage.removeItem(STORAGE_KEY_STATE)
    localStorage.removeItem(STORAGE_KEY_FILE_CONTENT)
    localStorage.removeItem(STORAGE_KEY_ANALYSIS_TYPE)
  } catch (error) {
    console.error('取消分析失败:', error)
    ElMessage.error('取消分析失败，请重试')
  }
}

const resetForm = () => {
  selectedFile.value = null
  fileContent.value = ''
  analysisType.value = 'summary'
  analysisResult.value = ''
  currentResult.value = ''
  isAnalyzing.value = false
  analysisProgress.value = 0
  currentChapter.value = ''
  currentChapterNum.value = 0
  totalChapters.value = 0
  
  localStorage.removeItem(STORAGE_KEY_RESULT)
  localStorage.removeItem(STORAGE_KEY_CURRENT)
  localStorage.removeItem(STORAGE_KEY_STATE)
  localStorage.removeItem(STORAGE_KEY_FILE_CONTENT)
  localStorage.removeItem(STORAGE_KEY_ANALYSIS_TYPE)
  
  ElMessage.info('已重置')
}

const saveAnalysis = () => {
  if (!analysisResult.value) {
    ElMessage.warning('请先进行分析')
    return
  }
  
  const now = new Date()
  const dateStr = now.getFullYear() + 
    String(now.getMonth() + 1).padStart(2, '0') + 
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0')
  
  saveFileName.value = `拆书分析_${dateStr}`
  saveDialogVisible.value = true
}

const confirmSaveAnalysis = async () => {
  if (!saveFileName.value.trim()) {
    ElMessage.warning('请输入文件名')
    return
  }

  try {
    if (window.electron?.saveBookAnalysis) {
      const result = await window.electron.saveBookAnalysis({
        fileName: saveFileName.value,
        content: analysisResult.value
      })

      if (result?.success) {
        ElMessage.success(`保存成功！已保存到：${result.path}`)
        saveDialogVisible.value = false
      } else {
        ElMessage.error(result?.message || '保存失败')
      }
    } else {
      ElMessage.error('保存功能不可用')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请重试')
  }
}

const exportAnalysis = async () => {
  if (!analysisResult.value) {
    ElMessage.warning('请先进行分析')
    return
  }

  try {
    const saveOptions = {
      title: '导出分析结果',
      defaultPath: `拆书分析_${Date.now()}.txt`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    }

    const saveResult = await window.electron.showSaveDialog(saveOptions)
    
    if (saveResult.canceled || !saveResult.filePath) {
      return
    }

    await window.electron.writeExportFile({
      filePath: saveResult.filePath,
      content: analysisResult.value
    })

    ElMessage.success('导出成功！')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}
</script>

<style lang="scss" scoped>
.book-analysis {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
  min-height: 100vh;
}

.top-navigation {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 0px 0 16px 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #e9ecef;

  .back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
  }
}

.analysis-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 16px;
  color: white;

  h1 {
    font-size: 2.5rem;
    margin: 0 0 16px 0;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.2rem;
    margin: 0;
    opacity: 0.9;
  }
}

.analysis-content {
  margin-bottom: 40px;
}

.analysis-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tool-section {
  margin-bottom: 30px;

  h2 {
    font-size: 1.3rem;
    color: #2c3e50;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #6366f1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.upload-tip {
  margin-left: 10px;
  font-size: 14px;
  color: #64748b;
}

.file-info {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #ffffff;
  border: 1px dashed #c7d2fe;
  border-radius: 8px;
  color: #34495e;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.result-content {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  color: #34495e;
  line-height: 1.8;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
}

.result-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.progress-info {
  margin-top: 16px;
  text-align: center;
  color: #64748b;
  font-size: 14px;

  p {
    margin: 8px 0;
  }
}
</style>
