"""
电商数据分析平台 - 报告导出模块
提供HTML报告生成、PDF导出、Excel数据导出、Streamlit下载链接等功能
"""

import base64
import io
import os
import warnings
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import matplotlib.pyplot as plt
from jinja2 import Template

warnings.filterwarnings('ignore')

PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'
COLOR_PALETTE = [
    '#1e3a5f', '#f97316', '#3b82f6', '#10b981', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
]

HTML_TEMPLATE = """
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
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
            color: #333333;
            line-height: 1.6;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 0 50px rgba(30, 58, 95, 0.15);
        }
        
        .cover-page {
            height: 100vh;
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 50%, #1e3a5f 100%);
            color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .cover-page::before {
            content: '';
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%);
            top: -200px;
            right: -200px;
            border-radius: 50%;
        }
        
        .cover-page::after {
            content: '';
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, transparent 70%);
            bottom: -100px;
            left: -100px;
            border-radius: 50%;
        }
        
        .cover-content {
            position: relative;
            z-index: 1;
            padding: 40px;
        }
        
        .cover-logo {
            width: 80px;
            height: 80px;
            background: #f97316;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            font-size: 36px;
            box-shadow: 0 10px 30px rgba(249, 115, 22, 0.4);
        }
        
        .cover-title {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 20px;
            letter-spacing: 2px;
        }
        
        .cover-subtitle {
            font-size: 20px;
            opacity: 0.9;
            margin-bottom: 40px;
            font-weight: 300;
        }
        
        .cover-meta {
            display: flex;
            gap: 40px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .cover-meta-item {
            text-align: center;
        }
        
        .cover-meta-label {
            font-size: 14px;
            opacity: 0.7;
            margin-bottom: 5px;
        }
        
        .cover-meta-value {
            font-size: 18px;
            font-weight: 600;
            color: #f97316;
        }
        
        .toc-section {
            padding: 60px 80px;
            background: #f8f9fa;
        }
        
        .toc-title {
            font-size: 32px;
            color: #1e3a5f;
            margin-bottom: 30px;
            font-weight: 700;
            border-bottom: 3px solid #f97316;
            padding-bottom: 10px;
            display: inline-block;
        }
        
        .toc-list {
            list-style: none;
            counter-reset: toc-counter;
        }
        
        .toc-list li {
            counter-increment: toc-counter;
            padding: 15px 0;
            border-bottom: 1px dashed #e0e0e0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .toc-list li::before {
            content: counter(toc-counter);
            width: 36px;
            height: 36px;
            background: #1e3a5f;
            color: #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        .toc-list li a {
            color: #333333;
            text-decoration: none;
            font-size: 18px;
            font-weight: 500;
            transition: color 0.3s;
        }
        
        .toc-list li a:hover {
            color: #f97316;
        }
        
        .section {
            padding: 60px 80px;
            page-break-inside: avoid;
        }
        
        .section-header {
            margin-bottom: 40px;
        }
        
        .section-number {
            display: inline-block;
            width: 50px;
            height: 50px;
            background: #f97316;
            color: #ffffff;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .section-title {
            font-size: 32px;
            color: #1e3a5f;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .section-desc {
            font-size: 16px;
            color: #666666;
        }
        
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
        }
        
        .kpi-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            padding: 24px;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .kpi-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 30px rgba(30, 58, 95, 0.15);
        }
        
        .kpi-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #1e3a5f 0%, #f97316 100%);
        }
        
        .kpi-icon {
            width: 48px;
            height: 48px;
            background: rgba(30, 58, 95, 0.1);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            font-size: 24px;
        }
        
        .kpi-label {
            font-size: 14px;
            color: #666666;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .kpi-value {
            font-size: 32px;
            font-weight: 700;
            color: #1e3a5f;
            line-height: 1.2;
        }
        
        .kpi-value.accent {
            color: #f97316;
        }
        
        .kpi-change {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            padding: 4px 10px;
            border-radius: 20px;
            margin-top: 8px;
        }
        
        .kpi-change.positive {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
        }
        
        .kpi-change.negative {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
        }
        
        .chart-container {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
        }
        
        .chart-title {
            font-size: 20px;
            font-weight: 600;
            color: #1e3a5f;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .chart-content {
            width: 100%;
            text-align: center;
        }
        
        .chart-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 14px;
        }
        
        .data-table th {
            background: #1e3a5f;
            color: #ffffff;
            padding: 14px 16px;
            text-align: left;
            font-weight: 600;
        }
        
        .data-table th:first-child {
            border-top-left-radius: 8px;
        }
        
        .data-table th:last-child {
            border-top-right-radius: 8px;
        }
        
        .data-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .data-table tbody tr:hover {
            background: rgba(30, 58, 95, 0.03);
        }
        
        .data-table tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .highlight-row td {
            background: rgba(249, 115, 22, 0.1) !important;
            font-weight: 600;
        }
        
        .summary-section {
            background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%);
            color: #ffffff;
            padding: 60px 80px;
        }
        
        .summary-section .section-title {
            color: #ffffff;
        }
        
        .summary-section .section-desc {
            color: rgba(255, 255, 255, 0.8);
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            margin-top: 40px;
        }
        
        .summary-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 28px;
        }
        
        .summary-card-icon {
            width: 56px;
            height: 56px;
            background: #f97316;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            margin-bottom: 16px;
        }
        
        .summary-card-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #f97316;
        }
        
        .summary-card-content {
            font-size: 15px;
            line-height: 1.8;
            color: rgba(255, 255, 255, 0.9);
        }
        
        .summary-card-content ul {
            list-style: none;
            padding: 0;
        }
        
        .summary-card-content li {
            padding: 6px 0;
            padding-left: 20px;
            position: relative;
        }
        
        .summary-card-content li::before {
            content: '▸';
            position: absolute;
            left: 0;
            color: #f97316;
        }
        
        .conclusion-section {
            background: #ffffff;
            padding: 60px 80px;
        }
        
        .conclusion-title {
            font-size: 28px;
            color: #1e3a5f;
            font-weight: 700;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .conclusion-content {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-left: 4px solid #f97316;
            padding: 30px 40px;
            border-radius: 0 12px 12px 0;
            font-size: 16px;
            line-height: 2;
            color: #333333;
        }
        
        .footer {
            background: #1e3a5f;
            color: rgba(255, 255, 255, 0.7);
            text-align: center;
            padding: 30px;
            font-size: 14px;
        }
        
        .footer a {
            color: #f97316;
            text-decoration: none;
        }
        
        @media print {
            .section {
                page-break-inside: avoid;
            }
            .cover-page {
                page-break-after: always;
            }
            .toc-section {
                page-break-after: always;
            }
        }
        
        @media (max-width: 768px) {
            .section, .toc-section, .summary-section, .conclusion-section {
                padding: 30px 20px;
            }
            .cover-title {
                font-size: 32px;
            }
            .section-title {
                font-size: 24px;
            }
            .kpi-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <!-- 封面 -->
        <div class="cover-page">
            <div class="cover-content">
                <div class="cover-logo">📊</div>
                <h1 class="cover-title">{{ report_title }}</h1>
                <p class="cover-subtitle">E-Commerce Data Analytics Report</p>
                <div class="cover-meta">
                    <div class="cover-meta-item">
                        <div class="cover-meta-label">生成时间</div>
                        <div class="cover-meta-value">{{ generate_time }}</div>
                    </div>
                    <div class="cover-meta-item">
                        <div class="cover-meta-label">分析周期</div>
                        <div class="cover-meta-value">{{ analysis_period }}</div>
                    </div>
                    <div class="cover-meta-item">
                        <div class="cover-meta-label">总销售额</div>
                        <div class="cover-meta-value">¥{{ "{:,.0f}".format(kpis.total_sales) }}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 目录 -->
        <div class="toc-section">
            <h2 class="toc-title">📋 目录</h2>
            <ul class="toc-list">
                <li><a href="#kpi">核心指标概览</a></li>
                <li><a href="#sales-trend">销售趋势分析</a></li>
                <li><a href="#category">品类销售分析</a></li>
                <li><a href="#user">用户价值分析 (RFM)</a></li>
                <li><a href="#association">商品关联分析</a></li>
                <li><a href="#forecast">销售预测分析</a></li>
                <li><a href="#geo">地理销售分析</a></li>
                <li><a href="#price">价格敏感度分析</a></li>
                <li><a href="#retention">用户留存分析</a></li>
                <li><a href="#summary">分析结论与建议</a></li>
            </ul>
        </div>
        
        <!-- KPI指标 -->
        <div class="section" id="kpi">
            <div class="section-header">
                <div class="section-number">1</div>
                <h2 class="section-title">核心指标概览</h2>
                <p class="section-desc">展示平台核心运营指标，全面了解业务整体表现</p>
            </div>
            
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-label">总销售额</div>
                    <div class="kpi-value accent">¥{{ "{:,.0f}".format(kpis.total_sales) }}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📦</div>
                    <div class="kpi-label">订单总数</div>
                    <div class="kpi-value">{{ "{:,}".format(kpis.order_count) }}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">💳</div>
                    <div class="kpi-label">客单价</div>
                    <div class="kpi-value">¥{{ "{:,.2f}".format(kpis.average_order_value) }}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-label">用户总数</div>
                    <div class="kpi-value">{{ "{:,}".format(kpis.user_count) }}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🔄</div>
                    <div class="kpi-label">复购率</div>
                    <div class="kpi-value">{{ "{:.1%}".format(kpis.repurchase_rate) }}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-label">平均留存率</div>
                    <div class="kpi-value">{{ "{:.1%}".format(kpis.retention_rate) }}</div>
                </div>
            </div>
            
            {% if kpis.category_ratio is defined and not kpis.category_ratio.empty %}
            <div class="chart-container">
                <h3 class="chart-title">品类销售占比</h3>
                <div class="chart-content">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>品类</th>
                                <th>销售额 (元)</th>
                                <th>占比</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for _, row in kpis.category_ratio.iterrows() %}
                            <tr {% if loop.index == 1 %}class="highlight-row"{% endif %}>
                                <td>{{ row['category'] }}</td>
                                <td>¥{{ "{:,.2f}".format(row['sales']) }}</td>
                                <td>{{ "{:.1%}".format(row['ratio']) }}</td>
                            </tr>
                            {% endfor %}
                        </tbody>
                    </table>
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 销售趋势 -->
        <div class="section" id="sales-trend">
            <div class="section-header">
                <div class="section-number">2</div>
                <h2 class="section-title">销售趋势分析</h2>
                <p class="section-desc">分析销售数据随时间的变化趋势，识别高峰低谷</p>
            </div>
            
            {% if sales_trend_fig %}
            <div class="chart-container">
                <h3 class="chart-title">销售趋势图</h3>
                <div class="chart-content">
                    {{ sales_trend_fig | safe }}
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 品类分析 -->
        <div class="section" id="category">
            <div class="section-header">
                <div class="section-number">3</div>
                <h2 class="section-title">品类销售分析</h2>
                <p class="section-desc">分析各品类的销售表现和贡献度</p>
            </div>
            
            {% if category_fig %}
            <div class="chart-container">
                <h3 class="chart-title">品类销售占比分布</h3>
                <div class="chart-content">
                    {{ category_fig | safe }}
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 用户分析 -->
        <div class="section" id="user">
            <div class="section-header">
                <div class="section-number">4</div>
                <h2 class="section-title">用户价值分析 (RFM)</h2>
                <p class="section-desc">基于RFM模型对用户进行分层，识别高价值用户群体</p>
            </div>
            
            {% if rfm_fig %}
            <div class="chart-container">
                <h3 class="chart-title">RFM用户分层金字塔</h3>
                <div class="chart-content">
                    {{ rfm_fig | safe }}
                </div>
            </div>
            {% endif %}
            
            {% if rfm_df is not none %}
            <div class="chart-container">
                <h3 class="chart-title">RFM分层详情 (TOP 10)</h3>
                <div class="chart-content">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>用户ID</th>
                                <th>Recency (天)</th>
                                <th>Frequency (次)</th>
                                <th>Monetary (元)</th>
                                <th>RFM评分</th>
                                <th>用户分层</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% if not rfm_df.empty %}
                            {% for _, row in rfm_df.head(10).iterrows() %}
                            <tr>
                                <td>{{ row.iloc[0] }}</td>
                                <td>{{ row['Recency'] }}</td>
                                <td>{{ row['Frequency'] }}</td>
                                <td>¥{{ "{:,.2f}".format(row['Monetary']) }}</td>
                                <td>{{ row['RFM_score'] }}</td>
                                <td>{{ row['RFM_segment'] }}</td>
                            </tr>
                            {% endfor %}
                            {% else %}
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 20px; color: #999;">暂无数据</td>
                            </tr>
                            {% endif %}
                        </tbody>
                    </table>
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 关联分析 -->
        <div class="section" id="association">
            <div class="section-header">
                <div class="section-number">5</div>
                <h2 class="section-title">商品关联分析</h2>
                <p class="section-desc">挖掘商品间的关联规则，为交叉销售和推荐提供支持</p>
            </div>
            
            {% if rules_df is not none %}
            <div class="chart-container">
                <h3 class="chart-title">关联规则详情 (TOP 10)</h3>
                <div class="chart-content">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>前件商品</th>
                                <th>后件商品</th>
                                <th>支持度</th>
                                <th>置信度</th>
                                <th>提升度</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% if not rules_df.empty %}
                            {% for _, row in rules_df.head(10).iterrows() %}
                            <tr {% if loop.index == 1 %}class="highlight-row"{% endif %}>
                                <td>{{ row['antecedents'] }}</td>
                                <td>{{ row['consequents'] }}</td>
                                <td>{{ "{:.2%}".format(row['support']) }}</td>
                                <td>{{ "{:.2%}".format(row['confidence']) }}</td>
                                <td>{{ "{:.2f}".format(row['lift']) }}</td>
                            </tr>
                            {% endfor %}
                            {% else %}
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 20px; color: #999;">暂无数据</td>
                            </tr>
                            {% endif %}
                        </tbody>
                    </table>
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 预测分析 -->
        <div class="section" id="forecast">
            <div class="section-header">
                <div class="section-number">6</div>
                <h2 class="section-title">销售预测分析</h2>
                <p class="section-desc">基于历史数据预测未来销售趋势，辅助决策</p>
            </div>
            
            {% if forecast_fig %}
            <div class="chart-container">
                <h3 class="chart-title">销售预测趋势</h3>
                <div class="chart-content">
                    {{ forecast_fig | safe }}
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 地理分析 -->
        <div class="section" id="geo">
            <div class="section-header">
                <div class="section-number">7</div>
                <h2 class="section-title">地理销售分析</h2>
                <p class="section-desc">分析各地区销售表现，识别核心市场区域</p>
            </div>
            
            {% if geo_fig %}
            <div class="chart-container">
                <h3 class="chart-title">地区销售热力图</h3>
                <div class="chart-content">
                    {{ geo_fig | safe }}
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 价格分析 -->
        <div class="section" id="price">
            <div class="section-header">
                <div class="section-number">8</div>
                <h2 class="section-title">价格敏感度分析</h2>
                <p class="section-desc">分析折扣对销量和销售额的影响，评估价格弹性</p>
            </div>
            
            {% if price_fig %}
            <div class="chart-container">
                <h3 class="chart-title">价格敏感度曲线</h3>
                <div class="chart-content">
                    {{ price_fig | safe }}
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 留存分析 -->
        <div class="section" id="retention">
            <div class="section-header">
                <div class="section-number">9</div>
                <h2 class="section-title">用户留存分析</h2>
                <p class="section-desc">分析用户留存情况，评估用户粘性和运营效果</p>
            </div>
            
            {% if retention_fig %}
            <div class="chart-container">
                <h3 class="chart-title">用户留存率矩阵</h3>
                <div class="chart-content">
                    {{ retention_fig | safe }}
                </div>
            </div>
            {% endif %}
        </div>
        
        <!-- 分析总结 -->
        <div class="summary-section" id="summary">
            <div class="section-header">
                <div class="section-number" style="background: #f97316;">10</div>
                <h2 class="section-title">分析结论与建议</h2>
                <p class="section-desc">综合所有分析维度，提炼核心洞察和行动建议</p>
            </div>
            
            <div class="summary-cards">
                <div class="summary-card">
                    <div class="summary-card-icon">📈</div>
                    <h3 class="summary-card-title">销售表现</h3>
                    <div class="summary-card-content">
                        {{ report_summary.sales_summary | safe }}
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-card-icon">👤</div>
                    <h3 class="summary-card-title">用户价值</h3>
                    <div class="summary-card-content">
                        {{ report_summary.user_summary | safe }}
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-card-icon">🛍️</div>
                    <h3 class="summary-card-title">商品关联</h3>
                    <div class="summary-card-content">
                        {{ report_summary.product_summary | safe }}
                    </div>
                </div>
                
                <div class="summary-card">
                    <div class="summary-card-icon">🔮</div>
                    <h3 class="summary-card-title">预测趋势</h3>
                    <div class="summary-card-content">
                        {{ report_summary.forecast_summary | safe }}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 总结建议 -->
        <div class="conclusion-section">
            <h2 class="conclusion-title">💡 核心行动建议</h2>
            <div class="conclusion-content">
                {{ report_summary.conclusion | safe }}
            </div>
        </div>
        
        <!-- 页脚 -->
        <div class="footer">
            <p>本报告由电商数据分析平台自动生成 | 生成时间: {{ generate_time }}</p>
            <p>© 2024 E-Commerce Analytics Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""


def _fig_to_html(fig: Any) -> str:
    """
    将图表对象转换为HTML内嵌格式。
    
    Parameters
    ----------
    fig : Any
        图表对象，支持Plotly Figure、Matplotlib Figure或字符串。
        
    Returns
    -------
    str
        HTML格式的图表内容。
    """
    if fig is None:
        return ''
    
    if isinstance(fig, go.Figure):
        return fig.to_html(full_html=False, include_plotlyjs='cdn', config={'responsive': True})
    
    if isinstance(fig, plt.Figure):
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return f'<img src="data:image/png;base64,{img_base64}" alt="chart" style="max-width:100%;height:auto;"/>'
    
    if isinstance(fig, str):
        return fig
    
    return ''


def _format_kpis(kpis: Dict) -> Dict:
    """
    格式化KPI字典，确保所有字段存在。
    
    Parameters
    ----------
    kpis : Dict
        KPI指标字典。
        
    Returns
    -------
    Dict
        格式化后的KPI字典。
    """
    default_kpis = {
        'total_sales': 0,
        'order_count': 0,
        'average_order_value': 0,
        'user_count': 0,
        'repurchase_rate': 0,
        'retention_rate': 0,
        'category_ratio': pd.DataFrame()
    }
    default_kpis.update(kpis)
    return default_kpis


def generate_html_report(
    kpis: Dict,
    sales_trend_fig: Any = None,
    category_fig: Any = None,
    rfm_df: Optional[pd.DataFrame] = None,
    rfm_fig: Any = None,
    rules_df: Optional[pd.DataFrame] = None,
    forecast_fig: Any = None,
    geo_fig: Any = None,
    price_fig: Any = None,
    retention_fig: Any = None,
    report_title: str = '电商数据分析报告'
) -> str:
    """
    使用Jinja2模板生成完整的HTML分析报告。
    
    报告包含封面、目录、KPI指标卡片、销售趋势图、品类分析、RFM用户分层、
    商品关联分析、销售预测、地理销售热力图、价格敏感度分析、用户留存分析、
    分析结论与建议等完整内容。
    
    Parameters
    ----------
    kpis : Dict
        KPI指标字典，需包含total_sales、order_count、average_order_value、
        user_count、repurchase_rate、retention_rate、category_ratio等字段。
    sales_trend_fig : Any, optional
        销售趋势图表对象，支持Plotly Figure或Matplotlib Figure。
    category_fig : Any, optional
        品类分析图表对象。
    rfm_df : pd.DataFrame, optional
        RFM分析结果DataFrame，包含用户ID、Recency、Frequency、Monetary、
        RFM_score、RFM_segment等字段。
    rfm_fig : Any, optional
        RFM分层图表对象。
    rules_df : pd.DataFrame, optional
        关联规则结果DataFrame，包含antecedents、consequents、support、
        confidence、lift等字段。
    forecast_fig : Any, optional
        销售预测图表对象。
    geo_fig : Any, optional
        地理销售热力图对象。
    price_fig : Any, optional
        价格敏感度分析图表对象。
    retention_fig : Any, optional
        用户留存分析图表对象。
    report_title : str, default '电商数据分析报告'
        报告标题。
        
    Returns
    -------
    str
        完整的HTML报告内容，包含内嵌CSS样式，可独立离线查看。
        
    Notes
    -----
    - 使用PRD文档中的配色方案：深蓝色(#1e3a5f)为主色，橙色(#f97316)为强调色
    - 报告结构完整，包含封面、目录、各分析章节、结论
    - 所有CSS样式内嵌，无需外部依赖，支持离线查看
    - Plotly图表使用CDN方式加载，Matplotlib图表转为base64内嵌
    - 支持响应式布局，适配不同屏幕尺寸
    - 包含打印样式，支持直接打印或导出PDF
        
    Examples
    --------
    >>> kpis = calculate_kpis(sales_df)
    >>> sales_fig = plot_sales_trend(sales_df)
    >>> html_content = generate_html_report(
    ...     kpis=kpis,
    ...     sales_trend_fig=sales_fig,
    ...     report_title='2024年度电商数据分析报告'
    ... )
    >>> export_to_html(html_content, 'report.html')
    """
    kpis = _format_kpis(kpis)
    
    category_ratio = kpis.get('category_ratio', pd.DataFrame())
    if isinstance(category_ratio, pd.DataFrame) and not category_ratio.empty:
        if 'category' not in category_ratio.columns:
            category_ratio.columns = ['category', 'sales', 'ratio']
    
    rfm_df_processed = None
    if rfm_df is not None and not rfm_df.empty:
        rfm_df_processed = rfm_df.copy()
        segment_col = None
        for col in ['RFM_segment', 'segment', '用户分层', '分层']:
            if col in rfm_df_processed.columns:
                segment_col = col
                break
        if segment_col and segment_col != 'RFM_segment':
            rfm_df_processed = rfm_df_processed.rename(columns={segment_col: 'RFM_segment'})
        score_col = None
        for col in ['RFM_score', 'rfm_score', '评分']:
            if col in rfm_df_processed.columns:
                score_col = col
                break
        if score_col and score_col != 'RFM_score':
            rfm_df_processed = rfm_df_processed.rename(columns={score_col: 'RFM_score'})
    
    rules_df_processed = None
    if rules_df is not None and not rules_df.empty:
        rules_df_processed = rules_df.copy()
        def _format_itemset(x):
            if isinstance(x, frozenset):
                return ', '.join(x)
            elif isinstance(x, (list, set)):
                return ', '.join([str(i) for i in x])
            else:
                return str(x)
        rules_df_processed['antecedents'] = rules_df_processed['antecedents'].apply(_format_itemset)
        rules_df_processed['consequents'] = rules_df_processed['consequents'].apply(_format_itemset)
    
    report_summary = create_report_summary(kpis, rfm_df_processed, rules_df_processed)
    
    generate_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if isinstance(category_ratio, pd.DataFrame) and not category_ratio.empty:
        start_date = '2024-01-01'
        end_date = datetime.now().strftime('%Y-%m-%d')
        analysis_period = f'{start_date} 至 {end_date}'
    else:
        analysis_period = '完整分析周期'
    
    template = Template(HTML_TEMPLATE)
    
    html_content = template.render(
        report_title=report_title,
        generate_time=generate_time,
        analysis_period=analysis_period,
        kpis=kpis,
        sales_trend_fig=_fig_to_html(sales_trend_fig),
        category_fig=_fig_to_html(category_fig),
        rfm_df=rfm_df_processed,
        rfm_fig=_fig_to_html(rfm_fig),
        rules_df=rules_df_processed,
        forecast_fig=_fig_to_html(forecast_fig),
        geo_fig=_fig_to_html(geo_fig),
        price_fig=_fig_to_html(price_fig),
        retention_fig=_fig_to_html(retention_fig),
        report_summary=report_summary
    )
    
    return html_content


def export_to_html(html_content: str, output_path: str = 'report.html') -> str:
    """
    将HTML内容保存到文件。
    
    Parameters
    ----------
    html_content : str
        HTML内容字符串。
    output_path : str, default 'report.html'
        输出文件路径。
        
    Returns
    -------
    str
        保存的文件绝对路径。
        
    Notes
    -----
    - 自动创建目录（如果不存在）
    - 使用UTF-8编码保存，确保中文字符正常显示
        
    Examples
    --------
    >>> html_content = generate_html_report(kpis, sales_fig)
    >>> file_path = export_to_html(html_content, 'reports/2024_report.html')
    >>> print(f'报告已保存到: {file_path}')
    """
    output_dir = os.path.dirname(os.path.abspath(output_path))
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return os.path.abspath(output_path)


def export_to_pdf(html_content: str, output_path: str = 'report.pdf') -> Dict:
    """
    将HTML内容转换为PDF文件。
    
    使用weasyprint库进行转换，如果weasyprint不可用则降级为保存HTML文件
    并提示用户。
    
    Parameters
    ----------
    html_content : str
        HTML内容字符串。
    output_path : str, default 'report.pdf'
        输出PDF文件路径。
        
    Returns
    -------
    Dict
        包含转换结果的字典：
        - success: bool，表示是否成功转换为PDF
        - message: str，结果说明消息
        - file_path: str，实际保存的文件路径
        - fallback: bool，是否使用了降级方案（保存HTML）
        
    Notes
    -----
    - 优先使用weasyprint进行高质量PDF转换
    - 如果weasyprint不可用，自动降级为保存HTML并提示
    - 建议安装weasyprint以获得最佳PDF输出效果
        
    Examples
    --------
    >>> html_content = generate_html_report(kpis, sales_fig)
    >>> result = export_to_pdf(html_content, 'reports/2024_report.pdf')
    >>> if result['success']:
    ...     print(f'PDF已保存到: {result["file_path"]}')
    ... else:
    ...     print(result['message'])
    ...     print(f'HTML已保存到: {result["file_path"]}')
    """
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
        result['message'] = 'PDF导出成功'
        result['file_path'] = os.path.abspath(output_path)
        return result
        
    except ImportError:
        html_path = output_path.replace('.pdf', '.html')
        saved_path = export_to_html(html_content, html_path)
        
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
        saved_path = export_to_html(html_content, html_path)
        
        result['success'] = False
        result['fallback'] = True
        result['message'] = f'PDF导出失败: {str(e)}。HTML报告已保存作为备选。'
        result['file_path'] = saved_path
        return result


def export_data_to_excel(
    data_dict: Dict[str, pd.DataFrame],
    output_path: str = 'data_export.xlsx'
) -> str:
    """
    将多个DataFrame导出到Excel文件的不同sheet中。
    
    Parameters
    ----------
    data_dict : Dict[str, pd.DataFrame]
        字典，key为sheet名称，value为对应的DataFrame。
    output_path : str, default 'data_export.xlsx'
        输出Excel文件路径。
        
    Returns
    -------
    str
        保存的文件绝对路径。
        
    Notes
    -----
    - 使用openpyxl引擎支持xlsx格式
    - 自动调整列宽以适应内容
    - 对表头进行样式设置（加粗、背景色）
    - 数字列自动格式化
    - 空DataFrame会自动跳过并提示
        
    Examples
    --------
    >>> data_dict = {
    ...     '销售数据': sales_df,
    ...     'RFM分析': rfm_df,
    ...     '关联规则': rules_df,
    ...     '预测结果': forecast_df
    ... }
    >>> file_path = export_data_to_excel(data_dict, 'exports/data.xlsx')
    >>> print(f'数据已导出到: {file_path}')
    """
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    
    output_dir = os.path.dirname(os.path.abspath(output_path))
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        for sheet_name, df in data_dict.items():
            if df is None or df.empty:
                continue
            
            df_clean = df.copy()
            
            for col in df_clean.columns:
                if df_clean[col].dtype == object:
                    df_clean[col] = df_clean[col].apply(
                        lambda x: ', '.join(x) if isinstance(x, (frozenset, set, list)) else x
                    )
            
            sheet_name_clean = sheet_name[:31]
            df_clean.to_excel(writer, sheet_name=sheet_name_clean, index=False)
    
    try:
        from openpyxl import load_workbook
        wb = load_workbook(output_path)
        
        header_font = Font(bold=True, color='FFFFFF', size=11)
        header_fill = PatternFill(start_color=PRIMARY_COLOR.replace('#', ''), 
                                  end_color=PRIMARY_COLOR.replace('#', ''), 
                                  fill_type='solid')
        header_alignment = Alignment(horizontal='center', vertical='center')
        
        for sheet in wb.sheetnames:
            ws = wb[sheet]
            
            for cell in ws[1]:
                cell.font = header_font
                cell.fill = header_fill
                cell.alignment = header_alignment
            
            for column in ws.columns:
                max_length = 0
                column_letter = get_column_letter(column[0].column)
                for cell in column:
                    try:
                        if cell.value is not None:
                            cell_length = len(str(cell.value))
                            if cell_length > max_length:
                                max_length = cell_length
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                ws.column_dimensions[column_letter].width = adjusted_width
            
            ws.freeze_panes = 'A2'
        
        wb.save(output_path)
    except Exception:
        pass
    
    return os.path.abspath(output_path)


def create_report_summary(
    kpis: Dict,
    rfm_df: Optional[pd.DataFrame] = None,
    rules_df: Optional[pd.DataFrame] = None,
    forecast_df: Optional[pd.DataFrame] = None
) -> Dict[str, str]:
    """
    生成分析结论的文字总结，包括销售表现、用户价值、商品关联、预测趋势等。
    
    Parameters
    ----------
    kpis : Dict
        KPI指标字典。
    rfm_df : pd.DataFrame, optional
        RFM分析结果DataFrame。
    rules_df : pd.DataFrame, optional
        关联规则结果DataFrame。
    forecast_df : pd.DataFrame, optional
        预测结果DataFrame。
        
    Returns
    -------
    Dict[str, str]
        包含各维度分析总结的字典：
        - sales_summary: 销售表现分析
        - user_summary: 用户价值分析
        - product_summary: 商品关联分析
        - forecast_summary: 预测趋势分析
        - conclusion: 综合结论与建议
        
    Notes
    -----
    - 根据数据自动生成专业的分析结论
    - 量化分析结果，突出关键洞察
    - 提供可落地的行动建议
    - 处理缺失数据的情况，给出合理提示
        
    Examples
    --------
    >>> summary = create_report_summary(kpis, rfm_df, rules_df)
    >>> print('销售表现总结:', summary['sales_summary'])
    >>> print('核心建议:', summary['conclusion'])
    """
    kpis = _format_kpis(kpis)
    
    sales_summary = _generate_sales_summary(kpis)
    user_summary = _generate_user_summary(kpis, rfm_df)
    product_summary = _generate_product_summary(rules_df)
    forecast_summary = _generate_forecast_summary(forecast_df)
    conclusion = _generate_conclusion(kpis, rfm_df, rules_df, forecast_df)
    
    return {
        'sales_summary': sales_summary,
        'user_summary': user_summary,
        'product_summary': product_summary,
        'forecast_summary': forecast_summary,
        'conclusion': conclusion
    }


def _generate_sales_summary(kpis: Dict) -> str:
    """生成销售表现分析总结"""
    total_sales = kpis.get('total_sales', 0)
    order_count = kpis.get('order_count', 0)
    aov = kpis.get('average_order_value', 0)
    repurchase_rate = kpis.get('repurchase_rate', 0)
    
    sales_level = '优秀' if total_sales > 1000000 else '良好' if total_sales > 500000 else '一般'
    repurchase_level = '优秀' if repurchase_rate > 0.3 else '良好' if repurchase_rate > 0.15 else '待提升'
    
    summary = f"<ul>"
    summary += f"<li>总销售额达到 <strong>¥{total_sales:,.0f}</strong>，表现{sales_level}</li>"
    summary += f"<li>累计订单量 <strong>{order_count:,}</strong> 笔</li>"
    summary += f"<li>客单价为 <strong>¥{aov:,.2f}</strong></li>"
    summary += f"<li>复购率 <strong>{repurchase_rate:.1%}</strong>，{repurchase_level}</li>"
    
    category_ratio = kpis.get('category_ratio', pd.DataFrame())
    if isinstance(category_ratio, pd.DataFrame) and not category_ratio.empty:
        top_category = category_ratio.iloc[0]
        summary += f"<li>TOP品类「{top_category['category']}」贡献 <strong>{top_category['ratio']:.1%}</strong> 销售额</li>"
    
    summary += f"</ul>"
    return summary


def _generate_user_summary(kpis: Dict, rfm_df: Optional[pd.DataFrame]) -> str:
    """生成用户价值分析总结"""
    user_count = kpis.get('user_count', 0)
    retention_rate = kpis.get('retention_rate', 0)
    
    summary = f"<ul>"
    summary += f"<li>总用户数 <strong>{user_count:,}</strong> 人</li>"
    summary += f"<li>平均留存率 <strong>{retention_rate:.1%}</strong></li>"
    
    if rfm_df is not None and not rfm_df.empty:
        segment_col = 'RFM_segment' if 'RFM_segment' in rfm_df.columns else rfm_df.columns[-1]
        segment_counts = rfm_df[segment_col].value_counts()
        
        high_value = segment_counts.get('重要价值用户', 0)
        total_users = len(rfm_df)
        high_value_ratio = high_value / total_users if total_users > 0 else 0
        
        summary += f"<li>高价值用户 <strong>{high_value:,}</strong> 人，占比 <strong>{high_value_ratio:.1%}</strong></li>"
        
        lost_users = segment_counts.get('流失用户', 0)
        lost_ratio = lost_users / total_users if total_users > 0 else 0
        summary += f"<li>流失用户 <strong>{lost_users:,}</strong> 人，占比 <strong>{lost_ratio:.1%}</strong></li>"
        
        avg_monetary = rfm_df['Monetary'].mean() if 'Monetary' in rfm_df.columns else 0
        summary += f"<li>用户平均消费 <strong>¥{avg_monetary:,.2f}</strong></li>"
    else:
        summary += f"<li>暂无RFM用户分层数据</li>"
    
    summary += f"</ul>"
    return summary


def _generate_product_summary(rules_df: Optional[pd.DataFrame]) -> str:
    """生成商品关联分析总结"""
    summary = f"<ul>"
    
    if rules_df is not None and not rules_df.empty:
        rule_count = len(rules_df)
        summary += f"<li>共挖掘出 <strong>{rule_count}</strong> 条有效关联规则</li>"
        
        top_rule = rules_df.iloc[0]
        ant = top_rule['antecedents']
        cons = top_rule['consequents']
        conf = top_rule['confidence']
        lift = top_rule['lift']
        
        summary += f"<li>最强关联: 购买「{ant}」的用户有 <strong>{conf:.1%}</strong> 概率购买「{cons}」</li>"
        summary += f"<li>最高提升度达 <strong>{lift:.2f}x</strong></li>"
        
        high_conf = (rules_df['confidence'] > 0.5).sum()
        summary += f"<li>高置信度(>50%)规则 <strong>{high_conf}</strong> 条</li>"
        
        high_lift = (rules_df['lift'] > 2).sum()
        summary += f"<li>强提升度(>2x)规则 <strong>{high_lift}</strong> 条</li>"
    else:
        summary += f"<li>暂无商品关联分析数据</li>"
        summary += f"<li>建议积累更多订单数据后进行关联分析</li>"
    
    summary += f"</ul>"
    return summary


def _generate_forecast_summary(forecast_df: Optional[pd.DataFrame]) -> str:
    """生成预测趋势分析总结"""
    summary = f"<ul>"
    
    if forecast_df is not None and not forecast_df.empty:
        if 'yhat' in forecast_df.columns:
            forecast_days = len(forecast_df[forecast_df['yhat'] > 0]) if 'yhat' in forecast_df.columns else len(forecast_df)
            total_forecast = forecast_df['yhat'].sum() if 'yhat' in forecast_df.columns else 0
            avg_forecast = forecast_df['yhat'].mean() if 'yhat' in forecast_df.columns else 0
            
            summary += f"<li>预测周期 <strong>{forecast_days}</strong> 天</li>"
            summary += f"<li>预测总销售额 <strong>¥{total_forecast:,.0f}</strong></li>"
            summary += f"<li>日均预测销售额 <strong>¥{avg_forecast:,.0f}</strong></li>"
            
            if 'yhat_upper' in forecast_df.columns and 'yhat_lower' in forecast_df.columns:
                avg_upper = forecast_df['yhat_upper'].mean()
                avg_lower = forecast_df['yhat_lower'].mean()
                uncertainty = (avg_upper - avg_lower) / avg_forecast * 100 if avg_forecast > 0 else 0
                summary += f"<li>预测平均不确定度 <strong>±{uncertainty:.1f}%</strong></li>"
    else:
        summary += f"<li>暂无销售预测数据</li>"
        summary += f"<li>建议积累更多历史数据后进行预测</li>"
    
    summary += f"</ul>"
    return summary


def _generate_conclusion(
    kpis: Dict,
    rfm_df: Optional[pd.DataFrame],
    rules_df: Optional[pd.DataFrame],
    forecast_df: Optional[pd.DataFrame]
) -> str:
    """生成综合结论与建议"""
    total_sales = kpis.get('total_sales', 0)
    repurchase_rate = kpis.get('repurchase_rate', 0)
    user_count = kpis.get('user_count', 0)
    
    conclusions = []
    
    if total_sales > 500000:
        conclusions.append(
            "销售表现强劲，建议继续保持当前的营销策略，"
            "同时关注高增长品类的库存备货，确保供应链稳定。"
        )
    elif total_sales > 100000:
        conclusions.append(
            "销售表现良好，建议加大营销投入，重点推动TOP品类的增长，"
            "同时挖掘潜力品类的市场机会。"
        )
    else:
        conclusions.append(
            "销售表现有较大提升空间，建议重新审视产品定价和营销策略，"
            "开展促销活动拉动销售增长。"
        )
    
    if repurchase_rate > 0.3:
        conclusions.append(
            "用户复购率优秀，说明产品和服务获得了用户认可。"
            "建议建立会员体系，进一步提升用户忠诚度。"
        )
    elif repurchase_rate > 0.15:
        conclusions.append(
            "用户复购率处于中等水平，建议优化售后服务，"
            "推出复购优惠活动，提升用户粘性。"
        )
    else:
        conclusions.append(
            "用户复购率偏低，需重点关注用户体验，"
            "分析流失原因，针对性推出召回活动。"
        )
    
    if rfm_df is not None and not rfm_df.empty:
        segment_col = 'RFM_segment' if 'RFM_segment' in rfm_df.columns else rfm_df.columns[-1]
        segment_counts = rfm_df[segment_col].value_counts()
        high_value = segment_counts.get('重要价值用户', 0)
        lost_users = segment_counts.get('流失用户', 0)
        
        if high_value > 0:
            conclusions.append(
                f"平台拥有{high_value:,}名高价值用户，建议为这部分用户提供专属服务，"
                f"建立VIP通道，保持其活跃度和贡献度。"
            )
        
        if lost_users > 0:
            conclusions.append(
                f"存在{lost_users:,}名流失用户，建议开展用户召回活动，"
                f"分析流失原因，优化产品和服务。"
            )
    
    if rules_df is not None and not rules_df.empty:
        high_lift_rules = rules_df[rules_df['lift'] > 2]
        if len(high_lift_rules) > 0:
            conclusions.append(
                f"发现{len(high_lift_rules)}条强关联商品组合，"
                f"建议在商品详情页和购物车页面增加相关商品推荐，"
                f"设计组合优惠套餐，提升客单价。"
            )
    
    if forecast_df is not None and not forecast_df.empty:
        if 'yhat' in forecast_df.columns:
            total_forecast = forecast_df['yhat'].sum()
            if total_forecast > total_sales * 0.1:
                conclusions.append(
                    "预测显示未来销售将保持增长态势，"
                    "建议提前做好库存规划和人员配置，抓住增长机遇。"
                )
    
    if len(conclusions) == 0:
        conclusions.append(
            "建议持续积累数据，定期分析业务指标，"
            "根据数据洞察及时调整运营策略。"
        )
    
    conclusion_html = "<ol style='padding-left: 20px;'>"
    for i, conc in enumerate(conclusions, 1):
        conclusion_html += f"<li style='margin-bottom: 12px;'>{conc}</li>"
    conclusion_html += "</ol>"
    
    return conclusion_html


def get_download_link(
    content: Union[str, bytes, pd.DataFrame],
    filename: str,
    filetype: str
) -> str:
    """
    生成Streamlit下载链接，支持HTML和字节流两种方式。
    
    Parameters
    ----------
    content : Union[str, bytes, pd.DataFrame]
        要下载的内容，可以是字符串（HTML/文本）、字节流（PDF/Excel）
        或DataFrame（自动转为CSV）。
    filename : str
        下载文件名。
    filetype : str
        文件类型，可选值：'html'、'pdf'、'excel'、'csv'、'txt'。
        
    Returns
    -------
    str
        Streamlit下载按钮的Markdown代码，可直接用于st.markdown显示。
        
    Notes
    -----
    - 自动处理不同类型内容的编码
    - 对于DataFrame，自动转为CSV格式
    - HTML内容使用UTF-8编码
    - 生成的链接支持直接下载，无需额外配置
        
    Examples
    --------
    >>> html_content = generate_html_report(kpis, sales_fig)
    >>> download_link = get_download_link(html_content, 'report.html', 'html')
    >>> st.markdown(download_link, unsafe_allow_html=True)
    >>>
    >>> # 下载Excel
    >>> excel_bytes = io.BytesIO()
    >>> with pd.ExcelWriter(excel_bytes, engine='openpyxl') as writer:
    ...     df.to_excel(writer, index=False)
    >>> download_link = get_download_link(excel_bytes.getvalue(), 'data.xlsx', 'excel')
    """
    import streamlit as st
    
    if isinstance(content, pd.DataFrame):
        content = content.to_csv(index=False).encode('utf-8')
    
    if isinstance(content, str):
        content = content.encode('utf-8')
    
    mime_types = {
        'html': 'text/html',
        'pdf': 'application/pdf',
        'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'csv': 'text/csv',
        'txt': 'text/plain'
    }
    
    mime_type = mime_types.get(filetype.lower(), 'application/octet-stream')
    
    b64 = base64.b64encode(content).decode()
    
    button_style = f"""
    <style>
        .download-button {{
            display: inline-block;
            padding: 10px 24px;
            background: linear-gradient(135deg, {PRIMARY_COLOR} 0%, #2d5a8a 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
            border: none;
            cursor: pointer;
        }}
        .download-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(30, 58, 95, 0.4);
            background: linear-gradient(135deg, {ACCENT_COLOR} 0%, #fb923c 100%);
        }}
        .download-button:active {{
            transform: translateY(0);
        }}
    </style>
    """
    
    download_link = f'''
    {button_style}
    <a href="data:{mime_type};base64,{b64}" 
       download="{filename}"
       class="download-button">
       📥 下载 {filename}
    </a>
    '''
    
    return download_link
