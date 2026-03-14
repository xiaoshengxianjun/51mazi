/**
 * 小说下载服务（参考 so-novel 规则与思路，适配本项目技术栈）
 * 支持 GET/POST 搜索、多书源、正文广告过滤（filterTxt）
 */

import * as cheerio from 'cheerio'
import iconv from 'iconv-lite'

/** 请求时使用的 User-Agent 和头，降低被站点拦截概率 */
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** 请求超时时间（毫秒） */
const FETCH_TIMEOUT_MS = 25000

/**
 * 解析相对 URL 为绝对 URL
 */
function resolveUrl(baseUrl, href) {
  if (!href || typeof href !== 'string') return ''
  href = href.trim()
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  const base = baseUrl.replace(/\/[^/]*$/, '/')
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) {
    try {
      const u = new URL(baseUrl)
      return `${u.origin}${href}`
    } catch {
      return href
    }
  }
  return base + href
}

/**
 * 获取页面 HTML（支持 GET/POST、编码、超时）
 * @param {string} url
 * @param {string} [encoding]
 * @param {{ method?: string, body?: string, contentType?: string }} [options]
 */
async function fetchHtml(url, encoding = 'utf-8', options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  const headers = {
    'User-Agent': DEFAULT_UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  }

  const init = { signal: controller.signal, redirect: 'follow', headers }

  if (options.method === 'POST' && options.body != null) {
    init.method = 'POST'
    init.body = options.body
    init.headers['Content-Type'] = options.contentType || 'application/json; charset=utf-8'
  }

  try {
    const res = await fetch(url, init)
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
    const buf = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    if (encoding && encoding.toLowerCase() !== 'utf-8') {
      return iconv.decode(Buffer.from(bytes), encoding)
    }
    return new TextDecoder('utf-8').decode(bytes)
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请检查网络或稍后重试')
    }
    if (err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      throw new Error('无法连接书源，请检查网络或更换书源重试')
    }
    if (err.message && (err.message.includes('fetch') || err.message.includes('network'))) {
      throw new Error('网络异常，请检查网络后重试')
    }
    throw err
  }
}

/**
 * 将 so-novel 风格的 data 模板转为 POST 请求体
 * 模板如 {"searchkey": "%s"} 或 {searchkey: %s}，%s 替换为关键词（JSON 转义）
 */
function buildSearchBody(template, keyword) {
  const escaped = JSON.stringify(keyword)
  let body = template.replace(/%s/g, escaped)
  if (!/^\s*\{[\s\S]*\}\s*$/.test(body)) return JSON.stringify({ searchkey: keyword })
  const needQuoteKeys = !body.includes('":')
  if (needQuoteKeys) body = body.replace(/(\w+)(\s*):/g, '"$1"$2:')
  try {
    JSON.parse(body)
    return body
  } catch {
    return JSON.stringify({ searchkey: keyword })
  }
}

/**
 * 清洗正文：去标签、空白，并可按 filterTxt 正则过滤广告（so-novel 风格，多段用 | 分隔）
 */
function cleanContent(html, filterTxt) {
  if (!html || typeof html !== 'string') return ''
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, (m) => {
      const code = parseInt(m.slice(2, -1), 10)
      return code ? String.fromCharCode(code) : m
    })
  if (filterTxt && typeof filterTxt === 'string') {
    const patterns = filterTxt
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean)
    for (const p of patterns) {
      try {
        const re = new RegExp(p, 'g')
        text = text.replace(re, '')
      } catch {
        // 无效正则则跳过
      }
    }
  }
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

// ---------------------------------------------------------------------------
// 书源配置（参考 so-novel bundle/rules/main.json，支持 GET/POST 搜索）
// ---------------------------------------------------------------------------

