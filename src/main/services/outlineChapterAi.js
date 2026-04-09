import deepseekService from './deepseek.js'

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

class OutlineChapterAiService {
  async generateChapterFromOutline(payload = {}) {
    const outlineTitle = sanitizeText(payload.outlineTitle) || '未命名章纲'
    const outlineContent = sanitizeText(payload.outlineContent)
    const userRequirement = sanitizeText(payload.userRequirement)
    const targetWords = Number(payload.targetWords) || 2000

    if (!outlineContent) {
      throw new Error('章纲内容为空，无法生成章节')
    }

    const messages = [
      {
        role: 'system',
        content:
          '你是一名专业中文网络小说作者。请根据章纲直接输出可发布的章节正文，只输出正文，不要解释、不要标题、不要前后缀。'
      },
      {
        role: 'user',
        content: [
          `章纲标题：${outlineTitle}`,
          `目标字数：约 ${Math.max(600, targetWords)} 字`,
          userRequirement ? `补充要求：${userRequirement}` : '补充要求：无',
          '',
          '章纲内容：',
          outlineContent,
          '',
          '写作要求：',
          '1. 必须完整覆盖章纲中的关键事件与冲突。',
          '2. 人物行为与动机要合理，叙事自然连贯。',
          '3. 保持中文小说可读性，段落清晰。',
          '4. 仅输出章节正文，不要输出“以下是章节内容”等说明。'
        ].join('\n')
      }
    ]

    const maxTokens = Math.min(8000, Math.max(1200, Math.ceil(targetWords * 2.2)))
    const result = await deepseekService.chat({
      messages,
      temperature: 0.75,
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
