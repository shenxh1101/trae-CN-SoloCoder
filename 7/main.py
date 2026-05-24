"""
数据可视化仪表板 - 主程序
基于Streamlit的交互式数据分析平台
"""

import os
import sys
import io
import base64
import warnings
from datetime import datetime
from typing import Dict, List, Optional, Any

warnings.filterwarnings('ignore')

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px

st.set_page_config(
    page_title='数据可视化仪表板',
    page_icon='📊',
    layout='wide',
    initial_sidebar_state='expanded'
)

PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'

st.markdown(f"""
<style>
    .stApp {{
        background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
    }}
    .block-container {{
        padding-top: 2rem;
        padding-bottom: 2rem;
    }}
    h1, h2, h3 {{
        color: {PRIMARY_COLOR};
    }}
    .stMetric {{
        background: white;
        padding: 1rem;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }}
    .stTabs [data-baseweb="tab-list"] {{
        gap: 8px;
    }}
    .stTabs [data-baseweb="tab"] {{
        height: 50px;
        border-radius: 8px 8px 0 0;
        padding: 0 20px;
        background-color: #f3f4f6;
    }}
    .stTabs [aria-selected="true"] {{
        background-color: {PRIMARY_COLOR};
        color: white;
    }}
    .element-container {{
        background: white;
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        margin-bottom: 1rem;
    }}
    .streamlit-expanderHeader {{
        font-size: 16px;
        font-weight: 600;
        color: {PRIMARY_COLOR};
    }}
</style>
""", unsafe_allow_html=True)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data_loader import load_file, load_sample_data
from src.type_detector import classify_columns, detect_column_type, get_type_icon, get_type_color, get_type_label, get_type_description
from src.chart_recommender import recommend_charts, get_chart_info, get_default_chart_config
from src.chart_builder import build_chart, ChartConfig, FilterCondition
from src.linkage_controller import LinkageController
from src.pivot_table import build_pivot, pivot_to_heatmap, PivotConfig, PivotValue
from src.data_cleaner import (
    handle_missing_values_single, detect_outliers_single, remove_duplicates,
    convert_column_type, CleanStep, get_missing_value_summary,
    get_missing_value_strategies, get_column_type_options
)
from src.pipeline import PipelineManager, Pipeline
from src.report_generator import generate_full_report, export_report_to_pdf
from src.predictor import (
    predict, plot_prediction, plot_prediction_components,
    format_metrics_table, get_prediction_summary
)
from src.template_manager import TemplateManager, DashboardTemplate
from src.drag_and_drop_utils import (
    init_drag_and_drop,
    render_drag_and_drop_interface
)


def init_session_state():
    """初始化会话状态"""
    if 'df' not in st.session_state:
        st.session_state.df = None
    if 'original_df' not in st.session_state:
        st.session_state.original_df = None
    if 'column_types' not in st.session_state:
        st.session_state.column_types = {}
    if 'chart_configs' not in st.session_state:
        st.session_state.chart_configs = []
    if 'pivot_configs' not in st.session_state:
        st.session_state.pivot_configs = []
    if 'linkage_controller' not in st.session_state:
        st.session_state.linkage_controller = LinkageController()
    if 'clean_steps' not in st.session_state:
        st.session_state.clean_steps = []
    if 'current_page' not in st.session_state:
        st.session_state.current_page = '数据上传'
    if 'filter_condition' not in st.session_state:
        st.session_state.filter_condition = None


def page_data_upload():
    """数据上传页面"""
    st.title('📁 数据上传')
    st.markdown('---')

    col1, col2, col3 = st.columns([2, 1, 1])

    with col1:
        uploaded_file = st.file_uploader(
            '请上传数据文件',
            type=['csv', 'xlsx', 'xls', 'json'],
            help='支持CSV、Excel和JSON格式'
        )

    with col2:
        st.markdown('<br>', unsafe_allow_html=True)
        if st.button('📊 加载示例数据', use_container_width=True):
            df = load_sample_data()
            st.session_state.df = df
            st.session_state.original_df = df.copy()
            st.session_state.column_types = classify_columns(df)
            st.session_state.clean_steps = []
            st.success('示例数据加载成功！')
            st.rerun()

    with col3:
        st.markdown('<br>', unsafe_allow_html=True)
        if st.button('🔄 重置数据', use_container_width=True):
            if st.session_state.original_df is not None:
                st.session_state.df = st.session_state.original_df.copy()
                st.session_state.clean_steps = []
                st.success('数据已重置为原始状态')
                st.rerun()

    if uploaded_file is not None:
        try:
            df, message = load_file(uploaded_file)
            if df is not None:
                st.session_state.df = df
                st.session_state.original_df = df.copy()
                st.session_state.column_types = classify_columns(df)
                st.session_state.clean_steps = []
                st.success(f'{message}')
            else:
                st.error(message)
        except Exception as e:
            st.error(f'文件加载失败: {str(e)}')

    if st.session_state.df is not None:
        df = st.session_state.df
        st.markdown('---')

        col1, col2, col3, col4, col5 = st.columns(5)
        with col1:
            st.metric('📊 数据行数', f'{len(df):,}')
        with col2:
            st.metric('📋 数据列数', len(df.columns))
        with col3:
            st.metric('🔢 数值列', len(st.session_state.column_types.get('numeric', [])))
        with col4:
            st.metric('🏷️ 分类列', len(st.session_state.column_types.get('categorical', [])))
        with col5:
            total_missing = df.isna().sum().sum()
            missing_pct = total_missing / (len(df) * len(df.columns)) * 100
            st.metric('⚠️ 缺失值', f'{total_missing:,} ({missing_pct:.1f}%)')

        st.markdown('### 📋 数据预览')
        preview_rows = st.slider('预览行数', 5, 100, 20)
        st.dataframe(df.head(preview_rows), use_container_width=True, height=400)

        st.markdown('### 🏷️ 列类型检测')
        type_data = []
        for col in df.columns:
            col_type = detect_column_type(df[col], col)
            type_data.append({
                '列名': col,
                '数据类型': str(df[col].dtype),
                '检测类型': get_type_label(col_type),
                '图标': get_type_icon(col_type),
                '非空值': f"{df[col].notna().sum():,}",
                '缺失值': f"{df[col].isna().sum():,}",
                '唯一值': f"{df[col].nunique():,}"
            })
        type_df = pd.DataFrame(type_data)
        st.dataframe(type_df, use_container_width=True)


