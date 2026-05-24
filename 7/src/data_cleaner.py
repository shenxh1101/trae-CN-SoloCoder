"""
数据可视化仪表板 - 数据清洗工具模块
提供缺失值处理、异常值检测、重复值去重、列类型转换等功能
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Tuple, Optional, Union, Any
import json

import pandas as pd
import numpy as np


@dataclass
class CleanStep:
    """数据清洗步骤数据结构"""
    step_id: str = ''
    step_type: str = ''
    parameters: Dict[str, Any] = field(default_factory=dict)
    description: str = ''

    def to_dict(self) -> Dict[str, Any]:
        return {
            'step_id': self.step_id,
            'step_type': self.step_type,
            'parameters': self.parameters,
            'description': self.description
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CleanStep':
        return cls(
            step_id=data.get('step_id', ''),
            step_type=data.get('step_type', ''),
            parameters=data.get('parameters', {}),
            description=data.get('description', '')
        )


def handle_missing_values_single(
    df: pd.DataFrame,
    column: str,
    strategy: str,
    fill_value: Any = None
) -> Tuple[pd.DataFrame, CleanStep, Dict]:
    """
    处理单列缺失值

    Parameters
    ----------
    df : pd.DataFrame
        原始数据
    column : str
        要处理的列名
    strategy : str
        处理策略：'drop_row', 'drop_col', 'mean', 'median', 'mode', 'ffill', 'bfill', 'custom'
    fill_value : Any, optional
        自定义填充值，当strategy='custom'时使用

    Returns
    -------
    Tuple[pd.DataFrame, CleanStep, Dict]
        (处理后的数据, 清洗步骤, 处理报告)
    """
    if column not in df.columns:
        return df, CleanStep(), {'error': f'列 {column} 不存在'}

    original_missing = df[column].isna().sum()
    if original_missing == 0:
        return df, CleanStep(), {'info': f'列 {column} 没有缺失值'}

    result_df = df.copy()
    report = {'column': column, 'original_missing': int(original_missing)}

    if strategy == 'drop_row':
        result_df = result_df.dropna(subset=[column])
        report['action'] = f'删除了 {original_missing} 行含缺失值的数据'
        report['rows_removed'] = int(original_missing)

    elif strategy == 'drop_col':
        result_df = result_df.drop(columns=[column])
        report['action'] = f'删除了列 {column}'

    elif strategy == 'mean':
        if not pd.api.types.is_numeric_dtype(df[column]):
            return df, CleanStep(), {'error': f'列 {column} 不是数值类型，无法使用均值填充'}
        fill_val = df[column].mean()
        result_df[column] = result_df[column].fillna(fill_val)
        report['action'] = f'用均值 {fill_val:.4f} 填充'
        report['fill_value'] = fill_val

    elif strategy == 'median':
        if not pd.api.types.is_numeric_dtype(df[column]):
            return df, CleanStep(), {'error': f'列 {column} 不是数值类型，无法使用中位数填充'}
        fill_val = df[column].median()
        result_df[column] = result_df[column].fillna(fill_val)
        report['action'] = f'用中位数 {fill_val:.4f} 填充'
        report['fill_value'] = fill_val

    elif strategy == 'mode':
        mode_vals = df[column].mode()
        fill_val = mode_vals.iloc[0] if len(mode_vals) > 0 else '未知'
        result_df[column] = result_df[column].fillna(fill_val)
        report['action'] = f'用众数 {fill_val} 填充'
        report['fill_value'] = fill_val

    elif strategy == 'ffill':
        result_df[column] = result_df[column].ffill()
        remaining_missing = result_df[column].isna().sum()
        report['action'] = f'向前填充，剩余 {remaining_missing} 个缺失值'
        report['remaining_missing'] = int(remaining_missing)

    elif strategy == 'bfill':
        result_df[column] = result_df[column].bfill()
        remaining_missing = result_df[column].isna().sum()
        report['action'] = f'向后填充，剩余 {remaining_missing} 个缺失值'
        report['remaining_missing'] = int(remaining_missing)

    elif strategy == 'custom':
        if fill_value is None:
            return df, CleanStep(), {'error': '自定义填充值不能为空'}
        result_df[column] = result_df[column].fillna(fill_value)
        report['action'] = f'自定义填充值: {fill_value}'
        report['fill_value'] = fill_value

    else:
        return df, CleanStep(), {'error': f'不支持的策略: {strategy}'}

    step = CleanStep(
        step_type='handle_missing',
        parameters={
            'column': column,
            'strategy': strategy,
            'fill_value': fill_value
        },
        description=f"处理列'{column}'的缺失值: {report['action']}"
    )

    report['handled_count'] = int(original_missing - result_df[column].isna().sum()) if strategy != 'drop_col' else int(original_missing)

    return result_df, step, report


def detect_outliers_single(
    df: pd.DataFrame,
    column: str,
    method: str = 'iqr',
    threshold: float = 1.5,
    action: str = 'mark'
) -> Tuple[pd.DataFrame, CleanStep, Dict]:
    """
    检测并处理单列异常值

    Parameters
    ----------
    df : pd.DataFrame
        原始数据
    column : str
        要检测的列名
    method : str
        检测方法：'iqr' 或 'zscore'
    threshold : float
        异常值判定阈值
    action : str
        处理方式：'mark', 'remove', 'cap'

    Returns
    -------
    Tuple[pd.DataFrame, CleanStep, Dict]
        (处理后的数据, 清洗步骤, 检测报告)
    """
    if column not in df.columns:
        return df, CleanStep(), {'error': f'列 {column} 不存在'}

    if not pd.api.types.is_numeric_dtype(df[column]):
        return df, CleanStep(), {'error': f'列 {column} 不是数值类型'}

    result_df = df.copy()
    col_data = df[column].dropna()

    if len(col_data) == 0:
        return df, CleanStep(), {'error': f'列 {column} 没有有效数据'}

    if method == 'iqr':
        q1 = col_data.quantile(0.25)
        q3 = col_data.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - threshold * iqr
        upper_bound = q3 + threshold * iqr
        outlier_mask = (df[column] < lower_bound) | (df[column] > upper_bound)
        bounds = {'lower': float(lower_bound), 'upper': float(upper_bound), 'q1': float(q1), 'q3': float(q3), 'iqr': float(iqr)}

    elif method == 'zscore':
        mean_val = col_data.mean()
        std_val = col_data.std()
        if std_val == 0:
            return df, CleanStep(), {'error': f'列 {column} 标准差为0，无法使用Z-score检测'}
        lower_bound = mean_val - threshold * std_val
        upper_bound = mean_val + threshold * std_val
        z_scores = (df[column] - mean_val) / std_val
        outlier_mask = z_scores.abs() > threshold
        bounds = {'lower': float(lower_bound), 'upper': float(upper_bound), 'mean': float(mean_val), 'std': float(std_val)}

    else:
        return df, CleanStep(), {'error': f'不支持的检测方法: {method}'}

    outlier_mask = outlier_mask.fillna(False)
    outlier_count = int(outlier_mask.sum())

    report = {
        'column': column,
        'method': method,
        'threshold': threshold,
        'bounds': bounds,
        'outlier_count': outlier_count,
        'outlier_percentage': round(outlier_count / len(df) * 100, 2)
    }

    if outlier_count == 0:
        report['action'] = '未检测到异常值'
        step = CleanStep(
            step_type='detect_outliers',
            parameters={'column': column, 'method': method, 'threshold': threshold, 'action': action},
            description=f"检测列'{column}'的异常值: 未检测到异常值"
        )
        return result_df, step, report

    if action == 'mark':
        result_df[f'{column}_is_outlier'] = outlier_mask.astype(bool)
        report['action'] = f'标记了 {outlier_count} 个异常值'

    elif action == 'remove':
        result_df = result_df[~outlier_mask].reset_index(drop=True)
        report['action'] = f'删除了 {outlier_count} 行含异常值的数据'

    elif action == 'cap':
        result_df[column] = result_df[column].clip(lower=bounds['lower'], upper=bounds['upper'])
        report['action'] = f'盖帽处理了 {outlier_count} 个异常值'

    else:
        return df, CleanStep(), {'error': f'不支持的处理方式: {action}'}

    step = CleanStep(
        step_type='detect_outliers',
        parameters={'column': column, 'method': method, 'threshold': threshold, 'action': action},
        description=f"处理列'{column}'的异常值: {report['action']}"
    )

    return result_df, step, report


def remove_duplicates(
    df: pd.DataFrame,
    subset: Optional[List[str]] = None,
    keep: str = 'first'
) -> Tuple[pd.DataFrame, CleanStep, Dict]:
    """
    去除重复行

    Parameters
    ----------
    df : pd.DataFrame
        原始数据
    subset : List[str], optional
        用于判断重复的列名列表，None表示所有列
    keep : str
        保留方式：'first', 'last', False

    Returns
    -------
    Tuple[pd.DataFrame, CleanStep, Dict]
        (处理后的数据, 清洗步骤, 处理报告)
    """
    result_df = df.copy()
    before_count = len(result_df)

    result_df = result_df.drop_duplicates(subset=subset, keep=keep)
    after_count = len(result_df)
    removed_count = before_count - after_count

    report = {
        'before_count': before_count,
        'after_count': after_count,
        'removed_count': removed_count,
        'subset': subset if subset else 'all_columns',
        'keep': keep
    }

    step = CleanStep(
        step_type='remove_duplicates',
        parameters={'subset': subset, 'keep': keep},
        description=f"去重: 删除了 {removed_count} 行重复数据"
    )

    return result_df, step, report


def convert_column_type(
    df: pd.DataFrame,
    column: str,
    target_type: str,
    datetime_format: Optional[str] = None
) -> Tuple[pd.DataFrame, CleanStep, Dict]:
    """
    转换列的数据类型

    Parameters
    ----------
    df : pd.DataFrame
        原始数据
    column : str
        要转换的列名
    target_type : str
        目标类型：'int', 'float', 'str', 'datetime', 'category', 'bool'
    datetime_format : str, optional
        日期时间格式字符串

    Returns
    -------
    Tuple[pd.DataFrame, CleanStep, Dict]
        (处理后的数据, 清洗步骤, 转换报告)
    """
    if column not in df.columns:
        return df, CleanStep(), {'error': f'列 {column} 不存在'}

    result_df = df.copy()
    original_type = str(df[column].dtype)
    report = {
        'column': column,
        'original_type': original_type,
        'target_type': target_type
    }

    try:
        if target_type == 'int':
            result_df[column] = pd.to_numeric(df[column], errors='coerce').astype('Int64')
            converted_count = int(result_df[column].notna().sum())
            report['action'] = f'转换为整数类型，成功转换 {converted_count} 个值'

        elif target_type == 'float':
            result_df[column] = pd.to_numeric(df[column], errors='coerce')
            converted_count = int(result_df[column].notna().sum())
            report['action'] = f'转换为浮点类型，成功转换 {converted_count} 个值'

        elif target_type == 'str':
            result_df[column] = df[column].astype(str).replace({'nan': None, 'None': None})
            report['action'] = '转换为字符串类型'

        elif target_type == 'datetime':
            result_df[column] = pd.to_datetime(df[column], format=datetime_format, errors='coerce')
            converted_count = int(result_df[column].notna().sum())
            report['action'] = f'转换为日期时间类型，成功转换 {converted_count} 个值'
            if datetime_format:
                report['format'] = datetime_format

        elif target_type == 'category':
            result_df[column] = df[column].astype('category')
            categories_count = len(result_df[column].cat.categories)
            report['action'] = f'转换为分类类型，共 {categories_count} 个类别'

        elif target_type == 'bool':
            result_df[column] = df[column].astype(bool)
            report['action'] = '转换为布尔类型'

        else:
            return df, CleanStep(), {'error': f'不支持的目标类型: {target_type}'}

        report['new_type'] = str(result_df[column].dtype)
        report['success'] = True

    except Exception as e:
        return df, CleanStep(), {'error': f'类型转换失败: {str(e)}'}

    step = CleanStep(
        step_type='convert_type',
        parameters={'column': column, 'target_type': target_type, 'datetime_format': datetime_format},
        description=f"转换列'{column}'的类型: {original_type} -> {target_type}"
    )

    return result_df, step, report


def rename_column(
    df: pd.DataFrame,
    old_name: str,
    new_name: str
) -> Tuple[pd.DataFrame, CleanStep, Dict]:
    """
    重命名列

    Parameters
    ----------
    df : pd.DataFrame
        原始数据
    old_name : str
        原列名
    new_name : str
        新列名

    Returns
    -------
    Tuple[pd.DataFrame, CleanStep, Dict]
        (处理后的数据, 清洗步骤, 重命名报告)
    """
    if old_name not in df.columns:
        return df, CleanStep(), {'error': f'列 {old_name} 不存在'}

    result_df = df.copy()
    result_df = result_df.rename(columns={old_name: new_name})

    report = {
        'old_name': old_name,
        'new_name': new_name,
        'action': f'列名已从 "{old_name}" 改为 "{new_name}"'
    }

    step = CleanStep(
        step_type='rename_column',
        parameters={'old_name': old_name, 'new_name': new_name},
        description=f"重命名列: '{old_name}' -> '{new_name}'"
    )

    return result_df, step, report


def drop_column(
    df: pd.DataFrame,
    column: str
) -> Tuple[pd.DataFrame, CleanStep, Dict]:
    """
    删除列

    Parameters
    ----------
    df : pd.DataFrame
        原始数据
    column : str
        要删除的列名

    Returns
    -------
    Tuple[pd.DataFrame, CleanStep, Dict]
        (处理后的数据, 清洗步骤, 删除报告)
    """
    if column not in df.columns:
        return df, CleanStep(), {'error': f'列 {column} 不存在'}

    result_df = df.copy()
    result_df = result_df.drop(columns=[column])

    report = {
        'column': column,
        'action': f'已删除列 "{column}"'
    }

    step = CleanStep(
        step_type='drop_column',
        parameters={'column': column},
        description=f"删除列: '{column}'"
    )

    return result_df, step, report


def execute_clean_step(
    df: pd.DataFrame,
    step: CleanStep
) -> Tuple[pd.DataFrame, Dict]:
    """
    执行单个清洗步骤

    Parameters
    ----------
    df : pd.DataFrame
        输入数据
    step : CleanStep
        清洗步骤

    Returns
    -------
    Tuple[pd.DataFrame, Dict]
        (处理后的数据, 执行报告)
    """
    params = step.parameters

    if step.step_type == 'handle_missing':
        return handle_missing_values_single(
            df,
            column=params.get('column', ''),
            strategy=params.get('strategy', ''),
            fill_value=params.get('fill_value')
        )[0::2]

    elif step.step_type == 'detect_outliers':
        return detect_outliers_single(
            df,
            column=params.get('column', ''),
            method=params.get('method', 'iqr'),
            threshold=params.get('threshold', 1.5),
            action=params.get('action', 'mark')
        )[0::2]

    elif step.step_type == 'remove_duplicates':
        return remove_duplicates(
            df,
            subset=params.get('subset'),
            keep=params.get('keep', 'first')
        )[0::2]

    elif step.step_type == 'convert_type':
        return convert_column_type(
            df,
            column=params.get('column', ''),
            target_type=params.get('target_type', ''),
            datetime_format=params.get('datetime_format')
        )[0::2]

    elif step.step_type == 'rename_column':
        return rename_column(
            df,
            old_name=params.get('old_name', ''),
            new_name=params.get('new_name', '')
        )[0::2]

    elif step.step_type == 'drop_column':
        return drop_column(
            df,
            column=params.get('column', '')
        )[0::2]

    else:
        return df, {'error': f'未知的步骤类型: {step.step_type}'}


def get_missing_value_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    获取缺失值汇总信息

    Parameters
    ----------
    df : pd.DataFrame
        输入数据

    Returns
    -------
    pd.DataFrame
        缺失值汇总表
    """
    summary = pd.DataFrame({
        '列名': df.columns,
        '缺失值数量': df.isna().sum().values,
        '缺失值比例': (df.isna().sum() / len(df) * 100).round(2).values
    })
    summary = summary[summary['缺失值数量'] > 0].sort_values('缺失值数量', ascending=False)
    return summary.reset_index(drop=True)


