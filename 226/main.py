#!/usr/bin/env python3
"""
AI剧本对话生成器 - 主入口
"""

import os
import sys

src_path = os.path.join(os.path.dirname(__file__), 'src')
sys.path.insert(0, src_path)

from script_generator.cli import main

if __name__ == '__main__':
    main()
