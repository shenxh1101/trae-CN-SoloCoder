#!/bin/bash
cd "/Users/mac/code/solo coder/166"
rm -f screenshots-output-remaining.txt
node scripts/take-remaining.mjs 2>&1 | tee screenshots-output-remaining.txt
echo ""
echo "=== 最终文件列表 ==="
ls -lh screenshots/
