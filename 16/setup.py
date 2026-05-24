from setuptools import setup, find_packages

setup(
    name="taskmanager",
    version="1.0.0",
    description="功能强大的命令行任务管理工具",
    long_description="命令行任务管理工具，支持任务添加、编辑、删除、标签搜索、依赖管理、重复任务、数据导出导入等功能",
    author="TaskManager",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[],
    extras_require={
        "windows": ["win10toast>=0.9"],
    },
    entry_points={
        "console_scripts": [
            "task=taskmanager:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
)
