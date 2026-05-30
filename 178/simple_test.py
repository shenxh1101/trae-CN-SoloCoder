import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing imports...")
from app import app, init_app, tcp_port_test
import json

print("Initializing app...")
init_app()

app.config['TESTING'] = True
client = app.test_client()

print("\n=== Testing GET / ===")
response = client.get('/')
print(f"Status: {response.status_code}")
print(f"Content-Type: {response.content_type}")

print("\n=== Testing POST /api/test ===")
response = client.post('/api/test', json={"target": "127.0.0.1", "ports": "80"})
print(f"Status: {response.status_code}")
print(f"Response: {json.dumps(response.get_json(), indent=2)}")

print("\n=== Testing direct tcp_port_test ===")
result = tcp_port_test("127.0.0.1", 80, timeout=2)
print(f"Direct test result: {json.dumps(result, indent=2)}")
