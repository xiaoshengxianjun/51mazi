<template>
  <div class="user-guide">
    <!-- 顶部导航栏 -->
    <div class="top-navigation">
      <el-button class="back-button" type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        {{ t('userGuide.backHome') }}
      </el-button>
    </div>

    <div class="guide-header">
      <h1>{{ t('userGuide.title') }}</h1>
      <p class="subtitle">{{ t('userGuide.subtitle') }}</p>
    </div>

    <div class="guide-content">
      <div class="guide-layout">
        <!-- 目录（大屏侧边栏 / 小屏顶部） -->
        <aside class="guide-toc">
          <div class="toc-card">
            <div class="toc-title">{{ t('userGuide.tocTitle') }}</div>
            <div class="toc-list">
              <button
                v-for="item in tocItems"
                :key="item.id"
                type="button"
                class="toc-item"
                :class="{ active: activeTocId === item.id }"
                @click="scrollToSection(item.id)"
              >
                <span class="toc-icon">{{ item.icon }}</span>
                <span class="toc-text">{{ item.title }}</span>
              </button>
            </div>
          </div>
        </aside>

        <div class="guide-main">
          <section
            v-for="section in guideSections"
            :id="section.id"
            :key="section.id"
            class="guide-section"
          >
            <h2>{{ section.icon }} {{ section.title }}</h2>

            <div v-for="card in section.cards" :key="card.title" class="guide-card">
              <h3>{{ card.title }}</h3>
              <p v-for="paragraph in card.paragraphs || []" :key="paragraph">{{ paragraph }}</p>

              <ul v-if="card.listType === 'ul'">
                <li v-for="item in card.items || []" :key="item">{{ item }}</li>
              </ul>
              <ol v-else-if="card.listType === 'ol'">
                <li v-for="item in card.items || []" :key="item">{{ item }}</li>
              </ol>

              <div v-if="card.entry" class="entry">
                <strong>{{ labels.entry }}：</strong>{{ card.entry }}
              </div>
              <div v-if="card.tip" class="tip">
                <strong>{{ labels.tip }}：</strong>{{ card.tip }}
              </div>

              <div v-if="card.shortcuts?.length" class="shortcut-grid">
                <div v-for="shortcut in card.shortcuts" :key="shortcut.key" class="shortcut-item">
                  <kbd>{{ shortcut.key }}</kbd>
                  <span>{{ shortcut.action }}</span>
                </div>
              </div>
            </div>
          </section>

          <section id="support" class="guide-section">
            <h2>📞 {{ supportContent.title }}</h2>
            <div class="guide-card">
              <p v-for="paragraph in supportContent.paragraphs" :key="paragraph">{{ paragraph }}</p>
              <div class="support-grid">
                <div class="support-item">
                  <div class="support-title">{{ supportContent.emailTitle }}</div>
                  <a class="support-link" :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
                </div>
                <div class="support-item">
                  <div class="support-title">{{ supportContent.siteTitle }}</div>
                  <a
                    class="support-link"
                    :href="officialWebsite"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ officialWebsite }}
                  </a>
                </div>
                <div class="support-item">
                  <div class="support-title">{{ supportContent.qqTitle }}</div>
                  <div class="support-qrcode">
                    <img :src="qqGroupQrcode" :alt="supportContent.qqAlt" />
                    <div class="support-qrcode-tip">{{ supportContent.qqTip }}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div class="guide-footer">
      <el-button type="primary" @click="goBack">{{ t('userGuide.backHome') }}</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t, locale } = useI18n()

const goBack = () => {
  router.push('/')
}

const contactEmail = 'fomazi@163.com'
const qqGroupQrcode = new URL('../../../../static/QQQRCode.png', import.meta.url).href
const officialWebsite = 'https://www.51mazi.com'

const labels = computed(() =>
  locale.value === 'en-US' ? { entry: 'Entry', tip: 'Tip' } : { entry: '入口', tip: '提示' }
)

