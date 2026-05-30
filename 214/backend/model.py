import os
import numpy as np
from tensorflow.keras import layers, models
from tensorflow.keras.utils import to_categorical
from PIL import Image
import config


def build_model(num_classes):
    model = models.Sequential([
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=(64, 64, 1)),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dropout(0.5),
        layers.Dense(256, activation='relu'),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def preprocess_image(image_path, target_size=(64, 64)):
    img = Image.open(image_path).convert('L')
    img = img.resize(target_size)
    img_array = np.array(img) / 255.0
    img_array = 1 - img_array
    img_array = np.expand_dims(img_array, axis=-1)
    return img_array


def preprocess_image_from_pil(pil_image, target_size=(64, 64)):
    img = pil_image.convert('L')
    img = img.resize(target_size)
    img_array = np.array(img) / 255.0
    img_array = 1 - img_array
    img_array = np.expand_dims(img_array, axis=-1)
    return img_array


def predict_character(model, image_data, top_k=3):
    char_list = config.CHAR_LIST
    predictions = model.predict(np.expand_dims(image_data, axis=0), verbose=0)[0]
    top_indices = np.argsort(predictions)[-top_k:][::-1]
    results = []
    for idx in top_indices:
        results.append({
            'character': char_list[idx] if idx < len(char_list) else f'?{idx}',
            'confidence': float(predictions[idx]),
            'index': int(idx)
        })
    return results


def generate_synthetic_data():
    char_list = config.CHAR_LIST
    num_classes = len(char_list)
    images = []
    labels = []
    
    for label_idx, char in enumerate(char_list):
        for _ in range(20):
            img = generate_character_image(char)
            img_array = preprocess_image_from_pil(img)
            images.append(img_array)
            labels.append(label_idx)
    
    return np.array(images), np.array(labels), num_classes


def generate_character_image(char):
    from PIL import Image, ImageDraw, ImageFont
    import random
    
    img_size = 64
    img = Image.new('L', (img_size, img_size), 255)
    draw = ImageDraw.Draw(img)
    
    font_sizes = [28, 32, 36, 40]
    font_size = random.choice(font_sizes)
    
    try:
        font_paths = [
            '/System/Library/Fonts/STHeiti Light.ttc',
            '/System/Library/Fonts/Hiragino Sans GB.ttc',
            '/System/Library/Fonts/Supplemental/Songti.ttc',
            '/System/Library/Fonts/PingFang.ttc',
            '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
            '/usr/share/fonts/truetype/arphic/uming.ttc'
        ]
        
        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    test_font = ImageFont.truetype(font_path, font_size)
                    test_img = Image.new('L', (50, 50), 255)
                    test_draw = ImageDraw.Draw(test_img)
                    test_draw.text((5, 5), '大', fill=0, font=test_font)
                    if np.sum(np.array(test_img) < 200) > 10:
                        font = test_font
                        break
                except Exception:
                    continue
        
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), char, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    offset_x = (img_size - text_w) // 2 + random.randint(-3, 3)
    offset_y = (img_size - text_h) // 2 + random.randint(-3, 3)
    
    draw.text((offset_x, offset_y), char, fill=0, font=font)
    
    if random.random() > 0.5:
        angle = random.uniform(-5, 5)
        img = img.rotate(angle, fillcolor=255)
    
    return img


def train_initial_model():
    model_path = os.path.join(config.MODEL_DIR, 'handwriting_model.h5')
    
    if os.path.exists(model_path):
        print(f"Model already exists at {model_path}")
        return
    
    print("Generating synthetic training data...")
    X, y, num_classes = generate_synthetic_data()
    y = to_categorical(y, num_classes)
    
    print(f"Training data shape: {X.shape}, labels shape: {y.shape}")
    
    model = build_model(num_classes)
    model.summary()
    
    print("Training model...")
    history = model.fit(
        X, y,
        epochs=30,
        batch_size=32,
        validation_split=0.2
    )
    
    model.save(model_path)
    print(f"Model saved to {model_path}")
    
    return history


def load_model():
    model_path = os.path.join(config.MODEL_DIR, 'handwriting_model.h5')
    if not os.path.exists(model_path):
        print("Model not found, training initial model...")
        train_initial_model()
    
    model = models.load_model(model_path)
    return model


def train_with_new_data():
    import json
    
    model_path = os.path.join(config.MODEL_DIR, 'handwriting_model.h5')
    samples_dir = config.SAMPLES_DIR
    
    sample_files = [f for f in os.listdir(samples_dir) if f.endswith('.png')]
    if len(sample_files) == 0:
        print("No new samples to train with")
        return None
    
    print(f"Found {len(sample_files)} new samples")
    
    char_list = config.CHAR_LIST
    num_classes = len(char_list)
    
    X = []
    y = []
    
    for sample_file in sample_files:
        try:
            base_name = os.path.splitext(sample_file)[0]
            parts = base_name.split('_')
            if len(parts) < 2:
                continue
            
            label = parts[0]
            if label not in char_list:
                continue
            
            label_idx = char_list.index(label)
            img_path = os.path.join(samples_dir, sample_file)
            img_array = preprocess_image(img_path)
            
            X.append(img_array)
            y.append(label_idx)
        except Exception as e:
            print(f"Error processing {sample_file}: {e}")
            continue
    
    if len(X) == 0:
        print("No valid samples found")
        return None
    
    X = np.array(X)
    y = np.array(y)
    y = to_categorical(y, num_classes)
    
    print(f"Training on {len(X)} new samples")
    
    model = load_model()
    
    history = model.fit(
        X, y,
        epochs=10,
        batch_size=16,
        validation_split=0.1
    )
    
    model.save(model_path)
    print("Model updated with new data")
    
    stats_path = os.path.join(config.DATA_DIR, 'training_stats.json')
    stats = {}
    if os.path.exists(stats_path):
        with open(stats_path, 'r', encoding='utf-8') as f:
            stats = json.load(f)
    
    stats['last_trained_samples'] = len(sample_files)
    stats['last_trained_time'] = str(np.datetime64('now'))
    stats['total_trained_samples'] = stats.get('total_trained_samples', 0) + len(sample_files)
    
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    
    return history
