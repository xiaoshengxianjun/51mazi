<template>
  <el-dialog
    v-model="visible"
    :title="t('randomName.title')"
    width="900px"
    :close-on-click-modal="false"
    @close="onClose"
  >
    <div class="random-name-dialog">
      <!-- 左侧类型 -->
      <el-menu class="type-menu" :default-active="type" @select="type = $event">
        <el-menu-item v-for="item in types" :key="item.value" :index="item.value">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
      <!-- 中间规格 -->
      <div class="spec-panel">
        <el-form label-width="60px" @submit.prevent>
          <template v-if="showChineseOptions || showJapaneseOptions || showWesternOptions">
            <el-form-item :label="t('randomName.surname')">
              <el-input
                v-model="surname"
                :placeholder="t('randomName.inputOrRandom')"
                style="width: 100%"
              />
              <div
                style="margin-top: 8px; width: 100%; display: flex; justify-content: space-between"
              >
                <el-button size="small" @click="randomSurname">
                  {{ t('randomName.randomSurname') }}
                </el-button>
                <el-button v-if="showChineseOptions" size="small" @click="randomCompoundSurname">
                  {{ t('randomName.randomCompoundSurname') }}
                </el-button>
              </div>
            </el-form-item>
            <el-form-item :label="t('randomName.gender')">
              <el-radio-group v-model="gender">
                <el-radio value="男">{{ t('randomName.male') }}</el-radio>
                <el-radio value="女">{{ t('randomName.female') }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="showChineseOptions" :label="t('randomName.nameLength')">
              <el-radio-group v-model="nameLength">
                <el-radio :value="2">{{ t('randomName.twoChars') }}</el-radio>
                <el-radio :value="3">{{ t('randomName.threeChars') }}</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item
              v-if="showChineseOptions && nameLength === 3"
              :label="t('randomName.middleChar')"
            >
              <el-input
                v-model="middleChar"
                maxlength="1"
                :placeholder="t('randomName.middleCharPlaceholder')"
                style="width: 100%"
              />
            </el-form-item>
          </template>
          <template v-if="showCustomOptions">
            <el-form-item :label="t('randomName.suffix')">
              <el-input
                v-model="customSuffix"
                :placeholder="t('randomName.inputOrRandom')"
                style="width: 100%"
              />
              <div style="margin-top: 8px; width: 100%">
                <el-button size="small" @click="randomSuffix">
                  {{ t('randomName.randomSuffix') }}
                </el-button>
              </div>
            </el-form-item>
          </template>
        </el-form>
        <el-button
          type="primary"
          style="width: 100%"
          :loading="generating"
          :disabled="generating"
          @click="handleGenerateNames"
        >
          {{ useAI ? t('randomName.generateWithAI') : t('randomName.generate') }}
        </el-button>
        <el-checkbox v-model="useAI" :disabled="generating">
          {{ t('randomName.useAI') }}
        </el-checkbox>
      </div>
      <!-- 右侧名字列表 -->
      <div class="name-list">
        <div v-for="name in names" :key="name" class="name-item" @click="copyName(name)">
          {{ name }}
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  CHINESE_SURNAMES,
  CHINESE_COMPOUND_SURNAMES,
  CHINESE_MALE_CHARS,
  CHINESE_FEMALE_CHARS,
  JAPANESE_SURNAMES,
  JAPANESE_MALE_CHARS,
  JAPANESE_FEMALE_CHARS,
  WESTERN_SURNAMES,
  WESTERN_MALE_NAMES,
  WESTERN_FEMALE_NAMES,
  FORCE_SUFFIXES,
  PLACE_SUFFIXES,
  BOOK_SUFFIXES,
  ITEM_SUFFIXES,
  ELIXIR_SUFFIXES,
  CORE_WORDS
} from '../constants/config'
import { generateNamesWithAI } from '@renderer/service/deepseek'
const { t } = useI18n()

const types = computed(() => [
  { label: t('randomName.types.cn'), value: 'cn' },
  { label: t('randomName.types.jp'), value: 'jp' },
  { label: t('randomName.types.en'), value: 'en' },
  { label: t('randomName.types.force'), value: 'force' },
  { label: t('randomName.types.place'), value: 'place' },
  { label: t('randomName.types.book'), value: 'book' },
  { label: t('randomName.types.item'), value: 'item' },
  { label: t('randomName.types.elixir'), value: 'elixir' }
])
const type = ref('cn')
const surname = ref('')
const gender = ref('男')
const nameLength = ref(3)
const middleChar = ref('')
const names = ref([])
const visible = ref(false)
const customSuffix = ref('')
const useAI = ref(false)
const generating = ref(false)

