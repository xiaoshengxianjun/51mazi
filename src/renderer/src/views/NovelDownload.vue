<template>
  <div class="novel-download-page">
    <div class="top-navigation">
      <el-button class="back-button" type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回首页
      </el-button>
    </div>

    <div class="analysis-header">
      <h1>📚 小说下载</h1>
      <p class="subtitle">使用 SoNovel 下载小说，支持多书源搜索</p>
    </div>

    <div class="content">
      <div class="intro-card">
        <i class="el-icon-download intro-icon"></i>
        <h3>SoNovel 小说下载器</h3>
      </div>

      <div class="action-section">
        <div class="download-options">
          <el-form :inline="true" class="option-form">
            <el-form-item label="下载地址">
              <el-input v-model="downloadPath" size="large" class="path-input" placeholder="请选择下载保存位置">
                <template #append>
                  <el-button @click="selectDownloadPath">
                    <i class="el-icon-folder"></i>
                    选择
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </div>
        <el-button type="primary" size="large" @click="openNovelDownloader" class="download-btn">
          <i class="el-icon-download"></i>
          打开小说下载器
        </el-button>
      </div>

      <!-- 已下载文件列表 -->
      <div v-if="downloadedFiles.length > 0" class="downloaded-files-section">
        <el-card>
          <template #header>
            <div class="card-header">
              <i class="el-icon-document-checked"></i>
              已下载文件
            </div>
          </template>
          <el-table :data="downloadedFiles" style="width: 100%">
            <el-table-column prop="filename" label="文件名" min-width="200"></el-table-column>
            <el-table-column prop="targetPath" label="保存位置" min-width="300"></el-table-column>
            <el-table-column prop="time" label="下载时间" width="180"></el-table-column>
          </el-table>
        </el-card>
      </div>

      <div class="tips-section">
        <el-card>
          <template #header>
            <div class="card-header">
              <i class="el-icon-info"></i>
              使用提示
            </div>
          </template>
          <ul class="tips-list">
            <li>选择下载保存位置后，点击按钮打开 SoNovel 小说下载器</li>
            <li>在下载器中搜索并下载您想要的小说</li>
            <li>下载完成后，文件会自动移动到您选择的位置</li>
            <li>下载完成后，可在"拆书工具"中导入分析</li>
            <li><strong>提示：</strong>由于下载源可能失效，可能导致搜不到小说。关闭运行脚本后再次进入会自动切换下载源，可进行多次尝试。</li>
          </ul>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()
const downloadPath = ref('') // 下载保存位置
const downloadedFiles = ref([]) // 已下载的文件列表
let unsubscribeDownloadComplete = null

const goBack = () => {
  router.push('/')
}

const selectDownloadPath = async () => {
  try {
    if (window.electron?.openDirectoryDialog) {
      const result = await window.electron.openDirectoryDialog()
      if (result?.success && result.path) {
        downloadPath.value = result.path
      }
    } else {
      ElMessage.error('功能暂不可用')
    }
  } catch (error) {
    console.error('选择目录失败:', error)
    ElMessage.error('选择目录失败')
  }
}

const openNovelDownloader = async () => {
  try {
    if (window.electron?.openNovelDownloader) {
      const result = await window.electron.openNovelDownloader(downloadPath.value)
      if (result?.success) {
        ElMessage.success(result?.message || '已打开小说下载器')
      } else {
        ElMessage.error(result?.message || '打开失败，请重试')
      }
    } else {
      ElMessage.error('功能暂不可用')
    }
  } catch (error) {
    console.error('打开小说下载器失败:', error)
    ElMessage.error('打开小说下载器失败')
  }
}

// 监听下载完成事件
onMounted(() => {
  if (window.electron?.onDownloadComplete) {
    unsubscribeDownloadComplete = window.electron.onDownloadComplete((data) => {
      downloadedFiles.value.unshift({
        filename: data.filename,
        targetPath: data.targetPath,
        time: new Date().toLocaleString()
      })
      ElMessage.success(`文件下载完成: ${data.filename}`)
    })
  }
})

onUnmounted(() => {
  if (unsubscribeDownloadComplete) {
    unsubscribeDownloadComplete()
  }
  // 停止监控
  if (window.electron?.stopDownloadWatcher) {
    window.electron.stopDownloadWatcher()
  }
})
</script>

<style lang="scss" scoped>
.novel-download-page {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 20px;
}

.top-navigation {
  margin-bottom: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
}

.analysis-header {
  text-align: center;
  margin-bottom: 40px;

  h1 {
    margin: 0 0 10px 0;
    color: var(--text-base);
    font-size: 32px;
  }

  .subtitle {
    margin: 0;
    color: var(--text-secondary);
    font-size: 16px;
  }
}

.content {
  max-width: 800px;
  margin: 0 auto;
}

.intro-card {
  text-align: center;
  padding: 40px;
  background: linear-gradient(135deg, var(--bg-soft) 0%, var(--bg-mute) 100%);
  border-radius: 16px;
  margin-bottom: 30px;

  .intro-icon {
    font-size: 64px;
    color: var(--primary-color);
    margin-bottom: 20px;
  }

  h3 {
    margin: 0 0 10px 0;
    color: var(--text-base);
    font-size: 24px;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.action-section {
  text-align: center;
  margin-bottom: 30px;

  .download-options {
    margin-bottom: 20px;
  }

  .option-form {
    justify-content: center;
  }

  .path-input {
    width: 400px;
  }

  .download-btn {
    padding: 15px 40px;
    font-size: 16px;
    border-radius: 8px;

    i {
      margin-right: 8px;
    }
  }
}

.downloaded-files-section {
  margin-bottom: 30px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--text-base);
  }
}

.tips-section {
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--text-base);
  }

  .tips-list {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);

    li {
      margin-bottom: 12px;
      line-height: 1.6;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

:deep(.el-card) {
  background-color: var(--bg-soft);
  border: 1px solid var(--border-color);

  .el-card__header {
    border-bottom: 1px solid var(--border-color);
  }
}
</style>
