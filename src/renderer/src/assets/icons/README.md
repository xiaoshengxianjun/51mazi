# iconfont 图标使用指南

本项目已集成 iconfont 图标资源，提供了两种使用方式：Class 方式和 Symbol 方式。

## 📁 文件结构

```
src/assets/icons/
├── iconfont.css    # 字体图标样式文件
├── iconfont.js     # SVG 图标 JavaScript 文件
└── README.md       # 使用说明文档

src/components/
├── IconFont.vue    # Class 方式图标组件
└── SvgIcon.vue     # Symbol 方式图标组件

src/assets/styles/
└── icons.scss      # 图标样式管理文件
```

## 🎯 可用图标

根据您的 iconfont 资源，以下图标可供使用：

### 功能图标
- `relationship` - 关系图谱
- `gantt` - 甘特图/事序图
- `character` - 人物角色
- `organization` - 组织架构
- `timeline` - 时间线
- `map` - 地图
- `characters` - 人物管理
- `theme` - 主题设置

### 操作图标
- `replaceall` - 全部替换
- `replace` - 替换
- `naming` - 命名
- `config` - 配置
- `export` - 导出
- `save` - 保存
- `import` - 导入
- `outline` - 大纲

## 🚀 使用方法

### 方法1：使用 IconFont 组件（Class 方式）

```vue
<template>
  <!-- 基础使用 -->
  <IconFont name="relationship" />
  
  <!-- 自定义大小和颜色 -->
  <IconFont name="character" :size="24" color="#409eff" />
  
  <!-- 添加样式类 -->
  <IconFont name="map" class="icon-lg icon-primary" />
  
  <!-- 带点击事件 -->
  <IconFont name="save" @click="handleSave" />
</template>
```

### 方法2：使用 SvgIcon 组件（Symbol 方式）

```vue
<template>
  <!-- 基础使用 -->
  <SvgIcon name="gantt" />
  
  <!-- 自定义大小和颜色 -->
  <SvgIcon name="timeline" :size="20" color="#67c23a" />
  
  <!-- 添加样式类 -->
  <SvgIcon name="theme" class="svg-xl svg-warning" />
  
  <!-- 带点击事件 -->
  <SvgIcon name="export" @click="handleExport" />
</template>
```

### 方法3：直接使用 CSS 类

```vue
<template>
  <!-- 直接使用 iconfont 类 -->
  <i class="iconfont icon-character"></i>
  
  <!-- 添加样式变体 -->
  <i class="iconfont icon-map icon-lg icon-primary"></i>
  
  <!-- 添加动画效果 -->
  <i class="iconfont icon-save icon-spin"></i>
</template>
```

## 🎨 样式变体

### 大小变体
- `icon-xs` / `svg-xs` - 12px
- `icon-sm` / `svg-sm` - 14px
- `icon-md` / `svg-md` - 16px（默认）
- `icon-lg` / `svg-lg` - 20px
- `icon-xl` / `svg-xl` - 24px
- `icon-2xl` / `svg-2xl` - 32px

### 颜色变体
- `icon-primary` / `svg-primary` - 主题蓝色
- `icon-success` / `svg-success` - 成功绿色
- `icon-warning` / `svg-warning` - 警告橙色
- `icon-danger` / `svg-danger` - 危险红色
- `icon-info` / `svg-info` - 信息灰色
- `icon-white` / `svg-white` - 白色
- `icon-black` / `svg-black` - 黑色

### 动画效果
- `icon-spin` - 旋转动画
- `icon-hover` - 悬停效果

### 按钮样式
- `icon-button` - 基础按钮样式
- `icon-button primary` - 主要按钮
- `icon-button success` - 成功按钮
- `icon-button warning` - 警告按钮
- `icon-button danger` - 危险按钮

## 💡 使用建议

### 1. 选择合适的方式
- **IconFont 组件**：适合简单的图标显示，性能更好
- **SvgIcon 组件**：适合需要精确控制样式的场景，支持更多样式选项

### 2. 保持一致性
- 在同一个项目中尽量使用同一种方式
- 统一图标的大小和颜色规范

### 3. 性能优化
- 优先使用 IconFont 组件（字体方式）
- 需要复杂样式时再使用 SvgIcon 组件

## 🔧 组件属性

### IconFont 组件属性
- `name` (String, 必需) - 图标名称
- `size` (String|Number, 默认: 16) - 图标大小
- `color` (String, 默认: 'currentColor') - 图标颜色
- `className` (String, 默认: '') - 额外的 CSS 类名

### SvgIcon 组件属性
- `name` (String, 必需) - 图标名称
- `size` (String|Number, 默认: 16) - 图标大小
- `color` (String, 默认: 'currentColor') - 图标颜色
- `className` (String, 默认: '') - 额外的 CSS 类名

## 📝 示例代码

```vue
<template>
  <div class="icon-demo">
    <!-- 功能图标展示 -->
    <div class="icon-group">
      <h3>功能图标</h3>
      <IconFont name="relationship" :size="24" />
      <IconFont name="gantt" :size="24" />
      <IconFont name="character" :size="24" />
      <IconFont name="map" :size="24" />
    </div>
    
    <!-- 操作图标展示 -->
    <div class="icon-group">
      <h3>操作图标</h3>
      <SvgIcon name="save" :size="20" color="#67c23a" />
      <SvgIcon name="export" :size="20" color="#409eff" />
      <SvgIcon name="import" :size="20" color="#e6a23c" />
    </div>
    
    <!-- 按钮样式 -->
    <div class="icon-group">
      <h3>按钮样式</h3>
      <div class="icon-button primary">
        <IconFont name="save" :size="16" />
        保存
      </div>
      <div class="icon-button danger">
        <IconFont name="delete" :size="16" />
        删除
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-demo {
  padding: 20px;
}

.icon-group {
  margin-bottom: 20px;
}

.icon-group h3 {
  margin-bottom: 10px;
  color: #333;
}

.icon-group > * {
  margin-right: 10px;
}
</style>
```

现在您可以在项目中灵活使用这些图标了！🎉
