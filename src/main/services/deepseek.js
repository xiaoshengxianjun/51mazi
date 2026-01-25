/**
 * DeepSeek API 服务
 * 在主进程中处理所有 DeepSeek API 调用
 */

const DEEPSEEK_API_BASE = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat' // 或 'deepseek-reasoner' 用于推理任务

class DeepSeekService {
  constructor() {
    this.apiKey = null
    this.baseURL = DEEPSEEK_API_BASE
    // 请求频率限制：每分钟最多 10 次请求
    this.rateLimit = {
      maxRequests: 10, // 最大请求数
      windowMs: 60 * 1000, // 时间窗口（毫秒）
      requests: [] // 请求时间戳数组
    }
    // 正在进行的请求（防止重复调用）
    this.pendingRequests = new Map()
  }

  /**
   * 设置 API Key
   * @param {string} apiKey - DeepSeek API Key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey
  }

  /**
   * 获取 API Key（从 electron-store）
   */
  async getApiKey() {
    if (this.apiKey) return this.apiKey
    // 从 store 中读取（需要外部传入 store 实例）
    return null
  }

  /**
   * 初始化 API Key（从 store 中读取）
   * @param {Function} getStoreValue - 获取 store 值的函数
   */
  async initApiKey(getStoreValue) {
    if (!this.apiKey && getStoreValue) {
      this.apiKey = getStoreValue('deepseek.apiKey') || null
    }
    return this.apiKey
  }

  /**
   * 检查请求频率限制
   * @param {string} requestId - 请求唯一标识
   * @throws {Error} 如果超过频率限制
   */
  checkRateLimit(requestId) {
    const now = Date.now()
    const { maxRequests, windowMs, requests } = this.rateLimit

    // 清理过期的请求记录
    const validRequests = requests.filter((time) => now - time < windowMs)
    this.rateLimit.requests = validRequests

    // 检查是否超过限制
    if (validRequests.length >= maxRequests) {
      const oldestRequest = validRequests[0]
      const waitTime = Math.ceil((oldestRequest + windowMs - now) / 1000)
      throw new Error(
        `请求频率过高，请稍后再试。当前限制：每分钟 ${maxRequests} 次请求，还需等待约 ${waitTime} 秒`
      )
    }

    // 检查是否有相同请求正在进行
    if (this.pendingRequests.has(requestId)) {
      throw new Error('相同请求正在进行中，请勿重复提交')
    }

    // 记录本次请求
    this.rateLimit.requests.push(now)
    this.pendingRequests.set(requestId, now)
  }

  /**
   * 清除请求记录
   * @param {string} requestId - 请求唯一标识
   */
  clearRequest(requestId) {
    this.pendingRequests.delete(requestId)
  }

  /**
   * 生成请求唯一标识
   * @param {Object} options - 请求选项
   * @returns {string} 请求 ID
   */
  generateRequestId(options) {
    // 基于请求内容生成唯一 ID，相同内容的请求会被识别为重复
    const key = JSON.stringify({
      model: options.model,
      messages: options.messages?.map((m) => ({
        role: m.role,
        content: m.content?.substring(0, 50)
      }))
    })
    return `req_${key.substring(0, 50)}_${Date.now()}`
  }

