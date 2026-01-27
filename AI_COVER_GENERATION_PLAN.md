# AI生成封面功能实现方案

## 📋 项目概述

本项目计划添加AI生成小说封面和AI生成人物图片的功能，使用通义万相API实现。

## ✅ 第一步：UI实现（已完成）

### 1.1 功能位置

- 在编辑书籍信息弹框（`Bookshelf.vue`）的"封面图片"区域添加了"AI生成封面"按钮
- 点击按钮后弹出配置弹框

### 1.2 配置弹框功能

弹框包含以下配置项：

1. **书籍类型**（必填）
   - 从 `BOOK_TYPES` 常量中选择
   - 用于生成更符合类型的封面

2. **作者名**（可选）
   - 最多20个字符
   - 可用于生成个性化封面

3. **封面尺寸**（必选）
   - 预设选项：
     - 1:1 (1280×1280)
     - 3:4 (1104×1472)
     - 4:3 (1472×1104)
     - 9:16 (960×1696)
     - 16:9 (1696×960)
     - 自定义
   - 自定义尺寸验证：
     - 总像素需在 1,638,400 (1280×1280) 至 2,073,600 (1440×1440) 之间
     - 宽高比需在 1:4 至 4:1 之间

4. **封面要求**（必填，正向提示词）
   - 支持中英文
   - 最多2100个字符
   - 提供提示词建议：
     - 描述封面风格
     - 描述主要元素
     - 描述色彩氛围
     - 描述构图

5. **反向提示词**（可选）
   - 描述不希望在封面中出现的内容
   - 最多500个字符

### 1.3 表单验证

- 书籍类型：必填
- 封面要求：必填，至少10个字符
- 自定义尺寸：验证总像素和宽高比是否符合API要求

## 🔄 第二步：接入通义万相API（待实现）

### 2.1 技术方案

参考项目中已有的 DeepSeek 集成方式，采用以下架构：

```
渲染进程 (Vue组件)
    ↓ IPC调用
主进程 (index.js)
    ↓ HTTP请求
通义万相服务 (tongyiwanxiang.js)
    ↓ API调用
通义万相API
```

### 2.2 实现步骤

#### 步骤1：创建通义万相服务类

**文件位置**：`src/main/services/tongyiwanxiang.js`

**核心功能**：

- API Key 管理（从 electron-store 读取）
- 请求频率限制
- 统一的错误处理
- 支持同步和异步调用

**API端点**：

- 北京地域：`https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- 新加坡地域：`https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`
- 弗吉尼亚地域：`https://dashscope-us.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

**推荐模型**：`wan2.6-t2i`（支持同步调用）

#### 步骤2：在主进程中注册IPC处理器

**文件位置**：`src/main/index.js`

**需要添加的处理器**：

- `tongyiwanxiang:set-api-key` - 设置API Key
- `tongyiwanxiang:get-api-key` - 获取API Key
- `tongyiwanxiang:validate-api-key` - 验证API Key
- `tongyiwanxiang:generate-cover` - 生成封面图片

#### 步骤3：在preload中暴露API

**文件位置**：`src/preload/index.js`

**需要暴露的方法**：

- `setTongyiwanxiangApiKey(apiKey)`
- `getTongyiwanxiangApiKey()`
- `validateTongyiwanxiangApiKey()`
- `generateCover(options)`

#### 步骤4：创建前端服务封装

**文件位置**：`src/renderer/src/service/tongyiwanxiang.js`

封装IPC调用，提供简洁的API接口。

#### 步骤5：创建设置组件（可选）

**文件位置**：`src/renderer/src/components/TongyiwanxiangSettings.vue`

参考 `DeepSeekSettings.vue`，提供API Key配置界面。

#### 步骤6：在Bookshelf组件中实现生成逻辑

**文件位置**：`src/renderer/src/components/Bookshelf.vue`

在 `handleGenerateAICover` 函数中：

1. 调用通义万相API生成图片
2. 下载生成的图片（URL有效期24小时）
3. 保存到书籍目录
4. 更新封面预览

### 2.3 API调用示例

#### 同步调用（推荐）

```javascript
const response = await fetch(
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'wan2.6-t2i',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              {
                text: '封面提示词'
              }
            ]
          }
        ]
      },
      parameters: {
        prompt_extend: true,
        watermark: false,
        n: 1,
        negative_prompt: '反向提示词',
        size: '1280*1280'
      }
    })
  }
)
```

#### 响应处理

```javascript
const data = await response.json()
if (data.output && data.output.choices && data.output.choices[0]) {
  const imageUrl = data.output.choices[0].message.content[0].image
  // 下载并保存图片
}
```

### 2.4 图片处理流程

1. **获取图片URL**：从API响应中获取图片URL（有效期24小时）
2. **下载图片**：使用 Node.js 的 `https` 或 `fetch` 下载图片
3. **保存到本地**：保存到书籍目录，命名为 `cover.png` 或 `cover.jpg`
4. **更新表单**：更新 `form.coverImagePath` 和 `form.coverImagePreview`
5. **用户确认**：用户可以在编辑书籍弹框中看到生成的封面，确认后保存

### 2.5 错误处理

需要处理的错误情况：

- API Key 无效或未设置
- 账户余额不足
- 网络连接失败
- 图片生成失败
- 内容审核不通过（IPInfringementSuspect 或 DataInspectionFailed）

### 2.6 费用说明

- 新用户：500张图像免费额度，有效期180天
- 超过免费额度：0.06元/张
- 按成功生成的图像张数计费
- 建议测试时设置 `n: 1`（只生成1张）

## 📝 后续优化

1. **生成历史记录**：保存用户生成过的封面，支持重新使用
2. **批量生成**：支持一次生成多张封面供用户选择
3. **封面模板**：提供不同风格的封面模板
4. **人物图片生成**：扩展功能，支持生成人物立绘
5. **智能提示词**：根据书籍类型和简介自动生成提示词

## 🔗 参考文档

- [通义万相-文生图V2版API参考](https://help.aliyun.com/zh/model-studio/text-to-image-v2-api-reference)
- [获取API Key](https://help.aliyun.com/zh/model-studio/get-api-key)
- [模型价格](https://help.aliyun.com/zh/model-studio/model-pricing)

## 📌 注意事项

1. **API Key安全**：API Key只在主进程中存储和使用，不暴露到渲染进程
2. **图片时效**：生成的图片URL有效期24小时，需要及时下载保存
3. **内容审核**：输入的提示词和输出的图像都会经过内容安全审核
4. **地域选择**：北京、新加坡、弗吉尼亚地域的API Key和请求地址不可混用
5. **尺寸限制**：严格遵守API的尺寸限制，避免请求失败