def page_chart_builder():
    """图表构建页面"""
    st.title('📈 图表构建')
    st.markdown('---')

    if st.session_state.df is None:
        st.warning('请先上传数据')
        return

    df = st.session_state.df
    column_types = st.session_state.column_types

    if 'active_chart_tab' not in st.session_state:
        st.session_state.active_chart_tab = '创建图表'

    tab1, tab2 = st.tabs(['🎨 创建图表', '📊 多图表联动'])

    with tab1:
        init_drag_and_drop()

        chart_info = get_chart_info()
        chart_options = [c['name'] for c in chart_info.values()]
        chart_labels = [f"{c['icon']} {c['name_cn']}" for c in chart_info.values()]

        selected_chart_label = st.selectbox(
            '🎨 选择图表类型',
            options=chart_labels,
            index=0,
            key='chart_type_select'
        )
        selected_chart_idx = chart_labels.index(selected_chart_label)
        chart_type = list(chart_info.keys())[selected_chart_idx]

        recommendations = recommend_charts(column_types, df=df)
        if recommendations:
            top_rec = recommendations[0]
            st.info(f"💡 智能推荐: **{get_chart_info()[top_rec['chart_type']]['name_cn']}** (匹配度: {top_rec['score']:.1f}分)")

        all_columns = df.columns.tolist()
        numeric_cols = column_types.get('numeric', [])
        categorical_cols = column_types.get('categorical', [])
        datetime_cols = column_types.get('datetime', [])
        geographic_cols = column_types.get('geographic', [])

        default_config = get_default_chart_config(chart_type, column_types)

        if chart_type in ['heatmap', 'geo']:
            y_axis_options = all_columns
        else:
            y_axis_options = numeric_cols

        session_prefix = f"chart_{chart_type}"
        x_session_key = f"{session_prefix}_x_axis"
        y_session_key = f"{session_prefix}_y_axis"
        color_session_key = f"{session_prefix}_color"
        group_session_key = f"{session_prefix}_group"

        for key in [x_session_key, y_session_key, color_session_key, group_session_key]:
            if key not in st.session_state:
                if key == x_session_key and default_config.x_axis:
                    st.session_state[key] = [default_config.x_axis] if default_config.x_axis in all_columns else []
                elif key == y_session_key and default_config.y_axis:
                    valid_y = [y for y in default_config.y_axis if y in y_axis_options]
                    st.session_state[key] = valid_y
                elif key == color_session_key and default_config.color:
                    st.session_state[key] = [default_config.color] if default_config.color in categorical_cols else []
                elif key == group_session_key and default_config.group:
                    st.session_state[key] = [default_config.group] if default_config.group in categorical_cols else []
                else:
                    st.session_state[key] = []

        columns_with_types = []
        for col_name in all_columns:
            col_type = detect_column_type(df[col_name], col_name)
            columns_with_types.append({'name': col_name, 'type': col_type})

        x_accepted_cols = numeric_cols + categorical_cols + datetime_cols + geographic_cols
        x_accepted_types = list(set([c['type'] for c in columns_with_types if c['name'] in x_accepted_cols]))
        y_accepted_types = list(set([c['type'] for c in columns_with_types if c['name'] in y_axis_options]))

        drop_zones = [
            {
                'id': 'x_axis',
                'title': 'X轴字段',
                'icon': '�',
                'accepted_types': x_accepted_types,
                'multi': False,
                'session_key': x_session_key
            },
            {
                'id': 'y_axis',
                'title': 'Y轴字段',
                'icon': '📈',
                'accepted_types': y_accepted_types,
                'multi': True,
                'session_key': y_session_key
            },
            {
                'id': 'color',
                'title': '颜色字段 (可选)',
                'icon': '🎨',
                'accepted_types': ['categorical', 'numeric'],
                'multi': False,
                'session_key': color_session_key
            },
            {
                'id': 'group',
                'title': '分组字段 (可选)',
                'icon': '📊',
                'accepted_types': ['categorical'],
                'multi': False,
                'session_key': group_session_key
            }
        ]

        results = render_drag_and_drop_interface(
            columns=columns_with_types,
            drop_zones=drop_zones,
            session_prefix=session_prefix
        )

        st.markdown('---')

        col_config1, col_config2 = st.columns(2)

        with col_config1:
            aggregation = st.selectbox(
                '🔢 聚合方式',
                options=['sum', 'mean', 'count', 'min', 'max', 'median'],
                index=['sum', 'mean', 'count', 'min', 'max', 'median'].index(default_config.aggregation),
                key=f"{session_prefix}_agg"
            )

        with col_config2:
            chart_title = st.text_input(
                '📝 图表标题',
                value=f'{get_chart_info()[chart_type]["name_cn"]}',
                key=f"{session_prefix}_title"
            )

        x_axis = results['x_axis'][0] if results['x_axis'] else ''
        y_axis = results['y_axis']
        color_col = results['color'][0] if results['color'] else ''
        group_col = results['group'][0] if results['group'] else ''

        col_btn1, col_btn2, col_btn3 = st.columns(3)

        with col_btn1:
            if st.button('🔍 预览图表', type='primary', use_container_width=True):
                config = ChartConfig(
                    chart_id=f'chart_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
                    chart_type=chart_type,
                    title=chart_title,
                    x_axis=x_axis if x_axis else None,
                    y_axis=y_axis,
                    color=color_col if color_col else None,
                    group=group_col if group_col else None,
                    aggregation=aggregation
                )

                try:
                    fig = build_chart(df, config, st.session_state.filter_condition)
                    st.session_state.current_fig = fig
                    st.session_state.current_config = config
                except Exception as e:
                    st.error(f'图表构建失败: {str(e)}')

        with col_btn2:
            if st.button('🔄 重置配置', use_container_width=True):
                for key in [x_session_key, y_session_key, color_session_key, group_session_key]:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()

        with col_btn3:
            if st.button('➕ 添加新图表', use_container_width=True):
                for key in list(st.session_state.keys()):
                    if key.startswith('chart_'):
                        del st.session_state[key]
                for key in ['current_fig', 'current_config']:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()

        if 'current_config' in st.session_state:
            if st.button('💾 保存到仪表板', type='secondary', use_container_width=True):
                if len(y_axis) > 0 or chart_type in ['heatmap', 'geo']:
                    st.session_state.chart_configs.append(st.session_state.current_config)
                    st.success('图表已保存！在"多图表联动"标签页查看')
                else:
                    st.error('请至少选择一个Y轴字段')

        st.markdown('---')

        st.markdown('### 📊 图表预览')
        if 'current_fig' in st.session_state:
            st.plotly_chart(st.session_state.current_fig, use_container_width=True, height=600)
        else:
            st.info('👆 请在上方配置图表参数，点击"预览图表"查看效果')

    with tab2:
        linkage_page(df)


