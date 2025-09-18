<template>
  <LayoutTool title="组织架构列表">
    <template #headrAction>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        <span>创建组织架构</span>
      </el-button>
    </template>
    <template #default>
      <div class="organization-grid">
        <el-dropdown
          v-for="organization in organizations"
          :key="organization.id"
          trigger="contextmenu"
          @command="handleCommand($event, organization)"
        >
          <div class="organization-item">
            <div class="organization-image" @click="handleEditOrganization(organization)">
              <img
                :src="organizationImages[organization.id] || getDefaultImage()"
                :alt="organization.name"
              />
            </div>
            <div class="organization-info">
              <span class="organization-name">{{ organization.name }}</span>
              <span class="organization-description">{{ organization.description }}</span>
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
      <el-empty v-if="organizations.length === 0" :image-size="200" description="暂无组织架构" />
    </template>
  </LayoutTool>

  <!-- 创建组织架构弹框 -->
  <el-dialog
    v-model="showCreateDialog"
    title="创建新组织架构"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form ref="createFormRef" :model="createForm" :rules="rules" label-width="80px">
      <el-form-item label="名称" prop="name">
        <el-input
          v-model="createForm.name"
          clearable
          maxlength="20"
          placeholder="请输入组织架构名称"
        />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="createForm.description"
          type="textarea"
          :rows="3"
          placeholder="请输入组织架构描述"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateOrganization">
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
    <span>确定要删除组织架构 "{{ selectedOrganization?.name }}" 吗？此操作不可恢复。</span>
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
import { genId } from '@renderer/utils/utils'

const router = useRouter()
const route = useRoute()
const bookName = route.query.name

const organizations = ref([])
const showCreateDialog = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const deleteDialogVisible = ref(false)
const selectedOrganization = ref(null)
const organizationImages = ref({})

const createForm = ref({
  name: '',
  description: ''
})

const rules = {
  name: [
    { required: true, message: '请输入组织架构名称', trigger: 'blur' },
    { min: 1, max: 20, message: '名称长度在 1 到 20 个字符', trigger: 'blur' }
  ],
  description: [{ max: 200, message: '描述长度不能超过 200 个字符', trigger: 'blur' }]
}

// 获取默认图片
const getDefaultImage = () => {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}

// 加载组织架构列表
const loadOrganizations = async () => {
  try {
    const result = await window.electron.readOrganizations(bookName)
    if (result.success) {
      organizations.value = result.data || []

      // 加载每个组织架构的图片
      for (const organization of organizations.value) {
        if (organization.thumbnail) {
          try {
            const imageData = await window.electron.readOrganizationImage({
              bookName,
              imageName: organization.thumbnail
            })
            organizationImages.value[organization.id] = imageData
          } catch (error) {
            console.error('读取组织架构缩略图失败:', error)
            organizationImages.value[organization.id] = getDefaultImage()
          }
        } else {
          organizationImages.value[organization.id] = getDefaultImage()
        }
      }
    } else {
      console.error('加载组织架构失败:', result.error)
      ElMessage.error('加载组织架构失败')
    }
  } catch (error) {
    console.error('加载组织架构失败:', error)
    ElMessage.error('加载组织架构失败')
  }
}

onMounted(() => {
  loadOrganizations()
})