const BOOK_SOURCES = [
  {
    id: 'xbiqugu',
    name: '香书小说',
    encoding: 'utf-8',
    searchMethod: 'post',
    searchUrl: 'http://www.xbiqugu.la/modules/article/waps.php',
    searchData: '{"searchkey": "%s"}',
    searchListSelector: '#checkform > table > tbody > tr',
    searchTitleSelector: 'td.even > a',
    searchAuthorSelector: 'td:nth-of-type(3)',
    searchBookUrlAttr: 'href',
    chapterListSelector: '#list > dl > dd > a',
    contentSelector: '#content',
    filterTxt:
      '一秒记住【文学巴士&nbsp;】，精彩无弹窗免费阅读！|(www.xbiquge.la 新笔趣阁)，高速全文字在线阅读！|天才一秒记住本站地址：.+。手机版阅读网址：m.|手机用户请浏览阅读，更优质的阅读体验。|天才壹秒記住.+，為您提供精彩小說閱讀。|\\(本章完\\)'
  },
  {
    id: 'shuhaige',
    name: '书海阁小说网',
    encoding: 'utf-8',
    searchMethod: 'post',
    searchUrl: 'https://www.shuhaige.net/search.html',
    searchData: '{"searchkey": "%s", "searchtype": "all"}',
    searchListSelector: '#sitembox > dl',
    searchTitleSelector: 'dd > h3 > a',
    searchAuthorSelector: 'dd:nth-child(3) > span:nth-child(1)',
    searchBookUrlAttr: 'href',
    chapterListSelector: 'dl > dt:nth-of-type(2) ~ dd > a',
    contentSelector: '#content',
    filterTxt:
      '本小章还未完，请点击下一页继续阅读后面精彩内容！|小主，这个章节后面还有哦，请点击下一页继续阅读，后面更精彩！|这章没有结束，请点击下一页继续阅读！|\\(本章完\\)'
  },
  {
    id: 'xbiquzw',
    name: '笔尖中文',
    encoding: 'utf-8',
    searchMethod: 'post',
    searchUrl: 'http://www.xbiquzw.net/modules/article/search.php',
    searchData: '{"searchkey": "%s"}',
    searchListSelector: '#wrapper > table > tbody > tr',
    searchTitleSelector: 'td:nth-child(1) > a',
    searchAuthorSelector: 'td:nth-child(3)',
    searchBookUrlAttr: 'href',
    chapterListSelector: '#list > dl > dd > a',
    contentSelector: '#content',
    filterTxt: '喜欢.+请大家收藏：.+|\\(本章完\\)'
  },
  {
    id: '22biqu',
    name: '笔趣阁22',
    encoding: 'utf-8',
    searchMethod: 'post',
    searchUrl: 'https://www.22biqu.com/ss/',
    searchData: '{"searchkey": "%s", "Submit": "搜索"}',
    searchListSelector: 'body > div.container > div > div > ul > li',
    searchTitleSelector: 'span.s2 > a',
    searchAuthorSelector: 'span.s4',
    searchBookUrlAttr: 'href',
    chapterListSelector: 'div:nth-child(4) > ul > li > a',
    contentSelector: '#content',
    filterTxt: '\\(本章完\\)'
  },
  {
    id: 'yeudusk',
    name: '阅读库',
    encoding: 'utf-8',
    searchMethod: 'get',
    searchUrl: (keyword) =>
      `http://www.yeudusk.com/modules/article/search.php?q=${encodeURIComponent(keyword)}`,
    searchListSelector: '#jieqi_page_contents > div > div:nth-child(2)',
    searchTitleSelector: 'div:nth-child(1) > span > a',
    searchAuthorSelector: 'div:nth-child(2) > span:nth-child(2)',
    searchBookUrlAttr: 'href',
    chapterListSelector: 'ul > li > a',
    contentSelector: '#clickeye_content',
    tocUrlPattern: 'http://www.yeudusk.com/html/0/%s/',
    filterTxt:
      '\\(阅读库\\s?www\\.yeudusk\\.com\\)|阅读库 www.yeudusk.comyeudusk www.yeudusk.com|《.+》阅读库全文字更新,牢记网址:www\\.yeudusk\\.com'
  },
  {
    id: 'ujxsw',
    name: '悠久小说网',
    encoding: 'utf-8',
    searchMethod: 'post',
    searchUrl: 'http://www.ujxsw.org/searchbooks.php',
    searchData: '{"searchkey": "%s"}',
    searchListSelector: '#main > div.shuku_list > div.shulist > ul',
    searchTitleSelector: 'li.three > a',
    searchAuthorSelector: 'li.four > a',
    searchBookUrlAttr: 'href',
    chapterListSelector: '#readerlist > ul > li > a',
    tocUrlPattern: 'http://www.ujxsw.org/read/%s/',
    contentSelector: '#mlfy_main_text > div.read-content',
    filterTxt:
      '【悠久小説網ωωω.ＵＪХＳw.ｎｅｔ】，免费小说无弹窗免费阅读！|《.*》悠久小说网全文字更新,牢记网址:www.ujxsw.org|1秒记住网：'
  },
  {
    id: 'biquge365',
    name: '笔趣阁365',
    encoding: 'utf-8',
    searchMethod: 'post',
    searchUrl: 'https://www.biquge365.net/s.php',
    searchData: '{"type": "articlename", "s": "%s"}',
    searchListSelector: 'body > div.menu > div > ul > li',
    searchTitleSelector: 'span.name > a',
    searchAuthorSelector: 'span.zuo > a',
    searchBookUrlAttr: 'href',
    chapterListSelector: 'body > div.menu > div.border > ul > li > a',
    tocUrlPattern: 'https://www.biquge365.net/newbook/%s/',
    contentSelector: '#txt',
    filterTxt: ''
  },
  {
    id: 'mcxs',
    name: '梦书中文',
    encoding: 'utf-8',
    searchMethod: 'post',
    searchUrl: 'http://www.mcxs.info/search.html',
    searchData: '{"name": "%s"}',
    searchListSelector: '.novelslist2 > ul > li',
    searchTitleSelector: 'span.s2.wid > a',
    searchAuthorSelector: 'span.s4.wid > a',
    searchBookUrlAttr: 'href',
    chapterListSelector: 'dl > dt:nth-of-type(2) ~ dd > a',
    contentSelector: '#content',
    filterTxt:
      '天才一秒记住本站地址：[.+] .+最快更新！无广告！|(.+)，高速全文字在线阅读！|一秒记住【.+】，精彩无弹窗免费阅读！|\\(本章完\\)'
  },
  {
    id: 'xbiquge',
    name: '新笔趣阁',
    encoding: 'utf-8',
    searchMethod: 'get',
    searchUrl: (keyword) => `https://www.xbiquge.la/search.php?q=${encodeURIComponent(keyword)}`,
    searchListSelector: 'table tbody tr',
    searchTitleSelector: 'td a',
    searchAuthorSelector: 'td:nth-child(3)',
    searchBookUrlAttr: 'href',
    chapterListSelector: '#list dd a',
    contentSelector: '#content',
    filterTxt: ''
  }
]

