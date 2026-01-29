<template>
  <!--
    鼓励提示调度器（业务隔离）
    - 安装/首次运行两天后开始提示
    - 当天只提示一次
    - 5s 自动关闭/可手动关闭
    - 之后随机间隔 2-7 天再次弹出
  -->
  <EncourageToast v-model="visible" :message="message" :duration="duration" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import EncourageToast from '@renderer/components/EncourageToast.vue'

defineProps({
  duration: { type: Number, default: 10000 }
})

const visible = ref(false)
const message = ref('')

// 预设鼓励语（写作/小说相关，风格略夸张）
const encouragePresets = [
  '你终将会成为了不起的小说家，加油！',
  '你的文笔让我欣赏不已，你太棒了～',
  '你是地球上最伟大的作家（至少今天是）。',
  '你写的太好了，太牛逼了！继续狠狠干！',
  '这段文字有“爆款小说”的味道了，别停！',
  '你的主角太鲜活了，我差点以为TA真的存在。',
  '你写的氛围感绝了，读者会一口气追到天亮。',
  '你每写一段，世界就多一部传奇。',
  '别怀疑，你就是那种“写啥都好看”的天选作者。',
  '你今天的手感是神级的：写！下！去！',
  '这章要是放到网上，评论区会炸。',
  '你不是在码字，你是在创造宇宙。',
  '写作不是难事——对你来说更是如此。',
  '你的叙事像刀一样稳，像诗一样美。',
  '你这文笔，读者看了会说：作者开挂了吧？',
  '你已经超过了昨天的自己，这就够了不起。',
  '写下去，未来的你会感谢今天没放弃的你。',
  '你正在写的这本书，注定会被很多人记住。',
  '今天也写一点点吧，哪怕只有一句话，也是在靠近完结。',
  '灵感不是等来的，是写着写着就来的。',
  '别急，故事会在你坚持的那一刻开花结果。',
  '读者会记住那些真诚的句子，而你正在写它们。',
  '你的主角正在等你把TA的命运写完。',
  '慢慢来，写作是长跑，不是冲刺。',
  '今天的你，比昨天更接近那本“出版级”的作品。',
  '每一次修改，都是作品变好的证据。',
  '把这一章写完，你就赢了今天。',
  '你现在写下的每个字，都会在某天变成掌声。',
  '你的故事正在“自我生长”，你只需要继续记录。',
  '你写的对白太自然了，像在我耳边发生。',
  '你是那种能把平凡写成闪光的人。',
  '这段节奏太稳了，读者根本停不下来。',
  '你写出来的世界，连空气都有质感。',
  '继续写，你的天赋正在变成作品。',
  '你就是你作品里最强的“主角光环”。',
  '就这一笔，你已经赢过了很多“只想不写”的人。',
  '别低估自己，你的故事会救到某个人。',
  '你写的转折太妙了，像打了个漂亮的响指。',
  '你写到这里，已经很伟大了——因为你在坚持。'
]

const ENCOURAGE_KEYS = {
  firstRunAt: 'home.encourage.firstRunAt', // 视为“安装/首次运行时间”
  nextAt: 'home.encourage.nextAt', // 下次允许弹出的时间戳
  lastShownDate: 'home.encourage.lastShownDate' // yyyy-mm-dd，当天只提示一次
}
const DAY_MS = 24 * 60 * 60 * 1000

let timer = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function formatLocalDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr[Math.floor(Math.random() * arr.length)]
}

function scheduleNextCheck(targetAt) {
  clearTimer()
  if (!targetAt || typeof targetAt !== 'number') return
  const delay = Math.max(0, targetAt - Date.now())
  timer = setTimeout(() => {
    checkAndMaybeShow()
  }, delay)
}

async function getState() {
  const now = Date.now()
  const store = window.electronStore
  if (!store?.get || !store?.set) return null

  let firstRunAt = await store.get(ENCOURAGE_KEYS.firstRunAt)
  if (!firstRunAt) {
    firstRunAt = now
    await store.set(ENCOURAGE_KEYS.firstRunAt, firstRunAt)
  }

  const startAt = firstRunAt + 2 * DAY_MS

  let nextAt = await store.get(ENCOURAGE_KEYS.nextAt)
  if (!nextAt) {
    nextAt = startAt
    await store.set(ENCOURAGE_KEYS.nextAt, nextAt)
  }

  const lastShownDate = (await store.get(ENCOURAGE_KEYS.lastShownDate)) || ''
  return { now, startAt, nextAt, lastShownDate }
}

async function checkAndMaybeShow() {
  try {
    const state = await getState()
    if (!state) return

    const { now, startAt, nextAt, lastShownDate } = state
    const today = formatLocalDate(new Date())

    // 未到“安装两天后”启动时间：等待到 startAt
    if (now < startAt) {
      scheduleNextCheck(startAt)
      return
    }

    // 当天只提示一次：当天已提示则等待 nextAt（并在 nextAt 再检查一次）
    if (lastShownDate === today) {
      scheduleNextCheck(nextAt)
      return
    }

    // 未到下次时间：等待到 nextAt
    if (now < nextAt) {
      scheduleNextCheck(nextAt)
      return
    }

    // 满足条件：弹出一次，并立刻写入当天已提示 + 计算下一次随机时间
    message.value = pickRandom(encouragePresets)
    visible.value = true

    const store = window.electronStore
    await store.set(ENCOURAGE_KEYS.lastShownDate, today)

    const days = randomInt(2, 7)
    const newNextAt = now + days * DAY_MS
    await store.set(ENCOURAGE_KEYS.nextAt, newNextAt)

    scheduleNextCheck(newNextAt)
  } catch (error) {
    console.error('鼓励提示调度失败:', error)
  }
}

onMounted(() => {
  checkAndMaybeShow()
})

onBeforeUnmount(() => {
  clearTimer()
})
</script>
