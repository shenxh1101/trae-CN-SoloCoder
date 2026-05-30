#!/usr/bin/env python3
import subprocess
import sys
import os
import time
import json

def run_cmd(cmd, cwd=None):
    print(f"$ {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return result.returncode
    except Exception as e:
        print(f"Error: {e}")
        return 1

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print("=" * 60)
    print("Port Tester - Complete Test & Run Script")
    print("=" * 60)

    print("\n[1/6] Installing dependencies...")
    rc = run_cmd("pip3 install -r requirements.txt", cwd=base_dir)
    if rc != 0:
        print("WARNING: pip install may have issues, continuing...")

    print("\n[2/6] Syntax check...")
    rc = run_cmd("python3 -m py_compile app.py", cwd=base_dir)
    if rc != 0:
        print("ERROR: Syntax check failed!")
        return 1
    print("✓ Syntax check PASSED")

    print("\n[3/6] Running unit tests...")
    rc = run_cmd("python3 test_app.py", cwd=base_dir)
    if rc != 0:
        print("WARNING: Some tests may have failed")

    print("\n[4/6] Starting Flask app in background...")
    proc = subprocess.Popen(
        ["python3", "app.py"],
        cwd=base_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    print("Waiting 5 seconds for app to start...")
    time.sleep(5)
    
    if proc.poll() is not None:
        stdout, stderr = proc.communicate()
        print("ERROR: App failed to start!")
        print("STDOUT:", stdout)
        print("STDERR:", stderr)
        return 1
    print("✓ App started successfully (PID:", proc.pid, ")")

    print("\n[5/6] Testing API endpoints...")
    import urllib.request
    import urllib.error

    try:
        req = urllib.request.Request('http://localhost:5000/')
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"GET / - Status: {resp.status}")
            if resp.status == 200:
                print("✓ GET / PASSED")
    except Exception as e:
        print(f"✗ GET / FAILED: {e}")

    try:
        data = json.dumps({'target': '127.0.0.1', 'ports': '80', 'timeout': 1}).encode('utf-8')
        req = urllib.request.Request(
            'http://localhost:5000/api/test',
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"POST /api/test - Status: {resp.status}")
            result = json.loads(resp.read().decode('utf-8'))
            print(f"  Result: {json.dumps(result, indent=2)[:200]}...")
            if resp.status == 200:
                print("✓ POST /api/test PASSED")
    except Exception as e:
        print(f"✗ POST /api/test FAILED: {e}")

    try:
        req = urllib.request.Request('http://localhost:5000/history')
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"GET /history - Status: {resp.status}")
            if resp.status == 200:
                print("✓ GET /history PASSED")
    except Exception as e:
        print(f"✗ GET /history FAILED: {e}")

    try:
        req = urllib.request.Request('http://localhost:5000/trend')
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"GET /trend - Status: {resp.status}")
            result = json.loads(resp.read().decode('utf-8'))
            print(f"  Success rate: {result.get('success_rate')}%")
            if resp.status == 200:
                print("✓ GET /trend PASSED")
    except Exception as e:
        print(f"✗ GET /trend FAILED: {e}")

    print("\n[6/6] App is running!")
    print("=" * 60)
    print("App URL: http://localhost:5000")
    print("Press Ctrl+C to stop the app")
    print("=" * 60)

    try:
        proc.wait()
    except KeyboardInterrupt:
        print("\nStopping app...")
        proc.terminate()
        proc.wait()
        print("App stopped.")

    return 0

if __name__ == '__main__':
    sys.exit(main())
