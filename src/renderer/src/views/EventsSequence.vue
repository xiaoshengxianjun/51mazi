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
                  <el-button type="warning" size="small" @click="openExpandDialog(chart.id)">
                    <el-icon><Expand /></el-icon>
                    扩展单元格
                  </el-button>
                  <el-button type="danger" size="small" @click="deleteEvent(chart.id)">
                    <el-icon><Delete /></el-icon>
                    删除事件
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
                    <div v-for="i in chart.cellCount || 100" :key="i" class="time-cell">
                      {{ i }}
                    </div>
                  </div>
                  <div class="right-content">
                    <!-- 背景单元格网格 -->
                    <div class="grid-background">
                      <div
                        v-for="rowIndex in chart.events.length"
                        :key="`row-${rowIndex}`"
                        class="grid-row"
                      >
                        <div
                          v-for="colIndex in chart.cellCount || 100"
                          :key="`cell-${rowIndex}-${colIndex}`"
                          class="grid-cell"
                        ></div>
                      </div>
                    </div>

                    <!-- 事件条层 -->
                    <div class="events-layer">
                      <div
                        v-for="event in chart.events"
                        :key="event.id"
                        class="event-bar-container"
                      >
                        <!-- 事件条 - 作为完整的横向组件 -->
                        <div
                          v-if="event.startTime && event.endTime"
                          class="event-bar"
                          :style="getEventBarStyle(event)"
                          :title="`${event.introduction} (${event.startTime}-${event.endTime})`"
                        >
                          <div class="event-label start-label">
                            {{ event.introduction.substring(0, 8) }}...
                          </div>
                        </div>
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
    <el-form ref="chartFormRef" :model="chartForm" :rules="chartRules" label-width="100px">
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

  <!-- 扩展单元格弹框 -->
  <el-dialog
    v-model="showExpandDialog"
    title="扩展单元格数量"
    width="500px"
    @close="resetExpandForm"
  >
    <el-form ref="expandFormRef" :model="expandForm" :rules="expandRules" label-width="120px">
      <el-form-item label="扩展数量" prop="cellCount">
        <el-input-number
          v-model="expandForm.cellCount"
          :min="100"
          :max="1000"
          :step="10"
          :controls="true"
          :controls-position="'right'"
          :disabled="false"
          placeholder="请输入扩展数量"
        />
        <div class="form-tip">
          当前单元格数量：{{ getCurrentCellCount() }}，扩展后将达到：{{
            getCurrentCellCount() + expandForm.cellCount
          }}
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showExpandDialog = false">取消</el-button>
        <el-button type="primary" @click="expandCells">确认</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Expand } from '@element-plus/icons-vue'
import LayoutTool from '@renderer/components/LayoutTool.vue'

const route = useRoute()

// 获取书籍名称
const bookName = ref(route.query.name || '未命名书籍')

// 响应式数据
const showCreateDialog = ref(false)
const showExpandDialog = ref(false)
const currentChartId = ref('')
const sequenceCharts = ref([])
const chartForm = ref({
  title: ''
})
const expandForm = ref({
  cellCount: 100 // 扩展数量，不是总数量
})

