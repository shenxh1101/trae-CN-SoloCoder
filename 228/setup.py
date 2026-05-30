from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name='ai-refactor',
    version='1.0.0',
    description='AI代码重构建议生成器 - 分析代码质量并生成智能重构建议',
    long_description=long_description,
    long_description_content_type='text/markdown',
    author='AI Refactor Tool',
    url='https://github.com/ai-refactor/ai-refactor',
    packages=find_packages(),
    py_modules=['ai_refactor'],
    install_requires=[
        'click>=8.0',
        'rich>=13.0',
    ],
    extras_require={
        'full': [
            'radon>=6.0',
            'gitpython>=3.1.0',
        ],
        'radon': ['radon>=6.0'],
        'git': ['gitpython>=3.1.0'],
    },
    entry_points={
        'console_scripts': [
            'ai-refactor=ai_refactor:cli',
        ],
    },
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Intended Audience :: Developers',
        'Topic :: Software Development :: Code Generators',
        'Topic :: Software Development :: Quality Assurance',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Programming Language :: Python :: 3.13',
    ],
    keywords='refactor code-quality static-analysis code-review ai',
    python_requires='>=3.8',
    include_package_data=True,
    zip_safe=False,
)
