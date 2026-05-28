from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import requests
import json
import os
import time
import uuid
from datetime import datetime
from urllib.parse import urlparse
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import ssl

class SSLAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        context.set_ciphers('DEFAULT@SECLEVEL=1')
        kwargs['ssl_context'] = context
        return super().init_poolmanager(*args, **kwargs)

def create_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=0,
        backoff_factor=0
    )
    adapter = SSLAdapter(max_retries=retry_strategy)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

TEST_CASES_FILE = os.path.join(DATA_DIR, 'test_cases.json')
HISTORY_FILE = os.path.join(DATA_DIR, 'history.json')
ENV_VARS_FILE = os.path.join(DATA_DIR, 'env_vars.json')


def load_json_file(file_path, default=None):
    if default is None:
        default = []
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return default
    return default


def save_json_file(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def replace_env_vars(text, env_vars):
    result = text
    for key, value in env_vars.items():
        placeholder = '{{' + key + '}}'
        result = result.replace(placeholder, value)
    return result


def build_raw_request(method, url, headers, body):
    parsed = urlparse(url)
    path = parsed.path or '/'
    if parsed.query:
        path += '?' + parsed.query
    
    raw = f"{method} {path} HTTP/1.1\n"
    raw += f"Host: {parsed.netloc}\n"
    for key, value in headers.items():
        raw += f"{key}: {value}\n"
    raw += "\n"
    if body:
        raw += body
    return raw


def build_raw_response(response, response_body):
    raw = f"HTTP/1.1 {response.status_code} {response.reason}\n"
    for key, value in response.headers.items():
        raw += f"{key}: {value}\n"
    raw += "\n"
    raw += response_body
    return raw


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


def check_assertions(response, response_body, assertions):
    if not assertions:
        return True, ''
    
    expected_status = assertions.get('status_code')
    expected_keyword = assertions.get('keyword')
    assertion_passed = True
    assertion_msg = ''
    
    if expected_status:
        try:
            expected_status_int = int(expected_status)
            if response.status_code != expected_status_int:
                assertion_passed = False
                assertion_msg = f'状态码不匹配: 期望 {expected_status_int}, 实际 {response.status_code}'
        except:
            pass
    
    if assertion_passed and expected_keyword:
        if expected_keyword not in response_body:
            assertion_passed = False
            assertion_msg = f'未找到关键字: {expected_keyword}'
    
    return assertion_passed, assertion_msg


@app.route('/api/send-request', methods=['POST'])
def send_request():
    data = request.json
    method = data.get('method', 'GET')
    url = data.get('url', '')
    headers = data.get('headers', {})
    body = data.get('body', '')
    timeout = data.get('timeout', 30)
    retry_count = data.get('retry_count', 0)
    use_proxy = data.get('use_proxy', False)
    assertions = data.get('assertions', {})
    
    env_vars = load_json_file(ENV_VARS_FILE, {})
    url = replace_env_vars(url, env_vars)
    
    for key in list(headers.keys()):
        headers[key] = replace_env_vars(headers[key], env_vars)
    
    if isinstance(body, str):
        body = replace_env_vars(body, env_vars)
    
    last_error = None
    response_data = None
    session = create_session()
    
    for attempt in range(retry_count + 1):
        try:
            start_time = time.time()
            
            kwargs = {
                'headers': headers,
                'timeout': timeout,
                'verify': False
            }
            
            if method in ['POST', 'PUT', 'PATCH'] and body:
                content_type = headers.get('Content-Type', '')
                if 'application/json' in content_type:
                    try:
                        kwargs['json'] = json.loads(body)
                    except:
                        kwargs['data'] = body
                else:
                    kwargs['data'] = body
            
            response = session.request(method, url, **kwargs)
            elapsed = int((time.time() - start_time) * 1000)
            
            response_body = response.text
            try:
                response_json = response.json()
                response_body_formatted = json.dumps(response_json, ensure_ascii=False, indent=2)
            except:
                response_body_formatted = response_body
            
            raw_request = build_raw_request(method, url, headers, body if isinstance(body, str) else json.dumps(body, ensure_ascii=False, indent=2) if body else '')
            raw_response = build_raw_response(response, response_body)
            
            assertion_passed, assertion_msg = check_assertions(response, response_body, assertions)
            
            response_data = {
                'success': True,
                'status_code': response.status_code,
                'status_text': response.reason,
                'headers': dict(response.headers),
                'body': response_body_formatted,
                'raw_body': response_body,
                'response_time': elapsed,
                'raw_request': raw_request,
                'raw_response': raw_response,
                'assertion_passed': assertion_passed,
                'assertion_msg': assertion_msg
            }
            break
            
        except Exception as e:
            last_error = str(e)
            if attempt < retry_count:
                time.sleep(1)
                continue
            response_data = {
                'success': False,
                'error': last_error
            }
    
    if response_data and response_data.get('success'):
        history = load_json_file(HISTORY_FILE, [])
        history_item = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'method': method,
            'url': data.get('url', ''),
            'headers': headers,
            'body': body,
            'status_code': response_data.get('status_code')
        }
        history.insert(0, history_item)
        history = history[:20]
        save_json_file(HISTORY_FILE, history)
    
    return jsonify(response_data)


@app.route('/api/test-cases', methods=['GET'])
def get_test_cases():
    cases = load_json_file(TEST_CASES_FILE, [])
    return jsonify(cases)


@app.route('/api/test-cases', methods=['POST'])
def save_test_case():
    data = request.json
    cases = load_json_file(TEST_CASES_FILE, [])
    
    if 'id' in data and data['id']:
        for i, case in enumerate(cases):
            if case['id'] == data['id']:
                cases[i] = data
                break
    else:
        data['id'] = str(uuid.uuid4())
        data['created_at'] = datetime.now().isoformat()
        cases.append(data)
    
    save_json_file(TEST_CASES_FILE, cases)
    return jsonify({'success': True, 'id': data['id']})


