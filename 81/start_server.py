#!/usr/bin/env python3
import http.server
import socketserver
import socket
import sys

def find_free_port(start_port=8000, max_port=8100):
    for port in range(start_port, max_port + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    return None

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

if __name__ == "__main__":
    port = find_free_port(8000, 8100)
    
    if port is None:
        print("Error: Could not find a free port between 8000 and 8100")
        sys.exit(1)
    
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", port), MyHTTPRequestHandler) as httpd:
        print(f"\n🚀 2048 Game Server started!")
        print(f"📍 Local URL: http://localhost:{port}/")
        print(f"🔄 Press Ctrl+C to stop the server\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 Server stopped. Goodbye!")
            httpd.shutdown()
