#!/usr/bin/env python3
import json
import time
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_tcp_port_test():
    from app import tcp_port_test, parse_ports
    
    print("  Testing tcp_port_test with 127.0.0.1:22...")
    result = tcp_port_test("127.0.0.1", 22, timeout=1)
    assert 'success' in result
    assert 'target' in result
    assert 'port' in result
    assert 'latency_ms' in result
    assert 'error' in result
    assert result['target'] == '127.0.0.1'
    assert result['port'] == 22
    print(f"    Result: success={result['success']}, latency={result['latency_ms']}ms, error={result['error']}")
    
    print("  Testing tcp_port_test with invalid hostname...")
    result = tcp_port_test("invalid.host.that.does.not.exist", 80, timeout=1)
    assert result['success'] == False
    assert result['error'] is not None
    print(f"    Result: success={result['success']}, error={result['error']}")
    
    print("  PASSED")

def test_parse_ports():
    from app import parse_ports
    
    print("  Testing parse_ports...")
    assert parse_ports("80,443,22") == [80, 443, 22]
    assert parse_ports("80") == [80]
    assert parse_ports("80, 443, 22") == [80, 443, 22]
    assert parse_ports("") == []
    assert parse_ports("abc") == []
    assert parse_ports("80,abc,443") == [80, 443]
    print("  PASSED")

def test_add_to_history():
    from app import test_history, add_to_history
    
    print("  Testing add_to_history...")
    initial_len = len(test_history)
    result = {'success': True, 'target': 'test.com', 'port': 80, 'latency_ms': 10.5, 'error': None}
    record = add_to_history(result)
    assert 'timestamp' in record
    assert record['target'] == 'test.com'
    assert len(test_history) == initial_len + 1
    print("  PASSED")

def test_check_consecutive_failures():
    from app import check_consecutive_failures, consecutive_failures
    
    print("  Testing check_consecutive_failures...")
    consecutive_failures.clear()
    
    check_consecutive_failures("test.com", 80, False)
    assert consecutive_failures["test.com:80"] == 1
    
    check_consecutive_failures("test.com", 80, False)
    assert consecutive_failures["test.com:80"] == 2
    
    check_consecutive_failures("test.com", 80, False)
    assert consecutive_failures["test.com:80"] == 3
    
    check_consecutive_failures("test.com", 80, True)
    assert consecutive_failures["test.com:80"] == 0
    
    print("  PASSED")

def test_flask_app():
    from app import app
    
    print("  Testing Flask app routes...")
    app.config['TESTING'] = True
    client = app.test_client()
    
    print("  Testing GET / ...")
    response = client.get('/')
    assert response.status_code == 200
    print("    PASSED")
    
    print("  Testing POST /test ...")
    response = client.post('/test', data={'target': '127.0.0.1', 'ports': '22', 'timeout': '1'})
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    assert len(data['results']) > 0
    print(f"    Result: {json.dumps(data['results'][0], indent=2)}")
    print("    PASSED")
    
    print("  Testing POST /api/test ...")
    response = client.post('/api/test', 
                          json={'target': '127.0.0.1', 'ports': '22', 'timeout': 1},
                          content_type='application/json')
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    print(f"    Result: {json.dumps(data['results'][0], indent=2)}")
    print("    PASSED")
    
    print("  Testing POST /api/test with missing data ...")
    response = client.post('/api/test', json={}, content_type='application/json')
    assert response.status_code == 400
    print("    PASSED")
    
    print("  Testing GET /history ...")
    response = client.get('/history')
    assert response.status_code == 200
    data = response.get_json()
    assert 'history' in data
    print(f"    History count: {len(data['history'])}")
    print("    PASSED")
    
    print("  Testing GET /trend ...")
    response = client.get('/trend')
    assert response.status_code == 200
    data = response.get_json()
    assert 'success_rate' in data
    assert 'total_tests' in data
    print(f"    Success rate: {data['success_rate']}%")
    print("    PASSED")
    
    print("  Testing GET /chart/data ...")
    response = client.get('/chart/data?target=127.0.0.1&port=22')
    assert response.status_code == 200
    data = response.get_json()
    assert 'data' in data
    print(f"    Data points: {len(data['data'])}")
    print("    PASSED")
    
    print("  Testing GET /export/csv ...")
    response = client.get('/export/csv')
    assert response.status_code == 200
    assert response.content_type == 'text/csv; charset=utf-8'
    print("    PASSED")
    
    print("  Testing POST /scheduled/add ...")
    response = client.post('/scheduled/add',
                          json={'job_id': 'test_job_1', 'target': '127.0.0.1', 'ports': '22', 'cron': '*/5 * * * *', 'timeout': 1},
                          content_type='application/json')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    print(f"    Job added: {json.dumps(data['job'], indent=2)}")
    print("    PASSED")
    
    print("  Testing GET /scheduled ...")
    response = client.get('/scheduled')
    assert response.status_code == 200
    data = response.get_json()
    assert 'jobs' in data
    assert 'test_job_1' in data['jobs']
    print("    PASSED")
    
    print("  Testing DELETE /scheduled/remove/test_job_1 ...")
    response = client.delete('/scheduled/remove/test_job_1')
    assert response.status_code == 200
    print("    PASSED")
    
    print("  Testing POST /batch ...")
    import io
    file_content = "127.0.0.1:22\n# comment line\n"
    file_storage = io.BytesIO(file_content.encode('utf-8'))
    response = client.post('/batch', data={
        'file': (file_storage, 'test_servers.txt'),
        'timeout': '1'
    }, content_type='multipart/form-data')
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    print(f"    Batch results count: {len(data['results'])}")
    print("    PASSED")

def main():
    os.environ['SECRET_KEY'] = 'test-secret'
    
    ensure_log_dir_fn = None
    from app import ensure_log_dir
    ensure_log_dir()
    
    tests = [
        ("tcp_port_test", test_tcp_port_test),
        ("parse_ports", test_parse_ports),
        ("add_to_history", test_add_to_history),
        ("check_consecutive_failures", test_check_consecutive_failures),
        ("Flask app routes", test_flask_app),
    ]
    
    print("=" * 60)
    print("Running Port Tester Test Suite")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for name, test_fn in tests:
        print(f"\n--- Test: {name} ---")
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"  FAILED: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 60)
    
    return 0 if failed == 0 else 1

if __name__ == '__main__':
    sys.exit(main())