// 创建组织架构
const handleCreateOrganization = async () => {
  if (!createFormRef.value) return

  try {
    await createFormRef.value.validate()
    creating.value = true

    // 创建三层组织架构示例数据（垂直布局）
    const rootNode = {
      id: genId(),
      text: '总部',
      type: 'root',
      color: '#409eff',
      description: '公司总部',
      level: 1,
      position: { x: 400, y: 100 },
      data: {
        fontSize: 16
      }
    }

    // 第二层：部门
    const dept1 = {
      id: genId(),
      text: '技术部',
      type: 'normal',
      color: '#67c23a',
      description: '负责技术研发',
      level: 2,
      position: { x: 200, y: 250 },
      data: {
        fontSize: 14
      }
    }

    const dept2 = {
      id: genId(),
      text: '市场部',
      type: 'normal',
      color: '#e6a23c',
      description: '负责市场推广',
      level: 2,
      position: { x: 400, y: 250 },
      data: {
        fontSize: 14
      }
    }

    const dept3 = {
      id: genId(),
      text: '人事部',
      type: 'normal',
      color: '#f56c6c',
      description: '负责人力资源',
      level: 2,
      position: { x: 600, y: 250 },
      data: {
        fontSize: 14
      }
    }

    // 第三层：团队
    const team1 = {
      id: genId(),
      text: '前端团队',
      type: 'normal',
      color: '#67c23a',
      description: '前端开发团队',
      level: 3,
      position: { x: 100, y: 400 },
      data: {
        fontSize: 12
      }
    }

    const team2 = {
      id: genId(),
      text: '后端团队',
      type: 'normal',
      color: '#67c23a',
      description: '后端开发团队',
      level: 3,
      position: { x: 300, y: 400 },
      data: {
        fontSize: 12
      }
    }

    const team3 = {
      id: genId(),
      text: '销售团队',
      type: 'normal',
      color: '#e6a23c',
      description: '产品销售团队',
      level: 3,
      position: { x: 500, y: 400 },
      data: {
        fontSize: 12
      }
    }

    const team4 = {
      id: genId(),
      text: '招聘团队',
      type: 'normal',
      color: '#f56c6c',
      description: '人才招聘团队',
      level: 3,
      position: { x: 700, y: 400 },
      data: {
        fontSize: 12
      }
    }

    // 创建连接线（使用弧线样式）
    const lines = [
      {
        id: genId(),
        from: rootNode.id,
        to: dept1.id,
        text: '',
        color: '#409eff',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true // 显示箭头
      },
      {
        id: genId(),
        from: rootNode.id,
        to: dept2.id,
        text: '',
        color: '#409eff',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true
      },
      {
        id: genId(),
        from: rootNode.id,
        to: dept3.id,
        text: '',
        color: '#409eff',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true
      },
      {
        id: genId(),
        from: dept1.id,
        to: team1.id,
        text: '',
        color: '#67c23a',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true
      },
      {
        id: genId(),
        from: dept1.id,
        to: team2.id,
        text: '',
        color: '#67c23a',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true
      },
      {
        id: genId(),
        from: dept2.id,
        to: team3.id,
        text: '',
        color: '#e6a23c',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true
      },
      {
        id: genId(),
        from: dept3.id,
        to: team4.id,
        text: '',
        color: '#f56c6c',
        lineWidth: 2,
        lineShape: 44, // 圆角折线样式
        showEndArrow: true
      }
    ]

    const organizationData = {
      id: Date.now().toString(),
      name: createForm.value.name,
      description: createForm.value.description,
      nodes: [rootNode, dept1, dept2, dept3, team1, team2, team3, team4],
      lines: lines,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await window.electron.createOrganization({
      bookName,
      organizationName: createForm.value.name,
      organizationData
    })

    // 保存组织名称用于跳转
    const organizationName = createForm.value.name

    ElMessage.success('创建成功')
    showCreateDialog.value = false
    createForm.value = { name: '', description: '' }

    // 重新加载组织架构列表
    // await loadOrganizations()

    // 等待一小段时间确保文件系统同步
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 跳转到编辑页面
    router.push({
      path: '/organization-design',
      query: {
        name: bookName,
        id: organizationName
      }
    })
  } catch (error) {
    console.error('创建组织架构失败:', error)
    ElMessage.error('创建组织架构失败')
  } finally {
    creating.value = false
  }
}

// 编辑组织架构
const handleEditOrganization = (organization) => {
  router.push({
    path: '/organization-design',
    query: { name: bookName, id: organization.name }
  })
}

// 处理右键菜单命令
const handleCommand = (command, organization) => {
  switch (command) {
    case 'edit':
      handleEditOrganization(organization)
      break
    case 'delete':
      selectedOrganization.value = organization
      deleteDialogVisible.value = true
      break
  }
}

// 确认删除
const confirmDelete = async () => {
  if (!selectedOrganization.value) return

  try {
    await window.electron.deleteOrganization({
      bookName,
      organizationName: selectedOrganization.value.name
    })

    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    selectedOrganization.value = null

    // 重新加载组织架构列表
    await loadOrganizations()
  } catch (error) {
    console.error('删除组织架构失败:', error)
    ElMessage.error('删除组织架构失败')
  }
}
</script>

<style scoped>
.organization-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
}

.organization-item {
  background: var(--bg-primary);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.organization-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.organization-image {
  width: 100%;
  height: 120px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.organization-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.organization-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.organization-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.organization-description {
  font-size: 14px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
