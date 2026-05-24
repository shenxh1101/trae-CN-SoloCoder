"""
电商数据分析平台 - 数据处理模块
提供数据加载、清洗、预处理、合并等核心功能
"""

import io
import re
from typing import List, Dict, Tuple, Optional, Union

import pandas as pd
import numpy as np


def load_files(uploaded_files: List) -> Dict[str, pd.DataFrame]:
    """
    读取Streamlit上传的文件列表，支持CSV和Excel格式，自动识别并返回DataFrame字典。

    Parameters
    ----------
    uploaded_files : List
        Streamlit上传的文件对象列表，每个对象需包含name属性和read()方法。

    Returns
    -------
    Dict[str, pd.DataFrame]
        以文件名为键，对应DataFrame为值的字典。
        读取失败的文件会在值中存储错误信息字符串。

    Notes
    -----
    - 支持的文件格式：.csv, .xlsx, .xls
    - CSV文件自动尝试多种编码（utf-8, gbk, utf-8-sig）
    - Excel文件支持多sheet，sheet名会附加到文件名后
    - 文件读取错误时会返回错误信息而非抛出异常

    Examples
    --------
    >>> uploaded = [st.file_uploader("上传文件")]
    >>> dfs = load_files(uploaded)
    >>> for name, df in dfs.items():
    ...     print(f"{name}: {len(df)} 行")
    """
    result = {}

    if not uploaded_files:
        return result

    for file in uploaded_files:
        if file is None:
            continue

        filename = file.name.lower()
        key_name = file.name

        try:
            if filename.endswith('.csv'):
                content = file.read()
                df = None
                for encoding in ['utf-8', 'gbk', 'utf-8-sig']:
                    try:
                        df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                        break
                    except (UnicodeDecodeError, pd.errors.EmptyDataError):
                        continue
                if df is None:
                    result[key_name] = f"错误：无法识别的CSV编码"
                else:
                    result[key_name] = df

            elif filename.endswith(('.xlsx', '.xls')):
                excel_file = pd.ExcelFile(file)
                sheet_names = excel_file.sheet_names
                if len(sheet_names) == 1:
                    df = excel_file.parse(sheet_names[0])
                    result[key_name] = df
                else:
                    for sheet in sheet_names:
                        df = excel_file.parse(sheet)
                        result[f"{key_name} - {sheet}"] = df
            else:
                result[key_name] = f"错误：不支持的文件格式"

        except Exception as e:
            result[key_name] = f"错误：{str(e)}"

    return result


def detect_table_type(df: pd.DataFrame) -> str:
    """
    通过字段名模式自动识别表类型，支持中英文字段名。

    Parameters
    ----------
    df : pd.DataFrame
        待识别的DataFrame。

    Returns
    -------
    str
        表类型：'orders'（订单表）/ 'products'（商品表）/ 'users'（用户表）/ 'unknown'（未知）。

    Notes
    -----
    识别规则：
    - 订单表(orders)：同时包含 order_id（或订单号、订单ID）、日期字段（如order_date、下单时间等）、
      金额字段（如amount、price、total、金额、总价等）
    - 商品表(products)：同时包含 product_id（或商品ID、商品编号）和商品名称字段
      （如product_name、商品名称、产品名等）
    - 用户表(users)：同时包含 user_id（或用户ID、用户编号）和用户信息字段
      （如username、name、email、phone、用户名、姓名、邮箱、电话等）
    - 均不满足则返回 'unknown'

    字段匹配不区分大小写，支持中英文混合。

    Examples
    --------
    >>> df = pd.DataFrame({'订单号': [1,2], '下单时间': ['2024-01-01'], '金额': [100, 200]})
    >>> detect_table_type(df)
    'orders'
    """
    if df is None or df.empty:
        return 'unknown'

    columns = [str(col).lower().strip() for col in df.columns]

    order_id_patterns = [r'order[_-]?id', r'订单[号编id]', r'订单[_-]?id']
    date_patterns = [
        r'order[_-]?date', r'date', r'time', r'datetime',
        r'日期', r'时间', r'下单', r'创建时间', r'订单日期', r'成交时间'
    ]
    amount_patterns = [
        r'amount', r'price', r'total', r'cost', r'fee',
        r'金额', r'价格', r'总价', r'费用', r'销售额', r'支付'
    ]

    product_id_patterns = [r'product[_-]?id', r'商品[号编id]', r'产品[号编id]', r'商品[_-]?id']
    product_name_patterns = [
        r'product[_-]?name', r'name', r'商品名称?', r'产品名称?', r'商品名', r'品名'
    ]

    user_id_patterns = [r'user[_-]?id', r'用户[号编id]', r'会员[号编id]', r'用户[_-]?id']
    user_info_patterns = [
        r'user[_-]?name', r'username', r'email', r'mail', r'phone', r'mobile', r'name',
        r'用户名', r'姓名', r'邮箱', r'电话', r'手机', r'地址', r'性别', r'年龄'
    ]

    def _match_patterns(cols: List[str], patterns: List[str]) -> bool:
        for col in cols:
            for pattern in patterns:
                if re.search(pattern, col, re.IGNORECASE):
                    return True
        return False

    has_order_id = _match_patterns(columns, order_id_patterns)
    has_date = _match_patterns(columns, date_patterns)
    has_amount = _match_patterns(columns, amount_patterns)

    if has_order_id and has_date and has_amount:
        return 'orders'

    has_product_id = _match_patterns(columns, product_id_patterns)
    has_product_name = _match_patterns(columns, product_name_patterns)

    if has_product_id and has_product_name:
        return 'products'

    has_user_id = _match_patterns(columns, user_id_patterns)
    has_user_info = _match_patterns(columns, user_info_patterns)

    if has_user_id and has_user_info:
        return 'users'

    return 'unknown'