const guideData = {
  'zh-CN': {
    quickStart: [
      {
        title: '0. 选择书籍目录（很重要）',
        paragraphs: [
          '所有书籍数据都会存储在你选择的本地目录中。建议优先确定一个稳定且便于备份的位置。'
        ],
        entry: '首页左侧菜单「系统设置」→ 选择书籍主目录',
        tip: '建议定期备份该目录。'
      },
      {
        title: '1. 创建新书',
        paragraphs: ['点击首页「新建书籍」，填写书名与类型即可开始写作。']
      },
      {
        title: '2. 管理章节',
        paragraphs: ['在编辑器左侧「正文」章节树中可完成章节管理：'],
        listType: 'ul',
        items: ['创建新章节（自动编号）', '重命名 / 删除章节', '卷排序与重新格式化']
      },
      {
        title: '3. 使用写作助手',
        paragraphs: [
          '进入书籍后，可通过右侧「写作助手」快速进入地图、人物谱、关系图、时间线、词典、禁词等工具。'
        ]
      }
    ],
    core: [
      {
        title: '📝 智能编辑器',
        listType: 'ul',
        items: [
          '富文本编辑、自动保存、搜索替换',
          '实时统计：章节字数、码字速度、净增字数',
          '个性化设置：字体、字号、行高、全局加粗/倾斜',
          '笔记模式、人物高亮、禁词提示、段落拖拽'
        ]
      },
      {
        title: '📚 章节管理',
        listType: 'ul',
        items: [
          '自动编号（第1章、第2章…）',
          '支持后缀类型（章/集/回/节/部/卷）',
          '重命名、排序、批量重新格式化'
        ]
      },
      {
        title: '🔐 密码保护',
        listType: 'ul',
        items: ['书籍密码：进入单本书时验证', '书架密码：进入书架统一验证'],
        entry: '首页左侧菜单「书架密码」/ 新建或编辑书籍时填写书籍密码'
      }
    ],
    ai: [
      {
        title: '⚙️ AI 设置',
        listType: 'ul',
        items: [
          'DeepSeek：起名、润色、续写、场景图提炼',
          '图像 AI：通义万相、Gemini Imagen、豆包（火山方舟），用于封面 / 人物图 / 场景图',
          '支持一键验证 API Key'
        ],
        entry: '首页左侧菜单「AI 设置」'
      },
      {
        title: '✍️ AI 润色 / 续写 / 场景图',
        paragraphs: [
          '章节页右上角可直接使用 AI 工具，对选中文本润色、按上下文续写，或生成场景图。'
        ],
        tip: '使用前请先验证 API Key 与网络可用性。'
      },
      {
        title: '🎨 AI 封面与人物图',
        paragraphs: ['支持多图候选、标签预设、确认使用流程，生成结果会保存到当前书籍目录。']
      }
    ],
    advanced: [
      {
        title: '👥 人物谱 / 关系图 / 组织架构',
        paragraphs: ['用结构化方式维护角色资料、关系网络与组织层级，避免剧情推进后设定混乱。']
      },
      {
        title: '🗺️ 地图 / 时间线 / 事序图',
        paragraphs: ['用于管理世界观空间信息与时间顺序，特别适合长篇或多线叙事。']
      },
      {
        title: '📖 词典与笔记',
        paragraphs: ['词典用于术语一致性，笔记用于大纲与灵感整理，支持层级缩进与拖拽排序。']
      }
    ],
    tips: [
      {
        title: '💡 推荐工作流',
        listType: 'ol',
        items: [
          '先搭设定（人物、关系、地图、时间线）',
          '再按章节创作并结合实时统计推进',
          '关键段落使用 AI 辅助打磨',
          '定期回顾并用搜索替换统一修订'
        ]
      },
      {
        title: '💾 数据安全',
        listType: 'ul',
        items: ['自动保存 + 本地存储', '定期备份书籍目录', '必要时导出章节', '可叠加密码保护']
      }
    ],
    shortcuts: [
      {
        title: '编辑器快捷键',
        shortcuts: [
          { key: 'Ctrl/Cmd + B', action: '粗体' },
          { key: 'Ctrl/Cmd + I', action: '斜体' },
          { key: 'Ctrl/Cmd + F', action: '搜索' },
          { key: 'Ctrl/Cmd + S', action: '保存' },
          { key: 'Ctrl/Cmd + Z', action: '撤销' },
          { key: 'Ctrl/Cmd + Y', action: '重做' }
        ]
      }
    ],
    updates: [
      {
        title: '检查更新 / 下载更新 / 安装更新',
        listType: 'ul',
        items: ['检查更新获取版本信息', '下载更新包并查看进度', '下载完成后安装并重启'],
        entry: '首页左侧菜单「检查更新」',
        tip: '若自动更新失败，可前往 Release 页面手动下载安装包覆盖安装。'
      }
    ],
    faq: [
      {
        title: 'Q: 如何修改章节名称格式？',
        paragraphs: ['A: 在章节设置中调整后缀类型并可一键重新格式化编号。']
      },
      {
        title: 'Q: 人物高亮如何使用？',
        paragraphs: ['A: 在章节页开启「人物高亮」后，系统会自动按人物谱标记色高亮匹配名称。']
      },
      {
        title: 'Q: AI 功能无法使用怎么办？',
        paragraphs: ['A: 先检查 AI 设置中的 Key 与验证状态，再确认网络与服务可访问。']
      },
      { title: 'Q: 如何备份作品？', paragraphs: ['A: 备份整个书籍目录即可，建议定期备份。'] }
    ],
    support: {
      title: '联系支持',
      paragraphs: [
        '如遇问题或有功能建议，欢迎反馈。',
        '我们会持续完善 51码字，为创作提供更稳定高效的支持。'
      ],
      emailTitle: '邮箱（问题反馈 / 商务合作）',
      siteTitle: '官网（宣传网站）',
      qqTitle: 'QQ 群（交流反馈）',
      qqAlt: '51码字 QQ 群二维码',
      qqTip: '扫码加入 QQ 群'
    }
  },
  'en-US': {
    quickStart: [
      {
        title: '0. Choose Book Directory (Important)',
        paragraphs: [
          'All book data is stored in your local directory. Choose a stable location first.'
        ],
        entry: 'Home sidebar → System Settings → Select Book Root Directory',
        tip: 'Back up this folder regularly.'
      },
      {
        title: '1. Create a New Book',
        paragraphs: ['Click "New Book" on Home and fill in title/type to start writing.']
      },
      {
        title: '2. Manage Chapters',
        paragraphs: ['Use the chapter tree on the left of editor:'],
        listType: 'ul',
        items: [
          'Create chapters with automatic numbering',
          'Rename or delete chapters',
          'Sort volumes and reformat numbering'
        ]
      },
      {
        title: '3. Use Writing Assistant',
        paragraphs: [
          'Open map, character profile, relationship graph, timeline, dictionary and other tools from the right panel.'
        ]
      }
    ],
    core: [
      {
        title: '📝 Smart Editor',
        listType: 'ul',
        items: [
          'Rich text editing, auto-save, search & replace',
          'Real-time stats: chapter words, typing speed, net growth',
          'Personal settings: font, size, line height, global bold/italic',
          'Note mode, character highlight, banned-word hint, paragraph drag-and-drop'
        ]
      },
      {
        title: '📚 Chapter Management',
        listType: 'ul',
        items: [
          'Auto numbering (Chapter 1, Chapter 2...)',
          'Custom suffix type',
          'Rename, reorder and reformat'
        ]
      },
      {
        title: '🔐 Password Protection',
        listType: 'ul',
        items: ['Book password for a single book', 'Bookshelf password for entry protection'],
        entry: 'Home sidebar → Bookshelf Password / Book form password field'
      }
    ],
    ai: [
      {
        title: '⚙️ AI Settings',
        listType: 'ul',
        items: [
          'DeepSeek: naming, polishing, continuation, scene prompt refinement',
          'Image AI: Tongyi Wanxiang, Gemini Imagen, or Doubao (Volcano Ark) for cover / character / scene images',
          'One-click API key verification'
        ],
        entry: 'Home sidebar → AI Settings'
      },
      {
        title: '✍️ AI Polish / Continue / Scene Image',
        paragraphs: [
          'Use AI tools in chapter editor to polish selected text, continue writing, or generate scene references.'
        ],
        tip: 'Verify API keys and network availability first.'
      },
      {
        title: '🎨 AI Cover & Character Image',
        paragraphs: [
          'Generate multiple candidates, compare and confirm one result. Files are saved in the current book directory.'
        ]
      }
    ],
    advanced: [
      {
        title: '👥 Character / Relationship / Organization',
        paragraphs: ['Maintain structured profile data to keep long stories consistent.']
      },
      {
        title: '🗺️ Map / Timeline / Event Sequence',
        paragraphs: ['Manage world-space and time progression for multi-thread narratives.']
      },
      {
        title: '📖 Dictionary & Notes',
        paragraphs: [
          'Keep terminology consistent and organize outlines/ideas with hierarchical notes.'
        ]
      }
    ],
    tips: [
      {
        title: '💡 Suggested Workflow',
        listType: 'ol',
        items: [
          'Build settings first (characters, relations, map, timeline)',
          'Write by chapters with real-time metrics',
          'Use AI tools for key paragraph polishing',
          'Review regularly with search & replace'
        ]
      },
      {
        title: '💾 Data Safety',
        listType: 'ul',
        items: [
          'Auto-save + local storage',
          'Regular folder backup',
          'Optional chapter export',
          'Extra password protection when needed'
        ]
      }
    ],
    shortcuts: [
      {
        title: 'Editor Shortcuts',
        shortcuts: [
          { key: 'Ctrl/Cmd + B', action: 'Bold' },
          { key: 'Ctrl/Cmd + I', action: 'Italic' },
          { key: 'Ctrl/Cmd + F', action: 'Search' },
          { key: 'Ctrl/Cmd + S', action: 'Save' },
          { key: 'Ctrl/Cmd + Z', action: 'Undo' },
          { key: 'Ctrl/Cmd + Y', action: 'Redo' }
        ]
      }
    ],
    updates: [
      {
        title: 'Check / Download / Install Updates',
        listType: 'ul',
        items: [
          'Check latest version info',
          'Download update package',
          'Install and restart when download finishes'
        ],
        entry: 'Home sidebar → Check Updates',
        tip: 'If auto-update fails, download the latest installer from the Release page manually.'
      }
    ],
    faq: [
      {
        title: 'Q: How to change chapter title format?',
        paragraphs: ['A: Change suffix type in chapter settings and reformat numbering.']
      },
      {
        title: 'Q: How does character highlight work?',
        paragraphs: [
          'A: Enable character highlight in chapter editor; matching names are highlighted with profile colors.'
        ]
      },
      {
        title: 'Q: What if AI features fail?',
        paragraphs: ['A: Verify API keys in AI Settings and check network/service availability.']
      },
      {
        title: 'Q: How do I back up my work?',
        paragraphs: ['A: Back up the whole book directory regularly.']
      }
    ],
    support: {
      title: 'Support',
      paragraphs: [
        'If you run into issues or have feature suggestions, feel free to contact us.',
        'We continuously improve 51mazi to support your writing workflow.'
      ],
      emailTitle: 'Email (Issue / Cooperation)',
      siteTitle: 'Official Website',
      qqTitle: 'QQ Group',
      qqAlt: '51mazi QQ group QR code',
      qqTip: 'Scan to join QQ group'
    }
  }
}