def get_column_type_options() -> List[Dict[str, str]]:
    """
    获取支持的列类型转换选项

    Returns
    -------
    List[Dict[str, str]]
        类型选项列表
    """
    return [
        {'value': 'int', 'label': '整数 (Integer)'},
        {'value': 'float', 'label': '浮点数 (Float)'},
        {'value': 'str', 'label': '字符串 (String)'},
        {'value': 'datetime', 'label': '日期时间 (DateTime)'},
        {'value': 'category', 'label': '分类 (Category)'},
        {'value': 'bool', 'label': '布尔 (Boolean)'}
    ]


def get_missing_value_strategies() -> List[Dict[str, str]]:
    """
    获取缺失值处理策略选项

    Returns
    -------
    List[Dict[str, str]]
        策略选项列表
    """
    return [
        {'value': 'drop_row', 'label': '删除含缺失值的行'},
        {'value': 'drop_col', 'label': '删除整个列'},
        {'value': 'mean', 'label': '均值填充（仅数值列）'},
        {'value': 'median', 'label': '中位数填充（仅数值列）'},
        {'value': 'mode', 'label': '众数填充'},
        {'value': 'ffill', 'label': '向前填充'},
        {'value': 'bfill', 'label': '向后填充'},
        {'value': 'custom', 'label': '自定义填充值'}
    ]
