import json
import tempfile
import subprocess
import os
from pathlib import Path
from typing import Dict, Any
from manual_generator import ProductManual, ManualGenerator
from config import Config


class PreviewEditor:
    def __init__(self):
        self.generator = ManualGenerator()
        Config.ensure_dirs()
    
    def preview_in_terminal(self, manual: ProductManual):
        print("\n" + "="*60)
        print(f"📄 {manual.product_name} 产品说明书预览")
        print("="*60 + "\n")
        
        if manual.slogan:
            print(f"🎯 广告语: {manual.slogan}\n")
        
        print(f"📍 产品定位: {manual.positioning}")
        print(f"🎨 写作风格: {manual.style}")
        print(f"🌐 语言: {manual.language}\n")
        
        print("-"*60)
        print("📋 章节列表:")
        for i, (section_key, content) in enumerate(manual.sections.items(), 1):
            section_names = {
                "overview": "产品概述",
                "specifications": "规格参数",
                "features": "功能详解",
                "precautions": "使用注意事项",
                "packing_list": "包装清单"
            }
            name = section_names.get(section_key, section_key)
            preview = content[:100].replace('\n', ' ') + "..." if len(content) > 100 else content
            print(f"  {i}. {name} - {preview}")
        print("-"*60 + "\n")
    
    def open_in_browser(self, manual: ProductManual) -> str:
        temp_html = Path(tempfile.gettempdir()) / f"{manual.product_name}_preview.html"
        self.generator.save_manual(manual, str(temp_html), "html")
        
        try:
            if os.name == 'posix':
                subprocess.run(['open' if os.name == 'darwin' else 'xdg-open', str(temp_html)])
            elif os.name == 'nt':
                os.startfile(str(temp_html))
        except Exception as e:
            print(f"无法自动打开浏览器: {e}")
            print(f"预览文件已保存到: {temp_html}")
        
        return str(temp_html)
    
    def interactive_edit(self, manual: ProductManual) -> ProductManual:
        while True:
            self.preview_in_terminal(manual)
            
            print("\n请选择操作:")
            print("  1. 修改整个文档")
            print("  2. 修改指定章节")
            print("  3. 生成广告语")
            print("  4. 浏览器预览")
            print("  5. 保存并退出")
            print("  6. 不保存退出")
            
            choice = input("\n请输入选项 (1-6): ").strip()
            
            if choice == "1":
                suggestions = input("\n请输入修改意见: ").strip()
                if suggestions:
                    print("\n正在重新生成...")
                    manual = self.generator.revise(manual, suggestions)
                    print("✓ 文档已更新")
            
            elif choice == "2":
                section_names = {
                    "1": ("overview", "产品概述"),
                    "2": ("specifications", "规格参数"),
                    "3": ("features", "功能详解"),
                    "4": ("precautions", "使用注意事项"),
                    "5": ("packing_list", "包装清单")
                }
                
                print("\n请选择要修改的章节:")
                for key, (_, name) in section_names.items():
                    print(f"  {key}. {name}")
                
                section_choice = input("\n请输入章节编号: ").strip()
                if section_choice in section_names:
                    section_key, section_name = section_names[section_choice]
                    suggestions = input(f"\n请输入对「{section_name}」的修改意见: ").strip()
                    if suggestions:
                        print(f"\n正在重新生成「{section_name}」...")
                        manual = self.generator.revise(manual, suggestions, section_key)
                        print(f"✓ 「{section_name}」已更新")
            
            elif choice == "3":
                print("\n正在生成新的广告语...")
                manual.slogan = self.generator.generate_slogan(
                    manual.product_name,
                    manual.features,
                    manual.positioning,
                    manual.language,
                    "marketing"
                )
                print(f"✓ 新广告语: {manual.slogan}")
            
            elif choice == "4":
                print("\n正在打开浏览器预览...")
                path = self.open_in_browser(manual)
                print(f"✓ 预览已打开: {path}")
            
            elif choice == "5":
                print("\n正在保存...")
                return manual
            
            elif choice == "6":
                print("\n放弃修改")
                return None
            
            else:
                print("\n无效选项，请重新选择")
    
    def save_manual_data(self, manual: ProductManual, output_path: str = None) -> str:
        if output_path is None:
            safe_name = manual.product_name.replace(' ', '_').replace('/', '_')
            output_path = Config.OUTPUT_DIR / f"{safe_name}_data.json"
        else:
            output_path = Path(output_path)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(manual.to_dict(), f, ensure_ascii=False, indent=2)
        
        return str(output_path)
    
    def load_manual_data(self, input_path: str) -> ProductManual:
        input_path = Path(input_path)
        if not input_path.exists():
            raise FileNotFoundError(f"文件不存在: {input_path}")
        
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return ProductManual.from_dict(data)
