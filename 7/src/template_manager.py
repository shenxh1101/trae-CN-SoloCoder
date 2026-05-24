"""
数据可视化仪表板 - 模板管理系统
支持保存和加载图表配置、透视表配置等模板
"""

import os
import json
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any
from datetime import datetime

import pandas as pd

from .chart_builder import ChartConfig
from .pivot_table import PivotConfig


@dataclass
class DashboardTemplate:
    """仪表板模板数据结构"""
    template_id: str = ''
    name: str = ''
    description: str = ''
    created_at: str = ''
    updated_at: str = ''
    chart_configs: List[Dict[str, Any]] = field(default_factory=list)
    pivot_configs: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'template_id': self.template_id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'chart_configs': self.chart_configs,
            'pivot_configs': self.pivot_configs,
            'metadata': self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DashboardTemplate':
        return cls(
            template_id=data.get('template_id', ''),
            name=data.get('name', ''),
            description=data.get('description', ''),
            created_at=data.get('created_at', ''),
            updated_at=data.get('updated_at', ''),
            chart_configs=data.get('chart_configs', []),
            pivot_configs=data.get('pivot_configs', []),
            metadata=data.get('metadata', {})
        )


class TemplateManager:
    """模板管理器"""

    def __init__(self, templates_dir: str = 'saved_templates'):
        """
        初始化模板管理器

        Parameters
        ----------
        templates_dir : str
            模板文件存储目录
        """
        self.templates_dir = templates_dir
        self._ensure_dir()

    def _ensure_dir(self) -> None:
        """确保存储目录存在"""
        if not os.path.exists(self.templates_dir):
            os.makedirs(self.templates_dir, exist_ok=True)

    def _get_template_path(self, template_id: str) -> str:
        """获取模板文件路径"""
        return os.path.join(self.templates_dir, f'{template_id}.json')

    def create_template(
        self,
        name: str,
        description: str = '',
        chart_configs: Optional[List[ChartConfig]] = None,
        pivot_configs: Optional[List[PivotConfig]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> DashboardTemplate:
        """
        创建新模板

        Parameters
        ----------
        name : str
            模板名称
        description : str
            模板描述
        chart_configs : List[ChartConfig], optional
            图表配置列表
        pivot_configs : List[PivotConfig], optional
            透视表配置列表
        metadata : Dict[str, Any], optional
            元数据

        Returns
        -------
        DashboardTemplate
            创建的模板对象
        """
        template_id = f'template_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        now = datetime.now().isoformat()

        chart_dicts = []
        if chart_configs:
            for config in chart_configs:
                chart_dicts.append(self._chart_config_to_dict(config))

        pivot_dicts = []
        if pivot_configs:
            for config in pivot_configs:
                pivot_dicts.append(self._pivot_config_to_dict(config))

        template = DashboardTemplate(
            template_id=template_id,
            name=name,
            description=description,
            created_at=now,
            updated_at=now,
            chart_configs=chart_dicts,
            pivot_configs=pivot_dicts,
            metadata=metadata or {}
        )

        return template

    def save_template(self, template: DashboardTemplate) -> str:
        """
        保存模板到文件

        Parameters
        ----------
        template : DashboardTemplate
            要保存的模板

        Returns
        -------
        str
            保存的文件路径
        """
        template.updated_at = datetime.now().isoformat()

        if not template.created_at:
            template.created_at = template.updated_at

        if not template.template_id:
            template.template_id = f'template_{datetime.now().strftime("%Y%m%d_%H%M%S")}'

        file_path = self._get_template_path(template.template_id)

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(template.to_dict(), f, ensure_ascii=False, indent=2)

        return file_path

    def load_template(self, template_id: str) -> Optional[DashboardTemplate]:
        """
        从文件加载模板

        Parameters
        ----------
        template_id : str
            模板ID

        Returns
        -------
        Optional[DashboardTemplate]
            加载的模板对象，不存在则返回None
        """
        file_path = self._get_template_path(template_id)

        if not os.path.exists(file_path):
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return DashboardTemplate.from_dict(data)

    def list_templates(self) -> List[Dict[str, Any]]:
        """
        列出所有已保存的模板

        Returns
        -------
        List[Dict[str, Any]]
            模板摘要信息列表
        """
        templates = []

        if not os.path.exists(self.templates_dir):
            return templates

        for filename in os.listdir(self.templates_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(self.templates_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    templates.append({
                        'template_id': data.get('template_id', ''),
                        'name': data.get('name', ''),
                        'description': data.get('description', ''),
                        'chart_count': len(data.get('chart_configs', [])),
                        'pivot_count': len(data.get('pivot_configs', [])),
                        'created_at': data.get('created_at', ''),
                        'updated_at': data.get('updated_at', ''),
                        'file_path': file_path
                    })
                except Exception:
                    continue

        templates.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
        return templates

    def delete_template(self, template_id: str) -> bool:
        """
        删除模板

        Parameters
        ----------
        template_id : str
            要删除的模板ID

        Returns
        -------
        bool
            删除是否成功
        """
        file_path = self._get_template_path(template_id)

        if os.path.exists(file_path):
            os.remove(file_path)
            return True

        return False

    def add_chart_config(
        self,
        template: DashboardTemplate,
        chart_config: ChartConfig
    ) -> DashboardTemplate:
        """
        向模板添加图表配置

        Parameters
        ----------
        template : DashboardTemplate
            目标模板
        chart_config : ChartConfig
            要添加的图表配置

        Returns
        -------
        DashboardTemplate
            更新后的模板
        """
        chart_dict = self._chart_config_to_dict(chart_config)
        template.chart_configs.append(chart_dict)
        template.updated_at = datetime.now().isoformat()
        return template

    def add_pivot_config(
        self,
        template: DashboardTemplate,
        pivot_config: PivotConfig
    ) -> DashboardTemplate:
        """
        向模板添加透视表配置

        Parameters
        ----------
        template : DashboardTemplate
            目标模板
        pivot_config : PivotConfig
            要添加的透视表配置

        Returns
        -------
        DashboardTemplate
            更新后的模板
        """
        pivot_dict = self._pivot_config_to_dict(pivot_config)
        template.pivot_configs.append(pivot_dict)
        template.updated_at = datetime.now().isoformat()
        return template

    def remove_chart_config(
        self,
        template: DashboardTemplate,
        chart_id: str
    ) -> DashboardTemplate:
        """
        从模板移除图表配置

        Parameters
        ----------
        template : DashboardTemplate
            目标模板
        chart_id : str
            要移除的图表ID

        Returns
        -------
        DashboardTemplate
            更新后的模板
        """
        template.chart_configs = [
            c for c in template.chart_configs
            if c.get('chart_id') != chart_id
        ]
        template.updated_at = datetime.now().isoformat()
        return template

    def remove_pivot_config(
        self,
        template: DashboardTemplate,
        pivot_id: str
    ) -> DashboardTemplate:
        """
        从模板移除透视表配置

        Parameters
        ----------
        template : DashboardTemplate
            目标模板
        pivot_id : str
            要移除的透视表ID

        Returns
        -------
        DashboardTemplate
            更新后的模板
        """
        template.pivot_configs = [
            p for p in template.pivot_configs
            if p.get('pivot_id') != pivot_id
        ]
        template.updated_at = datetime.now().isoformat()
        return template

    def get_chart_configs(self, template: DashboardTemplate) -> List[ChartConfig]:
        """
        获取模板中的图表配置列表

        Parameters
        ----------
        template : DashboardTemplate
            模板对象

        Returns
        -------
        List[ChartConfig]
            图表配置列表
        """
        configs = []
        for chart_dict in template.chart_configs:
            config = self._dict_to_chart_config(chart_dict)
            if config:
                configs.append(config)
        return configs

    def get_pivot_configs(self, template: DashboardTemplate) -> List[PivotConfig]:
        """
        获取模板中的透视表配置列表

        Parameters
        ----------
        template : DashboardTemplate
            模板对象

        Returns
        -------
        List[PivotConfig]
            透视表配置列表
        """
        configs = []
        for pivot_dict in template.pivot_configs:
            config = self._dict_to_pivot_config(pivot_dict)
            if config:
                configs.append(config)
        return configs

    def apply_template(
        self,
        template: DashboardTemplate,
        df: pd.DataFrame,
        validate_columns: bool = True
    ) -> Dict[str, Any]:
        """
        应用模板到数据

        Parameters
        ----------
        template : DashboardTemplate
            模板对象
        df : pd.DataFrame
            目标数据
        validate_columns : bool
            是否验证列名存在

        Returns
        -------
        Dict[str, Any]
            应用结果，包含：
            - success: bool
            - chart_configs: List[ChartConfig]
            - pivot_configs: List[PivotConfig]
            - warnings: List[str]
            - errors: List[str]
        """
        result = {
            'success': True,
            'chart_configs': [],
            'pivot_configs': [],
            'warnings': [],
            'errors': []
        }

        available_columns = set(df.columns)

        for chart_dict in template.chart_configs:
            config = self._dict_to_chart_config(chart_dict)
            if not config:
                continue

            if validate_columns:
                issues = self._validate_chart_config(config, available_columns)
                if issues['errors']:
                    result['errors'].extend(issues['errors'])
                    continue
                if issues['warnings']:
                    result['warnings'].extend(issues['warnings'])

            result['chart_configs'].append(config)

        for pivot_dict in template.pivot_configs:
            config = self._dict_to_pivot_config(pivot_dict)
            if not config:
                continue

            if validate_columns:
                issues = self._validate_pivot_config(config, available_columns)
                if issues['errors']:
                    result['errors'].extend(issues['errors'])
                    continue
                if issues['warnings']:
                    result['warnings'].extend(issues['warnings'])

            result['pivot_configs'].append(config)

        result['success'] = len(result['errors']) == 0

        return result

    def _chart_config_to_dict(self, config: ChartConfig) -> Dict[str, Any]:
        """将ChartConfig转换为字典"""
        return {
            'chart_id': config.chart_id,
            'chart_type': config.chart_type,
            'title': config.title,
            'x_axis': config.x_axis,
            'y_axis': config.y_axis,
            'color': config.color,
            'group': config.group,
            'aggregation': config.aggregation,
            'config': config.config
        }

    def _dict_to_chart_config(self, data: Dict[str, Any]) -> Optional[ChartConfig]:
        """将字典转换为ChartConfig"""
        try:
            return ChartConfig(
                chart_id=data.get('chart_id', ''),
                chart_type=data.get('chart_type', 'line'),
                title=data.get('title', ''),
                x_axis=data.get('x_axis'),
                y_axis=data.get('y_axis', []),
                color=data.get('color'),
                group=data.get('group'),
                aggregation=data.get('aggregation', 'sum'),
                config=data.get('config', {})
            )
        except Exception:
            return None

    def _pivot_config_to_dict(self, config: PivotConfig) -> Dict[str, Any]:
        """将PivotConfig转换为字典"""
        values = []
        for v in config.values:
            values.append({
                'column': v.column,
                'aggregation': v.aggregation
            })

        return {
            'pivot_id': config.pivot_id,
            'rows': config.rows,
            'columns': config.columns,
            'values': values,
            'show_totals': config.show_totals,
            'show_subtotals': config.show_subtotals,
            'heatmap_enabled': config.heatmap_enabled,
            'colormap': config.colormap
        }

    def _dict_to_pivot_config(self, data: Dict[str, Any]) -> Optional[PivotConfig]:
        """将字典转换为PivotConfig"""
        try:
            from .pivot_table import PivotValue

            values = []
            for v in data.get('values', []):
                values.append(PivotValue(
                    column=v.get('column', ''),
                    aggregation=v.get('aggregation', 'sum')
                ))

            return PivotConfig(
                pivot_id=data.get('pivot_id', ''),
                rows=data.get('rows', []),
                columns=data.get('columns', []),
                values=values,
                show_totals=data.get('show_totals', True),
                show_subtotals=data.get('show_subtotals', True),
                heatmap_enabled=data.get('heatmap_enabled', True),
                colormap=data.get('colormap', 'blues')
            )
        except Exception:
            return None

    def _validate_chart_config(
        self,
        config: ChartConfig,
        available_columns: set
    ) -> Dict[str, List[str]]:
        """验证图表配置的列是否存在"""
        result = {'errors': [], 'warnings': []}

        if config.x_axis and config.x_axis not in available_columns:
            result['errors'].append(
                f"图表 '{config.title}': X轴字段 '{config.x_axis}' 不存在"
            )

        for y_col in config.y_axis:
            if y_col not in available_columns:
                result['errors'].append(
                    f"图表 '{config.title}': Y轴字段 '{y_col}' 不存在"
                )

        if config.color and config.color not in available_columns:
            result['warnings'].append(
                f"图表 '{config.title}': 颜色字段 '{config.color}' 不存在，已忽略"
            )

        if config.group and config.group not in available_columns:
            result['warnings'].append(
                f"图表 '{config.title}': 分组字段 '{config.group}' 不存在，已忽略"
            )

        return result

    def _validate_pivot_config(
        self,
        config: PivotConfig,
        available_columns: set
    ) -> Dict[str, List[str]]:
        """验证透视表配置的列是否存在"""
        result = {'errors': [], 'warnings': []}

        for row_col in config.rows:
            if row_col not in available_columns:
                result['errors'].append(
                    f"透视表: 行字段 '{row_col}' 不存在"
                )

        for col_col in config.columns:
            if col_col not in available_columns:
                result['errors'].append(
                    f"透视表: 列字段 '{col_col}' 不存在"
                )

        for value in config.values:
            if value.column not in available_columns:
                result['errors'].append(
                    f"透视表: 值字段 '{value.column}' 不存在"
                )

        return result

    def export_template_to_json(self, template: DashboardTemplate, output_path: str) -> str:
        """
        导出模板为JSON文件

        Parameters
        ----------
        template : DashboardTemplate
            要导出的模板
        output_path : str
            输出文件路径

        Returns
        -------
        str
            导出的文件路径
        """
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(template.to_dict(), f, ensure_ascii=False, indent=2)
        return output_path

    def import_template_from_json(self, file_path: str) -> Optional[DashboardTemplate]:
        """
        从JSON文件导入模板

        Parameters
        ----------
        file_path : str
            JSON文件路径

        Returns
        -------
        Optional[DashboardTemplate]
            导入的模板对象
        """
        if not os.path.exists(file_path):
            return None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if not data.get('template_id'):
                data['template_id'] = f'imported_{datetime.now().strftime("%Y%m%d_%H%M%S")}'

            return DashboardTemplate.from_dict(data)
        except Exception:
            return None


def create_template_from_configs(
    name: str,
    description: str = '',
    chart_configs: Optional[List[ChartConfig]] = None,
    pivot_configs: Optional[List[PivotConfig]] = None
) -> DashboardTemplate:
    """
    从配置列表快速创建模板

    Parameters
    ----------
    name : str
        模板名称
    description : str
        模板描述
    chart_configs : List[ChartConfig], optional
        图表配置列表
    pivot_configs : List[PivotConfig], optional
        透视表配置列表

    Returns
    -------
    DashboardTemplate
        创建的模板对象
    """
    manager = TemplateManager()
    return manager.create_template(
        name=name,
        description=description,
        chart_configs=chart_configs,
        pivot_configs=pivot_configs
    )
