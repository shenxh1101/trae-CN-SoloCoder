from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from datetime import timedelta
from typing import Optional, Dict
from config import Config

class AuthService:
    def __init__(self):
        self.admin_username = Config.ADMIN_USERNAME
        self.admin_password_hash = generate_password_hash(Config.ADMIN_PASSWORD)

    def login(self, username: str, password: str) -> Optional[Dict]:
        if username == self.admin_username and check_password_hash(self.admin_password_hash, password):
            access_token = create_access_token(
                identity=username,
                expires_delta=timedelta(hours=24)
            )
            return {
                "success": True,
                "access_token": access_token,
                "username": username,
                "message": "登录成功"
            }
        return {
            "success": False,
            "message": "用户名或密码错误"
        }

    def verify_token(self, token: str) -> bool:
        try:
            from flask_jwt_extended import decode_token
            decoded = decode_token(token)
            return decoded.get("sub") == self.admin_username
        except Exception:
            return False

    def get_admin_info(self) -> Dict:
        return {
            "username": self.admin_username
        }
