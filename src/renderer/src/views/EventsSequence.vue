<template>
  <LayoutTool :title="`事序图 - ${bookName}`">
    <template #headrAction>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        <span>创建事序图</span>
      </el-button>
    </template>
    <template #default>
      <div class="events-sequence-content">
        <!-- 事序图列表 -->
        <div v-if="sequenceCharts.length > 0" class="sequence-charts">
          <div v-for="chart in sequenceCharts" :key="chart.id" class="sequence-chart">
            <!-- 甘特图表格 -->
            <div class="gantt-table">
              <!-- 表格头部 -->
              <div class="table-header">
                <div class="header-left">
                  <h3 class="chart-title">{{ chart.title }}</h3>
                </div>
                <div class="header-right">
                  <el-button type="primary" size="small" @click="addEvent(chart.id)">
                    <el-icon><Plus /></el-icon>
                    添加事件
                  </el-button>
                </div>
              </div>

              <!-- 表格主体 -->
              <div class="table-body">
                <div class="table-left">
                  <div class="left-header">
                    <div class="col-index">序号</div>
                    <div class="col-intro">介绍</div>
                  </div>
                  <div class="left-content">
                    <div v-for="event in chart.events" :key="event.id" class="event-row">
                      <div class="col-index">{{ event.index }}</div>
                      <div class="col-intro" :title="event.introduction">
                        <el-tooltip :content="event.introduction" placement="top" :show-after="500">
                          <span class="intro-text">{{ event.introduction }}</span>
                        </el-tooltip>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="table-right">
                  <div class="right-header">
                    <div v-for="i in 50" :key="i" class="time-cell">
                      {{ i }}
                    </div>
                  </div>
                  <div class="right-content">
                    <div v-for="event in chart.events" :key="event.id" class="event-row">
                      <div
                        v-for="i in 50"
                        :key="i"
                        class="time-cell"
                        :class="{ 'has-event': isEventAtTime(event, i) }"
                      >
                        <span v-if="isEventAtTime(event, i)" class="event-marker">●</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="content-placeholder">
          <el-empty :image-size="200" description="暂无事序图" class="empty-state">
            <template #description>
              <p>点击"创建事序图"开始创建您的事件时间轴</p>
            </template>
          </el-empty>
        </div>
      </div>
    </template>
  </LayoutTool>

  <!-- 创建事序图弹框 -->
  <el-dialog v-model="showCreateDialog" title="创建事序图" width="500px" @close="resetForm">
    <el-form :model="chartForm" :rules="chartRules" ref="chartFormRef" label-width="100px">
      <el-form-item label="主题名称" prop="title">
        <el-input
          v-model="chartForm.title"
          placeholder="请输入事序图的主题名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createSequenceChart">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import LayoutTool from '@renderer/components/LayoutTool.vue'

const route = useRoute()

// 获取书籍名称
const bookName = ref(route.query.name || '未命名书籍')

// 响应式数据
const showCreateDialog = ref(false)
const sequenceCharts = ref([])
const chartForm = ref({
  title: ''
})

