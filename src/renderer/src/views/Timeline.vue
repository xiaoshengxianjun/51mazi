<template>
  <div class="timeline-manager">
    <el-button
      class="back-btn"
      icon="el-icon-arrow-left"
      circle
      style="margin-bottom: 16px"
      @click="goBack"
    />
    <div class="timeline-list">
      <div v-for="(timeline, idx) in timelines" :key="timeline.id" class="timeline-column">
        <el-input v-model="timeline.title" class="timeline-title" placeholder="时间线标题" />
        <div v-for="(node, nidx) in timeline.nodes" :key="node.id" class="timeline-node">
          <el-input v-model="node.title" placeholder="节点名称" style="margin-bottom: 4px" />
          <el-input
            v-model="node.desc"
            type="textarea"
            placeholder="详细描述"
            :rows="3"
            style="margin-bottom: 4px"
          />
          <el-button type="danger" size="small" @click="removeNode(idx, nidx)">删除节点</el-button>
        </div>
        <el-button size="small" @click="addNode(idx)" style="margin-top: 8px">新增节点</el-button>
        <el-button type="danger" size="small" @click="removeTimeline(idx)" style="margin-top: 8px"
          >删除时间线</el-button
        >
      </div>
      <div class="timeline-column add-timeline">
        <el-button type="primary" @click="addTimeline">新增时间线</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const timelines = ref([])
const bookName = route.query.name || ''

function goBack() {
  router.push('/editor?name=' + encodeURIComponent(bookName))
}

function genId(prefix = 'id') {
  return prefix + '-' + Math.random().toString(36).slice(2, 10)
}

async function loadTimelines() {
  try {
    const data = await window.electronAPI.readTimeline(bookName)
    timelines.value = Array.isArray(data) ? data : []
  } catch {
    timelines.value = []
  }
}
async function saveTimelines() {
  try {
    await window.electronAPI.writeTimeline(bookName, timelines.value)
  } catch {
    ElMessage.error('保存时间线失败')
  }
}

function addTimeline() {
  timelines.value.push({
    id: genId('timeline'),
    title: '新时间线',
    nodes: []
  })
}
function removeTimeline(idx) {
  timelines.value.splice(idx, 1)
}
function addNode(tidx) {
  timelines.value[tidx].nodes.push({
    id: genId('node'),
    title: '',
    desc: ''
  })
}
function removeNode(tidx, nidx) {
  timelines.value[tidx].nodes.splice(nidx, 1)
}

watch(timelines, saveTimelines, { deep: true })
onMounted(loadTimelines)
</script>

<style scoped>
.timeline-manager {
  padding: 24px;
  background: #fafbfc;
  min-height: 100vh;
}
.back-btn {
  position: absolute;
  left: 24px;
  top: 24px;
  z-index: 10;
}
.timeline-list {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}
.timeline-column {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px #0001;
  padding: 16px;
  min-width: 260px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.timeline-title {
  font-weight: bold;
  margin-bottom: 8px;
}
.timeline-node {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}
.add-timeline {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 180px;
  height: 100%;
  background: none;
  box-shadow: none;
}
</style>
