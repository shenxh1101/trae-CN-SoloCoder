import argparse
import os
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


def build_model():
    model = keras.Sequential([
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=(28, 28, 1)),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(10, activation='softmax'),
    ])
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy'],
    )
    return model


def main():
    parser = argparse.ArgumentParser(description='Train MNIST CNN model')
    parser.add_argument('--epochs', type=int, default=5, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=128, help='Training batch size')
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(script_dir, '..', 'models')
    tfjs_dir = os.path.join(script_dir, '..', 'tfjs_model')
    model_path = os.path.join(model_dir, 'mnist_cnn.h5')

    os.makedirs(model_dir, exist_ok=True)

    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()

    x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0
    x_test = x_test.reshape(-1, 28, 28, 1).astype('float32') / 255.0

    model = build_model()
    model.summary()

    history = model.fit(
        x_train, y_train,
        epochs=args.epochs,
        batch_size=args.batch_size,
        validation_split=0.1,
    )

    test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)

    model.save(model_path)
    model_size_mb = os.path.getsize(model_path) / (1024 * 1024)

    print('\n' + '=' * 50)
    print(f'Test loss: {test_loss:.4f}')
    print(f'Test accuracy: {test_acc:.4f}')
    print(f'Model saved to: {os.path.abspath(model_path)}')
    print(f'Model size: {model_size_mb:.2f} MB')
    print('=' * 50)

    tfjs_abs_dir = os.path.abspath(tfjs_dir)
    model_abs_path = os.path.abspath(model_path)
    print(f'\nTo convert to TensorFlow.js format, run:')
    print(f'  tensorflowjs_converter --input_format=keras {model_abs_path} {tfjs_abs_dir}/')


if __name__ == '__main__':
    main()
