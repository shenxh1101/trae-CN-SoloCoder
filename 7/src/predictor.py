"""
数据可视化仪表板 - 预测分析模块
支持ARIMA和线性回归模型，提供时间序列预测功能
"""

import warnings
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px

warnings.filterwarnings('ignore')

PRIMARY_COLOR = '#1e3a5f'
ACCENT_COLOR = '#f97316'


@dataclass
class PredictionConfig:
    """预测配置数据结构"""
    time_column: str = ''
    value_column: str = ''
    model_type: str = 'auto'
    forecast_periods: int = 30
    confidence_level: float = 0.95
    frequency: str = 'auto'


@dataclass
class PredictionResult:
    """预测结果数据结构"""
    model_type: str = ''
    config: PredictionConfig = field(default_factory=PredictionConfig)
    historical_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    forecast_data: pd.DataFrame = field(default_factory=pd.DataFrame)
    metrics: Dict[str, float] = field(default_factory=dict)
    model: Any = None
    is_fitted: bool = False


def detect_frequency(df: pd.DataFrame, time_column: str) -> str:
    """
    自动检测时间序列频率

    Parameters
    ----------
    df : pd.DataFrame
        输入数据
    time_column : str
        时间列名

    Returns
    -------
    str
        频率标识：'D'（日）, 'W'（周）, 'M'（月）, 'Q'（季）, 'Y'（年）
    """
    try:
        time_series = pd.to_datetime(df[time_column]).sort_values()
        time_series = time_series.dropna()

        if len(time_series) < 2:
            return 'D'

        diffs = time_series.diff().dropna()

        median_diff = diffs.median()

        if median_diff <= timedelta(days=1):
            return 'D'
        elif median_diff <= timedelta(days=7):
            return 'W'
        elif median_diff <= timedelta(days=31):
            return 'M'
        elif median_diff <= timedelta(days=92):
            return 'Q'
        else:
            return 'Y'
    except Exception:
        return 'D'


def prepare_time_series(
    df: pd.DataFrame,
    time_column: str,
    value_column: str,
    frequency: str = 'auto'
) -> Tuple[pd.DataFrame, str]:
    """
    准备时间序列数据

    Parameters
    ----------
    df : pd.DataFrame
        输入数据
    time_column : str
        时间列名
    value_column : str
        数值列名
    frequency : str
        时间频率，'auto'表示自动检测

    Returns
    -------
    Tuple[pd.DataFrame, str]
        (预处理后的时间序列DataFrame, 检测到的频率)
    """
    result_df = df.copy()

    result_df[time_column] = pd.to_datetime(result_df[time_column], errors='coerce')
    result_df = result_df.dropna(subset=[time_column, value_column])

    result_df = result_df.sort_values(time_column)

    if frequency == 'auto':
        frequency = detect_frequency(result_df, time_column)

    result_df = result_df[[time_column, value_column]].copy()
    result_df.columns = ['ds', 'y']

    result_df = result_df.groupby('ds')['y'].sum().reset_index()

    result_df = result_df.set_index('ds')
    result_df = result_df.asfreq(frequency)
    result_df = result_df.interpolate(method='time')
    result_df = result_df.reset_index()

    return result_df, frequency


def auto_select_model(ts_df: pd.DataFrame) -> str:
    """
    自动选择合适的预测模型

    Parameters
    ----------
    ts_df : pd.DataFrame
        预处理后的时间序列数据

    Returns
    -------
    str
        模型类型：'arima' 或 'linear'
    """
    if len(ts_df) < 30:
        return 'linear'

    try:
        from statsmodels.tsa.stattools import adfuller

        y = ts_df['y'].values
        adf_result = adfuller(y)

        if adf_result[1] < 0.05:
            return 'arima'
        else:
            diff = np.diff(y)
            adf_diff = adfuller(diff)
            if adf_diff[1] < 0.05:
                return 'arima'
            else:
                return 'linear'
    except Exception:
        return 'linear'


