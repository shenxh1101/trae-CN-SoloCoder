import os
import ssl
import numpy as np

ssl._create_default_https_context = ssl._create_unverified_context


class ModelManager:
    def __init__(self, models_dir=None):
        if models_dir is None:
            models_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "models",
            )
        self.models_dir = models_dir
        self.loaded_models = {}
        self.active_model = None
        os.makedirs(self.models_dir, exist_ok=True)

    def list_models(self):
        available = []
        if os.path.exists(self.models_dir):
            for f in sorted(os.listdir(self.models_dir)):
                if f.endswith(".h5") or f.endswith(".onnx"):
                    available.append(f)
        return available

    def load_model(self, name):
        if name in self.loaded_models:
            return self.loaded_models[name]

        filepath = os.path.join(self.models_dir, name)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {name}")

        if name.endswith(".h5"):
            import tensorflow as tf

            model = tf.keras.models.load_model(filepath)
            self.loaded_models[name] = {"model": model, "type": "keras"}
        elif name.endswith(".onnx"):
            import onnxruntime as ort

            session = ort.InferenceSession(filepath)
            self.loaded_models[name] = {"model": session, "type": "onnx"}
        else:
            raise ValueError(f"Unsupported model format: {name}")

        if self.active_model is None:
            self.active_model = name

        return self.loaded_models[name]

    def switch_model(self, name):
        if name not in self.loaded_models:
            self.load_model(name)
        self.active_model = name
        return name

    def upload_model(self, file):
        os.makedirs(self.models_dir, exist_ok=True)
        filename = file.filename
        filepath = os.path.join(self.models_dir, filename)
        file.save(filepath)
        return filename

    def predict(self, image_data):
        if self.active_model is None:
            models = self.list_models()
            if not models:
                self._auto_train()
                models = self.list_models()
            if not models:
                raise RuntimeError("No models available")
            self.load_model(models[0])
            self.active_model = models[0]

        model_info = self.loaded_models[self.active_model]
        image_array = np.array(image_data, dtype=np.float32).reshape(1, 28, 28, 1)

        if model_info["type"] == "keras":
            predictions = model_info["model"].predict(image_array, verbose=0)
        elif model_info["type"] == "onnx":
            session = model_info["model"]
            input_name = session.get_inputs()[0].name
            result = session.run(None, {input_name: image_array})
            predictions = result[0]

        probabilities = predictions[0].tolist()
        digit = int(np.argmax(predictions[0]))
        confidence = float(np.max(predictions[0]))

        return {
            "digit": digit,
            "confidence": confidence,
            "probabilities": probabilities,
        }

    def _auto_train(self):
        import tensorflow as tf
        from tensorflow import keras
        from tensorflow.keras import layers

        print("No model found. Auto-training a simple CNN (1 epoch)...")
        (x_train, y_train), (_, _) = keras.datasets.mnist.load_data()
        x_train = x_train.reshape(-1, 28, 28, 1).astype('float32') / 255.0

        model = keras.Sequential([
            layers.Conv2D(32, (3, 3), activation='relu', input_shape=(28, 28, 1)),
            layers.MaxPooling2D((2, 2)),
            layers.Flatten(),
            layers.Dense(64, activation='relu'),
            layers.Dense(10, activation='softmax'),
        ])
        model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        model.fit(x_train, y_train, epochs=1, batch_size=128, validation_split=0.1, verbose=1)

        model_path = os.path.join(self.models_dir, 'mnist_simple.h5')
        model.save(model_path)
        print(f"Auto-trained model saved to: {model_path}")


model_manager = ModelManager()
