#!/usr/bin/env python3
import os
import json
import uuid
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import mimetypes

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'city_data')
os.makedirs(DATA_DIR, exist_ok=True)

class CORSRequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/' or parsed.path == '/index.html':
            self._serve_file('index.html')
            return
        
        if parsed.path == '/api/cities':
            self._list_cities()
            return
        
        if parsed.path.startswith('/api/cities/'):
            city_id = parsed.path.split('/')[-1]
            self._get_city(city_id)
            return
        
        self._serve_file(parsed.path.lstrip('/'))

    def do_POST(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/cities':
            self._save_city()
            return
        
        self._set_headers(404)
        self.wfile.write(json.dumps({'error': 'Not found'}).encode())

    def do_DELETE(self):
        parsed = urlparse(self.path)
        
        if parsed.path.startswith('/api/cities/'):
            city_id = parsed.path.split('/')[-1]
            self._delete_city(city_id)
            return
        
        self._set_headers(404)
        self.wfile.write(json.dumps({'error': 'Not found'}).encode())

    def _serve_file(self, filepath):
        if not filepath or filepath == '':
            filepath = 'index.html'
        
        if os.path.isfile(filepath):
            content_type, _ = mimetypes.guess_type(filepath)
            if content_type is None:
                content_type = 'application/octet-stream'
            
            self._set_headers(200, content_type)
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self._set_headers(404)
            self.wfile.write(b'File not found')

    def _save_city(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            city_id = str(uuid.uuid4())[:8]
            data['id'] = city_id
            data['created_at'] = datetime.now().isoformat()
            
            filename = os.path.join(DATA_DIR, f'{city_id}.json')
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self._set_headers(201)
            self.wfile.write(json.dumps({'id': city_id, 'status': 'saved'}).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def _list_cities(self):
        try:
            cities = []
            for filename in os.listdir(DATA_DIR):
                if filename.endswith('.json'):
                    filepath = os.path.join(DATA_DIR, filename)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        cities.append({
                            'id': data.get('id', filename.replace('.json', '')),
                            'text': data.get('text', '')[:50],
                            'sentiment': data.get('sentiment', 0),
                            'buildingCount': data.get('buildingCount', 0)
                        })
            
            self._set_headers(200)
            self.wfile.write(json.dumps(cities).encode())
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def _get_city(self, city_id):
        filepath = os.path.join(DATA_DIR, f'{city_id}.json')
        if os.path.isfile(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self._set_headers(200)
            self.wfile.write(json.dumps(data).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'City not found'}).encode())

    def _delete_city(self, city_id):
        filepath = os.path.join(DATA_DIR, f'{city_id}.json')
        if os.path.isfile(filepath):
            os.remove(filepath)
            self._set_headers(200)
            self.wfile.write(json.dumps({'status': 'deleted'}).encode())
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'City not found'}).encode())

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

if __name__ == '__main__':
    port = 8080
    HTTPServer.allow_reuse_address = True
    server = HTTPServer(('', port), CORSRequestHandler)
    print(f'🌃 梦幻城市服务器启动在 http://localhost:{port}')
    print(f'📂 数据存储目录: {DATA_DIR}')
    print(f'API 接口:')
    print(f'  POST /api/cities - 保存城市')
    print(f'  GET /api/cities - 列出城市')
    print(f'  GET /api/cities/:id - 获取城市')
    print(f'  DELETE /api/cities/:id - 删除城市')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务器已停止')
        server.server_close()
