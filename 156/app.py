import uuid
import json
import socket
import threading
import os
import sys
import base64
import argparse
import random
import string
import signal
from datetime import datetime


def generate_room_id():
    return uuid.uuid4().hex[:8].upper()


def generate_password(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))


def now_ts():
    return datetime.now().strftime('%H:%M:%S')


class JsonStream:
    def __init__(self, sock):
        self.sock = sock
        self._lock = threading.Lock()
        self._buf = b''
        self._rfile = None
        try:
            self._rfile = self.sock.makefile('rb')
        except Exception:
            pass

    def connect(self, addr):
        self.sock.connect(addr)
        try:
            self._rfile = self.sock.makefile('rb')
        except Exception:
            pass

    def send(self, obj):
        with self._lock:
            try:
                data = (json.dumps(obj, ensure_ascii=False) + '\n').encode('utf-8')
                self.sock.sendall(data)
                return True
            except Exception:
                return False

    def recv(self):
        try:
            if self._rfile:
                line = self._rfile.readline()
                if not line:
                    return None
                return json.loads(line.decode('utf-8').strip())
            while True:
                chunk = self.sock.recv(4096)
                if not chunk:
                    return None
                self._buf += chunk
                while b'\n' in self._buf:
                    line, self._buf = self._buf.split(b'\n', 1)
                    stripped = line.decode('utf-8').strip()
                    if stripped:
                        return json.loads(stripped)
        except Exception:
            return None

    def close(self):
        try:
            if self._rfile:
                try:
                    self._rfile.close()
                except Exception:
                    pass
                self._rfile = None
            self.sock.close()
        except Exception:
            pass


