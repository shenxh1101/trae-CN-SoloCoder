from setuptools import setup, find_packages

setup(
    name="codedoc",
    version="1.0.0",
    description="AI代码错误诊断与修复建议工具",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "codedoc=codedoc.cli:main",
        ],
    },
    python_requires=">=3.8",
)
