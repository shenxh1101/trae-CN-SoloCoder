"""
电商数据分析平台 - 可视化模块
提供销售趋势、RFM分析、地理热力图、关联规则、预测分析等多种专业图表功能
"""

import warnings
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
from matplotlib import font_manager
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from scipy.signal import find_peaks

warnings.filterwarnings('ignore')

PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'
COLOR_PALETTE = [
    '#1e3a5f', '#f97316', '#3b82f6', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
]
GRADIENT_COLORS = [
    '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5',
    '#2196f3', '#1e88e5', '#1976d2', '#1565c0', '#0d47a1'
]


def set_plot_style() -> None:
    """
    设置Matplotlib全局样式配置，包括中文字体支持和专业配色方案。

    Notes
    -----
    - 自动检测并配置中文字体（支持宋体、黑体、微软雅黑、PingFang SC等）
    - 设置深蓝(#1e3a5f)为主色调，橙色(#f97316)为强调色
    - 配置坐标轴、网格、图例等元素的专业样式
    - 提高图表分辨率，设置合适的默认尺寸

    Examples
    --------
    >>> set_plot_style()
    >>> plt.plot([1, 2, 3], [4, 5, 6])
    >>> plt.show()
    """
    chinese_fonts = [
        'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
        'SimHei', 'SimSun', 'Arial Unicode MS', 'Noto Sans CJK SC'
    ]

    available_fonts = set(f.name for f in font_manager.fontManager.ttflist)
    selected_font = None
    for font in chinese_fonts:
        if font in available_fonts:
            selected_font = font
            break

    if selected_font is None:
        selected_font = 'DejaVu Sans'

    matplotlib.rcParams['font.sans-serif'] = [selected_font, 'DejaVu Sans']
    matplotlib.rcParams['axes.unicode_minus'] = False

    matplotlib.rcParams['figure.figsize'] = (12, 6)
    matplotlib.rcParams['figure.dpi'] = 120
    matplotlib.rcParams['savefig.dpi'] = 300
    matplotlib.rcParams['savefig.bbox'] = 'tight'

    matplotlib.rcParams['axes.facecolor'] = '#fafafa'
    matplotlib.rcParams['figure.facecolor'] = '#ffffff'
    matplotlib.rcParams['axes.edgecolor'] = '#e0e0e0'
    matplotlib.rcParams['axes.linewidth'] = 1

    matplotlib.rcParams['axes.titlecolor'] = PRIMARY_COLOR
    matplotlib.rcParams['axes.labelcolor'] = '#333333'
    matplotlib.rcParams['xtick.color'] = '#666666'
    matplotlib.rcParams['ytick.color'] = '#666666'

    matplotlib.rcParams['axes.grid'] = True
    matplotlib.rcParams['grid.alpha'] = 0.3
    matplotlib.rcParams['grid.color'] = '#cccccc'
    matplotlib.rcParams['grid.linestyle'] = '--'

    matplotlib.rcParams['legend.frameon'] = True
    matplotlib.rcParams['legend.framealpha'] = 0.9
    matplotlib.rcParams['legend.edgecolor'] = '#e0e0e0'

    matplotlib.rcParams['axes.prop_cycle'] = matplotlib.cycler(color=COLOR_PALETTE)

    matplotlib.rcParams['font.size'] = 10
    matplotlib.rcParams['axes.titlesize'] = 14
    matplotlib.rcParams['axes.labelsize'] = 11
    matplotlib.rcParams['legend.fontsize'] = 10


def plot_sales_trend(
    df: pd.DataFrame,
    granularity: str = 'day',
    show_peaks: bool = True
) -> go.Figure:
    """
    Plotly交互式时间序列销售趋势图，支持多粒度切换和高峰低谷自动标记。

    Parameters
    ----------
    df : pd.DataFrame
        销售数据DataFrame，需包含日期字段和金额字段。
    granularity : str, default 'day'
        时间聚合粒度，可选值：'day'（日）、'week'（周）、'month'（月）。
    show_peaks : bool, default True
        是否自动标记销售额的高峰和低谷点。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 支持通过日期字段名模式自动匹配（order_date、下单时间、日期等）
    - 支持通过金额字段名模式自动匹配（total_amount、订单金额、金额等）
    - 高峰低谷使用scipy.signal.find_peaks算法检测
    - 图表支持缩放、平移、数据点悬停详情等交互功能

    Examples
    --------
    >>> fig = plot_sales_trend(sales_df, granularity='week', show_peaks=True)
    >>> fig.show()
    """
    date_patterns = ['order_date', '下单时间', '订单日期', '交易时间', '购买日期', 'date', 'datetime', '时间', '日期']
    amount_patterns = ['total_amount', '订单金额', '金额', '消费金额', '支付金额', 'amount', 'price', '销售额']

    date_col = None
    amount_col = None
    for col in df.columns:
        col_lower = str(col).lower()
        if date_col is None:
            for pattern in date_patterns:
                if pattern.lower() in col_lower:
                    date_col = col
                    break
        if amount_col is None:
            for pattern in amount_patterns:
                if pattern.lower() in col_lower:
                    amount_col = col
                    break

    if date_col is None or amount_col is None:
        raise ValueError("数据中未找到日期字段或金额字段")

    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df = df.dropna(subset=[date_col, amount_col])

    if granularity == 'day':
        freq = 'D'
        title_suffix = '日'
    elif granularity == 'week':
        freq = 'W-MON'
        title_suffix = '周'
    elif granularity == 'month':
        freq = 'ME'
        title_suffix = '月'
    else:
        raise ValueError("granularity参数必须为 'day', 'week' 或 'month'")

    df_agg = df.resample(freq, on=date_col)[amount_col].sum().reset_index()
    df_agg.columns = ['date', 'sales']

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=df_agg['date'],
        y=df_agg['sales'],
        mode='lines+markers',
        name='销售额',
        line=dict(color=PRIMARY_COLOR, width=2.5),
        marker=dict(size=6, color=PRIMARY_COLOR),
        hovertemplate='<b>日期</b>: %{x|%Y-%m-%d}<br><b>销售额</b>: ¥%{y:,.2f}<extra></extra>',
        fill='tozeroy',
        fillcolor='rgba(30, 58, 95, 0.1)'
    ))

    if show_peaks and len(df_agg) > 5:
        sales_values = df_agg['sales'].values
        distance = max(1, len(sales_values) // 10)

        peaks, _ = find_peaks(sales_values, distance=distance, prominence=np.std(sales_values) * 0.5)
        valleys, _ = find_peaks(-sales_values, distance=distance, prominence=np.std(sales_values) * 0.5)

        if len(peaks) > 0:
            fig.add_trace(go.Scatter(
                x=df_agg.loc[peaks, 'date'],
                y=df_agg.loc[peaks, 'sales'],
                mode='markers+text',
                name='高峰',
                marker=dict(size=12, color=ACCENT_COLOR, symbol='circle'),
                text=[f'¥{v:,.0f}' for v in df_agg.loc[peaks, 'sales']],
                textposition='top center',
                textfont=dict(color=ACCENT_COLOR, size=10),
                hovertemplate='<b>高峰</b><br>日期: %{x|%Y-%m-%d}<br>销售额: ¥%{y:,.2f}<extra></extra>'
            ))

        if len(valleys) > 0:
            fig.add_trace(go.Scatter(
                x=df_agg.loc[valleys, 'date'],
                y=df_agg.loc[valleys, 'sales'],
                mode='markers+text',
                name='低谷',
                marker=dict(size=12, color='#10b981', symbol='circle'),
                text=[f'¥{v:,.0f}' for v in df_agg.loc[valleys, 'sales']],
                textposition='bottom center',
                textfont=dict(color='#10b981', size=10),
                hovertemplate='<b>低谷</b><br>日期: %{x|%Y-%m-%d}<br>销售额: ¥%{y:,.2f}<extra></extra>'
            ))

    fig.update_layout(
        title={
            'text': f'<b>销售趋势分析（{title_suffix}度）</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        xaxis_title='日期',
        yaxis_title='销售额 (元)',
        hovermode='x unified',
        template='plotly_white',
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        xaxis=dict(
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)',
            rangeselector=dict(
                buttons=list([
                    dict(count=1, label='1月', step='month', stepmode='backward'),
                    dict(count=3, label='3月', step='month', stepmode='backward'),
                    dict(count=6, label='6月', step='month', stepmode='backward'),
                    dict(count=1, label='1年', step='year', stepmode='backward'),
                    dict(step='all', label='全部')
                ]),
                bgcolor='white',
                bordercolor=PRIMARY_COLOR,
                activecolor=ACCENT_COLOR
            ),
            rangeslider=dict(visible=True, bgcolor='rgba(30, 58, 95, 0.05)')
        ),
        yaxis=dict(
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)',
            tickprefix='¥',
            tickformat=',.0f'
        ),
        margin=dict(l=60, r=40, t=80, b=60)
    )

    return fig


