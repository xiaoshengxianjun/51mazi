import deepseekService from './deepseek.js'

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function stripCodeFence(text) {
  const source = sanitizeText(text)
  if (!source) return ''
  return source.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

function extractJsonBlock(text) {
  const source = stripCodeFence(text)
  if (!source) return ''
  const firstObject = source.indexOf('{')
  const lastObject = source.lastIndexOf('}')
  if (firstObject !== -1 && lastObject > firstObject) {
    return source.slice(firstObject, lastObject + 1)
  }
  const firstArray = source.indexOf('[')
  const lastArray = source.lastIndexOf(']')
  if (firstArray !== -1 && lastArray > firstArray) {
    return source.slice(firstArray, lastArray + 1)
  }
  return source
}

function composeSplitItemContent(item) {
  const content = sanitizeText(item?.content)
  if (content) return content

  const sections = [
    ['概述', item?.summary],
    ['目标', item?.goals],
    ['冲突', item?.conflict],
    ['推进', item?.progression],
    ['结果/悬念', item?.resultHint]
  ]
    .map(([label, value]) => [label, sanitizeText(value)])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)

  return sections.join('\n')
}

function normalizeSplitItem(item, index) {
  const title = sanitizeText(item?.title) || `第${index + 1}段`
  const normalized = {
    title,
    content: composeSplitItemContent(item),
    summary: sanitizeText(item?.summary),
    goals: sanitizeText(item?.goals),
    conflict: sanitizeText(item?.conflict),
    progression: sanitizeText(item?.progression),
    resultHint: sanitizeText(item?.resultHint)
  }
  return normalized
}

function parseSplitResult(rawText) {
  const text = sanitizeText(rawText)
  if (!text) {
    return {
      items: [],
      parseError: 'AI 返回内容为空，请重试。'
    }
  }

  try {
    const candidate = extractJsonBlock(text)
    const parsed = JSON.parse(candidate)
    const itemsSource = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(itemsSource)) {
      throw new Error('缺少 items 数组')
    }

    const items = itemsSource
      .map((item, index) => normalizeSplitItem(item, index))
      .filter((item) => sanitizeText(item.title) && sanitizeText(item.content))

    if (!items.length) {
      throw new Error('未解析出有效子大纲')
    }

    return {
      items,
      parseError: ''
    }
  } catch (error) {
    return {
      items: [],
      parseError: error?.message || '结构化结果解析失败'
    }
  }
}

function buildRefineMessages({
  nodeTitle,
  sourceContent,
  previousDraft,
  userInstruction,
  mode = 'overall'
}) {
  const title = sanitizeText(nodeTitle) || '未命名大纲'
  const source = sanitizeText(sourceContent)
  const draft = sanitizeText(previousDraft)
  const instruction = sanitizeText(userInstruction)
  const hasPreviousDraft = Boolean(draft)

  const modePrompts = {
    details: '重点补充关键细节、因果、设定约束与可执行写作信息。',
    conflict: '重点强化冲突、阻力、反转、博弈与戏剧张力。',
    pacing: '重点优化信息释放节奏、层次递进与段落安排。',
    world: '重点补足人物动机、势力关系、世界规则与伏笔线索。',
    overall: '在不偏离原意的前提下，整体扩写并提升可写性。'
  }

  const taskGuide = hasPreviousDraft
    ? '请在“上一轮草稿”基础上继续修改，优先保留已经成熟的内容，仅调整用户明确提出的问题；若用户未提到的部分没有明显问题，请尽量保持稳定。'
    : '请基于用户原始大纲进行扩写完善，把简略想法补成可直接继续写作的大纲正文。'

  return [
    {
      role: 'system',
      content:
        '你是一名专业的中文长篇小说策划编辑，擅长把零散想法补全为可执行的大纲。请只输出最终的大纲正文，不要输出标题、说明、分析、分点解释或任何前后缀。'
    },
    {
      role: 'user',
      content: [
        `任务类型：${hasPreviousDraft ? '继续修改大纲草稿' : '完善大纲'}`,
        `当前节点标题：${title}`,
        `优化重点：${modePrompts[mode] || modePrompts.overall}`,
        `执行原则：${taskGuide}`,
        instruction ? `用户补充要求：${instruction}` : '用户补充要求：无',
        '',
        '原始大纲：',
        source || '（空）',
        hasPreviousDraft ? '' : '',
        hasPreviousDraft ? '上一轮草稿：' : '',
        hasPreviousDraft ? draft : '',
        '',
        '请直接输出本轮整理后的大纲正文。'
      ]
        .filter(Boolean)
        .join('\n')
    }
  ]
}

