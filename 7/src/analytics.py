"""
高级分析模块
提供关联分析、时间序列分析、预测分析、价格敏感度分析等高级分析功能
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional, Dict
from scipy import signal
from statsmodels.tsa.holtwinters import SimpleExpSmoothing, Holt

try:
    from mlxtend.frequent_patterns import apriori, association_rules
except ImportError:
    apriori = None
    association_rules = None

from .metrics import (
    _find_field, _to_datetime_series, _validate_dataframe,
    DATE_FIELD_PATTERNS, USER_ID_PATTERNS, ORDER_ID_PATTERNS,
    AMOUNT_PATTERNS, QUANTITY_PATTERNS
)

PRODUCT_ID_PATTERNS = [
    'product_id', '商品ID', '产品ID', 'product', 'sku', 'SKU'
]

PRODUCT_NAME_PATTERNS = [
    'product_name', '商品名称', '产品名称', '商品名', 'name'
]

DISCOUNT_PATTERNS = [
    'discount', '折扣', '折扣率', 'discount_rate'
]

UNIT_PRICE_PATTERNS = [
    'unit_price', '单价', '售价', 'price'
]


def apriori_analysis(
    df: pd.DataFrame,
    min_support: float = 0.01,
    min_confidence: float = 0.3,
    min_lift: float = 1.0
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    使用Apriori算法进行商品关联分析

    将订单商品数据转换为one-hot编码的购物篮格式，挖掘频繁项集和关联规则。

    Args:
        df: 订单商品明细DataFrame，需包含订单ID和商品ID/名称字段
        min_support: 最小支持度阈值，默认0.01
        min_confidence: 最小置信度阈值，默认0.3
        min_lift: 最小提升度阈值，默认1.0

    Returns:
        元组 (规则DataFrame, 频繁项集DataFrame)
        - 规则DataFrame包含列: antecedents(前件), consequents(后件),
          antecedent_support, consequent_support, support(支持度),
          confidence(置信度), lift(提升度), leverage, conviction
        - 频繁项集DataFrame包含列: itemsets, support

    Raises:
        ImportError: 当mlxtend库未安装时
        ValueError: 当数据缺少必要字段或参数无效时
    """
    if apriori is None or association_rules is None:
        raise ImportError("请先安装mlxtend库: pip install mlxtend")

    if df.empty:
        return pd.DataFrame(columns=[
            'antecedents', 'consequents', 'antecedent_support',
            'consequent_support', 'support', 'confidence', 'lift',
            'leverage', 'conviction'
        ]), pd.DataFrame(columns=['itemsets', 'support'])

    if not (0 < min_support <= 1):
        raise ValueError("min_support 必须在 (0, 1] 范围内")
    if not (0 < min_confidence <= 1):
        raise ValueError("min_confidence 必须在 (0, 1] 范围内")
    if min_lift < 0:
        raise ValueError("min_lift 必须大于等于0")

    order_col = _find_field(df, ORDER_ID_PATTERNS)
    product_col = _find_field(df, PRODUCT_ID_PATTERNS) or _find_field(df, PRODUCT_NAME_PATTERNS)

    _validate_dataframe(df, [
        (ORDER_ID_PATTERNS, '订单ID字段'),
        (PRODUCT_ID_PATTERNS + PRODUCT_NAME_PATTERNS, '商品ID/名称字段')
    ])

    try:
        basket = df.groupby([order_col, product_col]).size().unstack(fill_value=0)
        basket_sets = basket.apply(lambda x: x.map(lambda v: 1 if v > 0 else 0))

        frequent_itemsets = apriori(
            basket_sets,
            min_support=min_support,
            use_colnames=True,
            verbose=0
        )

        if frequent_itemsets.empty:
            return pd.DataFrame(columns=[
                'antecedents', 'consequents', 'antecedent_support',
                'consequent_support', 'support', 'confidence', 'lift',
                'leverage', 'conviction'
            ]), pd.DataFrame(columns=['itemsets', 'support'])

        rules = association_rules(
            frequent_itemsets,
            metric="confidence",
            min_threshold=min_confidence
        )

        if not rules.empty and 'lift' in rules.columns:
            rules = rules[rules['lift'] >= min_lift]

        rules = rules.sort_values('lift', ascending=False).reset_index(drop=True)
        frequent_itemsets = frequent_itemsets.sort_values(
            'support', ascending=False
        ).reset_index(drop=True)

        return rules, frequent_itemsets

    except Exception as e:
        raise RuntimeError(f"关联分析执行失败: {str(e)}") from e


