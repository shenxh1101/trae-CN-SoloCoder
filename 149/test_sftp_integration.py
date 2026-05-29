#!/usr/bin/env python3
import os
import sys
import time
import socket
import subprocess
import shutil
import hashlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from folder_encryptor import upload_sftp

SFTP_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sftp_test_root')

def port_open(port, host='127.0.0.1'):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1)
    r = s.connect_ex((host, port))
    s.close()
    return r == 0

def start_server():
    if port_open(2222):
        print("SFTP server already running on :2222")
        return None
    print("Starting SFTP test server ...")
    proc = subprocess.Popen(
        [sys.executable, 'test_sftp_server.py'],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    for _ in range(15):
        time.sleep(0.5)
        if port_open(2222):
            print("  server ready")
            return proc
    proc.kill()
    return None

def stop_server(proc):
    if proc is None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def test_upload_integrity():
    print("\n" + "=" * 60)
    print("TEST 1: Upload file and verify content integrity")
    print("=" * 60)

    payload = b'SFTP integrity check payload ' * 500
    local = 'test_sftp_integrity.bin'
    with open(local, 'wb') as f:
        f.write(payload)
    local_hash = sha256_file(local)

    try:
        ok = upload_sftp(local, '127.0.0.1', 2222, 'testuser', 'testpass', '/upload_test')
        assert ok, "upload_sftp returned False"
        remote = os.path.join(SFTP_ROOT, 'upload_test', local)
        assert os.path.exists(remote), f"remote file missing: {remote}"
        remote_hash = sha256_file(remote)
        assert remote_hash == local_hash, f"hash mismatch: local={local_hash} remote={remote_hash}"
        print(f"  local  SHA256: {local_hash}")
        print(f"  remote SHA256: {remote_hash}")
        print("✅ TEST 1 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ TEST 1 FAILED: {e}")
        return False
    finally:
        if os.path.exists(local):
            os.remove(local)

def test_encrypt_upload_decrypt():
    print("\n" + "=" * 60)
    print("TEST 2: Encrypt → SFTP upload → decrypt → verify")
    print("=" * 60)

    src = 'test_enc_sftp_src'
    shutil.rmtree(src, ignore_errors=True)
    os.makedirs(os.path.join(src, 'sub'), exist_ok=True)
    with open(os.path.join(src, 'a.txt'), 'w') as f: f.write('aaa')
    with open(os.path.join(src, 'sub', 'b.txt'), 'w') as f: f.write('bbb')
    orig_hash_a = sha256_file(os.path.join(src, 'a.txt'))
    orig_hash_b = sha256_file(os.path.join(src, 'sub', 'b.txt'))

    try:
        cmd = [
            sys.executable, 'folder_encryptor.py', 'encrypt',
            '-i', src, '-p', 'mypass',
            '--upload-sftp',
            '--sftp-host', '127.0.0.1', '--sftp-port', '2222',
            '--sftp-user', 'testuser', '--sftp-pass', 'testpass',
            '--sftp-path', '/enc_test',
            '-o', 'enc_sftp_out',
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        assert r.returncode == 0, f"encrypt exit={r.returncode}\nstdout={r.stdout}\nstderr={r.stderr}"
        assert 'SFTP上传完成' in r.stdout, f"'SFTP上传完成' not in output:\n{r.stdout}"

        uploaded = os.path.join(SFTP_ROOT, 'enc_test', 'enc_sftp_out.enc')
        assert os.path.exists(uploaded), f"encrypted file not on server: {uploaded}"
        print(f"  encrypted file uploaded: {uploaded} ({os.path.getsize(uploaded)} bytes)")

        dec_dir = 'dec_sftp_out'
        shutil.rmtree(dec_dir, ignore_errors=True)
        cmd2 = [
            sys.executable, 'folder_encryptor.py', 'decrypt',
            '-i', uploaded, '-p', 'mypass', '-o', dec_dir,
        ]
        r2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=15)
        assert r2.returncode == 0, f"decrypt exit={r2.returncode}\n{r2.stdout}"

        dec_hash_a = sha256_file(os.path.join(dec_dir, src, 'a.txt'))
        dec_hash_b = sha256_file(os.path.join(dec_dir, src, 'sub', 'b.txt'))
        assert dec_hash_a == orig_hash_a, "a.txt hash mismatch after round-trip"
        assert dec_hash_b == orig_hash_b, "sub/b.txt hash mismatch after round-trip"
        print(f"  a.txt     SHA256: {dec_hash_a} {'✓' if dec_hash_a == orig_hash_a else '✗'}")
        print(f"  sub/b.txt SHA256: {dec_hash_b} {'✓' if dec_hash_b == orig_hash_b else '✗'}")
        print("✅ TEST 2 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ TEST 2 FAILED: {e}")
        return False
    finally:
        shutil.rmtree(src, ignore_errors=True)
        shutil.rmtree('dec_sftp_out', ignore_errors=True)
        for f in ['enc_sftp_out.enc']:
            if os.path.exists(f):
                os.remove(f)

def test_batch_upload():
    print("\n" + "=" * 60)
    print("TEST 3: Batch encrypt with SFTP upload")
    print("=" * 60)

    folders = ['batch_a', 'batch_b']
    for f in folders:
        shutil.rmtree(f, ignore_errors=True)
        os.makedirs(f, exist_ok=True)
        with open(os.path.join(f, 'data.txt'), 'w') as fp:
            fp.write(f'data from {f}')
    hashes = {f: sha256_file(os.path.join(f, 'data.txt')) for f in folders}

    list_file = 'batch_list.txt'
    with open(list_file, 'w') as fp:
        fp.write('\n'.join(folders))
    out_dir = 'batch_sftp_out'
    shutil.rmtree(out_dir, ignore_errors=True)
    dec_dir = 'batch_dec'

    try:
        cmd = [
            sys.executable, 'folder_encryptor.py', 'batch',
            '--folder-list', list_file, '-p', 'batchpw',
            '--upload-sftp',
            '--sftp-host', '127.0.0.1', '--sftp-port', '2222',
            '--sftp-user', 'testuser', '--sftp-pass', 'testpass',
            '--sftp-path', '/batch_test',
            '-o', out_dir,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        assert r.returncode == 0, f"batch exit={r.returncode}\n{r.stdout}"
        assert 'SFTP批量上传完成' in r.stdout, f"'SFTP批量上传完成' not in output:\n{r.stdout}"

        for f in folders:
            remote_enc = os.path.join(SFTP_ROOT, 'batch_test', f + '.enc')
            assert os.path.exists(remote_enc), f"{f}.enc not found on server"
            print(f"  {f}.enc uploaded ✓ ({os.path.getsize(remote_enc)} bytes)")

        shutil.rmtree(dec_dir, ignore_errors=True)
        os.makedirs(dec_dir, exist_ok=True)
        for f in folders:
            remote_enc = os.path.join(SFTP_ROOT, 'batch_test', f + '.enc')
            cmd2 = [
                sys.executable, 'folder_encryptor.py', 'decrypt',
                '-i', remote_enc, '-p', 'batchpw', '-o', dec_dir,
            ]
            r2 = subprocess.run(cmd2, capture_output=True, text=True, timeout=15)
            assert r2.returncode == 0, f"decrypt {f} failed: {r2.stdout}"
            dec_file = os.path.join(dec_dir, f, 'data.txt')
            dec_hash = sha256_file(dec_file)
            assert dec_hash == hashes[f], f"{f}/data.txt hash mismatch"
            print(f"  {f}/data.txt verified ✓")

        print("✅ TEST 3 PASSED")
        return True
    except AssertionError as e:
        print(f"❌ TEST 3 FAILED: {e}")
        return False
    finally:
        for f in folders:
            shutil.rmtree(f, ignore_errors=True)
        for f in [list_file, out_dir, dec_dir]:
            if os.path.isdir(f):
                shutil.rmtree(f, ignore_errors=True)
            elif os.path.isfile(f):
                os.remove(f)

def test_error_handling():
    print("\n" + "=" * 60)
    print("TEST 4: Error handling")
    print("=" * 60)

    tmp = 'err_test.bin'
    with open(tmp, 'wb') as f:
        f.write(b'x')
    try:
        checks = []

        r = upload_sftp(tmp, '127.0.0.1', 2222, 'testuser', 'WRONG', '/')
        checks.append(('wrong password → False', r is False))

        r = upload_sftp(tmp, '127.0.0.1', 2222, 'noone', 'testpass', '/')
        checks.append(('wrong user → False', r is False))

        r = upload_sftp(tmp, '127.0.0.1', 9999, 'testuser', 'testpass', '/')
        checks.append(('bad port → False', r is False))

        r = upload_sftp(tmp, '192.0.2.1', 22, 'u', 'p', '/')
        checks.append(('unreachable host → False', r is False))

        cmd = [sys.executable, 'folder_encryptor.py', 'encrypt',
               '-i', tmp, '-p', 'pw', '--upload-sftp']
        rp = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        ok = '需要指定 --sftp-host、--sftp-user 和 --sftp-pass' in rp.stdout
        checks.append(('CLI missing params → error msg', ok))

        cmd = [sys.executable, 'folder_encryptor.py', 'batch',
               '-i', tmp, '-p', 'pw', '--upload-sftp']
        rp = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        ok = '需要指定 --sftp-host、--sftp-user 和 --sftp-pass' in rp.stdout
        checks.append(('batch missing params → error msg', ok))

        all_ok = True
        for label, ok in checks:
            status = '✅' if ok else '❌'
            print(f"  {status} {label}")
            if not ok:
                all_ok = False

        if all_ok:
            print("✅ TEST 4 PASSED")
        else:
            print("❌ TEST 4 FAILED")
        return all_ok
    finally:
        os.remove(tmp)

def main():
    print("=" * 60)
    print("SFTP Integration Tests")
    print("=" * 60)

    shutil.rmtree(SFTP_ROOT, ignore_errors=True)
    server_proc = start_server()

    if not port_open(2222):
        print("\nFATAL: Cannot start SFTP server – aborting")
        return 1

    results = [
        test_upload_integrity(),
        test_encrypt_upload_decrypt(),
        test_batch_upload(),
        test_error_handling(),
    ]

    stop_server(server_proc)

    print("\n" + "=" * 60)
    passed = sum(results)
    total  = len(results)
    print(f"Results: {passed}/{total} passed")
    if passed == total:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 60)
    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