def linkage_page(df: pd.DataFrame):
    """多图表联动页面"""
    st.markdown('### 🔗 多图表联动仪表板')

    chart_configs = st.session_state.chart_configs

    if not chart_configs:
        st.info('还没有保存的图表，请先在"创建图表"标签页创建并保存图表')
        return

    col1, col2 = st.columns([3, 1])

    with col1:
        filter_condition = st.session_state.filter_condition

        if filter_condition:
            col_a, col_b = st.columns([3, 1])
            with col_a:
                st.info(f"🔍 当前筛选: **{filter_condition.column}** {filter_condition.operator} **{filter_condition.value}**")
            with col_b:
                if st.button('❌ 清除筛选', use_container_width=True):
                    st.session_state.filter_condition = None
                    st.session_state.linkage_controller.clear_filter()
                    st.rerun()

        num_charts = len(chart_configs)
        cols_per_row = min(2, num_charts)

        for i in range(0, num_charts, cols_per_row):
            cols = st.columns(cols_per_row)
            for j in range(cols_per_row):
                if i + j < num_charts:
                    config = chart_configs[i + j]
                    with cols[j]:
                        try:
                            fig = build_chart(df, config, filter_condition)
                            fig.update_layout(height=350)

                            plot_events = st.plotly_chart(
                                fig,
                                use_container_width=True,
                                key=f'linkage_chart_{config.chart_id}',
                                on_select='rerun',
                                selection_mode='point'
                            )

                            if plot_events and plot_events.selection and plot_events.selection.points:
                                point = plot_events.selection.points[0]

                                if hasattr(point, 'x'):
                                    filter_value = point.x
                                    if config.x_axis:
                                        new_filter = FilterCondition(
                                            column=config.x_axis,
                                            operator='equals',
                                            value=filter_value
                                        )
                                        st.session_state.filter_condition = new_filter
                                        st.session_state.linkage_controller.on_point_click(
                                            config.chart_id,
                                            {'x': filter_value, 'y': point.y if hasattr(point, 'y') else None}
                                        )
                                        st.rerun()

                        except Exception as e:
                            st.error(f'图表渲染失败: {str(e)}')

    with col2:
        st.markdown('### 📋 已保存图表')

        for idx, config in enumerate(chart_configs):
            with st.expander(f"{idx + 1}. {config.title}", expanded=False):
                st.write(f"**类型**: {get_chart_info()[config.chart_type]['name_cn']}")
                st.write(f"**X轴**: {config.x_axis}")
                st.write(f"**Y轴**: {', '.join(config.y_axis)}")
                if config.color:
                    st.write(f"**颜色**: {config.color}")
                if config.group:
                    st.write(f"**分组**: {config.group}")

                if st.button(f'🗑️ 删除', key=f'del_chart_{idx}'):
                    st.session_state.chart_configs.pop(idx)
                    st.rerun()

        if st.button('🗑️ 清空所有图表', type='secondary', use_container_width=True):
            st.session_state.chart_configs = []
            st.success('已清空所有图表')
            st.rerun()