def plot_category_pie(df: pd.DataFrame) -> go.Figure:
    """
    Plotly环形图展示各品类销售占比，支持点击筛选交互。

    Parameters
    ----------
    df : pd.DataFrame
        销售数据DataFrame，需包含品类字段和金额字段。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 自动识别品类字段（category、品类、商品品类等）和金额字段
    - 支持点击图例筛选对应品类
    - 中心显示总销售额，悬停显示详细占比信息
    - 使用专业配色方案，突出显示TOP品类

    Examples
    --------
    >>> fig = plot_category_pie(sales_df)
    >>> fig.show()
    """
    category_patterns = ['category', '品类', '商品品类', '类别', '分类', '商品分类']
    amount_patterns = ['total_amount', '订单金额', '金额', '消费金额', '支付金额', 'amount', 'price', '销售额']

    category_col = None
    amount_col = None
    for col in df.columns:
        col_lower = str(col).lower()
        if category_col is None:
            for pattern in category_patterns:
                if pattern.lower() in col_lower:
                    category_col = col
                    break
        if amount_col is None:
            for pattern in amount_patterns:
                if pattern.lower() in col_lower:
                    amount_col = col
                    break

    if category_col is None or amount_col is None:
        raise ValueError("数据中未找到品类字段或金额字段")

    df = df.copy()
    category_sales = df.groupby(category_col)[amount_col].sum().reset_index()
    category_sales.columns = ['category', 'sales']
    category_sales = category_sales.sort_values('sales', ascending=False)
    total_sales = category_sales['sales'].sum()

    colors = []
    for i in range(len(category_sales)):
        if i == 0:
            colors.append(ACCENT_COLOR)
        elif i < len(COLOR_PALETTE):
            colors.append(COLOR_PALETTE[i])
        else:
            colors.append(px.colors.qualitative.Set3[i % len(px.colors.qualitative.Set3)])

    fig = go.Figure(go.Pie(
        labels=category_sales['category'],
        values=category_sales['sales'],
        hole=0.5,
        marker=dict(colors=colors, line=dict(color='#ffffff', width=2)),
        textinfo='label+percent',
        textposition='outside',
        texttemplate='<b>%{label}</b><br>%{percent:.1%}',
        hovertemplate='<b>%{label}</b><br>销售额: ¥%{value:,.2f}<br>占比: %{percent:.1%}<extra></extra>',
        sort=False,
        direction='clockwise'
    ))

    fig.add_annotation(
        text=f'<b>总销售额</b><br>¥{total_sales:,.0f}',
        x=0.5,
        y=0.5,
        showarrow=False,
        font=dict(size=14, color=PRIMARY_COLOR),
        xanchor='center',
        yanchor='middle'
    )

    fig.update_layout(
        title={
            'text': '<b>品类销售占比分布</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        template='plotly_white',
        showlegend=True,
        legend=dict(
            orientation='v',
            yanchor='middle',
            y=0.5,
            xanchor='left',
            x=1.1,
            title=dict(text='品类', font=dict(color=PRIMARY_COLOR))
        ),
        margin=dict(l=40, r=150, t=80, b=40),
        clickmode='event+select'
    )

    return fig


def plot_rfm_pyramid(rfm_df: pd.DataFrame) -> plt.Figure:
    """
    Matplotlib绘制RFM用户分层金字塔图，展示各层级用户数量和价值分布。

    Parameters
    ----------
    rfm_df : pd.DataFrame
        RFM分析结果DataFrame，需包含'segment'（用户分层）字段，
        以及'user_id'（或类似用户标识）字段和'monetary'（或类似金额）字段。

    Returns
    -------
    plt.Figure
        Matplotlib Figure对象，可直接展示或保存。

    Notes
    -----
    - 金字塔从上到下按用户价值从高到低排列
    - 左侧显示用户数量占比，右侧显示消费金额占比
    - 支持标准RFM分层：重要价值用户、重要发展用户、重要保持用户、
      重要挽留用户、一般价值用户、一般发展用户、一般保持用户、流失用户
    - 自动计算各层级的用户数和总消费金额

    Examples
    --------
    >>> rfm_df = calculate_rfm(sales_df)
    >>> fig = plot_rfm_pyramid(rfm_df)
    >>> fig.show()
    """
    segment_patterns = ['segment', '层级', '分层', '用户分层', 'rfm_segment']
    user_patterns = ['user_id', '用户ID', '用户id', '会员ID', 'customer_id']
    monetary_patterns = ['monetary', '消费金额', '金额', '总消费', 'total_spent', 'total_amount']

    segment_col = None
    user_col = None
    monetary_col = None
    for col in rfm_df.columns:
        col_lower = str(col).lower()
        if segment_col is None:
            for pattern in segment_patterns:
                if pattern.lower() in col_lower:
                    segment_col = col
                    break
        if user_col is None:
            for pattern in user_patterns:
                if pattern.lower() in col_lower:
                    user_col = col
                    break
        if monetary_col is None:
            for pattern in monetary_patterns:
                if pattern.lower() in col_lower:
                    monetary_col = col
                    break

    if segment_col is None:
        raise ValueError("数据中未找到用户分层字段")
    if user_col is None:
        user_col = rfm_df.columns[0]
    if monetary_col is None:
        monetary_col = [c for c in rfm_df.columns if c not in [segment_col, user_col]][0]

    segment_order = [
        '重要价值用户', '重要发展用户', '重要保持用户', '重要挽留用户',
        '一般价值用户', '一般发展用户', '一般保持用户', '流失用户'
    ]

    segment_counts = rfm_df.groupby(segment_col)[user_col].nunique().reset_index()
    segment_monetary = rfm_df.groupby(segment_col)[monetary_col].sum().reset_index()

    segment_stats = segment_counts.merge(segment_monetary, on=segment_col)
    segment_stats.columns = ['segment', 'user_count', 'total_monetary']

    existing_segments = [s for s in segment_order if s in segment_stats['segment'].values]
    other_segments = [s for s in segment_stats['segment'].unique() if s not in segment_order]
    all_segments = existing_segments + other_segments

    if len(all_segments) == 0:
        raise ValueError("未找到有效的用户分层数据")

    segment_stats = segment_stats.set_index('segment').loc[all_segments].reset_index()

    total_users = segment_stats['user_count'].sum()
    total_monetary = segment_stats['total_monetary'].sum()

    segment_stats['user_pct'] = segment_stats['user_count'] / total_users * 100
    segment_stats['monetary_pct'] = segment_stats['total_monetary'] / total_monetary * 100

    set_plot_style()

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 8))
    fig.patch.set_facecolor('#ffffff')

    n_segments = len(segment_stats)
    y_pos = np.arange(n_segments)

    left_colors = plt.cm.Blues(np.linspace(0.9, 0.3, n_segments))
    right_colors = []
    for i in range(n_segments):
        if i == 0:
            right_colors.append(ACCENT_COLOR)
        else:
            right_colors.append(plt.cm.Oranges(np.linspace(0.8, 0.3, n_segments))[i])

    ax1.barh(y_pos, -segment_stats['user_pct'], color=left_colors, edgecolor='white', linewidth=1.5, height=0.8)
    ax2.barh(y_pos, segment_stats['monetary_pct'], color=right_colors, edgecolor='white', linewidth=1.5, height=0.8)

    for i, (count, pct) in enumerate(zip(segment_stats['user_count'], segment_stats['user_pct'])):
        ax1.text(-pct - 0.5, i, f'{count:,}人\n({pct:.1f}%)',
                 va='center', ha='right', fontsize=9, color=PRIMARY_COLOR, fontweight='medium')

    for i, (amount, pct) in enumerate(zip(segment_stats['total_monetary'], segment_stats['monetary_pct'])):
        ax2.text(pct + 0.5, i, f'¥{amount:,.0f}\n({pct:.1f}%)',
                 va='center', ha='left', fontsize=9, color=ACCENT_COLOR, fontweight='medium')

    for ax in [ax1, ax2]:
        ax.set_yticks(y_pos)
        ax.set_yticklabels(segment_stats['segment'], fontsize=10, fontweight='medium')
        ax.set_xlim([-max(segment_stats['user_pct'].max(), segment_stats['monetary_pct'].max()) * 1.4,
                     max(segment_stats['user_pct'].max(), segment_stats['monetary_pct'].max()) * 1.4])
        ax.invert_yaxis()
        ax.grid(False)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_visible(False)
        ax.tick_params(axis='x', colors='white', labelsize=0)
        ax.tick_params(axis='y', length=0)

    for spine in ['left', 'right', 'top', 'bottom']:
        ax1.spines[spine].set_visible(False)
        ax2.spines[spine].set_visible(False)

    ax1.set_xlabel('用户数量分布', fontsize=12, color=PRIMARY_COLOR, fontweight='bold')
    ax2.set_xlabel('消费金额分布', fontsize=12, color=ACCENT_COLOR, fontweight='bold')

    fig.suptitle('RFM用户分层金字塔', fontsize=18, color=PRIMARY_COLOR, fontweight='bold', y=0.98)

    plt.subplots_adjust(wspace=0, left=0.25, right=0.75)

    fig.text(0.5, 0.02, f'总用户数: {total_users:,}人 | 总消费金额: ¥{total_monetary:,.0f}',
             ha='center', fontsize=11, color='#666666')

    return fig