def handle_missing_values(
    df: pd.DataFrame,
    strategy: str = 'auto',
    numeric_strategy: str = 'median',
    categorical_strategy: str = 'mode',
    custom_fill_value: Optional[Union[Dict, float, str]] = None
) -> Tuple[pd.DataFrame, Dict]:
    """
    处理DataFrame中的缺失值，支持多种策略。

    Parameters
    ----------
    df : pd.DataFrame
        待处理的DataFrame。
    strategy : str, optional
        缺失值处理策略，可选：
        - 'auto'：自动处理，数值列用numeric_strategy，分类列用categorical_strategy
        - 'drop'：删除含有缺失值的行
        - 'mean'：用均值填充（仅数值列）
        - 'median'：用中位数填充（仅数值列）
        - 'mode'：用众数填充
        - 'custom'：使用custom_fill_value填充
        默认值为 'auto'。
    numeric_strategy : str, optional
        数值列在strategy='auto'时的填充策略，可选 'mean'/'median'/'mode'，默认 'median'。
    categorical_strategy : str, optional
        分类列在strategy='auto'时的填充策略，可选 'mode'/'drop'，默认 'mode'。
    custom_fill_value : Dict or float or str, optional
        当strategy='custom'时使用的填充值。
        可为字典（键为列名，值为对应填充值）或统一值。

    Returns
    -------
    Tuple[pd.DataFrame, Dict]
        第一个元素为处理后的DataFrame，第二个元素为处理报告字典，包含：
        - 'original_missing_count': 原始缺失值总数
        - 'original_missing_by_col': 各列原始缺失值数量
        - 'handled_missing_count': 已处理的缺失值数量
        - 'remaining_missing_count': 剩余缺失值数量
        - 'strategy': 使用的处理策略
        - 'actions': 各列的具体处理操作

    Notes
    -----
    - 数值列判定：dtype为int64、float64、Int64、Float64等数值类型
    - 分类列判定：dtype为object、category、string等非数值类型
    - 当某列缺失值比例超过50%且strategy='auto'时，会优先考虑删除该列

    Examples
    --------
    >>> df = pd.DataFrame({'A': [1, None, 3], 'B': ['x', 'y', None]})
    >>> cleaned_df, report = handle_missing_values(df, strategy='auto')
    >>> print(report['handled_missing_count'])
    2
    """
    report = {
        'original_missing_count': 0,
        'original_missing_by_col': {},
        'handled_missing_count': 0,
        'remaining_missing_count': 0,
        'strategy': strategy,
        'actions': {}
    }

    if df is None or df.empty:
        return df, report

    result_df = df.copy()

    original_missing = result_df.isna().sum()
    report['original_missing_count'] = original_missing.sum()
    report['original_missing_by_col'] = original_missing.to_dict()

    if report['original_missing_count'] == 0:
        report['handled_missing_count'] = 0
        report['remaining_missing_count'] = 0
        return result_df, report

    numeric_cols = result_df.select_dtypes(include=['number']).columns.tolist()
    categorical_cols = result_df.select_dtypes(exclude=['number']).columns.tolist()

    if strategy == 'drop':
        before_count = len(result_df)
        result_df = result_df.dropna(axis=0)
        after_count = len(result_df)
        report['handled_missing_count'] = before_count - after_count
        report['actions'] = {'all_columns': f'删除了 {before_count - after_count} 行含缺失值的数据'}

    elif strategy == 'custom':
        if custom_fill_value is None:
            raise ValueError("strategy='custom'时必须提供custom_fill_value参数")

        if isinstance(custom_fill_value, dict):
            for col, value in custom_fill_value.items():
                if col in result_df.columns:
                    missing = result_df[col].isna().sum()
                    if missing > 0:
                        result_df[col] = result_df[col].fillna(value)
                        report['actions'][col] = f'自定义填充值: {value}, 填充 {missing} 个缺失值'
                        report['handled_missing_count'] += missing
        else:
            for col in result_df.columns:
                missing = result_df[col].isna().sum()
                if missing > 0:
                    result_df[col] = result_df[col].fillna(custom_fill_value)
                    report['actions'][col] = f'自定义填充值: {custom_fill_value}, 填充 {missing} 个缺失值'
                    report['handled_missing_count'] += missing

    elif strategy in ['mean', 'median', 'mode']:
        for col in numeric_cols:
            missing = result_df[col].isna().sum()
            if missing > 0:
                if strategy == 'mean':
                    fill_val = result_df[col].mean()
                elif strategy == 'median':
                    fill_val = result_df[col].median()
                else:
                    mode_vals = result_df[col].mode()
                    fill_val = mode_vals.iloc[0] if len(mode_vals) > 0 else 0

                result_df[col] = result_df[col].fillna(fill_val)
                report['actions'][col] = f'{strategy}填充: {fill_val:.4f}, 填充 {missing} 个缺失值'
                report['handled_missing_count'] += missing

        for col in categorical_cols:
            missing = result_df[col].isna().sum()
            if missing > 0:
                mode_vals = result_df[col].mode()
                fill_val = mode_vals.iloc[0] if len(mode_vals) > 0 else '未知'
                result_df[col] = result_df[col].fillna(fill_val)
                report['actions'][col] = f'众数填充: {fill_val}, 填充 {missing} 个缺失值'
                report['handled_missing_count'] += missing

    elif strategy == 'auto':
        for col in numeric_cols:
            missing = result_df[col].isna().sum()
            if missing > 0:
                missing_ratio = missing / len(result_df)

                if missing_ratio > 0.5:
                    result_df = result_df.drop(columns=[col])
                    report['actions'][col] = f'删除列（缺失率 {missing_ratio:.2%} > 50%）'
                    report['handled_missing_count'] += missing
                    continue

                if numeric_strategy == 'mean':
                    fill_val = result_df[col].mean()
                elif numeric_strategy == 'median':
                    fill_val = result_df[col].median()
                else:
                    mode_vals = result_df[col].mode()
                    fill_val = mode_vals.iloc[0] if len(mode_vals) > 0 else 0

                result_df[col] = result_df[col].fillna(fill_val)
                report['actions'][col] = f'{numeric_strategy}填充: {fill_val:.4f}, 填充 {missing} 个缺失值'
                report['handled_missing_count'] += missing

        for col in categorical_cols:
            missing = result_df[col].isna().sum()
            if missing > 0:
                missing_ratio = missing / len(result_df)

                if missing_ratio > 0.5:
                    result_df = result_df.drop(columns=[col])
                    report['actions'][col] = f'删除列（缺失率 {missing_ratio:.2%} > 50%）'
                    report['handled_missing_count'] += missing
                    continue

                if categorical_strategy == 'mode':
                    mode_vals = result_df[col].mode()
                    fill_val = mode_vals.iloc[0] if len(mode_vals) > 0 else '未知'
                    result_df[col] = result_df[col].fillna(fill_val)
                    report['actions'][col] = f'众数填充: {fill_val}, 填充 {missing} 个缺失值'
                else:
                    before_count = len(result_df)
                    result_df = result_df.dropna(subset=[col])
                    after_count = len(result_df)
                    report['actions'][col] = f'删除 {before_count - after_count} 行含缺失值的数据'
                    report['handled_missing_count'] += (before_count - after_count)
                    continue

                report['handled_missing_count'] += missing
    else:
        raise ValueError(f"不支持的strategy参数: {strategy}")

    report['remaining_missing_count'] = result_df.isna().sum().sum()

    return result_df, report


