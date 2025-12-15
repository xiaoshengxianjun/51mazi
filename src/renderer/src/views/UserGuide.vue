<template>
  <div class="user-guide">
    <!-- 顶部导航栏 -->
    <div class="top-navigation">
      <el-button class="back-button" type="primary" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回首页
      </el-button>
    </div>

    <div class="guide-header">
      <h1>51码字 - 写作指南</h1>
      <p class="subtitle">专业的网络小说创作工具，助你轻松创作精彩故事</p>
    </div>

    <div class="guide-content">
      <!-- 快速开始 -->
      <section class="guide-section">
        <h2>🚀 快速开始</h2>
        <div class="guide-card">
          <h3>1. 创建新书</h3>
          <p>在首页点击"新建书籍"按钮，输入书名即可开始创作之旅。</p>
          <div class="tip"><strong>提示：</strong>建议使用简洁明了的书名，便于后续管理。</div>
        </div>

        <div class="guide-card">
          <h3>2. 管理章节</h3>
          <p>在左侧章节树中，你可以：</p>
          <ul>
            <li>创建新章节（自动编号）</li>
            <li>重命名章节</li>
            <li>删除不需要的章节</li>
            <li>调整章节顺序</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>3. 开始写作</h3>
          <p>点击任意章节即可进入编辑器，开始你的创作。</p>
        </div>
      </section>

      <!-- 核心功能 -->
      <section class="guide-section">
        <h2>✨ 核心功能</h2>

        <div class="guide-card">
          <h3>📝 智能编辑器</h3>
          <p>基于 Tiptap 的现代化编辑器，支持：</p>
          <ul>
            <li><strong>富文本编辑：</strong>粗体、斜体、高亮等格式</li>
            <li><strong>实时统计：</strong>字数统计、码字速度、净增字数</li>
            <li><strong>自动保存：</strong>无需担心内容丢失</li>
            <li><strong>搜索替换：</strong>快速查找和修改内容</li>
            <li><strong>个性化设置：</strong>字体、字号、行高自定义，全局加粗/倾斜模式</li>
            <li><strong>笔记模式：</strong>支持大纲式笔记编辑，层级缩进管理</li>
            <li><strong>人物高亮：</strong>自动高亮章节中的人物名称，使用人物谱标签色</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>🔍 搜索与替换</h3>
          <p>强大的搜索功能：</p>
          <ul>
            <li>快捷键：<code>Ctrl+F</code>（Windows）或 <code>Cmd+F</code>（Mac）</li>
            <li>支持大小写匹配、全字匹配、正则表达式</li>
            <li>批量替换功能，提高修改效率</li>
            <li>搜索结果高亮显示</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>📚 章节管理</h3>
          <p>灵活的章节管理：</p>
          <ul>
            <li>自动章节编号（第1章、第2章...）</li>
            <li>自定义后缀类型（章、集、回、节、部、卷）</li>
            <li>章节重命名和重新格式化</li>
            <li>树形结构，清晰展示章节层次</li>
          </ul>
        </div>
      </section>

      <!-- 高级功能 -->
      <section class="guide-section">
        <h2>🎯 高级功能</h2>

        <div class="guide-card">
          <h3>👥 人物谱管理</h3>
          <p>创建和管理你的角色：</p>
          <ul>
            <li><strong>详细信息：</strong>姓名、年龄、性别、身高、形象介绍、生平介绍</li>
            <li><strong>头像设置：</strong>支持本地图片或网络图片作为人物头像</li>
            <li><strong>标签管理：</strong>为人物添加标签，便于分类管理</li>
            <li><strong>标记色：</strong>为每个人物设置专属标记色，用于高亮显示</li>
            <li><strong>人物高亮：</strong>在章节编辑时开启人物高亮，自动高亮匹配的人物名称</li>
            <li><strong>视图模式：</strong>支持卡片模式和表格模式两种查看方式</li>
            <li><strong>角色关系图：</strong>可视化角色关系，支持头像和动态字体</li>
          </ul>
          <div class="tip">
            <strong>提示：</strong>
            在章节标题右侧开启"人物高亮"开关，系统会自动高亮章节中的人物名称。
            高亮颜色优先使用人物谱中设置的标记色，如果没有标记色则使用默认黄色。
            该设置按书籍保存，切换章节时保持开启状态。
          </div>
        </div>

        <div class="guide-card">
          <h3>🗺️ 地图设计</h3>
          <p>设计你的故事世界：</p>
          <ul>
            <li>创建世界地图和区域地图</li>
            <li>标记重要地点和路线</li>
            <li>保存地图图片，便于参考</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>📅 时间线管理</h3>
          <p>管理故事时间线：</p>
          <ul>
            <li>记录重要事件和时间节点</li>
            <li>按时间顺序排列事件</li>
            <li>便于保持故事逻辑连贯性</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>📖 词典功能</h3>
          <p>管理专有名词和术语：</p>
          <ul>
            <li>记录自定义词汇和概念</li>
            <li>保持术语使用的一致性</li>
            <li>便于读者理解</li>
            <li>支持树形结构，分类管理词汇</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>📝 笔记管理</h3>
          <p>强大的笔记编辑功能：</p>
          <ul>
            <li><strong>大纲式编辑：</strong>支持多层级缩进，清晰展示笔记结构</li>
            <li><strong>拖拽排序：</strong>直观的拖拽操作调整笔记顺序</li>
            <li><strong>折叠展开：</strong>支持折叠/展开笔记段落，优化界面布局</li>
            <li><strong>富文本支持：</strong>支持粗体、斜体、高亮等格式</li>
            <li><strong>笔记本管理：</strong>支持创建多个笔记本，分类管理不同主题的笔记</li>
          </ul>
        </div>
      </section>

      <!-- 使用技巧 -->
      <section class="guide-section">
        <h2>💡 使用技巧</h2>

        <div class="guide-card">
          <h3>📊 数据统计</h3>
          <p>利用统计功能提升创作效率：</p>
          <ul>
            <li><strong>实时统计：</strong>章节字数、书籍总字数实时显示</li>
            <li><strong>码字速度：</strong>每分钟/每小时码字速度，找到最佳创作状态</li>
            <li><strong>净增字数：</strong>关注净增字数，了解实际创作进度（排除删除内容）</li>
            <li><strong>目标设定：</strong>设置章节目标字数，进度条可视化显示</li>
            <li><strong>字数图表：</strong>可视化展示字数变化趋势</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>🔄 工作流程</h3>
          <p>推荐的创作流程：</p>
          <ol>
            <li>先规划大纲和章节结构（可使用笔记功能记录大纲）</li>
            <li>创建角色和设定世界观（使用人物谱管理角色信息）</li>
            <li>设计地图和关系图谱（构建故事世界）</li>
            <li>按章节顺序进行创作（开启人物高亮，便于检查人物出场）</li>
            <li>使用事序图管理事件时间轴和进度</li>
            <li>定期回顾和修改（使用搜索功能快速定位）</li>
            <li>使用组织架构管理展示组织结构和层级关系</li>
          </ol>
        </div>

        <div class="guide-card">
          <h3>💾 数据备份</h3>
          <p>保护你的创作成果：</p>
          <ul>
            <li><strong>自动保存：</strong>软件会自动保存你的内容，无需手动操作</li>
            <li><strong>本地存储：</strong>所有数据存储在本地，保护隐私安全</li>
            <li><strong>文件夹备份：</strong>建议定期备份整个书籍文件夹</li>
            <li><strong>导出功能：</strong>可以导出章节内容进行备份</li>
            <li><strong>密码保护：</strong>为重要书籍设置密码，确保创作安全</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>🎨 编辑器个性化</h3>
          <p>自定义你的写作环境：</p>
          <ul>
            <li><strong>字体设置：</strong>支持多种中文字体（宋体、黑体、楷体、仿宋等）</li>
            <li><strong>字号行高：</strong>自定义字号和行高，找到最舒适的阅读体验</li>
            <li><strong>全局格式：</strong>支持全局加粗/倾斜模式，一键应用到所有内容</li>
            <li><strong>人物高亮：</strong>开启人物高亮功能，自动高亮章节中的人物名称</li>
            <li><strong>设置保存：</strong>编辑器设置自动保存，下次打开时自动应用</li>
          </ul>
          <div class="tip">
            <strong>提示：</strong>
            人物高亮功能按书籍保存设置。开启后，系统会每2秒自动检查并更新高亮，
            确保编辑过程中实时匹配人物名称。
          </div>
        </div>
      </section>

      <!-- 快捷键 -->
      <section class="guide-section">
        <h2>⌨️ 快捷键</h2>

        <div class="guide-card">
          <h3>编辑器快捷键</h3>
          <div class="shortcut-grid">
            <div class="shortcut-item">
              <kbd>Ctrl/Cmd + B</kbd>
              <span>粗体</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl/Cmd + I</kbd>
              <span>斜体</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl/Cmd + F</kbd>
              <span>搜索</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl/Cmd + S</kbd>
              <span>保存</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl/Cmd + Z</kbd>
              <span>撤销</span>
            </div>
            <div class="shortcut-item">
              <kbd>Ctrl/Cmd + Y</kbd>
              <span>重做</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 常见问题 -->
      <section class="guide-section">
        <h2>❓ 常见问题</h2>

        <div class="guide-card">
          <h3>Q: 如何修改章节名称格式？</h3>
          <p>A: 点击章节树中的设置图标，可以修改后缀类型（章、集、回、节、部、卷）。</p>
        </div>

        <div class="guide-card">
          <h3>Q: 如何重新格式化章节编号？</h3>
          <p>A: 在章节设置中点击"重新格式化章节编号"按钮，系统会自动重新编号。</p>
        </div>

        <div class="guide-card">
          <h3>Q: 人物高亮功能如何使用？</h3>
          <p>
            A: 在章节标题右侧找到"人物高亮"开关，开启后系统会自动高亮章节中匹配的人物名称。高亮颜色优先使用人物谱中设置的标记色，如果没有标记色则使用默认黄色。该设置按书籍保存，切换章节时保持开启状态。
          </p>
        </div>

        <div class="guide-card">
          <h3>Q: 搜索功能找不到内容怎么办？</h3>
          <p>
            A: 检查搜索选项设置，确保没有启用全字匹配等限制条件。使用
            <code>Ctrl+F</code>（Windows）或 <code>Cmd+F</code>（Mac）打开搜索面板。
          </p>
        </div>

        <div class="guide-card">
          <h3>Q: 如何备份我的作品？</h3>
          <p>
            A: 复制整个书籍文件夹即可，所有内容都保存在本地文件中。建议定期备份，也可以为重要书籍设置密码保护。
          </p>
        </div>

        <div class="guide-card">
          <h3>Q: 笔记和章节有什么区别？</h3>
          <p>
            A: 章节用于正式的小说内容创作，支持纯文本格式。笔记用于记录大纲、灵感、设定等，支持大纲式编辑和层级缩进，更适合结构化内容管理。
          </p>
        </div>

        <div class="guide-card">
          <h3>Q: 编辑器设置会保存吗？</h3>
          <p>
            A: 是的，字体、字号、行高、全局格式模式等设置会自动保存，下次打开编辑器时会自动应用。人物高亮开关状态按书籍保存。
          </p>
        </div>
      </section>

      <!-- 联系支持 -->
      <section class="guide-section">
        <h2>📞 联系支持</h2>

        <div class="guide-card">
          <p>如果你在使用过程中遇到问题，或有功能建议，欢迎反馈。</p>
          <p>让我们一起完善这个创作工具，为网络文学创作提供更好的支持！</p>
        </div>
      </section>
    </div>

    <div class="guide-footer">
      <el-button type="primary" @click="goBack">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()

const goBack = () => {
  router.push('/')
}
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
</style>
