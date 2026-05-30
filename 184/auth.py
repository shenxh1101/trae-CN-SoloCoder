from functools import wraps
from flask import session, jsonify, request, redirect, url_for
from config import ADMIN_PASSWORD

def is_admin():
    return session.get('is_admin', False)

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_admin():
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'error': '需要管理员权限'}), 403
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def login_admin(password):
    if password == ADMIN_PASSWORD:
        session['is_admin'] = True
        return True
    return False

def logout_admin():
    session.pop('is_admin', None)
