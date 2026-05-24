"""
智能图表推荐引擎
根据数据类型组合推荐合适的图表类型
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np

from .chart_builder import ChartConfig


PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'


@dataclass
class ChartInfo:
    chart_type: str
    name: str
    icon: str
    description: str
    required_fields: List[str]
    optional_fields: List[str]
    supported_types: Dict[str, List[str]]


CHART_LIBRARY = {
    'line': ChartInfo(
        chart_type='line',
        name='折线图',
        icon='📈',
        description='展示数据随时间的变化趋势，适合时间序列分析',
        required_fields=['x'],
        optional_fields=['y', 'color', 'group'],
        supported_types={
            'x': ['datetime', 'numeric', 'categorical'],
            'y': ['numeric'],
            'color': ['categorical', 'numeric', 'geographic'],
            'group': ['categorical']
        }
    ),
    'bar': ChartInfo(
        chart_type='bar',
        name='柱状图',
        icon='📊',
        description='比较不同类别之间的数值大小，支持分组和堆叠',
        required_fields=['x', 'y'],
        optional_fields=['color', 'group'],
        supported_types={
            'x': ['categorical', 'datetime', 'geographic'],
            'y': ['numeric'],
            'color': ['categorical', 'numeric'],
            'group': ['categorical']
        }
    ),
    'scatter': ChartInfo(
        chart_type='scatter',
        name='散点图',
        icon='⚪',
        description='展示两个变量之间的相关性，可通过颜色和大小展示更多维度',
        required_fields=['x', 'y'],
        optional_fields=['color', 'group'],
        supported_types={
            'x': ['numeric', 'datetime'],
            'y': ['numeric'],
            'color': ['numeric', 'categorical', 'datetime'],
            'group': ['categorical']
        }
    ),
    'box': ChartInfo(
        chart_type='box',
        name='箱线图',
        icon='📦',
        description='展示数据的分布情况，包括四分位数、中位数和异常值',
        required_fields=['x', 'y'],
        optional_fields=['color'],
        supported_types={
            'x': ['categorical', 'geographic'],
            'y': ['numeric'],
            'color': ['categorical']
        }
    ),
    'heatmap': ChartInfo(
        chart_type='heatmap',
        name='热力图',
        icon='🔥',
        description='通过颜色深浅展示两个类别变量交叉的数值大小',
        required_fields=['x', 'y'],
        optional_fields=['color'],
        supported_types={
            'x': ['categorical', 'datetime'],
            'y': ['categorical', 'datetime'],
            'color': ['numeric']
        }
    ),
    'geo': ChartInfo(
        chart_type='geo',
        name='地理地图',
        icon='🗺️',
        description='在地图上展示各地区的数据分布情况',
        required_fields=['x'],
        optional_fields=['y', 'color'],
        supported_types={
            'x': ['geographic'],
            'y': ['numeric'],
            'color': ['numeric']
        }
    ),
    'pie': ChartInfo(
        chart_type='pie',
        name='饼图',
        icon='🥧',
        description='展示各部分占总体的比例关系',
        required_fields=['x', 'y'],
        optional_fields=['color'],
        supported_types={
            'x': ['categorical', 'geographic'],
            'y': ['numeric'],
            'color': ['categorical']
        }
    ),
    'histogram': ChartInfo(
        chart_type='histogram',
        name='直方图',
        icon='📶',
        description='展示单个数值变量的分布情况',
        required_fields=['x'],
        optional_fields=['color'],
        supported_types={
            'x': ['numeric'],
            'color': ['categorical']
        }
    )
}


def get_supported_charts() -> Dict[str, ChartInfo]:
    """
    获取所有支持的图表类型

    Returns:
        图表信息字典
    """
    return CHART_LIBRARY


def get_chart_info() -> Dict[str, Dict[str, Any]]:
    """
    获取所有图表的基本信息（用于UI展示）

    Returns:
        图表信息字典
    """
    result = {}
    for chart_type, chart_info in CHART_LIBRARY.items():
        result[chart_type] = {
            'name': chart_info.chart_type,
            'name_cn': chart_info.name,
            'icon': chart_info.icon,
            'description': chart_info.description,
            'required_fields': chart_info.required_fields,
            'optional_fields': chart_info.optional_fields
        }
    return result


def score_chart_type(
    chart_type: str,
    column_types: Dict[str, str],
    selected_columns: Optional[Dict[str, str]] = None,
    df: Optional[pd.DataFrame] = None
) -> Tuple[float, List[str]]:
    """
    为特定图表类型打分

    Args:
        chart_type: 图表类型
        column_types: 列类型字典
        selected_columns: 已选择的字段映射 {区域: 列名}
        df: 数据DataFrame（可选，用于更精确的推荐）

    Returns:
        (分数, 推荐理由列表)
    """
    if chart_type not in CHART_LIBRARY:
        return 0.0, ['不支持的图表类型']

    chart_info = CHART_LIBRARY[chart_type]
    score = 0.0
    reasons = []

    available_types = set(column_types.values())
    available_columns = list(column_types.keys())

    required_count = len(chart_info.required_fields)
    optional_count = len(chart_info.optional_fields)

    matched_required = 0
    for field in chart_info.required_fields:
        supported = chart_info.supported_types.get(field, [])
        has_support = any(t in available_types for t in supported)
        if has_support:
            matched_required += 1

    if matched_required == required_count:
        score += 50
        reasons.append('满足所有必填字段要求')
    elif matched_required > 0:
        score += matched_required * 15
        reasons.append(f'部分满足必填字段 ({matched_required}/{required_count})')
    else:
        return 0.0, ['缺少必要的字段类型']

    for field in chart_info.optional_fields:
        supported = chart_info.supported_types.get(field, [])
        has_support = any(t in available_types for t in supported)
        if has_support:
            score += 10

    if selected_columns:
        selected_score = 0
        for field, col in selected_columns.items():
            if col and col in column_types:
                col_type = column_types[col]
                supported = chart_info.supported_types.get(field, [])
                if col_type in supported:
                    selected_score += 20
                    reasons.append(f'{field}字段类型匹配')
                else:
                    selected_score -= 10
        score += selected_score

    if chart_type == 'line' and 'datetime' in available_types:
        score += 15
        reasons.append('检测到时间字段，适合趋势分析')

    if chart_type == 'geo' and 'geographic' in available_types:
        score += 25
        reasons.append('检测到地理字段，适合地图展示')

    if chart_type == 'heatmap':
        categorical_count = sum(1 for t in column_types.values() if t == 'categorical')
        numeric_count = sum(1 for t in column_types.values() if t == 'numeric')
        if categorical_count >= 2 and numeric_count >= 1:
            score += 15
            reasons.append('有足够的分类和数值字段用于交叉分析')

    if chart_type == 'box' and df is not None:
        categorical_cols = [c for c, t in column_types.items() if t == 'categorical']
        numeric_cols = [c for c, t in column_types.items() if t == 'numeric']
        if categorical_cols and numeric_cols:
            for cat_col in categorical_cols:
                if df[cat_col].nunique() <= 20:
                    score += 10
                    reasons.append(f'{cat_col}类别数量适中，适合箱线图')
                    break

    score = min(score, 100.0)

    return score, reasons


def recommend_charts(
    column_types: Dict[str, str],
    selected_columns: Optional[Dict[str, str]] = None,
    df: Optional[pd.DataFrame] = None
) -> List[Dict[str, Any]]:
    """
    基于数据类型推荐合适的图表

    Args:
        df: 数据DataFrame
        column_types: 列类型字典
        selected_columns: 已选择的字段映射 {区域: 列名}

    Returns:
        推荐列表，每项包含: chart_type, name, icon, score, reasons, required_fields
    """
    recommendations = []

    for chart_type, chart_info in CHART_LIBRARY.items():
        score, reasons = score_chart_type(
            chart_type,
            column_types,
            selected_columns,
            df
        )

        if score > 0:
            recommendations.append({
                'chart_type': chart_type,
                'name': chart_info.name,
                'icon': chart_info.icon,
                'description': chart_info.description,
                'score': round(score, 1),
                'reasons': reasons,
                'required_fields': chart_info.required_fields,
                'optional_fields': chart_info.optional_fields,
                'supported_types': chart_info.supported_types
            })

    recommendations.sort(key=lambda x: x['score'], reverse=True)

    return recommendations


def get_default_chart_config(
    chart_type: str,
    column_types: Dict[str, str]
) -> ChartConfig:
    """
    获取图表的默认配置

    Args:
        chart_type: 图表类型
        column_types: 列类型字典

    Returns:
        默认配置ChartConfig对象
    """
    config = ChartConfig(
        chart_type=chart_type,
        title='',
        x_axis=None,
        y_axis=[],
        color=None,
        group=None,
        aggregation='sum'
    )

    numeric_cols = [c for c, t in column_types.items() if t == 'numeric']
    categorical_cols = [c for c, t in column_types.items() if t == 'categorical']
    datetime_cols = [c for c, t in column_types.items() if t == 'datetime']
    geographic_cols = [c for c, t in column_types.items() if t == 'geographic']

    if chart_type == 'line':
        if datetime_cols:
            config.x_axis = datetime_cols[0]
        elif numeric_cols:
            config.x_axis = numeric_cols[0]
        if numeric_cols:
            config.y_axis = [numeric_cols[0]]
        if categorical_cols:
            config.color = categorical_cols[0]
        config.aggregation = 'sum'

    elif chart_type == 'bar':
        if categorical_cols:
            config.x_axis = categorical_cols[0]
        elif geographic_cols:
            config.x_axis = geographic_cols[0]
        elif datetime_cols:
            config.x_axis = datetime_cols[0]
        if numeric_cols:
            config.y_axis = [numeric_cols[0]]
        if len(categorical_cols) > 1:
            config.color = categorical_cols[1]
        config.aggregation = 'sum'

    elif chart_type == 'scatter':
        if len(numeric_cols) >= 2:
            config.x_axis = numeric_cols[0]
            config.y_axis = [numeric_cols[1]]
        if len(categorical_cols) >= 1:
            config.color = categorical_cols[0]
        elif len(numeric_cols) >= 3:
            config.color = numeric_cols[2]
        config.aggregation = 'none'

    elif chart_type == 'box':
        if categorical_cols:
            config.x_axis = categorical_cols[0]
        if numeric_cols:
            config.y_axis = [numeric_cols[0]]
        if len(categorical_cols) > 1:
            config.color = categorical_cols[1]
        config.aggregation = 'none'

    elif chart_type == 'heatmap':
        if len(categorical_cols) >= 2:
            config.x_axis = categorical_cols[0]
            config.y_axis = [categorical_cols[1]]
        elif len(datetime_cols) >= 1 and len(categorical_cols) >= 1:
            config.x_axis = datetime_cols[0]
            config.y_axis = [categorical_cols[0]]
        if numeric_cols:
            config.color = numeric_cols[0]
        config.aggregation = 'sum'

    elif chart_type == 'geo':
        if geographic_cols:
            config.x_axis = geographic_cols[0]
        if numeric_cols:
            config.y_axis = [numeric_cols[0]]
        config.aggregation = 'sum'

    elif chart_type == 'pie':
        if categorical_cols:
            config.x_axis = categorical_cols[0]
        elif geographic_cols:
            config.x_axis = geographic_cols[0]
        if numeric_cols:
            config.y_axis = [numeric_cols[0]]
        config.aggregation = 'sum'

    elif chart_type == 'histogram':
        if numeric_cols:
            config.x_axis = numeric_cols[0]
        config.aggregation = 'count'

    return config
