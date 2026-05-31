from setuptools import setup, find_packages

setup(
    name="smell-detector",
    version="1.0.0",
    description="代码异味检测与解释器 - 检测 Python/JavaScript 代码中的异味并提供重构建议",
    packages=find_packages(),
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "smell-detector=smell_detector.cli:main",
        ],
    },
)
