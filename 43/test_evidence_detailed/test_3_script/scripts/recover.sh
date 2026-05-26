#!/bin/bash

echo "========================================"
echo "  文件分片恢复工具"
echo "========================================"
echo ""
echo "原始文件: original_file.bin"
echo "分片数量: 3"
echo "加密类型: none"
echo ""
echo "正在检查分片文件..."
MISSING=0
if [ ! -f "original_file.part1" ]; then
  echo "缺失文件: original_file.part1"
  MISSING=1
fi
if [ ! -f "original_file.part2" ]; then
  echo "缺失文件: original_file.part2"
  MISSING=1
fi
if [ ! -f "original_file.part3" ]; then
  echo "缺失文件: original_file.part3"
  MISSING=1
fi
if [ $MISSING -eq 1 ]; then
  echo ""
  echo "错误: 部分分片文件缺失，无法继续"
  exit 1
fi
echo "所有分片文件检查通过"
echo ""
echo "正在合并文件..."
cat original_file.part1 original_file.part2 original_file.part3 > "original_file.bin"
if [ -f "original_file.bin" ]; then
  echo ""
  echo "合并成功！文件已保存为: original_file.bin"
  echo ""
  read -p "是否删除分片文件? (y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f "original_file.part1"
    rm -f "original_file.part2"
    rm -f "original_file.part3"
    echo "分片文件已删除"
  fi
else
  echo "合并失败！"
  exit 1
fi
