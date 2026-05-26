import os
import re
import sys
import subprocess
import concurrent.futures
from datetime import datetime
from typing import List, Dict, Optional, Callable, Tuple
from io import StringIO

from .models import (
    Task,
    ExecutionLog,
    ExecutionMode,
    TaskStatus,
    OnFailure
)
from .task_manager import TaskManager


class TaskExecutor:
    def __init__(self, task_manager: TaskManager):
        self.task_manager = task_manager
        self.output_callback: Optional[Callable[[str], None]] = None

    def set_output_callback(self, callback: Callable[[str], None]):
        self.output_callback = callback

    def _output(self, message: str):
        if self.output_callback:
            self.output_callback(message)
        else:
            print(message, flush=True)

    def _replace_parameters(self, command: str, parameters: Dict[str, str]) -> str:
        if not command:
            return command

        def replace_param(match):
            param_name = match.group(1)
            return parameters.get(param_name, match.group(0))

        pattern = r'\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}'
        result = re.sub(pattern, replace_param, command)

        remaining = re.findall(r'\$\{([^}]*)\}', result)
        if remaining:
            for param in remaining:
                print(f"警告: 未提供参数 '{param}'，保留原样")

        return result

    def _get_env_vars(self, task: Task) -> Dict[str, str]:
        env = os.environ.copy()
        env.update(task.env_vars)
        return env

    def _execute_command(self, command: str, working_dir: str, env: Dict[str, str]) -> Tuple[int, str]:
        output_buffer = StringIO()

        def read_output(pipe, buffer):
            while True:
                line = pipe.readline()
                if not line:
                    break
                decoded = line.decode('utf-8', errors='replace').rstrip('\n')
                buffer.write(decoded + '\n')
                self._output(decoded)

        try:
            process = subprocess.Popen(
                command,
                shell=True,
                cwd=working_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT
            )

            while True:
                line = process.stdout.readline()
                if not line:
                    break
                decoded = line.decode('utf-8', errors='replace').rstrip('\n')
                output_buffer.write(decoded + '\n')
                self._output(decoded)

            process.wait()
            return process.returncode, output_buffer.getvalue()
        except Exception as e:
            error_msg = f"执行命令时出错: {str(e)}"
            self._output(error_msg)
            return 1, error_msg

    def _execute_sequential(self, commands: List[str], working_dir: str, env: Dict[str, str],
                            on_failure: OnFailure) -> Tuple[TaskStatus, str, int]:
        all_output = []
        exit_code = 0

        for i, cmd in enumerate(commands):
            self._output(f"\n[命令 {i + 1}/{len(commands)}] {cmd}")
            self._output("-" * 50)

            code, output = self._execute_command(cmd, working_dir, env)
            all_output.append(f"[命令 {i + 1}] {cmd}\n{output}")

            if code != 0:
                exit_code = code
                self._output(f"\n命令执行失败，退出码: {code}")
                if on_failure == OnFailure.STOP:
                    self._output("停止执行后续命令")
                    return TaskStatus.FAILED, "\n".join(all_output), exit_code
                else:
                    self._output("继续执行后续命令")

        if exit_code == 0:
            return TaskStatus.SUCCESS, "\n".join(all_output), 0
        else:
            return TaskStatus.FAILED, "\n".join(all_output), exit_code

    def _execute_parallel(self, commands: List[str], working_dir: str, env: Dict[str, str],
                          on_failure: OnFailure) -> Tuple[TaskStatus, str, int]:
        all_output = []
        exit_code = 0
        failed = False

        self._output(f"\n并行执行 {len(commands)} 条命令")
        self._output("-" * 50)

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(commands)) as executor:
            future_to_cmd = {
                executor.submit(self._execute_command, cmd, working_dir, env): cmd
                for cmd in commands
            }

            for future in concurrent.futures.as_completed(future_to_cmd):
                cmd = future_to_cmd[future]
                try:
                    code, output = future.result()
                    all_output.append(f"[命令] {cmd}\n{output}")
                    if code != 0:
                        exit_code = code
                        failed = True
                        self._output(f"命令执行失败: {cmd}，退出码: {code}")
                except Exception as e:
                    all_output.append(f"[命令] {cmd}\n异常: {str(e)}")
                    exit_code = 1
                    failed = True

        if failed and on_failure == OnFailure.STOP:
            return TaskStatus.FAILED, "\n".join(all_output), exit_code

        if failed:
            return TaskStatus.FAILED, "\n".join(all_output), exit_code
        else:
            return TaskStatus.SUCCESS, "\n".join(all_output), 0

    def execute_task(self, task_name: str, parameters: Optional[Dict[str, str]] = None,
                     execute_dependencies: bool = True) -> ExecutionLog:
        task = self.task_manager.get_task(task_name)
        if not task:
            raise ValueError(f"任务 '{task_name}' 不存在")

        parameters = parameters or {}
        merged_params = {**task.parameters, **parameters}

        commands = [cmd for cmd in task.commands if cmd is not None]

        if execute_dependencies:
            dependencies = self.task_manager.resolve_dependencies(task_name)
            for dep_name in dependencies:
                if dep_name == task_name:
                    continue
                self._output(f"\n=== 执行依赖任务: {dep_name} ===")
                dep_log = self.execute_task(dep_name, parameters, execute_dependencies=False)
                if dep_log.status != TaskStatus.SUCCESS:
                    error_msg = f"依赖任务 '{dep_name}' 执行失败，中止任务 '{task_name}'"
                    self._output(error_msg)
                    return ExecutionLog(
                        task_name=task_name,
                        start_time=datetime.now().isoformat(),
                        end_time=datetime.now().isoformat(),
                        status=TaskStatus.SKIPPED,
                        output=error_msg,
                        exit_code=1,
                        parameters=merged_params
                    )

        self._output(f"\n{'=' * 60}")
        self._output(f"开始执行任务: {task_name}")
        self._output(f"{'=' * 60}")

        start_time = datetime.now()

        if task.backup_paths:
            self._output(f"\n执行备份...")
            backup_dir = os.path.join(self.task_manager.data_dir, "backups", task_name)
            backed_up = self.task_manager.backup_paths(task.backup_paths, backup_dir)
            for path in backed_up:
                self._output(f"已备份: {path}")

        commands = [self._replace_parameters(cmd, merged_params) for cmd in commands]
        env = self._get_env_vars(task)

        self._output(f"工作目录: {os.path.abspath(task.working_dir)}")
        if merged_params:
            self._output(f"参数: {merged_params}")
        if task.env_vars:
            self._output(f"环境变量: {task.env_vars}")

        if task.execution_mode == ExecutionMode.SEQUENTIAL:
            status, output, exit_code = self._execute_sequential(
                commands, task.working_dir, env, task.on_failure
            )
        else:
            status, output, exit_code = self._execute_parallel(
                commands, task.working_dir, env, task.on_failure
            )

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        self._output(f"\n{'=' * 60}")
        self._output(f"任务 '{task_name}' 执行完成")
        self._output(f"状态: {status.value}")
        self._output(f"耗时: {duration:.2f} 秒")
        self._output(f"退出码: {exit_code}")
        self._output(f"{'=' * 60}\n")

        log = ExecutionLog(
            task_name=task_name,
            start_time=start_time.isoformat(),
            end_time=end_time.isoformat(),
            status=status,
            output=output,
            exit_code=exit_code,
            parameters=merged_params
        )

        self.task_manager.add_log(log)
        return log

    def execute_group(self, group_name: str, parameters: Optional[Dict[str, str]] = None) -> List[ExecutionLog]:
        group = self.task_manager.get_group(group_name)
        if not group:
            raise ValueError(f"任务组 '{group_name}' 不存在")

        self._output(f"\n{'#' * 60}")
        self._output(f"开始执行任务组: {group_name}")
        self._output(f"包含任务: {', '.join(group.tasks)}")
        self._output(f"{'#' * 60}")

        logs = []
        for task_name in group.tasks:
            log = self.execute_task(task_name, parameters)
            logs.append(log)

        return logs