def plot_rfm_bar(rfm_df: pd.DataFrame) -> go.Figure:
    """
    Plotly柱状图对比各RFM层级的用户数和平均消费金额，采用双Y轴设计。

    Parameters
    ----------
    rfm_df : pd.DataFrame
        RFM分析结果DataFrame，需包含'segment'（用户分层）字段，
        以及'user_id'（或类似用户标识）字段和'monetary'（或类似金额）字段。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 左侧Y轴显示用户数量（柱状图）
    - 右侧Y轴显示平均消费金额（折线图）
    - 各层级按用户价值从高到低排序
    - 支持悬停查看详细数据，点击图例切换显示

    Examples
    --------
    >>> rfm_df = calculate_rfm(sales_df)
    >>> fig = plot_rfm_bar(rfm_df)
    >>> fig.show()
    """
    segment_patterns = ['segment', '层级', '分层', '用户分层', 'rfm_segment']
    user_patterns = ['user_id', '用户ID', '用户id', '会员ID', 'customer_id']
    monetary_patterns = ['monetary', '消费金额', '金额', '总消费', 'total_spent', 'total_amount']

    segment_col = None
    user_col = None
    monetary_col = None
    for col in rfm_df.columns:
        col_lower = str(col).lower()
        if segment_col is None:
            for pattern in segment_patterns:
                if pattern.lower() in col_lower:
                    segment_col = col
                    break
        if user_col is None:
            for pattern in user_patterns:
                if pattern.lower() in col_lower:
                    user_col = col
                    break
        if monetary_col is None:
            for pattern in monetary_patterns:
                if pattern.lower() in col_lower:
                    monetary_col = col
                    break

    if segment_col is None:
        raise ValueError("数据中未找到用户分层字段")
    if user_col is None:
        user_col = rfm_df.columns[0]
    if monetary_col is None:
        monetary_col = [c for c in rfm_df.columns if c not in [segment_col, user_col]][0]

    segment_order = [
        '重要价值用户', '重要发展用户', '重要保持用户', '重要挽留用户',
        '一般价值用户', '一般发展用户', '一般保持用户', '流失用户'
    ]

    user_counts = rfm_df.groupby(segment_col)[user_col].nunique()
    avg_monetary = rfm_df.groupby(segment_col)[monetary_col].mean()

    existing_segments = [s for s in segment_order if s in user_counts.index]
    other_segments = [s for s in user_counts.index if s not in segment_order]
    all_segments = existing_segments + other_segments

    if len(all_segments) == 0:
        raise ValueError("未找到有效的用户分层数据")

    user_counts = user_counts.reindex(all_segments)
    avg_monetary = avg_monetary.reindex(all_segments)

    bar_colors = []
    for i in range(len(all_segments)):
        if i == 0:
            bar_colors.append(ACCENT_COLOR)
        else:
            bar_colors.append(PRIMARY_COLOR)

    fig = make_subplots(specs=[[{"secondary_y": True}]])

    fig.add_trace(
        go.Bar(
            x=all_segments,
            y=user_counts.values,
            name='用户数量',
            marker=dict(color=bar_colors, line=dict(color='white', width=1)),
            hovertemplate='<b>%{x}</b><br>用户数: %{y:,}人<extra></extra>',
            text=user_counts.values,
            texttemplate='%{text:,}',
            textposition='outside',
            textfont=dict(color=PRIMARY_COLOR, size=10)
        ),
        secondary_y=False,
    )

    fig.add_trace(
        go.Scatter(
            x=all_segments,
            y=avg_monetary.values,
            name='平均消费金额',
            mode='lines+markers',
            line=dict(color=ACCENT_COLOR, width=3),
            marker=dict(size=10, color=ACCENT_COLOR, symbol='circle'),
            hovertemplate='<b>%{x}</b><br>平均消费: ¥%{y:,.2f}<extra></extra>',
            text=[f'¥{v:,.0f}' for v in avg_monetary.values],
            textposition='top center',
            textfont=dict(color=ACCENT_COLOR, size=10)
        ),
        secondary_y=True,
    )

    fig.update_layout(
        title={
            'text': '<b>RFM各层级用户数量与平均消费对比</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        template='plotly_white',
        barmode='group',
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        xaxis=dict(
            title='用户分层',
            tickangle=-30,
            tickfont=dict(size=10)
        ),
        yaxis=dict(
            title='用户数量 (人)',
            titlefont=dict(color=PRIMARY_COLOR),
            tickfont=dict(color=PRIMARY_COLOR),
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)'
        ),
        yaxis2=dict(
            title='平均消费金额 (元)',
            titlefont=dict(color=ACCENT_COLOR),
            tickfont=dict(color=ACCENT_COLOR),
            tickprefix='¥',
            showgrid=False
        ),
        margin=dict(l=60, r=60, t=80, b=80)
    )

    return fig


