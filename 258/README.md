# AI Unit Test Generator (aitestgen)

一个AI驱动的单元测试用例生成器命令行工具，支持Python和JavaScript代码。

## 功能特性

- ✅ 分析代码文件中的函数和类
- ✅ 自动生成单元测试用例（pytest/Jest格式）
- ✅ 生成三种类型的测试用例：
  - 正常输入测试
  - 边界值测试
  - 异常输入测试
- ✅ 支持指定特定函数/类生成测试
- ✅ 批量生成整个项目的测试骨架
- ✅ 导出测试文件到指定目录，保持原目录结构
- ✅ 测试覆盖率预估报告
- ✅ 自定义测试代码风格
- ✅ Mock对象自动生成
- ✅ 测试用例版本管理（用于模型优化）

## 安装

```bash
pip install -r requirements.txt
```

## 使用方法

### 1. 为单个文件生成测试

```bash
# 为整个文件生成测试
python -m aitestgen.cli generate path/to/file.py

# 只生成特定函数的测试
python -m aitestgen.cli generate path/to/file.py --function function_name

# 只生成特定类的测试
python -m aitestgen.cli generate path/to/file.py --class-name ClassName

# 生成测试并显示覆盖率报告
python -m aitestgen.cli generate path/to/file.py --show-coverage

# 指定输出文件
python -m aitestgen.cli generate path/to/file.py --output tests/test_file.py
```

### 2. 批量生成项目测试

```bash
# 扫描并生成当前目录下所有文件的测试
python -m aitestgen.cli generate-all

# 指定输出目录
python -m aitestgen.cli generate-all --output-dir ./tests

# 保持原目录结构
python -m aitestgen.cli generate-all --output-dir ./tests --keep-structure
```

### 3. 扫描项目

```bash
python -m aitestgen.cli scan path/to/project
```

### 4. 覆盖率报告

```bash
# 在控制台显示覆盖率报告
python -m aitestgen.cli coverage path/to/file.py

# 导出覆盖率报告为Markdown格式
python -m aitestgen.cli coverage path/to/file.py --output coverage.md --format markdown
```

### 5. 编辑和管理测试用例版本

```bash
# 编辑生成的测试用例
python -m aitestgen.cli edit path/to/file.py function_name --editor vim

# 查看所有编辑过的测试用例
python -m aitestgen.cli list-edited

# 导出训练数据（用于模型优化）
python -m aitestgen.cli export-training --output training_data.json
python -m aitestgen.cli export-training --output training_data.jsonl --format jsonl
```

### 6. 自定义测试风格

创建一个模板文件（例如 `my_style.j2`）：

```jinja2
{% for import in imports %}
{{ import }}
{% endfor %}

# 自定义测试格式
{% for test in func_tests %}
def test_{{ test.function_name }}_custom():
    pass
{% endfor %}
```

使用自定义模板：

```bash
python -m aitestgen.cli generate path/to/file.py --style my_style.j2
```

## 项目结构

```
aitestgen/
├── __init__.py          # 包初始化
├── cli.py               # 命令行接口
├── parser.py            # 代码解析器（Python/JavaScript）
├── generator.py         # 测试用例生成器
├── scanner.py           # 项目扫描器
├── coverage.py          # 覆盖率分析器
└── versioning.py        # 版本管理器
```

## 支持的语言

- **Python**: 使用 `pytest` 框架
- **JavaScript**: 使用 `Jest` 框架

## Mock支持

自动检测并生成Mock的外部依赖包括：

**Python:**
- requests (HTTP请求)
- open() (文件操作)
- subprocess (子进程)
- datetime (日期时间)
- random (随机数)
- smtplib (邮件)
- pymongo/redis (数据库)
- 等等...

**JavaScript:**
- fetch/axios (HTTP请求)
- localStorage/sessionStorage (存储)
- console (控制台)
- 等等...

## 示例

```bash
# 为示例文件生成测试
python -m aitestgen.cli generate examples/sample.py --show-coverage

# 查看生成的测试
cat examples/test_sample.py

# 生成JavaScript测试
python -m aitestgen.cli generate examples/simple_utils.js
```
