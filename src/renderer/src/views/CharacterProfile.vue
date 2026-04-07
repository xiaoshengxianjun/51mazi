<template>
  <LayoutTool :title="kindUi.layoutTitle">
    <template #headrAction>
      <el-button type="primary" @click="handleCreateEntity">
        <el-icon><Plus /></el-icon>
        <span>{{ kindUi.createBtn }}</span>
      </el-button>
    </template>
    <template #default>
      <div class="profile-toolbar">
        <el-radio-group v-model="profileKind" size="small" class="profile-kind-tabs">
          <el-radio-button value="character">
            {{ t('characterProfile.kind.character') }}
          </el-radio-button>
          <el-radio-button value="mount">{{ t('characterProfile.kind.mount') }}</el-radio-button>
          <el-radio-button value="monster">
            {{ t('characterProfile.kind.monster') }}
          </el-radio-button>
          <el-radio-button value="spirit_beast">
            {{ t('characterProfile.kind.spiritBeast') }}
          </el-radio-button>
          <el-radio-button value="artifact">
            {{ t('characterProfile.kind.artifact') }}
          </el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="viewMode" size="small" class="view-toggle-inner">
          <el-radio-button value="card">
            <el-icon><Grid /></el-icon>
            {{ t('characterProfile.cardMode') }}
          </el-radio-button>
          <el-radio-button value="table">
            <el-icon><List /></el-icon>
            {{ t('characterProfile.tableMode') }}
          </el-radio-button>
        </el-radio-group>
      </div>
      <!-- 卡片模式 -->
      <div v-if="viewMode === 'card'" class="character-grid">
        <div
          v-for="character in displayEntities"
          :key="character.id"
          class="character-card"
          :class="cardGenderClass(character)"
          @click="handleEditEntity(character)"
        >
          <div class="character-info">
            <div class="character-header">
              <div class="character-avatar" @click.stop="previewCharacterAvatar(character)">
                <el-image
                  v-if="character.avatar"
                  :src="getAvatarSrc(character.avatar)"
                  alt="头像"
                  class="avatar-image"
                  fit="cover"
                />
                <div v-else class="avatar-placeholder">
                  {{ character.name.charAt(0) }}
                </div>
              </div>
              <!-- details 和 tags 的容器 -->
              <div class="character-info-wrapper">
                <div class="character-details">
                  <span
                    v-if="character.markerColor"
                    class="character-marker"
                    :style="{ backgroundColor: character.markerColor }"
                  ></span>
                  <span class="character-name">{{ character.name }}</span>
                  <span class="character-age">
                    {{ t('characterProfile.ageValue', { age: character.age }) }}
                  </span>
                  <span class="character-height">{{ character.height }}cm</span>
                </div>
                <!-- 标签显示区域 -->
                <div v-if="character.tags && character.tags.length > 0" class="character-tags">
                  <el-tag v-for="tag in character.tags" :key="tag" size="small" class="tag-item">
                    {{ tag }}
                  </el-tag>
                </div>
              </div>
            </div>
            <!-- 形象介绍 -->
            <div v-if="character.appearance" class="character-section">
              <div class="section-title">{{ kindUi.appearanceLabel }}</div>
              <p class="character-intro appearance-intro">{{ character.appearance }}</p>
            </div>
            <!-- 生平介绍 -->
            <div v-if="character.biography" class="character-section">
              <div class="section-title">{{ kindUi.biographyLabel }}</div>
              <p class="character-intro biography-intro">{{ character.biography }}</p>
            </div>
            <!-- 人物图列表：卡片下方一行多张 -->
            <div class="character-portrait-row">
              <div class="portrait-label">{{ kindUi.galleryLabel }}</div>
              <div v-if="getCharacterImages(character).length" class="character-portrait-list">
                <div
                  v-for="(img, idx) in getCharacterImages(character)"
                  :key="idx"
                  class="character-portrait-thumb"
                  @click.stop="previewCharacterImages(character, idx)"
                >
                  <el-image :src="getAvatarSrc(img)" alt="人物图" fit="cover" />
                </div>
              </div>
              <div v-else class="character-portrait-placeholder">
                {{ kindUi.galleryEmptyShort }}
              </div>
            </div>
          </div>
          <div class="character-actions">
            <el-icon @click.stop="handleDeleteEntity(character)"><Delete /></el-icon>
          </div>
        </div>
      </div>

      <!-- 表格模式 -->
      <div v-else-if="viewMode === 'table'" class="character-table">
        <el-table
          ref="tableRef"
          :data="displayEntities"
          row-key="id"
          border
          style="width: 100%"
          @row-click="handleEditEntity"
        >
          <el-table-column :label="t('characterProfile.avatar')" width="80" align="center">
            <template #default="{ row }">
              <div class="table-avatar" @click.stop="previewCharacterAvatar(row)">
                <el-image
                  v-if="row.avatar"
                  :src="getAvatarSrc(row.avatar)"
                  alt="头像"
                  class="table-avatar-image"
                  fit="cover"
                />
                <div v-else class="table-avatar-placeholder">
                  {{ row.name.charAt(0) }}
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="kindUi.galleryLabel" width="120" align="center">
            <template #default="{ row }">
              <div
                v-if="getCharacterImages(row).length"
                class="table-portrait-list"
                @click.stop="previewCharacterImages(row, 0)"
              >
                <div
                  v-for="(img, idx) in getCharacterImages(row).slice(0, 3)"
                  :key="idx"
                  class="table-portrait table-portrait-vertical"
                >
                  <el-image :src="getAvatarSrc(img)" alt="人物图" fit="cover" />
                </div>
                <span v-if="getCharacterImages(row).length > 3" class="table-portrait-more">
                  +{{ getCharacterImages(row).length - 3 }}
                </span>
              </div>
              <span v-else class="no-portrait">{{ t('characterProfile.none') }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" :label="kindUi.nameColumnLabel" width="140" align="center">
            <template #default="{ row }">
              <div class="table-name-cell">
                <span
                  v-if="row.markerColor"
                  class="table-marker"
                  :style="{ backgroundColor: row.markerColor }"
                ></span>
                <span>{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            v-if="kindUi.showHumanFields"
            prop="age"
            :label="t('characterProfile.age')"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              {{ t('characterProfile.ageValue', { age: row.age }) }}
            </template>
          </el-table-column>
          <el-table-column
            v-if="kindUi.showHumanFields"
            prop="gender"
            :label="t('characterProfile.gender')"
            width="80"
            align="center"
          >
            <template #default="{ row }">
              <el-tag :type="row.gender === '男' ? 'primary' : 'danger'" size="small">
                {{ row.gender }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            v-if="kindUi.showHumanFields"
            prop="height"
            :label="t('characterProfile.height')"
            width="100"
            align="center"
          >
            <template #default="{ row }"> {{ row.height }}cm </template>
          </el-table-column>
          <el-table-column
            prop="tags"
            :label="t('characterProfile.tags')"
            width="140"
            align="center"
          >
            <template #default="{ row }">
              <div v-if="row.tags && row.tags.length > 0" class="table-tags">
                <el-tag v-for="tag in row.tags" :key="tag" size="small" class="tag-item">
                  {{ tag }}
                </el-tag>
              </div>
              <span v-else class="no-tags">{{ t('characterProfile.noTags') }}</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="appearance"
            :label="kindUi.appearanceColumnLabel"
            min-width="200"
            align="center"
          />
          <el-table-column
            prop="biography"
            :label="kindUi.biographyColumnLabel"
            min-width="300"
            align="center"
          />
          <el-table-column
            :label="t('characterProfile.actions')"
            width="120"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button type="primary" size="small" @click.stop="handleEditEntity(row)">
                  <el-icon><Edit /></el-icon>
                  {{ t('common.edit') }}
                </el-button>
                <el-button type="danger" size="small" @click.stop="handleDeleteEntity(row)">
                  <el-icon><Delete /></el-icon>
                  {{ t('common.delete') }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty
        v-if="displayEntities.length === 0"
        :image-size="200"
        :description="kindUi.emptyDesc"
        class="empty-state"
      />
    </template>
  </LayoutTool>

  <!-- 创建/编辑人物抽屉 -->
  <el-drawer
    v-model="drawerVisible"
    :title="isEdit ? kindUi.drawerEdit : kindUi.drawerCreate"
    size="700px"
    direction="rtl"
    class="character-form-drawer"
    @close="resetForm"
  >
    <el-form ref="formRef" :model="characterForm" :rules="formRules" label-width="100px">
      <!-- 头像：用于列表/卡片小图 -->
      <el-form-item :label="t('characterProfile.avatar')" class="avatar-form-item">
        <div class="avatar-form-section">
          <div class="avatar-preview" @click="previewFormAvatar">
            <el-image
              v-if="characterForm.avatar"
              :src="getAvatarSrc(characterForm.avatar)"
              alt="头像预览"
              class="form-avatar-image"
              fit="cover"
            />
            <div v-else class="form-avatar-placeholder">
              {{ characterForm.name ? characterForm.name.charAt(0) : '头' }}
            </div>
          </div>
          <div class="avatar-input-section">
            <div class="input-row">
              <el-input
                v-model="characterForm.avatar"
                :placeholder="t('characterProfile.avatarPlaceholder')"
                clearable
              />
              <el-button @click="selectLocalImage">
                {{ t('characterProfile.selectLocalImage') }}
              </el-button>
            </div>
          </div>
        </div>
      </el-form-item>
      <!-- 人物图列表：多张竖版全身，可 AI 生成或本地添加 -->
      <el-form-item :label="kindUi.galleryLabel" class="character-image-form-item">
        <div class="character-image-form-section">
          <div v-if="characterForm.characterImages.length" class="character-image-list">
            <div
              v-for="(img, idx) in characterForm.characterImages"
              :key="idx"
              class="character-image-preview-wrap"
            >
              <div class="character-image-preview" @click="previewFormCharacterImages(idx)">
                <el-image :src="getAvatarSrc(img)" alt="人物图" fit="cover" />
              </div>
              <el-button
                type="danger"
                size="small"
                circle
                class="character-image-remove"
                @click="removeCharacterImage(idx)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <div v-else class="character-image-placeholder">{{ kindUi.galleryEmpty }}</div>
          <div class="character-image-input-section">
            <div class="input-row">
              <el-button @click="selectLocalImageForCharacterImage">
                {{ t('characterProfile.selectLocalImage') }}
              </el-button>
              <el-button type="success" @click="openAICharacterDrawer">
                <el-icon><MagicStick /></el-icon>
                {{ kindUi.aiGenLabel }}
              </el-button>
            </div>
          </div>
        </div>
      </el-form-item>
      <el-row :gutter="10">
        <el-col :span="kindUi.showHumanFields ? 12 : 24">
          <el-form-item :label="kindUi.nameLabel" prop="name">
            <el-input
              v-model="characterForm.name"
              :placeholder="kindUi.namePlaceholder"
              clearable
            />
          </el-form-item>
        </el-col>
        <el-col v-if="kindUi.showHumanFields" :span="12">
          <el-form-item :label="t('characterProfile.gender')" prop="gender">
            <el-radio-group v-model="characterForm.gender">
              <el-radio value="男">{{ t('characterProfile.genderMale') }}</el-radio>
              <el-radio value="女">{{ t('characterProfile.genderFemale') }}</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row v-if="kindUi.showHumanFields" :gutter="10">
        <el-col :span="12">
          <el-form-item :label="t('characterProfile.age')" prop="age">
            <el-input-number
              v-model="characterForm.age"
              :min="1"
              :max="99999"
              :placeholder="t('characterProfile.agePlaceholder')"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('characterProfile.height')" prop="height">
            <el-input-number
              v-model="characterForm.height"
              :min="1"
              :max="99999"
              :placeholder="t('characterProfile.heightPlaceholder')"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item :label="kindUi.appearanceLabel" prop="appearance">
        <el-input
          v-model="characterForm.appearance"
          :placeholder="kindUi.appearancePlaceholder"
          type="textarea"
          :rows="4"
          clearable
        />
      </el-form-item>
      <el-form-item :label="kindUi.biographyLabel" prop="biography">
        <el-input
          v-model="characterForm.biography"
          :placeholder="kindUi.biographyPlaceholder"
          type="textarea"
          :rows="6"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('characterProfile.tags')" prop="tags">
        <el-tree-select
          v-model="characterForm.tags"
          :data="tagOptions"
          multiple
          filterable
          default-first-option
          :placeholder="t('characterProfile.tagsPlaceholder')"
          style="width: 100%"
          :props="{
            children: 'children',
            label: 'name',
            value: 'name'
          }"
          node-key="name"
          check-strictly
          :render-after-expand="false"
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('characterProfile.markerColor')">
        <div class="marker-selector">
          <button
            v-for="color in presetMarkerColors"
            :key="color || 'none'"
            type="button"
            class="marker-swatch"
            :class="{ active: color === characterForm.markerColor, empty: !color }"
            :style="color ? { backgroundColor: color } : {}"
            @click="handlePresetMarkerClick(color)"
          >
            <span v-if="!color" class="marker-none">{{ t('characterProfile.none') }}</span>
          </button>
          <el-color-picker
            v-model="characterForm.markerColor"
            :predefine="colorPickerPredefine"
            :show-alpha="false"
            size="small"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="drawerVisible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="confirmSave">{{ t('common.confirm') }}</el-button>
    </template>
  </el-drawer>

  <!-- AI 生图：人物/坐骑等均走同一抽屉，文案与 prompt 前缀随档案类型变化 -->
  <AICharacterDrawer
    v-model="aiCharacterDrawerVisible"
    :book-name="bookName"
    :character-name="characterForm.name"
    :appearance="characterForm.appearance"
    :drawer-title="kindUi.aiDrawerTitle"
    :subject-label="kindUi.aiSubjectLabel"
    :prompt-intro="kindUi.aiPromptIntro"
    :prompt-detail-prefix="kindUi.aiPromptDetailPrefix"
    :prompt-placeholder="kindUi.aiPromptPlaceholder"
    :pose-placeholder="kindUi.aiPosePlaceholder"
    :output-tip="kindUi.aiOutputTip"
    :generated-image-type-name="kindUi.aiGeneratedTypeName"
    :generate-button-text="kindUi.aiGenerateBtn"
    :generating-hint="kindUi.aiGeneratingHint"
    :info-generating-message="kindUi.aiInfoToast"
    :validate-prompt-message="kindUi.aiValidatePrompt"
    :confirm-success-message="kindUi.aiConfirmSuccess"
    :generate-fail-type-name="kindUi.aiFailTypeName"
    @character-image-generated="onAICharacterImageGenerated"
  />

  <!-- 图片预览器 -->
  <el-image-viewer
    v-if="imageViewerVisible"
    :url-list="imageViewerSrcList"
    :initial-index="imageViewerInitialIndex"
    @close="imageViewerVisible = false"
  />
</template>

<script setup>
import LayoutTool from '@renderer/components/LayoutTool.vue'
import { ref, reactive, onMounted, watch, toRaw, computed, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Grid, List, Edit, MagicStick } from '@element-plus/icons-vue'
import AICharacterDrawer from '@renderer/components/AICharacterDrawer.vue'
import { genId } from '@renderer/utils/utils'
import Sortable from 'sortablejs'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n()
const drawerVisible = ref(false)
const aiCharacterDrawerVisible = ref(false)
const isEdit = ref(false)
const bookName = route.query.name || ''

/** 档案大类：人物走 characters.json，其余走 entity_profiles.json */
const PROFILE_KIND_STORAGE_PREFIX = 'characterProfileKind_'
function getProfileKindStorageKey() {
  return PROFILE_KIND_STORAGE_PREFIX + (bookName || '_default')
}
function loadStoredProfileKind() {
  if (typeof localStorage === 'undefined') return 'character'
  const v = localStorage.getItem(getProfileKindStorageKey())
  if (['character', 'mount', 'monster', 'spirit_beast', 'artifact'].includes(v)) return v
  return 'character'
}
const profileKind = ref(loadStoredProfileKind())

// 人物谱视图模式：按书籍记忆，默认表格模式
const VIEW_MODE_STORAGE_KEY_PREFIX = 'characterProfileViewMode_'
function getViewModeStorageKey() {
  return VIEW_MODE_STORAGE_KEY_PREFIX + (bookName || '_default')
}
const viewMode = ref(
  (typeof localStorage !== 'undefined' && localStorage.getItem(getViewModeStorageKey())) || 'table'
)
const characters = ref([])
const mounts = ref([])
const monsters = ref([])
const spiritBeasts = ref([])
const artifacts = ref([])

const KIND_UI = computed(() => ({
  character: {
    layoutTitle: t('characterProfile.kindUi.character.layoutTitle'),
    createBtn: t('characterProfile.kindUi.character.createBtn'),
    drawerEdit: t('characterProfile.kindUi.character.drawerEdit'),
    drawerCreate: t('characterProfile.kindUi.character.drawerCreate'),
    deleteType: t('characterProfile.kindUi.character.deleteType'),
    emptyDesc: t('characterProfile.kindUi.character.emptyDesc'),
    nameLabel: t('characterProfile.kindUi.character.nameLabel'),
    nameColumnLabel: t('characterProfile.kindUi.character.nameColumnLabel'),
    namePlaceholder: t('characterProfile.kindUi.character.namePlaceholder'),
    galleryLabel: t('characterProfile.kindUi.character.galleryLabel'),
    galleryEmpty: t('characterProfile.kindUi.character.galleryEmpty'),
    galleryEmptyShort: t('characterProfile.kindUi.character.galleryEmptyShort'),
    aiGenLabel: t('characterProfile.kindUi.character.aiGenLabel'),
    appearanceLabel: t('characterProfile.kindUi.character.appearanceLabel'),
    appearanceColumnLabel: t('characterProfile.kindUi.character.appearanceColumnLabel'),
    appearancePlaceholder: t('characterProfile.kindUi.character.appearancePlaceholder'),
    biographyLabel: t('characterProfile.kindUi.character.biographyLabel'),
    biographyColumnLabel: t('characterProfile.kindUi.character.biographyColumnLabel'),
    biographyPlaceholder: t('characterProfile.kindUi.character.biographyPlaceholder'),
    aiDrawerTitle: t('characterProfile.kindUi.character.aiDrawerTitle'),
    aiSubjectLabel: t('characterProfile.kindUi.character.aiSubjectLabel'),
    aiPromptIntro: t('characterProfile.kindUi.character.aiPromptIntro'),
    aiPromptDetailPrefix: t('characterProfile.kindUi.character.aiPromptDetailPrefix'),
    aiPromptPlaceholder: t('characterProfile.kindUi.character.aiPromptPlaceholder'),
    aiPosePlaceholder: t('characterProfile.kindUi.character.aiPosePlaceholder'),
    aiOutputTip: t('characterProfile.kindUi.character.aiOutputTip'),
    aiGeneratedTypeName: t('characterProfile.kindUi.character.aiGeneratedTypeName'),
    aiGenerateBtn: t('characterProfile.kindUi.character.aiGenerateBtn'),
    aiGeneratingHint: t('characterProfile.kindUi.character.aiGeneratingHint'),
    aiInfoToast: t('characterProfile.kindUi.character.aiInfoToast'),
    aiValidatePrompt: t('characterProfile.kindUi.character.aiValidatePrompt'),
    aiConfirmSuccess: t('characterProfile.kindUi.character.aiConfirmSuccess'),
    aiFailTypeName: t('characterProfile.kindUi.character.aiFailTypeName'),
    showHumanFields: true
  },
  mount: {
    layoutTitle: t('characterProfile.kindUi.mount.layoutTitle'),
    createBtn: t('characterProfile.kindUi.mount.createBtn'),
    drawerEdit: t('characterProfile.kindUi.mount.drawerEdit'),
    drawerCreate: t('characterProfile.kindUi.mount.drawerCreate'),
    deleteType: t('characterProfile.kindUi.mount.deleteType'),
    emptyDesc: t('characterProfile.kindUi.mount.emptyDesc'),
    nameLabel: t('characterProfile.kindUi.mount.nameLabel'),
    nameColumnLabel: t('characterProfile.kindUi.mount.nameColumnLabel'),
    namePlaceholder: t('characterProfile.kindUi.mount.namePlaceholder'),
    galleryLabel: t('characterProfile.kindUi.mount.galleryLabel'),
    galleryEmpty: t('characterProfile.kindUi.mount.galleryEmpty'),
    galleryEmptyShort: t('characterProfile.kindUi.mount.galleryEmptyShort'),
    aiGenLabel: t('characterProfile.kindUi.mount.aiGenLabel'),
    appearanceLabel: t('characterProfile.kindUi.mount.appearanceLabel'),
    appearanceColumnLabel: t('characterProfile.kindUi.mount.appearanceColumnLabel'),
    appearancePlaceholder: t('characterProfile.kindUi.mount.appearancePlaceholder'),
    biographyLabel: t('characterProfile.kindUi.mount.biographyLabel'),
    biographyColumnLabel: t('characterProfile.kindUi.mount.biographyColumnLabel'),
    biographyPlaceholder: t('characterProfile.kindUi.mount.biographyPlaceholder'),
    aiDrawerTitle: t('characterProfile.kindUi.mount.aiDrawerTitle'),
    aiSubjectLabel: t('characterProfile.kindUi.mount.aiSubjectLabel'),
    aiPromptIntro: t('characterProfile.kindUi.mount.aiPromptIntro'),
    aiPromptDetailPrefix: t('characterProfile.kindUi.mount.aiPromptDetailPrefix'),
    aiPromptPlaceholder: t('characterProfile.kindUi.mount.aiPromptPlaceholder'),
    aiPosePlaceholder: t('characterProfile.kindUi.mount.aiPosePlaceholder'),
    aiOutputTip: t('characterProfile.kindUi.mount.aiOutputTip'),
    aiGeneratedTypeName: t('characterProfile.kindUi.mount.aiGeneratedTypeName'),
    aiGenerateBtn: t('characterProfile.kindUi.mount.aiGenerateBtn'),
    aiGeneratingHint: t('characterProfile.kindUi.mount.aiGeneratingHint'),
    aiInfoToast: t('characterProfile.kindUi.mount.aiInfoToast'),
    aiValidatePrompt: t('characterProfile.kindUi.mount.aiValidatePrompt'),
    aiConfirmSuccess: t('characterProfile.kindUi.mount.aiConfirmSuccess'),
    aiFailTypeName: t('characterProfile.kindUi.mount.aiFailTypeName'),
    showHumanFields: false
  },
  monster: {
    layoutTitle: t('characterProfile.kindUi.monster.layoutTitle'),
    createBtn: t('characterProfile.kindUi.monster.createBtn'),
    drawerEdit: t('characterProfile.kindUi.monster.drawerEdit'),
    drawerCreate: t('characterProfile.kindUi.monster.drawerCreate'),
    deleteType: t('characterProfile.kindUi.monster.deleteType'),
    emptyDesc: t('characterProfile.kindUi.monster.emptyDesc'),
    nameLabel: t('characterProfile.kindUi.monster.nameLabel'),
    nameColumnLabel: t('characterProfile.kindUi.monster.nameColumnLabel'),
    namePlaceholder: t('characterProfile.kindUi.monster.namePlaceholder'),
    galleryLabel: t('characterProfile.kindUi.monster.galleryLabel'),
    galleryEmpty: t('characterProfile.kindUi.monster.galleryEmpty'),
    galleryEmptyShort: t('characterProfile.kindUi.monster.galleryEmptyShort'),
    aiGenLabel: t('characterProfile.kindUi.monster.aiGenLabel'),
    appearanceLabel: t('characterProfile.kindUi.monster.appearanceLabel'),
    appearanceColumnLabel: t('characterProfile.kindUi.monster.appearanceColumnLabel'),
    appearancePlaceholder: t('characterProfile.kindUi.monster.appearancePlaceholder'),
    biographyLabel: t('characterProfile.kindUi.monster.biographyLabel'),
    biographyColumnLabel: t('characterProfile.kindUi.monster.biographyColumnLabel'),
    biographyPlaceholder: t('characterProfile.kindUi.monster.biographyPlaceholder'),
    aiDrawerTitle: t('characterProfile.kindUi.monster.aiDrawerTitle'),
    aiSubjectLabel: t('characterProfile.kindUi.monster.aiSubjectLabel'),
    aiPromptIntro: t('characterProfile.kindUi.monster.aiPromptIntro'),
    aiPromptDetailPrefix: t('characterProfile.kindUi.monster.aiPromptDetailPrefix'),
    aiPromptPlaceholder: t('characterProfile.kindUi.monster.aiPromptPlaceholder'),
    aiPosePlaceholder: t('characterProfile.kindUi.monster.aiPosePlaceholder'),
    aiOutputTip: t('characterProfile.kindUi.monster.aiOutputTip'),
    aiGeneratedTypeName: t('characterProfile.kindUi.monster.aiGeneratedTypeName'),
    aiGenerateBtn: t('characterProfile.kindUi.monster.aiGenerateBtn'),
    aiGeneratingHint: t('characterProfile.kindUi.monster.aiGeneratingHint'),
    aiInfoToast: t('characterProfile.kindUi.monster.aiInfoToast'),
    aiValidatePrompt: t('characterProfile.kindUi.monster.aiValidatePrompt'),
    aiConfirmSuccess: t('characterProfile.kindUi.monster.aiConfirmSuccess'),
    aiFailTypeName: t('characterProfile.kindUi.monster.aiFailTypeName'),
    showHumanFields: false
  },
  spirit_beast: {
    layoutTitle: t('characterProfile.kindUi.spiritBeast.layoutTitle'),
    createBtn: t('characterProfile.kindUi.spiritBeast.createBtn'),
    drawerEdit: t('characterProfile.kindUi.spiritBeast.drawerEdit'),
    drawerCreate: t('characterProfile.kindUi.spiritBeast.drawerCreate'),
    deleteType: t('characterProfile.kindUi.spiritBeast.deleteType'),
    emptyDesc: t('characterProfile.kindUi.spiritBeast.emptyDesc'),
    nameLabel: t('characterProfile.kindUi.spiritBeast.nameLabel'),
    nameColumnLabel: t('characterProfile.kindUi.spiritBeast.nameColumnLabel'),
    namePlaceholder: t('characterProfile.kindUi.spiritBeast.namePlaceholder'),
    galleryLabel: t('characterProfile.kindUi.spiritBeast.galleryLabel'),
    galleryEmpty: t('characterProfile.kindUi.spiritBeast.galleryEmpty'),
    galleryEmptyShort: t('characterProfile.kindUi.spiritBeast.galleryEmptyShort'),
    aiGenLabel: t('characterProfile.kindUi.spiritBeast.aiGenLabel'),
    appearanceLabel: t('characterProfile.kindUi.spiritBeast.appearanceLabel'),
    appearanceColumnLabel: t('characterProfile.kindUi.spiritBeast.appearanceColumnLabel'),
    appearancePlaceholder: t('characterProfile.kindUi.spiritBeast.appearancePlaceholder'),
    biographyLabel: t('characterProfile.kindUi.spiritBeast.biographyLabel'),
    biographyColumnLabel: t('characterProfile.kindUi.spiritBeast.biographyColumnLabel'),
    biographyPlaceholder: t('characterProfile.kindUi.spiritBeast.biographyPlaceholder'),
    aiDrawerTitle: t('characterProfile.kindUi.spiritBeast.aiDrawerTitle'),
    aiSubjectLabel: t('characterProfile.kindUi.spiritBeast.aiSubjectLabel'),
    aiPromptIntro: t('characterProfile.kindUi.spiritBeast.aiPromptIntro'),
    aiPromptDetailPrefix: t('characterProfile.kindUi.spiritBeast.aiPromptDetailPrefix'),
    aiPromptPlaceholder: t('characterProfile.kindUi.spiritBeast.aiPromptPlaceholder'),
    aiPosePlaceholder: t('characterProfile.kindUi.spiritBeast.aiPosePlaceholder'),
    aiOutputTip: t('characterProfile.kindUi.spiritBeast.aiOutputTip'),
    aiGeneratedTypeName: t('characterProfile.kindUi.spiritBeast.aiGeneratedTypeName'),
    aiGenerateBtn: t('characterProfile.kindUi.spiritBeast.aiGenerateBtn'),
    aiGeneratingHint: t('characterProfile.kindUi.spiritBeast.aiGeneratingHint'),
    aiInfoToast: t('characterProfile.kindUi.spiritBeast.aiInfoToast'),
    aiValidatePrompt: t('characterProfile.kindUi.spiritBeast.aiValidatePrompt'),
    aiConfirmSuccess: t('characterProfile.kindUi.spiritBeast.aiConfirmSuccess'),
    aiFailTypeName: t('characterProfile.kindUi.spiritBeast.aiFailTypeName'),
    showHumanFields: false
  },
  artifact: {
    layoutTitle: t('characterProfile.kindUi.artifact.layoutTitle'),
    createBtn: t('characterProfile.kindUi.artifact.createBtn'),
    drawerEdit: t('characterProfile.kindUi.artifact.drawerEdit'),
    drawerCreate: t('characterProfile.kindUi.artifact.drawerCreate'),
    deleteType: t('characterProfile.kindUi.artifact.deleteType'),
    emptyDesc: t('characterProfile.kindUi.artifact.emptyDesc'),
    nameLabel: t('characterProfile.kindUi.artifact.nameLabel'),
    nameColumnLabel: t('characterProfile.kindUi.artifact.nameColumnLabel'),
    namePlaceholder: t('characterProfile.kindUi.artifact.namePlaceholder'),
    galleryLabel: t('characterProfile.kindUi.artifact.galleryLabel'),
    galleryEmpty: t('characterProfile.kindUi.artifact.galleryEmpty'),
    galleryEmptyShort: t('characterProfile.kindUi.artifact.galleryEmptyShort'),
    aiGenLabel: t('characterProfile.kindUi.artifact.aiGenLabel'),
    appearanceLabel: t('characterProfile.kindUi.artifact.appearanceLabel'),
    appearanceColumnLabel: t('characterProfile.kindUi.artifact.appearanceColumnLabel'),
    appearancePlaceholder: t('characterProfile.kindUi.artifact.appearancePlaceholder'),
    biographyLabel: t('characterProfile.kindUi.artifact.biographyLabel'),
    biographyColumnLabel: t('characterProfile.kindUi.artifact.biographyColumnLabel'),
    biographyPlaceholder: t('characterProfile.kindUi.artifact.biographyPlaceholder'),
    aiDrawerTitle: t('characterProfile.kindUi.artifact.aiDrawerTitle'),
    aiSubjectLabel: t('characterProfile.kindUi.artifact.aiSubjectLabel'),
    aiPromptIntro: t('characterProfile.kindUi.artifact.aiPromptIntro'),
    aiPromptDetailPrefix: t('characterProfile.kindUi.artifact.aiPromptDetailPrefix'),
    aiPromptPlaceholder: t('characterProfile.kindUi.artifact.aiPromptPlaceholder'),
    aiPosePlaceholder: t('characterProfile.kindUi.artifact.aiPosePlaceholder'),
    aiOutputTip: t('characterProfile.kindUi.artifact.aiOutputTip'),
    aiGeneratedTypeName: t('characterProfile.kindUi.artifact.aiGeneratedTypeName'),
    aiGenerateBtn: t('characterProfile.kindUi.artifact.aiGenerateBtn'),
    aiGeneratingHint: t('characterProfile.kindUi.artifact.aiGeneratingHint'),
    aiInfoToast: t('characterProfile.kindUi.artifact.aiInfoToast'),
    aiValidatePrompt: t('characterProfile.kindUi.artifact.aiValidatePrompt'),
    aiConfirmSuccess: t('characterProfile.kindUi.artifact.aiConfirmSuccess'),
    aiFailTypeName: t('characterProfile.kindUi.artifact.aiFailTypeName'),
    showHumanFields: false
  }
}))

const kindUi = computed(() => KIND_UI.value[profileKind.value] || KIND_UI.value.character)

const displayEntities = computed(() => {
  switch (profileKind.value) {
    case 'mount':
      return mounts.value
    case 'monster':
      return monsters.value
    case 'spirit_beast':
      return spiritBeasts.value
    case 'artifact':
      return artifacts.value
    case 'character':
    default:
      return characters.value
  }
})

function getCurrentListRef() {
  switch (profileKind.value) {
    case 'mount':
      return mounts
    case 'monster':
      return monsters
    case 'spirit_beast':
      return spiritBeasts
    case 'artifact':
      return artifacts
    case 'character':
    default:
      return characters
  }
}

function cardGenderClass(character) {
  if (profileKind.value !== 'character') return {}
  return { male: character.gender === '男', female: character.gender === '女' }
}

function entityCategoryFromProfileKind(kind) {
  if (kind === 'character') return null
  return kind
}

async function saveEntityCategory(category) {
  try {
    let payload
    switch (category) {
      case 'mount':
        payload = mounts.value
        break
      case 'monster':
        payload = monsters.value
        break
      case 'spirit_beast':
        payload = spiritBeasts.value
        break
      case 'artifact':
        payload = artifacts.value
        break
      default:
        return
    }
    const raw = JSON.parse(JSON.stringify(toRaw(payload))).map((item) => {
      // eslint-disable-next-line no-unused-vars
      const { sort, ...rest } = item
      return rest
    })
    const result = await window.electron.writeEntityProfileCategory(bookName, category, raw)
    if (!result?.success) {
      throw new Error(result?.message || t('characterProfile.saveFailed'))
    }
  } catch (error) {
    console.error('保存扩展档案失败:', error)
    ElMessage.error(t('characterProfile.saveExtendedFailed'))
  }
}

async function saveCurrentKindList() {
  if (profileKind.value === 'character') await saveCharacters()
  else {
    const cat = entityCategoryFromProfileKind(profileKind.value)
    if (cat) await saveEntityCategory(cat)
  }
}
const dictionary = ref([]) // 字典数据
const formRef = ref(null)
const tableRef = ref(null)
let sortableInstance = null // 存储 SortableJS 实例

// 切换视图模式时按当前书籍持久化，下次打开该书籍时恢复
watch(viewMode, (val) => {
  if (typeof localStorage === 'undefined') return
  const key = getViewModeStorageKey()
  if (val === 'card' || val === 'table') {
    localStorage.setItem(key, val)
  }
})

watch(profileKind, (val) => {
  if (typeof localStorage === 'undefined') return
  if (['character', 'mount', 'monster', 'spirit_beast', 'artifact'].includes(val)) {
    localStorage.setItem(getProfileKindStorageKey(), val)
  }
  nextTick(() => initTableDragSort())
})

const presetMarkerColors = [
  '',
  '#FF4D4F',
  '#FF9F1C',
  '#FFD600',
  '#00C853',
  '#1890FF',
  '#B368FF',
  '#FF6F91',
  '#8D99AE',
  '#A3E635',
  '#00C9A7',
  '#13C2C2',
  '#2F54EB'
]

const colorPickerPredefine = presetMarkerColors.filter((color) => !!color)

// 图片预览相关
const imageViewerVisible = ref(false)
const imageViewerSrcList = ref([])
const imageViewerInitialIndex = ref(0)

// 表单数据
const characterForm = reactive({
  id: '',
  name: '',
  age: 18,
  gender: '男',
  height: 170,
  tags: [],
  biography: '',
  appearance: '',
  avatar: '', // 头像（小图，用于列表/卡片）
  characterImages: [], // 人物图列表（竖版全身，可多张）
  markerColor: ''
})

// 表单验证规则（人物需年龄/性别/身高，其余类型仅校验名称与字数）
const formRules = computed(() => {
  const nameLabel = kindUi.value.nameLabel
  const base = {
    name: [
      {
        required: true,
        message: t('characterProfile.inputName', { name: nameLabel }),
        trigger: 'blur'
      },
      { min: 1, max: 20, message: t('characterProfile.nameLengthRule'), trigger: 'blur' }
    ],
    biography: [
      { max: 1000, message: t('characterProfile.contentMax', { count: 1000 }), trigger: 'blur' }
    ],
    appearance: [
      { max: 500, message: t('characterProfile.contentMax', { count: 500 }), trigger: 'blur' }
    ]
  }
  if (profileKind.value === 'character') {
    return {
      ...base,
      age: [{ required: true, message: t('characterProfile.inputAgeRule'), trigger: 'blur' }],
      gender: [
        { required: true, message: t('characterProfile.selectGenderRule'), trigger: 'change' }
      ],
      height: [{ required: true, message: t('characterProfile.inputHeightRule'), trigger: 'blur' }]
    }
  }
  return base
})

// 计算标签选项（从字典词条中获取，保持树形结构）
const tagOptions = computed(() => {
  // 深拷贝字典数据，避免修改原数据
  const cloneDictionary = JSON.parse(JSON.stringify(dictionary.value))

  // 递归处理树形结构，确保每个节点都有name属性
  function processTreeData(nodes) {
    return nodes
      .map((node) => ({
        ...node,
        children: node.children && node.children.length > 0 ? processTreeData(node.children) : []
      }))
      .filter((node) => node.name && node.name.trim()) // 过滤掉没有名称的节点
  }

  return processTreeData(cloneDictionary)
})

// 加载人物数据
async function loadCharacters() {
  try {
    const data = await window.electron.readCharacters(bookName)
    let loadedData = Array.isArray(data) ? data : []

    // 数据兼容：将旧的 introduction 字段迁移到 biography 字段
    loadedData = loadedData.map((character) => {
      // 如果存在旧的 introduction 字段且没有 biography 字段，则迁移
      const images = normalizeCharacterImages(character)
      if (character.introduction && !character.biography) {
        return {
          ...character,
          biography: character.introduction,
          appearance: character.appearance || '',
          avatar: character.avatar || '',
          characterImages: images,
          introduction: undefined
        }
      }
      return {
        ...character,
        biography: character.biography || '',
        appearance: character.appearance || '',
        avatar: character.avatar || '',
        characterImages: images,
        markerColor: character.markerColor || ''
      }
    })

    // 直接使用数组顺序，不需要 sort 字段
    characters.value = loadedData
  } catch (error) {
    console.error('加载人物数据失败:', error)
    characters.value = []
  }
}

// 加载字典数据
async function loadDictionary() {
  try {
    const data = await window.electron.readDictionary(bookName)
    dictionary.value = data || []
  } catch (error) {
    console.error('加载字典数据失败:', error)
    dictionary.value = []
  }
}

/** 扩展档案实体字段与人物谱对齐，便于共用表单与列表 */
function normalizeProfileEntity(entity) {
  const images = normalizeCharacterImages(entity)
  return {
    ...entity,
    biography: entity.biography || entity.introduction || '',
    appearance: entity.appearance || '',
    avatar: entity.avatar || '',
    characterImages: images,
    markerColor: entity.markerColor || '',
    tags: Array.isArray(entity.tags) ? entity.tags : [],
    gender: entity.gender || '男',
    age: entity.age ?? 18,
    height: entity.height ?? 170
  }
}

async function loadEntityProfiles() {
  try {
    const data = await window.electron.readEntityProfiles(bookName)
    mounts.value = (Array.isArray(data?.mount) ? data.mount : []).map(normalizeProfileEntity)
    monsters.value = (Array.isArray(data?.monster) ? data.monster : []).map(normalizeProfileEntity)
    spiritBeasts.value = (Array.isArray(data?.spirit_beast) ? data.spirit_beast : []).map(
      normalizeProfileEntity
    )
    artifacts.value = (Array.isArray(data?.artifact) ? data.artifact : []).map(
      normalizeProfileEntity
    )
  } catch (error) {
    console.error('加载扩展档案失败:', error)
    mounts.value = []
    monsters.value = []
    spiritBeasts.value = []
    artifacts.value = []
  }
}

// 保存人物数据
async function saveCharacters() {
  try {
    // 移除 sort 字段（如果存在），因为数组顺序就是最终顺序
    const rawCharacters = JSON.parse(JSON.stringify(toRaw(characters.value))).map((character) => {
      // eslint-disable-next-line no-unused-vars
      const { sort, ...rest } = character
      return rest
    })
    const result = await window.electron.writeCharacters(bookName, rawCharacters)
    if (!result.success) {
      throw new Error(result.message || t('characterProfile.saveFailed'))
    }
  } catch (error) {
    console.error('保存人物数据失败:', error)
    ElMessage.error(t('characterProfile.saveCharactersFailed'))
  }
}

// 创建当前分类档案
function handleCreateEntity() {
  isEdit.value = false
  resetForm()
  drawerVisible.value = true
}

// 编辑
function handleEditEntity(entity) {
  isEdit.value = true
  Object.assign(characterForm, entity)
  characterForm.characterImages = getCharacterImages(entity)
  drawerVisible.value = true
}

// 删除
async function handleDeleteEntity(entity) {
  const typeName = kindUi.value.deleteType
  try {
    await ElMessageBox.confirm(
      t('characterProfile.deleteConfirmContent', { type: typeName, name: entity.name }),
      t('characterProfile.deleteConfirmTitle'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )

    const listRef = getCurrentListRef()
    const list = listRef.value
    const index = list.findIndex((c) => c.id === entity.id)
    if (index > -1) {
      list.splice(index, 1)
      ElMessage.success(t('characterProfile.deleteSuccess'))
    }
  } catch {
    // 用户取消，无需处理
  }
}

// 确认保存
async function confirmSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const listRef = getCurrentListRef()
    const list = listRef.value
    if (isEdit.value) {
      const index = list.findIndex((c) => c.id === characterForm.id)
      if (index > -1) {
        list[index] = { ...characterForm }
      }
    } else {
      list.push({
        ...characterForm,
        id: genId()
      })
    }

    drawerVisible.value = false
    ElMessage.success(
      isEdit.value ? t('characterProfile.editSuccess') : t('characterProfile.createSuccess')
    )
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 重置表单
function resetForm() {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(characterForm, {
    id: '',
    name: '',
    age: 18,
    gender: '男',
    height: 170,
    tags: [],
    biography: '',
    appearance: '',
    avatar: '',
    characterImages: [],
    markerColor: ''
  })
}

function handlePresetMarkerClick(color) {
  characterForm.markerColor = color
}

// 初始化表格拖拽排序
function initTableDragSort() {
  // 清理之前的实例
  try {
    if (sortableInstance && typeof sortableInstance.destroy === 'function') {
      sortableInstance.destroy()
    }
  } catch (error) {
    console.error('清理 SortableJS 实例失败:', error)
  }
  sortableInstance = null

  // 只在表格模式下初始化
  if (viewMode.value !== 'table') return

  nextTick(() => {
    if (!tableRef.value) return

    const tableEl = tableRef.value.$el
    if (!tableEl) return

    // 查找 tbody
    const tbody = tableEl.querySelector('tbody')
    if (!tbody) return

    sortableInstance = Sortable.create(tbody, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      filter: '.el-button, .el-button__text, .table-avatar',
      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt
        if (oldIndex === newIndex) return
        reorderCurrentList(oldIndex, newIndex)
      }
    })
  })
}

// 重新排序当前列表（根据拖拽后的顺序）
async function reorderCurrentList(oldIndex, newIndex) {
  const listRef = getCurrentListRef()
  const list = listRef.value
  if (!list || list.length === 0) return

  const movedItem = list[oldIndex]
  list.splice(oldIndex, 1)
  list.splice(newIndex, 0, movedItem)

  await saveCurrentKindList()
}

// 各列表变更时写入对应存储（人物 characters.json，其余 entity_profiles.json）
watch(characters, () => saveCharacters(), { deep: true })
watch(mounts, () => saveEntityCategory('mount'), { deep: true })
watch(monsters, () => saveEntityCategory('monster'), { deep: true })
watch(spiritBeasts, () => saveEntityCategory('spirit_beast'), { deep: true })
watch(artifacts, () => saveEntityCategory('artifact'), { deep: true })

// 监听表格数据变化，重新初始化拖拽（仅在表格模式下）
watch(
  () => [
    characters.value,
    mounts.value,
    monsters.value,
    spiritBeasts.value,
    artifacts.value,
    viewMode.value,
    profileKind.value
  ],
  () => {
    if (viewMode.value === 'table') {
      nextTick(() => {
        initTableDragSort()
      })
    }
  },
  { deep: true }
)

// 预览表单中的头像
function previewFormAvatar() {
  if (characterForm.avatar) {
    imageViewerSrcList.value = [getAvatarSrc(characterForm.avatar)]
    imageViewerInitialIndex.value = 0
    imageViewerVisible.value = true
  } else {
    ElMessage.warning(t('characterProfile.noAvatarPreview'))
  }
}

// 预览人物头像
function previewCharacterAvatar(character) {
  if (character.avatar) {
    imageViewerSrcList.value = [getAvatarSrc(character.avatar)]
    imageViewerInitialIndex.value = 0
    imageViewerVisible.value = true
  } else {
    ElMessage.warning(t('characterProfile.noAvatarPreviewFor', { name: character.name }))
  }
}

// 打开 AI 生成人物图抽屉（生成竖版全身人物图）
function openAICharacterDrawer() {
  aiCharacterDrawerVisible.value = true
}

// 兼容：人物图可能是旧字段 characterImage 或新字段 characterImages
function normalizeCharacterImages(character) {
  if (Array.isArray(character.characterImages) && character.characterImages.length) {
    return character.characterImages
  }
  if (character.characterImage) {
    return [character.characterImage]
  }
  return []
}

function getCharacterImages(character) {
  return normalizeCharacterImages(character)
}

// AI 生成人物图确认使用后，追加到人物图列表
function onAICharacterImageGenerated({ localPath }) {
  const path = localPath.startsWith('file://') ? localPath : `file://${localPath}`
  characterForm.characterImages.push(path)
}

// 预览表单人物图列表（从某张开始）
function previewFormCharacterImages(initialIndex = 0) {
  const list = characterForm.characterImages.map((img) => getAvatarSrc(img))
  if (!list.length) {
    ElMessage.warning(t('characterProfile.noGalleryPreview'))
    return
  }
  imageViewerSrcList.value = list
  imageViewerInitialIndex.value = Math.min(initialIndex, list.length - 1)
  imageViewerVisible.value = true
}

// 预览人物图列表（从某张开始）
function previewCharacterImages(character, initialIndex = 0) {
  const list = getCharacterImages(character).map((img) => getAvatarSrc(img))
  if (!list.length) {
    ElMessage.warning(t('characterProfile.noGalleryPreviewFor', { name: character.name }))
    return
  }
  imageViewerSrcList.value = list
  imageViewerInitialIndex.value = Math.min(initialIndex, list.length - 1)
  imageViewerVisible.value = true
}

// 从表单人物图列表中移除一张
function removeCharacterImage(index) {
  characterForm.characterImages.splice(index, 1)
}

// 人物图：选择本地图片并追加到列表
async function selectLocalImageForCharacterImage() {
  try {
    const result = await window.electron.selectImage()
    if (result && result.filePath) {
      characterForm.characterImages.push(`file://${result.filePath}`)
      ElMessage.success(t('characterProfile.addedToGallery'))
    }
  } catch (error) {
    console.error('选择图片失败:', error)
    ElMessage.error(t('characterProfile.selectImageFailed'))
  }
}

// 选择本地图片
async function selectLocalImage() {
  try {
    const result = await window.electron.selectImage()
    if (result && result.filePath) {
      // 将本地文件路径转换为 file:// 协议，以便在浏览器中正确显示
      characterForm.avatar = `file://${result.filePath}`
      ElMessage.success(t('characterProfile.selectImageSuccess'))
    }
  } catch (error) {
    console.error('选择图片失败:', error)
    ElMessage.error(t('characterProfile.selectImageFailed'))
  }
}

// 获取头像源地址
function getAvatarSrc(avatarPath) {
  if (!avatarPath) return ''

  // 如果已经是完整的URL（包含协议），直接返回
  if (
    avatarPath.startsWith('http://') ||
    avatarPath.startsWith('https://') ||
    avatarPath.startsWith('file://') ||
    avatarPath.startsWith('data:')
  ) {
    return avatarPath
  }

  // 如果是本地文件路径，添加 file:// 协议
  return `file://${avatarPath}`
}

// 组件挂载时加载数据并初始化拖拽
onMounted(async () => {
  await loadCharacters()
  await loadEntityProfiles()
  await loadDictionary() // 加载字典数据
  // 等待数据加载完成和 DOM 更新后再初始化拖拽
  await nextTick()
  initTableDragSort()
})

// 组件卸载时清理 SortableJS 实例
onBeforeUnmount(() => {
  try {
    if (sortableInstance && typeof sortableInstance.destroy === 'function') {
      sortableInstance.destroy()
    }
  } catch (error) {
    console.error('清理 SortableJS 实例失败:', error)
  }
  sortableInstance = null
})
</script>

<style lang="scss" scoped>
.profile-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.profile-kind-tabs {
  flex: 1;
  min-width: 0;
}

.view-toggle-inner {
  flex-shrink: 0;
}
.character-table {
  // 拖拽排序样式
  :deep(.sortable-ghost) {
    opacity: 0.4;
    background-color: var(--bg-soft);
  }

  :deep(.sortable-chosen) {
    background-color: var(--bg-soft);
  }

  :deep(.sortable-drag) {
    opacity: 0.8;
  }

  .table-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    margin: 0 auto;
    cursor: pointer;
    transition: all 0.3s ease;

    // &:hover {
    //   transform: scale(1.1);
    //   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    // }

    .table-avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .table-avatar-placeholder {
      width: 100%;
      height: 100%;
      // 使用主题主色调和成功色创建渐变
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--success-green) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-gray-lightest);
      font-size: 14px;
      font-weight: bold;
    }
  }

  .table-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
  }

  .no-tags {
    color: var(--text-gray-light);
    font-size: 12px;
    text-align: center;
  }

  .table-portrait-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    min-height: 48px;
  }
  .table-portrait {
    width: 36px;
    height: 64px;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border-color-soft);
    .el-image {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  .table-portrait-vertical {
    aspect-ratio: 9 / 16;
  }
  .table-portrait-more {
    font-size: 11px;
    color: var(--text-gray-light);
    margin-left: 2px;
  }

  .no-portrait {
    color: var(--text-gray-light);
    font-size: 12px;
  }

  .table-name-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .table-marker {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1px var(--border-color);
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    ::v-deep(.el-button) {
      margin: 0;
    }
  }
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 15px;
  padding: 12px 0;
  // 添加响应式优化
  @media (min-width: 1400px) {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  }
}