def fit_linear_regression(
    ts_df: pd.DataFrame,
    forecast_periods: int = 30,
    confidence_level: float = 0.95
) -> PredictionResult:
    """
    使用线性回归模型进行预测

    Parameters
    ----------
    ts_df : pd.DataFrame
        预处理后的时间序列数据
    forecast_periods : int
        预测期数
    confidence_level : float
        置信水平

    Returns
    -------
    PredictionResult
        预测结果
    """
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    ts_df = ts_df.copy()
    ts_df['t'] = np.arange(len(ts_df))

    X = ts_df[['t']].values
    y = ts_df['y'].values

    model = LinearRegression()
    model.fit(X, y)

    y_pred = model.predict(X)

    mae = mean_absolute_error(y, y_pred)
    mse = mean_squared_error(y, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y, y_pred)

    residuals = y - y_pred
    std_resid = np.std(residuals)

    last_t = ts_df['t'].iloc[-1]
    future_t = np.arange(last_t + 1, last_t + forecast_periods + 1).reshape(-1, 1)

    forecast_values = model.predict(future_t)

    z_score = 1.96 if confidence_level == 0.95 else 1.645 if confidence_level == 0.90 else 2.576
    margin_of_error = z_score * std_resid * np.sqrt(1 + 1/len(y) + (future_t.flatten() - np.mean(X))**2 / np.sum((X - np.mean(X))**2))

    last_date = ts_df['ds'].iloc[-1]
    freq = pd.infer_freq(ts_df['ds']) or 'D'
    future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=forecast_periods, freq=freq)

    forecast_df = pd.DataFrame({
        'ds': future_dates,
        'yhat': forecast_values,
        'yhat_lower': forecast_values - margin_of_error,
        'yhat_upper': forecast_values + margin_of_error
    })

    config = PredictionConfig(
        forecast_periods=forecast_periods,
        confidence_level=confidence_level,
        frequency=freq
    )

    return PredictionResult(
        model_type='linear',
        config=config,
        historical_data=ts_df[['ds', 'y']].copy(),
        forecast_data=forecast_df,
        metrics={
            'mae': float(mae),
            'mse': float(mse),
            'rmse': float(rmse),
            'r2': float(r2),
            'slope': float(model.coef_[0]),
            'intercept': float(model.intercept_)
        },
        model=model,
        is_fitted=True
    )


def fit_arima(
    ts_df: pd.DataFrame,
    forecast_periods: int = 30,
    confidence_level: float = 0.95,
    order: Optional[Tuple[int, int, int]] = None
) -> PredictionResult:
    """
    使用ARIMA模型进行预测

    Parameters
    ----------
    ts_df : pd.DataFrame
        预处理后的时间序列数据
    forecast_periods : int
        预测期数
    confidence_level : float
        置信水平
    order : Tuple[int, int, int], optional
        ARIMA阶数 (p, d, q)，None表示自动选择

    Returns
    -------
    PredictionResult
        预测结果
    """
    try:
        from statsmodels.tsa.arima.model import ARIMA
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    except ImportError:
        return fit_linear_regression(ts_df, forecast_periods, confidence_level)

    ts_df = ts_df.copy()
    ts_df = ts_df.set_index('ds')

    y = ts_df['y'].values

    if order is None:
        order = _auto_arima_order(y)

    try:
        model = ARIMA(y, order=order)
        model_fit = model.fit()

        y_pred = model_fit.predict()

        mae = mean_absolute_error(y, y_pred)
        mse = mean_squared_error(y, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y, y_pred)

        forecast = model_fit.get_forecast(steps=forecast_periods)
        forecast_values = forecast.predicted_mean
        conf_int = forecast.conf_int(alpha=1 - confidence_level)

        last_date = ts_df.index[-1]
        freq = ts_df.index.freq or 'D'
        future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=forecast_periods, freq=freq)

        forecast_df = pd.DataFrame({
            'ds': future_dates,
            'yhat': forecast_values,
            'yhat_lower': conf_int[:, 0],
            'yhat_upper': conf_int[:, 1]
        }, index=future_dates)

        config = PredictionConfig(
            forecast_periods=forecast_periods,
            confidence_level=confidence_level,
            frequency=freq
        )

        historical_df = ts_df.reset_index()[['ds', 'y']].copy()
        historical_df['yhat'] = y_pred

        return PredictionResult(
            model_type='arima',
            config=config,
            historical_data=historical_df,
            forecast_data=forecast_df,
            metrics={
                'mae': float(mae),
                'mse': float(mse),
                'rmse': float(rmse),
                'r2': float(r2),
                'aic': float(model_fit.aic),
                'bic': float(model_fit.bic),
                'order_p': order[0],
                'order_d': order[1],
                'order_q': order[2]
            },
            model=model_fit,
            is_fitted=True
        )

    except Exception:
        return fit_linear_regression(ts_df.reset_index(), forecast_periods, confidence_level)


