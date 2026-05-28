from flask import Flask, request
from config import Config
from proxy.core import proxy
from admin_routes import admin_bp
import os

app = Flask(__name__)
app.config.from_object(Config)

app.register_blueprint(admin_bp)

@app.before_request
def handle_proxy():
    path = request.path
    if path.startswith('/admin'):
        return None
    return proxy.forward_request(path.lstrip('/'))

@app.route('/')
def index():
    return 'API Proxy Server is running. Visit /admin for management panel.'

if __name__ == '__main__':
    ssl_context = None
    if Config.HTTPS_ENABLED:
        cert_path = Config.HTTPS_CERT
        key_path = Config.HTTPS_KEY
        if os.path.exists(cert_path) and os.path.exists(key_path):
            ssl_context = (cert_path, key_path)
            print(f"HTTPS enabled: {Config.HOST}:{Config.PORT}")
        else:
            print("Warning: HTTPS cert/key not found, falling back to HTTP")
    
    print(f"API Proxy Server starting on http{'s' if ssl_context else ''}://{Config.HOST}:{Config.PORT}")
    print(f"Admin panel: http{'s' if ssl_context else ''}://{Config.HOST}:{Config.PORT}/admin")
    
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        ssl_context=ssl_context,
        debug=False,
        threaded=True
    )