function buildSplitMessages({
  nodeTitle,
  sourceContent,
  previousDraft,
  userInstruction,
  mode = 'plot',
  count = 3
}) {
  const title = sanitizeText(nodeTitle) || '未命名大纲'
  const source = sanitizeText(sourceContent)
  const draft = sanitizeText(previousDraft)
  const instruction = sanitizeText(userInstruction)
  const splitCount = Number.isFinite(Number(count)) ? Math.max(2, Math.min(12, Number(count))) : 3
  const hasPreviousDraft = Boolean(draft)

  const splitModePrompts = {
    plot: '按剧情推进阶段拆分，强调起承转合与故事推进。',
    conflict: '按冲突升级拆分，强调阻力、反转、加码与阶段性结果。',
    timeline: '按时间顺序拆分，强调连续事件与前后因果。',
    chapter: '按章节策划拆分，每段都应像可直接写作的小章节。'
  }

  return [
    {
      role: 'system',
      content:
        '你是一名专业的中文长篇小说策划编辑。请把用户提供的大纲拆分为多个可独立写作的子大纲，并且只输出 JSON，不要输出 Markdown、解释、注释或代码块。JSON 格式必须是 {"items":[...]}。每个 item 必须包含 title、content、summary、goals、conflict、progression、resultHint 七个字符串字段。'
    },
    {
      role: 'user',
      content: [
        `任务类型：${hasPreviousDraft ? '继续调整拆分草稿' : '拆分并扩写大纲'}`,
        `当前节点标题：${title}`,
        `拆分模式：${splitModePrompts[mode] || splitModePrompts.plot}`,
        `目标段数：${splitCount}`,
        instruction ? `用户补充要求：${instruction}` : '用户补充要求：无',
        '',
        '原始大纲：',
        source || '（空）',
        hasPreviousDraft ? '' : '',
        hasPreviousDraft ? '上一轮拆分草稿（请在其基础上调整）：' : '',
        hasPreviousDraft ? draft : '',
        '',
        '输出要求：',
        `1. 严格输出 ${splitCount} 个 items，不能多也不能少。`,
        '2. 每个 item.title 要简洁清晰，适合作为子节点标题。',
        '3. 每个 item.content 要是一段可直接用于写作的大纲正文。',
        '4. 其余字段用于结构化表达：summary 概述、goals 目标、conflict 冲突、progression 推进、resultHint 结果或悬念。',
        '5. 所有字段必须为字符串，不能为空字符串。',
        '6. 只输出合法 JSON。'
      ].join('\n')
    }
  ]
}

class OutlineAiService {
  async refineOutline(payload = {}) {
    const sourceContent = sanitizeText(payload.sourceContent)
    if (!sourceContent) {
      throw new Error('当前大纲内容为空，无法完善')
    }

    const result = await deepseekService.chat({
      messages: buildRefineMessages(payload),
      temperature: 0.6,
      max_tokens: 5000,
      requestId: `outline_refine_${Date.now()}`
    })

    const content = sanitizeText(result.content)
    if (!content) {
      throw new Error('AI 返回结果为空，请重试')
    }

    return {
      content
    }
  }

  async splitOutline(payload = {}) {
    const sourceContent = sanitizeText(payload.sourceContent)
    if (!sourceContent) {
      throw new Error('当前大纲内容为空，无法拆分')
    }

    const result = await deepseekService.chat({
      messages: buildSplitMessages(payload),
      temperature: 0.4,
      max_tokens: 6000,
      requestId: `outline_split_${Date.now()}`
    })

    const rawText = sanitizeText(result.content)
    if (!rawText) {
      throw new Error('AI 返回结果为空，请重试')
    }

    const parsed = parseSplitResult(rawText)
    return {
      rawText,
      items: parsed.items,
      parseError: parsed.parseError
    }
  }

  async runTask(payload = {}) {
    const taskType = sanitizeText(payload.taskType)
    if (taskType === 'refine') {
      const result = await this.refineOutline(payload)
      return {
        taskType,
        ...result
      }
    }

    if (taskType === 'split') {
      const result = await this.splitOutline(payload)
      return {
        taskType,
        ...result
      }
    }

    throw new Error('不支持的 AI 大纲任务类型')
  }

  parseSplitResult(rawText) {
    return parseSplitResult(rawText)
  }
}

const outlineAiService = new OutlineAiService()

export default outlineAiService
