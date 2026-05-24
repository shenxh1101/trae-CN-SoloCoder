"""
指标计算模块
提供KPI计算、RFM分析、留存率、复购率、同比环比等核心指标计算功能
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Tuple, Optional


DATE_FIELD_PATTERNS = [
    'order_date', '下单时间', '订单日期', '交易时间', '购买日期',
    'date', 'datetime', '时间', '日期'
]

USER_ID_PATTERNS = [
    'user_id', '用户ID', '用户id', '会员ID', 'customer_id'
]

ORDER_ID_PATTERNS = [
    'order_id', '订单ID', '订单号', '订单id', 'transaction_id'
]

AMOUNT_PATTERNS = [
    'total_amount', '订单金额', '金额', '消费金额', '支付金额',
    'amount', 'price', '销售额', 'subtotal', '小计'
]

CATEGORY_PATTERNS = [
    'category', '品类', '商品品类', '类别', '分类', '商品分类'
]

REGISTER_DATE_PATTERNS = [
    'register_date', '注册日期', '注册时间', 'join_date'
]

QUANTITY_PATTERNS = [
    'quantity', '数量', '购买数量', '销售数量'
]


def _find_field(df: pd.DataFrame, patterns: list) -> Optional[str]:
    """根据模式匹配查找DataFrame中的字段名"""
    for col in df.columns:
        col_lower = str(col).lower()
        for pattern in patterns:
            if pattern.lower() in col_lower:
                return col
    return None


def _to_datetime_series(series: pd.Series) -> pd.Series:
    """灵活转换日期字段，处理多种日期格式"""
    return pd.to_datetime(series, errors='coerce')


def _validate_dataframe(df: pd.DataFrame, required_patterns: list) -> None:
    """验证DataFrame是否包含必要字段"""
    missing = []
    for patterns, field_name in required_patterns:
        if _find_field(df, patterns) is None:
            missing.append(field_name)
    if missing:
        raise ValueError(f"数据缺少必要字段: {', '.join(missing)}")


def calculate_kpis(df: pd.DataFrame, date_range: Optional[Tuple[str, str]] = None) -> Dict:
    """
    计算核心KPI指标
    
    Args:
        df: 订单数据DataFrame（需包含订单日期、用户ID、订单ID、金额等字段）
        date_range: 日期范围元组 (开始日期, 结束日期)，格式为'YYYY-MM-DD'
        
    Returns:
        包含各KPI指标的字典
    """
    if df.empty:
        return {
            'total_sales': 0,
            'order_count': 0,
            'average_order_value': 0,
            'user_count': 0,
            'repurchase_rate': 0,
            'retention_rate': 0,
            'category_ratio': pd.DataFrame()
        }

    date_col = _find_field(df, DATE_FIELD_PATTERNS)
    user_col = _find_field(df, USER_ID_PATTERNS)
    order_col = _find_field(df, ORDER_ID_PATTERNS)
    amount_col = _find_field(df, AMOUNT_PATTERNS)

    _validate_dataframe(df, [
        (DATE_FIELD_PATTERNS, '日期字段'),
        (USER_ID_PATTERNS, '用户ID字段'),
        (ORDER_ID_PATTERNS, '订单ID字段'),
        (AMOUNT_PATTERNS, '金额字段')
    ])

    df = df.copy()
    df[date_col] = _to_datetime_series(df[date_col])

    if date_range:
        start_date = pd.to_datetime(date_range[0])
        end_date = pd.to_datetime(date_range[1])
        mask = (df[date_col] >= start_date) & (df[date_col] <= end_date)
        df = df[mask]

    total_sales = df[amount_col].sum()
    order_count = df[order_col].nunique()
    user_count = df[user_col].nunique()
    average_order_value = total_sales / order_count if order_count > 0 else 0

    repurchase_rate = calculate_repurchase_rate(df)

    try:
        retention_rate = calculate_retention(df).iloc[:, 1:].mean().mean()
    except Exception:
        retention_rate = 0

    category_ratio = category_sales_ratio(df)

    return {
        'total_sales': float(total_sales),
        'order_count': int(order_count),
        'average_order_value': float(average_order_value),
        'user_count': int(user_count),
        'repurchase_rate': float(repurchase_rate),
        'retention_rate': float(retention_rate),
        'category_ratio': category_ratio
    }


def calculate_repurchase_rate(df: pd.DataFrame) -> float:
    """
    计算复购率 = 购买多次的用户数 / 总购买用户数
    
    Args:
        df: 订单数据DataFrame
        
    Returns:
        复购率 (0~1之间的浮点数)
    """
    if df.empty:
        return 0.0

    user_col = _find_field(df, USER_ID_PATTERNS)
    order_col = _find_field(df, ORDER_ID_PATTERNS)

    _validate_dataframe(df, [
        (USER_ID_PATTERNS, '用户ID字段'),
        (ORDER_ID_PATTERNS, '订单ID字段')
    ])

    user_order_counts = df.groupby(user_col)[order_col].nunique()
    total_users = len(user_order_counts)
    repeat_users = (user_order_counts >= 2).sum()

    return repeat_users / total_users if total_users > 0 else 0.0


def calculate_retention(df: pd.DataFrame, cohort_type: str = 'month') -> pd.DataFrame:
    """
    计算用户留存率矩阵，按注册月份分组，计算后续各月留存情况
    
    Args:
        df: 订单数据DataFrame（需包含用户ID、订单日期、注册日期）
        cohort_type: 分组类型，支持 'month' 或 'week'
        
    Returns:
        留存率矩阵DataFrame，行为注册月份/周，列为后续周期留存率
    """
    if df.empty:
        return pd.DataFrame()

    date_col = _find_field(df, DATE_FIELD_PATTERNS)
    user_col = _find_field(df, USER_ID_PATTERNS)
    register_col = _find_field(df, REGISTER_DATE_PATTERNS)

    _validate_dataframe(df, [
        (DATE_FIELD_PATTERNS, '日期字段'),
        (USER_ID_PATTERNS, '用户ID字段')
    ])

    df = df.copy()
    df[date_col] = _to_datetime_series(df[date_col])

    if register_col is None:
        user_first_purchase = df.groupby(user_col)[date_col].min().reset_index()
        user_first_purchase.columns = [user_col, '_register_date']
        df = df.merge(user_first_purchase, on=user_col, how='left')
        register_col = '_register_date'
    else:
        df[register_col] = _to_datetime_series(df[register_col])

    if cohort_type == 'month':
        df['_cohort'] = df[register_col].dt.to_period('M')
        df['_order_period'] = df[date_col].dt.to_period('M')
    elif cohort_type == 'week':
        df['_cohort'] = df[register_col].dt.to_period('W')
        df['_order_period'] = df[date_col].dt.to_period('W')
    else:
        raise ValueError("cohort_type 仅支持 'month' 或 'week'")

    df['_periods_since'] = (df['_order_period'] - df['_cohort']).apply(
        lambda x: x.n if hasattr(x, 'n') else x
    )

    df = df[df['_periods_since'] >= 0]

    cohort_group = df.groupby(['_cohort', '_periods_since'])[user_col].nunique().reset_index()
    cohort_counts = cohort_group.pivot(
        index='_cohort',
        columns='_periods_since',
        values=user_col
    )

    if 0 not in cohort_counts.columns:
        return pd.DataFrame()

    cohort_counts = cohort_counts.sort_index(axis=1)

    cohort_size = cohort_counts[0]
    retention_matrix = cohort_counts.divide(cohort_size, axis=0)

    retention_matrix = retention_matrix.clip(upper=1.0)

    retention_matrix.index = retention_matrix.index.astype(str)
    retention_matrix.columns = [
        f'周期{i}' if i > 0 else '新增用户' 
        for i in retention_matrix.columns
    ]

    return retention_matrix


def rfm_analysis(df: pd.DataFrame, analysis_date: Optional[str] = None) -> pd.DataFrame:
    """
    RFM模型分析
    
    Args:
        df: 订单数据DataFrame
        analysis_date: 分析日期，格式为'YYYY-MM-DD'，默认为数据中最大日期
        
    Returns:
        带RFM评分和分层的用户DataFrame，包含列：
        user_id, Recency, Frequency, Monetary, R_score, F_score, M_score, RFM_score, RFM_segment
    """
    if df.empty:
        return pd.DataFrame()

    date_col = _find_field(df, DATE_FIELD_PATTERNS)
    user_col = _find_field(df, USER_ID_PATTERNS)
    order_col = _find_field(df, ORDER_ID_PATTERNS)
    amount_col = _find_field(df, AMOUNT_PATTERNS)

    _validate_dataframe(df, [
        (DATE_FIELD_PATTERNS, '日期字段'),
        (USER_ID_PATTERNS, '用户ID字段'),
        (ORDER_ID_PATTERNS, '订单ID字段'),
        (AMOUNT_PATTERNS, '金额字段')
    ])

    df = df.copy()
    df[date_col] = _to_datetime_series(df[date_col])

    if analysis_date is None:
        analysis_date = df[date_col].max()
    else:
        analysis_date = pd.to_datetime(analysis_date)

    rfm = df.groupby(user_col).agg(
        Recency=(date_col, lambda x: (analysis_date - x.max()).days),
        Frequency=(order_col, 'nunique'),
        Monetary=(amount_col, 'sum')
    ).reset_index()

    rfm.columns = [user_col, 'Recency', 'Frequency', 'Monetary']

    rfm['R_score'] = pd.qcut(rfm['Recency'].rank(method='first'), 5, labels=[5, 4, 3, 2, 1]).astype(int)
    rfm['F_score'] = pd.qcut(rfm['Frequency'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm['M_score'] = pd.qcut(rfm['Monetary'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)

    rfm['RFM_score'] = rfm['R_score'].astype(str) + rfm['F_score'].astype(str) + rfm['M_score'].astype(str)

    def _classify_segment(row):
        r, f, m = row['R_score'], row['F_score'], row['M_score']
        if r >= 4 and f >= 4 and m >= 4:
            return '重要价值用户'
        elif r >= 4 and f < 4 and m >= 4:
            return '重要发展用户'
        elif r < 4 and f >= 4 and m >= 4:
            return '重要保持用户'
        elif r < 4 and f < 4 and m >= 4:
            return '重要挽留用户'
        elif r >= 4 and f >= 4 and m < 4:
            return '一般价值用户'
        elif r >= 4 and f < 4 and m < 4:
            return '一般发展用户'
        elif r < 4 and f >= 4 and m < 4:
            return '一般保持用户'
        else:
            return '流失用户'

    rfm['RFM_segment'] = rfm.apply(_classify_segment, axis=1)

    return rfm


def category_sales_ratio(df: pd.DataFrame) -> pd.DataFrame:
    """
    计算各品类销售占比
    
    Args:
        df: 订单数据DataFrame（需包含品类、金额字段）
        
    Returns:
        包含品类、销售额、占比的DataFrame
    """
    if df.empty:
        return pd.DataFrame(columns=['category', 'sales', 'ratio'])

    category_col = _find_field(df, CATEGORY_PATTERNS)
    amount_col = _find_field(df, AMOUNT_PATTERNS)

    if category_col is None:
        return pd.DataFrame(columns=['category', 'sales', 'ratio'])

    _validate_dataframe(df, [
        (AMOUNT_PATTERNS, '金额字段')
    ])

    category_sales = df.groupby(category_col)[amount_col].sum().reset_index()
    category_sales.columns = ['category', 'sales']
    category_sales = category_sales.sort_values('sales', ascending=False)
    total_sales = category_sales['sales'].sum()
    category_sales['ratio'] = category_sales['sales'] / total_sales if total_sales > 0 else 0

    return category_sales.reset_index(drop=True)


def calculate_year_over_year(df: pd.DataFrame, current_period: str, compare_period: str) -> Dict:
    """
    计算同比数据
    
    Args:
        df: 订单数据DataFrame
        current_period: 当前期间，格式为'YYYY-MM'或'YYYY-MM-DD'
        compare_period: 对比期间（去年同期），格式同上
        
    Returns:
        包含同比数据的字典
    """
    date_col = _find_field(df, DATE_FIELD_PATTERNS)
    amount_col = _find_field(df, AMOUNT_PATTERNS)
    order_col = _find_field(df, ORDER_ID_PATTERNS)
    user_col = _find_field(df, USER_ID_PATTERNS)

    _validate_dataframe(df, [
        (DATE_FIELD_PATTERNS, '日期字段'),
        (AMOUNT_PATTERNS, '金额字段'),
        (ORDER_ID_PATTERNS, '订单ID字段'),
        (USER_ID_PATTERNS, '用户ID字段')
    ])

    df = df.copy()
    df[date_col] = _to_datetime_series(df[date_col])

    def _get_period_data(period_str: str) -> pd.DataFrame:
        period = pd.to_datetime(period_str)
        if len(period_str) == 7:
            mask = (df[date_col].dt.year == period.year) & (df[date_col].dt.month == period.month)
        else:
            mask = (df[date_col].dt.date == period.date())
        return df[mask]

    current_df = _get_period_data(current_period)
    compare_df = _get_period_data(compare_period)

    def _calc_metrics(data_df: pd.DataFrame) -> Dict:
        return {
            'sales': data_df[amount_col].sum() if not data_df.empty else 0,
            'orders': data_df[order_col].nunique() if not data_df.empty else 0,
            'users': data_df[user_col].nunique() if not data_df.empty else 0
        }

    current_metrics = _calc_metrics(current_df)
    compare_metrics = _calc_metrics(compare_df)

    def _calc_yoy(current: float, compare: float) -> float:
        if compare == 0:
            return float('inf') if current > 0 else 0
        return (current - compare) / compare

    return {
        'current_period': current_period,
        'compare_period': compare_period,
        'current': current_metrics,
        'compare': compare_metrics,
        'sales_yoy': _calc_yoy(current_metrics['sales'], compare_metrics['sales']),
        'orders_yoy': _calc_yoy(current_metrics['orders'], compare_metrics['orders']),
        'users_yoy': _calc_yoy(current_metrics['users'], compare_metrics['users'])
    }


def calculate_month_over_month(df: pd.DataFrame, current_period: str, compare_period: str) -> Dict:
    """
    计算环比数据
    
    Args:
        df: 订单数据DataFrame
        current_period: 当前期间，格式为'YYYY-MM'或'YYYY-MM-DD'
        compare_period: 对比期间（上月同期），格式同上
        
    Returns:
        包含环比数据的字典
    """
    return calculate_year_over_year(df, current_period, compare_period)