.character-card {
  background: var(--bg-soft);
  border: 1px solid var(--border-color-soft);
  // 增大圆角，让卡片更圆润
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  // 添加多层阴影，增强质感
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.05);
  // 添加微妙的背景渐变
  background: linear-gradient(180deg, var(--bg-soft) 0%, var(--bg-primary) 100%);

  &:hover {
    transform: translateY(-4px) scale(1.01);
    // 增强hover时的阴影效果
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.15),
      0 6px 12px rgba(0, 0, 0, 0.1),
      0 2px 4px rgba(0, 0, 0, 0.08);
    border-color: var(--border-color);

    .character-actions {
      opacity: 1;
      transform: scale(1);
    }

    .character-avatar {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
  }

  &.male {
    // 男性卡片：使用固定的蓝白色背景，不跟随主题变化
    background: linear-gradient(135deg, #f5f8ff 0%, #f0f5ff 100%);
    border-color: #e0e8f5;

    // 使用伪元素实现左侧边框
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #4a90e2 0%, #5ba3f5 100%);
      border-radius: 12px 0 0 12px; // 匹配卡片圆角
      z-index: 0;
    }

    &:hover {
      background: linear-gradient(135deg, #e6f0ff 0%, #e0ebff 100%);
      border-color: #d0dbf0;
    }
  }

  &.female {
    // 女性卡片：使用固定的粉白色背景，不跟随主题变化
    background: linear-gradient(135deg, #fff9fb 0%, #fff5f8 100%);
    border-color: #f5e0e8;

    // 使用伪元素实现左侧边框
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: linear-gradient(180deg, #ff6b9d 0%, #ff8fb3 100%);
      border-radius: 12px 0 0 12px; // 匹配卡片圆角
      z-index: 0;
    }

    &:hover {
      background: linear-gradient(135deg, #fff0f5 0%, #ffebf0 100%);
      border-color: #f0d5e0;
    }
  }
}

.character-info {
  padding: 8px 12px;
  position: relative;
  z-index: 1;

  .character-header {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 10px;
    padding: 0;
    margin-bottom: 8px;
  }

  // details 和 tags 的容器
  .character-info-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .character-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    // 添加边框和阴影，增强质感
    border: 2px solid var(--bg-soft);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.1),
      0 0 0 1px var(--border-color-soft);
    background: var(--bg-soft);

    &:hover {
      transform: scale(1.08);
      box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.2),
        0 0 0 2px var(--primary-color);
      border-color: var(--primary-color);
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      // 使用主题主色调和成功色创建渐变
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--success-green) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-gray-lightest);
      font-size: 18px;
      font-weight: bold;
    }
  }

  .character-details {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .character-marker {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px var(--border-color);
    }
  }

  .character-name {
    font-size: 16px;
    font-weight: 600;
    // 固定黑色，不跟随主题变化
    color: #121212;
  }

  .character-age,
  .character-height {
    font-size: 13px;
    // 固定黑色，不跟随主题变化
    color: #121212;
    font-weight: 500; // 增加字重，提升可读性
  }

  // 标签样式
  .character-tags {
    padding: 0;
    margin-bottom: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .tag-item {
      margin: 0;
      font-size: 11px;
      border-radius: 12px;
      padding: 2px 6px;
      font-weight: 500;
      // 添加微妙的阴影
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
    }
  }

  // 介绍区域样式
  .character-section {
    padding: 0;
    margin-bottom: 8px;
    // 添加背景和边框，增强层次感
    background: transparent;
    border-radius: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border-color-soft);
    transition: all 0.3s ease;

    &:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      // 固定黑色，不跟随主题变化
      color: #121212;
      margin-bottom: 6px;
      // 添加图标样式的小装饰
      position: relative;
      padding-left: 10px;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 14px;
        // 使用固定的蓝色，不跟随主题
        background: #4a90e2;
        border-radius: 2px;
      }
    }
  }

  .character-intro {
    font-size: 12px;
    // 固定黑色，不跟随主题变化
    color: #121212;
    line-height: 1.5; // 增加行高，提升可读性
    margin: 0;
    text-align: left;
    word-break: break-word;
    font-weight: 400; // 明确设置字重
  }

  // 形象介绍：最多显示3行
  .appearance-intro {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // 生平介绍：最多显示4行
  .biography-intro {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // 人物图列表：卡片下方一行多张
  .character-portrait-row {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-color-soft);
    .portrait-label {
      font-size: 12px;
      color: var(--text-gray-light);
      margin-bottom: 6px;
    }
    .character-portrait-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .character-portrait-thumb {
      width: 48px;
      flex-shrink: 0;
      aspect-ratio: 9 / 16;
      border-radius: 6px;
      overflow: hidden;
      cursor: pointer;
      border: 1px solid var(--border-color-soft);
      .el-image {
        width: 100%;
        height: 100%;
        display: block;
      }
    }
    .character-portrait-placeholder {
      font-size: 12px;
      color: var(--text-gray-light);
      padding: 8px 0;
    }
  }
}

