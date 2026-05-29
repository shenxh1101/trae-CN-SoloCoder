#!/bin/bash
cd "/Users/mac/code/solo coder/166"
rm -f screenshots-output-v2.txt
node scripts/take-screenshots-v2.mjs 2>&1 | tee screenshots-output-v2.txt
echo "=== 最终文件列表 ==="
ls -la screenshots/