const localeCode = computed(() => (locale.value === 'en-US' ? 'en-US' : 'zh-CN'))
const content = computed(() => guideData[localeCode.value])

const guideSections = computed(() => [
  {
    id: 'quick-start',
    icon: '🚀',
    title: t('userGuide.tocQuickStart'),
    cards: content.value.quickStart
  },
  { id: 'core', icon: '✨', title: t('userGuide.tocCore'), cards: content.value.core },
  { id: 'ai', icon: '🤖', title: t('userGuide.tocAI'), cards: content.value.ai },
  { id: 'advanced', icon: '🎯', title: t('userGuide.tocAdvanced'), cards: content.value.advanced },
  { id: 'tips', icon: '💡', title: t('userGuide.tocTips'), cards: content.value.tips },
  {
    id: 'shortcuts',
    icon: '⌨️',
    title: t('userGuide.tocShortcuts'),
    cards: content.value.shortcuts
  },
  { id: 'updates', icon: '🔄', title: t('userGuide.tocUpdates'), cards: content.value.updates },
  { id: 'faq', icon: '❓', title: t('userGuide.tocFAQ'), cards: content.value.faq }
])

const supportContent = computed(() => content.value.support)

const tocItems = computed(() => [
  { id: 'quick-start', title: t('userGuide.tocQuickStart'), icon: '🚀' },
  { id: 'core', title: t('userGuide.tocCore'), icon: '✨' },
  { id: 'ai', title: t('userGuide.tocAI'), icon: '🤖' },
  { id: 'advanced', title: t('userGuide.tocAdvanced'), icon: '🎯' },
  { id: 'tips', title: t('userGuide.tocTips'), icon: '💡' },
  { id: 'shortcuts', title: t('userGuide.tocShortcuts'), icon: '⌨️' },
  { id: 'updates', title: t('userGuide.tocUpdates'), icon: '🔄' },
  { id: 'faq', title: t('userGuide.tocFAQ'), icon: '❓' },
  { id: 'support', title: t('userGuide.tocSupport'), icon: '📞' }
])

