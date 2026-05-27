class UserManager:
    def __init__(self, storage):
        self.storage = storage
        self._init_default_user()

    def _init_default_user(self):
        users_data = self.storage.load_users()
        if not users_data['users']:
            default_user = 'default'
            users_data['users'].append(default_user)
            users_data['current_user'] = default_user
            self.storage.save_users(users_data)
            self.storage.save_user_data(default_user, {'records': {}, 'goals': {}})

    def create_user(self, username):
        users_data = self.storage.load_users()
        if username in users_data['users']:
            return False
        users_data['users'].append(username)
        self.storage.save_users(users_data)
        self.storage.save_user_data(username, {'records': {}, 'goals': {}})
        return True

    def delete_user(self, username):
        users_data = self.storage.load_users()
        if username not in users_data['users']:
            return False
        users_data['users'].remove(username)
        if users_data['current_user'] == username:
            users_data['current_user'] = users_data['users'][0] if users_data['users'] else None
        self.storage.save_users(users_data)
        self.storage.delete_user_data(username)
        return True

    def switch_user(self, username):
        users_data = self.storage.load_users()
        if username not in users_data['users']:
            return False
        users_data['current_user'] = username
        self.storage.save_users(users_data)
        return True

    def get_current_user(self):
        users_data = self.storage.load_users()
        return users_data['current_user']

    def list_users(self):
        users_data = self.storage.load_users()
        return users_data['users']

    def get_current_user_data(self):
        current_user = self.get_current_user()
        return self.storage.load_user_data(current_user)

    def save_current_user_data(self, data):
        current_user = self.get_current_user()
        self.storage.save_user_data(current_user, data)

    def get_current_user_goals(self):
        user_data = self.get_current_user_data()
        return user_data.get('goals', {})

    def set_goals(self, target_weight=None, target_steps=None):
        user_data = self.get_current_user_data()
        if 'goals' not in user_data:
            user_data['goals'] = {}
        if target_weight is not None:
            user_data['goals']['target_weight'] = target_weight
        if target_steps is not None:
            user_data['goals']['target_steps'] = target_steps
        self.save_current_user_data(user_data)
