#!/bin/bash
cd "/Users/mac/code/solo coder/166"
rm -f screenshots-output-v3.txt
node scripts/take-screenshots-v3.mjs 2>&1 | tee screenshots-output-v3.txt
echo ""
echo "=== 最终文件列表 ==="
ls -la screenshots/
