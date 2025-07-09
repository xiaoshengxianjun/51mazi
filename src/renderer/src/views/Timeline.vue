<template>
  <LayoutTool title="时间线管理">
    <template #headrAction>
      <el-button type="primary" @click="addTimeline">
        <el-icon><Plus /></el-icon>
        <span>新增时间线</span>
      </el-button>
    </template>
    <template #default>
      <div class="timeline-main">
        <div class="timeline-list">
          <div v-for="(timeline, idx) in timelines" :key="timeline.id" class="timeline-column">
            <div class="timeline-title-wrap">
              <h3
                v-show="editTitleIdx !== idx"
                class="timeline-title"
                @mouseenter="hoverTitleIdx = idx"
                @mouseleave="hoverTitleIdx = -1"
                @click="
                  () => {
                    editTitleIdx = idx
                    editTitleValue = timeline.title
                  }
                "
              >
                {{ timeline.title }}
                <el-icon v-show="hoverTitleIdx === idx" class="edit-title-icon"
                  ><EditPen
                /></el-icon>
              </h3>
              <el-input
                v-show="editTitleIdx === idx"
                v-model="editTitleValue"
                placeholder="时间线标题"
                :maxlength="20"
                :autofocus="true"
                input-style="text-align: center"
                @keyup.enter="confirmEditTitle(idx)"
                @blur="cancelEditTitle"
              />
            </div>
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
            <div class="timeline-actions">
              <el-button class="add-node-btn" @click="addNode(idx)">新增节点</el-button>
              <el-button class="remove-timeline-btn" type="danger" @click="removeTimeline(idx)">
                删除时间线
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </LayoutTool>
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
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, onMounted, watch, reactive, toRaw } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen, Delete, Plus } from '@element-plus/icons-vue'
import { genId } from '@renderer/utils/utils'

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
const hoverTitleIdx = ref(-1)
const editTitleIdx = ref(-1)
const editTitleValue = ref('')

async function loadTimelines() {
  try {
    const data = await window.electron.readTimeline(bookName)
    console.log(data)
    timelines.value = Array.isArray(data) ? data : []
  } catch {
    timelines.value = []
  }
}
async function saveTimelines() {
  try {
    // 彻底去除响应式
    const rawTimelines = JSON.parse(JSON.stringify(toRaw(timelines.value)))
    const result = await window.electron.writeTimeline(bookName, rawTimelines)
    if (!result) {
      throw new Error('保存失败')
    }
  } catch (error) {
    console.error('保存时间线失败:', error)
    ElMessage.error('保存时间线失败')
  }
}

function addTimeline() {
  timelines.value.push({
    id: genId(),
    title: '新时间线',
    nodes: []
  })
}
async function removeTimeline(idx) {
  try {
    await ElMessageBox.confirm('确定要删除该时间线吗？此操作不可恢复！', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    timelines.value.splice(idx, 1)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消，无需处理
  }
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
      id: genId(),
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
async function removeNode(tidx, nidx) {
  try {
    await ElMessageBox.confirm('确定要删除该节点吗？此操作不可恢复！', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    timelines.value[tidx].nodes.splice(nidx, 1)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消，无需处理
  }
}

function confirmEditTitle(idx) {
  if (editTitleValue.value.trim()) {
    timelines.value[idx].title = editTitleValue.value.trim()
  }
  editTitleIdx.value = -1
}
function cancelEditTitle() {
  editTitleIdx.value = -1
}

watch(timelines, saveTimelines, { deep: true })
onMounted(() => {
  loadTimelines()
})
</script>

<style scoped>
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
  /* background: var(--bg-soft); */
  padding: 16px;
  width: 320px;
  border-right: 1px solid var(--border-color-soft);
  display: inline-block;
  overflow-y: auto;
  .el-button {
    width: 100%;
  }
}
.timeline-title-wrap {
  position: relative;
  margin-bottom: 16px;
}
.timeline-title {
  height: 32px;
  font-weight: bold;
  text-align: center;
  color: var(--text-primary);
  margin-bottom: 0;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.edit-title-icon {
  font-size: 18px;
  transition: opacity 0.2s;
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
  color: var(--text-primary);
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
.timeline-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
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