  /**
   * 调用 DeepSeek Chat API
   * @param {Object} options - 请求选项
   * @param {Array} options.messages - 消息数组
   * @param {string} options.model - 模型名称，默认 'deepseek-chat'
   * @param {number} options.temperature - 温度参数，0-2，默认 0.7
   * @param {number} options.max_tokens - 最大 token 数
   * @param {boolean} options.stream - 是否流式输出，默认 false
   * @param {string} options.requestId - 请求唯一标识（可选，用于防重复）
   * @returns {Promise<Object>} API 响应
   */
  async chat(options = {}) {
    if (!this.apiKey) {
      throw new Error('DeepSeek API Key 未设置，请在设置中配置')
    }

    // 生成请求 ID
    const requestId = options.requestId || this.generateRequestId(options)

    // 检查频率限制（在 try 外，如果失败直接抛出，不记录为 pending）
    this.checkRateLimit(requestId)

    try {
      const {
        messages = [],
        model = DEFAULT_MODEL,
        temperature = 0.7,
        max_tokens = 2000,
        stream = false
      } = options

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          stream
        })
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: { message: response.statusText }
        }))

        // 针对不同状态码提供更友好的错误信息
        let errorMessage = error.error?.message || response.statusText

        if (response.status === 401) {
          errorMessage = 'API Key 无效或已过期，请检查 Key 是否正确'
        } else if (response.status === 402) {
          errorMessage =
            '账户余额不足，请前往 https://platform.deepseek.com/top_up 充值。如果是新用户，请先完成实名认证并领取免费额度。'
        } else if (response.status === 403) {
          errorMessage = 'API Key 无权限访问，请检查 Key 是否正确'
        } else if (response.status === 429) {
          errorMessage = '请求频率过高，请稍后再试'
        } else if (response.status >= 500) {
          errorMessage = 'DeepSeek 服务器错误，请稍后重试'
        } else if (!errorMessage || errorMessage === response.statusText) {
          errorMessage = `API 请求失败: ${response.status} ${response.statusText}`
        }

        throw new Error(errorMessage)
      }

      if (stream) {
        // 流式响应处理
        return this.handleStreamResponse(response)
      }

      const data = await response.json()
      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        usage: data.usage || {}
      }
    } catch (error) {
      console.error('DeepSeek API 调用失败:', error)
      // 如果是频率限制错误，不清除 pendingRequests（允许稍后重试）
      // 其他错误清除 pendingRequests
      if (!error.message?.includes('请求频率过高') && !error.message?.includes('正在进行中')) {
        this.clearRequest(requestId)
      }
      throw error
    } finally {
      // 只有在请求成功时才清除（失败时已在 catch 中处理）
      // 这里不做任何操作，避免重复清除
    }
  }

  /**
   * 处理流式响应
   * @param {Response} response - Fetch 响应对象
   * @returns {Promise<ReadableStream>} 流对象
   */
  async handleStreamResponse(response) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    return {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n').filter((line) => line.trim() !== '')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  return
                }
                try {
                  const json = JSON.parse(data)
                  const content = json.choices[0]?.delta?.content || ''
                  if (content) {
                    yield { content, done: false }
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
          yield { content: '', done: true }
        } finally {
          reader.releaseLock()
        }
      }
    }
  }

  /**
   * AI 随机起名
   * @param {Object} options - 起名选项
   * @param {string} options.type - 类型：'cn'|'jp'|'en'|'force'|'place'|'book'|'item'|'elixir'
   * @param {string} options.surname - 姓氏（可选）
   * @param {string} options.gender - 性别：'男'|'女'（可选）
   * @param {number} options.nameLength - 名字长度（可选）
   * @param {string} options.middleChar - 中间字（可选）
   * @param {number} options.count - 生成数量，默认 24
   * @returns {Promise<Array<string>>} 生成的名字列表
   */
  async generateNames(options = {}) {
    const {
      type = 'cn',
      surname = '',
      gender = '',
      nameLength = 3,
      middleChar = '',
      count = 24
    } = options

    // 构建提示词
    const typeMap = {
      cn: '中国人名',
      jp: '日本人名',
      en: '西方人名',
      force: '各方势力名称',
      place: '地名',
      book: '秘籍名称',
      item: '法宝名称',
      elixir: '灵药名称'
    }

    let prompt = `请生成${count}个${typeMap[type] || '名称'}，要求：\n`

    // 重要：所有名字必须使用中文，这是用于中文小说写作
    prompt += `- **重要：所有名字必须使用中文汉字，不能包含日文假名、英文字母或其他非中文字符**\n`

    if (type === 'cn' || type === 'jp' || type === 'en') {
      if (surname) prompt += `- 姓氏：${surname}\n`
      if (gender) prompt += `- 性别：${gender}\n`
      if (type === 'cn' && nameLength) {
        prompt += `- 名字长度：${nameLength}个字\n`
        if (middleChar) prompt += `- 中间字：${middleChar}\n`
      }

      if (type === 'jp') {
        // 日本人名要求使用中文音译
        prompt += `- 这是日本人名，但必须使用中文汉字音译（如：田中太郎、佐藤花子、铃木健一）\n`
        prompt += `- 不能使用日文假名（如：たなか、さとう），必须全部使用中文汉字\n`
      } else if (type === 'en') {
        // 西方人名要求使用中文音译
        prompt += `- 这是西方人名，但必须使用中文汉字音译（如：约翰·史密斯、玛丽·威廉姆斯、詹姆斯·布朗）\n`
        prompt += `- 不能使用英文字母，必须全部使用中文汉字，姓氏和名字之间用中文顿号"·"分隔\n`
      } else {
        prompt += `- 要求名称有创意、符合文化背景、朗朗上口\n`
      }
    } else {
      if (surname) prompt += `- 前缀或核心词：${surname}\n`
      prompt += `- 要求名称有创意、符合${typeMap[type]}的特点\n`
    }

    prompt += `\n请直接返回名称列表，每行一个名称，不要添加序号或其他说明。所有名字必须是纯中文。`

    const messages = [
      {
        role: 'system',
        content:
          '你是一个专业的起名助手，擅长生成各种类型的名称。重要：你生成的所有名字必须使用中文汉字，不能包含任何日文假名、英文字母或其他非中文字符。这是用于中文小说写作，所有人物名都必须是纯中文。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]

    // 为起名请求生成唯一 ID（基于参数）
    const requestId = `generateNames_${type}_${surname}_${gender}_${Date.now()}`
    const result = await this.chat({
      messages,
      temperature: 0.9, // 提高创造性
      max_tokens: 1000,
      requestId
    })

    // 解析返回的名称列表
    let names = result.content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.match(/^\d+[.、]/)) // 过滤序号
      .slice(0, count)

    // 过滤掉包含非中文字符的名字（确保只返回纯中文名字）
    names = names.filter((name) => {
      // 检查是否包含日文假名、英文字母等非中文字符
      // 允许：中文汉字、中文标点（如：·、-、'等）
      const hasNonChinese = /[a-zA-Z\u3040-\u309F\u30A0-\u30FF]/.test(name)
      return !hasNonChinese
    })

    return names.length > 0 ? names : []
  }

  /**
   * 检查 API Key 是否有效
   * @returns {Promise<{isValid: boolean, message?: string}>}
   */
  async validateApiKey() {
    const requestId = `validateApiKey_${Date.now()}`
    try {
      if (!this.apiKey) {
        return { isValid: false, message: 'API Key 未设置' }
      }

      // 发送一个简单的测试请求
      await this.chat({
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
        requestId
      })
      return { isValid: true }
    } catch (error) {
      // 返回详细的错误信息
      let errorMessage = '验证失败'
      if (error.message) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.toString()
      }

      // 处理常见的错误情况
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'API Key 无效或已过期，请检查 Key 是否正确'
      } else if (
        errorMessage.includes('402') ||
        errorMessage.includes('Payment Required') ||
        errorMessage.includes('Insufficient Balance') ||
        errorMessage.includes('余额不足')
      ) {
        errorMessage =
          '账户余额不足，请前往 https://platform.deepseek.com/top_up 充值。如果是新用户，请先完成实名认证并领取免费额度。'
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        errorMessage = 'API Key 无权限访问，请检查 Key 是否正确'
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorMessage = '请求频率过高，请稍后再试'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = '网络连接失败，请检查网络设置'
      }

      return { isValid: false, message: errorMessage }
    }
  }
}

// 导出单例
export default new DeepSeekService()