def detect_peaks_valleys(
    series: pd.Series,
    prominence: float = 0.1
) -> pd.DataFrame:
    """
    检测时间序列中的高峰和低谷

    使用scipy.signal.find_peaks检测局部峰值和谷值，适用于销售趋势、
    用户活跃度等时间序列数据的异常点识别。

    Args:
        series: 时间序列数据，索引应为日期时间类型
        prominence: 峰值/谷值的显著度参数，用于过滤噪声，默认0.1。
                   表示峰值需要比周围至少高出该值的比例（相对于数据范围）

    Returns:
        包含检测结果的DataFrame，列包括:
        - date: 日期
        - value: 数值
        - type: 类型 ('peak' 表示高峰, 'valley' 表示低谷)

    Raises:
        ValueError: 当输入数据为空或无效时
    """
    if series is None or len(series) == 0:
        return pd.DataFrame(columns=['date', 'value', 'type'])

    if not isinstance(series, pd.Series):
        raise TypeError("series 必须是 pandas.Series 类型")

    if prominence <= 0:
        raise ValueError("prominence 必须大于0")

    series_clean = series.dropna()
    if len(series_clean) < 3:
        return pd.DataFrame(columns=['date', 'value', 'type'])

    try:
        data_range = series_clean.max() - series_clean.min()
        if data_range == 0:
            return pd.DataFrame(columns=['date', 'value', 'type'])

        prominence_abs = prominence * data_range

        peak_indices, _ = signal.find_peaks(
            series_clean.values,
            prominence=prominence_abs
        )

        valley_indices, _ = signal.find_peaks(
            -series_clean.values,
            prominence=prominence_abs
        )

        results = []

        for idx in peak_indices:
            results.append({
                'date': series_clean.index[idx],
                'value': float(series_clean.iloc[idx]),
                'type': 'peak'
            })

        for idx in valley_indices:
            results.append({
                'date': series_clean.index[idx],
                'value': float(series_clean.iloc[idx]),
                'type': 'valley'
            })

        if not results:
            return pd.DataFrame(columns=['date', 'value', 'type'])

        result_df = pd.DataFrame(results)
        result_df = result_df.sort_values('date').reset_index(drop=True)

        return result_df

    except Exception as e:
        raise RuntimeError(f"峰谷检测执行失败: {str(e)}") from e