.character-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  // 添加背景，增强可见性
  background: var(--bg-primary-a7);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 4px;

  .el-icon {
    font-size: 26px;
    color: var(--text-base);
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--danger-color);
      color: var(--text-gray-lightest);
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }
  }
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

// 头像表单样式
.avatar-form-item {
  ::v-deep(.el-form-item__content) {
    display: flex;
    align-items: center;
    min-height: 100px;
  }
}

.character-image-form-item {
  ::v-deep(.el-form-item__content) {
    display: flex;
    align-items: flex-start;
    min-height: 80px;
  }
}

.character-image-form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  .character-image-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .character-image-preview-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .character-image-preview {
    width: 72px;
    aspect-ratio: 9 / 16;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--border-color);
    .el-image {
      width: 100%;
      height: 100%;
      display: block;
    }
  }
  .character-image-remove {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 22px;
    height: 22px;
    padding: 0;
    min-width: 22px;
  }
  .character-image-placeholder {
    font-size: 12px;
    color: var(--text-gray-light);
    padding: 8px 0;
  }
  .character-image-input-section .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
}

.avatar-form-section {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;

  .avatar-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid var(--border-color);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .form-avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .form-avatar-placeholder {
      width: 100%;
      height: 100%;
      // 使用主题主色调和成功色创建渐变
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--success-green) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-gray-lightest);
      font-size: 24px;
      font-weight: bold;
    }
  }

  .avatar-input-section {
    flex: 1;

    .input-row {
      display: flex;
      gap: 12px;
      align-items: center;

      .el-input {
        flex: 1;
      }

      .el-button {
        flex-shrink: 0;
      }
    }
  }
}

// 人物表单抽屉内容区
.character-form-drawer {
  :deep(.el-drawer__body) {
    display: flex;
    flex-direction: column;
    padding: 20px;
    padding-bottom: 80px;
  }
  :deep(.el-drawer__footer) {
    padding: 12px 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.marker-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .marker-swatch {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: var(--bg-primary);
    padding: 0;
    transition: all 0.2s ease;

    &.empty {
      background: var(--bg-mute);
      // 使用主题基础文本颜色，确保在浅色和暗色模式下都有足够的对比度
      color: var(--text-base);
      font-size: 12px;
    }

    &.active {
      box-shadow:
        0 0 0 2px var(--bg-primary),
        0 0 0 4px var(--primary-color);
      opacity: 0.6; // 添加透明度以显示激活状态
    }

    .marker-none {
      font-size: 12px;
    }
  }
}
</style>
<style lang="scss">
:deep(.el-drawer__header) {
  margin-bottom: 0px;
  padding-bottom: 20px;
}
:deep(.el-drawer__body) {
  padding: 0px;
}
</style>
