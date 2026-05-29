#!/bin/bash
cd "/Users/mac/code/solo coder/166"
node scripts/take-screenshots.mjs > screenshots-output.txt 2>&1
cat screenshots-output.txt