def page_pivot_table():
    """数据透视表页面"""
    st.title('🔄 数据透视表')
    st.markdown('---')

    if st.session_state.df is None:
        st.warning('请先上传数据')
        return

    df = st.session_state.df
    all_columns = df.columns.tolist()
    numeric_cols = st.session_state.column_types.get('numeric', [])
    categorical_cols = st.session_state.column_types.get('categorical', [])
    datetime_cols = st.session_state.column_types.get('datetime', [])

    init_drag_and_drop()

    columns_with_types = []
    for col_name in all_columns:
        col_type = detect_column_type(df[col_name], col_name)
        columns_with_types.append({'name': col_name, 'type': col_type})

    session_prefix = "pivot"
    rows_session_key = f"{session_prefix}_rows"
    cols_session_key = f"{session_prefix}_columns"
    vals_session_key = f"{session_prefix}_values"

    for key in [rows_session_key, cols_session_key, vals_session_key]:
        if key not in st.session_state:
            st.session_state[key] = []

    if 'pivot_aggregations' not in st.session_state:
        st.session_state['pivot_aggregations'] = {}

    row_accepted_types = list(set([c['type'] for c in columns_with_types if c['name'] in (categorical_cols + datetime_cols)]))

    drop_zones = [
        {
            'id': 'rows',
            'title': '行字段',
            'icon': '📏',
            'accepted_types': row_accepted_types,
            'multi': True,
            'session_key': rows_session_key
        },
        {
            'id': 'columns',
            'title': '列字段',
            'icon': '📐',
            'accepted_types': ['categorical'],
            'multi': True,
            'session_key': cols_session_key
        },
        {
            'id': 'values',
            'title': '值字段',
            'icon': '💰',
            'accepted_types': ['numeric'],
            'multi': True,
            'session_key': vals_session_key
        }
    ]

    col1, col2 = st.columns([1, 2])

    with col1:
        st.markdown('### 🎛️ 透视表配置')

        results = render_drag_and_drop_interface(
            columns=columns_with_types,
            drop_zones=drop_zones,
            session_prefix=session_prefix
        )

        rows = results['rows']
        columns = results['columns']
        values = results['values']

        if values:
            st.markdown('#### 🔢 值字段聚合方式')
            aggregation_options = ['sum', 'mean', 'count', 'min', 'max', 'median', 'std', 'var', 'nunique']
            agg_labels = {
                'sum': '求和', 'mean': '平均值', 'count': '计数',
                'min': '最小值', 'max': '最大值', 'median': '中位数',
                'std': '标准差', 'var': '方差', 'nunique': '唯一值计数'
            }

            value_configs = []
            for val in values:
                default_agg = st.session_state['pivot_aggregations'].get(val, 'sum')
                agg = st.selectbox(
                    f'聚合方式 - {val}',
                    options=aggregation_options,
                    format_func=lambda x: agg_labels[x],
                    index=aggregation_options.index(default_agg),
                    key=f'pivot_agg_{val}'
                )
                st.session_state['pivot_aggregations'][val] = agg
                value_configs.append(PivotValue(column=val, aggregation=agg))
        else:
            value_configs = []

        st.markdown('---')

        col_config1, col_config2 = st.columns(2)
        with col_config1:
            show_totals = st.checkbox('显示总计', value=True)
            heatmap_enabled = st.checkbox('启用热力图', value=True)
        with col_config2:
            show_subtotals = st.checkbox('显示小计', value=True)
            colormap = st.selectbox(
                '配色方案',
                options=['blues', 'oranges', 'greens', 'reds', 'viridis', 'plasma', 'rdylbu'],
                index=0
            )

        col_btn1, col_btn2 = st.columns(2)

        with col_btn1:
            if st.button('🔍 生成透视表', type='primary', use_container_width=True):
                if rows and value_configs:
                    config = PivotConfig(
                        pivot_id=f'pivot_{datetime.now().strftime("%Y%m%d_%H%M%S")}',
                        rows=rows,
                        columns=columns,
                        values=value_configs,
                        show_totals=show_totals,
                        show_subtotals=show_subtotals,
                        heatmap_enabled=heatmap_enabled,
                        colormap=colormap
                    )

                    try:
                        result_df = build_pivot(df, config)
                        st.session_state.pivot_result = result_df
                        st.session_state.pivot_config = config

                        if heatmap_enabled:
                            heatmap_fig = pivot_to_heatmap(result_df, config)
                            st.session_state.pivot_heatmap = heatmap_fig

                    except Exception as e:
                        st.error(f'透视表生成失败: {str(e)}')
                else:
                    st.error('请至少选择一个行字段和一个值字段')

        with col_btn2:
            if st.button('🔄 重置配置', use_container_width=True):
                for key in [rows_session_key, cols_session_key, vals_session_key, 'pivot_aggregations']:
                    if key in st.session_state:
                        del st.session_state[key]
                for key in ['pivot_result', 'pivot_config', 'pivot_heatmap']:
                    if key in st.session_state:
                        del st.session_state[key]
                st.rerun()

        if 'pivot_config' in st.session_state:
            if st.button('💾 保存配置', type='secondary', use_container_width=True):
                st.session_state.pivot_configs.append(st.session_state.pivot_config)
                st.success('透视表配置已保存！')

    with col2:
        st.markdown('### 📊 透视表结果')

        if 'pivot_result' in st.session_state:
            result_df = st.session_state.pivot_result
            config = st.session_state.pivot_config

            tab1, tab2 = st.tabs(['📋 数据表格', '🌡️ 热力图'])

            with tab1:
                st.dataframe(result_df, use_container_width=True, height=600)

                csv = result_df.to_csv(index=True).encode('utf-8')
                st.download_button(
                    label='📥 下载为CSV',
                    data=csv,
                    file_name='pivot_table.csv',
                    mime='text/csv',
                    use_container_width=True
                )

            with tab2:
                if config.heatmap_enabled and 'pivot_heatmap' in st.session_state:
                    st.plotly_chart(st.session_state.pivot_heatmap, use_container_width=True, height=600)
                else:
                    st.info('请启用热力图选项以查看热力图')
        else:
            st.info('👈 请在左侧配置透视表参数，点击"生成透视表"查看结果')

        if st.session_state.pivot_configs:
            st.markdown('### 💾 已保存配置')
            for idx, config in enumerate(st.session_state.pivot_configs):
                with st.expander(f"配置 {idx + 1}", expanded=False):
                    st.write(f"**行**: {', '.join(config.rows)}")
                    st.write(f"**列**: {', '.join(config.columns) if config.columns else '无'}")
                    st.write(f"**值**: {', '.join([f'{v.column}({v.aggregation})' for v in config.values])}")

                    if st.button(f'📂 加载此配置', key=f'load_pivot_{idx}'):
                        try:
                            result_df = build_pivot(df, config)
                            st.session_state.pivot_result = result_df
                            st.session_state.pivot_config = config
                            if config.heatmap_enabled:
                                heatmap_fig = pivot_to_heatmap(result_df, config)
                                st.session_state.pivot_heatmap = heatmap_fig
                            st.success('配置已加载')
                            st.rerun()
                        except Exception as e:
                            st.error(f'加载失败: {str(e)}')

                    if st.button(f'🗑️ 删除', key=f'del_pivot_{idx}'):
                        st.session_state.pivot_configs.pop(idx)
                        st.rerun()


