"""
图表构建与渲染模块
接收字段配置，生成Plotly图表对象
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

from .type_detector import get_type_color


PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'
COLOR_PALETTE = [
    '#1e3a5f', '#f97316', '#3b82f6', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
]


@dataclass
class ChartConfig:
    chart_id: str = ''
    chart_type: str = 'line'
    title: str = ''
    x_axis: Optional[str] = None
    y_axis: List[str] = field(default_factory=list)
    color: Optional[str] = None
    group: Optional[str] = None
    aggregation: str = 'sum'
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FilterCondition:
    source_chart_id: str = ''
    column: str = ''
    operator: str = 'equals'
    values: List[Any] = field(default_factory=list)
    value: Optional[Any] = None
    display_text: str = ''

    def __post_init__(self):
        if self.value is not None and not self.values:
            self.values = [self.value]
        elif self.values and self.value is None:
            self.value = self.values[0] if self.values else None


def _apply_filter(df: pd.DataFrame, filter_condition: Optional[FilterCondition]) -> pd.DataFrame:
    """
    应用筛选条件到数据

    Args:
        df: 原始数据
        filter_condition: 筛选条件

    Returns:
        筛选后的数据
    """
    if filter_condition is None or not filter_condition.column:
        return df.copy()

    filtered_df = df.copy()
    col = filter_condition.column
    op = filter_condition.operator
    values = filter_condition.values

    if col not in filtered_df.columns:
        return filtered_df

    if op == 'equals' and values:
        filtered_df = filtered_df[filtered_df[col] == values[0]]
    elif op == 'in' and values:
        filtered_df = filtered_df[filtered_df[col].isin(values)]
    elif op == 'between' and len(values) >= 2:
        filtered_df = filtered_df[(filtered_df[col] >= values[0]) & (filtered_df[col] <= values[1])]
    elif op == 'greater' and values:
        filtered_df = filtered_df[filtered_df[col] > values[0]]
    elif op == 'less' and values:
        filtered_df = filtered_df[filtered_df[col] < values[0]]

    return filtered_df


def _aggregate_data(df: pd.DataFrame, config: ChartConfig) -> pd.DataFrame:
    """
    根据配置聚合数据

    Args:
        df: 原始数据
        config: 图表配置

    Returns:
        聚合后的数据
    """
    if config.aggregation == 'none' or not config.y_axis:
        return df.copy()

    group_cols = []
    if config.x_axis:
        group_cols.append(config.x_axis)
    if config.color:
        group_cols.append(config.color)
    if config.group:
        group_cols.append(config.group)

    if not group_cols:
        return df.copy()

    agg_funcs = {}
    for y_col in config.y_axis:
        if config.aggregation == 'sum':
            agg_funcs[y_col] = 'sum'
        elif config.aggregation == 'mean':
            agg_funcs[y_col] = 'mean'
        elif config.aggregation == 'count':
            agg_funcs[y_col] = 'count'
        elif config.aggregation == 'min':
            agg_funcs[y_col] = 'min'
        elif config.aggregation == 'max':
            agg_funcs[y_col] = 'max'
        else:
            agg_funcs[y_col] = 'sum'

    aggregated = df.groupby(group_cols, as_index=False).agg(agg_funcs)
    return aggregated


def build_line_chart(
    df: pd.DataFrame,
    config: ChartConfig,
    filter_condition: Optional[FilterCondition] = None
) -> go.Figure:
    """
    构建折线图

    Args:
        df: 数据源
        config: 图表配置
        filter_condition: 联动筛选条件

    Returns:
        Plotly Figure对象
    """
    data = _apply_filter(df, filter_condition)
    if config.aggregation != 'none':
        data = _aggregate_data(data, config)

    if data.empty or not config.x_axis or not config.y_axis:
        fig = go.Figure()
        fig.update_layout(title=config.title or '请配置图表字段')
        return fig

    fig = go.Figure()

    color_col = config.color if config.color and config.color in data.columns else None

    for i, y_col in enumerate(config.y_axis):
        if y_col not in data.columns:
            continue

        if color_col:
            for j, color_val in enumerate(data[color_col].unique()):
                subset = data[data[color_col] == color_val]
                color = COLOR_PALETTE[j % len(COLOR_PALETTE)]

                fig.add_trace(go.Scatter(
                    x=subset[config.x_axis],
                    y=subset[y_col],
                    mode='lines+markers',
                    name=f'{color_val} - {y_col}',
                    line=dict(color=color, width=2),
                    marker=dict(size=6, color=color),
                    hovertemplate=f'<b>{config.x_axis}</b>: %{{x}}<br><b>{y_col}</b>: %{{y:,.2f}}<extra></extra>'
                ))
        else:
            color = COLOR_PALETTE[i % len(COLOR_PALETTE)]
            fig.add_trace(go.Scatter(
                x=data[config.x_axis],
                y=data[y_col],
                mode='lines+markers',
                name=y_col,
                line=dict(color=color, width=2.5),
                marker=dict(size=6, color=color),
                hovertemplate=f'<b>{config.x_axis}</b>: %{{x}}<br><b>{y_col}</b>: %{{y:,.2f}}<extra></extra>'
            ))

    fig.update_layout(
        title=config.title or f'{config.x_axis} vs {", ".join(config.y_axis)}',
        xaxis_title=config.x_axis,
        yaxis_title=', '.join(config.y_axis),
        template='plotly_white',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        margin=dict(l=60, r=40, t=80, b=60)
    )

    return fig


def build_bar_chart(
    df: pd.DataFrame,
    config: ChartConfig,
    filter_condition: Optional[FilterCondition] = None
) -> go.Figure:
    """
    构建柱状图
    """
    data = _apply_filter(df, filter_condition)
    if config.aggregation != 'none':
        data = _aggregate_data(data, config)

    if data.empty or not config.x_axis or not config.y_axis:
        fig = go.Figure()
        fig.update_layout(title=config.title or '请配置图表字段')
        return fig

    y_col = config.y_axis[0]
    color_col = config.color if config.color and config.color in data.columns else None

    if color_col:
        fig = px.bar(
            data,
            x=config.x_axis,
            y=y_col,
            color=color_col,
            barmode='group',
            title=config.title or f'{config.x_axis} - {y_col}',
            color_discrete_sequence=COLOR_PALETTE,
            template='plotly_white'
        )
    else:
        fig = go.Figure(go.Bar(
            x=data[config.x_axis],
            y=data[y_col],
            marker_color=PRIMARY_COLOR,
            hovertemplate=f'<b>{config.x_axis}</b>: %{{x}}<br><b>{y_col}</b>: %{{y:,.2f}}<extra></extra>'
        ))

    fig.update_layout(
        title=config.title or f'{config.x_axis} - {y_col}',
        xaxis_title=config.x_axis,
        yaxis_title=y_col,
        template='plotly_white',
        xaxis_tickangle=-45,
        margin=dict(l=60, r=40, t=80, b=100)
    )

    return fig


def build_scatter_chart(
    df: pd.DataFrame,
    config: ChartConfig,
    filter_condition: Optional[FilterCondition] = None
) -> go.Figure:
    """
    构建散点图
    """
    data = _apply_filter(df, filter_condition)

    if data.empty or not config.x_axis or not config.y_axis:
        fig = go.Figure()
        fig.update_layout(title=config.title or '请配置图表字段')
        return fig

    y_col = config.y_axis[0]
    color_col = config.color if config.color and config.color in data.columns else None

    if color_col:
        fig = px.scatter(
            data,
            x=config.x_axis,
            y=y_col,
            color=color_col,
            title=config.title or f'{config.x_axis} vs {y_col}',
            color_discrete_sequence=COLOR_PALETTE,
            template='plotly_white',
            opacity=0.7
        )
    else:
        fig = go.Figure(go.Scatter(
            x=data[config.x_axis],
            y=data[y_col],
            mode='markers',
            marker=dict(color=PRIMARY_COLOR, size=10, opacity=0.7, line=dict(width=1, color='white')),
            hovertemplate=f'<b>{config.x_axis}</b>: %{{x:,.2f}}<br><b>{y_col}</b>: %{{y:,.2f}}<extra></extra>'
        ))

    fig.update_traces(marker=dict(size=12, line=dict(width=1, color='white')))
    fig.update_layout(
        title=config.title or f'{config.x_axis} vs {y_col}',
        xaxis_title=config.x_axis,
        yaxis_title=y_col,
        template='plotly_white',
        margin=dict(l=60, r=40, t=80, b=60)
    )

    return fig


def build_box_chart(
    df: pd.DataFrame,
    config: ChartConfig,
    filter_condition: Optional[FilterCondition] = None
) -> go.Figure:
    """
    构建箱线图
    """
    data = _apply_filter(df, filter_condition)

    if data.empty or not config.x_axis or not config.y_axis:
        fig = go.Figure()
        fig.update_layout(title=config.title or '请配置图表字段')
        return fig

    y_col = config.y_axis[0]
    color_col = config.color if config.color and config.color in data.columns else None

    if color_col:
        fig = px.box(
            data,
            x=config.x_axis,
            y=y_col,
            color=color_col,
            title=config.title or f'{y_col} by {config.x_axis}',
            color_discrete_sequence=COLOR_PALETTE,
            template='plotly_white'
        )
    else:
        fig = px.box(
            data,
            x=config.x_axis,
            y=y_col,
            title=config.title or f'{y_col} by {config.x_axis}',
            color_discrete_sequence=[PRIMARY_COLOR],
            template='plotly_white'
        )

    fig.update_layout(
        title=config.title or f'{y_col} by {config.x_axis}',
        xaxis_title=config.x_axis,
        yaxis_title=y_col,
        template='plotly_white',
        xaxis_tickangle=-45,
        margin=dict(l=60, r=40, t=80, b=100)
    )

    return fig


def build_heatmap(
    df: pd.DataFrame,
    config: ChartConfig,
    filter_condition: Optional[FilterCondition] = None
) -> go.Figure:
    """
    构建热力图
    """
    data = _apply_filter(df, filter_condition)
    if config.aggregation != 'none':
        data = _aggregate_data(data, config)

    if data.empty or not config.x_axis or not config.y_axis:
        fig = go.Figure()
        fig.update_layout(title=config.title or '请配置图表字段')
        return fig

    y_col = config.y_axis[0]
    value_col = config.color if config.color and config.color in data.columns else config.y_axis[0] if config.y_axis else None

    if value_col is None:
        fig = go.Figure()
        fig.update_layout(title=config.title or '请配置值字段')
        return fig

    pivot_data = data.pivot_table(
        index=y_col,
        columns=config.x_axis,
        values=value_col,
        aggfunc=config.aggregation if config.aggregation != 'none' else 'sum'
    )

    colorscale = [
        [0, '#e3f2fd'],
        [0.2, '#90caf9'],
        [0.4, '#42a5f5'],
        [0.6, '#1e88e5'],
        [0.8, '#1e3a5f'],
        [1, '#f97316']
    ]

    fig = go.Figure(go.Heatmap(
        z=pivot_data.values,
        x=pivot_data.columns,
        y=pivot_data.index,
        colorscale=colorscale,
        hovertemplate=f'<b>{config.x_axis}</b>: %{{x}}<br><b>{y_col}</b>: %{{y}}<br><b>{value_col}</b>: %{{z:,.2f}}<extra></extra>',
        showscale=True,
        xgap=1,
        ygap=1
    ))

    fig.update_layout(
        title=config.title or f'{config.x_axis} vs {y_col} Heatmap',
        xaxis_title=config.x_axis,
        yaxis_title=y_col,
        template='plotly_white',
        margin=dict(l=80, r=40, t=80, b=80)
    )

    return fig


def build_geo_map(
    df: pd.DataFrame,
    config: ChartConfig,
    filter_condition: Optional[FilterCondition] = None
) -> go.Figure:
    """
    构建地理地图
    """
    data = _apply_filter(df, filter_condition)
    if config.aggregation != 'none':
        data = _aggregate_data(data, config)

    if data.empty or not config.x_axis:
        fig = go.Figure()
        fig.update_layout(title=config.title or '请配置地理字段')
        return fig

    y_col = config.y_axis[0] if config.y_axis else None

    if y_col and y_col in data.columns:
        geo_data = data.groupby(config.x_axis)[y_col].sum().reset_index()
        value_col = y_col
    else:
        geo_data = data.groupby(config.x_axis).size().reset_index(name='count')
        value_col = 'count'

    province_mapping = {
        '北京': '北京市', '天津市': '天津市', '河北省': '河北省',
        '上海': '上海市', '江苏省': '江苏省', '浙江省': '浙江省',
        '广东': '广东省', '四川省': '四川省', '湖北省': '湖北省',
        '山东': '山东省', '河南省': '河南省', '福建省': '福建省',
        '湖南': '湖南省', '安徽省': '安徽省', '辽宁省': '辽宁省',
        '陕西': '陕西省', '重庆': '重庆市'
    }

    geo_data['region_standard'] = geo_data[config.x_axis].astype(str).map(province_mapping).fillna(geo_data[config.x_axis])

    colorscale = [
        [0, '#e3f2fd'],
        [0.2, '#90caf9'],
        [0.4, '#42a5f5'],
        [0.6, '#1e88e5'],
        [0.8, '#1e3a5f'],
        [1, '#f97316']
    ]

    fig = go.Figure(go.Choropleth(
        locations=geo_data['region_standard'],
        z=geo_data[value_col],
        locationmode='country names',
        colorscale=colorscale,
        reversescale=False,
        marker_line_color='white',
        marker_line_width=1,
        colorbar=dict(
            title=dict(text=value_col, font=dict(color=PRIMARY_COLOR)),
            tickprefix='',
            tickformat=',.0f'
        ),
        hovertemplate=f'<b>%{{location}}</b><br>{value_col}: %{{z:,.2f}}<extra></extra>',
        showscale=True
    ))

    fig.update_geos(
        scope='asia',
        center=dict(lat=35, lon=105),
        projection_scale=2.8,
        showcountries=False,
        countrycolor='white',
        showland=True,
        landcolor='#f0f0f0',
        showlakes=True,
        lakecolor='white',
        showcoastlines=True,
        coastlinecolor='#cccccc',
        showframe=False
    )

    fig.update_layout(
        title=config.title or f'地区分布图 - {value_col}',
        template='plotly_white',
        geo=dict(bgcolor='white'),
        margin=dict(l=20, r=120, t=80, b=20),
        height=600
    )

    return fig


def build_chart(
    df: pd.DataFrame,
    config: ChartConfig,
    filter_condition: Optional[FilterCondition] = None
) -> go.Figure:
    """
    根据配置构建Plotly图表

    Args:
        df: 数据源
        config: 图表配置
        filter_condition: 联动筛选条件

    Returns:
        Plotly Figure对象
    """
    builders = {
        'line': build_line_chart,
        'bar': build_bar_chart,
        'scatter': build_scatter_chart,
        'box': build_box_chart,
        'heatmap': build_heatmap,
        'geo': build_geo_map
    }

    builder = builders.get(config.chart_type, build_line_chart)
    fig = builder(df, config, filter_condition)

    fig.update_layout(
        clickmode='event+select',
        dragmode='select'
    )

    return fig