def _auto_arima_order(y: np.ndarray, max_p: int = 3, max_d: int = 2, max_q: int = 3) -> Tuple[int, int, int]:
    """
    自动选择ARIMA模型的阶数

    Parameters
    ----------
    y : np.ndarray
        时间序列数据
    max_p : int
        最大p值
    max_d : int
        最大d值
    max_q : int
        最大q值

    Returns
    -------
    Tuple[int, int, int]
        最优阶数 (p, d, q)
    """
    try:
        from statsmodels.tsa.arima.model import ARIMA

        best_aic = np.inf
        best_order = (1, 1, 1)

        for p in range(max_p + 1):
            for d in range(max_d + 1):
                for q in range(max_q + 1):
                    try:
                        model = ARIMA(y, order=(p, d, q))
                        model_fit = model.fit()
                        if model_fit.aic < best_aic:
                            best_aic = model_fit.aic
                            best_order = (p, d, q)
                    except Exception:
                        continue

        return best_order
    except Exception:
        return (1, 1, 1)


def predict(
    df: pd.DataFrame,
    time_column: str,
    value_column: str,
    model_type: str = 'auto',
    forecast_periods: int = 30,
    confidence_level: float = 0.95,
    frequency: str = 'auto'
) -> PredictionResult:
    """
    执行预测分析

    Parameters
    ----------
    df : pd.DataFrame
        输入数据
    time_column : str
        时间列名
    value_column : str
        数值列名
    model_type : str
        模型类型：'auto', 'arima', 'linear'
    forecast_periods : int
        预测期数
    confidence_level : float
        置信水平
    frequency : str
        时间频率

    Returns
    -------
    PredictionResult
        预测结果
    """
    if time_column not in df.columns:
        raise ValueError(f"时间列 '{time_column}' 不存在")

    if value_column not in df.columns:
        raise ValueError(f"数值列 '{value_column}' 不存在")

    if not pd.api.types.is_numeric_dtype(df[value_column]):
        raise ValueError(f"数值列 '{value_column}' 必须是数值类型")

    ts_df, detected_freq = prepare_time_series(df, time_column, value_column, frequency)

    if len(ts_df) < 5:
        raise ValueError("数据点太少，无法进行预测分析（至少需要5个有效数据点）")

    if model_type == 'auto':
        model_type = auto_select_model(ts_df)

    config = PredictionConfig(
        time_column=time_column,
        value_column=value_column,
        model_type=model_type,
        forecast_periods=forecast_periods,
        confidence_level=confidence_level,
        frequency=detected_freq if frequency == 'auto' else frequency
    )

    if model_type == 'arima':
        result = fit_arima(ts_df, forecast_periods, confidence_level)
    else:
        result = fit_linear_regression(ts_df, forecast_periods, confidence_level)

    result.config = config

    return result