def detect_outliers(
    df: pd.DataFrame,
    columns: Optional[List[str]] = None,
    method: str = 'iqr',
    threshold: float = 1.5,
    action: str = 'mark'
) -> Tuple[pd.DataFrame, Dict]:
    """
    异常值检测与处理，支持IQR和Z-score两种方法。

    Parameters
    ----------
    df : pd.DataFrame
        待处理的DataFrame。
    columns : List[str], optional
        需要检测的列名列表。为None时自动检测所有数值列。
    method : str, optional
        异常值检测方法，可选 'iqr' 或 'zscore'，默认 'iqr'。
        - 'iqr'：四分位距法，异常值定义为 Q1 - threshold*IQR 以下 或 Q3 + threshold*IQR 以上
        - 'zscore'：Z-score法，异常值定义为 |Z-score| > threshold
    threshold : float, optional
        异常值判定阈值，IQR方法默认1.5，Z-score方法建议2或3。
    action : str, optional
        异常值处理方式，可选：
        - 'mark'：仅标记，新增'is_outlier'列和各列的'{col}_is_outlier'列
        - 'remove'：删除异常值所在的行
        - 'cap'：盖帽法，将异常值替换为上下边界值
        默认值为 'mark'。

    Returns
    -------
    Tuple[pd.DataFrame, Dict]
        第一个元素为处理后的DataFrame，第二个元素为异常报告字典，包含：
        - 'method': 使用的检测方法
        - 'threshold': 使用的阈值
        - 'action': 执行的处理动作
        - 'checked_columns': 检查的列名列表
        - 'outlier_count': 异常值总个数
        - 'outlier_rows': 含异常值的行数
        - 'outlier_by_column': 各列的异常值统计
        - 'column_bounds': 各列的上下边界（用于IQR方法）

    Notes
    -----
    - 仅对数值类型的列进行异常值检测
    - 使用'cap'方法时，IQR的边界为Q1-threshold*IQR和Q3+threshold*IQR，
      Z-score的边界为 mean - threshold*std 和 mean + threshold*std
    - 'mark'方法会在DataFrame中添加标记列，便于后续分析

    Examples
    --------
    >>> df = pd.DataFrame({'value': [1, 2, 3, 100, 5]})
    >>> result_df, report = detect_outliers(df, method='iqr', threshold=1.5, action='remove')
    >>> print(report['outlier_count'])
    1
    >>> len(result_df)
    4
    """
    report = {
        'method': method,
        'threshold': threshold,
        'action': action,
        'checked_columns': [],
        'outlier_count': 0,
        'outlier_rows': 0,
        'outlier_by_column': {},
        'column_bounds': {}
    }

    if df is None or df.empty:
        return df, report

    result_df = df.copy()

    if columns is None:
        numeric_cols = result_df.select_dtypes(include=['number']).columns.tolist()
        columns = [col for col in numeric_cols if not col.endswith('_is_outlier') and col != 'is_outlier']

    report['checked_columns'] = columns

    if not columns:
        return result_df, report

    outlier_mask = pd.Series(False, index=result_df.index)

    for col in columns:
        if col not in result_df.columns:
            continue

        if not pd.api.types.is_numeric_dtype(result_df[col]):
            continue

        col_data = result_df[col].dropna()

        if len(col_data) == 0:
            continue

        if method == 'iqr':
            q1 = col_data.quantile(0.25)
            q3 = col_data.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - threshold * iqr
            upper_bound = q3 + threshold * iqr

            report['column_bounds'][col] = {
                'lower': lower_bound,
                'upper': upper_bound,
                'q1': q1,
                'q3': q3,
                'iqr': iqr
            }

            col_outlier = (result_df[col] < lower_bound) | (result_df[col] > upper_bound)

        elif method == 'zscore':
            mean_val = col_data.mean()
            std_val = col_data.std()

            if std_val == 0:
                col_outlier = pd.Series(False, index=result_df.index)
                report['column_bounds'][col] = {
                    'lower': mean_val,
                    'upper': mean_val,
                    'mean': mean_val,
                    'std': 0
                }
            else:
                lower_bound = mean_val - threshold * std_val
                upper_bound = mean_val + threshold * std_val

                report['column_bounds'][col] = {
                    'lower': lower_bound,
                    'upper': upper_bound,
                    'mean': mean_val,
                    'std': std_val
                }

                z_scores = (result_df[col] - mean_val) / std_val
                col_outlier = z_scores.abs() > threshold
        else:
            raise ValueError(f"不支持的method参数: {method}，可选 'iqr' 或 'zscore'")

        col_outlier = col_outlier.fillna(False)
        outlier_count = col_outlier.sum()
        report['outlier_by_column'][col] = {
            'count': int(outlier_count),
            'percentage': float(outlier_count / len(result_df) * 100)
        }
        report['outlier_count'] += outlier_count

        if outlier_count > 0:
            outlier_mask = outlier_mask | col_outlier

        if action == 'mark':
            result_df[f'{col}_is_outlier'] = col_outlier.astype(bool)
        elif action == 'cap':
            bounds = report['column_bounds'][col]
            result_df[col] = result_df[col].clip(lower=bounds['lower'], upper=bounds['upper'])

    if action == 'mark':
        result_df['is_outlier'] = outlier_mask.astype(bool)
    elif action == 'remove':
        result_df = result_df[~outlier_mask].reset_index(drop=True)

    report['outlier_rows'] = int(outlier_mask.sum())

    return result_df, report


