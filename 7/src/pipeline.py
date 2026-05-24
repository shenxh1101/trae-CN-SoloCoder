"""
数据可视化仪表板 - 数据清洗流水线管理模块
支持保存、加载、执行和导出数据清洗流水线
"""

import os
import json
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime

import pandas as pd

from .data_cleaner import CleanStep, execute_clean_step


@dataclass
class Pipeline:
    """数据清洗流水线数据结构"""
    pipeline_id: str = ''
    name: str = ''
    description: str = ''
    steps: List[CleanStep] = field(default_factory=list)
    created_at: str = ''
    updated_at: str = ''

    def to_dict(self) -> Dict[str, Any]:
        return {
            'pipeline_id': self.pipeline_id,
            'name': self.name,
            'description': self.description,
            'steps': [step.to_dict() for step in self.steps],
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Pipeline':
        steps_data = data.get('steps', [])
        steps = [CleanStep.from_dict(step_data) for step_data in steps_data]
        return cls(
            pipeline_id=data.get('pipeline_id', ''),
            name=data.get('name', ''),
            description=data.get('description', ''),
            steps=steps,
            created_at=data.get('created_at', ''),
            updated_at=data.get('updated_at', '')
        )


class PipelineManager:
    """流水线管理器"""

    def __init__(self, pipelines_dir: str = 'pipelines'):
        """
        初始化流水线管理器

        Parameters
        ----------
        pipelines_dir : str
            流水线文件存储目录
        """
        self.pipelines_dir = pipelines_dir
        self._ensure_dir()

    def _ensure_dir(self) -> None:
        """确保存储目录存在"""
        if not os.path.exists(self.pipelines_dir):
            os.makedirs(self.pipelines_dir, exist_ok=True)

    def _get_pipeline_path(self, pipeline_id: str) -> str:
        """获取流水线文件路径"""
        return os.path.join(self.pipelines_dir, f'{pipeline_id}.json')

    def create_pipeline(
        self,
        name: str,
        description: str = '',
        steps: Optional[List[CleanStep]] = None
    ) -> Pipeline:
        """
        创建新的流水线

        Parameters
        ----------
        name : str
            流水线名称
        description : str
            流水线描述
        steps : List[CleanStep], optional
            初始步骤列表

        Returns
        -------
        Pipeline
            创建的流水线对象
        """
        pipeline_id = f'pipeline_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
        now = datetime.now().isoformat()

        pipeline = Pipeline(
            pipeline_id=pipeline_id,
            name=name,
            description=description,
            steps=steps if steps else [],
            created_at=now,
            updated_at=now
        )

        return pipeline

    def save_pipeline(self, pipeline: Pipeline) -> str:
        """
        保存流水线到文件

        Parameters
        ----------
        pipeline : Pipeline
            要保存的流水线

        Returns
        -------
        str
            保存的文件路径
        """
        pipeline.updated_at = datetime.now().isoformat()

        if not pipeline.created_at:
            pipeline.created_at = pipeline.updated_at

        if not pipeline.pipeline_id:
            pipeline.pipeline_id = f'pipeline_{datetime.now().strftime("%Y%m%d_%H%M%S")}'

        file_path = self._get_pipeline_path(pipeline.pipeline_id)

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(pipeline.to_dict(), f, ensure_ascii=False, indent=2)

        return file_path

    def load_pipeline(self, pipeline_id: str) -> Optional[Pipeline]:
        """
        从文件加载流水线

        Parameters
        ----------
        pipeline_id : str
            流水线ID

        Returns
        -------
        Optional[Pipeline]
            加载的流水线对象，不存在则返回None
        """
        file_path = self._get_pipeline_path(pipeline_id)

        if not os.path.exists(file_path):
            return None

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return Pipeline.from_dict(data)

    def list_pipelines(self) -> List[Dict[str, Any]]:
        """
        列出所有已保存的流水线

        Returns
        -------
        List[Dict[str, Any]]
            流水线摘要信息列表
        """
        pipelines = []

        if not os.path.exists(self.pipelines_dir):
            return pipelines

        for filename in os.listdir(self.pipelines_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(self.pipelines_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    pipelines.append({
                        'pipeline_id': data.get('pipeline_id', ''),
                        'name': data.get('name', ''),
                        'description': data.get('description', ''),
                        'step_count': len(data.get('steps', [])),
                        'created_at': data.get('created_at', ''),
                        'updated_at': data.get('updated_at', ''),
                        'file_path': file_path
                    })
                except Exception:
                    continue

        pipelines.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
        return pipelines

    def delete_pipeline(self, pipeline_id: str) -> bool:
        """
        删除流水线

        Parameters
        ----------
        pipeline_id : str
            要删除的流水线ID

        Returns
        -------
        bool
            删除是否成功
        """
        file_path = self._get_pipeline_path(pipeline_id)

        if os.path.exists(file_path):
            os.remove(file_path)
            return True

        return False

    def add_step(
        self,
        pipeline: Pipeline,
        step: CleanStep,
        position: Optional[int] = None
    ) -> Pipeline:
        """
        向流水线添加步骤

        Parameters
        ----------
        pipeline : Pipeline
            目标流水线
        step : CleanStep
            要添加的步骤
        position : int, optional
            插入位置，None表示添加到末尾

        Returns
        -------
        Pipeline
            更新后的流水线
        """
        if not step.step_id:
            step.step_id = f'step_{len(pipeline.steps) + 1}_{datetime.now().strftime("%H%M%S")}'

        if position is None or position >= len(pipeline.steps):
            pipeline.steps.append(step)
        else:
            pipeline.steps.insert(max(0, position), step)

        pipeline.updated_at = datetime.now().isoformat()
        return pipeline

    def remove_step(self, pipeline: Pipeline, step_id: str) -> Pipeline:
        """
        从流水线移除步骤

        Parameters
        ----------
        pipeline : Pipeline
            目标流水线
        step_id : str
            要移除的步骤ID

        Returns
        -------
        Pipeline
            更新后的流水线
        """
        pipeline.steps = [step for step in pipeline.steps if step.step_id != step_id]
        pipeline.updated_at = datetime.now().isoformat()
        return pipeline

    def reorder_steps(self, pipeline: Pipeline, new_order: List[str]) -> Pipeline:
        """
        重新排序流水线步骤

        Parameters
        ----------
        pipeline : Pipeline
            目标流水线
        new_order : List[str]
            步骤ID的新顺序列表

        Returns
        -------
        Pipeline
            更新后的流水线
        """
        step_map = {step.step_id: step for step in pipeline.steps}
        pipeline.steps = [step_map[step_id] for step_id in new_order if step_id in step_map]
        pipeline.updated_at = datetime.now().isoformat()
        return pipeline

    def execute_pipeline(
        self,
        df: pd.DataFrame,
        pipeline: Pipeline
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
        """
        执行流水线处理数据

        Parameters
        ----------
        df : pd.DataFrame
            输入数据
        pipeline : Pipeline
            要执行的流水线

        Returns
        -------
        Tuple[pd.DataFrame, List[Dict[str, Any]]]
            (处理后的数据, 执行报告列表)
        """
        result_df = df.copy()
        execution_reports = []

        for i, step in enumerate(pipeline.steps):
            try:
                result_df, report = execute_clean_step(result_df, step)
                report['step_index'] = i
                report['step_id'] = step.step_id
                report['step_type'] = step.step_type
                report['success'] = 'error' not in report
                execution_reports.append(report)
            except Exception as e:
                execution_reports.append({
                    'step_index': i,
                    'step_id': step.step_id,
                    'step_type': step.step_type,
                    'success': False,
                    'error': str(e)
                })

        return result_df, execution_reports

    def export_pipeline_to_script(
        self,
        pipeline: Pipeline,
        output_path: str
    ) -> str:
        """
        将流水线导出为独立的Python脚本

        Parameters
        ----------
        pipeline : Pipeline
            要导出的流水线
        output_path : str
            输出脚本路径

        Returns
        -------
        str
            生成的脚本文件路径
        """
        script_content = self._generate_pipeline_script(pipeline)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(script_content)

        return output_path

    def _generate_pipeline_script(self, pipeline: Pipeline) -> str:
        """
        生成流水线Python脚本代码

        Parameters
        ----------
        pipeline : Pipeline
            流水线对象

        Returns
        -------
        str
            生成的脚本代码
        """
        script_lines = [
            '"""',
            f'数据清洗流水线: {pipeline.name}',
            f'描述: {pipeline.description}',
            f'创建时间: {pipeline.created_at}',
            f'步骤数量: {len(pipeline.steps)}',
            '"""',
            '',
            'import pandas as pd',
            'import numpy as np',
            '',
            'def clean_data(df: pd.DataFrame) -> pd.DataFrame:',
            '    """',
            '    执行数据清洗流水线',
            '',
            '    Parameters',
            '    ----------',
            '    df : pd.DataFrame',
            '        输入的原始数据',
            '',
            '    Returns',
            '    -------',
            '    pd.DataFrame',
            '        清洗后的数据',
            '    """',
            '    result_df = df.copy()',
            ''
        ]

        for i, step in enumerate(pipeline.steps):
            script_lines.append(f'    # 步骤 {i + 1}: {step.description}')
            script_lines.extend(self._generate_step_code(step))
            script_lines.append('')

        script_lines.extend([
            '    return result_df',
            '',
            '',
            'if __name__ == "__main__":',
            '    import sys',
            '    if len(sys.argv) > 1:',
            '        input_file = sys.argv[1]',
            '        output_file = sys.argv[2] if len(sys.argv) > 2 else "cleaned_output.csv"',
            '        ',
            '        # 读取数据',
            '        if input_file.endswith(".csv"):',
            '            df = pd.read_csv(input_file)',
            '        elif input_file.endswith((".xlsx", ".xls")):',
            '            df = pd.read_excel(input_file)',
            '        elif input_file.endswith(".json"):',
            '            df = pd.read_json(input_file)',
            '        else:',
            '            raise ValueError("不支持的文件格式")',
            '        ',
            '        # 执行清洗',
            '        cleaned_df = clean_data(df)',
            '        ',
            '        # 保存结果',
            '        cleaned_df.to_csv(output_file, index=False)',
            '        print(f"数据清洗完成，已保存到 {output_file}")',
            '        print(f"原始数据: {len(df)} 行，清洗后: {len(cleaned_df)} 行")',
            '    else:',
            '        print("使用方法: python pipeline_script.py <输入文件> [输出文件]")',
            ''
        ])

        return '\n'.join(script_lines)

    def _generate_step_code(self, step: CleanStep) -> List[str]:
        """
        生成单个步骤的代码

        Parameters
        ----------
        step : CleanStep
            清洗步骤

        Returns
        -------
        List[str]
            代码行列表
        """
        params = step.parameters
        step_type = step.step_type
        code_lines = []

        if step_type == 'handle_missing':
            column = params.get('column', '')
            strategy = params.get('strategy', '')
            fill_value = params.get('fill_value')

            if strategy == 'drop_row':
                code_lines.append(f'    result_df = result_df.dropna(subset=["{column}"])')
            elif strategy == 'drop_col':
                code_lines.append(f'    result_df = result_df.drop(columns=["{column}"])')
            elif strategy == 'mean':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].fillna(result_df["{column}"].mean())')
            elif strategy == 'median':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].fillna(result_df["{column}"].median())')
            elif strategy == 'mode':
                code_lines.append(f'    mode_val = result_df["{column}"].mode()')
                code_lines.append(f'    if len(mode_val) > 0:')
                code_lines.append(f'        result_df["{column}"] = result_df["{column}"].fillna(mode_val.iloc[0])')
            elif strategy == 'ffill':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].ffill()')
            elif strategy == 'bfill':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].bfill()')
            elif strategy == 'custom':
                if isinstance(fill_value, str):
                    code_lines.append(f'    result_df["{column}"] = result_df["{column}"].fillna("{fill_value}")')
                else:
                    code_lines.append(f'    result_df["{column}"] = result_df["{column}"].fillna({fill_value})')

        elif step_type == 'detect_outliers':
            column = params.get('column', '')
            method = params.get('method', 'iqr')
            threshold = params.get('threshold', 1.5)
            action = params.get('action', 'mark')

            if method == 'iqr':
                code_lines.append(f'    q1 = result_df["{column}"].quantile(0.25)')
                code_lines.append(f'    q3 = result_df["{column}"].quantile(0.75)')
                code_lines.append(f'    iqr = q3 - q1')
                code_lines.append(f'    lower = q1 - {threshold} * iqr')
                code_lines.append(f'    upper = q3 + {threshold} * iqr')
            else:
                code_lines.append(f'    mean_val = result_df["{column}"].mean()')
                code_lines.append(f'    std_val = result_df["{column}"].std()')
                code_lines.append(f'    lower = mean_val - {threshold} * std_val')
                code_lines.append(f'    upper = mean_val + {threshold} * std_val')

            code_lines.append(f'    outlier_mask = (result_df["{column}"] < lower) | (result_df["{column}"] > upper)')
            code_lines.append(f'    outlier_mask = outlier_mask.fillna(False)')

            if action == 'mark':
                code_lines.append(f'    result_df["{column}_is_outlier"] = outlier_mask.astype(bool)')
            elif action == 'remove':
                code_lines.append(f'    result_df = result_df[~outlier_mask].reset_index(drop=True)')
            elif action == 'cap':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].clip(lower=lower, upper=upper)')

        elif step_type == 'remove_duplicates':
            subset = params.get('subset')
            keep = params.get('keep', 'first')

            if subset:
                subset_str = ', '.join([f'"{c}"' for c in subset])
                code_lines.append(f'    result_df = result_df.drop_duplicates(subset=[{subset_str}], keep="{keep}")')
            else:
                code_lines.append(f'    result_df = result_df.drop_duplicates(keep="{keep}")')

        elif step_type == 'convert_type':
            column = params.get('column', '')
            target_type = params.get('target_type', '')
            datetime_format = params.get('datetime_format')

            if target_type == 'int':
                code_lines.append(f'    result_df["{column}"] = pd.to_numeric(result_df["{column}"], errors="coerce").astype("Int64")')
            elif target_type == 'float':
                code_lines.append(f'    result_df["{column}"] = pd.to_numeric(result_df["{column}"], errors="coerce")')
            elif target_type == 'str':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].astype(str).replace({{"nan": None, "None": None}})')
            elif target_type == 'datetime':
                if datetime_format:
                    code_lines.append(f'    result_df["{column}"] = pd.to_datetime(result_df["{column}"], format="{datetime_format}", errors="coerce")')
                else:
                    code_lines.append(f'    result_df["{column}"] = pd.to_datetime(result_df["{column}"], errors="coerce")')
            elif target_type == 'category':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].astype("category")')
            elif target_type == 'bool':
                code_lines.append(f'    result_df["{column}"] = result_df["{column}"].astype(bool)')

        elif step_type == 'rename_column':
            old_name = params.get('old_name', '')
            new_name = params.get('new_name', '')
            code_lines.append(f'    result_df = result_df.rename(columns={{"{old_name}": "{new_name}"}})')

        elif step_type == 'drop_column':
            column = params.get('column', '')
            code_lines.append(f'    result_df = result_df.drop(columns=["{column}"])')

        return code_lines


def create_pipeline_from_steps(
    steps: List[CleanStep],
    name: str = '自定义清洗流水线',
    description: str = ''
) -> Pipeline:
    """
    从步骤列表快速创建流水线

    Parameters
    ----------
    steps : List[CleanStep]
        清洗步骤列表
    name : str
        流水线名称
    description : str
        流水线描述

    Returns
    -------
    Pipeline
        创建的流水线对象
    """
    manager = PipelineManager()
    return manager.create_pipeline(name=name, description=description, steps=steps)
