#!/usr/bin/env python3
import os
import socket
import threading
import paramiko

SFTP_HOST = '127.0.0.1'
SFTP_PORT = 2222
SFTP_USER = 'testuser'
SFTP_PASS = 'testpass'
SFTP_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sftp_test_root')

class StubSFTPServerInterface(paramiko.SFTPServerInterface):
    def __init__(self, server, root):
        self.root = os.path.abspath(root)
        os.makedirs(self.root, exist_ok=True)

    def _realpath(self, path):
        if path.startswith('/'):
            path = path[1:]
        full = os.path.normpath(os.path.join(self.root, path))
        if not full.startswith(self.root):
            return self.root
        return full

    def stat(self, path):
        try:
            return paramiko.SFTPAttributes.from_stat(os.stat(self._realpath(path)))
        except FileNotFoundError:
            return paramiko.SFTP_NO_SUCH_FILE

    def lstat(self, path):
        return self.stat(path)

    def list_folder(self, path):
        full = self._realpath(path)
        try:
            return [
                paramiko.SFTPAttributes.from_stat(
                    os.stat(os.path.join(full, n)), filename=n
                )
                for n in os.listdir(full)
            ]
        except FileNotFoundError:
            return paramiko.SFTP_NO_SUCH_FILE

    def open(self, path, flags, attr):
        full = self._realpath(path)
        try:
            os.makedirs(os.path.dirname(full), exist_ok=True)
            if (flags & os.O_CREAT) and not (flags & os.O_APPEND):
                mode = 'wb'
            elif (flags & os.O_CREAT) and (flags & os.O_APPEND):
                mode = 'ab'
            elif flags & os.O_WRONLY:
                mode = 'wb'
            elif flags & os.O_RDWR:
                mode = 'r+b'
            else:
                mode = 'rb'
            f = open(full, mode)
            handle = paramiko.SFTPHandle(flags)
            handle.readfile = f
            handle.writefile = f
            return handle
        except FileNotFoundError:
            return paramiko.SFTP_NO_SUCH_FILE
        except OSError:
            return paramiko.SFTP_FAILURE

    def mkdir(self, path, attr):
        try:
            os.makedirs(self._realpath(path), exist_ok=True)
            return paramiko.SFTP_OK
        except OSError:
            return paramiko.SFTP_FAILURE

    def rmdir(self, path):
        try:
            os.rmdir(self._realpath(path))
            return paramiko.SFTP_OK
        except OSError:
            return paramiko.SFTP_FAILURE

    def remove(self, path):
        try:
            os.remove(self._realpath(path))
            return paramiko.SFTP_OK
        except OSError:
            return paramiko.SFTP_FAILURE

    def rename(self, oldpath, newpath):
        try:
            os.rename(self._realpath(oldpath), self._realpath(newpath))
            return paramiko.SFTP_OK
        except OSError:
            return paramiko.SFTP_FAILURE

    def canonicalize(self, path):
        if path == '.':
            path = ''
        return '/' + path


class TestSSHServer(paramiko.ServerInterface):
    def check_auth_password(self, username, password):
        if username == SFTP_USER and password == SFTP_PASS:
            return paramiko.AUTH_SUCCESSFUL
        return paramiko.AUTH_FAILED

    def check_channel_request(self, kind, chanid):
        if kind == 'session':
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED


def run_sftp_server():
    os.makedirs(SFTP_ROOT, exist_ok=True)

    host_key = paramiko.RSAKey.generate(2048)

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, True)
    sock.bind((SFTP_HOST, SFTP_PORT))
    sock.listen(5)

    print(f"SFTP test server listening on {SFTP_HOST}:{SFTP_PORT}")
    print(f"  user={SFTP_USER} pass={SFTP_PASS} root={SFTP_ROOT}")

    def serve_client(conn, addr):
        transport = None
        try:
            transport = paramiko.Transport(conn)
            transport.add_server_key(host_key)
            transport.set_subsystem_handler(
                'sftp',
                paramiko.SFTPServer,
                StubSFTPServerInterface,
                SFTP_ROOT,
            )
            transport.start_server(server=TestSSHServer())
            while transport.is_active():
                chan = transport.accept(5)
                if chan is not None:
                    pass
        except paramiko.SSHException as e:
            if 'Error reading SSH protocol banner' not in str(e):
                print(f"  [{addr}] SSH error: {e}")
        except Exception as e:
            pass
        finally:
            if transport:
                try:
                    transport.close()
                except Exception:
                    pass

    try:
        while True:
            conn, addr = sock.accept()
            print(f"  [{addr}] connected")
            t = threading.Thread(target=serve_client, args=(conn, addr), daemon=True)
            t.start()
    except KeyboardInterrupt:
        print("\nShutting down SFTP test server")
    finally:
        sock.close()


if __name__ == '__main__':
    run_sftp_server()