function open() {
  visible.value = true
}
function onClose() {
  names.value = []
  customSuffix.value = ''
}

const showChineseOptions = computed(() => type.value === 'cn')
const showJapaneseOptions = computed(() => type.value === 'jp')
const showWesternOptions = computed(() => type.value === 'en')
const showCustomOptions = computed(() => {
  return ['force', 'place', 'book', 'item', 'elixir'].includes(type.value)
})

function randomSurname() {
  if (type.value === 'cn') {
    surname.value = CHINESE_SURNAMES[Math.floor(Math.random() * CHINESE_SURNAMES.length)]
  } else if (type.value === 'jp') {
    surname.value = JAPANESE_SURNAMES[Math.floor(Math.random() * JAPANESE_SURNAMES.length)]
  } else if (type.value === 'en') {
    surname.value = WESTERN_SURNAMES[Math.floor(Math.random() * WESTERN_SURNAMES.length)]
  }
}
function randomCompoundSurname() {
  if (type.value === 'cn') {
    surname.value =
      CHINESE_COMPOUND_SURNAMES[Math.floor(Math.random() * CHINESE_COMPOUND_SURNAMES.length)]
  }
}

function randomSuffix() {
  let suffixPool = []
  switch (type.value) {
    case 'force':
      suffixPool = FORCE_SUFFIXES
      break
    case 'place':
      suffixPool = PLACE_SUFFIXES
      break
    case 'book':
      suffixPool = BOOK_SUFFIXES
      break
    case 'item':
      suffixPool = ITEM_SUFFIXES
      break
    case 'elixir':
      suffixPool = ELIXIR_SUFFIXES
      break
  }
  customSuffix.value = suffixPool[Math.floor(Math.random() * suffixPool.length)]
}

// 防抖处理：避免快速点击
let generateTimer = null

async function handleGenerateNames() {
  // 如果正在生成，直接返回
  if (generating.value) {
    return
  }

  // 清除之前的定时器
  if (generateTimer) {
    clearTimeout(generateTimer)
  }

  // 防抖：300ms 内的重复点击会被忽略
  generateTimer = setTimeout(async () => {
    if (useAI.value) {
      // 使用 AI 生成
      await generateNamesWithAIService()
    } else {
      // 使用本地生成
      generateNamesLocal()
    }
    generateTimer = null
  }, 300)
}

async function generateNamesWithAIService() {
  generating.value = true
  try {
    const result = await generateNamesWithAI({
      type: type.value,
      surname: surname.value,
      gender: gender.value,
      nameLength: nameLength.value,
      middleChar: middleChar.value,
      count: 24
    })

    if (result.success && result.names.length > 0) {
      names.value = result.names
      ElMessage.success(t('randomName.aiGeneratedCount', { count: result.names.length }))
    } else {
      ElMessage.warning(result.message || t('randomName.aiGenerateFallback'))
      generateNamesLocal() // 降级到本地生成
    }
  } catch (error) {
    console.error('AI 起名失败:', error)
    ElMessage.error(t('randomName.aiGenerateErrorFallback'))
    generateNamesLocal() // 降级到本地生成
  } finally {
    generating.value = false
  }
}

