import os

SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.bmp', '.webp']
FORMAT_EXTENSIONS = {
    'JPEG': ['.jpg', '.jpeg'],
    'PNG': ['.png'],
    'BMP': ['.bmp'],
    'WEBP': ['.webp']
}

WATERMARK_POSITIONS = [
    '左上', '上中', '右上',
    '左中', '居中', '右中',
    '左下', '下中', '右下'
]

INTERPOLATION_METHODS = {
    '最近邻 (Nearest)': 'nearest',
    '双线性 (Bilinear)': 'bilinear',
    '双三次 (Bicubic)': 'bicubic',
    'Lanczos': 'lanczos',
    'BOX': 'box',
    'HAMMING': 'hamming'
}

FILTER_NAMES = [
    '原图', '灰度化', '黑白阈值', '老照片', '浮雕',
    '马赛克', '高斯模糊', '边缘检测', '轮廓提取'
]

RENAME_MODES = [
    '序号+前缀',
    '拍摄日期',
    '正则表达式替换'
]

ROTATE_OPTIONS = [
    '不旋转', '90度顺时针', '180度', '90度逆时针',
    '水平翻转', '垂直翻转', '自定义角度'
]

CROP_MODES = [
    '固定尺寸', '指定区域比例', '智能裁剪空白边缘'
]

HISTORY_FILE = os.path.join(os.path.expanduser('~'), '.image_batch_processor_history.json')
