/**
 * 从书籍目录聚合人物谱、扩展档案、词条、时间线等，供「章纲生成章节」等 AI 调用注入上下文。
 * 仅主进程使用；通过控制长度避免撑爆模型上下文。
 */
import fs from 'fs'
import { join } from 'path'

const ENTITY_PROFILE_KEYS = ['mount', 'monster', 'spirit_beast', 'artifact']
const ENTITY_SECTION_LABEL = {
  mount: '坐骑',
  monster: '怪兽',
  spirit_beast: '妖兽',
  artifact: '宝器'
}

const DEFAULT_MAX_TOTAL = 12000

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function truncate(str, maxLen) {
  const s = String(str || '').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, Math.max(0, maxLen - 1))}…`
}

function outlineBlob(outlineTitle, outlineContent) {
  return `${String(outlineTitle || '')}\n${String(outlineContent || '')}`
}

/** 章纲文本中是否出现该名称（长度至少 2，减少误匹配） */
function nameMentionedInOutline(name, blob) {
  const n = String(name || '').trim()
  if (n.length < 2) return false
  return blob.includes(n)
}

function flattenDictionary(nodes, out = []) {
  if (!Array.isArray(nodes)) return out
  for (const node of nodes) {
    if (node?.name && String(node.name).trim()) {
      out.push({
        name: String(node.name).trim(),
        introduction: String(node.introduction || '').trim()
      })
    }
    if (node?.children?.length) flattenDictionary(node.children, out)
  }
  return out
}

function flattenSettings(data) {
  const categories = Array.isArray(data?.categories) ? data.categories : []
  const out = []

  function traverse(nodes, path = []) {
    if (!Array.isArray(nodes)) return

    for (const category of nodes) {
      const categoryName = String(category?.name || '').trim() || '未分类'
      const categoryPath = [...path, categoryName]
      const categoryIntroduction = String(category?.introduction || '').trim()

      if (categoryIntroduction) {
        out.push({
          type: 'category',
          categoryPath,
          name: categoryName,
          introduction: categoryIntroduction
        })
      }

      traverse(category?.children, categoryPath)

      const items = Array.isArray(category?.items) ? category.items : []
      for (const item of items) {
        const name = String(item?.name || '').trim()
        if (!name) continue

        out.push({
          type: 'setting',
          categoryPath,
          name,
          introduction: String(item?.introduction || '').trim()
        })
      }
    }
  }

  traverse(categories)
  return out
}

function formatSettingLine(setting) {
  const categoryPath = Array.isArray(setting.categoryPath)
    ? setting.categoryPath.filter(Boolean).join(' / ')
    : '未分类'
  const intro = truncate(setting.introduction, setting.type === 'category' ? 180 : 220)

  if (setting.type === 'category') {
    return intro ? `${categoryPath}｜分类说明：${intro}` : `${categoryPath}｜分类说明`
  }

  return intro
    ? `${categoryPath}｜「${setting.name}」：${intro}`
    : `${categoryPath}｜「${setting.name}」`
}

function settingMentionedInOutline(setting, blob) {
  if (nameMentionedInOutline(setting?.name, blob)) return true
  const categoryPath = Array.isArray(setting?.categoryPath) ? setting.categoryPath : []
  return categoryPath.some((name) => nameMentionedInOutline(name, blob))
}

function formatCharacterLine(c) {
  const name = String(c?.name || '').trim() || '（未命名）'
  const gender = c?.gender != null ? String(c.gender).trim() : ''
  const age = c?.age != null && c?.age !== '' ? `${c.age}` : ''
  const height = c?.height != null && c?.height !== '' ? `${c.height}` : ''
  const bio = truncate(String(c?.biography || c?.introduction || '').trim(), 380)
  const appear = truncate(String(c?.appearance || '').trim(), 200)
  const tags = Array.isArray(c?.tags)
    ? c.tags
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, 8)
    : []
  const bits = [`姓名：${name}`]
  if (gender) bits.push(`性别：${gender}`)
  if (age) bits.push(`年龄：${age}`)
  if (height) bits.push(`身高：${height}`)
  if (tags.length) bits.push(`标签：${tags.join('、')}`)
  if (appear) bits.push(`外貌：${appear}`)
  if (bio) bits.push(`档案：${bio}`)
  return bits.join('；')
}

function formatEntityLine(e) {
  const name = String(e?.name || '').trim() || '（未命名）'
  const bio = truncate(String(e?.biography || e?.introduction || '').trim(), 320)
  return bio ? `「${name}」：${bio}` : `「${name}」`
}

/**
 * @param {string} bookPath 书籍绝对路径
 * @param {{ outlineTitle?: string, outlineContent?: string, maxTotalChars?: number }} options
 * @returns {string} 可直接拼进 user 消息的设定块；无数据时返回空串
 */
export function buildBookWritingContextBlock(bookPath, options = {}) {
  if (!bookPath || !fs.existsSync(bookPath)) return ''

  const maxTotal =
    Number(options.maxTotalChars) > 0 ? Number(options.maxTotalChars) : DEFAULT_MAX_TOTAL
  const blob = outlineBlob(options.outlineTitle, options.outlineContent)
  const sections = []

  // —— 书籍元信息 ——
  const meta = safeReadJson(join(bookPath, 'mazi.json'), null)
  if (meta && typeof meta === 'object') {
    const lines = []
    if (meta.name) lines.push(`书名：${truncate(meta.name, 120)}`)
    if (meta.type) lines.push(`类型：${truncate(meta.type, 80)}`)
    if (meta.intro) lines.push(`简介：${truncate(meta.intro, 720)}`)
    if (lines.length) sections.push(`【书籍信息】\n${lines.join('\n')}`)
  }

  // —— 人物谱 ——
  const characters = safeReadJson(join(bookPath, 'characters.json'), [])
  if (Array.isArray(characters) && characters.length) {
    const matched = characters.filter((c) => nameMentionedInOutline(c?.name, blob))
    const picked = matched.length > 0 ? matched.slice(0, 18) : characters.slice(0, 8)
    const lines = picked.map(formatCharacterLine).filter(Boolean)
    if (lines.length) sections.push(`【人物设定】\n${lines.join('\n')}`)
  }

  // —— 扩展档案 ——
  const profilesPath = join(bookPath, 'entity_profiles.json')
  const profiles = safeReadJson(profilesPath, null)
  if (profiles && typeof profiles === 'object') {
    const entityLines = []
    for (const key of ENTITY_PROFILE_KEYS) {
      const list = Array.isArray(profiles[key]) ? profiles[key] : []
      if (!list.length) continue
      const label = ENTITY_SECTION_LABEL[key] || key
      const matched = list.filter((e) => nameMentionedInOutline(e?.name, blob))
      const picked = matched.length > 0 ? matched.slice(0, 8) : list.slice(0, 3)
      const body = picked.map(formatEntityLine).filter(Boolean).join('\n')
      if (body) entityLines.push(`${label}：\n${body}`)
    }
    if (entityLines.length) sections.push(`【扩展档案】\n${entityLines.join('\n\n')}`)
  }

  // —— 词条字典 ——
  const dict = safeReadJson(join(bookPath, 'dictionary.json'), [])
  const flatDict = flattenDictionary(dict, [])
  if (flatDict.length) {
    const matched = flatDict.filter((d) => nameMentionedInOutline(d.name, blob))
    const picked = matched.length > 0 ? matched.slice(0, 26) : flatDict.slice(0, 14)
    const lines = picked.map((d) => {
      const intro = truncate(d.introduction, 200)
      return intro ? `「${d.name}」：${intro}` : `「${d.name}」`
    })
    if (lines.length) sections.push(`【词条设定】\n${lines.join('\n')}`)
  }

  // —— 设定管理 ——
  const settings = safeReadJson(join(bookPath, 'settings.json'), null)
  const flatSettings = flattenSettings(settings)
  if (flatSettings.length) {
    const matched = flatSettings.filter((s) => settingMentionedInOutline(s, blob))
    const picked = matched.length > 0 ? matched.slice(0, 26) : flatSettings.slice(0, 14)
    const lines = picked.map(formatSettingLine)
    if (lines.length) sections.push(`【设定管理】\n${lines.join('\n')}`)
  }

  // —— 时间线 ——
  const timelines = safeReadJson(join(bookPath, 'timelines.json'), [])
  if (Array.isArray(timelines) && timelines.length) {
    const tlLines = []
    for (const col of timelines.slice(0, 6)) {
      const colTitle = truncate(String(col?.title || '时间线').trim(), 40)
      const nodes = Array.isArray(col?.nodes) ? col.nodes : []
      if (!nodes.length) continue
      const nodeStrs = nodes.slice(0, 24).map((n) => {
        const t = truncate(String(n?.title || '').trim(), 60)
        const d = truncate(String(n?.desc || '').trim(), 160)
        return d ? `- ${t}：${d}` : `- ${t}`
      })
      if (nodeStrs.length) tlLines.push(`${colTitle}\n${nodeStrs.join('\n')}`)
    }
    if (tlLines.length) sections.push(`【时间线摘要】\n${tlLines.join('\n\n')}`)
  }

  let block = sections.filter(Boolean).join('\n\n').trim()
  if (!block) return ''
  if (block.length > maxTotal) {
    block = `${truncate(block, maxTotal)}\n（设定内容已截断，写作时请以章纲与上文为准。）`
  }
  return block
}
