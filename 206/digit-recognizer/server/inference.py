import time
from model_manager import model_manager


def run_prediction(image_data, model_name=None):
    if model_name:
        model_manager.switch_model(model_name)

    start_time = time.time()
    result = model_manager.predict(image_data)
    end_time = time.time()

    processing_time_ms = (end_time - start_time) * 1000

    return {
        "digit": result["digit"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "model": model_manager.active_model,
        "processing_time_ms": round(processing_time_ms, 2),
    }
