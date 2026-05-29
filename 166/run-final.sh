#!/bin/bash
cd "/Users/mac/code/solo coder/166"
rm -f screenshots-output-final.txt
node scripts/take-screenshots-final.mjs 2>&1 | tee screenshots-output-final.txt
echo ""
echo "=== 最终文件列表 ==="
ls -lh screenshots/
