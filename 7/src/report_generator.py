"""
数据可视化仪表板 - 数据总结报告模块
生成包含每列统计信息、缺失值比例、偏度峰度和分布直方图的报告
"""

import io
import base64
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from jinja2 import Template

from .type_detector import detect_column_type, get_type_color, get_type_icon

PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'

REPORT_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ report_title }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            background: #f5f7fa;
            color: #333333;
            line-height: 1.6;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 0 50px rgba(30, 58, 95, 0.1);
        }
        
        .cover-page {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 50%, #1e3a5f 100%);
            color: #ffffff;
            padding: 80px 60px;
            position: relative;
            overflow: hidden;
        }
        
        .cover-page::before {
            content: '';
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%);
            top: -100px;
            right: -100px;
            border-radius: 50%;
        }
        
        .cover-content {
            position: relative;
            z-index: 1;
        }
        
        .cover-title {
            font-size: 42px;
            font-weight: 700;
            margin-bottom: 15px;
            letter-spacing: 1px;
        }
        
        .cover-subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 40px;
            font-weight: 300;
        }
        
        .cover-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
        }
        
        .cover-meta-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
        }
        
        .cover-meta-label {
            font-size: 13px;
            opacity: 0.7;
            margin-bottom: 5px;
        }
        
        .cover-meta-value {
            font-size: 24px;
            font-weight: 700;
            color: #f97316;
        }
        
        .section {
            padding: 50px 60px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 28px;
            color: #1e3a5f;
            font-weight: 700;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 3px solid #f97316;
            display: inline-block;
        }
        
        .overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .overview-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 24px;
            position: relative;
            overflow: hidden;
        }
        
        .overview-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #1e3a5f 0%, #f97316 100%);
        }
        
        .overview-card-label {
            font-size: 14px;
            color: #666666;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .overview-card-value {
            font-size: 28px;
            font-weight: 700;
            color: #1e3a5f;
        }
        
        .overview-card-value.accent {
            color: #f97316;
        }
        
        .missing-summary {
            background: #fff7ed;
            border: 1px solid #fed7aa;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
        }
        
        .missing-title {
            font-size: 18px;
            font-weight: 600;
            color: #c2410c;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .missing-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        
        .missing-table th {
            background: #f97316;
            color: #ffffff;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        .missing-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #fed7aa;
        }
        
        .missing-table tbody tr:hover {
            background: #ffedd5;
        }
        
        .progress-bar {
            height: 8px;
            background: #fed7aa;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
            border-radius: 4px;
            transition: width 0.3s;
        }
        
        .column-section {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .column-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f3f4f6;
        }
        
        .column-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #ffffff;
        }
        
        .column-name {
            font-size: 22px;
            font-weight: 700;
            color: #1e3a5f;
        }
        
        .column-type-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            background: #f9fafb;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #1e3a5f;
        }
        
        .stat-value.highlight {
            color: #f97316;
        }
        
        .distribution-chart {
            margin-top: 20px;
        }
        
        .skewness-info {
            display: flex;
            gap: 20px;
            margin-top: 15px;
            padding: 15px;
            background: #f0f9ff;
            border-radius: 10px;
            border-left: 4px solid #0ea5e9;
        }
        
        .skewness-item {
            flex: 1;
        }
        
        .skewness-label {
            font-size: 12px;
            color: #0369a1;
            margin-bottom: 3px;
            font-weight: 600;
        }
        
        .skewness-value {
            font-size: 16px;
            font-weight: 700;
            color: #0c4a6e;
        }
        
        .footer {
            background: #1e3a5f;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            padding: 25px;
            font-size: 13px;
        }
        
        @media print {
            .section {
                page-break-inside: avoid;
            }
            .cover-page {
                page-break-after: always;
            }
        }
        
        @media (max-width: 768px) {
            .section {
                padding: 30px 20px;
            }
            .cover-page {
                padding: 50px 30px;
            }
            .cover-title {
                font-size: 32px;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- 封面 -->
        <div class="cover-page">
            <div class="cover-content">
                <h1 class="cover-title">{{ report_title }}</h1>
                <p class="cover-subtitle">Data Quality & Statistics Report</p>
                <div class="cover-meta">
                    <div class="cover-meta-card">
                        <div class="cover-meta-label">数据行数</div>
                        <div class="cover-meta-value">{{ "{:,}".format(overview.row_count) }}</div>
                    </div>
                    <div class="cover-meta-card">
                        <div class="cover-meta-label">数据列数</div>
                        <div class="cover-meta-value">{{ overview.column_count }}</div>
                    </div>
                    <div class="cover-meta-card">
                        <div class="cover-meta-label">总缺失值</div>
                        <div class="cover-meta-value">{{ "{:,}".format(overview.total_missing) }}</div>
                    </div>
                    <div class="cover-meta-card">
                        <div class="cover-meta-label">生成时间</div>
                        <div class="cover-meta-value" style="font-size: 14px;">{{ generate_time }}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 数据概览 -->
        <div class="section">
            <h2 class="section-title">📊 数据概览</h2>
            
            <div class="overview-grid">
                <div class="overview-card">
                    <div class="overview-card-label">总数据量</div>
                    <div class="overview-card-value">{{ "{:,}".format(overview.total_cells) }}</div>
                </div>
                <div class="overview-card">
                    <div class="overview-card-label">内存占用</div>
                    <div class="overview-card-value">{{ "%.2f"|format(overview.memory_mb) }} MB</div>
                </div>
                <div class="overview-card">
                    <div class="overview-card-label">缺失值比例</div>
                    <div class="overview-card-value accent">{{ "%.2f"|format(overview.missing_percentage) }}%</div>
                </div>
                <div class="overview-card">
                    <div class="overview-card-label">数值列数</div>
                    <div class="overview-card-value">{{ overview.numeric_count }}</div>
                </div>
                <div class="overview-card">
                    <div class="overview-card-label">分类列数</div>
                    <div class="overview-card-value">{{ overview.categorical_count }}</div>
                </div>
                <div class="overview-card">
                    <div class="overview-card-label">日期列数</div>
                    <div class="overview-card-value">{{ overview.datetime_count }}</div>
                </div>
            </div>
            
            {% if missing_summary is not none and not missing_summary.empty %}
            <div class="missing-summary">
                <div class="missing-title">⚠️ 缺失值汇总</div>
                <table class="missing-table">
                    <thead>
                        <tr>
                            <th>列名</th>
                            <th>缺失数量</th>
                            <th>缺失比例</th>
                            <th>缺失程度</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for _, row in missing_summary.iterrows() %}
                        <tr>
                            <td><strong>{{ row['列名'] }}</strong></td>
                            <td>{{ "{:,}".format(row['缺失值数量']) }}</td>
                            <td>{{ "%.2f"|format(row['缺失值比例']) }}%</td>
                            <td>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: {{ row['缺失值比例'] }}%"></div>
                                </div>
                            </td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
            </div>
            {% endif %}
        </div>
        
        <!-- 逐列分析 -->
        <div class="section">
            <h2 class="section-title">📋 逐列详细分析</h2>
            
            {% for column_report in column_reports %}
            <div class="column-section">
                <div class="column-header">
                    <div class="column-icon" style="background: {{ column_report.type_color }};">
                        {{ column_report.type_icon }}
                    </div>
                    <div style="flex: 1;">
                        <div class="column-name">{{ column_report.name }}</div>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <span class="column-type-badge" style="background: {{ column_report.type_color }};">
                                {{ column_report.type_label }}
                            </span>
                            <span style="font-size: 13px; color: #6b7280;">
                                数据类型: {{ column_report.dtype }}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">非空值</div>
                        <div class="stat-value">{{ "{:,}".format(column_report.non_null) }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">缺失值</div>
                        <div class="stat-value highlight">{{ "{:,}".format(column_report.null_count) }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">缺失率</div>
                        <div class="stat-value highlight">{{ "%.2f"|format(column_report.null_percentage) }}%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">唯一值</div>
                        <div class="stat-value">{{ "{:,}".format(column_report.unique_count) }}</div>
                    </div>
                    {% if column_report.type == 'numeric' %}
                    <div class="stat-item">
                        <div class="stat-label">均值</div>
                        <div class="stat-value">{{ "%.4f"|format(column_report.mean) }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">标准差</div>
                        <div class="stat-value">{{ "%.4f"|format(column_report.std) }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">最小值</div>
                        <div class="stat-value">{{ "%.4f"|format(column_report.min_val) }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">最大值</div>
                        <div class="stat-value">{{ "%.4f"|format(column_report.max_val) }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">中位数</div>
                        <div class="stat-value">{{ "%.4f"|format(column_report.median) }}</div>
                    </div>
                    {% endif %}
                    {% if column_report.type == 'categorical' %}
                    <div class="stat-item">
                        <div class="stat-label">众数</div>
                        <div class="stat-value">{{ column_report.mode_value }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">众数频次</div>
                        <div class="stat-value">{{ "{:,}".format(column_report.mode_freq) }}</div>
                    </div>
                    {% endif %}
                </div>
                
                {% if column_report.type == 'numeric' %}
                <div class="skewness-info">
                    <div class="skewness-item">
                        <div class="skewness-label">偏度 (Skewness)</div>
                        <div class="skewness-value">{{ "%.4f"|format(column_report.skewness) }}
                            <span style="font-size: 12px; font-weight: 400;">
                                ({{ column_report.skewness_desc }})
                            </span>
                        </div>
                    </div>
                    <div class="skewness-item">
                        <div class="skewness-label">峰度 (Kurtosis)</div>
                        <div class="skewness-value">{{ "%.4f"|format(column_report.kurtosis) }}
                            <span style="font-size: 12px; font-weight: 400;">
                                ({{ column_report.kurtosis_desc }})
                            </span>
                        </div>
                    </div>
                </div>
                {% endif %}
                
                {% if column_report.histogram_html %}
                <div class="distribution-chart">
                    {{ column_report.histogram_html | safe }}
                </div>
                {% endif %}
            </div>
            {% endfor %}
        </div>
        
        <!-- 页脚 -->
        <div class="footer">
            <p>本报告由数据可视化仪表板自动生成 | 生成时间: {{ generate_time }}</p>
            <p>© 2024 Data Visualization Dashboard. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def generate_column_report(
    df: pd.DataFrame,
    column: str,
    generate_histogram: bool = True
) -> Dict[str, Any]:
    """
    生成单列的详细分析报告

    Parameters
    ----------
    df : pd.DataFrame
        输入数据
    column : str
        列名
    generate_histogram : bool
        是否生成分布直方图

    Returns
    -------
    Dict[str, Any]
        列分析报告字典
    """
    series = df[column]
    col_type = detect_column_type(series, column)

    report = {
        'name': column,
        'type': col_type,
        'type_label': _get_type_label(col_type),
        'type_color': get_type_color(col_type),
        'type_icon': get_type_icon(col_type),
        'dtype': str(series.dtype),
        'non_null': int(series.notna().sum()),
        'null_count': int(series.isna().sum()),
        'null_percentage': round(float(series.isna().sum() / len(df) * 100), 4),
        'unique_count': int(series.nunique(dropna=True)),
        'histogram_html': ''
    }

    clean_series = series.dropna()

    if col_type == 'numeric' and len(clean_series) > 0:
        report['mean'] = float(clean_series.mean())
        report['std'] = float(clean_series.std()) if len(clean_series) > 1 else 0.0
        report['min_val'] = float(clean_series.min())
        report['max_val'] = float(clean_series.max())
        report['median'] = float(clean_series.median())

        skewness = float(clean_series.skew()) if len(clean_series) > 2 else 0.0
        kurtosis = float(clean_series.kurtosis()) if len(clean_series) > 3 else 0.0

        report['skewness'] = skewness
        report['kurtosis'] = kurtosis
        report['skewness_desc'] = _describe_skewness(skewness)
        report['kurtosis_desc'] = _describe_kurtosis(kurtosis)

        if generate_histogram:
            report['histogram_html'] = _generate_histogram_html(clean_series, column)

    elif col_type == 'categorical' and len(clean_series) > 0:
        value_counts = clean_series.value_counts()
        if len(value_counts) > 0:
            report['mode_value'] = str(value_counts.index[0])
            report['mode_freq'] = int(value_counts.iloc[0])
        else:
            report['mode_value'] = '-'
            report['mode_freq'] = 0

        if generate_histogram and len(value_counts) <= 20:
            report['histogram_html'] = _generate_bar_chart_html(value_counts, column)

    elif col_type == 'datetime' and len(clean_series) > 0:
        if generate_histogram:
            report['histogram_html'] = _generate_datetime_histogram_html(clean_series, column)

    return report


def generate_data_overview(df: pd.DataFrame) -> Dict[str, Any]:
    """
    生成数据概览信息

    Parameters
    ----------
    df : pd.DataFrame
        输入数据

    Returns
    -------
    Dict[str, Any]
        数据概览字典
    """
    from .type_detector import classify_columns

    column_types = classify_columns(df)
    numeric_count = len(column_types.get('numeric', []))
    categorical_count = len(column_types.get('categorical', []))
    datetime_count = len(column_types.get('datetime', []))

    total_missing = int(df.isna().sum().sum())
    total_cells = len(df) * len(df.columns)

    overview = {
        'row_count': len(df),
        'column_count': len(df.columns),
        'total_cells': total_cells,
        'total_missing': total_missing,
        'missing_percentage': round(total_missing / total_cells * 100, 4) if total_cells > 0 else 0.0,
        'numeric_count': numeric_count,
        'categorical_count': categorical_count,
        'datetime_count': datetime_count,
        'memory_mb': round(float(df.memory_usage(deep=True).sum() / (1024 * 1024)), 4)
    }

    return overview


def generate_full_report(
    df: pd.DataFrame,
    report_title: str = '数据总结报告'
) -> str:
    """
    生成完整的数据总结报告HTML

    Parameters
    ----------
    df : pd.DataFrame
        输入数据
    report_title : str
        报告标题

    Returns
    -------
    str
        完整的HTML报告内容
    """
    overview = generate_data_overview(df)

    from .data_cleaner import get_missing_value_summary
    missing_summary = get_missing_value_summary(df)

    column_reports = []
    for column in df.columns:
        column_report = generate_column_report(df, column, generate_histogram=True)
        column_reports.append(column_report)

    generate_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    template = Template(REPORT_HTML_TEMPLATE)
    html_content = template.render(
        report_title=report_title,
        generate_time=generate_time,
        overview=overview,
        missing_summary=missing_summary,
        column_reports=column_reports
    )

    return html_content


def export_report_to_pdf(
    html_content: str,
    output_path: str = 'data_summary_report.pdf'
) -> Dict[str, Any]:
    """
    导出报告为PDF

    Parameters
    ----------
    html_content : str
        HTML报告内容
    output_path : str
        输出PDF文件路径

    Returns
    -------
    Dict[str, Any]
        导出结果字典
    """
    import os

    result = {
        'success': False,
        'message': '',
        'file_path': '',
        'fallback': False
    }

    try:
        from weasyprint import HTML

        output_dir = os.path.dirname(os.path.abspath(output_path))
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)

        html = HTML(string=html_content)
        html.write_pdf(output_path)

        result['success'] = True
        result['message'] = 'PDF报告导出成功'
        result['file_path'] = os.path.abspath(output_path)
        return result

    except ImportError:
        html_path = output_path.replace('.pdf', '.html')
        saved_path = _save_html_report(html_content, html_path)

        result['success'] = False
        result['fallback'] = True
        result['message'] = (
            '未检测到weasyprint库，无法导出PDF。'
            'HTML报告已保存，请先安装weasyprint后重试。'
            '安装命令: pip install weasyprint'
        )
        result['file_path'] = saved_path
        return result

    except Exception as e:
        html_path = output_path.replace('.pdf', '.html')
        saved_path = _save_html_report(html_content, html_path)

        result['success'] = False
        result['fallback'] = True
        result['message'] = f'PDF导出失败: {str(e)}。HTML报告已保存作为备选。'
        result['file_path'] = saved_path
        return result


def _save_html_report(html_content: str, output_path: str) -> str:
    """保存HTML报告到文件"""
    import os

    output_dir = os.path.dirname(os.path.abspath(output_path))
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    return os.path.abspath(output_path)


def _get_type_label(col_type: str) -> str:
    """获取数据类型的中文标签"""
    labels = {
        'numeric': '数值型',
        'categorical': '分类型',
        'datetime': '日期时间型',
        'geographic': '地理型',
        'text': '文本型',
        'boolean': '布尔型'
    }
    return labels.get(col_type, '未知类型')


def _describe_skewness(skewness: float) -> str:
    """描述偏度含义"""
    if abs(skewness) < 0.5:
        return '近似对称'
    elif skewness > 0:
        return '右偏（正偏）' if skewness < 1 else '严重右偏'
    else:
        return '左偏（负偏）' if skewness > -1 else '严重左偏'


def _describe_kurtosis(kurtosis: float) -> str:
    """描述峰度含义"""
    if abs(kurtosis) < 0.5:
        return '常峰态'
    elif kurtosis > 0:
        return '尖峰态' if kurtosis < 2 else '极度尖峰'
    else:
        return '低峰态' if kurtosis > -2 else '极度低峰'


def _generate_histogram_html(series: pd.Series, column_name: str) -> str:
    """生成数值列分布直方图的HTML"""
    try:
        fig = px.histogram(
            x=series,
            nbins=30,
            title=f'{column_name} - 分布直方图',
            color_discrete_sequence=[PRIMARY_COLOR]
        )

        fig.update_layout(
            height=300,
            margin=dict(l=10, r=10, t=40, b=10),
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            title_x=0.5,
            title_font=dict(size=14, color='#1e3a5f')
        )

        fig.update_xaxes(
            gridcolor='#e5e7eb',
            zerolinecolor='#e5e7eb'
        )
        fig.update_yaxes(
            gridcolor='#e5e7eb',
            zerolinecolor='#e5e7eb'
        )

        return fig.to_html(full_html=False, include_plotlyjs='cdn', config={'responsive': True})
    except Exception:
        return ''


def _generate_bar_chart_html(value_counts: pd.Series, column_name: str) -> str:
    """生成分类型列柱状图的HTML"""
    try:
        top_n = min(15, len(value_counts))
        data = value_counts.head(top_n)

        fig = px.bar(
            x=data.index,
            y=data.values,
            title=f'{column_name} - 类别分布 (TOP {top_n})',
            color_discrete_sequence=[ACCENT_COLOR]
        )

        fig.update_layout(
            height=300,
            margin=dict(l=10, r=10, t=40, b=10),
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            title_x=0.5,
            title_font=dict(size=14, color='#1e3a5f')
        )

        fig.update_xaxes(
            tickangle=-45,
            gridcolor='#e5e7eb',
            zerolinecolor='#e5e7eb'
        )
        fig.update_yaxes(
            gridcolor='#e5e7eb',
            zerolinecolor='#e5e7eb'
        )

        return fig.to_html(full_html=False, include_plotlyjs='cdn', config={'responsive': True})
    except Exception:
        return ''


def _generate_datetime_histogram_html(series: pd.Series, column_name: str) -> str:
    """生成日期时间列分布直方图的HTML"""
    try:
        fig = px.histogram(
            x=series,
            nbins=30,
            title=f'{column_name} - 时间分布',
            color_discrete_sequence=['#10b981']
        )

        fig.update_layout(
            height=300,
            margin=dict(l=10, r=10, t=40, b=10),
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            title_x=0.5,
            title_font=dict(size=14, color='#1e3a5f')
        )

        fig.update_xaxes(
            gridcolor='#e5e7eb',
            zerolinecolor='#e5e7eb'
        )
        fig.update_yaxes(
            gridcolor='#e5e7eb',
            zerolinecolor='#e5e7eb'
        )

        return fig.to_html(full_html=False, include_plotlyjs='cdn', config={'responsive': True})
    except Exception:
        return ''
