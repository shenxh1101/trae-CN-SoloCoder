#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, '.')

from app import render_markdown
from io import BytesIO

def test_pdf_export_basic():
    """测试基本PDF导出功能"""
    print("测试1: 基本PDF导出...", end=" ")
    
    content = """# 测试文档

这是一个测试文档，包含**加粗**和*斜体*文本。

## 小标题

这是一段普通的段落文本，用于测试PDF导出功能。
"""
    try:
        from weasyprint import HTML
        
        html_content = render_markdown(content)
        pdf_css = """
            @page { size: A4; margin: 2cm; }
            body { font-family: sans-serif; }
        """
        full_html = f"""<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>{pdf_css}</style>
</head>
<body><h1>测试文档</h1>{html_content}</body></html>"""
        
        pdf_buffer = BytesIO()
        HTML(string=full_html).write_pdf(target=pdf_buffer)
        pdf_data = pdf_buffer.getvalue()
        
        if len(pdf_data) > 0 and pdf_data.startswith(b'%PDF'):
            print("✓ 通过 (PDF大小: {} bytes)".format(len(pdf_data)))
            return True
        else:
            print("✗ 失败 (无效PDF)")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_pdf_export_with_table():
    """测试包含表格的PDF导出"""
    print("测试2: 包含表格的PDF导出...", end=" ")
    
    content = """# 表格测试

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A   | B   | C   |
| D   | E   | F   |

表格测试完成。
"""
    try:
        from weasyprint import HTML
        
        html_content = render_markdown(content)
        pdf_css = """
            @page { size: A4; margin: 2cm; }
            body { font-family: sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; }
        """
        full_html = f"""<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>{pdf_css}</style>
</head>
<body>{html_content}</body></html>"""
        
        pdf_buffer = BytesIO()
        HTML(string=full_html).write_pdf(target=pdf_buffer)
        pdf_data = pdf_buffer.getvalue()
        
        if len(pdf_data) > 0:
            print("✓ 通过 (PDF大小: {} bytes)".format(len(pdf_data)))
            return True
        else:
            print("✗ 失败")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_pdf_export_with_code():
    """测试包含代码的PDF导出"""
    print("测试3: 包含代码的PDF导出...", end=" ")
    
    content = """# 代码测试

```python
def hello_world():
    print("Hello, World!")
    return True
```

代码测试完成。
"""
    try:
        from weasyprint import HTML
        
        html_content = render_markdown(content)
        pdf_css = """
            @page { size: A4; margin: 2cm; }
            body { font-family: sans-serif; }
            pre { background: #f5f5f5; padding: 10px; }
            code { font-family: monospace; }
        """
        full_html = f"""<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>{pdf_css}</style>
</head>
<body>{html_content}</body></html>"""
        
        pdf_buffer = BytesIO()
        HTML(string=full_html).write_pdf(target=pdf_buffer)
        pdf_data = pdf_buffer.getvalue()
        
        if len(pdf_data) > 0:
            print("✓ 通过 (PDF大小: {} bytes)".format(len(pdf_data)))
            return True
        else:
            print("✗ 失败")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_pdf_export_with_chinese():
    """测试中文PDF导出"""
    print("测试4: 中文PDF导出...", end=" ")
    
    content = """# 中文测试

这是一段包含中文的文本。

## 功能列表

- 支持中文显示
- 支持表格渲染
- 支持代码高亮

### 测试总结

PDF导出功能测试完成。
"""
    try:
        from weasyprint import HTML
        
        html_content = render_markdown(content)
        pdf_css = """
            @page { size: A4; margin: 2cm; }
            body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }
        """
        full_html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8">
<style>{pdf_css}</style>
</head>
<body>{html_content}</body></html>"""
        
        pdf_buffer = BytesIO()
        HTML(string=full_html).write_pdf(target=pdf_buffer)
        pdf_data = pdf_buffer.getvalue()
        
        if len(pdf_data) > 0:
            print("✓ 通过 (PDF大小: {} bytes)".format(len(pdf_data)))
            return True
        else:
            print("✗ 失败")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_pdf_export_with_tasklist():
    """测试包含任务列表的PDF导出"""
    print("测试5: 包含任务列表的PDF导出...", end=" ")
    
    content = """# 任务列表测试

待办事项：

- [x] 完成PDF导出功能
- [x] 支持中文显示
- [ ] 测试所有功能
- [ ] 部署到生产环境
"""
    try:
        from weasyprint import HTML
        
        html_content = render_markdown(content)
        pdf_css = """
            @page { size: A4; margin: 2cm; }
            body { font-family: sans-serif; }
            .task-list-item { list-style-type: none; }
        """
        full_html = f"""<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>{pdf_css}</style>
</head>
<body>{html_content}</body></html>"""
        
        pdf_buffer = BytesIO()
        HTML(string=full_html).write_pdf(target=pdf_buffer)
        pdf_data = pdf_buffer.getvalue()
        
        if len(pdf_data) > 0:
            print("✓ 通过 (PDF大小: {} bytes)".format(len(pdf_data)))
            return True
        else:
            print("✗ 失败")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_pdf_export_to_file():
    """测试导出PDF到文件"""
    print("测试6: 导出PDF到文件...", end=" ")
    
    content = """# 导出到文件测试

这是一个测试PDF文件，用于验证PDF导出功能是否正常工作。

## 特点

1. 纯Python实现，使用WeasyPrint
2. 无需额外系统依赖（如wkhtmltopdf）
3. 对中文支持良好
4. 支持表格、代码、列表等Markdown元素
"""
    try:
        from weasyprint import HTML
        
        html_content = render_markdown(content)
        pdf_css = """
            @page { size: A4; margin: 2cm; }
            body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            pre { background: #f8f8f8; padding: 15px; border-radius: 6px; }
        """
        full_html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="UTF-8">
<style>{pdf_css}</style>
</head>
<body><h1>导出到文件测试</h1>{html_content}</body></html>"""
        
        output_path = '/Users/mac/code/solo coder/136/test_output.pdf'
        HTML(string=full_html).write_pdf(target=output_path)
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            file_size = os.path.getsize(output_path)
            print(f"✓ 通过 (文件: {output_path}, 大小: {file_size} bytes)")
            return True
        else:
            print("✗ 失败 (文件未创建或为空)")
            return False
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("PDF导出功能测试")
    print("=" * 60)
    print()
    
    tests = [
        test_pdf_export_basic,
        test_pdf_export_with_table,
        test_pdf_export_with_code,
        test_pdf_export_with_chinese,
        test_pdf_export_with_tasklist,
        test_pdf_export_to_file,
    ]
    
    passed = 0
    for test_func in tests:
        if test_func():
            passed += 1
    
    print()
    print("=" * 60)
    print(f"测试结果: {passed}/{len(tests)} 通过")
    print("=" * 60)
    
    if passed == len(tests):
        print("\n🎉 所有PDF导出测试通过！")
    else:
        print(f"\n⚠️  {len(tests) - passed} 个测试失败")