def plot_geo_heatmap(
    df: pd.DataFrame,
    region_col: str = 'region',
    value_col: str = 'total_amount'
) -> go.Figure:
    """
    Plotly中国地图热力图展示各地区销售分布。

    Parameters
    ----------
    df : pd.DataFrame
        包含地区和销售数据的DataFrame。
    region_col : str, default 'region'
        地区字段名，需包含中国省份名称（如'广东省'、'北京'等）。
    value_col : str, default 'total_amount'
        数值字段名，用于热力图颜色深浅表示。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 支持中国省级行政区划地图
    - 使用choropleth实现交互式热力图
    - 自动处理省份名称格式（支持带/不带'省'、'市'后缀）
    - 悬停显示地区名称和具体数值
    - 颜色渐变从浅蓝到深蓝，突出高价值地区

    Examples
    --------
    >>> fig = plot_geo_heatmap(geo_df, region_col='省份', value_col='销售额')
    >>> fig.show()
    """
    if region_col not in df.columns or value_col not in df.columns:
        raise ValueError(f"数据中缺少字段: {region_col} 或 {value_col}")

    province_mapping = {
        '北京': '北京市', '北京市': '北京市',
        '天津': '天津市', '天津市': '天津市',
        '河北': '河北省', '河北省': '河北省',
        '山西': '山西省', '山西省': '山西省',
        '内蒙古': '内蒙古自治区', '内蒙古自治区': '内蒙古自治区', '内蒙': '内蒙古自治区',
        '辽宁': '辽宁省', '辽宁省': '辽宁省',
        '吉林': '吉林省', '吉林省': '吉林省',
        '黑龙江': '黑龙江省', '黑龙江省': '黑龙江省',
        '上海': '上海市', '上海市': '上海市',
        '江苏': '江苏省', '江苏省': '江苏省',
        '浙江': '浙江省', '浙江省': '浙江省',
        '安徽': '安徽省', '安徽省': '安徽省',
        '福建': '福建省', '福建省': '福建省',
        '江西': '江西省', '江西省': '江西省',
        '山东': '山东省', '山东省': '山东省',
        '河南': '河南省', '河南省': '河南省',
        '湖北': '湖北省', '湖北省': '湖北省',
        '湖南': '湖南省', '湖南省': '湖南省',
        '广东': '广东省', '广东省': '广东省',
        '广西': '广西壮族自治区', '广西壮族自治区': '广西壮族自治区', '广西省': '广西壮族自治区',
        '海南': '海南省', '海南省': '海南省',
        '重庆': '重庆市', '重庆市': '重庆市',
        '四川': '四川省', '四川省': '四川省',
        '贵州': '贵州省', '贵州省': '贵州省',
        '云南': '云南省', '云南省': '云南省',
        '西藏': '西藏自治区', '西藏自治区': '西藏自治区', '西藏省': '西藏自治区',
        '陕西': '陕西省', '陕西省': '陕西省',
        '甘肃': '甘肃省', '甘肃省': '甘肃省',
        '青海': '青海省', '青海省': '青海省',
        '宁夏': '宁夏回族自治区', '宁夏回族自治区': '宁夏回族自治区', '宁夏省': '宁夏回族自治区',
        '新疆': '新疆维吾尔自治区', '新疆维吾尔自治区': '新疆维吾尔自治区', '新疆省': '新疆维吾尔自治区',
        '香港': '香港特别行政区', '香港特别行政区': '香港特别行政区',
        '澳门': '澳门特别行政区', '澳门特别行政区': '澳门特别行政区',
        '台湾': '台湾省', '台湾省': '台湾省'
    }

    df = df.copy()
    df['region_standard'] = df[region_col].astype(str).map(province_mapping).fillna(df[region_col])

    geo_data = df.groupby('region_standard')[value_col].sum().reset_index()
    geo_data.columns = ['region', 'value']

    fig = go.Figure(go.Choropleth(
        locations=geo_data['region'],
        z=geo_data['value'],
        locationmode='country names',
        colorscale=[
            [0, '#e3f2fd'],
            [0.2, '#90caf9'],
            [0.4, '#42a5f5'],
            [0.6, '#1e88e5'],
            [0.8, '#1e3a5f'],
            [1, '#f97316']
        ],
        reversescale=False,
        marker_line_color='white',
        marker_line_width=1,
        colorbar=dict(
            title=dict(
                text='销售额',
                font=dict(color=PRIMARY_COLOR)
            ),
            tickprefix='¥',
            tickformat=',.0f',
            x=1.02
        ),
        hovertemplate='<b>%{location}</b><br>销售额: ¥%{z:,.2f}<extra></extra>',
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
        showrivers=False,
        showcoastlines=True,
        coastlinecolor='#cccccc',
        showframe=False
    )

    fig.update_layout(
        title={
            'text': '<b>全国各地区销售分布热力图</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        template='plotly_white',
        geo=dict(bgcolor='white'),
        margin=dict(l=20, r=120, t=80, b=20),
        height=600
    )

    top_regions = geo_data.nlargest(5, 'value')
    annotations = []
    for i, (_, row) in enumerate(top_regions.iterrows()):
        annotations.append(dict(
            x=0.92,
            y=0.95 - i * 0.08,
            xref='paper',
            yref='paper',
            text=f'<b>TOP{i+1}</b> {row["region"]}: ¥{row["value"]:,.0f}',
            showarrow=False,
            font=dict(color=PRIMARY_COLOR if i > 0 else ACCENT_COLOR, size=10),
            align='left'
        ))
    fig.update_layout(annotations=annotations)

    return fig


def plot_association_network(rules_df: pd.DataFrame, top_n: int = 20) -> go.Figure:
    """
    Plotly网络图可视化商品关联规则，节点大小代表支持度，边粗细代表置信度。

    Parameters
    ----------
    rules_df : pd.DataFrame
        关联规则结果DataFrame，需包含'antecedents'（前件）、'consequents'（后件）、
        'support'（支持度）、'confidence'（置信度）、'lift'（提升度）字段。
    top_n : int, default 20
        显示的关联规则数量，按提升度降序排列取前N条。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 节点大小与支持度成正比，突出显示频繁商品
    - 边的粗细与置信度成正比，颜色深浅与提升度成正比
    - 支持悬停查看规则详情（支持度、置信度、提升度）
    - 使用力导向布局，节点自动分布优化可读性
    - 橙色节点突出显示高价值商品

    Examples
    --------
    >>> rules_df = apriori_analysis(transactions, min_support=0.01)
    >>> fig = plot_association_network(rules_df, top_n=20)
    >>> fig.show()
    """
    required_cols = ['antecedents', 'consequents', 'support', 'confidence', 'lift']
    for col in required_cols:
        if col not in rules_df.columns:
            raise ValueError(f"关联规则数据缺少必要字段: {col}")

    rules_df = rules_df.copy()
    rules_df = rules_df.sort_values('lift', ascending=False).head(top_n).reset_index(drop=True)

    def parse_itemset(x):
        if isinstance(x, frozenset):
            return ', '.join(x)
        elif isinstance(x, (list, set)):
            return ', '.join([str(i) for i in x])
        else:
            return str(x)

    rules_df['antecedents_str'] = rules_df['antecedents'].apply(parse_itemset)
    rules_df['consequents_str'] = rules_df['consequents'].apply(parse_itemset)

    all_items = set()
    for _, row in rules_df.iterrows():
        all_items.add(row['antecedents_str'])
        all_items.add(row['consequents_str'])
    all_items = list(all_items)
    n_items = len(all_items)

    item_support = {}
    for item in all_items:
        support = 0
        for _, row in rules_df.iterrows():
            if row['antecedents_str'] == item or row['consequents_str'] == item:
                support = max(support, row['support'])
        item_support[item] = support

    angle_step = 2 * np.pi / n_items
    positions = {}
    for i, item in enumerate(all_items):
        angle = i * angle_step
        positions[item] = (np.cos(angle), np.sin(angle))

    fig = go.Figure()

    max_confidence = rules_df['confidence'].max() if len(rules_df) > 0 else 1
    max_lift = rules_df['lift'].max() if len(rules_df) > 0 else 1

    for _, row in rules_df.iterrows():
        x0, y0 = positions[row['antecedents_str']]
        x1, y1 = positions[row['consequents_str']]

        width = 1 + (row['confidence'] / max_confidence) * 8
        lift_ratio = row['lift'] / max_lift if max_lift > 0 else 0

        color = f'rgba(249, 115, 22, {0.3 + lift_ratio * 0.7})'

        fig.add_trace(go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(width=width, color=color),
            hoverinfo='text',
            text=f'<b>关联规则</b><br>'
                 f'{row["antecedents_str"]} → {row["consequents_str"]}<br>'
                 f'支持度: {row["support"]:.2%}<br>'
                 f'置信度: {row["confidence"]:.2%}<br>'
                 f'提升度: {row["lift"]:.2f}',
            showlegend=False
        ))

    node_x = []
    node_y = []
    node_sizes = []
    node_colors = []
    node_texts = []

    for item in all_items:
        x, y = positions[item]
        support = item_support[item]

        node_x.append(x)
        node_y.append(y)
        node_sizes.append(20 + support * 800)

        avg_lift = rules_df[
            (rules_df['antecedents_str'] == item) | (rules_df['consequents_str'] == item)
        ]['lift'].mean()
        if avg_lift > 2:
            node_colors.append(ACCENT_COLOR)
        else:
            node_colors.append(PRIMARY_COLOR)

        node_texts.append(f'<b>{item}</b><br>支持度: {support:.2%}<br>平均提升度: {avg_lift:.2f}')

    fig.add_trace(go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(color='white', width=2),
            opacity=0.9
        ),
        text=[item.replace(', ', '<br>') for item in all_items],
        textposition='middle center',
        textfont=dict(color='white', size=9, weight='bold'),
        hoverinfo='text',
        hovertext=node_texts,
        showlegend=False
    ))

    fig.update_layout(
        title={
            'text': f'<b>商品关联规则网络图 (TOP {top_n})</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        template='plotly_white',
        showlegend=True,
        xaxis=dict(
            showgrid=False,
            zeroline=False,
            showticklabels=False,
            scaleanchor='y',
            scaleratio=1
        ),
        yaxis=dict(
            showgrid=False,
            zeroline=False,
            showticklabels=False
        ),
        hovermode='closest',
        margin=dict(l=40, r=40, t=80, b=40),
        height=600
    )

    fig.add_trace(go.Scatter(
        x=[None], y=[None], mode='markers',
        marker=dict(size=10, color=ACCENT_COLOR),
        name='高提升度商品'
    ))
    fig.add_trace(go.Scatter(
        x=[None], y=[None], mode='markers',
        marker=dict(size=10, color=PRIMARY_COLOR),
        name='普通商品'
    ))
    fig.add_trace(go.Scatter(
        x=[None], y=[None], mode='lines',
        line=dict(width=5, color='rgba(249, 115, 22, 0.8)'),
        name='高置信度关联'
    ))
    fig.add_trace(go.Scatter(
        x=[None], y=[None], mode='lines',
        line=dict(width=2, color='rgba(249, 115, 22, 0.4)'),
        name='低置信度关联'
    ))

    fig.update_layout(
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=-0.1,
            xanchor='center',
            x=0.5
        )
    )

    return fig


