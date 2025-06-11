<template>
  <div class="timeline-manager">
    <div class="timeline-header">
      <el-button class="back-btn" :icon="ArrowLeftBold" text @click="goBack">
        <span>返回</span>
      </el-button>
    </div>
    <div class="timeline-main">
      <div class="timeline-list">
        <div v-for="(timeline, idx) in timelines" :key="timeline.id" class="timeline-column">
          <h2 class="timeline-title">{{ timeline.title }}</h2>
          <!-- <el-input
          v-model="timeline.title"
          class="timeline-title"
          placeholder="时间线标题"
          input-style="text-align: center"
        /> -->
          <el-timeline>
            <el-timeline-item
              v-for="(node, nidx) in timeline.nodes"
              :key="node.id"
              :timestamp="node.title"
              placement="top"
            >
              <div class="timeline-node-content">
                <p>{{ node.desc }}</p>
                <div class="timeline-node-actions">
                  <el-icon @click="addNode(idx, nidx)"><EditPen /></el-icon>
                  <el-icon @click="removeNode(idx, nidx)"><Delete /></el-icon>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-button class="add-node-btn" @click="addNode(idx)">新增节点</el-button>
          <el-button class="remove-timeline-btn" type="danger" @click="removeTimeline(idx)">
            删除时间线
          </el-button>
        </div>
        <div class="timeline-column add-timeline">
          <el-button type="primary" @click="addTimeline">新增时间线</el-button>
        </div>
      </div>
    </div>
  </div>
  <el-dialog
    v-model="dialogVisible"
    :title="nodeInfo.id === -1 ? '新增节点' : '编辑节点'"
    width="500px"
    @close="dialogVisible = false"
  >
    <el-form :model="nodeInfo" label-width="80px">
      <el-form-item label="节点标题">
        <el-input v-model="nodeInfo.title" placeholder="节点标题" clearable />
      </el-form-item>
      <el-form-item label="节点描述">
        <el-input
          v-model="nodeInfo.desc"
          placeholder="节点描述"
          type="textarea"
          :rows="3"
          clearable
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAddNode">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, watch, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeftBold, EditPen, Delete } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const dialogVisible = ref(false)
const nodeInfo = reactive({
  id: -1,
  title: '',
  desc: ''
})
const timelines = ref([])
const bookName = route.query.name || ''
const currentTimelineIdx = ref(-1)
const currentNodeIdx = ref(-1)

function goBack() {
  router.push('/editor?name=' + encodeURIComponent(bookName))
}

function genId(prefix = 'id') {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
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
/**
 * 新增节点
 * @param {*} idx 时间线索引
 * @param {*} nidx 节点索引，-1 表示新增节点
 */
function addNode(idx, nidx) {
  currentTimelineIdx.value = idx
  currentNodeIdx.value = nidx
  if (nidx === undefined) {
    nodeInfo.title = '新节点'
    nodeInfo.desc = ''
  } else {
    nodeInfo.id = timelines.value[idx].nodes[nidx].id
    nodeInfo.title = timelines.value[idx].nodes[nidx].title || '新节点'
    nodeInfo.desc = timelines.value[idx].nodes[nidx].desc || ''
  }
  console.log(nodeInfo)
  dialogVisible.value = true
}
function confirmAddNode() {
  if (nodeInfo.id === -1) {
    timelines.value[currentTimelineIdx.value].nodes.push({
      id: genId('node'),
      title: nodeInfo.title,
      desc: nodeInfo.desc
    })
  } else {
    timelines.value[currentTimelineIdx.value].nodes[currentNodeIdx.value] = {
      id: nodeInfo.id,
      title: nodeInfo.title,
      desc: nodeInfo.desc
    }
  }
  dialogVisible.value = false
}
function removeNode(tidx, nidx) {
  timelines.value[tidx].nodes.splice(nidx, 1)
}

watch(timelines, saveTimelines, { deep: true })
onMounted(loadTimelines)
</script>

<style scoped>
.timeline-manager {
  padding: 8px 16px;
  background-color: var(--bg-primary);
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.timeline-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 10px;
}
.timeline-main {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}
.timeline-list {
  height: 100%;
  width: max-content;
}
.timeline-column {
  height: 100%;
  background: var(--bg-soft);
  box-shadow: 0 2px 8px #0001;
  padding: 16px;
  width: 320px;
  border-right: 1px solid var(--border-color-soft);
  display: inline-block;
  overflow-y: auto;
  .el-button {
    width: 100%;
  }
}
.timeline-title {
  font-weight: bold;
  margin-bottom: 16px;
  text-align: center;
  color: var(--text-primary);
}
.el-timeline {
  padding: 0;
}
.timeline-node-content {
  padding: 8px 16px;
  background: var(--bg-mute);
  border-radius: 6px;
  box-shadow: 0 2px 8px #0002;
  position: relative;
  overflow: hidden;
  &:hover {
    .timeline-node-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 28px;
    }
  }
}
.timeline-node-actions {
  position: absolute;
  right: 0px;
  top: 0px;
  left: 0px;
  bottom: 0px;
  display: none;
  background: #0008;
  color: #fff;
  font-size: 18px;
  .el-icon {
    cursor: pointer;
  }
}
.add-node-btn {
  margin-top: 8px;
  margin-bottom: 8px;
}
.remove-timeline-btn {
  margin: 0;
}
.timeline-node {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
}
.add-timeline {
  .el-button {
    width: 100%;
  }
}
</style>
