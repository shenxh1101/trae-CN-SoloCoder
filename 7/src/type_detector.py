"""
数据类型自动检测模块
自动识别数值型、分类型、时间型、地理型、文本型数据
"""

import re
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any


GEOGRAPHIC_PATTERNS = [
    r'(省份|地区|区域|城市|国家|地址|邮编|经度|纬度|坐标|location|region|province|city|state|country|address|zip|postal|lon|lat|longitude|latitude)',
    r'(北京|上海|广东|浙江|江苏|四川|湖北|山东|河南|福建|湖南|河北|安徽|辽宁|陕西|重庆|天津|广州|深圳|杭州|南京|成都|武汉|西安)'
]

DATE_PATTERNS = [
    r'^\d{4}[-/]\d{1,2}[-/]\d{1,2}',
    r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}',
    r'^\d{4}年\d{1,2}月\d{1,2}日',
    r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}',
]

DATETIME_KEYWORDS = [
    'date', 'time', 'datetime', 'timestamp', '创建时间', '更新时间', '下单时间',
    '支付时间', '交易时间', '日期', '时间', '年份', '月份', '日', '周'
]

NUMERIC_KEYWORDS = [
    'amount', 'price', 'total', 'count', 'quantity', 'sales', 'revenue',
    'profit', 'cost', 'fee', 'value', 'score', 'rating', 'age', '金额',
    '价格', '总价', '数量', '销售额', '收入', '利润', '成本', '费用',
    '价值', '评分', '年龄', '数量', '个数', '次数'
]

CATEGORICAL_THRESHOLD = 0.1
TEXT_THRESHOLD = 50


def detect_column_type(series: pd.Series, column_name: str = '') -> str:
    """
    检测单列的数据类型

    Args:
        series: 待检测的Series
        column_name: 列名（用于辅助判断）

    Returns:
        类型标识: numeric, categorical, datetime, geographic, text, boolean
    """
    if series is None or len(series) == 0:
        return 'unknown'

    col_lower = str(column_name).lower()

    if pd.api.types.is_bool_dtype(series):
        return 'boolean'

    if pd.api.types.is_datetime64_any_dtype(series):
        return 'datetime'

    if pd.api.types.is_numeric_dtype(series):
        if _is_geographic_column(column_name, series):
            return 'geographic'
        return 'numeric'

    if pd.api.types.is_categorical_dtype(series):
        return 'categorical'

    if _is_datetime_column(series, column_name):
        return 'datetime'

    if _is_geographic_column(column_name, series):
        return 'geographic'

    non_null = series.dropna()
    if len(non_null) == 0:
        return 'unknown'

    unique_ratio = non_null.nunique() / len(non_null)

    if unique_ratio <= CATEGORICAL_THRESHOLD:
        return 'categorical'

    if _is_numeric_column(series):
        return 'numeric'

    avg_text_length = non_null.astype(str).str.len().mean()
    if avg_text_length > TEXT_THRESHOLD:
        return 'text'

    return 'categorical'


def _is_datetime_column(series: pd.Series, column_name: str) -> bool:
    """
    检测是否为日期时间列
    """
    col_lower = str(column_name).lower()

    for keyword in DATETIME_KEYWORDS:
        if keyword.lower() in col_lower:
            return True

    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False

    sample_size = min(100, len(non_null))
    sample = non_null.sample(sample_size, random_state=42) if len(non_null) > sample_size else non_null

    match_count = 0
    for value in sample:
        for pattern in DATE_PATTERNS:
            if re.match(pattern, str(value)):
                match_count += 1
                break

    if match_count / sample_size > 0.6:
        return True

    try:
        pd.to_datetime(series.head(100), errors='coerce').notna().sum() / sample_size > 0.6
        return True
    except:
        pass

    return False


def _is_geographic_column(column_name: str, series: pd.Series) -> bool:
    """
    检测是否为地理相关列
    """
    col_lower = str(column_name).lower()

    for pattern in GEOGRAPHIC_PATTERNS:
        if re.search(pattern, col_lower, re.IGNORECASE):
            return True

    non_null = series.dropna().astype(str)
    if len(non_null) == 0:
        return False

    sample_size = min(50, len(non_null))
    sample = non_null.sample(sample_size, random_state=42) if len(non_null) > sample_size else non_null

    for value in sample:
        for pattern in GEOGRAPHIC_PATTERNS:
            if re.search(pattern, str(value), re.IGNORECASE):
                return True

    return False


def _is_numeric_column(series: pd.Series) -> bool:
    """
    检测字符串列是否可转换为数值
    """
    non_null = series.dropna()
    if len(non_null) == 0:
        return False

    sample_size = min(100, len(non_null))
    sample = non_null.sample(sample_size, random_state=42) if len(non_null) > sample_size else non_null

    try:
        converted = pd.to_numeric(sample, errors='coerce')
        return converted.notna().sum() / sample_size > 0.8
    except:
        return False


def classify_columns(df: pd.DataFrame) -> Dict[str, str]:
    """
    分类DataFrame所有列的数据类型

    Args:
        df: 输入DataFrame

    Returns:
        {列名: 类型} 字典
    """
    if df is None or df.empty:
        return {}

    column_types = {}
    for col in df.columns:
        column_types[str(col)] = detect_column_type(df[col], str(col))

    return column_types


def get_columns_by_type(column_types: Dict[str, str], type_name: str) -> List[str]:
    """
    根据类型筛选列名

    Args:
        column_types: 列类型字典
        type_name: 目标类型

    Returns:
        列名列表
    """
    return [col for col, t in column_types.items() if t == type_name]


def get_type_icon(type_name: str) -> str:
    """
    获取类型对应的图标

    Args:
        type_name: 类型名称

    Returns:
        图标emoji
    """
    icons = {
        'numeric': '📊',
        'categorical': '🏷️',
        'datetime': '📅',
        'geographic': '🗺️',
        'text': '📝',
        'boolean': '✅',
        'unknown': '❓'
    }
    return icons.get(type_name, '❓')


def get_type_description(type_name: str) -> str:
    """
    获取类型的中文描述

    Args:
        type_name: 类型名称

    Returns:
        中文描述
    """
    descriptions = {
        'numeric': '数值型',
        'categorical': '分类型',
        'datetime': '时间型',
        'geographic': '地理型',
        'text': '文本型',
        'boolean': '布尔型',
        'unknown': '未知类型'
    }
    return descriptions.get(type_name, '未知类型')


def get_type_color(type_name: str) -> str:
    """
    获取类型对应的颜色

    Args:
        type_name: 类型名称

    Returns:
        颜色代码
    """
    colors = {
        'numeric': '#3b82f6',
        'categorical': '#f97316',
        'datetime': '#10b981',
        'geographic': '#8b5cf6',
        'text': '#f59e0b',
        'boolean': '#06b6d4',
        'unknown': '#9ca3af'
    }
    return colors.get(type_name, '#9ca3af')


def get_type_label(type_name: str) -> str:
    """
    获取类型的中文标签（get_type_description的别名）

    Args:
        type_name: 类型名称

    Returns:
        中文标签
    """
    return get_type_description(type_name)