function getSource(sourceId) {
  const source = BOOK_SOURCES.find((s) => s.id === sourceId)
  if (!source) throw new Error(`未知书源: ${sourceId}`)
  return source
}

/**
 * 获取搜索请求 URL 或 POST 体（供 search 使用）
 */
function getSearchRequest(source, keyword) {
  const k = keyword.trim()
  if (source.searchMethod === 'post') {
    const body = buildSearchBody(source.searchData, k)
    return { url: source.searchUrl, method: 'POST', body }
  }
  const url =
    typeof source.searchUrl === 'function'
      ? source.searchUrl(k)
      : source.searchUrl.replace(/%s/g, encodeURIComponent(k))
  return { url, method: 'GET' }
}

/**
 * 搜索书名，返回书籍列表
 */
export async function search(keyword, sourceId) {
  if (!keyword || !String(keyword).trim()) return []
  const sid = sourceId || BOOK_SOURCES[0].id
  const source = getSource(sid)
  const req = getSearchRequest(source, keyword.trim())

  const html =
    req.method === 'POST'
      ? await fetchHtml(req.url, source.encoding, {
          method: 'POST',
          body: req.body,
          contentType: 'application/json; charset=utf-8'
        })
      : await fetchHtml(req.url, source.encoding)

  const $ = cheerio.load(html)
  const list = []
  $(source.searchListSelector).each((_, el) => {
    const $el = $(el)
    const $title = $el.find(source.searchTitleSelector).first()
    const title = $title.text().trim()
    const bookUrl = $title.attr(source.searchBookUrlAttr)
    if (!title || !bookUrl) return
    const author = $el.find(source.searchAuthorSelector).first().text().trim() || '未知'
    list.push({
      title,
      author,
      url: resolveUrl(req.url, bookUrl),
      sourceId: sid
    })
  })

  return list
}

/**
 * 获取书籍目录（章节列表）
 * 部分书源目录 URL 与书籍页不同，需用 tocUrlPattern + bookId
 */
export async function getChapterList(bookUrl, sourceId) {
  const source = getSource(sourceId)
  let tocUrl = bookUrl
  if (source.tocUrlPattern) {
    const match = bookUrl.match(/\/([^/]+)\/?$/)
    const bookId = match ? match[1].replace(/\.html?$/, '') : ''
    if (bookId) tocUrl = source.tocUrlPattern.replace(/%s/g, bookId)
  }
  const html = await fetchHtml(tocUrl, source.encoding)
  const $ = cheerio.load(html)
  const chapters = []
  const baseUrl = tocUrl.replace(/\/[^/]*$/, '/')
  $(source.chapterListSelector).each((_, el) => {
    const $a = $(el)
    const title = $a.text().trim()
    const href = $a.attr('href')
    if (!title || !href) return
    chapters.push({
      title,
      url: resolveUrl(baseUrl, href)
    })
  })
  return chapters
}

/**
 * 获取单章正文（含 filterTxt 过滤）
 */
export async function getChapterContent(chapterUrl, sourceId) {
  const source = getSource(sourceId)
  const html = await fetchHtml(chapterUrl, source.encoding)
  const $ = cheerio.load(html)
  const contentHtml = $(source.contentSelector).html() || ''
  return cleanContent(contentHtml, source.filterTxt)
}

export function getBookSources() {
  return BOOK_SOURCES.map((s) => ({ id: s.id, name: s.name }))
}

export default {
  search,
  getChapterList,
  getChapterContent,
  getBookSources
}
