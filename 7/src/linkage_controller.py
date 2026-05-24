"""
多图表联动控制器
点击筛选传播，多图表数据联动
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable
import pandas as pd
import numpy as np

from .chart_builder import FilterCondition


@dataclass
class LinkageController:
    """
    多图表联动控制器
    实现发布-订阅模式管理图表间的筛选通信
    """

    registered_charts: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    current_filter: Optional[FilterCondition] = None
    subscribers: Dict[str, Callable] = field(default_factory=dict)
    filter_history: List[FilterCondition] = field(default_factory=list)

    def register_chart(self, chart_id: str, chart_info: Dict[str, Any]) -> None:
        """
        注册图表到联动控制器

        Args:
            chart_id: 图表唯一标识
            chart_info: 图表信息字典，可包含：
                - name: 图表名称
                - config: 图表配置
                - on_filter: 筛选回调函数
        """
        self.registered_charts[chart_id] = chart_info

    def unregister_chart(self, chart_id: str) -> None:
        """
        注销图表

        Args:
            chart_id: 图表唯一标识
        """
        if chart_id in self.registered_charts:
            del self.registered_charts[chart_id]
        if chart_id in self.subscribers:
            del self.subscribers[chart_id]

    def subscribe(self, chart_id: str, callback: Callable) -> None:
        """
        订阅筛选变化事件

        Args:
            chart_id: 图表唯一标识
            callback: 筛选变化时的回调函数，接收FilterCondition参数
        """
        self.subscribers[chart_id] = callback

    def unsubscribe(self, chart_id: str) -> None:
        """
        取消订阅

        Args:
            chart_id: 图表唯一标识
        """
        if chart_id in self.subscribers:
            del self.subscribers[chart_id]

    def on_point_click(
        self,
        source_chart_id: str,
        column: str,
        values: List[Any],
        operator: str = 'equals',
        display_text: Optional[str] = None
    ) -> FilterCondition:
        """
        处理图表点击事件，发布筛选条件

        Args:
            source_chart_id: 触发点击的图表ID
            column: 筛选的列名
            values: 筛选值列表
            operator: 筛选操作符 (equals, in, between, greater, less)
            display_text: 显示的筛选描述文本

        Returns:
            创建的筛选条件
        """
        if display_text is None:
            if operator == 'equals':
                display_text = f'{column} = {values[0] if values else ""}'
            elif operator == 'in':
                display_text = f'{column} in [{", ".join(str(v) for v in values)}]'
            elif operator == 'between':
                display_text = f'{column} between {values[0]} and {values[1] if len(values) > 1 else values[0]}'
            else:
                display_text = f'{column} {operator} {values[0] if values else ""}'

        filter_condition = FilterCondition(
            source_chart_id=source_chart_id,
            column=column,
            operator=operator,
            values=values,
            display_text=display_text
        )

        self.apply_filter(filter_condition)

        return filter_condition

    def apply_filter(self, filter_condition: FilterCondition) -> None:
        """
        应用筛选条件并通知所有订阅者

        Args:
            filter_condition: 筛选条件
        """
        if self.current_filter:
            self.filter_history.append(self.current_filter)

        self.current_filter = filter_condition

        for chart_id, callback in self.subscribers.items():
            if chart_id != filter_condition.source_chart_id:
                try:
                    callback(filter_condition)
                except Exception as e:
                    print(f"通知订阅者 {chart_id} 失败: {e}")

    def clear_filter(self) -> None:
        """
        清除当前筛选条件
        """
        if self.current_filter:
            self.filter_history.append(self.current_filter)

        self.current_filter = None

        for callback in self.subscribers.values():
            try:
                callback(None)
            except Exception as e:
                print(f"通知订阅者清除筛选失败: {e}")

    def get_filtered_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        获取筛选后的数据

        Args:
            df: 原始数据

        Returns:
            筛选后的数据
        """
        if self.current_filter is None:
            return df.copy()

        return self._apply_filter_to_df(df, self.current_filter)

    def _apply_filter_to_df(
        self,
        df: pd.DataFrame,
        filter_condition: FilterCondition
    ) -> pd.DataFrame:
        """
        将筛选条件应用到DataFrame

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

        try:
            if op == 'equals' and values:
                filtered_df = filtered_df[filtered_df[col] == values[0]]
            elif op == 'in' and values:
                filtered_df = filtered_df[filtered_df[col].isin(values)]
            elif op == 'between' and len(values) >= 2:
                filtered_df = filtered_df[
                    (filtered_df[col] >= values[0]) &
                    (filtered_df[col] <= values[1])
                ]
            elif op == 'greater' and values:
                filtered_df = filtered_df[filtered_df[col] > values[0]]
            elif op == 'less' and values:
                filtered_df = filtered_df[filtered_df[col] < values[0]]
        except Exception as e:
            print(f"应用筛选条件失败: {e}")
            return df.copy()

        return filtered_df

    def undo_filter(self) -> Optional[FilterCondition]:
        """
        撤销上一个筛选操作

        Returns:
            恢复的筛选条件，如果没有历史记录则返回None
        """
        if self.filter_history:
            self.current_filter = self.filter_history.pop()
            for callback in self.subscribers.values():
                try:
                    callback(self.current_filter)
                except Exception as e:
                    print(f"通知订阅者失败: {e}")
            return self.current_filter
        else:
            self.clear_filter()
            return None

    def get_registered_charts(self) -> List[Dict[str, Any]]:
        """
        获取所有已注册的图表信息

        Returns:
            图表信息列表
        """
        return [
            {'chart_id': chart_id, **info}
            for chart_id, info in self.registered_charts.items()
        ]

    def get_current_filter_display(self) -> str:
        """
        获取当前筛选条件的显示文本

        Returns:
            筛选条件描述文本
        """
        if self.current_filter is None:
            return '无筛选'
        return self.current_filter.display_text

    def has_active_filter(self) -> bool:
        """
        检查是否有活跃的筛选条件

        Returns:
            是否有活跃筛选
        """
        return self.current_filter is not None

    def reset(self) -> None:
        """
        重置控制器状态
        """
        self.registered_charts.clear()
        self.subscribers.clear()
        self.filter_history.clear()
        self.current_filter = None