def merge_tables(tables: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """
    自动关联订单、商品、用户表，通过共同字段进行关联，返回合并后的宽表。

    Parameters
    ----------
    tables : Dict[str, pd.DataFrame]
        表名字典，键为表名或类型，值为对应的DataFrame。
        建议键为 'orders'、'products'、'users' 以获得最佳自动识别效果。

    Returns
    -------
    pd.DataFrame
        合并后的宽表DataFrame。如果只有一个表，则返回原表。

    Notes
    -----
    关联逻辑：
    1. 首先通过detect_table_type自动识别各表类型
    2. 识别共同关联字段：
       - 订单表 + 用户表：优先匹配 user_id/用户ID 等用户标识字段
       - 订单表 + 商品表：优先匹配 product_id/商品ID 等商品标识字段
       - 三表关联：先关联合并订单和用户，再与商品关联
    3. 关联时自动识别同名字段（不区分大小写）
    4. 使用左连接（left join），以订单表为主表
    5. 如果无法自动识别关联键，则尝试使用所有同名字段关联

    支持的关联字段（不区分大小写，支持中英文）：
    - 用户标识：user_id, userid, 用户ID, 用户编号, 会员ID, 会员编号等
    - 商品标识：product_id, productid, 商品ID, 商品编号, 产品ID, 产品编号等
    - 订单标识：order_id, orderid, 订单ID, 订单编号等

    Examples
    --------
    >>> tables = {
    ...     'orders': orders_df,
    ...     'products': products_df,
    ...     'users': users_df
    ... }
    >>> wide_table = merge_tables(tables)
    """
    if not tables:
        raise ValueError("tables参数不能为空")

    if len(tables) == 1:
        return list(tables.values())[0].copy()

    classified = {'orders': [], 'products': [], 'users': [], 'unknown': []}
    order_items_dfs = []
    for name, df in tables.items():
        if df is None or df.empty:
            continue
        
        if 'order_item' in str(name).lower() or '订单项' in str(name) or 'order_detail' in str(name).lower():
            order_items_dfs.append((name, df))
            continue
        
        table_type = detect_table_type(df)
        if table_type in classified:
            classified[table_type].append((name, df))
        else:
            classified['unknown'].append((name, df))

    orders_dfs = classified['orders']
    products_dfs = classified['products']
    users_dfs = classified['users']

    user_key_patterns = [
        r'^user[_-]?id$', r'^userid$',
        r'^用户[编号id]$', r'^会员[编号id]$', r'^客户[编号id]$'
    ]
    product_key_patterns = [
        r'^product[_-]?id$', r'^productid$',
        r'^商品[编号id]$', r'^产品[编号id]$'
    ]
    order_key_patterns = [
        r'^order[_-]?id$', r'^orderid$',
        r'^订单[编号id]$'
    ]

    def _find_key(cols: List[str], patterns: List[str]) -> Optional[str]:
        for col in cols:
            col_lower = str(col).lower().strip()
            for pattern in patterns:
                if re.match(pattern, col_lower, re.IGNORECASE):
                    return col
        return None

    def _find_common_key(df1: pd.DataFrame, df2: pd.DataFrame,
                         key_patterns: List[str]) -> Optional[Tuple[str, str]]:
        cols1 = df1.columns.tolist()
        cols2 = df2.columns.tolist()

        key1 = _find_key(cols1, key_patterns)
        key2 = _find_key(cols2, key_patterns)

        if key1 and key2:
            return (key1, key2)

        cols1_lower = {str(c).lower(): c for c in cols1}
        cols2_lower = {str(c).lower(): c for c in cols2}
        common_lower = set(cols1_lower.keys()) & set(cols2_lower.keys())

        if common_lower:
            for col_lower in sorted(common_lower):
                for pattern in key_patterns:
                    if re.match(pattern, col_lower, re.IGNORECASE):
                        return (cols1_lower[col_lower], cols2_lower[col_lower])

            col_lower = list(common_lower)[0]
            return (cols1_lower[col_lower], cols2_lower[col_lower])

        return None

    result = None
    merge_history = []

    if orders_dfs:
        _, result = orders_dfs[0]
        merge_history.append('orders')

        if order_items_dfs:
            _, order_items_df = order_items_dfs[0]
            keys = _find_common_key(result, order_items_df, order_key_patterns)

            if keys:
                left_key, right_key = keys
                result = pd.merge(
                    result,
                    order_items_df,
                    left_on=left_key,
                    right_on=right_key,
                    how='left',
                    suffixes=('', '_item')
                )
                merge_history.append('order_items')

        if users_dfs:
            _, users_df = users_dfs[0]
            keys = _find_common_key(result, users_df, user_key_patterns)

            if keys is None:
                keys = _find_common_key(result, users_df, order_key_patterns)

            if keys:
                left_key, right_key = keys
                result = pd.merge(
                    result,
                    users_df,
                    left_on=left_key,
                    right_on=right_key,
                    how='left',
                    suffixes=('', '_user')
                )
                merge_history.append('users')

        if products_dfs:
            _, products_df = products_dfs[0]
            keys = _find_common_key(result, products_df, product_key_patterns)

            if keys:
                left_key, right_key = keys
                result = pd.merge(
                    result,
                    products_df,
                    left_on=left_key,
                    right_on=right_key,
                    how='left',
                    suffixes=('', '_product')
                )
                merge_history.append('products')
    else:
        dfs_list = users_dfs + products_dfs + classified['unknown']
        if dfs_list:
            _, result = dfs_list[0]
            merge_history.append(dfs_list[0][0])

            for name, df in dfs_list[1:]:
                cols1_lower = {str(c).lower(): c for c in result.columns}
                cols2_lower = {str(c).lower(): c for c in df.columns}
                common_lower = set(cols1_lower.keys()) & set(cols2_lower.keys())

                if common_lower:
                    common_keys = [(cols1_lower[c], cols2_lower[c]) for c in common_lower]
                    left_keys = [k[0] for k in common_keys]
                    right_keys = [k[1] for k in common_keys]

                    result = pd.merge(
                        result,
                        df,
                        left_on=left_keys,
                        right_on=right_keys,
                        how='outer',
                        suffixes=('', f'_{name}')
                    )
                    merge_history.append(name)

    if result is None:
        all_dfs = []
        for dfs in [orders_dfs, products_dfs, users_dfs, classified['unknown']]:
            for _, df in dfs:
                all_dfs.append(df)

        if all_dfs:
            result = all_dfs[0].copy()
            for df in all_dfs[1:]:
                result = pd.concat([result, df], axis=1, join='outer')

    if result is None:
        raise ValueError("无法完成表关联，请检查输入数据")

    return result.reset_index(drop=True)


def get_data_overview(df: pd.DataFrame) -> Dict:
    """
    返回数据概览信息，包括行数、列数、字段类型、缺失值统计等。

    Parameters
    ----------
    df : pd.DataFrame
        待分析的DataFrame。

    Returns
    -------
    Dict
        数据概览信息字典，包含：
        - 'row_count': 行数
        - 'column_count': 列数
        - 'total_cells': 总单元格数
        - 'column_info': 各列详细信息的字典，键为列名，值为字典包含：
            - 'type': 数据类型
            - 'non_null_count': 非空值数量
            - 'null_count': 缺失值数量
            - 'null_percentage': 缺失值百分比
            - 'unique_count': 唯一值数量
            - 'sample_values': 前5个非空示例值
            - （数值列额外包含）'mean': 均值, 'std': 标准差,
              'min': 最小值, 'max': 最大值,
              'q25': 25分位数, 'q50': 中位数, 'q75': 75分位数
            - （分类列额外包含）'top_value': 出现最多的值,
              'top_frequency': 出现次数
        - 'dtype_distribution': 数据类型分布统计
        - 'total_null_count': 总缺失值数量
        - 'total_null_percentage': 总缺失值百分比
        - 'memory_usage': 内存使用量（MB）
        - 'table_type': 检测到的表类型

    Notes
    -----
    - 数值列会额外计算描述性统计量
    - 分类列（object、category、string）会额外计算众数信息
    - 内存使用量基于df.memory_usage(deep=True)计算

    Examples
    --------
    >>> df = pd.DataFrame({'A': [1, 2, 3], 'B': ['x', 'y', 'z']})
    >>> overview = get_data_overview(df)
    >>> print(overview['row_count'], overview['column_count'])
    3 2
    """
    overview = {
        'row_count': 0,
        'column_count': 0,
        'total_cells': 0,
        'column_info': {},
        'dtype_distribution': {},
        'total_null_count': 0,
        'total_null_percentage': 0.0,
        'memory_usage': 0.0,
        'table_type': 'unknown'
    }

    if df is None or df.empty:
        return overview

    overview['row_count'] = len(df)
    overview['column_count'] = len(df.columns)
    overview['total_cells'] = overview['row_count'] * overview['column_count']
    overview['table_type'] = detect_table_type(df)

    try:
        memory_bytes = df.memory_usage(deep=True).sum()
        overview['memory_usage'] = round(memory_bytes / (1024 * 1024), 4)
    except:
        overview['memory_usage'] = 0.0

    dtype_counts = df.dtypes.astype(str).value_counts()
    overview['dtype_distribution'] = dtype_counts.to_dict()

    total_null = df.isna().sum().sum()
    overview['total_null_count'] = int(total_null)
    overview['total_null_percentage'] = round(
        total_null / overview['total_cells'] * 100, 4
    ) if overview['total_cells'] > 0 else 0.0

    for col in df.columns:
        col_data = df[col]
        col_info = {
            'type': str(col_data.dtype),
            'non_null_count': int(col_data.notna().sum()),
            'null_count': int(col_data.isna().sum()),
            'null_percentage': round(
                col_data.isna().sum() / len(df) * 100, 4
            ) if len(df) > 0 else 0.0,
            'unique_count': int(col_data.nunique(dropna=True)),
            'sample_values': []
        }

        non_null_values = col_data.dropna().head(5).tolist()
        col_info['sample_values'] = [str(v) for v in non_null_values]

        if pd.api.types.is_numeric_dtype(col_data) and col_data.notna().sum() > 0:
            clean_data = col_data.dropna()
            col_info['mean'] = round(clean_data.mean(), 4) if len(clean_data) > 0 else None
            col_info['std'] = round(clean_data.std(), 4) if len(clean_data) > 1 else None
            col_info['min'] = round(clean_data.min(), 4) if len(clean_data) > 0 else None
            col_info['max'] = round(clean_data.max(), 4) if len(clean_data) > 0 else None
            col_info['q25'] = round(clean_data.quantile(0.25), 4) if len(clean_data) > 0 else None
            col_info['q50'] = round(clean_data.quantile(0.50), 4) if len(clean_data) > 0 else None
            col_info['q75'] = round(clean_data.quantile(0.75), 4) if len(clean_data) > 0 else None
        elif pd.api.types.is_categorical_dtype(col_data) or col_data.dtype == 'object':
            value_counts = col_data.dropna().value_counts()
            if len(value_counts) > 0:
                col_info['top_value'] = str(value_counts.index[0])
                col_info['top_frequency'] = int(value_counts.iloc[0])
            else:
                col_info['top_value'] = None
                col_info['top_frequency'] = 0

        overview['column_info'][str(col)] = col_info

    return overview
