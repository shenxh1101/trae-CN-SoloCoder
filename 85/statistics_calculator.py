from datetime import datetime, timedelta


class StatisticsCalculator:
    def __init__(self, storage, user_manager):
        self.storage = storage
        self.user_manager = user_manager

    def get_weekly_records(self):
        records = self.user_manager.get_current_user_data().get('records', {})
        today = datetime.now().date()
        weekly_records = {}

        for i in range(7):
            date = today - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            if date_str in records:
                weekly_records[date_str] = records[date_str]

        return weekly_records

    def get_weight_trend(self):
        records = self.user_manager.get_current_user_data().get('records', {})
        today = datetime.now().date()
        today_str = today.strftime('%Y-%m-%d')
        last_week_str = (today - timedelta(days=7)).strftime('%Y-%m-%d')

        if today_str in records and 'weight' in records[today_str]:
            current_weight = records[today_str]['weight']
            if last_week_str in records and 'weight' in records[last_week_str]:
                last_week_weight = records[last_week_str]['weight']
                return current_weight - last_week_weight

        return None

    def get_all_statistics(self):
        records = self.user_manager.get_current_user_data().get('records', {})
        weights = []
        steps = []
        sleeps = []

        for record in records.values():
            if 'weight' in record:
                weights.append(record['weight'])
            if 'steps' in record:
                steps.append(record['steps'])
            if 'sleep' in record:
                sleeps.append(record['sleep'])

        return {
            'min_weight': min(weights) if weights else None,
            'max_steps': max(steps) if steps else None,
            'avg_sleep': sum(sleeps) / len(sleeps) if sleeps else None,
            'total_days': len(records)
        }
