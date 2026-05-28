#!/usr/bin/env python3
import os
import sys

if __name__ == '__main__':
    os.environ.setdefault('FLASK_ENV', 'production')
    
    from app import app
    from config import Config
    
    ssl_context = None
    if Config.HTTPS_ENABLED:
        cert_path = Config.HTTPS_CERT
        key_path = Config.HTTPS_KEY
        if os.path.exists(cert_path) and os.path.exists(key_path):
            ssl_context = (cert_path, key_path)
    
    protocol = 'https' if ssl_context else 'http'
    print(f"=" * 60)
    print(f"API代理服务已启动")
    print(f"=" * 60)
    print(f"管理面板: {protocol}://localhost:{Config.PORT}/admin")
    print(f"代理地址: {protocol}://localhost:{Config.PORT}")
    print(f"=" * 60)
    
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        ssl_context=ssl_context,
        debug=False,
        threaded=True
    )
