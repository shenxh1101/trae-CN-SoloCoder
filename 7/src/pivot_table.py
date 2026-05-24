"""
数据透视表模块
拖拽行、列、值字段，自动计算汇总并显示热力图
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px


PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'


@dataclass
class PivotValue:
    column: str
    aggregation: str = 'sum'
    display_name: str = ''


@dataclass
class PivotConfig:
    pivot_id: str = ''
    rows: List[str] = field(default_factory=list)
    columns: List[str] = field(default_factory=list)
    values: List[PivotValue] = field(default_factory=list)
    show_heatmap: bool = True
    heatmap_colorscale: str = 'blues'
    totals: bool = True


AGGREGATION_OPTIONS = [
    ('sum', '求和'),
    ('mean', '平均值'),
    ('count', '计数'),
    ('min', '最小值'),
    ('max', '最大值'),
    ('median', '中位数'),
    ('std', '标准差'),
    ('var', '方差'),
    ('nunique', '唯一值计数')
]


def get_aggregation_display(agg: str) -> str:
    """
    获取聚合函数的中文显示

    Args:
        agg: 聚合函数名

    Returns:
        中文显示名
    """
    for key, display in AGGREGATION_OPTIONS:
        if key == agg:
            return display
    return agg


def aggregate_values(
    df: pd.DataFrame,
    rows: List[str],
    columns: List[str],
    values: List[PivotValue]
) -> pd.DataFrame:
    """
    计算透视表聚合值

    Args:
        df: 原始数据
        rows: 行字段列表
        columns: 列字段列表
        values: 值字段配置列表

    Returns:
        透视结果DataFrame
    """
    if df is None or df.empty:
        return pd.DataFrame()

    if not rows and not columns:
        return pd.DataFrame()

    if not values:
        values = [PivotValue(column=df.columns[0], aggregation='count')]

    group_cols = rows + columns
    if not group_cols:
        return pd.DataFrame()

    agg_dict = {}
    for val in values:
        if val.column not in df.columns:
            continue

        if val.aggregation == 'nunique':
            agg_dict[val.display_name or f'{val.column}_nunique'] = (val.column, 'nunique')
        else:
            agg_name = val.display_name or f'{val.column}_{val.aggregation}'
            agg_dict[agg_name] = (val.column, val.aggregation)

    if not agg_dict:
        return pd.DataFrame()

    try:
        grouped = df.groupby(group_cols, as_index=False).agg(**agg_dict)
    except Exception as e:
        print(f"聚合计算失败: {e}")
        return pd.DataFrame()

    if len(rows) > 0 and len(columns) > 0:
        try:
            value_cols = list(agg_dict.keys())
            pivot_result = grouped.pivot_table(
                index=rows,
                columns=columns,
                values=value_cols[0] if len(value_cols) == 1 else value_cols,
                aggfunc='first'
            )
            return pivot_result
        except Exception as e:
            print(f"透视转换失败: {e}")
            return grouped
    else:
        return grouped


def build_pivot(
    df: pd.DataFrame,
    config: PivotConfig,
    filter_condition: Optional[Any] = None
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    构建透视表

    Args:
        df: 数据源
        config: 透视表配置
        filter_condition: 筛选条件

    Returns:
        (透视结果DataFrame, 样式化的显示DataFrame)
    """
    data = df.copy()

    if filter_condition and hasattr(filter_condition, 'column') and filter_condition.column:
        col = filter_condition.column
        op = filter_condition.operator
        values = filter_condition.values

        if col in data.columns:
            if op == 'equals' and values:
                data = data[data[col] == values[0]]
            elif op == 'in' and values:
                data = data[data[col].isin(values)]

    if data.empty:
        return pd.DataFrame(), pd.DataFrame()

    result = aggregate_values(data, config.rows, config.columns, config.values)

    display_df = result.copy()

    if config.totals and not result.empty:
        try:
            display_df = _add_totals(display_df, config)
        except:
            pass

    return result, display_df


def _add_totals(df: pd.DataFrame, config: PivotConfig) -> pd.DataFrame:
    """
    添加合计行和列

    Args:
        df: 透视结果
        config: 透视配置

    Returns:
        带合计的DataFrame
    """
    result = df.copy()

    if isinstance(result.index, pd.MultiIndex):
        numeric_cols = result.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            total_row = result[numeric_cols].sum()
            total_row.name = ('合计',) + ('',) * (len(result.index.names) - 1)
            result = pd.concat([result, total_row.to_frame().T])

    return result


