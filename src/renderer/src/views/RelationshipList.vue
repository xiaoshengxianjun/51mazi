<template>
  <LayoutTool title="关系图列表">
    <template #headrAction>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        <span>创建关系图</span>
      </el-button>
    </template>
    <template #default>
      <div class="relationship-grid">
        <el-dropdown
          v-for="relationship in relationships"
          :key="relationship.id"
          trigger="contextmenu"
          @command="handleCommand($event, relationship)"
        >
          <div class="relationship-item">
            <div class="relationship-image" @click="handleEditRelationship(relationship)">
              <img 
                :src="relationshipImages[relationship.id] || getDefaultImage()" 
                :alt="relationship.name" 
              />
            </div>
            <div class="relationship-info">
              <span class="relationship-name">{{ relationship.name }}</span>
            </div>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">编辑</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-empty v-if="relationships.length === 0" :image-size="200" description="暂无关系图" />
    </template>
  </LayoutTool>

  <!-- 创建关系图弹框 -->
  <el-dialog
    v-model="showCreateDialog"
    title="创建新关系图"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form ref="createFormRef" :model="createForm" :rules="rules" label-width="80px">
      <el-form-item label="名称" prop="name">
        <el-input
          v-model="createForm.name"
          clearable
          maxlength="20"
          placeholder="请输入关系图名称"
        />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="createForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入关系图描述"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateRelationship">
          创建
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 删除确认弹框 -->
  <el-dialog
    v-model="deleteDialogVisible"
    title="确认删除"
    width="500px"
    :close-on-click-modal="false"
  >
    <span>确定要删除关系图 "{{ selectedRelationship?.name }}" 吗？此操作不可恢复。</span>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确认删除</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name

const relationships = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const deleteDialogVisible = ref(false)
const selectedRelationship = ref(null)
const relationshipImages = ref({}) // 存储关系图图片的响应式数据

const createForm = ref({
  name: '',
  description: ''
})

const rules = {
  name: [
    { required: true, message: '请输入关系图名称', trigger: 'blur' },
    { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  description: [{ max: 200, message: '描述长度不能超过 200 个字符', trigger: 'blur' }]
}

// 加载关系图列表
const loadRelationships = async () => {
  try {
    const result = await window.electron.readRelationships(bookName)
    relationships.value = result || []

    // 加载每个关系图的图片
    for (const relationship of relationships.value) {
      if (relationship.thumbnail) {
        try {
          const imageData = await window.electron.readRelationshipImage({
            bookName,
            imageName: relationship.thumbnail
          })
          relationshipImages.value[relationship.id] = imageData
        } catch (error) {
          console.error('读取关系图缩略图失败:', error)
          relationshipImages.value[relationship.id] = getDefaultImage()
        }
      } else {
        relationshipImages.value[relationship.id] = getDefaultImage()
      }
    }
  } catch (error) {
    console.error('加载关系图列表失败:', error)
    ElMessage.error('加载关系图列表失败')
  }
}

onMounted(() => {
  loadRelationships()
})

// 创建关系图
const handleCreateRelationship = async () => {
  if (!createFormRef.value) return

  try {
    await createFormRef.value.validate()
    creating.value = true

    // 创建关系图数据（不包含缩略图）
    const relationshipData = {
      id: Date.now().toString(),
      name: createForm.value.name,
      description: createForm.value.description,
      nodes: [],
      lines: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await window.electron.createRelationship({
      bookName,
      relationshipName: createForm.value.name,
      relationshipData
    })

    ElMessage.success('创建成功')
    showCreateDialog.value = false

    // 重新加载关系图列表
    await loadRelationships()

    // 跳转到编辑页面
    router.push({
      path: '/relationship-design',
      query: {
        name: bookName,
        id: createForm.value.name
      }
    })
  } catch (error) {
    console.error('创建关系图失败:', error)
    ElMessage.error('创建关系图失败')
  } finally {
    creating.value = false
  }
}

// 编辑关系图
const handleEditRelationship = (relationship) => {
  router.push({
    path: '/relationship-design',
    query: { name: bookName, id: relationship.name }
  })
}

// 处理右键菜单命令
const handleCommand = (command, relationship) => {
  switch (command) {
    case 'edit':
      handleEditRelationship(relationship)
      break
    case 'delete':
      selectedRelationship.value = relationship
      deleteDialogVisible.value = true
      break
  }
}

// 确认删除
const confirmDelete = async () => {
  if (!selectedRelationship.value) return

  try {
    await window.electron.deleteRelationship({
      bookName,
      relationshipName: selectedRelationship.value.name
    })
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    selectedRelationship.value = null
    // 重新加载关系图列表
    loadRelationships()
  } catch (error) {
    console.error('删除关系图失败:', error)
    ElMessage.error('删除关系图失败')
  }
}

// 获取默认图片
const getDefaultImage = () => {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}
</script>

<style lang="scss" scoped>
.relationship-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;

  .relationship-item {
    width: 280px;
    cursor: pointer;

    &:hover {
      .relationship-image {
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
      }
    }

    .relationship-image {
      width: 100%;
      height: 210px;
      border-radius: 8px;
      overflow: hidden;
      transition: box-shadow 0.2s;
      background-color: #f5f7fa;
      border: 1px solid #e4e7ed;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .relationship-info {
      padding: 12px;
      text-align: center;
      color: var(--text-primary);

      .relationship-name {
        font-size: 16px;
        font-weight: 500;
      }
    }
  }
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