def page_data_cleaning():
    """数据清洗页面"""
    st.title('🧹 数据清洗')
    st.markdown('---')

    if st.session_state.df is None:
        st.warning('请先上传数据')
        return

    df = st.session_state.df
    original_df = st.session_state.original_df

    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        '📊 数据概览', '🔧 缺失值处理', '⚠️ 异常值检测',
        '🔄 类型转换', '⚙️ 清洗流水线'
    ])

    with tab1:
        st.markdown('### 📊 数据质量概览')

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric('📊 总行数', f'{len(df):,}')
        with col2:
            total_missing = df.isna().sum().sum()
            st.metric('⚠️ 缺失值', f'{total_missing:,}')
        with col3:
            st.metric('📋 总列数', len(df.columns))
        with col4:
            memory_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)
            st.metric('💾 内存占用', f'{memory_mb:.2f} MB')

        missing_summary = get_missing_value_summary(df)
        if not missing_summary.empty:
            st.markdown('#### ⚠️ 缺失值汇总')
            st.dataframe(missing_summary, use_container_width=True)

        st.markdown('#### 📋 数据预览')
        st.dataframe(df.head(20), use_container_width=True)

        if st.button('🔄 重置为原始数据', type='secondary', use_container_width=True):
            st.session_state.df = original_df.copy()
            st.session_state.clean_steps = []
            st.success('数据已重置')
            st.rerun()

    with tab2:
        st.markdown('### 🔧 缺失值处理')

        missing_cols = df.columns[df.isna().any()].tolist()

        if not missing_cols:
            st.success('🎉 数据中没有缺失值！')
        else:
            col1, col2 = st.columns([1, 1])

            with col1:
                selected_col = st.selectbox(
                    '选择要处理的列',
                    options=missing_cols
                )

                if selected_col:
                    missing_count = df[selected_col].isna().sum()
                    missing_pct = missing_count / len(df) * 100
                    st.info(f"**{selected_col}** 有 **{missing_count:,}** 个缺失值 ({missing_pct:.2f}%)")

                    strategies = get_missing_value_strategies()
                    strategy = st.selectbox(
                        '处理策略',
                        options=[s['value'] for s in strategies],
                        format_func=lambda x: next((s['label'] for s in strategies if s['value'] == x), x)
                    )

                    fill_value = None
                    if strategy == 'custom':
                        if pd.api.types.is_numeric_dtype(df[selected_col]):
                            fill_value = st.number_input('自定义填充值', value=0.0)
                        else:
                            fill_value = st.text_input('自定义填充值', value='未知')

                    if st.button('✅ 应用处理', type='primary', use_container_width=True):
                        result_df, step, report = handle_missing_values_single(
                            df, selected_col, strategy, fill_value
                        )

                        if 'error' in report:
                            st.error(report['error'])
                        else:
                            st.session_state.df = result_df
                            st.session_state.clean_steps.append(step)
                            st.success(f"✅ {report['action']}")
                            st.rerun()

            with col2:
                st.markdown('#### 📋 批量处理')

                if st.button('🗑️ 删除所有含缺失值的行', use_container_width=True):
                    result_df = df.dropna()
                    removed = len(df) - len(result_df)
                    st.session_state.df = result_df
                    step = CleanStep(
                        step_type='handle_missing',
                        parameters={'strategy': 'drop_all_rows'},
                        description=f'删除所有含缺失值的行，共删除 {removed} 行'
                    )
                    st.session_state.clean_steps.append(step)
                    st.success(f'已删除 {removed} 行含缺失值的数据')
                    st.rerun()

    with tab3:
        st.markdown('### ⚠️ 异常值检测')

        numeric_cols = st.session_state.column_types.get('numeric', [])

        if not numeric_cols:
            st.info('数据中没有数值列')
        else:
            col1, col2 = st.columns([1, 1])

            with col1:
                selected_col = st.selectbox(
                    '选择要检测的列',
                    options=numeric_cols
                )

                method = st.selectbox(
                    '检测方法',
                    options=['iqr', 'zscore'],
                    format_func=lambda x: 'IQR方法' if x == 'iqr' else 'Z-score方法'
                )

                threshold = st.slider(
                    '检测阈值',
                    min_value=1.0,
                    max_value=5.0,
                    value=1.5 if method == 'iqr' else 3.0,
                    step=0.1
                )

                action = st.selectbox(
                    '处理方式',
                    options=['mark', 'remove', 'cap'],
                    format_func=lambda x: {
                        'mark': '仅标记',
                        'remove': '删除异常值行',
                        'cap': '盖帽法（替换为边界值）'
                    }[x]
                )

                if st.button('🔍 检测并处理', type='primary', use_container_width=True):
                    result_df, step, report = detect_outliers_single(
                        df, selected_col, method, threshold, action
                    )

                    if 'error' in report:
                        st.error(report['error'])
                    else:
                        st.session_state.df = result_df
                        st.session_state.clean_steps.append(step)
                        st.success(f"✅ {report['action']}")
                        if 'outlier_count' in report:
                            st.info(f"检测到 {report['outlier_count']} 个异常值 ({report['outlier_percentage']:.2f}%)")
                        st.rerun()

            with col2:
                st.markdown('#### 📊 异常值统计')

                if selected_col:
                    try:
                        result_df, step, report = detect_outliers_single(
                            df, selected_col, method, threshold, 'mark'
                        )

                        if 'outlier_count' in report:
                            col_a, col_b = st.columns(2)
                            with col_a:
                                st.metric('异常值数量', report['outlier_count'])
                            with col_b:
                                st.metric('异常值比例', f"{report['outlier_percentage']:.2f}%")

                            if 'bounds' in report:
                                bounds = report['bounds']
                                st.write(f"**下界**: {bounds.get('lower', 0):.4f}")
                                st.write(f"**上界**: {bounds.get('upper', 0):.4f}")

                            fig = px.box(
                                y=df[selected_col].dropna(),
                                title=f'{selected_col} - 箱线图'
                            )
                            st.plotly_chart(fig, use_container_width=True, height=300)

                    except Exception as e:
                        st.error(str(e))

                st.markdown('---')

                if st.button('🗑️ 删除重复行', use_container_width=True):
                    result_df, step, report = remove_duplicates(df)
                    st.session_state.df = result_df
                    st.session_state.clean_steps.append(step)
                    st.success(f"✅ 已删除 {report['removed_count']} 行重复数据")
                    st.rerun()

    with tab4:
        st.markdown('### 🔄 列类型转换')

        col1, col2 = st.columns([1, 1])

        with col1:
            selected_col = st.selectbox(
                '选择要转换的列',
                options=df.columns.tolist()
            )

            if selected_col:
                current_type = str(df[selected_col].dtype)
                st.info(f"当前类型: **{current_type}**")

                type_options = get_column_type_options()
                target_type = st.selectbox(
                    '目标类型',
                    options=[t['value'] for t in type_options],
                    format_func=lambda x: next((t['label'] for t in type_options if t['value'] == x), x)
                )

                datetime_format = None
                if target_type == 'datetime':
                    datetime_format = st.text_input(
                        '日期格式 (可选)',
                        placeholder='如: %Y-%m-%d, %Y/%m/%d %H:%M:%S'
                    )

                if st.button('🔄 转换类型', type='primary', use_container_width=True):
                    result_df, step, report = convert_column_type(
                        df, selected_col, target_type, datetime_format
                    )

                    if 'error' in report:
                        st.error(report['error'])
                    else:
                        st.session_state.df = result_df
                        st.session_state.clean_steps.append(step)
                        st.session_state.column_types = classify_columns(result_df)
                        st.success(f"✅ {report['action']}")
                        st.rerun()

        with col2:
            st.markdown('#### 📋 列类型概览')
            type_data = []
            for col in df.columns:
                col_type = detect_column_type(df[col], col)
                type_data.append({
                    '列名': col,
                    '当前类型': str(df[col].dtype),
                    '检测类型': get_type_label(col_type),
                    '示例值': str(df[col].iloc[0]) if len(df) > 0 else ''
                })
            st.dataframe(pd.DataFrame(type_data), use_container_width=True)

    with tab5:
        st.markdown('### ⚙️ 清洗流水线')

        pipeline_manager = PipelineManager(pipelines_dir='pipelines')

        col1, col2 = st.columns([1, 1])

        with col1:
            st.markdown('#### 📝 已执行的清洗步骤')

            if st.session_state.clean_steps:
                for idx, step in enumerate(st.session_state.clean_steps):
                    with st.expander(f"步骤 {idx + 1}: {step.description}", expanded=False):
                        st.write(f"**类型**: {step.step_type}")
                        st.json(step.parameters)

                col_a, col_b = st.columns(2)
                with col_a:
                    pipeline_name = st.text_input('流水线名称', value='我的清洗流水线')
                with col_b:
                    pipeline_desc = st.text_input('描述', value='自定义数据清洗流程')

                if st.button('💾 保存为流水线', type='primary', use_container_width=True):
                    pipeline = pipeline_manager.create_pipeline(
                        name=pipeline_name,
                        description=pipeline_desc,
                        steps=st.session_state.clean_steps
                    )
                    file_path = pipeline_manager.save_pipeline(pipeline)
                    st.success(f'✅ 流水线已保存到: {file_path}')

                if st.button('📤 导出为Python脚本', use_container_width=True):
                    pipeline = pipeline_manager.create_pipeline(
                        name=pipeline_name,
                        description=pipeline_desc,
                        steps=st.session_state.clean_steps
                    )
                    script_path = os.path.join('pipelines', f'{pipeline.pipeline_id}_script.py')
                    saved_path = pipeline_manager.export_pipeline_to_script(pipeline, script_path)
                    st.success(f'✅ 脚本已导出到: {saved_path}')

            else:
                st.info('还没有执行任何清洗步骤')

        with col2:
            st.markdown('#### 📂 已保存的流水线')

            pipelines = pipeline_manager.list_pipelines()

            if pipelines:
                for p in pipelines:
                    with st.expander(f"📋 {p['name']}", expanded=False):
                        st.write(f"**描述**: {p['description']}")
                        st.write(f"**步骤数**: {p['step_count']}")
                        st.write(f"**更新时间**: {p['updated_at']}")

                        col_a, col_b, col_c = st.columns(3)
                        with col_a:
                            if st.button('▶️ 应用', key=f'apply_{p["pipeline_id"]}'):
                                pipeline = pipeline_manager.load_template(p['pipeline_id'])
                                if pipeline:
                                    result_df, reports = pipeline_manager.execute_pipeline(
                                        original_df, pipeline
                                    )
                                    st.session_state.df = result_df
                                    st.success(f'✅ 流水线已应用，共执行 {len(reports)} 个步骤')
                                    st.rerun()
                        with col_b:
                            if st.button('📤 导出脚本', key=f'export_{p["pipeline_id"]}'):
                                pipeline = pipeline_manager.load_template(p['pipeline_id'])
                                if pipeline:
                                    script_path = os.path.join('pipelines', f'{p["pipeline_id"]}_script.py')
                                    saved_path = pipeline_manager.export_pipeline_to_script(pipeline, script_path)
                                    st.success(f'✅ 脚本已导出到: {saved_path}')
                        with col_c:
                            if st.button('🗑️ 删除', key=f'delete_{p["pipeline_id"]}'):
                                pipeline_manager.delete_pipeline(p['pipeline_id'])
                                st.success('✅ 流水线已删除')
                                st.rerun()
            else:
                st.info('还没有保存的流水线')