def plot_forecast(
    history_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    title: str = '销售预测'
) -> go.Figure:
    """
    Plotly双轴图展示历史销售数据和预测值，填充置信区间。

    Parameters
    ----------
    history_df : pd.DataFrame
        历史销售数据，需包含日期字段和金额字段。
    forecast_df : pd.DataFrame
        预测结果数据，需包含日期字段、'yhat'（预测值）、
        'yhat_lower'（置信区间下限）、'yhat_upper'（置信区间上限）字段。
    title : str, default '销售预测'
        图表标题。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 历史数据使用深蓝色实线显示
    - 预测数据使用橙色虚线显示
    - 置信区间使用半透明橙色填充
    - 支持双轴显示（可选），或同一轴对比
    - 自动计算预测期内的总预测值和平均预测值

    Examples
    --------
    >>> forecast_df = prophet_model.predict(future)
    >>> fig = plot_forecast(history_df, forecast_df, title='未来30天销售预测')
    >>> fig.show()
    """
    date_patterns = ['order_date', '下单时间', '订单日期', '交易时间', '购买日期', 'date', 'datetime', '时间', '日期', 'ds']
    amount_patterns = ['total_amount', '订单金额', '金额', '消费金额', '支付金额', 'amount', 'price', '销售额', 'y', 'yhat']

    history_date_col = None
    history_amount_col = None
    for col in history_df.columns:
        col_lower = str(col).lower()
        if history_date_col is None:
            for pattern in date_patterns:
                if pattern.lower() in col_lower:
                    history_date_col = col
                    break
        if history_amount_col is None:
            for pattern in amount_patterns:
                if pattern.lower() in col_lower and col_lower != 'yhat':
                    history_amount_col = col
                    break

    if history_date_col is None or history_amount_col is None:
        raise ValueError("历史数据中未找到日期字段或金额字段")

    forecast_date_col = None
    for col in forecast_df.columns:
        col_lower = str(col).lower()
        for pattern in date_patterns:
            if pattern.lower() in col_lower:
                forecast_date_col = col
                break
        if forecast_date_col:
            break

    if forecast_date_col is None:
        forecast_date_col = forecast_df.columns[0]

    required_forecast_cols = ['yhat', 'yhat_lower', 'yhat_upper']
    for col in required_forecast_cols:
        if col not in forecast_df.columns:
            raise ValueError(f"预测数据缺少必要字段: {col}")

    history = history_df.copy()
    history[history_date_col] = pd.to_datetime(history[history_date_col], errors='coerce')
    history = history.dropna(subset=[history_date_col, history_amount_col])

    forecast = forecast_df.copy()
    forecast[forecast_date_col] = pd.to_datetime(forecast[forecast_date_col], errors='coerce')

    history_agg = history.groupby(history_date_col)[history_amount_col].sum().reset_index()
    history_agg.columns = ['date', 'actual']

    forecast_agg = forecast[[forecast_date_col, 'yhat', 'yhat_lower', 'yhat_upper']].copy()
    forecast_agg.columns = ['date', 'yhat', 'yhat_lower', 'yhat_upper']

    mask = forecast_agg['date'] > history_agg['date'].max()
    forecast_only = forecast_agg[mask].copy()

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=history_agg['date'],
        y=history_agg['actual'],
        mode='lines',
        name='历史销售额',
        line=dict(color=PRIMARY_COLOR, width=2.5),
        hovertemplate='<b>历史</b><br>日期: %{x|%Y-%m-%d}<br>销售额: ¥%{y:,.2f}<extra></extra>'
    ))

    fig.add_trace(go.Scatter(
        x=forecast_only['date'],
        y=forecast_only['yhat'],
        mode='lines',
        name='预测销售额',
        line=dict(color=ACCENT_COLOR, width=2.5, dash='dash'),
        hovertemplate='<b>预测</b><br>日期: %{x|%Y-%m-%d}<br>预测值: ¥%{y:,.2f}<extra></extra>'
    ))

    fig.add_trace(go.Scatter(
        x=forecast_only['date'],
        y=forecast_only['yhat_upper'],
        mode='lines',
        line=dict(color='rgba(249, 115, 22, 0)'),
        showlegend=False,
        hoverinfo='skip'
    ))

    fig.add_trace(go.Scatter(
        x=forecast_only['date'],
        y=forecast_only['yhat_lower'],
        mode='lines',
        line=dict(color='rgba(249, 115, 22, 0)'),
        fill='tonexty',
        fillcolor='rgba(249, 115, 22, 0.2)',
        name='95%置信区间',
        hovertemplate='<b>置信区间</b><br>日期: %{x|%Y-%m-%d}<br>下限: ¥%{y:,.2f}<extra></extra>'
    ))

    total_forecast = forecast_only['yhat'].sum()
    avg_forecast = forecast_only['yhat'].mean()
    forecast_days = len(forecast_only)

    fig.update_layout(
        title={
            'text': f'<b>{title}</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        xaxis_title='日期',
        yaxis_title='销售额 (元)',
        template='plotly_white',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        xaxis=dict(
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)',
            rangeselector=dict(
                buttons=list([
                    dict(count=1, label='1月', step='month', stepmode='backward'),
                    dict(count=3, label='3月', step='month', stepmode='backward'),
                    dict(count=1, label='全部', step='all')
                ]),
                bgcolor='white',
                bordercolor=PRIMARY_COLOR
            )
        ),
        yaxis=dict(
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)',
            tickprefix='¥',
            tickformat=',.0f'
        ),
        margin=dict(l=60, r=40, t=100, b=60),
        annotations=[
            dict(
                x=0.02,
                y=0.98,
                xref='paper',
                yref='paper',
                text=f'<b>预测期: {forecast_days}天</b><br>'
                     f'总预测额: ¥{total_forecast:,.0f}<br>'
                     f'日均预测: ¥{avg_forecast:,.0f}',
                showarrow=False,
                align='left',
                bgcolor='rgba(249, 115, 22, 0.1)',
                bordercolor=ACCENT_COLOR,
                borderwidth=1,
                font=dict(color=PRIMARY_COLOR, size=10),
                xanchor='left',
                yanchor='top'
            )
        ]
    )

    return fig


