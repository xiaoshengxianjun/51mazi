<template>
  <el-dialog
    v-model="visible"
    title="随机起名"
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
        <el-form label-width="60px">
          <template v-if="showChineseOptions || showJapaneseOptions || showWesternOptions">
            <el-form-item label="姓氏">
              <el-input v-model="surname" placeholder="请输入或随机" style="width: 100%" />
              <div
                style="margin-top: 8px; width: 100%; display: flex; justify-content: space-between"
              >
                <el-button size="small" @click="randomSurname">随机姓氏</el-button>
                <el-button v-if="showChineseOptions" size="small" @click="randomCompoundSurname">
                  随机复姓
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="性别">
              <el-radio-group v-model="gender">
                <el-radio value="男">男</el-radio>
                <el-radio value="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="showChineseOptions" label="字数">
              <el-radio-group v-model="nameLength">
                <el-radio :value="2">二字名</el-radio>
                <el-radio :value="3">三字名</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="showChineseOptions && nameLength === 3" label="中间字">
              <el-input
                v-model="middleChar"
                maxlength="1"
                placeholder="请输入中间一个字"
                style="width: 100%"
              />
            </el-form-item>
          </template>
          <template v-if="showCustomOptions">
            <el-form-item label="后缀">
              <el-input v-model="customSuffix" placeholder="请输入或随机" style="width: 100%" />
              <div style="margin-top: 8px; width: 100%">
                <el-button size="small" @click="randomSuffix">随机后缀</el-button>
              </div>
            </el-form-item>
          </template>
        </el-form>
        <el-button type="primary" style="width: 100%" @click="generateNames">生成名字</el-button>
      </div>
      <!-- 右侧名字列表 -->
      <div class="name-list">
        <div v-for="name in names" :key="name" class="name-item" @click="copyName(name)">
          {{ name }}
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
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

const types = [
  { label: '中国人名', value: 'cn' },
  { label: '日本人名', value: 'jp' },
  { label: '西方人名', value: 'en' },
  { label: '各方势力', value: 'force' },
  { label: '地名', value: 'place' },
  { label: '秘籍', value: 'book' },
  { label: '法宝', value: 'item' },
  { label: '灵药', value: 'elixir' }
]
const type = ref('cn')
const surname = ref('')
const gender = ref('男')
const nameLength = ref(3)
const middleChar = ref('')
const names = ref([])
const visible = ref(false)
const customSuffix = ref('')

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

function generateNames() {
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
  ElMessage.success('已复制：' + name)
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
