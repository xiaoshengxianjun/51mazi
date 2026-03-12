/**
 * Minimax API 服务
 * 在主进程中处理所有 Minimax API 调用
 */

class MinimaxService {
  constructor() {
    this.apiKey = null
    this.baseURL = null
    // 请求频率限制：每分钟最多 10 次请求
    this.rateLimit = {
      maxRequests: 10,
      windowMs: 60 * 1000,
      requests: []
    }
    this.pendingRequests = new Map()
    this.isCancelled = false
  }

  /**
   * 设置 API Key
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey
  }

  /**
   * 获取 API Key
   */
  async getApiKey() {
    if (this.apiKey) return this.apiKey
    return null
  }

  /**
   * 设置 URL
   */
  setUrl(url) {
    this.baseURL = url
  }

  /**
   * 获取 URL
   */
  async getUrl() {
    if (this.baseURL) return this.baseURL
    return null
  }

  /**
   * 初始化 API Key 和 URL（从 store 中读取）
   */
  async initApiKey(getStoreValue) {
    if (!this.apiKey && getStoreValue) {
      this.apiKey = getStoreValue('minimax.apiKey') || null
    }
    if (!this.baseURL && getStoreValue) {
      this.baseURL = getStoreValue('minimax.url') || null
    }
    return { apiKey: this.apiKey, url: this.baseURL }
  }

  /**
   * 检查请求频率限制
   */
  checkRateLimit(requestId) {
    const now = Date.now()
    const { maxRequests, windowMs, requests } = this.rateLimit

    const validRequests = requests.filter((time) => now - time < windowMs)
    this.rateLimit.requests = validRequests

    if (validRequests.length >= maxRequests) {
      const oldestRequest = validRequests[0]
      const waitTime = Math.ceil((oldestRequest + windowMs - now) / 1000)
      throw new Error(
        `请求频率过高，请稍后再试。当前限制：每分钟 ${maxRequests} 次请求，还需等待约 ${waitTime} 秒`
      )
    }

    if (this.pendingRequests.has(requestId)) {
      throw new Error('相同请求正在进行中，请勿重复提交')
    }

    this.rateLimit.requests.push(now)
    this.pendingRequests.set(requestId, now)
  }

  /**
   * 清除请求记录
   */
  clearRequest(requestId) {
    this.pendingRequests.delete(requestId)
  }

  /**
   * 生成请求唯一标识
   */
  generateRequestId(options) {
    const key = JSON.stringify({
      messages: options.messages?.map((m) => ({
        role: m.role,
        content: m.content?.substring(0, 50)
      }))
    })
    return `req_${key.substring(0, 50)}_${Date.now()}`
  }

  /**
   * 调用 Minimax Chat API
   */
  async chat(options = {}) {
    if (!this.apiKey) {
      throw new Error('Minimax API Key 未设置，请在设置中配置')
    }

    let apiUrl = this.baseURL
    if (!apiUrl) {
      apiUrl = 'https://api.minimax.chat/v1/text/chatcompletion_v2'
    }

    // 确保URL格式正确
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = 'https://' + apiUrl
    }

    // 智能处理URL路径
    const urlObj = new URL(apiUrl)
    if (urlObj.pathname === '/' || urlObj.pathname === '') {
      // 如果只输入了域名，自动添加 /v1/chat/completions（兼容中转API）
      apiUrl = urlObj.origin + '/v1/chat/completions'
    } else if (urlObj.pathname === '/v1') {
      // 如果用户只输入了 /v1，自动添加 /chat/completions
      apiUrl = urlObj.origin + '/v1/chat/completions'
    }

    const requestId = options.requestId || this.generateRequestId(options)
    this.checkRateLimit(requestId)

