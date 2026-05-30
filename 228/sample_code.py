import os
import sys
import json
from typing import List, Dict, Optional
from datetime import datetime

class DataProcessor:
    def __init__(self, config: dict = None):
        self.config = config or {}
        self.data = []
        self.cache = {}
        self.results_cache = {}
        self.logger = None
        self.stats = {}
        self.debug_mode = False
        
    def process_data(self, raw_data: List[dict]) -> List[dict]:
        result = []
        
        for item in raw_data:
            if item.get('type') == 'user':
                processed = self._process_user(item)
            elif item.get('type') == 'order':
                processed = self._process_order(item)
            elif item.get('type') == 'product':
                processed = self._process_product(item)
            elif item.get('type') == 'payment':
                processed = self._process_payment(item)
            elif item.get('type') == 'shipping':
                processed = self._process_shipping(item)
            elif item.get('type') == 'refund':
                processed = self._process_refund(item)
            elif item.get('type') == 'review':
                processed = self._process_review(item)
            else:
                processed = self._process_default(item)
            
            if processed:
                if self.config.get('validate', True):
                    if self._validate_data(processed):
                        if self.config.get('transform', False):
                            transformed = self._transform_data(processed)
                            if transformed:
                                if self.config.get('enrich', True):
                                    enriched = self._enrich_data(transformed)
                                    if enriched:
                                        result.append(enriched)
                                else:
                                    result.append(transformed)
                        else:
                            result.append(processed)
                    else:
                        self._log_error(f"Validation failed for {item}")
                else:
                    result.append(processed)
        
        return result
    
    def _process_user(self, item: dict) -> Optional[dict]:
        user_data = {
            'id': item.get('id'),
            'name': item.get('name'),
            'email': item.get('email'),
            'created_at': item.get('created_at')
        }
        
        if user_data['email']:
            if '@' in user_data['email']:
                user_data['email_domain'] = user_data['email'].split('@')[1]
            else:
                return None
        
        if len(user_data.get('name', '')) < 2:
            return None
            
        return user_data
    
    def _process_order(self, item: dict) -> Optional[dict]:
        order_data = {
            'order_id': item.get('order_id'),
            'user_id': item.get('user_id'),
            'total': item.get('total', 0),
            'status': item.get('status', 'pending'),
            'items': item.get('items', [])
        }
        
        if order_data['total'] < 0:
            return None
            
        if not order_data['items']:
            return None
            
        total_check = sum(i.get('price', 0) * i.get('quantity', 0) 
                         for i in order_data['items'])
        if abs(total_check - order_data['total']) > 100:
            order_data['total'] = total_check
            
        return order_data
    
    def _process_product(self, item: dict) -> Optional[dict]:
        product_data = {
            'product_id': item.get('product_id'),
            'name': item.get('name'),
            'price': item.get('price', 0),
            'category': item.get('category'),
            'stock': item.get('stock', 0)
        }
        
        if product_data['price'] < 0:
            return None
            
        if product_data['stock'] < 0:
            product_data['stock'] = 0
            
        return product_data
    
    def _process_payment(self, item: dict) -> Optional[dict]:
        payment_data = {
            'payment_id': item.get('payment_id'),
            'order_id': item.get('order_id'),
            'amount': item.get('amount', 0),
            'method': item.get('method', 'credit_card'),
            'status': item.get('status', 'pending')
        }
        
        valid_methods = ['credit_card', 'debit_card', 'paypal', 'bank_transfer']
        if payment_data['method'] not in valid_methods:
            return None
            
        if payment_data['amount'] <= 0:
            return None
            
        return payment_data
    
    def _process_shipping(self, item: dict) -> Optional[dict]:
        shipping_data = {
            'shipping_id': item.get('shipping_id'),
            'order_id': item.get('order_id'),
            'address': item.get('address', {}),
            'carrier': item.get('carrier'),
            'tracking_number': item.get('tracking_number')
        }
        
        if not shipping_data.get('address'):
            return None
            
        required_fields = ['street', 'city', 'zip_code', 'country']
        if not all(shipping_data['address'].get(f) for f in required_fields):
            return None
            
        return shipping_data
    
    def _process_refund(self, item: dict) -> Optional[dict]:
        refund_data = {
            'refund_id': item.get('refund_id'),
            'order_id': item.get('order_id'),
            'amount': item.get('amount', 0),
            'reason': item.get('reason'),
            'status': item.get('status', 'pending')
        }
        
        if refund_data['amount'] < 0:
            return None
            
        if not refund_data.get('reason'):
            refund_data['reason'] = 'No reason provided'
            
        return refund_data
    
    def _process_review(self, item: dict) -> Optional[dict]:
        review_data = {
            'review_id': item.get('review_id'),
            'user_id': item.get('user_id'),
            'product_id': item.get('product_id'),
            'rating': item.get('rating', 0),
            'comment': item.get('comment', '')
        }
        
        if review_data['rating'] < 1 or review_data['rating'] > 5:
            return None
            
        return review_data
    
    def _process_default(self, item: dict) -> Optional[dict]:
        return item if item else None
    
    def _validate_data(self, data: dict) -> bool:
        if not data:
            return False
            
        required = ['id']
        if not any(data.get(k) for k in required):
            return False
            
        return True
    
    def _transform_data(self, data: dict) -> Optional[dict]:
        try:
            data['processed_at'] = datetime.now().isoformat()
            data['checksum'] = hash(json.dumps(data, sort_keys=True))
            return data
        except Exception:
            return None
    
    def _enrich_data(self, data: dict) -> Optional[dict]:
        try:
            data['version'] = '1.0'
            data['source'] = 'data_processor'
            return data
        except Exception:
            return None
    
    def _log_error(self, message: str):
        error_log = f"[ERROR] {datetime.now().isoformat()}: {message}"
        print(error_log, file=sys.stderr)


