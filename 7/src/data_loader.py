"""
数据加载与解析模块
支持CSV、Excel、JSON文件解析，自动编码检测
"""

import io
import json
import re
from typing import List, Dict, Tuple, Optional, Union

import pandas as pd
import numpy as np


def auto_detect_encoding(content: bytes) -> str:
    """
    自动检测字节内容的编码格式

    Args:
        content: 原始字节内容

    Returns:
        检测到的编码格式
    """
    encodings_to_try = ['utf-8-sig', 'utf-8', 'gbk', 'gb2312', 'gb18030', 'latin-1']

    for encoding in encodings_to_try:
        try:
            content.decode(encoding)
            return encoding
        except (UnicodeDecodeError, UnicodeError):
            continue

    return 'utf-8'


def parse_json(content: bytes, encoding: str = 'utf-8') -> Tuple[Optional[pd.DataFrame], str]:
    """
    解析JSON数据为DataFrame

    Args:
        content: 原始字节内容
        encoding: 编码格式

    Returns:
        (DataFrame, 状态消息)
    """
    try:
        text = content.decode(encoding)
        data = json.loads(text)

        if isinstance(data, list):
            df = pd.json_normalize(data)
            return df, f"成功解析JSON数组，共{len(df)}行{len(df.columns)}列"
        elif isinstance(data, dict):
            if all(isinstance(v, list) for v in data.values()):
                df = pd.DataFrame(data)
                return df, f"成功解析JSON对象（数组值），共{len(df)}行{len(df.columns)}列"
            else:
                df = pd.json_normalize(data)
                return df, f"成功解析JSON对象，共{len(df)}行{len(df.columns)}列"
        else:
            return None, "JSON格式不支持，需要数组或对象格式"
    except json.JSONDecodeError as e:
        return None, f"JSON解析错误: {str(e)}"
    except Exception as e:
        return None, f"JSON处理错误: {str(e)}"


def load_file(file_obj) -> Tuple[Optional[pd.DataFrame], str]:
    """
    加载并解析上传的文件

    Args:
        file_obj: Streamlit上传文件对象，需包含name属性和read()方法

    Returns:
        (DataFrame, 状态消息)
    """
    if file_obj is None:
        return None, "未选择文件"

    filename = file_obj.name.lower()
    content = file_obj.read()

    try:
        if filename.endswith('.csv'):
            encoding = auto_detect_encoding(content)
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                return df, f"成功加载CSV文件，共{len(df)}行{len(df.columns)}列，编码: {encoding}"
            except Exception as e:
                return None, f"CSV加载失败: {str(e)}"

        elif filename.endswith(('.xlsx', '.xls')):
            try:
                excel_file = pd.ExcelFile(io.BytesIO(content))
                sheet_names = excel_file.sheet_names
                if len(sheet_names) == 1:
                    df = excel_file.parse(sheet_names[0])
                    return df, f"成功加载Excel文件，Sheet: {sheet_names[0]}，共{len(df)}行{len(df.columns)}列"
                else:
                    df = excel_file.parse(sheet_names[0])
                    return df, f"成功加载Excel文件（{len(sheet_names)}个Sheet，默认读取第一个），Sheet: {sheet_names[0]}，共{len(df)}行{len(df.columns)}列"
            except Exception as e:
                return None, f"Excel加载失败: {str(e)}"

        elif filename.endswith('.json'):
            encoding = auto_detect_encoding(content)
            df, msg = parse_json(content, encoding)
            return df, msg

        else:
            return None, f"不支持的文件格式: {filename}"

    except Exception as e:
        return None, f"文件加载失败: {str(e)}"


def load_sample_data() -> Tuple[pd.DataFrame, str]:
    """
    加载内置的电商示例数据用于演示

    Returns:
        (DataFrame, 状态消息)
    """
    try:
        from .sample_data import get_sample_data

        data = get_sample_data()
        if 'orders' in data and 'order_items' in data:
            orders_df = data['orders']
            order_items_df = data['order_items']
            products_df = data.get('products', pd.DataFrame())
            users_df = data.get('users', pd.DataFrame())

            merged_df = orders_df.merge(
                order_items_df,
                on='order_id',
                how='left',
                suffixes=('', '_item')
            )

            if not products_df.empty:
                merged_df = merged_df.merge(
                    products_df,
                    on='product_id',
                    how='left',
                    suffixes=('', '_product')
                )

            if not users_df.empty:
                merged_df = merged_df.merge(
                    users_df,
                    on='user_id',
                    how='left',
                    suffixes=('', '_user')
                )

            return merged_df, f"成功加载示例数据，共{len(merged_df)}行{len(merged_df.columns)}列"
        elif 'orders' in data:
            return data['orders'], f"成功加载订单示例数据，共{len(data['orders'])}行"
        else:
            return pd.DataFrame(), "示例数据为空"
    except Exception as e:
        return pd.DataFrame(), f"加载示例数据失败: {str(e)}"


def get_data_preview(df: pd.DataFrame, max_rows: int = 10) -> pd.DataFrame:
    """
    获取数据预览

    Args:
        df: 输入DataFrame
        max_rows: 最大预览行数

    Returns:
        预览DataFrame
    """
    if df is None or df.empty:
        return pd.DataFrame()
    return df.head(max_rows).copy()


def get_basic_info(df: pd.DataFrame) -> Dict:
    """
    获取数据基本信息

    Args:
        df: 输入DataFrame

    Returns:
        包含基本信息的字典
    """
    if df is None or df.empty:
        return {
            'row_count': 0,
            'column_count': 0,
            'total_cells': 0,
            'memory_usage': 0,
            'columns': []
        }

    try:
        memory_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
    except:
        memory_mb = 0

    columns_info = []
    for col in df.columns:
        col_info = {
            'name': str(col),
            'type': str(df[col].dtype),
            'non_null_count': int(df[col].notna().sum()),
            'null_count': int(df[col].isna().sum()),
            'null_percentage': round(df[col].isna().sum() / len(df) * 100, 2) if len(df) > 0 else 0,
            'unique_count': int(df[col].nunique(dropna=True))
        }
        columns_info.append(col_info)

    return {
        'row_count': int(len(df)),
        'column_count': int(len(df.columns)),
        'total_cells': int(len(df) * len(df.columns)),
        'memory_usage': round(memory_mb, 4),
        'columns': columns_info
    }
