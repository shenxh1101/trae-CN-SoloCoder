#!/usr/bin/env python3
import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

if __name__ == '__main__':
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    port = int(os.getenv('PORT', 5000))
    print(f"🚀 AI学习路线图生成器启动中...")
    print(f"📱 Web界面: http://localhost:{port}")
    print(f"💡 命令行使用: python cli.py --help")
    app.run(host='0.0.0.0', port=port, debug=debug)