def plot_price_sensitivity(price_df: pd.DataFrame) -> go.Figure:
    """
    Plotly双轴图展示折扣区间销量和销售额，以及价格弹性曲线。

    Parameters
    ----------
    price_df : pd.DataFrame
        价格敏感度分析数据，需包含'discount'（折扣区间）、
        'quantity'（销量）、'revenue'（销售额）、'elasticity'（价格弹性）字段。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 左侧Y轴显示销量（柱状图）和销售额（折线图）
    - 右侧Y轴显示价格弹性系数（折线图）
    - 价格弹性小于-1表示富有弹性，大于-1表示缺乏弹性
    - 自动标注最优折扣区间（销售额最高的区间）
    - 橙色虚线标注弹性=-1的临界点

    Examples
    --------
    >>> price_df = analyze_price_sensitivity(sales_df)
    >>> fig = plot_price_sensitivity(price_df)
    >>> fig.show()
    """
    required_cols = ['discount', 'quantity', 'revenue', 'elasticity']
    for col in required_cols:
        if col not in price_df.columns:
            raise ValueError(f"数据缺少必要字段: {col}")

    df = price_df.copy()
    df = df.sort_values('discount').reset_index(drop=True)

    bar_colors = []
    max_revenue_idx = df['revenue'].idxmax()
    for i in range(len(df)):
        if i == max_revenue_idx:
            bar_colors.append(ACCENT_COLOR)
        else:
            bar_colors.append(PRIMARY_COLOR)

    fig = make_subplots(specs=[[{"secondary_y": True}]])

    fig.add_trace(
        go.Bar(
            x=df['discount'],
            y=df['quantity'],
            name='销量',
            marker=dict(color=bar_colors, line=dict(color='white', width=1)),
            hovertemplate='<b>折扣: %{x}</b><br>销量: %{y:,}件<extra></extra>',
            text=df['quantity'],
            texttemplate='%{text:,}',
            textposition='outside',
            textfont=dict(color=PRIMARY_COLOR, size=10),
            opacity=0.8
        ),
        secondary_y=False,
    )

    fig.add_trace(
        go.Scatter(
            x=df['discount'],
            y=df['revenue'],
            name='销售额',
            mode='lines+markers',
            line=dict(color='#3b82f6', width=3),
            marker=dict(size=8, color='#3b82f6'),
            hovertemplate='<b>折扣: %{x}</b><br>销售额: ¥%{y:,.2f}<extra></extra>',
            yaxis='y1'
        ),
        secondary_y=False,
    )

    fig.add_trace(
        go.Scatter(
            x=df['discount'],
            y=df['elasticity'],
            name='价格弹性',
            mode='lines+markers',
            line=dict(color=ACCENT_COLOR, width=3, dash='solid'),
            marker=dict(size=8, color=ACCENT_COLOR, symbol='diamond'),
            hovertemplate='<b>折扣: %{x}</b><br>弹性系数: %{y:.2f}<extra></extra>'
        ),
        secondary_y=True,
    )

    fig.add_hline(
        y=-1,
        line_dash="dash",
        line_color=ACCENT_COLOR,
        line_width=1.5,
        annotation_text="弹性=-1（临界点）",
        annotation_position="right",
        annotation_font=dict(color=ACCENT_COLOR, size=10)
    )

    fig.add_vline(
        x=df.loc[max_revenue_idx, 'discount'],
        line_dash="dash",
        line_color=ACCENT_COLOR,
        line_width=2,
        annotation_text=f"最优折扣: {df.loc[max_revenue_idx, 'discount']}",
        annotation_position="top",
        annotation_font=dict(color=ACCENT_COLOR, size=11, weight='bold')
    )

    elastic_count = (df['elasticity'] < -1).sum()
    inelastic_count = (df['elasticity'] > -1).sum()

    fig.update_layout(
        title={
            'text': '<b>价格敏感度分析 - 折扣区间销量与弹性</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        template='plotly_white',
        barmode='overlay',
        legend=dict(orientation='h', yanchor='bottom', y=1.05, xanchor='right', x=1),
        xaxis=dict(
            title='折扣区间',
            tickfont=dict(size=10)
        ),
        yaxis=dict(
            title='销量(件) / 销售额(元)',
            titlefont=dict(color=PRIMARY_COLOR),
            tickfont=dict(color=PRIMARY_COLOR),
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)'
        ),
        yaxis2=dict(
            title='价格弹性系数',
            titlefont=dict(color=ACCENT_COLOR),
            tickfont=dict(color=ACCENT_COLOR),
            showgrid=False,
            zeroline=True,
            zerolinecolor='#cccccc'
        ),
        margin=dict(l=60, r=60, t=100, b=60),
        annotations=[
            dict(
                x=0.02,
                y=0.98,
                xref='paper',
                yref='paper',
                text=f'<b>分析结果</b><br>'
                     f'富有弹性区间: {elastic_count}个<br>'
                     f'缺乏弹性区间: {inelastic_count}个',
                showarrow=False,
                align='left',
                bgcolor='rgba(30, 58, 95, 0.05)',
                bordercolor=PRIMARY_COLOR,
                borderwidth=1,
                font=dict(color=PRIMARY_COLOR, size=10),
                xanchor='left',
                yanchor='top'
            )
        ]
    )

    return fig