def moving_average_forecast(
    series: pd.Series,
    window: int = 7,
    periods: int = 30
) -> pd.DataFrame:
    """
    简单移动平均预测

    使用历史数据的移动平均值作为预测值，并计算95%置信区间。

    Args:
        series: 历史时间序列数据，索引应为日期时间类型
        window: 移动平均窗口大小，默认7
        periods: 预测期数，默认30

    Returns:
        包含预测结果的DataFrame，列包括:
        - date: 日期
        - actual: 历史实际值（预测期为NaN）
        - forecast: 预测值（历史期为NaN）
        - lower: 置信区间下限
        - upper: 置信区间上限
        - type: 类型 ('actual' 表示历史数据, 'forecast' 表示预测数据)

    Raises:
        ValueError: 当输入数据为空或参数无效时
    """
    if series is None or len(series) == 0:
        return pd.DataFrame(columns=['date', 'actual', 'forecast', 'lower', 'upper'])

    if not isinstance(series, pd.Series):
        raise TypeError("series 必须是 pandas.Series 类型")

    if window < 1:
        raise ValueError("window 必须大于等于1")
    if periods < 1:
        raise ValueError("periods 必须大于等于1")

    series_clean = series.dropna()
    if len(series_clean) < window:
        raise ValueError(f"历史数据长度 ({len(series_clean)}) 必须大于等于窗口大小 ({window})")

    try:
        ma = series_clean.rolling(window=window).mean()
        std = series_clean.rolling(window=window).std()

        last_ma = ma.iloc[-1]
        last_std = std.iloc[-1] if not pd.isna(std.iloc[-1]) else series_clean.std()

        last_date = series_clean.index[-1]
        if isinstance(last_date, pd.Timestamp):
            freq = pd.infer_freq(series_clean.index) or 'D'
            future_dates = pd.date_range(start=last_date, periods=periods + 1, freq=freq)[1:]
        else:
            future_dates = pd.RangeIndex(
                start=last_date + 1,
                stop=last_date + periods + 1
            )

        forecast_values = [last_ma] * periods
        margin = 1.96 * last_std
        lower_values = [last_ma - margin] * periods
        upper_values = [last_ma + margin] * periods

        history_df = pd.DataFrame({
            'date': series_clean.index,
            'actual': series_clean.values,
            'forecast': np.nan,
            'lower': np.nan,
            'upper': np.nan,
            'type': 'actual'
        })

        forecast_df = pd.DataFrame({
            'date': future_dates,
            'actual': np.nan,
            'forecast': forecast_values,
            'lower': lower_values,
            'upper': upper_values,
            'type': 'forecast'
        })

        result_df = pd.concat([history_df, forecast_df], ignore_index=True)
        result_df = result_df.sort_values('date').reset_index(drop=True)

        return result_df

    except Exception as e:
        raise RuntimeError(f"移动平均预测执行失败: {str(e)}") from e


def exponential_smoothing_forecast(
    series: pd.Series,
    alpha: Optional[float] = None,
    periods: int = 30
) -> pd.DataFrame:
    """
    指数平滑预测

    使用statsmodels的SimpleExpSmoothing进行指数平滑预测。
    当存在趋势时自动使用Holt线性趋势模型。自动优化平滑参数。

    Args:
        series: 历史时间序列数据，索引应为日期时间类型
        alpha: 平滑参数，范围(0,1)。为None时自动优化参数，默认None
        periods: 预测期数，默认30

    Returns:
        包含预测结果的DataFrame，列包括:
        - date: 日期
        - actual: 历史实际值（预测期为NaN）
        - forecast: 预测值（历史期为拟合值）
        - lower: 95%置信区间下限
        - upper: 95%置信区间上限

    Raises:
        ValueError: 当输入数据为空或参数无效时
    """
    if series is None or len(series) == 0:
        return pd.DataFrame(columns=['date', 'actual', 'forecast', 'lower', 'upper'])

    if not isinstance(series, pd.Series):
        raise TypeError("series 必须是 pandas.Series 类型")

    if alpha is not None and not (0 < alpha < 1):
        raise ValueError("alpha 必须在 (0, 1) 范围内")
    if periods < 1:
        raise ValueError("periods 必须大于等于1")

    series_clean = series.dropna()
    if len(series_clean) < 4:
        raise ValueError(f"历史数据长度 ({len(series_clean)}) 必须大于等于4")

    try:
        series_clean = series_clean.asfreq(pd.infer_freq(series_clean.index) or 'D')
        series_clean = series_clean.ffill().bfill()

        has_trend = _detect_trend(series_clean)

        if has_trend:
            model = Holt(series_clean)
            if alpha is not None:
                fit = model.fit(smoothing_level=alpha, smoothing_trend=alpha * 0.5)
            else:
                fit = model.fit(optimized=True)
        else:
            model = SimpleExpSmoothing(series_clean)
            if alpha is not None:
                fit = model.fit(smoothing_level=alpha, optimized=False)
            else:
                fit = model.fit(optimized=True)

        fitted_values = fit.fittedvalues
        residuals = series_clean - fitted_values
        residual_std = residuals.std() if len(residuals) > 1 else series_clean.std() * 0.1

        forecast = fit.forecast(periods)
        margin = 1.96 * residual_std
        lower = forecast - margin
        upper = forecast + margin

        history_df = pd.DataFrame({
            'date': series_clean.index,
            'actual': series_clean.values,
            'forecast': fitted_values.values,
            'lower': fitted_values.values - margin,
            'upper': fitted_values.values + margin
        })

        forecast_df = pd.DataFrame({
            'date': forecast.index,
            'actual': np.nan,
            'forecast': forecast.values,
            'lower': lower.values,
            'upper': upper.values
        })

        result_df = pd.concat([history_df, forecast_df], ignore_index=True)
        result_df = result_df.sort_values('date').reset_index(drop=True)

        return result_df

    except Exception as e:
        raise RuntimeError(f"指数平滑预测执行失败: {str(e)}") from e