// 表单验证规则
const chartRules = {
  title: [
    { required: true, message: '请输入事序图主题名称', trigger: 'blur' },
    { min: 1, max: 50, message: '主题名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

const expandRules = {
  cellCount: [
    { required: true, message: '请输入扩展数量', trigger: 'blur' },
    {
      type: 'number',
      min: 100,
      max: 1000,
      message: '扩展数量必须在 100 到 1000 之间',
      trigger: 'blur'
    }
  ]
}

const chartFormRef = ref(null)
const expandFormRef = ref(null)

// 创建事序图
const createSequenceChart = async () => {
  try {
    await chartFormRef.value.validate()

    const newChart = {
      id: Date.now().toString(),
      title: chartForm.value.title,
      cellCount: 100, // 默认100个单元格
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

// 重置扩展表单
const resetExpandForm = () => {
  expandForm.value.cellCount = 100 // 重置为默认扩展数量
  expandFormRef.value?.clearValidate()
  currentChartId.value = ''
}

// 获取当前单元格数量
const getCurrentCellCount = () => {
  if (!currentChartId.value) return 50
  const chart = sequenceCharts.value.find((c) => c.id === currentChartId.value)
  return chart ? chart.cellCount || 50 : 50
}

// 打开扩展单元格弹框
const openExpandDialog = (chartId) => {
  currentChartId.value = chartId
  const chart = sequenceCharts.value.find((c) => c.id === chartId)
  if (chart) {
    // 设置扩展数量为100（默认扩展量）
    expandForm.value.cellCount = 100
  }
  showExpandDialog.value = true
}

// 扩展单元格
const expandCells = async () => {
  try {
    await expandFormRef.value.validate()

    const chart = sequenceCharts.value.find((c) => c.id === currentChartId.value)
    if (!chart) {
      ElMessage.error('未找到对应的事序图')
      return
    }

    // 计算新的总数量（当前数量 + 扩展数量）
    const newTotal = (chart.cellCount || 100) + expandForm.value.cellCount

    // 检查是否超过最大限制
    if (newTotal > 1000) {
      ElMessage.error(`扩展后总数量 ${newTotal} 超过最大限制 1000，请减少扩展数量`)
      return
    }

    // 更新单元格数量（累加）
    chart.cellCount = newTotal
    showExpandDialog.value = false
    resetExpandForm()

    ElMessage.success(
      `单元格数量已从 ${chart.cellCount - expandForm.value.cellCount} 扩展到 ${chart.cellCount}`
    )
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 添加事件
const addEvent = (chartId) => {
  console.log('添加事件功能待开发，图表ID:', chartId)
  ElMessage.info('添加事件功能正在开发中')
}

// 删除事件
const deleteEvent = (chartId) => {
  // 找到对应的图表
  const chart = sequenceCharts.value.find((c) => c.id === chartId)
  if (!chart) {
    ElMessage.error('未找到对应的事序图')
    return
  }

  // 二次确认
  ElMessageBox.confirm(`确定要删除事序图"${chart.title}"吗？此操作不可恢复。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  })
    .then(() => {
      // 执行删除操作
      const index = sequenceCharts.value.findIndex((c) => c.id === chartId)
      if (index > -1) {
        sequenceCharts.value.splice(index, 1)
        ElMessage.success('事序图删除成功')
      }
    })
    .catch(() => {
      // 用户取消删除
      ElMessage.info('已取消删除操作')
    })
}

// 获取事件条的样式（定位和尺寸）
const getEventBarStyle = (event) => {
  if (!event.startTime || !event.endTime) return {}

  const startPosition = (event.startTime - 1) * 40 // 40px是每个时间单元格的宽度
  const width = (event.endTime - event.startTime + 1) * 40

  // console.log(
  //   `事件 ${event.index}: start=${event.startTime}, end=${event.endTime}, left=${startPosition}px, width=${width}px`
  // )

  return {
    position: 'absolute',
    left: `${startPosition}px`,
    top: '2px', // 留出2px的顶部边距
    width: `${width}px`,
    height: '36px', // 减少高度，留出上下边距，在40px单元格内居中
    zIndex: 10,
    background: `linear-gradient(135deg, ${event.color || '#409EFF'} 0%, ${adjustBrightness(event.color || '#409EFF', -20)} 100%)`,
    opacity: 0.7,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 8px',
    boxSizing: 'border-box',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }
}

// 此函数已合并到上面的getEventBarStyle中

// 调整颜色亮度的辅助函数
const adjustBrightness = (hex, percent) => {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = ((num >> 8) & 0x00ff) + amt
  const B = (num & 0x0000ff) + amt
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  )
}

// 为示例数据添加时间范围
const addTimeRangeToEvents = () => {
  sequenceCharts.value.forEach((chart) => {
    chart.events.forEach((event, index) => {
      // 为每个事件分配一个时间范围，确保事件之间有重叠
      event.startTime = index + 1
      event.endTime = index + 3 // 调整为3个时间单位的持续时间

      // 为每个事件分配不同的颜色
      const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']
      event.color = colors[index % colors.length]
    })
  })
}

// 添加示例数据用于测试
const addSampleData = () => {
  if (sequenceCharts.value.length === 0) {
    const sampleChart = {
      id: '1',
      title: '主线剧情发展',
      cellCount: 100, // 默认100个单元格
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
        },
        {
          id: '4',
          index: 4,
          introduction: '探索神秘遗迹，发现宝藏'
        },
        {
          id: '5',
          index: 5,
          introduction: '与反派首次交锋，险胜'
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

// 调试：输出事件数据
console.log('事序图数据:', sequenceCharts.value)
sequenceCharts.value.forEach((chart) => {
  console.log(`图表 "${chart.title}" 的事件:`, chart.events)

  // 输出每个事件的样式信息
  chart.events.forEach((event) => {
    const style = getEventBarStyle(event)
    console.log(`事件 ${event.index} 样式:`, style)
  })
})
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

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
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
  min-width: 0; /* 允许表格收缩 */
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
  overflow: hidden; /* 防止整体出现滚动条 */
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
    z-index: 20; /* 确保头部在最上层 */

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
      position: relative;
      z-index: 5; /* 确保内容行在表格线之上 */

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
    z-index: 20; /* 确保头部在最上层 */
    min-width: max-content; /* 确保头部不会被压缩 */

    .time-cell {
      flex: 0 0 40px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid var(--border-color);
      border-bottom: 1px solid var(--border-color);
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
    min-width: max-content; /* 确保内容不会被压缩 */
    overflow: visible; /* 确保事件条容器不被裁剪 */

    // 背景网格样式
    .grid-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;

      .grid-row {
        display: flex;
        height: 40px; // 与事件行高度保持一致
        border-bottom: 1px solid #e4e7ed;

        .grid-cell {
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          border-right: 1px solid #e4e7ed;
          background-color: transparent;
          box-sizing: border-box;
        }
      }
    }

    // 事件条层样式
    .events-layer {
      position: relative;
      z-index: 10;
      height: 100%;

      .event-bar-container {
        position: relative;
        height: 40px; // 保持容器高度与单元格一致

        .event-bar {
          &:hover {
            opacity: 1 !important;
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 15;
            // 悬停时保持在同一位置，不超出单元格边界
          }

          .event-label {
            color: white;
            font-size: 10px;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            user-select: none;
            pointer-events: none;
            line-height: 1.2;

            &.start-label {
              max-width: 100%;
            }
          }
        }
      }
    }
  }
}
</style>