function generateNamesLocal() {
  const result = []
  if (type.value === 'cn') {
    const chars = gender.value === '男' ? CHINESE_MALE_CHARS : CHINESE_FEMALE_CHARS
    for (let i = 0; i < 24; i++) {
      let name =
        surname.value || CHINESE_SURNAMES[Math.floor(Math.random() * CHINESE_SURNAMES.length)]
      if (nameLength.value === 2) {
        name += chars[Math.floor(Math.random() * chars.length)]
      } else {
        name += middleChar.value || chars[Math.floor(Math.random() * chars.length)]
        name += chars[Math.floor(Math.random() * chars.length)]
      }
      result.push(name)
    }
  } else if (type.value === 'jp') {
    const chars = gender.value === '男' ? JAPANESE_MALE_CHARS : JAPANESE_FEMALE_CHARS
    for (let i = 0; i < 24; i++) {
      const sur =
        surname.value || JAPANESE_SURNAMES[Math.floor(Math.random() * JAPANESE_SURNAMES.length)]
      result.push(sur + chars[Math.floor(Math.random() * chars.length)])
    }
  } else if (type.value === 'en') {
    const sur = WESTERN_SURNAMES[Math.floor(Math.random() * WESTERN_SURNAMES.length)]
    const pool = gender.value === '男' ? WESTERN_MALE_NAMES : WESTERN_FEMALE_NAMES
    for (let i = 0; i < 24; i++) {
      result.push(pool[Math.floor(Math.random() * pool.length)] + '·' + sur)
    }
  } else if (type.value === 'force') {
    // 生成各方势力名称，前缀1-3个字
    for (let i = 0; i < 24; i++) {
      const prefixLength = Math.floor(Math.random() * 3) + 1 // 1-3个字
      let prefix = ''
      for (let j = 0; j < prefixLength; j++) {
        prefix += CORE_WORDS[Math.floor(Math.random() * CORE_WORDS.length)]
      }
      const suffix =
        customSuffix.value || FORCE_SUFFIXES[Math.floor(Math.random() * FORCE_SUFFIXES.length)]
      result.push(prefix + suffix)
    }
  } else if (type.value === 'place') {
    // 生成地名，前缀1-3个字
    for (let i = 0; i < 24; i++) {
      const prefixLength = Math.floor(Math.random() * 3) + 1 // 1-3个字
      let prefix = ''
      for (let j = 0; j < prefixLength; j++) {
        prefix += CORE_WORDS[Math.floor(Math.random() * CORE_WORDS.length)]
      }
      const suffix =
        customSuffix.value || PLACE_SUFFIXES[Math.floor(Math.random() * PLACE_SUFFIXES.length)]
      result.push(prefix + suffix)
    }
  } else if (type.value === 'book') {
    // 生成秘籍名称，前缀1-4个字
    for (let i = 0; i < 24; i++) {
      const prefixLength = Math.floor(Math.random() * 4) + 1 // 1-4个字
      let prefix = ''
      for (let j = 0; j < prefixLength; j++) {
        prefix += CORE_WORDS[Math.floor(Math.random() * CORE_WORDS.length)]
      }
      const suffix =
        customSuffix.value || BOOK_SUFFIXES[Math.floor(Math.random() * BOOK_SUFFIXES.length)]
      result.push(prefix + suffix)
    }
  } else if (type.value === 'item') {
    // 生成法宝名称，前缀1-4个字
    for (let i = 0; i < 24; i++) {
      const prefixLength = Math.floor(Math.random() * 4) + 1 // 1-4个字
      let prefix = ''
      for (let j = 0; j < prefixLength; j++) {
        prefix += CORE_WORDS[Math.floor(Math.random() * CORE_WORDS.length)]
      }
      const suffix =
        customSuffix.value || ITEM_SUFFIXES[Math.floor(Math.random() * ITEM_SUFFIXES.length)]
      result.push(prefix + suffix)
    }
  } else if (type.value === 'elixir') {
    // 生成灵药名称，前缀1-4个字
    for (let i = 0; i < 24; i++) {
      const prefixLength = Math.floor(Math.random() * 4) + 1 // 1-4个字
      let prefix = ''
      for (let j = 0; j < prefixLength; j++) {
        prefix += CORE_WORDS[Math.floor(Math.random() * CORE_WORDS.length)]
      }
      const suffix =
        customSuffix.value || ELIXIR_SUFFIXES[Math.floor(Math.random() * ELIXIR_SUFFIXES.length)]
      result.push(prefix + suffix)
    }
  }
  names.value = result
}

function copyName(name) {
  navigator.clipboard.writeText(name)
  ElMessage.success(t('randomName.copied', { name }))
}

defineExpose({ open })
</script>

<style scoped>
.random-name-dialog {
  display: flex;
  min-height: 320px;
}
.type-menu {
  width: 110px;
  border-right: 1px solid #eee;
  margin-right: 16px;
}
.spec-panel {
  /* flex: 1; */
  width: 260px;
  padding-right: 16px;
  border-right: 1px solid #eee;
}
.name-list {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: 12px;
  padding-left: 16px;
  align-items: start;
}
.name-item {
  font-size: 16px;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background 0.2s;
  text-align: center;
}
.name-item:hover {
  background: #e6f7ff;
  color: #409eff;
}
</style>
