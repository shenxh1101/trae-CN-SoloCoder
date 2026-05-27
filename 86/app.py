from flask import Flask, render_template
from flask_socketio import SocketIO, join_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'whiteboard-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

boards = {}
board_clients = {}

@app.route('/')
def index():
    return render_template('index.html', board_id='default')

@app.route('/board/<board_id>')
def board(board_id):
    return render_template('index.html', board_id=board_id)

@app.route('/test')
def test():
    return render_template('test.html')

@app.route('/auto-test')
def auto_test():
    return render_template('auto_test.html')

@socketio.on('join')
def on_join(data):
    board_id = data.get('board_id', 'default')
    join_room(board_id)
    
    if board_id not in boards:
        boards[board_id] = []
    
    if board_id not in board_clients:
        board_clients[board_id] = 0
    board_clients[board_id] += 1
    
    print(f"[SocketIO] Client joined board '{board_id}', total clients: {board_clients[board_id]}, history count: {len(boards[board_id])}")
    emit('board_state', {'actions': boards[board_id]})

@socketio.on('draw')
def on_draw(data):
    board_id = data.get('board_id', 'default')
    action = data.get('action')
    
    if not action:
        return
    
    if board_id not in boards:
        boards[board_id] = []
    
    action_type = action.get('type', '')
    
    if action_type == 'clear':
        boards[board_id] = []
        print(f"[SocketIO] Board '{board_id}' cleared via draw action")
    else:
        boards[board_id].append(action)
        if len(boards[board_id]) > 100:
            boards[board_id] = boards[board_id][-100:]
        print(f"[SocketIO] Board '{board_id}' received action: {action_type}, total history: {len(boards[board_id])}")
    
    emit('draw', action, room=board_id, include_self=False)

@socketio.on('clear')
def on_clear(data):
    board_id = data.get('board_id', 'default')
    boards[board_id] = []
    emit('clear', room=board_id, include_self=False)

@socketio.on('disconnect')
def on_disconnect():
    pass

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, allow_unsafe_werkzeug=True)
