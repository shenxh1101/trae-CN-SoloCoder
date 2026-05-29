#!/usr/bin/env python3
import subprocess
import sys
import os

script_path = os.path.join(os.path.dirname(__file__), "verify.py")
log_path = os.path.join(os.path.dirname(__file__), "verify_output.log")

print(f"Running verification script: {script_path}")
print(f"Output will be logged to: {log_path}")

try:
    with open(log_path, 'w') as log_file:
        result = subprocess.run(
            [sys.executable, script_path],
            stdout=log_file,
            stderr=log_file,
            cwd=os.path.dirname(__file__),
            timeout=30
        )
    
    with open(log_path, 'r') as log_file:
        output = log_file.read()
    
    print("\n" + "=" * 70)
    print("  VERIFICATION OUTPUT")
    print("=" * 70)
    print(output)
    print(f"Exit code: {result.returncode}")
    
    if result.returncode == 0:
        print("\n✓ Verification PASSED")
    else:
        print("\n✗ Verification FAILED")
        sys.exit(1)
        
except subprocess.TimeoutExpired:
    print("✗ Verification timed out")
    sys.exit(1)
except Exception as e:
    print(f"✗ Error running verification: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
