import deepseekService from './deepseek.js'
import { buildBookWritingContextBlock } from './bookWritingContext.js'

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

class OutlineChapterAiService {
  async generateChapterFromOutline(payload = {}) {
    const outlineTitle = sanitizeText(payload.outlineTitle) || '未命名章纲'
    const outlineContent = sanitizeText(payload.outlineContent)
    const userRequirement = sanitizeText(payload.userRequirement)
    const targetWords = Number(payload.targetWords) || 2000
    const bookPath = typeof payload.bookPath === 'string' ? payload.bookPath.trim() : ''
    const previousChapterExcerpt = sanitizeText(payload.previousChapterExcerpt)

    if (!outlineContent) {
      throw new Error('章纲内容为空，无法生成章节')
    }

    const bookContextBlock = bookPath
      ? buildBookWritingContextBlock(bookPath, { outlineTitle, outlineContent })
      : ''

    const systemLines = [
      '你是一名专业中文网络小说作者。',
      '请根据用户提供的「本书设定摘要」「章纲」写出可发布的章节正文。',
      '写作时必须遵守：人物性格、称谓、功法/道具/势力名称、世界观细节应与「本书设定摘要」一致；不得编造与设定明显矛盾的内容。若章纲与设定冲突，以设定为准并自然化解到章纲意图。',
      '只输出正文，不要解释、不要章节标题行、不要前后缀说明。'
    ]

    const userParts = []

    if (bookContextBlock) {
      userParts.push('【本书设定摘要（写作约束，须严格遵守）】', bookContextBlock, '')
    }

    if (previousChapterExcerpt) {
      userParts.push(
        '【本卷承接参考（紧邻上一章正文节选，用于文风与人称衔接；若与章纲时间线不符，以章纲为准）】',
        previousChapterExcerpt,
        ''
      )
    }

    userParts.push(
      `章纲标题：${outlineTitle}`,
      `目标字数：约 ${Math.max(600, targetWords)} 字`,
      userRequirement ? `补充要求：${userRequirement}` : '补充要求：无',
      '',
      '章纲内容：',
      outlineContent,
      '',
      '写作要求：',
      '1. 必须完整覆盖章纲中的关键事件与冲突。',
      '2. 人物行为、对话风格与动机须与设定摘要中的人物档案一致。',
      '3. 叙事自然连贯，保持中文小说可读性，段落清晰。',
      '4. 仅输出章节正文，不要输出「以下是章节内容」等说明。'
    )

    const messages = [
      {
        role: 'system',
        content: systemLines.join('\n')
      },
      {
        role: 'user',
        content: userParts.join('\n')
      }
    ]

    const maxTokens = Math.min(8000, Math.max(1200, Math.ceil(targetWords * 2.2)))
    const result = await deepseekService.chat({
      messages,
      temperature: 0.62,
      max_tokens: maxTokens,
      requestId: `outline_chapter_${Date.now()}`
    })

    const content = sanitizeText(result.content)
    if (!content) {
      throw new Error('AI 返回章节内容为空，请重试')
    }

    return {
      content
    }
  }
}

const outlineChapterAiService = new OutlineChapterAiService()

export default outlineChapterAiService
