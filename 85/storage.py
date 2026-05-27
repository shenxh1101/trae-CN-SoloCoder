import json
import os


class Storage:
    def __init__(self, data_dir='health_data'):
        self.data_dir = data_dir
        self._ensure_data_dir()

    def _ensure_data_dir(self):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def _get_user_file_path(self, username):
        return os.path.join(self.data_dir, f'{username}.json')

    def _get_users_file_path(self):
        return os.path.join(self.data_dir, 'users.json')

    def load_user_data(self, username):
        file_path = self._get_user_file_path(username)
        if not os.path.exists(file_path):
            return {'records': {}, 'goals': {}}
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {'records': {}, 'goals': {}}

    def save_user_data(self, username, data):
        file_path = self._get_user_file_path(username)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load_users(self):
        file_path = self._get_users_file_path()
        if not os.path.exists(file_path):
            return {'users': [], 'current_user': None}
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {'users': [], 'current_user': None}

    def save_users(self, users_data):
        file_path = self._get_users_file_path()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(users_data, f, ensure_ascii=False, indent=2)

    def delete_user_data(self, username):
        file_path = self._get_user_file_path(username)
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