class ChatServer:
    def __init__(self, host='0.0.0.0', port=9527):
        self.host = host
        self.port = port
        self.room_id = generate_room_id()
        self.password = generate_password()
        self.clients = {}
        self.nicknames = {}
        self.history = []
        self.lock = threading.Lock()
        self.pending_files = {}
        self.running = True

    def start(self):
        def handle_signal(signum, frame):
            self.running = False
            print('\n正在关闭服务器...')
            with self.lock:
                conns = list(self.clients.keys())
            for c in conns:
                try:
                    c.close()
                except Exception:
                    pass
            sys.exit(0)

        if threading.current_thread() is threading.main_thread():
            try:
                signal.signal(signal.SIGINT, handle_signal)
                signal.signal(signal.SIGTERM, handle_signal)
            except Exception:
                pass

        server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_sock.bind((self.host, self.port))
        server_sock.listen(20)

        print('=' * 50)
        print('  临时聊天室服务端已启动')
        print('=' * 50)
        print(f'  房间号: {self.room_id}')
        print(f'  密  码: {self.password}')
        print(f'  地  址: {self.host}:{self.port}')
        print('=' * 50)
        print('  等待用户加入...')
        print()

        while self.running:
            try:
                conn, addr = server_sock.accept()
                if not self.running:
                    conn.close()
                    break
                t = threading.Thread(target=self._handle_client, args=(conn, addr), daemon=True)
                t.start()
            except Exception:
                break

    def _handle_client(self, conn, addr):
        stream = JsonStream(conn)
        nickname = None
        try:
            msg = stream.recv()
            if not msg or msg.get('type') != 'join':
                stream.close()
                return

            if msg.get('room_id') != self.room_id or msg.get('password') != self.password:
                stream.send({'type': 'join_fail', 'reason': '房间号或密码错误'})
                stream.close()
                return

            nickname = msg.get('nickname', '').strip()
            if not nickname:
                stream.send({'type': 'join_fail', 'reason': '昵称不能为空'})
                stream.close()
                return

            with self.lock:
                if nickname in self.nicknames:
                    stream.send({'type': 'join_fail', 'reason': '昵称已被使用'})
                    stream.close()
                    return
                self.clients[conn] = (nickname, stream)
                self.nicknames[nickname] = conn

            with self.lock:
                history_copy = list(self.history)
                members = [n for n, _ in self.clients.values()]

            stream.send({
                'type': 'join_ok',
                'history': history_copy,
                'members': members
            })

            join_msg = {
                'type': 'system',
                'text': f'【{nickname}】加入了聊天室',
                'timestamp': now_ts()
            }
            self._add_history(join_msg)
            self._broadcast(join_msg, exclude=conn)

            print(f'[{now_ts()}] {nickname} 加入 ({addr[0]}:{addr[1]})')
            self._client_loop(conn, nickname, stream)
        except Exception:
            pass
        finally:
            self._remove_client(conn, nickname)

    def _client_loop(self, conn, nickname, stream):
        while self.running:
            msg = stream.recv()
            if msg is None:
                break

            msg_type = msg.get('type')

            if msg_type == 'msg':
                text = msg.get('text', '').strip()
                if not text:
                    continue
                broadcast_msg = {
                    'type': 'msg',
                    'from': nickname,
                    'text': text,
                    'timestamp': now_ts()
                }
                self._add_history(broadcast_msg)
                self._broadcast(broadcast_msg, exclude=conn)

            elif msg_type == 'private':
                target = msg.get('target', '').strip()
                text = msg.get('text', '').strip()
                if not target or not text:
                    continue
                target_stream = self._get_stream(target)
                if not target_stream:
                    stream.send({'type': 'error', 'text': f'用户 {target} 不在线'})
                    continue
                target_stream.send({
                    'type': 'private',
                    'from': nickname,
                    'text': text,
                    'timestamp': now_ts()
                })
                stream.send({
                    'type': 'private_sent',
                    'to': target,
                    'text': text,
                    'timestamp': now_ts()
                })

            elif msg_type == 'members':
                with self.lock:
                    members = [n for n, _ in self.clients.values()]
                stream.send({
                    'type': 'members',
                    'list': members,
                    'timestamp': now_ts()
                })

            elif msg_type == 'file_offer':
                target = msg.get('target', '').strip()
                filename = msg.get('filename', '').strip()
                filesize = msg.get('filesize', 0)
                request_id = msg.get('request_id', '')
                if not target or not filename:
                    continue
                target_stream = self._get_stream(target)
                if not target_stream:
                    stream.send({'type': 'error', 'text': f'用户 {target} 不在线'})
                    continue
                transfer_id = uuid.uuid4().hex[:12]
                self.pending_files[transfer_id] = {
                    'sender': nickname,
                    'sender_stream': stream,
                    'target': target,
                    'target_stream': target_stream,
                    'filename': filename,
                    'filesize': filesize
                }
                target_stream.send({
                    'type': 'file_offer',
                    'from': nickname,
                    'filename': filename,
                    'filesize': filesize,
                    'transfer_id': transfer_id
                })
                stream.send({
                    'type': 'file_offer_ack',
                    'transfer_id': transfer_id,
                    'request_id': request_id,
                    'target': target,
                    'filename': filename
                })

            elif msg_type == 'file_accept':
                transfer_id = msg.get('transfer_id', '')
                pf = self.pending_files.get(transfer_id)
                if not pf:
                    continue
                pf['sender_stream'].send({
                    'type': 'file_accept',
                    'transfer_id': transfer_id
                })

            elif msg_type == 'file_reject':
                transfer_id = msg.get('transfer_id', '')
                pf = self.pending_files.pop(transfer_id, None)
                if not pf:
                    continue
                pf['sender_stream'].send({
                    'type': 'file_reject',
                    'transfer_id': transfer_id
                })

            elif msg_type == 'file_data':
                transfer_id = msg.get('transfer_id', '')
                pf = self.pending_files.get(transfer_id)
                if not pf:
                    continue
                pf['target_stream'].send({
                    'type': 'file_data',
                    'from': nickname,
                    'filename': pf['filename'],
                    'data': msg.get('data', ''),
                    'transfer_id': transfer_id
                })
                self.pending_files.pop(transfer_id, None)
                notify = {
                    'type': 'system',
                    'text': f'{nickname} 向 {pf["target"]} 发送了文件 {pf["filename"]}',
                    'timestamp': now_ts()
                }
                self._add_history(notify)
                self._broadcast(notify)

    def _get_stream(self, nickname):
        with self.lock:
            entry = self.clients.get(self.nicknames.get(nickname))
        if entry:
            return entry[1]
        return None

    def _add_history(self, msg):
        with self.lock:
            self.history.append(msg)
            if len(self.history) > 50:
                self.history = self.history[-50:]

    def _broadcast(self, msg, exclude=None):
        with self.lock:
            targets = [(n, s) for c, (n, s) in self.clients.items() if c != exclude]
        for name, stream in targets:
            stream.send(msg)

    def _remove_client(self, conn, nickname_hint=None):
        with self.lock:
            entry = self.clients.pop(conn, None)
            if entry:
                nickname = entry[0]
                self.nicknames.pop(nickname, None)
            else:
                nickname = nickname_hint
        if nickname:
            leave_msg = {
                'type': 'system',
                'text': f'【{nickname}】离开了聊天室',
                'timestamp': now_ts()
            }
            self._add_history(leave_msg)
            self._broadcast(leave_msg)
            print(f'[{now_ts()}] {nickname} 离开')
        if entry:
            entry[1].close()


