import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
SAMPLES_DIR = os.path.join(DATA_DIR, 'corrected_samples')
HISTORY_DIR = os.path.join(DATA_DIR, 'history')
EXPORT_DIR = os.path.join(DATA_DIR, 'exports')
BATCH_DIR = os.path.join(DATA_DIR, 'batch_uploads')

IMAGE_SIZE = (64, 64)
BATCH_IMAGE_SIZE = (128, 128)

CHAR_LIST = [
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '大', '小', '中', '人', '口', '手', '目', '耳', '头', '心',
    '日', '月', '水', '火', '木', '金', '土', '山', '石', '田',
    '天', '地', '星', '云', '风', '雨', '雪', '雷', '电', '虹',
    '春', '夏', '秋', '冬', '东', '西', '南', '北', '前', '后',
    '左', '右', '上', '下', '里', '外', '高', '低', '远', '近',
    '多', '少', '长', '短', '红', '黄', '蓝', '绿', '白', '黑',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
]

RETRAIN_THRESHOLD = 50

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(SAMPLES_DIR, exist_ok=True)
os.makedirs(HISTORY_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)
os.makedirs(BATCH_DIR, exist_ok=True)
