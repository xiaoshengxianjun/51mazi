/**
 * 通义万相 API 服务（文生图）
 * 在主进程中处理所有通义万相 API 调用，用于 AI 生成封面等
 * 参考：https://help.aliyun.com/zh/model-studio/text-to-image-v2-api-reference
 */

// 北京地域（默认），新加坡/弗吉尼亚需对应不同的 baseURL 与 API Key
const DASHSCOPE_API_BASE = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
const MODEL = 'wan2.6-t2i'

class TongyiwanxiangService {
  constructor() {
    this.apiKey = null
  }

  /**
   * 设置 API Key
   * @param {string} apiKey - 阿里云百炼 API Key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey
  }

  /**
   * 获取当前内存中的 API Key
   */
  getApiKey() {
    return this.apiKey
  }

  /**
   * 从 store 初始化 API Key
   * @param {Function} getStoreValue - 获取 store 值的函数，如 (key) => store.get(key)
   */
  async initApiKey(getStoreValue) {
    if (!this.apiKey && getStoreValue) {
      this.apiKey = getStoreValue('tongyiwanxiang.apiKey') || null
    }
    return this.apiKey
  }

  /**
   * 文生图：根据提示词生成图片，返回图片 URL（需在 24 小时内下载保存）
   * @param {Object} options
   * @param {string} options.prompt - 正向提示词，描述期望的封面内容/风格
   * @param {string} options.size - 分辨率，格式为 "宽*高"，如 "1280*1280"、"1200*1600"
   * @param {string} [options.negativePrompt=''] - 反向提示词，可选
   * @returns {Promise<string>} 图片 URL
   */
  async generateCover(options = {}) {
    if (!this.apiKey) {
      throw new Error('通义万相 API Key 未设置，请在设置中配置')
    }

    const { prompt, size = '1280*1280', negativePrompt = '' } = options

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('封面提示词不能为空')
    }

    const body = {
      model: MODEL,
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: prompt.trim() }]
          }
        ]
      },
      parameters: {
        prompt_extend: true,
        watermark: false,
        n: 1,
        negative_prompt: negativePrompt || '',
        size: String(size)
      }
    }

    const response = await fetch(DASHSCOPE_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    })

    const data = await response.json().catch(() => ({}))

    // 业务错误：有 code 表示请求已到达但被拒绝
    if (data.code) {
      const msg = this._formatErrorMessage(data.code, data.message)
      throw new Error(msg)
    }

    if (!response.ok) {
      const msg =
        data.message || `请求失败: ${response.status} ${response.statusText}`
      throw new Error(msg)
    }

    // 成功：output.choices[0].message.content[0].image
    const choices = data.output?.choices
    if (!Array.isArray(choices) || !choices[0]) {
      throw new Error('接口返回格式异常，未包含生成结果')
    }
    const content = choices[0].message?.content
    if (!Array.isArray(content) || !content[0]) {
      throw new Error('接口返回格式异常，未包含图片地址')
    }
    const imageUrl = content[0].image
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('接口未返回有效图片地址')
    }
    return imageUrl
  }

  /**
   * 将 API 错误码转成用户可读提示
   * @private
   */
  _formatErrorMessage(code, message) {
    const trimmed = (message || '').trim()
    const defaults = {
      InvalidApiKey: 'API Key 无效或未配置，请检查设置',
      InvalidParameter: trimmed || '请求参数有误',
      DataInspectionFailed: '内容未通过安全审核，请修改提示词后重试',
      IPInfringementSuspect: '内容涉嫌违规，请修改提示词后重试',
      Throttling: '请求过于频繁，请稍后再试',
      QuotaExhausted: '账户额度不足，请充值或等待额度恢复'
    }
    return defaults[code] || (trimmed || `请求失败: ${code}`)
  }

  /**
   * 校验 API Key 是否有效（可选：发一次最小请求做探活）
   * @returns {Promise<{isValid: boolean, message?: string}>}
   */
  async validateApiKey() {
    try {
      if (!this.apiKey) {
        return { isValid: false, message: 'API Key 未设置' }
      }
      // 仅检查是否已配置，不做真实请求以节省额度；若需真实校验可调 generateCover 再根据错误区分
      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        message: error?.message || '验证失败'
      }
    }
  }
}

export default new TongyiwanxiangService()
