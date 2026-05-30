import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from model_manager import model_manager
from inference import run_prediction


app = Flask(
    __name__,
    static_folder=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    static_url_path="",
)
CORS(app)

ERROR_CASES_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "error_cases",
    "cases.json",
)


@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)


@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        if not data or "image" not in data:
            return jsonify({"error": "No image data provided"}), 400

        image_data = data["image"]
        model_name = data.get("model")

        if len(image_data) != 784:
            return jsonify({"error": "Image data must be 784 pixels"}), 400

        result = run_prediction(image_data, model_name)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/models", methods=["GET"])
def list_models():
    try:
        available = model_manager.list_models()
        loaded = list(model_manager.loaded_models.keys())
        active = model_manager.active_model
        return jsonify(
            {
                "available": available,
                "loaded": loaded,
                "active": active,
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/models/switch", methods=["POST"])
def switch_model():
    try:
        data = request.get_json()
        if not data or "model_name" not in data:
            return jsonify({"error": "No model_name provided"}), 400

        model_name = data["model_name"]
        available = model_manager.list_models()
        if model_name not in available and model_name not in model_manager.loaded_models:
            return jsonify({"error": f"Model not found: {model_name}"}), 404

        model_manager.switch_model(model_name)
        return jsonify(
            {
                "active": model_manager.active_model,
                "message": f"Switched to model: {model_name}",
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/models/upload", methods=["POST"])
def upload_model():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not (file.filename.endswith(".h5") or file.filename.endswith(".onnx")):
            return jsonify({"error": "Only .h5 and .onnx files are supported"}), 400

        filename = model_manager.upload_model(file)
        return jsonify(
            {
                "filename": filename,
                "message": f"Model uploaded: {filename}",
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/error-cases", methods=["POST"])
def save_error_case():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        os.makedirs(os.path.dirname(ERROR_CASES_PATH), exist_ok=True)

        if os.path.exists(ERROR_CASES_PATH):
            with open(ERROR_CASES_PATH, "r") as f:
                cases = json.load(f)
        else:
            cases = []

        cases.append(data)

        with open(ERROR_CASES_PATH, "w") as f:
            json.dump(cases, f, indent=2)

        return jsonify({"message": "Error case saved", "total": len(cases)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/error-cases", methods=["GET"])
def get_error_cases():
    try:
        if os.path.exists(ERROR_CASES_PATH):
            with open(ERROR_CASES_PATH, "r") as f:
                cases = json.load(f)
        else:
            cases = []

        return jsonify({"cases": cases, "total": len(cases)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