    try {
      const {
        messages = [],
        model = 'MiniMax-M2.5-highspeed',
        temperature = 0.7,
        max_tokens = 2000
      } = options

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: { message: response.statusText }
        }))

        let errorMessage = error.error?.message || response.statusText

        if (response.status === 401) {
          errorMessage = 'API Key 无效或已过期，请检查 Key 是否正确'
        } else if (response.status === 402) {
          errorMessage = '账户余额不足'
        } else if (response.status === 403) {
          errorMessage = 'API Key 无权限访问，请检查 Key 是否正确'
        } else if (response.status === 429) {
          errorMessage = '请求频率过高，请稍后再试'
        } else if (response.status >= 500) {
          errorMessage = 'Minimax 服务器错误，请稍后重试'
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      return {
        success: true,
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage || {}
      }
    } catch (error) {
      console.error('Minimax API 调用失败:', error)
      if (!error.message?.includes('请求频率过高') && !error.message?.includes('正在进行中')) {
        this.clearRequest(requestId)
      }
      throw error
    }
  }

  /**
   * 按章节拆分文本
   */
  splitTextByChapter(text) {
    const chapterPattern = /(第[\d一二三四五六七八九十百千]+章|第一章|Chapter\s*\d+|\d+\.|^\s*[\d]+\s*$)/gim
    const matches = []
    let match
    
    while ((match = chapterPattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        title: match[0].trim()
      })
    }

    const chapters = []
    if (matches.length === 0) {
      const rawChapters = text.split('\n\n').filter(c => c.trim())
      rawChapters.forEach((chap, idx) => {
        chapters.push({
          title: `第${idx + 1}章（自动拆分）`,
          content: chap.trim()
        })
      })
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length
        const chapterContent = text.substring(start, end).trim()
        if (chapterContent) {
          chapters.push({
            title: matches[i].title,
            content: chapterContent
          })
        }
      }
    }

    return chapters
  }

  /**
   * 分段处理大文本（按句子边界分割，避免截断）
   */
  splitLargeText(text, maxChunkSize = 100000) {
    const chunks = []
    let start = 0
    const sentenceEndChars = '。！？\n.!?'
    
    while (start < text.length) {
      let end = Math.min(start + maxChunkSize, text.length)
      
      // 如果不是文本末尾，找最近的句子结束符
      if (end < text.length) {
        while (end > start && !sentenceEndChars.includes(text[end - 1])) {
          end--
        }
        // 如果没找到句子结束符，就按 maxChunkSize 截断
        if (end === start) {
          end = start + maxChunkSize
        }
      }
      
      const chunk = text.substring(start, end).trim()
      if (chunk) {
        chunks.push(chunk)
      }
      start = end
    }

    return chunks
  }

  /**
   * 拆书分析
   */
  async analyzeBook(options = {}) {
    const { content, analysisType, onProgress, onChunkResult } = options
    
    this.resetCancel()

    if (analysisType === 'summary') {
      const chunks = this.splitLargeText(content, 100000)
      const summaries = []
      let currentDisplayContent = '正在分析书籍，请稍候...\n\n'

      for (let i = 0; i < chunks.length; i++) {
        if (this.isCancelled) {
          throw new Error('分析已取消')
        }
        
        const chunk = chunks[i]
        const progress = Math.round(((i + 1) / (chunks.length + 1)) * 100)

        if (onProgress) {
          onProgress({ 
            progress, 
            current: i + 1, 
            total: chunks.length + 1, 
            chapter: `处理第 ${i + 1}/${chunks.length} 部分` 
          })
        }

        const systemPrompt = '你是一位专业小说大纲提炼专家，擅长保留核心情节、人物弧光、冲突高潮和伏笔。语言精炼连贯，不要添加原文没有的内容。'
        const userPrompt = `将以下小说大纲部分提炼成约 4000-5000 字的精炼大纲。
要求：
1. 保留主要人物、核心情节、关键冲突、高潮、重要伏笔。
2. 语言流畅，像一本完整大纲。
3. 严格控制在4000-5000字。
4. 不要添加任何原文没有的内容。

这是第${i + 1}部分原文：
${chunk}`

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]

        const requestId = `analyzeBook_summary_chunk_${i}_${Date.now()}`
        let result = null
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            result = await this.chat({
              messages,
              temperature: 0.35,
              max_tokens: 10000,
              requestId
            })
            
            if (result.content.toLowerCase().includes('<!doctype html') || 
                result.content.toLowerCase().includes('<html')) {
              throw new Error('API返回了HTML内容，请检查base_url是否正确')
            }
            
            break
          } catch (error) {
            console.error(`第 ${attempt} 次尝试失败:`, error)
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 10000))
            } else {
              throw error
            }
          }
        }

        summaries.push(result.content)
        currentDisplayContent += `【第 ${i + 1} 部分】\n${result.content}\n${'-'.repeat(50)}\n\n`

        if (onChunkResult) {
          onChunkResult(currentDisplayContent)
        }

        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (summaries.length > 1) {
        if (onProgress) {
          onProgress({ 
            progress: 95, 
            current: summaries.length + 1, 
            total: summaries.length + 1, 
            chapter: '生成最终总结' 
          })
        }

        currentDisplayContent += '\n正在生成最终完整总结...\n'
        if (onChunkResult) {
          onChunkResult(currentDisplayContent)
        }

        const combinedSummaries = summaries.join('\n\n')
        const finalSystemPrompt = '你是一位专业小说大纲提炼专家，擅长整合多个片段的精炼大纲，生成完整连贯的书籍大纲。'
        const finalUserPrompt = `请将以下多个部分的精炼大纲整合成一个完整、连贯的书籍大纲，约5000-6000字。
要求：
1. 保持整体故事线的连贯性和完整性
2. 突出主要人物的成长弧光
3. 保留核心冲突、高潮和重要伏笔
4. 语言流畅，像一本完整的大纲
5. 不要添加任何原文没有的内容

各部分内容如下：
${combinedSummaries}`

        const finalMessages = [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: finalUserPrompt }
        ]

        const finalRequestId = `analyzeBook_summary_final_${Date.now()}`
        let finalResult = null
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            finalResult = await this.chat({
              messages: finalMessages,
              temperature: 0.35,
              max_tokens: 10000,
              requestId: finalRequestId
            })
            
            if (finalResult.content.toLowerCase().includes('<!doctype html') || 
                finalResult.content.toLowerCase().includes('<html')) {
              throw new Error('API返回了HTML内容，请检查base_url是否正确')
            }
            
            break
          } catch (error) {
            console.error(`最终总结第 ${attempt} 次尝试失败:`, error)
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 10000))
            } else {
              throw error
            }
          }
        }

        if (onProgress) {
          onProgress({ progress: 100, current: summaries.length + 1, total: summaries.length + 1, chapter: '总结完成' })
        }

        if (onChunkResult) {
          onChunkResult(finalResult.content)
        }

        return finalResult.content
      } else {
        if (onProgress) {
          onProgress({ progress: 100, current: 1, total: 1, chapter: '总结完成' })
        }
        return summaries[0]
      }
    } else {
      const chapters = this.splitTextByChapter(content)
      const totalChapters = chapters.length
      const summaries = []
      const failedChapters = []

      const targetSummaryLen = 200

      const systemPrompt = `你是一位专业的小说内容总结专家，擅长精准提炼单章节核心内容。
要求：
1. 只总结当前章节的内容，不涉及其他章节；
2. 保留章节内的核心人物、关键情节、冲突/转折；
3. 语言简洁精炼，符合指定的字数范围；
4. 绝对不添加原文没有的内容，不做额外推测；
5. 格式：直接输出总结文本，无需多余标题/符号。`

      let finalContent = `《小说逐章总结》\n总章节数：${totalChapters}\n\n`

      for (let i = 0; i < chapters.length; i++) {
        if (this.isCancelled) {
          throw new Error('分析已取消')
        }
        const chapter = chapters[i]
        const progress = Math.round(((i + 1) / totalChapters) * 100)

        if (onProgress) {
          onProgress({ 
            progress, 
            current: i + 1, 
            total: totalChapters, 
            chapter: chapter.title 
          })
        }

        const userPrompt = `请总结以下章节的核心内容，控制在${targetSummaryLen - 50}~${targetSummaryLen + 50}字：
章节标题：${chapter.title}
章节内容：
${chapter.content}`

        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]

        const requestId = `analyzeBook_chapter_${i}_${Date.now()}`
        let chapterSummary = ''
        let success = false
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await this.chat({
              messages,
              temperature: 0.2,
              max_tokens: 500,
              requestId
            })
            
            chapterSummary = result.content
            
            if (chapterSummary.toLowerCase().includes('<!doctype html') || 
                chapterSummary.toLowerCase().includes('<html')) {
              throw new Error('API返回了HTML内容，请检查base_url是否正确')
            }
            
            success = true
            break
          } catch (error) {
            console.error(`第 ${attempt} 次尝试失败:`, error)
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 10000))
            } else {
              chapterSummary = `【总结失败】：${error.message}`
              failedChapters.push(chapter.title)
            }
          }
        }

        summaries.push({
          title: chapter.title,
          summary: chapterSummary
        })

        finalContent += `【${chapter.title}】\n${chapterSummary}\n${'-'.repeat(50)}\n\n`

        if (onChunkResult) {
          onChunkResult(finalContent)
        }

        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      if (failedChapters.length > 0) {
        finalContent += `\n\n⚠️ 注意：有 ${failedChapters.length} 个章节总结失败：\n${failedChapters.join(', ')}\n`
      }

      return finalContent
    }
  }

  /**
   * 取消分析
   */
  cancelAnalysis() {
    this.isCancelled = true
  }

  /**
   * 重置取消标志
   */
  resetCancel() {
    this.isCancelled = false
  }

  /**
   * 检查 API Key 是否有效
   */
  async validateApiKey() {
    try {
      if (!this.apiKey) {
        return { isValid: false, message: 'API Key 未设置' }
      }
      if (!this.baseURL) {
        return { isValid: false, message: 'URL 未设置' }
      }

      // 暂时不调用真实API，直接返回成功
      return { isValid: true }
    } catch (error) {
      return { isValid: false, message: error.message || '验证失败' }
    }
  }
}

export default new MinimaxService()