def page_report():
    """数据报告页面"""
    st.title('📑 数据总结报告')
    st.markdown('---')

    if st.session_state.df is None:
        st.warning('请先上传数据')
        return

    df = st.session_state.df

    col1, col2 = st.columns([3, 1])

    with col1:
        report_title = st.text_input('报告标题', value='数据总结报告')

    with col2:
        st.markdown('<br>', unsafe_allow_html=True)
        generate_btn = st.button('🔄 生成报告', type='primary', use_container_width=True)

    if generate_btn or 'report_html' not in st.session_state:
        with st.spinner('正在生成报告...'):
            try:
                report_html = generate_full_report(df, report_title)
                st.session_state.report_html = report_html
                st.success('✅ 报告生成成功！')
            except Exception as e:
                st.error(f'报告生成失败: {str(e)}')
                return

    if 'report_html' in st.session_state:
        tab1, tab2 = st.tabs(['👁️ 预览报告', '📥 导出报告'])

        with tab1:
            st.components.v1.html(st.session_state.report_html, height=800, scrolling=True)

        with tab2:
            col1, col2 = st.columns(2)

            with col1:
                st.markdown('#### 📄 导出为HTML')
                html_bytes = st.session_state.report_html.encode('utf-8')
                st.download_button(
                    label='📥 下载HTML报告',
                    data=html_bytes,
                    file_name=f'{report_title}.html',
                    mime='text/html',
                    use_container_width=True
                )

            with col2:
                st.markdown('#### 📕 导出为PDF')

                if st.button('📥 生成并下载PDF', use_container_width=True):
                    with st.spinner('正在生成PDF...'):
                        pdf_path = os.path.join('templates', f'{report_title}.pdf')
                        result = export_report_to_pdf(st.session_state.report_html, pdf_path)

                        if result['success']:
                            with open(result['file_path'], 'rb') as f:
                                pdf_bytes = f.read()
                            st.download_button(
                                label='📥 下载PDF报告',
                                data=pdf_bytes,
                                file_name=f'{report_title}.pdf',
                                mime='application/pdf',
                                use_container_width=True
                            )
                            st.success('✅ PDF生成成功！')
                        else:
                            st.warning(result['message'])
                            if result['fallback']:
                                with open(result['file_path'], 'rb') as f:
                                    html_bytes = f.read()
                                st.download_button(
                                    label='📥 下载HTML报告 (备选)',
                                    data=html_bytes,
                                    file_name=f'{report_title}.html',
                                    mime='text/html',
                                    use_container_width=True
                                )


