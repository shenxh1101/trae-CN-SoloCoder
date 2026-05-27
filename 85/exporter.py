import csv


class Exporter:
    def __init__(self, storage, user_manager):
        self.storage = storage
        self.user_manager = user_manager

    def export_to_csv(self, filename):
        records = self.user_manager.get_current_user_data().get('records', {})

        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['日期', '体重(kg)', '睡眠(小时)', '步数']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for date in sorted(records.keys()):
                record = records[date]
                writer.writerow({
                    '日期': date,
                    '体重(kg)': record.get('weight', ''),
                    '睡眠(小时)': record.get('sleep', ''),
                    '步数': record.get('steps', '')
                })