def _detect_trend(series: pd.Series) -> bool:
    """
    检测时间序列是否存在趋势（内部辅助函数）
    """
    if len(series) < 10:
        return False

    x = np.arange(len(series))
    y = series.values
    slope, _ = np.polyfit(x, y, 1)
    y_mean = np.mean(y)

    if y_mean == 0:
        return False

    trend_strength = abs(slope) * len(series) / abs(y_mean)
    return trend_strength > 0.05


def price_sensitivity_analysis(
    df: pd.DataFrame,
    discount_bins: int = 10
) -> Tuple[pd.DataFrame, float]:
    """
    价格敏感度分析

    按折扣率分组统计销量、销售额、均价，计算价格弹性系数。
    价格弹性系数 = 销量变化率 / 价格变化率

    Args:
        df: 订单商品明细DataFrame，需包含折扣、单价、数量、金额等字段
        discount_bins: 折扣区间分箱数量，默认10

    Returns:
        元组 (折扣区间统计DataFrame, 价格弹性系数)
        - 折扣区间统计DataFrame包含列: discount_bin, discount_mean,
          quantity, sales, avg_price, quantity_change, price_change
        - 价格弹性系数：表示价格每变化1%，销量变化的百分比

    Raises:
        ValueError: 当数据缺少必要字段或参数无效时
    """
    if df.empty:
        return pd.DataFrame(columns=[
            'discount_bin', 'discount_mean', 'quantity',
            'sales', 'avg_price', 'quantity_change', 'price_change'
        ]), 0.0

    if discount_bins < 2:
        raise ValueError("discount_bins 必须大于等于2")

    discount_col = _find_field(df, DISCOUNT_PATTERNS)
    price_col = _find_field(df, UNIT_PRICE_PATTERNS)
    quantity_col = _find_field(df, QUANTITY_PATTERNS)
    amount_col = _find_field(df, AMOUNT_PATTERNS)

    _validate_dataframe(df, [
        (DISCOUNT_PATTERNS, '折扣字段'),
        (UNIT_PRICE_PATTERNS, '单价字段'),
        (QUANTITY_PATTERNS, '数量字段'),
        (AMOUNT_PATTERNS, '金额字段')
    ])

    try:
        df_clean = df[[discount_col, price_col, quantity_col, amount_col]].copy()
        df_clean = df_clean.dropna()
        df_clean = df_clean[df_clean[quantity_col] > 0]
        df_clean = df_clean[df_clean[price_col] > 0]

        if df_clean.empty:
            return pd.DataFrame(columns=[
                'discount_bin', 'discount_mean', 'quantity',
                'sales', 'avg_price', 'quantity_change', 'price_change'
            ]), 0.0

        df_clean['_actual_price'] = df_clean[amount_col] / df_clean[quantity_col]

        try:
            df_clean['_discount_bin'] = pd.qcut(
                df_clean[discount_col],
                q=discount_bins,
                labels=False,
                duplicates='drop'
            )
        except ValueError:
            df_clean['_discount_bin'] = pd.cut(
                df_clean[discount_col],
                bins=discount_bins,
                labels=False,
                include_lowest=True
            )

        grouped = df_clean.groupby('_discount_bin').agg({
            discount_col: 'mean',
            quantity_col: 'sum',
            amount_col: 'sum',
            '_actual_price': 'mean'
        }).reset_index()

        grouped.columns = [
            'discount_bin', 'discount_mean', 'quantity', 'sales', 'avg_price'
        ]
        grouped = grouped.sort_values('discount_bin').reset_index(drop=True)

        grouped['quantity_change'] = grouped['quantity'].pct_change()
        grouped['price_change'] = grouped['avg_price'].pct_change()

        grouped['quantity_change'] = grouped['quantity_change'].fillna(0)
        grouped['price_change'] = grouped['price_change'].fillna(0)

        valid_rows = grouped[
            (grouped['price_change'] != 0) &
            (~grouped['quantity_change'].isna()) &
            (~grouped['price_change'].isna())
        ]

        if len(valid_rows) >= 2:
            elasticities = valid_rows['quantity_change'] / valid_rows['price_change']
            elasticity = float(elasticities.median())
        else:
            elasticity = 0.0

        elasticity = elasticity if np.isfinite(elasticity) else 0.0

        return grouped, elasticity

    except Exception as e:
        raise RuntimeError(f"价格敏感度分析执行失败: {str(e)}") from e