// 表单验证规则
const chartRules = {
  title: [
    { required: true, message: '请输入事序图主题名称', trigger: 'blur' },
    { min: 1, max: 50, message: '主题名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

const chartFormRef = ref(null)

// 创建事序图
const createSequenceChart = async () => {
  try {
    await chartFormRef.value.validate()

    const newChart = {
      id: Date.now().toString(),
      title: chartForm.value.title,
      events: [],
      createdAt: new Date().toISOString()
    }

    sequenceCharts.value.push(newChart)
    showCreateDialog.value = false
    resetForm()

    ElMessage.success('事序图创建成功')
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 重置表单
const resetForm = () => {
  chartForm.value.title = ''
  chartFormRef.value?.clearValidate()
}

// 添加事件
const addEvent = (chartId) => {
  console.log('添加事件功能待开发，图表ID:', chartId)
  ElMessage.info('添加事件功能正在开发中')
}

// 判断事件在指定时间点是否存在
const isEventAtTime = (event, timeIndex) => {
  if (event.startTime && event.endTime) {
    return timeIndex >= event.startTime && timeIndex <= event.endTime
  }
  return false
}

// 为示例数据添加时间范围
const addTimeRangeToEvents = () => {
  sequenceCharts.value.forEach((chart) => {
    chart.events.forEach((event, index) => {
      // 为每个事件分配一个时间范围
      event.startTime = index + 1
      event.endTime = index + 3
    })
  })
}

// 添加示例数据用于测试
const addSampleData = () => {
  if (sequenceCharts.value.length === 0) {
    const sampleChart = {
      id: '1',
      title: '主线剧情发展',
      events: [
        {
          id: '1',
          index: 1,
          introduction: '故事开始，主角踏上冒险之旅'
        },
        {
          id: '2',
          index: 2,
          introduction: '遇见重要角色，获得关键信息'
        },
        {
          id: '3',
          index: 3,
          introduction: '面临第一个挑战，展现能力'
        }
      ],
      createdAt: new Date().toISOString()
    }
    sequenceCharts.value.push(sampleChart)
  }
}

// 页面加载时添加示例数据
addSampleData()
addTimeRangeToEvents()
</script>

<style lang="scss" scoped>
.events-sequence-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;

  :deep(.el-empty__description) {
    p {
      margin: 8px 0;
      color: var(--text-secondary);
      font-size: 14px;
    }
  }
}

.sequence-charts {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sequence-chart {
  background-color: var(--bg-base);
  border-radius: 8px;
  // box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.gantt-table {
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  // box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--bg-soft);
  border-bottom: 1px solid var(--border-color);

  .chart-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.table-body {
  display: flex;
  min-height: 400px;
  background-color: var(--bg-base);
}

.table-left {
  flex: 0 0 300px;
  border-right: 1px solid var(--border-color);
  background-color: var(--bg-base);

  .left-header {
    display: flex;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    color: var(--text-primary);
    height: 40px;
    position: sticky;
    top: 0;
    z-index: 10;

    .col-index {
      flex: 0 0 60px;
      padding: 8px;
      text-align: center;
      border-right: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg-primary);
    }

    .col-intro {
      flex: 1;
      padding: 8px;
      display: flex;
      align-items: center;
      background-color: var(--bg-primary);
    }
  }

  .left-content {
    .event-row {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      height: 40px;
      background-color: var(--bg-base);

      &:hover {
        background-color: var(--bg-soft);
      }

      .col-index {
        flex: 0 0 60px;
        padding: 8px;
        text-align: center;
        border-right: 1px solid var(--border-color);
        background-color: transparent;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 500;
      }

      .col-intro {
        flex: 1;
        padding: 8px;
        background-color: transparent;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.4;
        display: flex;
        align-items: center;
        overflow: hidden;

        .intro-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
      }
    }
  }
}

.table-right {
  flex: 1;
  overflow-x: auto;
  position: relative;
  background-color: var(--bg-base);

  .right-header {
    display: flex;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border-color);
    height: 40px;
    position: sticky;
    top: 0;
    z-index: 10;

    .time-cell {
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-secondary);
      background-color: var(--bg-soft);
      box-sizing: border-box;
      position: relative;
      min-width: 40px;
      font-weight: 500;
    }
  }

  .right-content {
    position: relative;

    .event-row {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      height: 40px;
      position: relative;

      .time-cell {
        flex: 0 0 40px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-right: 1px solid var(--border-color);
        background-color: var(--bg-base);
        box-sizing: border-box;
        position: relative;
        min-width: 40px;

        &.has-event {
          background-color: #e6f7ff;
          border: 1px solid #91d5ff;
        }

        .event-marker {
          color: #1890ff;
          font-size: 16px;
          font-weight: bold;
        }
      }
    }
  }
}
</style>
