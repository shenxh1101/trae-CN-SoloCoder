import os
import io
import base64
import random
import time
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

TENSORFLOW_AVAILABLE = False
MobileNetV2 = None
preprocess_input = None
decode_predictions = None

MOCK_CLASSES = [
    'golden retriever', 'labrador retriever', 'german shepherd',
    'tabby cat', 'persian cat', 'siamese cat',
    'sports car', 'sedan', 'SUV',
    'pizza', 'burger', 'sushi',
    'laptop', 'smartphone', 'tablet',
    'airplane', 'bicycle', 'boat',
    'coffee mug', 'wine glass', 'bottle',
    'chair', 'table', 'couch',
    'flower', 'tree', 'mountain',
    'beach', 'sunset', 'rainbow',
    'dog', 'cat', 'bird',
    'elephant', 'tiger', 'bear',
    'apple', 'banana', 'orange',
    'computer', 'keyboard', 'mouse',
    'book', 'pen', 'pencil',
    'clock', 'watch', 'camera'
]

try:
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import (
        MobileNetV2,
        preprocess_input,
        decode_predictions,
    )
    TENSORFLOW_AVAILABLE = True
    print("TensorFlow loaded successfully!")
except ImportError as e:
    print(f"WARNING: TensorFlow not available ({e}). Running in MOCK mode.")

def generate_mock_predictions(num_classes: int = 5) -> List[Tuple[str, str, float]]:
    selected = random.sample(MOCK_CLASSES, num_classes)
    confidences = sorted([random.uniform(0.1, 0.95) for _ in range(num_classes)], reverse=True)
    total = sum(confidences)
    normalized = [c / total for c in confidences]
    return [(f"n{random.randint(1000, 9999)}", cls, conf) for cls, conf in zip(selected, normalized)]

class MobileNetClassifier:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        if TENSORFLOW_AVAILABLE:
            print("Loading MobileNetV2 model...")
            self._model = MobileNetV2(
                weights='imagenet',
                input_shape=(224, 224, 3),
                include_top=True
            )
            print("Model loaded successfully.")
        else:
            print("Running in mock mode - using simulated predictions")
            self._model = None

    def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image = image.resize((224, 224), Image.Resampling.LANCZOS)
        image_array = np.array(image, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0)
        
        if TENSORFLOW_AVAILABLE and preprocess_input:
            image_array = preprocess_input(image_array)
        
        return image_array

    def _generate_thumbnail(self, image: Image.Image, size: int = 200) -> str:
        image = image.copy()
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image.thumbnail((size, size), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=85)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def classify(self, image: Image.Image, top_k: int = 5) -> Dict[str, Any]:
        if TENSORFLOW_AVAILABLE and self._model is not None:
            preprocessed = self._preprocess_image(image)
            predictions = self._model.predict(preprocessed, verbose=0)
            decoded = decode_predictions(predictions, top=top_k)[0]
            
            results = [
                {
                    'className': cls,
                    'classDescription': cls,
                    'confidence': float(conf),
                    'confidencePercent': round(float(conf) * 100, 2)
                }
                for (_, cls, conf) in decoded
            ]
        else:
            time.sleep(random.uniform(0.1, 0.3))
            mock_preds = generate_mock_predictions(top_k)
            results = [
                {
                    'className': cls,
                    'classDescription': cls,
                    'confidence': float(conf),
                    'confidencePercent': round(float(conf) * 100, 2)
                }
                for (_, cls, conf) in mock_preds
            ]
        
        thumbnail = self._generate_thumbnail(image)
        
        return {
            'success': True,
            'predictions': results,
            'thumbnail': thumbnail,
            'mockMode': not TENSORFLOW_AVAILABLE
        }

    def classify_from_url(self, url: str, top_k: int = 5) -> Dict[str, Any]:
        try:
            import requests
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content))
            return self.classify(image, top_k)
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to load image from URL: {str(e)}',
                'predictions': [],
                'thumbnail': ''
            }

    def classify_batch(self, images: List[Image.Image], top_k: int = 5) -> List[Dict[str, Any]]:
        results = []
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(self.classify, img, top_k): i for i, img in enumerate(images)}
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    result = future.result()
                    results.append((idx, result))
                except Exception as e:
                    results.append((idx, {
                        'success': False,
                        'error': str(e),
                        'predictions': [],
                        'thumbnail': ''
                    }))
        
        results.sort(key=lambda x: x[0])
        return [r[1] for r in results]

classifier = None

def get_classifier():
    global classifier
    if classifier is None:
        classifier = MobileNetClassifier()
    return classifier