def plot_prediction(
    result: PredictionResult,
    title: str = '时间序列预测'
) -> go.Figure:
    """
    绘制预测结果图表

    Parameters
    ----------
    result : PredictionResult
        预测结果
    title : str
        图表标题

    Returns
    -------
    go.Figure
        Plotly图表对象
    """
    if not result.is_fitted:
        fig = go.Figure()
        fig.update_layout(title='预测模型未训练', height=400)
        return fig

    fig = go.Figure()

    historical = result.historical_data
    forecast = result.forecast_data

    fig.add_trace(go.Scatter(
        x=historical['ds'],
        y=historical['y'],
        mode='lines+markers',
        name='历史数据',
        line=dict(color=PRIMARY_COLOR, width=2),
        marker=dict(size=6)
    ))

    if 'yhat' in historical.columns:
        fig.add_trace(go.Scatter(
            x=historical['ds'],
            y=historical['yhat'],
            mode='lines',
            name='历史拟合',
            line=dict(color='#3b82f6', width=2, dash='dash')
        ))

    fig.add_trace(go.Scatter(
        x=forecast['ds'],
        y=forecast['yhat'],
        mode='lines',
        name='预测值',
        line=dict(color=ACCENT_COLOR, width=3)
    ))

    fig.add_trace(go.Scatter(
        x=forecast['ds'],
        y=forecast['yhat_upper'],
        mode='lines',
        name=f'{int(result.config.confidence_level * 100)}% 置信上限',
        line=dict(color='rgba(249, 115, 22, 0.3)', width=1),
        showlegend=False
    ))

    fig.add_trace(go.Scatter(
        x=forecast['ds'],
        y=forecast['yhat_lower'],
        mode='lines',
        name=f'{int(result.config.confidence_level * 100)}% 置信下限',
        line=dict(color='rgba(249, 115, 22, 0.3)', width=1),
        fill='tonexty',
        fillcolor='rgba(249, 115, 22, 0.15)',
        showlegend=False
    ))

    fig.update_layout(
        title=dict(
            text=title,
            x=0.5,
            font=dict(size=18, color=PRIMARY_COLOR)
        ),
        xaxis_title='时间',
        yaxis_title=result.config.value_column,
        height=500,
        hovermode='x unified',
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=1.02,
            xanchor='right',
            x=1
        ),
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)'
    )

    fig.update_xaxes(
        gridcolor='#e5e7eb',
        zerolinecolor='#e5e7eb'
    )
    fig.update_yaxes(
        gridcolor='#e5e7eb',
        zerolinecolor='#e5e7eb'
    )

    return fig


def plot_prediction_components(
    result: PredictionResult
) -> Dict[str, go.Figure]:
    """
    绘制预测分析的各种组件图表

    Parameters
    ----------
    result : PredictionResult
        预测结果

    Returns
    -------
    Dict[str, go.Figure]
        组件图表面板
    """
    figures = {}

    if not result.is_fitted:
        return figures

    historical = result.historical_data
    forecast = result.forecast_data

    if 'yhat' in historical.columns:
        residuals = historical['y'] - historical['yhat']

        fig_residual = go.Figure()
        fig_residual.add_trace(go.Scatter(
            x=historical['ds'],
            y=residuals,
            mode='lines+markers',
            name='残差',
            line=dict(color='#ef4444', width=2),
            marker=dict(size=6)
        ))
        fig_residual.add_hline(
            y=0,
            line_dash='dash',
            line_color='#6b7280'
        )
        fig_residual.update_layout(
            title='残差分析',
            height=350,
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)'
        )
        figures['residual'] = fig_residual

        fig_resid_hist = px.histogram(
            x=residuals.dropna(),
            nbins=20,
            title='残差分布',
            color_discrete_sequence=['#8b5cf6']
        )
        fig_resid_hist.update_layout(
            height=350,
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)'
        )
        figures['residual_hist'] = fig_resid_hist

    metrics = result.metrics
    metric_names = ['MAE', 'MSE', 'RMSE', 'R²']
    metric_values = [
        metrics.get('mae', 0),
        metrics.get('mse', 0),
        metrics.get('rmse', 0),
        metrics.get('r2', 0)
    ]

    fig_metrics = go.Figure(go.Bar(
        x=metric_names,
        y=metric_values,
        marker_color=[PRIMARY_COLOR, '#3b82f6', '#10b981', ACCENT_COLOR],
        text=[f'{v:.4f}' for v in metric_values],
        textposition='auto'
    ))
    fig_metrics.update_layout(
        title='模型评估指标',
        height=350,
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)'
    )
    figures['metrics'] = fig_metrics

    return figures