def page_prediction():
    """预测分析页面"""
    st.title('🔮 预测分析')
    st.markdown('---')

    if st.session_state.df is None:
        st.warning('请先上传数据')
        return

    df = st.session_state.df
    datetime_cols = st.session_state.column_types.get('datetime', [])
    numeric_cols = st.session_state.column_types.get('numeric', [])

    if not datetime_cols:
        st.error('数据中没有检测到日期时间列，无法进行时间序列预测')
        return

    if not numeric_cols:
        st.error('数据中没有数值列，无法进行预测')
        return

    col1, col2 = st.columns([1, 2])

    with col1:
        st.markdown('### 🎛️ 预测配置')

        time_column = st.selectbox(
            '📅 时间列',
            options=datetime_cols
        )

        value_column = st.selectbox(
            '📈 要预测的数值列',
            options=numeric_cols
        )

        model_type = st.selectbox(
            '🤖 预测模型',
            options=['auto', 'arima', 'linear'],
            format_func=lambda x: {
                'auto': '自动选择',
                'arima': 'ARIMA模型',
                'linear': '线性回归'
            }[x]
        )

        forecast_periods = st.slider(
            '📅 预测期数',
            min_value=7,
            max_value=365,
            value=30,
            step=1
        )

        confidence_level = st.slider(
            '📊 置信水平',
            min_value=0.80,
            max_value=0.99,
            value=0.95,
            step=0.01,
            format='%.0f%%'
        )

        if st.button('🔮 开始预测', type='primary', use_container_width=True):
            with st.spinner('正在训练模型...'):
                try:
                    result = predict(
                        df,
                        time_column=time_column,
                        value_column=value_column,
                        model_type=model_type,
                        forecast_periods=forecast_periods,
                        confidence_level=confidence_level
                    )
                    st.session_state.prediction_result = result
                    st.success(f'✅ 预测完成！使用模型: {result.model_type.upper()}')
                except Exception as e:
                    st.error(f'预测失败: {str(e)}')

    with col2:
        if 'prediction_result' not in st.session_state:
            st.info('👈 请在左侧配置预测参数，点击"开始预测"查看结果')
        else:
            result = st.session_state.prediction_result

            summary = get_prediction_summary(result)

            col_a, col_b, col_c, col_d = st.columns(4)
            with col_a:
                st.metric('🤖 模型类型', summary['model_type'])
            with col_b:
                st.metric('📊 模型质量', summary['model_quality'])
            with col_c:
                st.metric('📈 预测趋势', summary['trend'])
            with col_d:
                st.metric('💯 R²', f"{result.metrics.get('r2', 0):.4f}")

            st.markdown('### 📈 预测结果')
            fig = plot_prediction(result, title=f'{value_column} - {summary["model_type"]}预测')
            st.plotly_chart(fig, use_container_width=True, height=500)

            components = plot_prediction_components(result)
            if components:
                st.markdown('### 📊 模型分析')
                tab1, tab2, tab3 = st.tabs(['📉 残差分析', '📊 残差分布', '📋 评估指标'])

                with tab1:
                    if 'residual' in components:
                        st.plotly_chart(components['residual'], use_container_width=True, height=350)
                with tab2:
                    if 'residual_hist' in components:
                        st.plotly_chart(components['residual_hist'], use_container_width=True, height=350)
                with tab3:
                    if 'metrics' in components:
                        st.plotly_chart(components['metrics'], use_container_width=True, height=350)

            st.markdown('### 📋 评估指标')
            metrics_df = format_metrics_table(result)
            st.dataframe(metrics_df, use_container_width=True, hide_index=True)

            st.markdown('### 📅 预测数据')
            forecast_df = result.forecast_data.copy()
            forecast_df.columns = ['日期', '预测值', '置信下限', '置信上限']
            st.dataframe(forecast_df, use_container_width=True, height=300)

            csv = forecast_df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label='📥 下载预测结果',
                data=csv,
                file_name='prediction_result.csv',
                mime='text/csv',
                use_container_width=True
            )