def pivot_to_heatmap(
    pivot_df: pd.DataFrame,
    config: PivotConfig
) -> go.Figure:
    """
    将透视表转换为热力图

    Args:
        pivot_df: 透视结果DataFrame
        config: 透视配置

    Returns:
        Plotly热力图Figure
    """
    if pivot_df is None or pivot_df.empty:
        fig = go.Figure()
        fig.update_layout(title='暂无数据')
        return fig

    display_df = pivot_df.copy()

    if isinstance(display_df.columns, pd.MultiIndex):
        display_df.columns = ['_'.join(map(str, col)).strip('_') for col in display_df.columns]

    if isinstance(display_df.index, pd.MultiIndex):
        display_df.index = [' - '.join(map(str, idx)) for idx in display_df.index]

    numeric_data = display_df.select_dtypes(include=[np.number])

    if numeric_data.empty:
        fig = go.Figure()
        fig.update_layout(title='没有数值数据可显示热力图')
        return fig

    colorscales = {
        'blues': [
            [0, '#e3f2fd'], [0.2, '#bbdefb'], [0.4, '#90caf9'],
            [0.6, '#42a5f5'], [0.8, '#1e88e5'], [1, '#1e3a5f']
        ],
        'oranges': [
            [0, '#fff3e0'], [0.2, '#ffe0b2'], [0.4, '#ffcc80'],
            [0.6, '#ff9800'], [0.8, '#f97316'], [1, '#e65100']
        ],
        'greens': [
            [0, '#e8f5e9'], [0.2, '#c8e6c9'], [0.4, '#a5d6a7'],
            [0.6, '#66bb6a'], [0.8, '#43a047'], [1, '#2e7d32']
        ],
        'reds': [
            [0, '#ffebee'], [0.2, '#ffcdd2'], [0.4, '#ef9a9a'],
            [0.6, '#ef5350'], [0.8, '#e53935'], [1, '#c62828']
        ],
        'viridis': 'Viridis',
        'plasma': 'Plasma',
        'rdylbu': 'RdYlBu'
    }

    colorscale = colorscales.get(config.heatmap_colorscale, colorscales['blues'])

    text_matrix = []
    for i in range(len(numeric_data)):
        row_text = []
        for j in range(len(numeric_data.columns)):
            val = numeric_data.iloc[i, j]
            if pd.isna(val):
                row_text.append('-')
            elif abs(val) >= 1000:
                row_text.append(f'{val:,.0f}')
            elif abs(val) >= 1:
                row_text.append(f'{val:,.2f}')
            else:
                row_text.append(f'{val:.4f}')
        text_matrix.append(row_text)

    fig = go.Figure(go.Heatmap(
        z=numeric_data.values,
        x=numeric_data.columns,
        y=numeric_data.index,
        colorscale=colorscale,
        text=text_matrix,
        texttemplate='%{text}',
        textfont=dict(size=10),
        hovertemplate='<b>行</b>: %{y}<br><b>列</b>: %{x}<br><b>值</b>: %{z:,.4f}<extra></extra>',
        showscale=True,
        xgap=1,
        ygap=1
    ))

    title_parts = []
    if config.rows:
        title_parts.append('行: ' + ', '.join(config.rows))
    if config.columns:
        title_parts.append('列: ' + ', '.join(config.columns))
    if config.values:
        val_names = [v.display_name or v.column for v in config.values]
        title_parts.append('值: ' + ', '.join(val_names))

    fig.update_layout(
        title='透视表热力图 - ' + ' | '.join(title_parts) if title_parts else '透视表热力图',
        xaxis_title='列字段',
        yaxis_title='行字段',
        template='plotly_white',
        height=max(400, len(numeric_data) * 35 + 150),
        margin=dict(l=120, r=40, t=100, b=80)
    )

    return fig


def get_pivot_summary(pivot_df: pd.DataFrame) -> Dict[str, Any]:
    """
    获取透视表摘要信息

    Args:
        pivot_df: 透视结果DataFrame

    Returns:
        摘要信息字典
    """
    if pivot_df is None or pivot_df.empty:
        return {
            'row_count': 0,
            'column_count': 0,
            'total_value': 0,
            'max_value': 0,
            'min_value': 0,
            'avg_value': 0
        }

    numeric_data = pivot_df.select_dtypes(include=[np.number])

    if numeric_data.empty:
        return {
            'row_count': len(pivot_df),
            'column_count': len(pivot_df.columns),
            'total_value': 0,
            'max_value': 0,
            'min_value': 0,
            'avg_value': 0
        }

    return {
        'row_count': len(pivot_df),
        'column_count': len(pivot_df.columns),
        'total_value': float(numeric_data.sum().sum()),
        'max_value': float(numeric_data.max().max()),
        'min_value': float(numeric_data.min().min()),
        'avg_value': float(numeric_data.mean().mean())
    }
