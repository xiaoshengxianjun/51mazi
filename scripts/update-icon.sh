#!/bin/bash
# 更新应用图标的脚本
# 使用方法: ./scripts/update-icon.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESOURCES_ICON="${PROJECT_ROOT}/resources/icon.png"
BUILD_DIR="${PROJECT_ROOT}/build"

echo "🔄 开始更新应用图标..."

# 检查源图标文件是否存在
if [ ! -f "$RESOURCES_ICON" ]; then
  echo "❌ 错误: 源图标文件不存在: $RESOURCES_ICON"
  exit 1
fi

# 确保 build 目录存在
mkdir -p "$BUILD_DIR"

# 1. 复制 PNG 图标
echo "📋 复制 PNG 图标..."
cp "$RESOURCES_ICON" "${BUILD_DIR}/icon.png"

# 2. 生成 macOS .icns 图标
echo "🍎 生成 macOS .icns 图标..."
ICONSET_DIR="${BUILD_DIR}/icon.iconset"

# 清理旧的 iconset 目录
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# 生成各种尺寸的图标（macOS 需要）
sips -z 16 16 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_16x16.png" > /dev/null
sips -z 32 32 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_16x16@2x.png" > /dev/null
sips -z 32 32 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_32x32.png" > /dev/null
sips -z 64 64 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_32x32@2x.png" > /dev/null
sips -z 128 128 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_128x128.png" > /dev/null
sips -z 256 256 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_128x128@2x.png" > /dev/null
sips -z 256 256 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_256x256.png" > /dev/null
sips -z 512 512 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_256x256@2x.png" > /dev/null
sips -z 512 512 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_512x512.png" > /dev/null
sips -z 1024 1024 "$RESOURCES_ICON" --out "${ICONSET_DIR}/icon_512x512@2x.png" > /dev/null

# 使用 iconutil 生成 .icns 文件
iconutil -c icns "$ICONSET_DIR" -o "${BUILD_DIR}/icon.icns"
rm -rf "$ICONSET_DIR"

echo "✅ 图标更新完成！"
echo ""
echo "📁 生成的图标文件："
ls -lh "${BUILD_DIR}/icon."* | awk '{print "   " $9 " (" $5 ")"}'
echo ""
echo "💡 提示: electron-builder 会在 Windows 构建时自动从 PNG 生成 .ico 文件"
echo "💡 下次更新图标时，只需运行: ./scripts/update-icon.sh"

