#!/usr/bin/env python3
"""旅行日记工具 - 一键运行完整验证"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from complete_verify import main
sys.exit(main())
