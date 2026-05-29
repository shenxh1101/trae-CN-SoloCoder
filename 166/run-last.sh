#!/bin/bash
cd "/Users/mac/code/solo coder/166"
rm -f screenshots-output-last.txt
node scripts/take-last-two-v2.mjs 2>&1 | tee screenshots-output-last.txt
echo ""
echo "=== 最终文件列表 ==="
ls -lh screenshots/
