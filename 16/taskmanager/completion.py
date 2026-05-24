import os
from typing import List


class CompletionGenerator:
    ZSH_COMPLETION = """#compdef task

_task() {
    local -a commands
    commands=(
        'add:添加新任务'
        'list:列出所有任务'
        'show:显示任务详情'
        'edit:编辑任务'
        'delete:删除任务'
        'status:设置任务状态'
        'start:标记任务为进行中'
        'complete:标记任务为已完成'
        'hold:标记任务为已搁置'
        'search:按标签搜索任务'
        'report:生成每日任务报告'
        'depend:管理任务依赖'
        'export:导出任务数据'
        'import:导入任务数据'
        'theme:切换主题'
        'reminder:设置任务提醒'
        'trash:回收站管理'
        'completion:生成自动补全脚本'
        'daemon:启动后台守护进程'
        'tags:列出所有标签'
    )

    _arguments -C \\
        '1: :->command' \\
        '*:: :->args'

    case $state in
        command)
            _describe -t commands 'task commands' commands
            ;;
        args)
            case $words[1] in
                add)
                    _arguments \\
                        '--title[任务标题]:title:' \\
                        '--description[任务描述]:description:' \\
                        '--priority[优先级]:priority:(low medium high urgent)' \\
                        '--tags[标签，用逗号分隔]:tags:' \\
                        '--due-date[截止日期 YYYY-MM-DD]:due_date:' \\
                        '--repeat[重复频率]:repeat:(none daily weekly monthly)'
                    ;;
                list)
                    _arguments \\
                        '--status[按状态筛选]:status:(pending in_progress completed on_hold)' \\
                        '--sort[排序方式]:sort:(priority due_date created_at updated_at status title)' \\
                        '--reverse[反转排序]'
                    ;;
                show|edit|delete|start|complete|hold)
                    _arguments '*:task_id:_task_ids'
                    ;;
                status)
                    _arguments \\
                        '1:task_id:_task_ids' \\
                        '2:status:(pending in_progress completed on_hold)'
                    ;;
                search)
                    _arguments \\
                        '--tags[标签列表]:tags:' \\
                        '--any[匹配任意标签]'
                    ;;
                export)
                    _arguments \\
                        '--format[导出格式]:format:(csv html json)' \\
                        '--output[输出文件路径]:output:_files'
                    ;;
                import)
                    _arguments \\
                        '--file[导入文件路径]:file:_files' \\
                        '--merge[合并到现有任务]'
                    ;;
                theme)
                    _arguments '1:theme:(dark light)'
                    ;;
                reminder)
                    _arguments \\
                        '1:task_id:_task_ids' \\
                        '--time[提醒时间 YYYY-MM-DD HH:MM]:time:'
                    ;;
                trash)
                    _arguments \\
                        '1:action:(list restore empty)' \\
                        '2:task_id:_task_ids'
                    ;;
                depend)
                    _arguments \\
                        '1:action:(add remove show)' \\
                        '2:task_id:_task_ids' \\
                        '3:dependency_id:_task_ids'
                    ;;
            esac
            ;;
    esac
}

_task_ids() {
    local -a ids
    ids=($(task list --all-ids 2>/dev/null))
    _describe -t task-ids 'task IDs' ids
}

_task "$@"
"""

    BASH_COMPLETION = """_task() {
    local cur prev words cword
    _init_completion || return

    local commands="add list show edit delete status start complete hold search report depend export import theme reminder trash completion daemon tags"

    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "$commands" -- "$cur"))
        return 0
    fi

    case ${words[1]} in
        add)
            local opts="--title --description --priority --tags --due-date --repeat"
            local priorities="low medium high urgent"
            local repeats="none daily weekly monthly"
            if [[ "$prev" == "--priority" ]]; then
                COMPREPLY=($(compgen -W "$priorities" -- "$cur"))
            elif [[ "$prev" == "--repeat" ]]; then
                COMPREPLY=($(compgen -W "$repeats" -- "$cur"))
            else
                COMPREPLY=($(compgen -W "$opts" -- "$cur"))
            fi
            ;;
        list)
            local opts="--status --sort --reverse"
            local statuses="pending in_progress completed on_hold"
            local sorts="priority due_date created_at updated_at status title"
            if [[ "$prev" == "--status" ]]; then
                COMPREPLY=($(compgen -W "$statuses" -- "$cur"))
            elif [[ "$prev" == "--sort" ]]; then
                COMPREPLY=($(compgen -W "$sorts" -- "$cur"))
            else
                COMPREPLY=($(compgen -W "$opts" -- "$cur"))
            fi
            ;;
        show|edit|delete|start|complete|hold)
            COMPREPLY=($(compgen -W "$(_get_task_ids)" -- "$cur"))
            ;;
        status)
            local statuses="pending in_progress completed on_hold"
            if [[ $cword -eq 2 ]]; then
                COMPREPLY=($(compgen -W "$(_get_task_ids)" -- "$cur"))
            else
                COMPREPLY=($(compgen -W "$statuses" -- "$cur"))
            fi
            ;;
        theme)
            COMPREPLY=($(compgen -W "dark light" -- "$cur"))
            ;;
        export)
            local opts="--format --output"
            local formats="csv html json"
            if [[ "$prev" == "--format" ]]; then
                COMPREPLY=($(compgen -W "$formats" -- "$cur"))
            elif [[ "$prev" == "--output" ]]; then
                _filedir
            else
                COMPREPLY=($(compgen -W "$opts" -- "$cur"))
            fi
            ;;
        import)
            if [[ "$prev" == "--file" ]]; then
                _filedir json
            else
                COMPREPLY=($(compgen -W "--file --merge" -- "$cur"))
            fi
            ;;
        trash)
            COMPREPLY=($(compgen -W "list restore empty" -- "$cur"))
            ;;
        depend)
            COMPREPLY=($(compgen -W "add remove show" -- "$cur"))
            ;;
    esac

    return 0
}

_get_task_ids() {
    task list --all-ids 2>/dev/null
}

complete -F _task task
"""

    FISH_COMPLETION = """function __fish_task_no_subcommand
    set -l cmds (commandline -opc)
    if test (count $cmds) -eq 1
        return 0
    end
    return 1
end

function __fish_task_using_command
    set -l cmds (commandline -opc)
    if test (count $cmds) -gt 1
        if test $cmds[2] = $argv[1]
            return 0
        end
    end
    return 1
end

function __fish_task_ids
    task list --all-ids 2>/dev/null
end

complete -c task -f -n __fish_task_no_subcommand -a add -d '添加新任务'
complete -c task -f -n __fish_task_no_subcommand -a list -d '列出所有任务'
complete -c task -f -n __fish_task_no_subcommand -a show -d '显示任务详情'
complete -c task -f -n __fish_task_no_subcommand -a edit -d '编辑任务'
complete -c task -f -n __fish_task_no_subcommand -a delete -d '删除任务'
complete -c task -f -n __fish_task_no_subcommand -a status -d '设置任务状态'
complete -c task -f -n __fish_task_no_subcommand -a start -d '标记任务为进行中'
complete -c task -f -n __fish_task_no_subcommand -a complete -d '标记任务为已完成'
complete -c task -f -n __fish_task_no_subcommand -a hold -d '标记任务为已搁置'
complete -c task -f -n __fish_task_no_subcommand -a search -d '按标签搜索任务'
complete -c task -f -n __fish_task_no_subcommand -a report -d '生成每日任务报告'
complete -c task -f -n __fish_task_no_subcommand -a depend -d '管理任务依赖'
complete -c task -f -n __fish_task_no_subcommand -a export -d '导出任务数据'
complete -c task -f -n __fish_task_no_subcommand -a import -d '导入任务数据'
complete -c task -f -n __fish_task_no_subcommand -a theme -d '切换主题'
complete -c task -f -n __fish_task_no_subcommand -a reminder -d '设置任务提醒'
complete -c task -f -n __fish_task_no_subcommand -a trash -d '回收站管理'
complete -c task -f -n __fish_task_no_subcommand -a completion -d '生成自动补全脚本'
complete -c task -f -n __fish_task_no_subcommand -a daemon -d '启动后台守护进程'
complete -c task -f -n __fish_task_no_subcommand -a tags -d '列出所有标签'

# add command
complete -c task -f -n '__fish_task_using_command add' -l title -d '任务标题'
complete -c task -f -n '__fish_task_using_command add' -l description -d '任务描述'
complete -c task -f -n '__fish_task_using_command add' -l priority -d '优先级' -a 'low medium high urgent'
complete -c task -f -n '__fish_task_using_command add' -l tags -d '标签，用逗号分隔'
complete -c task -f -n '__fish_task_using_command add' -l due-date -d '截止日期 YYYY-MM-DD'
complete -c task -f -n '__fish_task_using_command add' -l repeat -d '重复频率' -a 'none daily weekly monthly'

# list command
complete -c task -f -n '__fish_task_using_command list' -l status -d '按状态筛选' -a 'pending in_progress completed on_hold'
complete -c task -f -n '__fish_task_using_command list' -l sort -d '排序方式' -a 'priority due_date created_at updated_at status title'
complete -c task -f -n '__fish_task_using_command list' -l reverse -d '反转排序'

# commands with task ID
complete -c task -f -n '__fish_task_using_command show' -a '(__fish_task_ids)'
complete -c task -f -n '__fish_task_using_command edit' -a '(__fish_task_ids)'
complete -c task -f -n '__fish_task_using_command delete' -a '(__fish_task_ids)'
complete -c task -f -n '__fish_task_using_command start' -a '(__fish_task_ids)'
complete -c task -f -n '__fish_task_using_command complete' -a '(__fish_task_ids)'
complete -c task -f -n '__fish_task_using_command hold' -a '(__fish_task_ids)'

# theme command
complete -c task -f -n '__fish_task_using_command theme' -a 'dark light'

# status command
complete -c task -f -n '__fish_task_using_command status' -a '(__fish_task_ids)'
complete -c task -f -n '__fish_task_using_command status' -a 'pending in_progress completed on_hold'

# export command
complete -c task -f -n '__fish_task_using_command export' -l format -d '导出格式' -a 'csv html json'
complete -c task -f -n '__fish_task_using_command export' -l output -d '输出文件路径'

# import command
complete -c task -f -n '__fish_task_using_command import' -l file -d '导入文件路径'
complete -c task -f -n '__fish_task_using_command import' -l merge -d '合并到现有任务'

# trash command
complete -c task -f -n '__fish_task_using_command trash' -a 'list restore empty'

# depend command
complete -c task -f -n '__fish_task_using_command depend' -a 'add remove show'
"""

    @classmethod
    def generate(cls, shell: str, output_dir: str = None) -> str:
        shell = shell.lower()
        if shell == "zsh":
            content = cls.ZSH_COMPLETION
            filename = "_task"
        elif shell == "bash":
            content = cls.BASH_COMPLETION
            filename = "task.bash"
        elif shell == "fish":
            content = cls.FISH_COMPLETION
            filename = "task.fish"
        else:
            raise ValueError(f"不支持的shell: {shell}")

        if output_dir:
            filepath = os.path.join(output_dir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            return filepath

        return content

    @classmethod
    def get_install_instructions(cls, shell: str) -> str:
        shell = shell.lower()
        if shell == "zsh":
            return """
Zsh 自动补全安装说明：

1. 生成补全脚本：
   task completion zsh > ~/.zsh/completion/_task

2. 确保以下内容在 ~/.zshrc 中：
   fpath=(~/.zsh/completion $fpath)
   autoload -Uz compinit
   compinit

3. 重启shell或执行：
   source ~/.zshrc
"""
        elif shell == "bash":
            return """
Bash 自动补全安装说明：

1. 生成补全脚本：
   task completion bash > ~/.bash_completion.d/task.bash

2. 确保以下内容在 ~/.bashrc 中：
   if [ -f ~/.bash_completion.d/task.bash ]; then
       . ~/.bash_completion.d/task.bash
   fi

3. 重启shell或执行：
   source ~/.bashrc
"""
        elif shell == "fish":
            return """
Fish 自动补全安装说明：

1. 生成补全脚本：
   task completion fish > ~/.config/fish/completions/task.fish

2. 重启shell或执行：
   source ~/.config/fish/completions/task.fish
"""
        else:
            return f"不支持的shell: {shell}"

    @classmethod
    def get_supported_shells(cls) -> List[str]:
        return ["zsh", "bash", "fish"]
