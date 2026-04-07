<template>
  <el-drawer
    :model-value="modelValue"
    :title="isEdit ? t('bookForm.editBook') : t('bookForm.newBook')"
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
        <el-form-item prop="name" :label="t('bookForm.name')">
          <el-input
            v-model="localForm.name"
            :placeholder="t('bookForm.namePlaceholder')"
            maxlength="15"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="type" :label="t('bookForm.type')">
          <el-cascader
            v-model="localForm.type"
            :options="bookTypeCascaderOptions"
            :props="{ expandTrigger: 'hover', emitPath: false }"
            :placeholder="t('bookForm.typePlaceholder')"
            style="width: 100%"
            clearable
          />
        </el-form-item>
        <el-form-item prop="targetCount" :label="t('bookForm.targetWords')">
          <el-input
            v-model="localForm.targetCount"
            :placeholder="t('bookForm.targetWordsPlaceholder')"
            type="number"
            :min="10000"
            :max="10000000"
            :step="100000"
          />
        </el-form-item>
        <el-form-item prop="intro" :label="t('bookForm.intro')">
          <el-input
            v-model="localForm.intro"
            type="textarea"
            :rows="5"
            :placeholder="t('bookForm.introPlaceholder')"
          />
        </el-form-item>
        <el-form-item prop="password" :label="t('bookForm.password')">
          <el-input
            v-model="localForm.password"
            type="password"
            :placeholder="t('bookForm.passwordPlaceholder')"
            maxlength="8"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword" :label="t('bookForm.confirmPassword')">
          <el-input
            v-model="localForm.confirmPassword"
            type="password"
            :placeholder="t('bookForm.confirmPasswordPlaceholder')"
            maxlength="8"
            show-password
          />
        </el-form-item>
        <el-form-item :label="t('bookForm.coverColor')">
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
        <el-form-item :label="t('bookForm.coverImage')">
          <div class="cover-image-selector">
            <div v-if="localForm.coverImagePreview" class="cover-preview">
              <img :src="localForm.coverImagePreview" :alt="t('bookForm.coverPreview')" />
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
                {{ t('bookForm.selectCoverImage') }}
              </el-button>
              <el-button
                type="success"
                :icon="MagicStick"
                :disabled="!localForm.name || !localForm.type"
                :title="!localForm.name || !localForm.type ? t('bookForm.fillNameAndTypeFirst') : ''"
                @click="$emit('open-ai-cover')"
              >
                {{ t('bookForm.aiGenerateCover') }}
              </el-button>
            </div>
            <div v-if="localForm.coverImagePath" class="cover-path">
              {{ localForm.coverImagePath }}
            </div>
          </div>
        </el-form-item>
      </el-form>
      <div class="drawer-footer">
        <el-button @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleConfirm">
          {{ isEdit ? t('common.save') : t('bookForm.create') }}
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Plus, Delete, MagicStick } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

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
const { t } = useI18n()

const formRef = ref(null)
// 统一默认表单结构：避免“某次打开没传某字段导致沿用上次残留值”
const DEFAULT_FORM = {
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
}
const localForm = ref({ ...DEFAULT_FORM })

watch(
  () => props.modelValue,
  async (visible) => {
    if (visible && props.form) {
      // 打开抽屉时：先同步表单数据，再清理上次校验残留
      localForm.value = { ...DEFAULT_FORM, ...props.form }
      await nextTick()
      formRef.value?.clearValidate?.()
    } else if (!visible) {
      // 关闭抽屉时：清理校验，避免下次打开仍显示红字
      await nextTick()
      formRef.value?.clearValidate?.()
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
  if (!formRef.value?.validate) return
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
