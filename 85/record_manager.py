class RecordManager:
    def __init__(self, storage, user_manager):
        self.storage = storage
        self.user_manager = user_manager

    def add_record(self, date, weight=None, sleep=None, steps=None):
        user_data = self.user_manager.get_current_user_data()
        if 'records' not in user_data:
            user_data['records'] = {}

        if date not in user_data['records']:
            user_data['records'][date] = {}

        if weight is not None:
            user_data['records'][date]['weight'] = weight
        if sleep is not None:
            user_data['records'][date]['sleep'] = sleep
        if steps is not None:
            user_data['records'][date]['steps'] = steps

        self.user_manager.save_current_user_data(user_data)

    def edit_record(self, date, weight=None, sleep=None, steps=None):
        self.add_record(date, weight, sleep, steps)

    def delete_record(self, date):
        user_data = self.user_manager.get_current_user_data()
        if 'records' not in user_data or date not in user_data['records']:
            return False
        del user_data['records'][date]
        self.user_manager.save_current_user_data(user_data)
        return True

    def get_record(self, date):
        user_data = self.user_manager.get_current_user_data()
        return user_data.get('records', {}).get(date)

    def get_all_records(self):
        user_data = self.user_manager.get_current_user_data()
        return user_data.get('records', {})
