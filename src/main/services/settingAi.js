import deepseekService from './deepseek.js'

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildRefineSettingMessages({ settingName, sourceContent, userInstruction }) {
  const name = sanitizeText(settingName) || '未命名设定'
  const source = sanitizeText(sourceContent)
  const instruction = sanitizeText(userInstruction)

  return [
    {
      role: 'system',
      content:
        '你是一名资深中文小说设定编辑。请在不偏离原意的前提下完善设定内容，补齐逻辑、细节、约束与可写性。只输出最终设定正文，不要输出标题、说明、分析、分点标签、Markdown 或代码块。'
    },
    {
      role: 'user',
      content: [
        `设定名称：${name}`,
        instruction ? `完善要求：${instruction}` : '完善要求：无（请自行补足内容）',
        '',
        '原始设定内容：',
        source || '（空）',
        '',
        '请直接输出“完善后的设定正文”。'
      ].join('\n')
    }
  ]
}

class SettingAiService {
  async refineSetting(payload = {}) {
    const result = await deepseekService.chat({
      messages: buildRefineSettingMessages(payload),
      temperature: 0.6,
      max_tokens: 5000,
      requestId: `setting_refine_${Date.now()}`
    })

    const content = sanitizeText(result.content)
    if (!content) {
      throw new Error('AI 返回结果为空，请重试')
    }

    return {
      content
    }
  }
}

const settingAiService = new SettingAiService()

export default settingAiService
