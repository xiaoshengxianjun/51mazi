<template>
  <el-dialog
    v-model="visible"
    title="随机起名"
    width="700px"
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
        <el-form label-width="60px" size="small">
          <template v-if="showChineseOptions">
            <el-form-item label="姓氏">
              <el-input v-model="surname" placeholder="请输入或随机" style="width: 120px" />
              <el-button @click="randomSurname" size="small" style="margin-left: 8px"
                >随机单姓</el-button
              >
              <el-button @click="randomCompoundSurname" size="small">随机复姓</el-button>
            </el-form-item>
            <el-form-item label="性别">
              <el-radio-group v-model="gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="字数">
              <el-radio-group v-model="nameLength">
                <el-radio :label="2">二字名</el-radio>
                <el-radio :label="3">三字名</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="中间字" v-if="nameLength === 3">
              <el-input
                v-model="middleChar"
                maxlength="1"
                placeholder="请输入中间一个字"
                style="width: 120px"
              />
            </el-form-item>
          </template>
          <template v-else>
            <el-form-item label="性别">
              <el-radio-group v-model="gender">
                <el-radio label="男">男</el-radio>
                <el-radio label="女">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </template>
          <el-form-item>
            <el-button type="primary" @click="generateNames">生成名字</el-button>
          </el-form-item>
        </el-form>
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
function open() {
  visible.value = true
}
function onClose() {
  names.value = []
}

const showChineseOptions = computed(() => type.value === 'cn')

// 字库
const singleSurnames = [
  '赵',
  '钱',
  '孙',
  '李',
  '周',
  '吴',
  '郑',
  '王',
  '冯',
  '陈',
  '褚',
  '卫',
  '蒋',
  '沈',
  '韩',
  '杨',
  '朱',
  '秦',
  '尤',
  '许',
  '何',
  '吕',
  '施',
  '张',
  '孔',
  '曹',
  '严',
  '华',
  '金',
  '魏',
  '陶',
  '姜'
]
const compoundSurnames = [
  '欧阳',
  '司马',
  '上官',
  '诸葛',
  '东方',
  '夏侯',
  '皇甫',
  '尉迟',
  '公孙',
  '慕容',
  '司徒',
  '令狐',
  '宇文',
  '长孙',
  '司空',
  '轩辕',
  '令狐',
  '百里',
  '呼延',
  '端木',
  '南宫'
]
const maleChars =
  '伟强磊洋勇军杰涛超明刚平辉鹏龙华飞鑫波斌宇浩凯瑞志晨旭健宁林峰松博凡航轩坤俊铭诚昊天乐成威达'
const femaleChars =
  '芳娜静敏丽艳娟英慧玲芬莉桂丹萍红玉梅琳雪倩婷璐颖悦璇妍欣洁莹婧诗怡菲佳嘉璇雯彤瑶珊茜萌晨'
const jpSurnames = ['佐藤', '铃木', '高桥', '田中', '渡边', '伊藤', '中村', '小林', '加藤', '吉田']
const jpMale = ['太郎', '翔', '健', '悠斗', '海斗', '阳斗', '莲', '陆', '葵', '隼人']
const jpFemale = ['美咲', '葵', '结衣', '樱', '花', '爱', '优', '真由', '沙织', '千夏']
const enSurnames = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Miller',
  'Davis',
  'Garcia',
  'Rodriguez',
  'Wilson'
]
const enMale = [
  'James',
  'John',
  'Robert',
  'Michael',
  'William',
  'David',
  'Richard',
  'Joseph',
  'Thomas',
  'Charles'
]
const enFemale = [
  'Mary',
  'Patricia',
  'Jennifer',
  'Linda',
  'Elizabeth',
  'Barbara',
  'Susan',
  'Jessica',
  'Sarah',
  'Karen'
]

function randomSurname() {
  surname.value = singleSurnames[Math.floor(Math.random() * singleSurnames.length)]
}
function randomCompoundSurname() {
  surname.value = compoundSurnames[Math.floor(Math.random() * compoundSurnames.length)]
}

function generateNames() {
  const result = []
  if (type.value === 'cn') {
    const chars = gender.value === '男' ? maleChars : femaleChars
    for (let i = 0; i < 18; i++) {
      let name = surname.value || singleSurnames[Math.floor(Math.random() * singleSurnames.length)]
      if (nameLength.value === 2) {
        name += chars[Math.floor(Math.random() * chars.length)]
      } else {
        name += middleChar.value || chars[Math.floor(Math.random() * chars.length)]
        name += chars[Math.floor(Math.random() * chars.length)]
      }
      result.push(name)
    }
  } else if (type.value === 'jp') {
    const sur = jpSurnames[Math.floor(Math.random() * jpSurnames.length)]
    const pool = gender.value === '男' ? jpMale : jpFemale
    for (let i = 0; i < 18; i++) {
      result.push(sur + pool[Math.floor(Math.random() * pool.length)])
    }
  } else if (type.value === 'en') {
    const sur = enSurnames[Math.floor(Math.random() * enSurnames.length)]
    const pool = gender.value === '男' ? enMale : enFemale
    for (let i = 0; i < 18; i++) {
      result.push(pool[Math.floor(Math.random() * pool.length)] + ' ' + sur)
    }
  } else {
    // 其他类型，简单生成
    for (let i = 0; i < 18; i++) {
      result.push('示例' + (i + 1))
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
  flex: 1;
  min-width: 220px;
  padding-right: 16px;
  border-right: 1px solid #eee;
}
.name-list {
  flex: 1.5;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding-left: 16px;
  align-items: flex-start;
}
.name-item {
  font-size: 18px;
  color: #555;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}
.name-item:hover {
  background: #e6f7ff;
  color: #409eff;
}
</style>
