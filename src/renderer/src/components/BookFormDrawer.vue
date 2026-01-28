<template>
  <el-drawer
    :model-value="modelValue"
    :title="isEdit ? '编辑书籍' : '新建书籍'"
    size="700px"
    direction="rtl"
    class="book-drawer"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="drawer-content">
      <el-form
        ref="formRef"
        :model="localForm"
        :rules="rules"
        label-width="80px"
        class="drawer-form"
      >
        <el-form-item prop="name" label="书名">
          <el-input
            v-model="localForm.name"
            placeholder="请输入书籍名称（最多15个字符）"
            maxlength="15"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="type" label="类型">
          <el-cascader
            v-model="localForm.type"
            :options="bookTypeCascaderOptions"
            :props="{ expandTrigger: 'hover', emitPath: false }"
            placeholder="先选大类，再选细类"
            style="width: 100%"
            clearable
          />
        </el-form-item>
        <el-form-item prop="targetCount" label="目标字数">
          <el-input
            v-model="localForm.targetCount"
            placeholder="请输入目标字数"
            type="number"
            :min="10000"
            :max="10000000"
            :step="100000"
          />
        </el-form-item>
        <el-form-item prop="intro" label="简介">
          <el-input v-model="localForm.intro" type="textarea" :rows="5" placeholder="请输入简介" />
        </el-form-item>
        <el-form-item prop="password" label="密码">
          <el-input
            v-model="localForm.password"
            type="password"
            placeholder="请输入4-8位数字或字母组合（可选）"
            maxlength="8"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword" label="确认密码">
          <el-input
            v-model="localForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            maxlength="8"
            show-password
          />
        </el-form-item>
        <el-form-item label="封面颜色">
          <div class="cover-color-selector">
            <div class="preset-colors">
              <div
                v-for="color in presetColors"
                :key="color.value"
                class="color-item"
                :class="{ active: localForm.coverColor === color.value }"
                :style="{ backgroundColor: color.value }"
                :title="color.label"
                @click="localForm.coverColor = color.value"
              />
            </div>
            <el-color-picker v-model="localForm.coverColor" />
          </div>
        </el-form-item>
        <el-form-item label="封面图片">
          <div class="cover-image-selector">
            <div v-if="localForm.coverImagePreview" class="cover-preview">
              <img :src="localForm.coverImagePreview" alt="封面预览" />
              <el-button
                type="danger"
                size="small"
                circle
                class="remove-btn"
                @click="$emit('remove-cover')"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div v-else class="cover-buttons">
              <el-button type="primary" :icon="Plus" @click="$emit('select-cover')">
                选择封面图片
              </el-button>
              <el-button
                type="success"
                :icon="MagicStick"
                :disabled="!localForm.name || !localForm.type"
                :title="!localForm.name || !localForm.type ? '请先填写书名和类型' : ''"
                @click="$emit('open-ai-cover')"
              >
                AI生成封面
              </el-button>
            </div>
            <div v-if="localForm.coverImagePath" class="cover-path">
              {{ localForm.coverImagePath }}
            </div>
          </div>
        </el-form-item>
      </el-form>
      <div class="drawer-footer">
        <el-button @click="$emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" @click="handleConfirm">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Plus, Delete, MagicStick } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  form: { type: Object, required: true },
  isEdit: { type: Boolean, default: false },
  rules: { type: Object, default: () => ({}) },
  bookTypeCascaderOptions: { type: Array, default: () => [] },
  presetColors: { type: Array, default: () => [] }
})
const emit = defineEmits([
  'update:modelValue',
  'update:form',
  'confirm',
  'select-cover',
  'remove-cover',
  'open-ai-cover'
])

const formRef = ref(null)
const localForm = ref({
  name: '',
  type: '',
  targetCount: 100000,
  intro: '',
  originalName: '',
  password: '',
  confirmPassword: '',
  coverColor: '#22345c',
  coverImagePath: '',
  coverImagePreview: ''
})

watch(
  () => props.modelValue,
  (visible) => {
    if (visible && props.form) {
      localForm.value = { ...localForm.value, ...props.form }
    }
  }
)
watch(
  () => [props.form.coverImagePath, props.form.coverImagePreview],
  ([path, preview]) => {
    localForm.value.coverImagePath = path
    localForm.value.coverImagePreview = preview
  }
)
watch(
  localForm,
  () => {
    emit('update:form', { ...localForm.value })
  },
  { deep: true }
)

function handleConfirm() {
  formRef.value.validate((valid) => {
    if (valid) emit('confirm')
  })
}
</script>

<style lang="scss" scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.drawer-form {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px;
}
.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  flex-shrink: 0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}
.cover-color-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  .preset-colors {
    display: flex;
    gap: 8px;
    .color-item {
      width: 32px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
      &:hover {
        transform: scale(1.1);
        border-color: #409eff;
      }
      &.active {
        border-color: #409eff;
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
      }
    }
  }
}
.cover-image-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  .cover-preview {
    position: relative;
    width: 100%;
    max-width: 400px;
    height: 200px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
    img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 10;
    }
  }
  .cover-buttons {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .cover-path {
    font-size: 12px;
    color: #909399;
    word-break: break-all;
  }
}
</style>
