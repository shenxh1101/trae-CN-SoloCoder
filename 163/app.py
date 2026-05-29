
import random
import string
import base64
import time
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from flask import Flask, request, jsonify, send_file, render_template

app = Flask(__name__)
app.secret_key = 'captcha_secret_key_2024'
app.config['PERMANENT_SESSION_LIFETIME'] = 300

CAPTCHA_STORE = {}
CAPTCHA_EXPIRE_TIME = 300
MAX_ATTEMPTS = 3

def generate_token():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

def generate_random_code(length=4):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))

def generate_math_captcha():
    operators = ['+', '-', '*']
    op = random.choice(operators)
    if op == '+':
        a = random.randint(10, 50)
        b = random.randint(10, 50)
        result = a + b
    elif op == '-':
        a = random.randint(30, 99)
        b = random.randint(10, a - 10)
        result = a - b
    else:
        a = random.randint(2, 9)
        b = random.randint(2, 9)
        result = a * b
    expression = f"{a}{op}{b}=?"
    return expression, str(result)

def generate_captcha_image(code, width=200, height=80, font_size=40):
    image = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(image)
    
    # ============ 第一层：背景噪点（约2%像素点）===========
    # 用途：增加背景复杂度，防止OCR工具通过二值化直接识别
    for x in range(width):
        for y in range(height):
            if random.random() < 0.02:
                draw.point((x, y), fill=(random.randint(200, 240), random.randint(200, 240), random.randint(200, 240)))
    
    # ============ 第二层：干扰线条（3-6条随机线条）===========
    # 用途：切割字符区域，增加自动识别时字符分割的难度
    # 保证至少3条线条，最多6条，随机起点和终点
    for _ in range(random.randint(3, 6)):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        draw.line([(x1, y1), (x2, y2)], fill=(random.randint(150, 200), random.randint(150, 200), random.randint(150, 200)), width=1)
    
    # ============ 第三层：前景噪点（50-100个随机点）===========
    # 用途：覆盖字符边缘，干扰字符轮廓识别
    # 保证至少50个噪点，最多100个，颜色比背景噪点更深
    for _ in range(random.randint(50, 100)):
        x = random.randint(0, width)
        y = random.randint(0, height)
        draw.point((x, y), fill=(random.randint(100, 200), random.randint(100, 200), random.randint(100, 200)))
    
    # 加载字体，优先使用系统字体，失败则使用默认字体
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # ============ 第四层：绘制验证码字符 ============
    # 每个字符有随机的位置偏移，增加识别难度
    char_width = width // len(code)
    for i, char in enumerate(code):
        x = i * char_width + random.randint(5, 15)
        y = random.randint(5, height - font_size - 10)
        color = (random.randint(30, 100), random.randint(30, 100), random.randint(30, 100))
        draw.text((x, y), char, font=font, fill=color)
    
    return image

def image_to_base64(image):
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def cleanup_expired_captchas():
    current_time = time.time()
    expired_tokens = [token for token, data in CAPTCHA_STORE.items() if current_time - data['created_at'] > CAPTCHA_EXPIRE_TIME]
    for token in expired_tokens:
        del CAPTCHA_STORE[token]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate_captcha', methods=['GET'])
def generate_captcha():
    cleanup_expired_captchas()
    
    width = int(request.args.get('width', 200))
    height = int(request.args.get('height', 80))
    font_size = int(request.args.get('font_size', 40))
    mode = request.args.get('mode', 'text')
    
    token = generate_token()
    
    if mode == 'math':
        code, answer = generate_math_captcha()
    else:
        code = generate_random_code(4)
        answer = code
    
    image = generate_captcha_image(code, width, height, font_size)
    
    CAPTCHA_STORE[token] = {
        'answer': answer,
        'created_at': time.time(),
        'attempts': 0,
        'locked': False
    }
    
    if request.args.get('format') == 'base64':
        return jsonify({
            'success': True,
            'token': token,
            'image_base64': image_to_base64(image)
        })
    
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    buffer.seek(0)
    
    response = send_file(buffer, mimetype='image/png')
    response.headers['X-Captcha-Token'] = token
    return response

@app.route('/verify_captcha', methods=['POST'])
def verify_captcha():
    cleanup_expired_captchas()
    
    data = request.get_json()
    token = data.get('token')
    user_input = data.get('captcha', '').upper()
    
    if not token or not user_input:
        return jsonify({'success': False, 'message': 'Token和验证码不能为空'}), 400
    
    if token not in CAPTCHA_STORE:
        return jsonify({'success': False, 'message': '验证码不存在或已过期'})
    
    captcha_data = CAPTCHA_STORE[token]
    
    if captcha_data['locked']:
        return jsonify({'success': False, 'message': '验证码已被锁定，请刷新'})
    
    if time.time() - captcha_data['created_at'] > CAPTCHA_EXPIRE_TIME:
        del CAPTCHA_STORE[token]
        return jsonify({'success': False, 'message': '验证码已过期'})
    
    if user_input == captcha_data['answer']:
        del CAPTCHA_STORE[token]
        return jsonify({'success': True, 'message': '验证成功'})
    else:
        captcha_data['attempts'] += 1
        if captcha_data['attempts'] >= MAX_ATTEMPTS:
            captcha_data['locked'] = True
            return jsonify({'success': False, 'message': f'验证失败，已连续错误{MAX_ATTEMPTS}次，验证码已锁定'})
        return jsonify({'success': False, 'message': f'验证失败，还剩{MAX_ATTEMPTS - captcha_data["attempts"]}次机会'})

@app.route('/refresh_captcha', methods=['POST'])
def refresh_captcha():
    cleanup_expired_captchas()
    
    data = request.get_json()
    token = data.get('token')
    
    width = int(data.get('width', 200))
    height = int(data.get('height', 80))
    font_size = int(data.get('font_size', 40))
    mode = data.get('mode', 'text')
    
    if not token:
        return jsonify({'success': False, 'message': 'Token不能为空'}), 400
    
    if token not in CAPTCHA_STORE:
        return jsonify({'success': False, 'message': 'Token不存在'})
    
    if mode == 'math':
        code, answer = generate_math_captcha()
    else:
        code = generate_random_code(4)
        answer = code
    
    image = generate_captcha_image(code, width, height, font_size)
    
    CAPTCHA_STORE[token] = {
        'answer': answer,
        'created_at': time.time(),
        'attempts': 0,
        'locked': False
    }
    
    return jsonify({
        'success': True,
        'token': token,
        'image_base64': image_to_base64(image)
    })

@app.route('/batch_generate', methods=['GET'])
def batch_generate():
    cleanup_expired_captchas()
    
    width = int(request.args.get('width', 200))
    height = int(request.args.get('height', 80))
    font_size = int(request.args.get('font_size', 40))
    mode = request.args.get('mode', 'text')
    count = min(int(request.args.get('count', 10)), 20)
    
    tokens = []
    images = []
    
    for _ in range(count):
        token = generate_token()
        
        if mode == 'math':
            code, answer = generate_math_captcha()
        else:
            code = generate_random_code(4)
            answer = code
        
        image = generate_captcha_image(code, width, height, font_size)
        
        CAPTCHA_STORE[token] = {
            'answer': answer,
            'created_at': time.time(),
            'attempts': 0,
            'locked': False
        }
        
        tokens.append(token)
        images.append(image_to_base64(image))
    
    return jsonify({
        'success': True,
        'count': count,
        'tokens': tokens,
        'images': images
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