const activeTocId = ref('quick-start')

function scrollToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let tocObserver = null

onMounted(() => {
  const targets = tocItems.value.map((item) => document.getElementById(item.id)).filter(Boolean)
  if (targets.length === 0) return

  tocObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length > 0) activeTocId.value = visible[0].target.id
    },
    {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    }
  )
  targets.forEach((el) => tocObserver.observe(el))
})

onBeforeUnmount(() => {
  if (tocObserver) {
    tocObserver.disconnect()
    tocObserver = null
  }
})
</script>

<style lang="scss" scoped>
.user-guide {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #ffffff;
  min-height: 100vh;
}

.top-navigation {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 0px 0 16px 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #e9ecef;

  .back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
  }
}

.guide-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 0;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 16px;
  color: white;

  h1 {
    font-size: 2.5rem;
    margin: 0 0 16px 0;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.2rem;
    margin: 0;
    opacity: 0.9;
  }
}

.guide-content {
  margin-bottom: 40px;
}

.guide-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  align-items: start;
}

.guide-toc {
  position: sticky;
  top: 84px; // 顶部导航栏 + 间距
  align-self: start;
}

.toc-card {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.toc-title {
  font-size: 14px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 12px;
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toc-item {
  width: 100%;
  border: 1px solid transparent;
  background: #f8f9fa;
  color: #34495e;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #6366f1;
    background: #eef2ff;
  }

  &.active {
    border-color: #6366f1;
    background: #e0e7ff;
    color: #3730a3;
    font-weight: 600;
  }
}

.toc-icon {
  width: 18px;
  text-align: center;
}

.toc-text {
  font-size: 13px;
}

.guide-section {
  margin-bottom: 40px;

  h2 {
    font-size: 1.8rem;
    color: #2c3e50;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 3px solid #6366f1;
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.guide-card {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  h3 {
    font-size: 1.3rem;
    color: #2c3e50;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  p {
    color: #34495e;
    line-height: 1.6;
    margin: 0 0 16px 0;
  }

  ul,
  ol {
    color: #34495e;
    line-height: 1.6;
    margin: 0 0 16px 0;
    padding-left: 20px;

    li {
      margin-bottom: 8px;
    }
  }

  .tip {
    background: #e0e7ff;
    border: 1px solid #6366f1;
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;

    strong {
      color: #6366f1;
    }
  }

  .entry {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px dashed #c7d2fe;
    color: #34495e;

    strong {
      color: #4f46e5;
    }
  }

  code {
    background: #f8f9fa;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    color: #2c3e50;
  }
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #e9ecef;
  border-radius: 8px;

  kbd {
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 4px 8px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    color: #2c3e50;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  span {
    color: #34495e;
    font-weight: 500;
  }
}

.guide-footer {
  text-align: center;
  padding: 40px 0;
  border-top: 1px solid #e9ecef;
}

// 响应式设计
@media (max-width: 768px) {
  .user-guide {
    padding: 16px;
  }

  .guide-layout {
    grid-template-columns: 1fr;
  }

  .guide-toc {
    position: static;
    top: auto;
  }

  .toc-list {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .toc-item {
    width: auto;
    padding: 8px 10px;
  }

  .top-navigation {
    padding: 12px 0;
    margin-bottom: 16px;

    .back-button {
      font-size: 14px;
      padding: 8px 16px;
    }
  }

  .guide-header {
    padding: 24px 0;

    h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }
  }

  .guide-section h2 {
    font-size: 1.5rem;
  }

  .guide-card {
    padding: 16px;
  }

  .shortcut-grid {
    grid-template-columns: 1fr;
  }
}

.support-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.support-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
}

.support-title {
  font-size: 14px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 10px;
}

.support-link {
  color: #4f46e5;
  text-decoration: none;
  font-weight: 600;
  word-break: break-all;
}

.support-link:hover {
  text-decoration: underline;
}

.support-qrcode {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;

  img {
    width: 180px;
    height: auto;
    border-radius: 10px;
    border: 1px solid #e9ecef;
    background: #ffffff;
  }
}

.support-qrcode-tip {
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 768px) {
  .support-grid {
    grid-template-columns: 1fr;
  }
}
</style>
