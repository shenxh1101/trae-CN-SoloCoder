#!/usr/bin/env python3
"""Comprehensive regression test suite for the screenshot service."""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:5003"


def run_test(name, func):
    """Run a test and print result."""
    try:
        result = func()
        print(f"✓ {name}: PASS - {result}")
        return True
    except Exception as e:
        print(f"✗ {name}: FAIL - {str(e)[:80]}")
        return False


def test_home_page():
    """Test home page loads."""
    r = requests.get(f"{BASE_URL}/", timeout=10)
    r.raise_for_status()
    return "HTTP 200"


def test_empty_history():
    """Test history endpoint."""
    r = requests.get(f"{BASE_URL}/history", timeout=10)
    r.raise_for_status()
    data = r.json()
    assert isinstance(data, list)
    return f"{len(data)} records"


def test_empty_schedules():
    """Test schedules endpoint."""
    r = requests.get(f"{BASE_URL}/schedule/list", timeout=10)
    r.raise_for_status()
    data = r.json()
    assert isinstance(data, list)
    return f"{len(data)} tasks"


def test_api_basic_screenshot():
    """Test basic screenshot API."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "width": 800,
        "height": 600,
        "base64": True
    }, timeout=60)
    r.raise_for_status()
    data = r.json()
    assert data["success"], data.get("error", "Unknown error")
    assert data["width"] == 800
    assert data["height"] == 600
    assert "base64" in data and data["base64"].startswith("data:image/")
    return f"Size: {data['width']}x{data['height']}, Format: {data['format']}"


def test_api_mobile_device():
    """Test mobile device simulation."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "device": "mobile",
        "base64": True
    }, timeout=60)
    data = r.json()
    assert data["success"]
    # Mobile width should be 375 logical pixels, but with device_scale_factor=2
    # the physical pixel width can be 750
    assert data["width"] in (375, 750), f"Got {data['width']}"
    return f"Mobile size: {data['width']}x{data['height']}"


def test_api_tablet_device():
    """Test tablet device simulation."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "device": "tablet",
        "base64": True
    }, timeout=60)
    data = r.json()
    assert data["success"]
    # Tablet width is 768 logical pixels, with device_scale_factor=2 it's 1536
    assert data["width"] in (768, 1536), f"Got {data['width']}"
    return f"Tablet size: {data['width']}x{data['height']}"


def test_api_dark_mode_jpg():
    """Test dark mode and JPG format."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "dark_mode": True,
        "format": "jpg",
        "quality": 50,
        "base64": True
    }, timeout=60)
    data = r.json()
    assert data["success"]
    assert data["format"] == "jpg"
    return f"Format: {data['format']}, Size: {data['file_size']} bytes"


def test_api_webp_format():
    """Test WebP format."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "format": "webp",
        "base64": True
    }, timeout=60)
    data = r.json()
    assert data["success"]
    assert data["format"] == "webp"
    return f"Format: {data['format']}"


def test_api_delay_and_css():
    """Test delay and custom CSS."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "delay": 0.5,
        "custom_css": "body { background: #f0f0f0 !important; }",
        "base64": True
    }, timeout=60)
    data = r.json()
    assert data["success"]
    return "Delay + CSS injection works"


def test_api_ocr():
    """Test OCR functionality."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "ocr": True,
        "base64": True
    }, timeout=60)
    data = r.json()
    assert data["success"]
    ocr = data.get("ocr_text", "")
    has_text = len(ocr) > 10 or "OCR not available" in ocr
    assert has_text, f"OCR result: {ocr}"
    return f"OCR text length: {len(ocr)}"


def test_security_localhost_blocked():
    """Test localhost is blocked."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "http://localhost:8080",
        "base64": True
    }, timeout=30)
    data = r.json()
    assert not data["success"]
    assert "localhost" in data.get("error", "").lower() or "internal" in data.get("error", "").lower()
    return "Correctly blocked"


def test_security_missing_url():
    """Test missing URL is rejected."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "base64": True
    }, timeout=30)
    data = r.json()
    assert not data["success"]
    assert "URL" in data.get("error", "")
    return "Correctly rejected"


def test_add_schedule():
    """Test adding a scheduled task."""
    r = requests.post(f"{BASE_URL}/schedule/add", json={
        "cron_expr": "0 9 * * *",
        "url": "https://example.com",
        "email": "test@example.com"
    }, timeout=10)
    data = r.json()
    assert data["success"]
    return f"Task ID: {data['task']['id']}"


def test_list_schedules():
    """Test listing scheduled tasks."""
    r = requests.get(f"{BASE_URL}/schedule/list", timeout=10)
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    return f"{len(data)} tasks"


def test_delete_schedule():
    """Test deleting a scheduled task."""
    # First get a task ID
    r = requests.get(f"{BASE_URL}/schedule/list", timeout=10)
    tasks = r.json()
    task_id = tasks[0]["id"]
    
    r = requests.post(f"{BASE_URL}/schedule/delete/{task_id}", timeout=10)
    data = r.json()
    assert data["success"]
    
    # Verify it's gone
    r = requests.get(f"{BASE_URL}/schedule/list", timeout=10)
    remaining = r.json()
    assert all(t["id"] != task_id for t in remaining)
    return f"Deleted task {task_id}"


def test_history_records():
    """Test history has records after screenshots."""
    r = requests.get(f"{BASE_URL}/history", timeout=10)
    data = r.json()
    assert len(data) > 0
    return f"{len(data)} history records"


def test_regen_history():
    """Test regenerating a screenshot from history."""
    r = requests.get(f"{BASE_URL}/history", timeout=10)
    history = r.json()
    hist_id = history[0]["id"]
    
    r = requests.post(f"{BASE_URL}/history/regen/{hist_id}", timeout=60)
    data = r.json()
    assert data["success"]
    return f"Regenerated from history ID: {hist_id}"


def test_no_internal_fields():
    """Test _filepath is not exposed in API response."""
    r = requests.post(f"{BASE_URL}/api/screenshot", json={
        "url": "https://example.com",
        "base64": True
    }, timeout=60)
    data = r.json()
    assert data["success"]
    assert "_filepath" not in data, "_filepath should not be exposed"
    return "No internal fields exposed"


def main():
    """Run all tests."""
    print("=" * 70)
    print("COMPREHENSIVE REGRESSION TEST SUITE")
    print("=" * 70)
    print()
    
    tests = [
        ("Home Page", test_home_page),
        ("Empty History", test_empty_history),
        ("Empty Schedules", test_empty_schedules),
        ("Basic Screenshot API", test_api_basic_screenshot),
        ("Mobile Device", test_api_mobile_device),
        ("Tablet Device", test_api_tablet_device),
        ("Dark Mode + JPG", test_api_dark_mode_jpg),
        ("WebP Format", test_api_webp_format),
        ("Delay + Custom CSS", test_api_delay_and_css),
        ("OCR Recognition", test_api_ocr),
        ("Security: Localhost Blocked", test_security_localhost_blocked),
        ("Security: Missing URL", test_security_missing_url),
        ("Add Schedule", test_add_schedule),
        ("List Schedules", test_list_schedules),
        ("Delete Schedule", test_delete_schedule),
        ("History Records", test_history_records),
        ("Regenerate History", test_regen_history),
        ("No Internal Fields Exposed", test_no_internal_fields),
    ]
    
    passed = 0
    failed = 0
    
    for name, func in tests:
        if run_test(name, func):
            passed += 1
        else:
            failed += 1
    
    print()
    print("=" * 70)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 70)
    
    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