@app.route('/api/test-cases/<case_id>', methods=['DELETE'])
def delete_test_case(case_id):
    cases = load_json_file(TEST_CASES_FILE, [])
    cases = [c for c in cases if c['id'] != case_id]
    save_json_file(TEST_CASES_FILE, cases)
    return jsonify({'success': True})


@app.route('/api/batch-run', methods=['POST'])
def batch_run():
    data = request.json
    case_ids = data.get('case_ids', [])
    cases = load_json_file(TEST_CASES_FILE, [])
    env_vars = load_json_file(ENV_VARS_FILE, {})
    
    results = []
    session = create_session()
    
    for case in cases:
        if case['id'] in case_ids:
            url = replace_env_vars(case['url'], env_vars)
            headers = case.get('headers', {})
            for key in list(headers.keys()):
                headers[key] = replace_env_vars(headers[key], env_vars)
            
            body = case.get('body', '')
            if isinstance(body, str):
                body = replace_env_vars(body, env_vars)
            
            try:
                start_time = time.time()
                kwargs = {'headers': headers, 'timeout': 30, 'verify': False}
                
                if case['method'] in ['POST', 'PUT', 'PATCH'] and body:
                    content_type = headers.get('Content-Type', '')
                    if 'application/json' in content_type:
                        try:
                            kwargs['json'] = json.loads(body)
                        except:
                            kwargs['data'] = body
                    else:
                        kwargs['data'] = body
                
                response = session.request(case['method'], url, **kwargs)
                elapsed = int((time.time() - start_time) * 1000)
                
                assertion_passed, assertion_msg = check_assertions(
                    response, response.text, case.get('assertions', {})
                )
                
                results.append({
                    'id': case['id'],
                    'name': case.get('name', '未命名'),
                    'url': case['url'],
                    'method': case['method'],
                    'status_code': response.status_code,
                    'response_time': elapsed,
                    'assertion_passed': assertion_passed,
                    'assertion_msg': assertion_msg,
                    'success': True
                })
                
            except Exception as e:
                results.append({
                    'id': case['id'],
                    'name': case.get('name', '未命名'),
                    'url': case['url'],
                    'method': case['method'],
                    'error': str(e),
                    'assertion_passed': False,
                    'success': False
                })
    
    return jsonify({'results': results})


@app.route('/api/history', methods=['GET'])
def get_history():
    history = load_json_file(HISTORY_FILE, [])
    return jsonify(history)


@app.route('/api/history', methods=['DELETE'])
def clear_history():
    save_json_file(HISTORY_FILE, [])
    return jsonify({'success': True})


@app.route('/api/env-vars', methods=['GET'])
def get_env_vars():
    vars_data = load_json_file(ENV_VARS_FILE, {})
    return jsonify(vars_data)


@app.route('/api/env-vars', methods=['POST'])
def save_env_vars():
    data = request.json
    save_json_file(ENV_VARS_FILE, data)
    return jsonify({'success': True})


@app.route('/api/export-postman', methods=['POST'])
def export_postman():
    data = request.json
    case_ids = data.get('case_ids', [])
    cases = load_json_file(TEST_CASES_FILE, [])
    
    postman_collection = {
        'info': {
            'name': 'API Test Cases Export',
            'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        'item': []
    }
    
    for case in cases:
        if case['id'] in case_ids or not case_ids:
            item = {
                'name': case.get('name', '未命名'),
                'request': {
                    'method': case['method'],
                    'header': [{'key': k, 'value': v} for k, v in case.get('headers', {}).items()],
                    'url': {
                        'raw': case['url']
                    }
                }
            }
            
            if case.get('body'):
                item['request']['body'] = {
                    'mode': 'raw',
                    'raw': case['body'],
                    'options': {
                        'raw': {
                            'language': 'json'
                        }
                    }
                }
            
            postman_collection['item'].append(item)
    
    response = Response(
        json.dumps(postman_collection, ensure_ascii=False, indent=2),
        mimetype='application/json'
    )
    response.headers['Content-Disposition'] = 'attachment; filename="postman_collection.json"'
    return response


@app.route('/api/import-postman', methods=['POST'])
def import_postman():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': '未找到文件'})
    
    file = request.files['file']
    try:
        content = json.loads(file.read().decode('utf-8'))
    except:
        return jsonify({'success': False, 'error': '文件格式错误'})
    
    cases = load_json_file(TEST_CASES_FILE, [])
    
    def process_items(items, folder_prefix=''):
        for item in items:
            if 'item' in item:
                process_items(item['item'], folder_prefix + item.get('name', '') + ' / ')
            elif 'request' in item:
                req = item['request']
                headers = {}
                for h in req.get('header', []):
                    if h.get('key') and h.get('value'):
                        headers[h['key']] = h['value']
                
                body = ''
                if req.get('body') and req['body'].get('raw'):
                    body = req['body']['raw']
                
                url = req.get('url', '')
                if isinstance(url, dict):
                    url = url.get('raw', '')
                
                case = {
                    'id': str(uuid.uuid4()),
                    'name': folder_prefix + item.get('name', '导入的用例'),
                    'method': req.get('method', 'GET'),
                    'url': url,
                    'headers': headers,
                    'body': body,
                    'created_at': datetime.now().isoformat()
                }
                cases.append(case)
    
    if 'item' in content:
        process_items(content['item'])
    
    save_json_file(TEST_CASES_FILE, cases)
    return jsonify({'success': True, 'count': len(content.get('item', []))})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