def page_templates():
    """模板管理页面"""
    st.title('📑 模板管理')
    st.markdown('---')

    template_manager = TemplateManager(templates_dir='saved_templates')

    tab1, tab2 = st.tabs(['💾 保存模板', '📂 加载模板'])

    with tab1:
        st.markdown('### 💾 保存当前配置为模板')

        col1, col2 = st.columns([1, 1])

        with col1:
            template_name = st.text_input('模板名称', value='我的仪表板模板')
            template_desc = st.text_area('模板描述', value='自定义图表和透视表配置')

            st.markdown('#### 📊 选择要保存的图表')
            selected_charts = []
            for idx, config in enumerate(st.session_state.chart_configs):
                if st.checkbox(f"📈 {config.title}", key=f'save_chart_{idx}', value=True):
                    selected_charts.append(config)

            st.markdown('#### 🔄 选择要保存的透视表')
            selected_pivots = []
            for idx, config in enumerate(st.session_state.pivot_configs):
                if st.checkbox(f"🔄 透视表 {idx + 1}", key=f'save_pivot_{idx}', value=True):
                    selected_pivots.append(config)

            if st.button('💾 保存模板', type='primary', use_container_width=True):
                if not selected_charts and not selected_pivots:
                    st.error('请至少选择一个图表或透视表')
                else:
                    template = template_manager.create_template(
                        name=template_name,
                        description=template_desc,
                        chart_configs=selected_charts,
                        pivot_configs=selected_pivots
                    )
                    file_path = template_manager.save_template(template)
                    st.success(f'✅ 模板已保存到: {file_path}')

        with col2:
            st.markdown('#### 📋 当前配置概览')
            st.write(f"**已保存图表**: {len(st.session_state.chart_configs)} 个")
            st.write(f"**已保存透视表**: {len(st.session_state.pivot_configs)} 个")

            if st.session_state.chart_configs:
                st.markdown('##### 📊 图表列表')
                for idx, config in enumerate(st.session_state.chart_configs):
                    st.write(f"{idx + 1}. {config.title} ({get_chart_info()[config.chart_type]['name_cn']})")

            if st.session_state.pivot_configs:
                st.markdown('##### 🔄 透视表列表')
                for idx, config in enumerate(st.session_state.pivot_configs):
                    st.write(f"{idx + 1}. 行: {', '.join(config.rows)} | 值: {len(config.values)} 个字段")

    with tab2:
        st.markdown('### 📂 已保存的模板')

        templates = template_manager.list_templates()

        if not templates:
            st.info('还没有保存的模板')
        else:
            for t in templates:
                with st.expander(f"📑 {t['name']}", expanded=False):
                    st.write(f"**描述**: {t['description']}")
                    st.write(f"**图表数**: {t['chart_count']}")
                    st.write(f"**透视表数**: {t['pivot_count']}")
                    st.write(f"**更新时间**: {t['updated_at']}")

                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        if st.button('📂 应用模板', key=f'apply_template_{t["template_id"]}'):
                            if st.session_state.df is None:
                                st.error('请先上传数据')
                            else:
                                template = template_manager.load_template(t['template_id'])
                                if template:
                                    apply_result = template_manager.apply_template(template, st.session_state.df)

                                    if apply_result['success']:
                                        st.session_state.chart_configs = apply_result['chart_configs']
                                        st.session_state.pivot_configs = apply_result['pivot_configs']
                                        if apply_result['warnings']:
                                            for warning in apply_result['warnings']:
                                                st.warning(warning)
                                        st.success(f'✅ 模板已应用！加载了 {len(apply_result["chart_configs"])} 个图表和 {len(apply_result["pivot_configs"])} 个透视表')
                                    else:
                                        for error in apply_result['errors']:
                                            st.error(error)
                    with col_b:
                        if st.button('📤 导出JSON', key=f'export_template_{t["template_id"]}'):
                            template = template_manager.load_template(t['template_id'])
                            if template:
                                export_path = os.path.join('saved_templates', f'{t["template_id"]}_export.json')
                                saved_path = template_manager.export_template_to_json(template, export_path)
                                st.success(f'✅ 模板已导出到: {saved_path}')
                    with col_c:
                        if st.button('🗑️ 删除', key=f'delete_template_{t["template_id"]}'):
                            template_manager.delete_template(t['template_id'])
                            st.success('✅ 模板已删除')
                            st.rerun()

            st.markdown('---')
            st.markdown('#### 📥 导入模板')
            uploaded_template = st.file_uploader('选择模板JSON文件', type=['json'])
            if uploaded_template is not None:
                try:
                    import tempfile
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as tmp:
                        tmp.write(uploaded_template.read())
                        tmp_path = tmp.name

                    template = template_manager.import_template_from_json(tmp_path)
                    if template:
                        template_manager.save_template(template)
                        os.unlink(tmp_path)
                        st.success(f'✅ 模板 "{template.name}" 已导入')
                        st.rerun()
                    else:
                        st.error('模板文件格式错误')
                except Exception as e:
                    st.error(f'导入失败: {str(e)}')


def main():
    """主函数"""
    init_session_state()

    with st.sidebar:
        st.title('📊 数据可视化仪表板')
        st.markdown('---')

        pages = [
            '📁 数据上传',
            '📈 图表构建',
            '🔄 数据透视表',
            '🧹 数据清洗',
            '📑 数据报告',
            '🔮 预测分析',
            '📑 模板管理'
        ]

        selected_page = st.radio(
            '选择功能',
            options=pages,
            index=pages.index(f'📁 {st.session_state.current_page}') if f'📁 {st.session_state.current_page}' in pages else 0
        )

        st.session_state.current_page = selected_page.replace('📁 ', '').replace('📈 ', '').replace('🔄 ', '').replace('🧹 ', '').replace('📑 ', '').replace('🔮 ', '')

        st.markdown('---')

        if st.session_state.df is not None:
            st.info(f"📊 当前数据: {len(st.session_state.df):,} 行 × {len(st.session_state.df.columns)} 列")

            if st.button('🔄 重置所有状态', type='secondary', use_container_width=True):
                for key in list(st.session_state.keys()):
                    del st.session_state[key]
                st.rerun()
        else:
            st.warning('⚠️ 请先上传数据')

        st.markdown('---')
        st.caption('💡 提示: 点击图表数据点可联动筛选其他图表')

    page_name = st.session_state.current_page

    if page_name == '数据上传':
        page_data_upload()
    elif page_name == '图表构建':
        page_chart_builder()
    elif page_name == '数据透视表':
        page_pivot_table()
    elif page_name == '数据清洗':
        page_data_cleaning()
    elif page_name == '数据报告':
        page_report()
    elif page_name == '预测分析':
        page_prediction()
    elif page_name == '模板管理':
        page_templates()


if __name__ == '__main__':
    main()
