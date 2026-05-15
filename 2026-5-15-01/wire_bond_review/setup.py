from setuptools import setup, find_packages

setup(
    name="wire-bond-review",
    version="1.0.0",
    description="微电子封装车间焊线参数与连接可靠性复盘工具",
    author="Wire Bond Review Team",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "click>=8.0",
        "pandas>=1.5",
        "numpy>=1.21",
        "scipy>=1.7",
        "scikit-learn>=1.0",
        "matplotlib>=3.4",
        "seaborn>=0.11",
        "jinja2>=3.0",
        "pyyaml>=6.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-cov>=4.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "wire-bond=wire_bond_review.cli:cli",
        ],
    },
    python_requires=">=3.8",
)
