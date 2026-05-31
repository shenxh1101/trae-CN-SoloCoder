from flask import Flask, request, jsonify
import time
import uuid

app = Flask(__name__)

VALID_API_KEY = "sk-test-valid-key-1234567890"

@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    auth_header = request.headers.get('Authorization', '')
    
    if auth_header != f'Bearer {VALID_API_KEY}':
        return jsonify({
            "error": {
                "message": "Invalid API key",
                "type": "invalid_request_error",
                "code": "invalid_api_key"
            }
        }), 401
    
    data = request.get_json()
    messages = data.get('messages', [])
    
    user_content = ""
    for msg in messages:
        if msg["role"] == "user":
            user_content = msg["content"]
    
    answer = f"根据您提供的法律知识，关于您的问题，以下是专业解答：\n\n"
    answer += "基于相关法律条文的规定，您的权益受到法律保护。"
    answer += "建议您保留相关证据，必要时可以通过劳动仲裁维护自身权益。\n\n"
    answer += "免责声明：本意见仅供参考，具体法律问题建议咨询专业律师。"
    
    response = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": data.get("model", "gpt-3.5-turbo"),
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": answer
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": len(user_content) // 4,
            "completion_tokens": len(answer) // 4,
            "total_tokens": (len(user_content) + len(answer)) // 4
        }
    }
    
    print(f"[Mock OpenAI Server] Received request, auth=OK, returning response ({len(answer)} chars)")
    return jsonify(response)

@app.route('/v1/models', methods=['GET'])
def list_models():
    return jsonify({
        "data": [
            {"id": "gpt-3.5-turbo", "object": "model", "owned_by": "mock"}
        ]
    })

if __name__ == '__main__':
    print("=" * 60)
    print("本地OpenAI兼容模拟服务器")
    print(f"有效API Key: {VALID_API_KEY}")
    print("监听地址: http://localhost:6001")
    print("=" * 60)
    app.run(host='0.0.0.0', port=6001, debug=False)