def calculate_statistics(data: List[dict]) -> Dict:
    stats = {
        'count': len(data),
        'sum': 0,
        'avg': 0,
        'min': float('inf'),
        'max': float('-inf')
    }
    
    numeric_values = []
    for item in data:
        value = item.get('value')
        if isinstance(value, (int, float)):
            numeric_values.append(value)
    
    if numeric_values:
        stats['sum'] = sum(numeric_values)
        stats['avg'] = sum(numeric_values) / len(numeric_values)
        stats['min'] = min(numeric_values)
        stats['max'] = max(numeric_values)
    
    return stats


def filter_data(data: List[dict], criteria: dict) -> List[dict]:
    result = []
    
    for item in data:
        match = True
        
        for key, expected_value in criteria.items():
            actual_value = item.get(key)
            
            if isinstance(expected_value, list):
                if actual_value not in expected_value:
                    match = False
                    break
            elif isinstance(expected_value, dict):
                if not isinstance(actual_value, dict):
                    match = False
                    break
                for sub_key, sub_value in expected_value.items():
                    if actual_value.get(sub_key) != sub_value:
                        match = False
                        break
                if not match:
                    break
            elif callable(expected_value):
                if not expected_value(actual_value):
                    match = False
                    break
            else:
                if actual_value != expected_value:
                    match = False
                    break
        
        if match:
            result.append(item)
    
    return result


class DataExporter:
    def __init__(self, output_dir: str = './output'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def export_to_json(self, data: List[dict], filename: str) -> bool:
        filepath = os.path.join(self.output_dir, f"{filename}.json")
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except IOError as e:
            print(f"Export failed: {e}")
            return False
    
    def export_to_csv(self, data: List[dict], filename: str) -> bool:
        filepath = os.path.join(self.output_dir, f"{filename}.csv")
        try:
            if not data:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write('')
                return True
                
            headers = list(data[0].keys())
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                f.write(','.join(headers) + '\n')
                for item in data:
                    row = [str(item.get(h, '')) for h in headers]
                    f.write(','.join(row) + '\n')
            return True
        except IOError as e:
            print(f"Export failed: {e}")
            return False


if __name__ == '__main__':
    processor = DataProcessor({'validate': True, 'transform': True, 'enrich': True})
    
    sample_data = [
        {'type': 'user', 'id': 1, 'name': 'John Doe', 'email': 'john@example.com'},
        {'type': 'order', 'order_id': 101, 'user_id': 1, 'total': 99.99, 
         'items': [{'name': 'Item 1', 'price': 49.99, 'quantity': 2}]},
        {'type': 'product', 'product_id': 201, 'name': 'Widget', 'price': 24.99}
    ]
    
    results = processor.process_data(sample_data)
    print(f"Processed {len(results)} items")