def plot_retention_heatmap(retention_df: pd.DataFrame) -> go.Figure:
    """
    Plotly热力图展示用户留存率矩阵。

    Parameters
    ----------
    retention_df : pd.DataFrame
        留存率矩阵DataFrame，索引为用户注册月份/周，
        列名为留存周期（如'第1月', '第2月'等），值为留存率（0-1或0-100）。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 行代表用户获取周期，列代表留存周期
    - 颜色深浅代表留存率高低，对角线代表同期留存
    - 数值自动格式化为百分比显示
    - 支持悬停查看详细留存率和用户数
    - 高亮显示第一列（次月留存率）便于对比

    Examples
    --------
    >>> retention_df = calculate_retention(sales_df)
    >>> fig = plot_retention_heatmap(retention_df)
    >>> fig.show()
    """
    df = retention_df.copy()

    if df.values.max() > 1:
        df = df / 100

    text_matrix = []
    for i in range(len(df)):
        row_text = []
        for j in range(len(df.columns)):
            val = df.iloc[i, j]
            if pd.isna(val):
                row_text.append('-')
            else:
                row_text.append(f'{val:.1%}')
        text_matrix.append(row_text)

    colorscale = [
        [0, '#fff5eb'],
        [0.2, '#fee6ce'],
        [0.4, '#fdae6b'],
        [0.6, '#fd8d3c'],
        [0.8, '#f97316'],
        [1, '#1e3a5f']
    ]

    fig = go.Figure(data=go.Heatmap(
        z=df.values,
        x=df.columns,
        y=df.index,
        text=text_matrix,
        texttemplate='%{text}',
        textfont=dict(size=10),
        colorscale=colorscale,
        showscale=True,
        colorbar=dict(
            title=dict(
                text='留存率',
                font=dict(color=PRIMARY_COLOR)
            ),
            tickformat='.0%',
            x=1.02
        ),
        hovertemplate='<b>注册期: %{y}</b><br>'
                      '<b>留存期: %{x}</b><br>'
                      '<b>留存率: %{z:.1%}</b><extra></extra>',
        xgap=1,
        ygap=1
    ))

    avg_retention = df.mean().mean()
    first_col_avg = df.iloc[:, 0].mean() if len(df.columns) > 0 else 0

    fig.update_layout(
        title={
            'text': '<b>用户留存率矩阵热力图</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        template='plotly_white',
        xaxis=dict(
            title='留存周期',
            tickangle=0,
            tickfont=dict(size=10)
        ),
        yaxis=dict(
            title='用户注册周期',
            tickfont=dict(size=10),
            autorange='reversed'
        ),
        margin=dict(l=100, r=120, t=80, b=60),
        height=max(500, 100 + len(df) * 30),
        annotations=[
            dict(
                x=0.92,
                y=0.98,
                xref='paper',
                yref='paper',
                text=f'<b>整体平均留存</b><br>'
                     f'{avg_retention:.1%}<br><br>'
                     f'<b>平均次月留存</b><br>'
                     f'{first_col_avg:.1%}',
                showarrow=False,
                align='left',
                bgcolor='rgba(249, 115, 22, 0.1)',
                bordercolor=ACCENT_COLOR,
                borderwidth=1,
                font=dict(color=PRIMARY_COLOR, size=10),
                xanchor='left',
                yanchor='top'
            )
        ]
    )

    return fig


def plot_kpi_cards(kpis: Dict) -> str:
    """
    生成KPI指标卡片HTML，用于在页面中展示核心指标。

    Parameters
    ----------
    kpis : Dict
        KPI指标字典，键为指标名称，值可为数值或字典。
        字典格式支持：{'value': 数值, 'change': 同比变化率, 'unit': '单位', 'trend': 'up'/'down'}。

    Returns
    -------
    str
        HTML字符串，包含美化的KPI指标卡片。

    Notes
    -----
    - 支持6种核心指标：总销售额、订单量、客单价、用户数、复购率、留存率
    - 自动识别指标类型并应用对应的图标和颜色
    - 支持同比/环比变化率显示，上升用绿色，下降用红色
    - 响应式卡片布局，适配不同屏幕尺寸
    - 使用专业配色方案，深蓝主色调配合橙色强调

    Examples
    --------
    >>> kpis = {
    ...     '总销售额': {'value': 1234567, 'change': 12.5, 'unit': '元'},
    ...     '订单量': {'value': 3456, 'change': -3.2, 'unit': '单'},
    ...     '客单价': 357
    ... }
    >>> html = plot_kpi_cards(kpis)
    >>> st.components.v1.html(html, height=200)
    """
    icons = {
        '总销售额': '💰',
        '销售额': '💰',
        '订单量': '📦',
        '订单数': '📦',
        '客单价': '💵',
        '平均订单金额': '💵',
        '用户数': '👥',
        '用户数量': '👥',
        '复购率': '🔄',
        '留存率': '📈',
        '转化率': '📊',
        '访问量': '👁️',
        '销量': '🛒',
        '利润': '💎'
    }

    cards_html = []

    for idx, (name, data) in enumerate(kpis.items()):
        if isinstance(data, dict):
            value = data.get('value', 0)
            change = data.get('change', None)
            unit = data.get('unit', '')
            trend = data.get('trend', None)
        else:
            value = data
            change = None
            unit = ''
            trend = None

        if isinstance(value, (int, float)):
            if abs(value) >= 100000000:
                display_value = f'{value/100000000:.2f}亿'
            elif abs(value) >= 10000:
                display_value = f'{value/10000:.2f}万'
            else:
                display_value = f'{value:,.0f}'
        elif isinstance(value, str):
            display_value = value
        else:
            display_value = str(value)

        icon = icons.get(name, '📊')

        if trend is None and change is not None:
            trend = 'up' if change >= 0 else 'down'
        elif trend is None:
            trend = 'neutral'

        trend_color = '#10b981' if trend == 'up' else '#ef4444' if trend == 'down' else '#666666'
        trend_icon = '↑' if trend == 'up' else '↓' if trend == 'down' else '→'

        if change is not None:
            change_text = f'<span style="color: {trend_color}; font-size: 13px; font-weight: 600;">{trend_icon} {abs(change):.1f}%</span>'
        else:
            change_text = ''

        border_color = ACCENT_COLOR if idx == 0 else PRIMARY_COLOR

        card_html = f'''
        <div style="
            flex: 1;
            min-width: 180px;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(30, 58, 95, 0.1);
            border-left: 4px solid {border_color};
            transition: all 0.3s ease;
            cursor: pointer;
            margin: 0 8px;
        "
        onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 25px rgba(30, 58, 95, 0.15)';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(30, 58, 95, 0.1)';">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <span style="font-size: 28px;">{icon}</span>
                {change_text}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px; font-weight: 500;">{name}</div>
            <div style="font-size: 24px; font-weight: 700; color: {PRIMARY_COLOR}; line-height: 1.2;">
                {display_value}
                <span style="font-size: 14px; color: #94a3b8; font-weight: 500;">{unit}</span>
            </div>
        </div>
        '''
        cards_html.append(card_html)

    html_template = f'''
    <div style="
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 0;
        margin: 0 -8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    ">
        {''.join(cards_html)}
    </div>
    '''

    return html_template


def plot_peaks_valleys(df: pd.DataFrame, peaks_valleys_df: pd.DataFrame) -> go.Figure:
    """
    高峰低谷标注的时间序列图，清晰展示销售数据中的异常高点和低点。

    Parameters
    ----------
    df : pd.DataFrame
        原始销售数据DataFrame，需包含日期字段和金额字段。
    peaks_valleys_df : pd.DataFrame
        高峰低谷分析结果，需包含'date'（日期）、'type'（类型：'peak'或'valley'）、
        'value'（数值）字段。

    Returns
    -------
    go.Figure
        Plotly Figure对象，可直接用于展示或保存。

    Notes
    -----
    - 主时间序列使用深蓝色平滑曲线展示
    - 高峰点使用橙色标记，低谷点使用绿色标记
    - 自动计算并标注高峰低谷的数值和日期
    - 支持缩放、平移、数据点悬停查看详情
    - 显示统计摘要：高峰数量、低谷数量、最高峰值、最低谷值

    Examples
    --------
    >>> peaks_valleys = detect_peaks_valleys(sales_df)
    >>> fig = plot_peaks_valleys(sales_df, peaks_valleys)
    >>> fig.show()
    """
    date_patterns = ['order_date', '下单时间', '订单日期', '交易时间', '购买日期', 'date', 'datetime', '时间', '日期']
    amount_patterns = ['total_amount', '订单金额', '金额', '消费金额', '支付金额', 'amount', 'price', '销售额']

    date_col = None
    amount_col = None
    for col in df.columns:
        col_lower = str(col).lower()
        if date_col is None:
            for pattern in date_patterns:
                if pattern.lower() in col_lower:
                    date_col = col
                    break
        if amount_col is None:
            for pattern in amount_patterns:
                if pattern.lower() in col_lower:
                    amount_col = col
                    break

    if date_col is None or amount_col is None:
        raise ValueError("数据中未找到日期字段或金额字段")

    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df = df.dropna(subset=[date_col, amount_col])

    df_agg = df.groupby(df[date_col].dt.date)[amount_col].sum().reset_index()
    df_agg.columns = ['date', 'sales']
    df_agg['date'] = pd.to_datetime(df_agg['date'])

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=df_agg['date'],
        y=df_agg['sales'],
        mode='lines',
        name='销售额',
        line=dict(color=PRIMARY_COLOR, width=2),
        hovertemplate='<b>日期</b>: %{x|%Y-%m-%d}<br><b>销售额</b>: ¥%{y:,.2f}<extra></extra>',
        fill='tozeroy',
        fillcolor='rgba(30, 58, 95, 0.08)'
    ))

    if not peaks_valleys_df.empty:
        peaks = peaks_valleys_df[peaks_valleys_df['type'] == 'peak']
        valleys = peaks_valleys_df[peaks_valleys_df['type'] == 'valley']

        if len(peaks) > 0:
            peaks['date'] = pd.to_datetime(peaks['date'])
            fig.add_trace(go.Scatter(
                x=peaks['date'],
                y=peaks['value'],
                mode='markers+text',
                name='高峰',
                marker=dict(size=14, color=ACCENT_COLOR, symbol='triangle-up', line=dict(color='white', width=2)),
                text=[f'¥{v:,.0f}' for v in peaks['value']],
                textposition='top center',
                textfont=dict(color=ACCENT_COLOR, size=11, weight='bold'),
                hovertemplate='<b>高峰</b><br>日期: %{x|%Y-%m-%d}<br>销售额: ¥%{y:,.2f}<extra></extra>'
            ))

        if len(valleys) > 0:
            valleys['date'] = pd.to_datetime(valleys['date'])
            fig.add_trace(go.Scatter(
                x=valleys['date'],
                y=valleys['value'],
                mode='markers+text',
                name='低谷',
                marker=dict(size=14, color='#10b981', symbol='triangle-down', line=dict(color='white', width=2)),
                text=[f'¥{v:,.0f}' for v in valleys['value']],
                textposition='bottom center',
                textfont=dict(color='#10b981', size=11, weight='bold'),
                hovertemplate='<b>低谷</b><br>日期: %{x|%Y-%m-%d}<br>销售额: ¥%{y:,.2f}<extra></extra>'
            ))

    peak_count = len(peaks_valleys_df[peaks_valleys_df['type'] == 'peak']) if not peaks_valleys_df.empty else 0
    valley_count = len(peaks_valleys_df[peaks_valleys_df['type'] == 'valley']) if not peaks_valleys_df.empty else 0
    max_peak = peaks_valleys_df[peaks_valleys_df['type'] == 'peak']['value'].max() if peak_count > 0 else 0
    min_valley = peaks_valleys_df[peaks_valleys_df['type'] == 'valley']['value'].min() if valley_count > 0 else 0

    fig.update_layout(
        title={
            'text': '<b>销售高峰与低谷分析</b>',
            'x': 0.5,
            'xanchor': 'center',
            'font': dict(size=18, color=PRIMARY_COLOR)
        },
        xaxis_title='日期',
        yaxis_title='销售额 (元)',
        template='plotly_white',
        hovermode='x unified',
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
        xaxis=dict(
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)',
            rangeselector=dict(
                buttons=list([
                    dict(count=1, label='1月', step='month', stepmode='backward'),
                    dict(count=3, label='3月', step='month', stepmode='backward'),
                    dict(count=6, label='6月', step='month', stepmode='backward'),
                    dict(step='all', label='全部')
                ]),
                bgcolor='white',
                bordercolor=PRIMARY_COLOR
            ),
            rangeslider=dict(visible=True, bgcolor='rgba(30, 58, 95, 0.05)')
        ),
        yaxis=dict(
            showgrid=True,
            gridwidth=1,
            gridcolor='rgba(200, 200, 200, 0.3)',
            tickprefix='¥',
            tickformat=',.0f'
        ),
        margin=dict(l=60, r=40, t=100, b=60),
        annotations=[
            dict(
                x=0.02,
                y=0.98,
                xref='paper',
                yref='paper',
                text=f'<b>统计摘要</b><br>'
                     f'高峰数量: {peak_count}个<br>'
                     f'低谷数量: {valley_count}个<br>'
                     f'最高峰值: ¥{max_peak:,.0f}<br>'
                     f'最低谷值: ¥{min_valley:,.0f}',
                showarrow=False,
                align='left',
                bgcolor='rgba(30, 58, 95, 0.05)',
                bordercolor=PRIMARY_COLOR,
                borderwidth=1,
                font=dict(color=PRIMARY_COLOR, size=10),
                xanchor='left',
                yanchor='top'
            )
        ]
    )

    return fig