def get_top_high_value_users(
    rfm_df: pd.DataFrame,
    top_n: int = 100,
    segment: Optional[str] = None
) -> pd.DataFrame:
    """
    从RFM分析结果中提取高价值用户列表

    基于RFM评分和分层，筛选出最有价值的用户。可按特定分层筛选，
    或默认按综合价值排序取前N个用户。

    Args:
        rfm_df: RFM分析结果DataFrame，需包含RFM分析输出的标准列
        top_n: 返回的用户数量，默认100
        segment: 可选，按指定分层筛选，如 '重要价值用户'。
                为None时不限制分层，按综合价值排序。

    Returns:
        高价值用户DataFrame，包含RFM分析的所有列，按价值排序

    Raises:
        ValueError: 当数据为空、缺少必要字段或参数无效时
    """
    if rfm_df.empty:
        return pd.DataFrame()

    if top_n < 1:
        raise ValueError("top_n 必须大于等于1")

    required_cols = ['R_score', 'F_score', 'M_score', 'Recency', 'Frequency', 'Monetary']
    missing_cols = [col for col in required_cols if col not in rfm_df.columns]
    if missing_cols:
        raise ValueError(f"RFM数据缺少必要字段: {', '.join(missing_cols)}")

    try:
        result_df = rfm_df.copy()

        if segment is not None:
            if 'RFM_segment' not in result_df.columns:
                raise ValueError("RFM数据缺少 'RFM_segment' 字段，无法按分层筛选")
            result_df = result_df[result_df['RFM_segment'] == segment]
            if result_df.empty:
                return pd.DataFrame(columns=rfm_df.columns)

        result_df['_composite_score'] = (
            result_df['R_score'] * 0.15 +
            result_df['F_score'] * 0.35 +
            result_df['M_score'] * 0.50
        )

        result_df = result_df.sort_values(
            by=['_composite_score', 'Monetary', 'Frequency'],
            ascending=[False, False, False]
        )

        result_df = result_df.head(top_n).reset_index(drop=True)
        result_df = result_df.drop(columns=['_composite_score'])

        return result_df

    except Exception as e:
        raise RuntimeError(f"高价值用户提取失败: {str(e)}") from e
