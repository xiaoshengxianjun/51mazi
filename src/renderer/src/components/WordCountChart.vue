<template>
  <div class="chart-area">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'

defineProps({
  height: {
    type: String,
    default: '200px'
  }
})

const chartRef = ref(null)
let chart = null

// 获取最近30天的日期数组
function getLast30Days() {
  const dates = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

// 初始化图表
function initChart() {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)
  const dates = getLast30Days()

  // 设置图表配置
  const option = {
    title: {
      text: '最近30天码字统计',
      left: 'center',
      textStyle: {
        // color: 'var(--text-primary)',
        fontSize: 15
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params) => {
        const data = params[0]
        return `${data.name}<br/>${data.seriesName}：${data.value}字`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        // color: 'var(--text-primary)',
        formatter: (value) => value.slice(5) // 只显示月-日
      }
    },
    yAxis: {
      type: 'value',
      name: '字数',
      axisLabel: {
        // color: 'var(--text-primary)'
      }
    },
    series: [
      {
        name: '日码字数',
        type: 'bar',
        data: new Array(30).fill(0),
        itemStyle: {
          color: '#409EFF'
        }
      }
    ]
  }

  chart.setOption(option)

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 更新图表数据
async function updateChartData() {
  if (!chart) return

  try {
    const result = await window.electron.getDailyWordCount()
    if (result.success) {
      const dates = getLast30Days()
      const data = dates.map((date) => result.data[date] || 0)

      chart.setOption({
        series: [
          {
            data: data
          }
        ]
      })
    }
  } catch (error) {
    console.error('获取码字统计数据失败:', error)
  }
}

// 处理窗口大小变化
function handleResize() {
  chart && chart.resize()
}

// 暴露更新方法
defineExpose({
  updateData: updateChartData
})

onMounted(() => {
  initChart()
  updateChartData()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart && chart.dispose()
})
</script>

<style lang="scss" scoped>
.chart-area {
  background: var(--bg-soft);
  border-radius: 8px;

  .chart-container {
    width: 100%;
    height: v-bind('height');
  }
}
</style>
