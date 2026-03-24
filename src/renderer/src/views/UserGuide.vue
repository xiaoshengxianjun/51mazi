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
        <h2>快速开始</h2>
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
        <h2>核心功能</h2>

        <div class="guide-card">
          <h3>📝 智能编辑器</h3>
          <p>基于 Tiptap 的现代化编辑器，支持：</p>
          <ul>
            <li><strong>富文本编辑：</strong>粗体、斜体、高亮等格式</li>
            <li><strong>实时统计：</strong>字数统计、码字速度、净增字数</li>
            <li><strong>自动保存：</strong>无需担心内容丢失</li>
            <li><strong>搜索替换：</strong>快速查找和修改内容</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>搜索与替换</h3>
          <p>强大的搜索功能：</p>
          <ul>
            <li>快捷键：<code>Ctrl+F</code>（Windows）或 <code>Cmd+F</code>（Mac）</li>
            <li>支持大小写匹配、全字匹配、正则表达式</li>
            <li>批量替换功能，提高修改效率</li>
            <li>搜索结果高亮显示</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>章节管理</h3>
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
        <h2>高级功能</h2>

        <div class="guide-card">
          <h3>角色管理</h3>
          <p>创建和管理你的角色：</p>
          <ul>
            <li>角色基本信息（姓名、年龄、性格等）</li>
            <li>角色关系图，可视化角色关系</li>
            <li>角色笔记，记录角色发展轨迹</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>地图设计</h3>
          <p>设计你的故事世界：</p>
          <ul>
            <li>创建世界地图和区域地图</li>
            <li>标记重要地点和路线</li>
            <li>保存地图图片，便于参考</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>时间线管理</h3>
          <p>管理故事时间线：</p>
          <ul>
            <li>记录重要事件和时间节点</li>
            <li>按时间顺序排列事件</li>
            <li>便于保持故事逻辑连贯性</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>词典功能</h3>
          <p>管理专有名词和术语：</p>
          <ul>
            <li>记录自定义词汇和概念</li>
            <li>保持术语使用的一致性</li>
            <li>便于读者理解</li>
          </ul>
        </div>
      </section>

      <!-- 使用技巧 -->
      <section class="guide-section">
        <h2>使用技巧</h2>

        <div class="guide-card">
          <h3>数据统计</h3>
          <p>利用统计功能提升创作效率：</p>
          <ul>
            <li>关注净增字数，了解实际创作进度</li>
            <li>监控码字速度，找到最佳创作状态</li>
            <li>定期查看总字数，设定创作目标</li>
          </ul>
        </div>

        <div class="guide-card">
          <h3>工作流程</h3>
          <p>推荐的创作流程：</p>
          <ol>
            <li>先规划大纲和章节结构</li>
            <li>创建角色和设定世界观</li>
            <li>按章节顺序进行创作</li>
            <li>定期回顾和修改</li>
            <li>使用搜索功能快速定位需要修改的地方</li>
          </ol>
        </div>

        <div class="guide-card">
          <h3>数据备份</h3>
          <p>保护你的创作成果：</p>
          <ul>
            <li>软件会自动保存你的内容</li>
            <li>建议定期备份书籍文件夹</li>
            <li>可以导出章节内容进行备份</li>
          </ul>
        </div>
      </section>

      <!-- 快捷键 -->
      <section class="guide-section">
        <h2>快捷键</h2>

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
        <h2>常见问题</h2>

        <div class="guide-card">
          <h3>Q: 如何修改章节名称格式？</h3>
          <p>A: 点击章节树中的设置图标，可以修改后缀类型（章、集、回等）。</p>
        </div>

        <div class="guide-card">
          <h3>Q: 如何重新格式化章节编号？</h3>
          <p>A: 在章节设置中点击"重新格式化章节编号"按钮，系统会自动重新编号。</p>
        </div>

        <div class="guide-card">
          <h3>Q: 搜索功能找不到内容怎么办？</h3>
          <p>A: 检查搜索选项设置，确保没有启用全字匹配等限制条件。</p>
        </div>

        <div class="guide-card">
          <h3>Q: 如何备份我的作品？</h3>
          <p>A: 复制整个书籍文件夹即可，所有内容都保存在本地文件中。</p>
        </div>
      </section>

      <!-- 联系支持 -->
      <section class="guide-section">
        <h2>联系支持</h2>

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
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
  background: linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%);
  min-height: 100vh;
}

.top-navigation {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 12px 0;
  margin: -24px -24px 24px -24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);

  :deep(.back-button) {
    margin-left: 24px;
  }
}

.guide-header {
  text-align: center;
  margin-bottom: 48px;
  padding: 56px 40px;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
  border-radius: 24px;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    opacity: 0.6;
  }

  h1 {
    font-size: 2.8rem;
    margin: 0 0 16px 0;
    font-weight: 800;
    letter-spacing: -0.02em;
    position: relative;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
  }

  .subtitle {
    font-size: 1.25rem;
    margin: 0;
    opacity: 0.9;
    font-weight: 400;
    position: relative;
    color: #c7d2fe;
  }
}

.guide-content {
  margin-bottom: 40px;
}

.guide-section {
  margin-bottom: 48px;

  h2 {
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 24px;
    padding-bottom: 14px;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 14px;
    font-weight: 700;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 80px;
      height: 2px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 2px;
    }
  }
}

.guide-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.12);
    border-color: rgba(99, 102, 241, 0.2);
  }

  h3 {
    font-size: 1.2rem;
    color: #1e293b;
    margin: 0 0 14px 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
  }

  > p {
    color: #475569;
    line-height: 1.7;
    margin: 0 0 14px 0;
  }

  > ul,
  > ol {
    color: #475569;
    line-height: 1.8;
    margin: 0 0 14px 0;
    padding-left: 24px;

    li {
      margin-bottom: 8px;
      position: relative;

      &::marker {
        color: #6366f1;
      }
    }
  }

  .tip {
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 10px;
    padding: 16px 20px;
    margin-top: 16px;

    strong {
      color: #6366f1;
    }
  }

  code {
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    padding: 3px 8px;
    border-radius: 6px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875em;
    color: #6366f1;
    border: 1px solid #e2e8f0;
  }
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
    border-color: rgba(99, 102, 241, 0.3);
    transform: scale(1.02);
  }

  kbd {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 10px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.8rem;
    color: #334155;
    box-shadow: 0 2px 0 #cbd5e1, 0 3px 6px rgba(0, 0, 0, 0.05);
    font-weight: 600;
  }

  span {
    color: #475569;
    font-weight: 500;
    font-size: 0.9rem;
  }
}

.guide-footer {
  text-align: center;
  padding: 32px 0;
  border-top: 1px solid #e2e8f0;
  margin-top: 24px;

  :deep(.el-button--primary) {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none;
    padding: 12px 32px;
    font-weight: 600;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }
  }
}

@media (max-width: 768px) {
  .user-guide {
    padding: 16px;
    margin: -16px;
    border-radius: 0;
  }

  .top-navigation {
    margin: -16px -16px 16px -16px;
    padding: 10px 16px;
  }

  .guide-header {
    padding: 36px 24px;
    margin-bottom: 32px;
    border-radius: 16px;

    h1 {
      font-size: 1.8rem;
    }

    .subtitle {
      font-size: 1rem;
    }
  }

  .guide-section {
    margin-bottom: 32px;

    h2 {
      font-size: 1.4rem;
    }
  }

  .guide-card {
    padding: 18px;
    border-radius: 12px;

    h3 {
      font-size: 1.1rem;
    }
  }

  .shortcut-grid {
    grid-template-columns: 1fr;
  }
}
</style>