def format_metrics_table(result: PredictionResult) -> pd.DataFrame:
    """
    格式化模型评估指标为DataFrame

    Parameters
    ----------
    result : PredictionResult
        预测结果

    Returns
    -------
    pd.DataFrame
        指标表格
    """
    if not result.is_fitted:
        return pd.DataFrame()

    metrics = result.metrics
    data = []

    data.append({'指标': '模型类型', '值': 'ARIMA' if result.model_type == 'arima' else '线性回归'})
    data.append({'指标': '预测期数', '值': result.config.forecast_periods})
    data.append({'指标': '置信水平', '值': f'{int(result.config.confidence_level * 100)}%'})
    data.append({'指标': 'MAE (平均绝对误差)', '值': f"{metrics.get('mae', 0):.4f}"})
    data.append({'指标': 'MSE (均方误差)', '值': f"{metrics.get('mse', 0):.4f}"})
    data.append({'指标': 'RMSE (均方根误差)', '值': f"{metrics.get('rmse', 0):.4f}"})
    data.append({'指标': 'R² (决定系数)', '值': f"{metrics.get('r2', 0):.4f}"})

    if result.model_type == 'arima':
        p = metrics.get('order_p', 1)
        d = metrics.get('order_d', 1)
        q = metrics.get('order_q', 1)
        data.append({'指标': 'ARIMA阶数', '值': f'({p}, {d}, {q})'})
        data.append({'指标': 'AIC', '值': f"{metrics.get('aic', 0):.4f}"})
        data.append({'指标': 'BIC', '值': f"{metrics.get('bic', 0):.4f}"})
    else:
        data.append({'指标': '斜率', '值': f"{metrics.get('slope', 0):.4f}"})
        data.append({'指标': '截距', '值': f"{metrics.get('intercept', 0):.4f}"})

    return pd.DataFrame(data)


def get_prediction_summary(result: PredictionResult) -> Dict[str, Any]:
    """
    获取预测结果摘要

    Parameters
    ----------
    result : PredictionResult
        预测结果

    Returns
    -------
    Dict[str, Any]
        摘要信息
    """
    if not result.is_fitted:
        return {}

    forecast = result.forecast_data
    historical = result.historical_data

    summary = {
        'model_type': 'ARIMA' if result.model_type == 'arima' else '线性回归',
        'forecast_periods': result.config.forecast_periods,
        'confidence_level': result.config.confidence_level,
        'historical_start': historical['ds'].min(),
        'historical_end': historical['ds'].max(),
        'forecast_start': forecast['ds'].min(),
        'forecast_end': forecast['ds'].max(),
        'total_forecast': float(forecast['yhat'].sum()),
        'avg_forecast': float(forecast['yhat'].mean()),
        'max_forecast': float(forecast['yhat'].max()),
        'min_forecast': float(forecast['yhat'].min()),
        'trend': '上升' if (forecast['yhat'].iloc[-1] > historical['y'].iloc[-1]) else '下降'
    }

    if result.metrics.get('r2', 0) >= 0.8:
        summary['model_quality'] = '优秀'
    elif result.metrics.get('r2', 0) >= 0.6:
        summary['model_quality'] = '良好'
    elif result.metrics.get('r2', 0) >= 0.4:
        summary['model_quality'] = '一般'
    else:
        summary['model_quality'] = '较差'

    return summary