class ChatClient:
    def __init__(self, host, port, room_id, nickname, password):
        self.host = host
        self.port = port
        self.room_id = room_id
        self.nickname = nickname
        self.password = password
        self.sock = None
        self.stream = None
        self.running = False
        self.print_lock = threading.Lock()
        self.input_lock = threading.Lock()
        self.outgoing_files = {}
        self.incoming_files = {}
        self._awaiting_ack = {}
        self._file_send_queue = []
        self._file_send_event = threading.Event()

    def _safe_print(self, *args, **kwargs):
        with self.print_lock:
            print('\r\033[K', end='')
            print(*args, **kwargs)
            print('> ', end='', flush=True)

    def start(self):
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.stream = JsonStream(self.sock)
            self.stream.connect((self.host, self.port))
        except Exception as e:
            print(f'连接失败: {e}')
            return

        self.stream.send({
            'type': 'join',
            'room_id': self.room_id,
            'nickname': self.nickname,
            'password': self.password
        })

        response = self.stream.recv()
        if not response:
            print('连接异常断开')
            return

        if response.get('type') == 'join_fail':
            print(f'加入失败: {response.get("reason", "未知错误")}')
            self.stream.close()
            return

        print('=' * 50)
        print(f'  已加入聊天室 [{self.room_id}]')
        print(f'  你的昵称: {self.nickname}')
        print('=' * 50)

        if response.get('history'):
            print('\n--- 聊天历史 ---')
            for h in response['history']:
                self._display_history(h)
            print('--- 历史结束 ---\n')

        if response.get('members'):
            print(f'在线成员: {", ".join(response["members"])}\n')

        self.running = True
        recv_thread = threading.Thread(target=self._receive_loop, daemon=True)
        recv_thread.start()

        file_thread = threading.Thread(target=self._file_sender_loop, daemon=True)
        file_thread.start()

        self._input_loop()

    def _file_sender_loop(self):
        while self.running:
            self._file_send_event.wait(timeout=1)
            if not self.running:
                break
            if not self._file_send_event.is_set():
                continue
            self._file_send_event.clear()
            while True:
                with self.print_lock:
                    if self._file_send_queue:
                        transfer_id = self._file_send_queue.pop(0)
                    else:
                        break
                try:
                    self._do_send_file_data(transfer_id)
                except Exception as e:
                    self._safe_print(f'❌ 文件发送失败: {e}')

    def _receive_loop(self):
        while self.running:
            msg = self.stream.recv()
            if msg is None:
                self.running = False
                self._safe_print('\n与服务器的连接已断开。按回车退出。')
                break
            self._handle_message(msg)

    def _handle_message(self, msg):
        msg_type = msg.get('type')

        if msg_type == 'msg':
            ts = msg.get('timestamp', '')
            sender = msg.get('from', '')
            text = msg.get('text', '')
            self._safe_print(f'[{ts}] {sender}: {text}')

        elif msg_type == 'private':
            ts = msg.get('timestamp', '')
            sender = msg.get('from', '')
            text = msg.get('text', '')
            self._safe_print(f'[{ts}] 📩 {sender} (私聊): {text}')

        elif msg_type == 'private_sent':
            ts = msg.get('timestamp', '')
            target = msg.get('to', '')
            text = msg.get('text', '')
            self._safe_print(f'[{ts}] 📩 你 -> {target} (私聊): {text}')

        elif msg_type == 'system':
            ts = msg.get('timestamp', '')
            text = msg.get('text', '')
            self._safe_print(f'[{ts}] 💡 {text}')

        elif msg_type == 'members':
            ts = msg.get('timestamp', '')
            members = msg.get('list', [])
            self._safe_print(f'[{ts}] 在线成员({len(members)}人): {", ".join(members)}')

        elif msg_type == 'error':
            self._safe_print(f'⚠️ {msg.get("text", "")}')

        elif msg_type == 'file_offer_ack':
            transfer_id = msg.get('transfer_id', '')
            request_id = msg.get('request_id', '')
            target = msg.get('target', '')
            filename = msg.get('filename', '')
            pending = self._awaiting_ack.pop(request_id, None)
            if pending:
                self.outgoing_files[transfer_id] = pending
            self._safe_print(f'已向 {target} 发送文件 {filename}，等待对方确认...')

        elif msg_type == 'file_offer':
            sender = msg.get('from', '')
            filename = msg.get('filename', '')
            filesize = msg.get('filesize', 0)
            transfer_id = msg.get('transfer_id', '')
            size_str = self._format_filesize(filesize)
            self._safe_print(f'\n📦 {sender} 向你发送文件: {filename} ({size_str})')
            self._safe_print(f'   输入 /accept {transfer_id[:6]} 接受，或 /reject {transfer_id[:6]} 拒绝')
            self.incoming_files[transfer_id] = {
                'sender': sender,
                'filename': filename,
                'filesize': filesize
            }

        elif msg_type == 'file_accept':
            transfer_id = msg.get('transfer_id', '')
            self._safe_print('✅ 对方已接受文件传输，正在发送...')
            with self.print_lock:
                self._file_send_queue.append(transfer_id)
                self._file_send_event.set()

        elif msg_type == 'file_reject':
            transfer_id = msg.get('transfer_id', '')
            self._safe_print('❌ 对方拒绝了文件传输')
            self.outgoing_files.pop(transfer_id, None)

        elif msg_type == 'file_data':
            sender = msg.get('from', '')
            filename = msg.get('filename', '')
            data_b64 = msg.get('data', '')
            self._save_received_file(sender, filename, data_b64)

    def _display_history(self, msg):
        msg_type = msg.get('type')
        ts = msg.get('timestamp', '')
        if msg_type == 'msg':
            print(f'[{ts}] {msg.get("from", "")}: {msg.get("text", "")}')
        elif msg_type == 'system':
            print(f'[{ts}] 💡 {msg.get("text", "")}')

    def _save_received_file(self, sender, filename, data_b64):
        try:
            downloads_dir = os.path.join(os.getcwd(), 'downloads')
            os.makedirs(downloads_dir, exist_ok=True)

            base_name, ext = os.path.splitext(filename)
            save_path = os.path.join(downloads_dir, filename)
            counter = 1
            while os.path.exists(save_path):
                save_path = os.path.join(downloads_dir, f'{base_name}_{counter}{ext}')
                counter += 1

            file_data = base64.b64decode(data_b64)
            with open(save_path, 'wb') as f:
                f.write(file_data)

            self._safe_print(f'✅ 文件已保存: {save_path}')
        except Exception as e:
            self._safe_print(f'❌ 文件保存失败: {e}')

    def _do_send_file_data(self, transfer_id):
        offer = self.outgoing_files.get(transfer_id)
        if not offer:
            self._safe_print('❌ 文件传输信息丢失')
            return
        try:
            filepath = offer['filepath']
            with open(filepath, 'rb') as f:
                file_data = f.read()
            data_b64 = base64.b64encode(file_data).decode('utf-8')
            self.stream.send({
                'type': 'file_data',
                'transfer_id': transfer_id,
                'data': data_b64
            })
            self._safe_print(f'✅ 文件 {offer["filename"]} 已发送')
        except Exception as e:
            self._safe_print(f'❌ 文件发送失败: {e}')
        finally:
            self.outgoing_files.pop(transfer_id, None)

    def _format_filesize(self, size):
        if size < 1024:
            return f'{size}B'
        elif size < 1024 * 1024:
            return f'{size / 1024:.1f}KB'
        else:
            return f'{size / (1024 * 1024):.1f}MB'

    def _input_loop(self):
        print('命令帮助:')
        print('  /members            - 查看在线成员')
        print('  /private 昵称 消息   - 发送私聊')
        print('  /sendfile 昵称 文件  - 发送文件(≤10MB)')
        print('  /accept 传输ID      - 接受文件')
        print('  /reject 传输ID      - 拒绝文件')
        print('  /quit               - 退出聊天室')
        print()

        while self.running:
            try:
                with self.input_lock:
                    user_input = input('> ')
            except (EOFError, KeyboardInterrupt):
                print()
                break

            if not self.running:
                break

            user_input = user_input.strip()
            if not user_input:
                continue

            if user_input == '/quit':
                break
            elif user_input == '/members':
                self.stream.send({'type': 'members'})
            elif user_input.startswith('/private '):
                parts = user_input[len('/private '):].split(' ', 1)
                if len(parts) < 2:
                    self._safe_print('用法: /private 昵称 消息内容')
                    continue
                target, text = parts[0], parts[1]
                self.stream.send({
                    'type': 'private',
                    'target': target,
                    'text': text
                })
            elif user_input.startswith('/sendfile '):
                parts = user_input[len('/sendfile '):].split(' ', 1)
                if len(parts) < 2:
                    self._safe_print('用法: /sendfile 昵称 文件路径')
                    continue
                target, filepath = parts[0], parts[1]
                filepath = os.path.expanduser(filepath)
                if not os.path.isfile(filepath):
                    self._safe_print(f'文件不存在: {filepath}')
                    continue
                filesize = os.path.getsize(filepath)
                if filesize > 10 * 1024 * 1024:
                    self._safe_print('文件大小不能超过10MB')
                    continue
                filename = os.path.basename(filepath)
                request_id = uuid.uuid4().hex[:8]
                self._awaiting_ack[request_id] = {
                    'filepath': filepath,
                    'filename': filename,
                    'target': target
                }
                self.stream.send({
                    'type': 'file_offer',
                    'target': target,
                    'filename': filename,
                    'filesize': filesize,
                    'request_id': request_id
                })
            elif user_input.startswith('/accept '):
                short_id = user_input[len('/accept '):].strip()
                matched_id = self._find_transfer_id(short_id, self.incoming_files)
                if matched_id:
                    offer = self.incoming_files.pop(matched_id, {})
                    self.stream.send({
                        'type': 'file_accept',
                        'transfer_id': matched_id
                    })
                    self._safe_print(f'已接受文件 {offer.get("filename", "")}，等待传输...')
                else:
                    self._safe_print(f'未找到传输ID: {short_id}')
            elif user_input.startswith('/reject '):
                short_id = user_input[len('/reject '):].strip()
                matched_id = self._find_transfer_id(short_id, self.incoming_files)
                if matched_id:
                    offer = self.incoming_files.pop(matched_id, {})
                    self.stream.send({
                        'type': 'file_reject',
                        'transfer_id': matched_id
                    })
                    self._safe_print(f'已拒绝文件 {offer.get("filename", "")}')
                else:
                    self._safe_print(f'未找到传输ID: {short_id}')
            else:
                self.stream.send({
                    'type': 'msg',
                    'text': user_input
                })

        self.running = False
        self._file_send_event.set()
        self.stream.close()
        print()
        print('已退出聊天室。')

    def _find_transfer_id(self, short_id, files_dict):
        for tid in files_dict:
            if tid.startswith(short_id):
                return tid
        return None


def main():
    parser = argparse.ArgumentParser(description='临时聊天室')
    subparsers = parser.add_subparsers(dest='mode', help='运行模式')

    server_parser = subparsers.add_parser('server', help='启动服务端')
    server_parser.add_argument('--host', default='0.0.0.0', help='监听地址')
    server_parser.add_argument('--port', type=int, default=9527, help='监听端口')

    client_parser = subparsers.add_parser('client', help='启动客户端')
    client_parser.add_argument('--host', required=True, help='服务器地址')
    client_parser.add_argument('--port', type=int, default=9527, help='服务器端口')
    client_parser.add_argument('--room', required=True, help='房间号')
    client_parser.add_argument('--nick', required=True, help='昵称')
    client_parser.add_argument('--password', required=True, help='房间密码')

    args = parser.parse_args()

    if args.mode == 'server':
        server = ChatServer(host=args.host, port=args.port)
        server.start()
    elif args.mode == 'client':
        client = ChatClient(
            host=args.host,
            port=args.port,
            room_id=args.room,
            nickname=args.nick,
            password=args.password
        )
        client.start()
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
