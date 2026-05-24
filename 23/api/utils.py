import json
import os
from typing import List, Dict, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
FEEDBACK_FILE = os.path.join(DATA_DIR, 'feedback.json')
HISTORY_FILE = os.path.join(DATA_DIR, 'history.json')

MAX_HISTORY_ITEMS = 100

def _ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

def _read_json(filepath: str) -> Any:
    _ensure_data_dir()
    if not os.path.exists(filepath):
        return [] if filepath.endswith('.json') else {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return [] if filepath.endswith('.json') else {}

def _write_json(filepath: str, data: Any) -> None:
    _ensure_data_dir()
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_feedback() -> List[Dict[str, Any]]:
    return _read_json(FEEDBACK_FILE)

def save_feedback(feedback: Dict[str, Any]) -> None:
    feedbacks = load_feedback()
    feedbacks.append(feedback)
    _write_json(FEEDBACK_FILE, feedbacks)

def load_history(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    history = _read_json(HISTORY_FILE)
    history.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
    if limit:
        return history[:limit]
    return history

def save_history(item: Dict[str, Any]) -> None:
    history = _read_json(HISTORY_FILE)
    history.insert(0, item)
    if len(history) > MAX_HISTORY_ITEMS:
        history = history[:MAX_HISTORY_ITEMS]
    _write_json(HISTORY_FILE, history)

def get_history_item(item_id: str) -> Optional[Dict[str, Any]]:
    history = _read_json(HISTORY_FILE)
    for item in history:
        if item.get('id') == item_id:
            return item
    return None

def update_history_item(item_id: str, updates: Dict[str, Any]) -> bool:
    history = _read_json(HISTORY_FILE)
    for i, item in enumerate(history):
        if item.get('id') == item_id:
            history[i].update(updates)
            _write_json(HISTORY_FILE, history)
            return True
    return False

def add_feedback_to_history(image_id: str, feedback: Dict[str, Any]) -> bool:
    return update_history_item(image_id, {'feedback': feedback})

def compute_confusion_matrix() -> Dict[str, Any]:
    feedbacks = load_feedback()
    
    if len(feedbacks) < 2:
        return {
            'classes': [],
            'matrix': [],
            'totalSamples': 0,
            'accuracy': 0.0
        }
    
    class_set = set()
    valid_feedbacks = []
    
    for fb in feedbacks:
        predicted = fb.get('predictedClass')
        actual = fb.get('correctClass') if fb.get('correctClass') and fb.get('correctClass') != 'other' else (
            predicted if fb.get('isCorrect') else None
        )
        
        if predicted:
            class_set.add(predicted)
        if actual:
            class_set.add(actual)
            valid_feedbacks.append({
                'predicted': predicted,
                'actual': actual,
                'isCorrect': fb.get('isCorrect', False)
            })
    
    classes = sorted(list(class_set))
    
    if len(classes) < 2:
        return {
            'classes': classes,
            'matrix': [],
            'totalSamples': len(valid_feedbacks),
            'accuracy': sum(1 for fb in valid_feedbacks if fb['isCorrect']) / len(valid_feedbacks) if valid_feedbacks else 0.0
        }
    
    class_to_idx = {cls: i for i, cls in enumerate(classes)}
    n = len(classes)
    matrix = [[0] * n for _ in range(n)]
    
    correct_count = 0
    for fb in valid_feedbacks:
        pred_idx = class_to_idx.get(fb['predicted'])
        actual_idx = class_to_idx.get(fb['actual'])
        
        if pred_idx is not None and actual_idx is not None:
            matrix[actual_idx][pred_idx] += 1
            if fb['isCorrect']:
                correct_count += 1
    
    total = len(valid_feedbacks)
    accuracy = correct_count / total if total > 0 else 0.0
    
    return {
        'classes': classes,
        'matrix': matrix,
        'totalSamples': total,
        'accuracy': accuracy
    }

def generate_id() -> str:
    import uuid
    return str(uuid.uuid4())

def success_response(data: Any = None, message: Optional[str] = None) -> Dict[str, Any]:
    response = {'success': True}
    if data is not None:
        response['data'] = data
    if message:
        response['message'] = message
    return response

def error_response(error: str) -> Dict[str, Any]:
    return {
        'success': False,
        'error': error
    }
