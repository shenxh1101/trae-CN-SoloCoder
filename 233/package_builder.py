import zipfile
import json
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any
from manual_generator import ProductManual, ManualGenerator
from config import Config


class PackageBuilder:
    def __init__(self):
        Config.ensure_dirs()
        self.generator = ManualGenerator()
    
    def _get_product_image_url(self, product_name: str, index: int = 0) -> str:
        product_images = {
            'smartphone': [
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=600&fit=crop'
            ],
            'watch': [
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&h=600&fit=crop'
            ],
            'headphone': [
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=600&fit=crop'
            ],
            'camera': [
                'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&h=600&fit=crop'
            ],
            'laptop': [
                'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=600&fit=crop'
            ],
            'default': [
                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=600&fit=crop',
                'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&h=600&fit=crop'
            ]
        }
        
        product_type = 'default'
        name_lower = product_name.lower()
        if "手表" in product_name or "watch" in name_lower or "smartwatch" in name_lower:
            product_type = "watch"
        elif "耳机" in product_name or "earphone" in name_lower or "headphone" in name_lower or "earbuds" in name_lower:
            product_type = "headphone"
        elif "相机" in product_name or "camera" in name_lower:
            product_type = "camera"
        elif "笔记本" in product_name or "laptop" in name_lower or "电脑" in product_name:
            product_type = "laptop"
        elif "手机" in product_name or "phone" in name_lower or "smartphone" in name_lower:
            product_type = "smartphone"
        
        images = product_images.get(product_type, product_images['default'])
        return images[index % len(images)]
    
    def create_product_page(self, manual: ProductManual, image_paths: List[str] = None,
                            output_path: str = None) -> str:
        if output_path is None:
            safe_name = manual.product_name.replace(' ', '_').replace('/', '_')
            output_path = Config.OUTPUT_DIR / f"{safe_name}_page.html"
        else:
            output_path = Path(output_path)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        html_content = self._build_product_page_html(manual, image_paths or [])
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return str(output_path)
    
    def _build_product_page_html(self, manual: ProductManual, image_paths: List[str]) -> str:
        features_html = ""
        for i, feature in enumerate(manual.features):
            icon_options = ['✨', '⚡', '🎯', '🌟', '💡', '🚀', '🎨', '🔧']
            icon = icon_options[i % len(icon_options)]
            features_html += f'<div class="feature-card"><div class="feature-icon">{icon}</div><div class="feature-title">{feature}</div></div>\n'
        
        images_html = ""
        if image_paths:
            for img_path in image_paths:
                if img_path.startswith('http'):
                    images_html += f'<div class="gallery-item"><img src="{img_path}" alt="产品图片" loading="lazy"></div>\n'
                else:
                    img_p = Path(img_path)
                    if img_p.exists():
                        import base64
                        with open(img_path, 'rb') as f:
                            img_data = base64.b64encode(f.read()).decode()
                        ext = img_p.suffix[1:]
                        images_html += f'<div class="gallery-item"><img src="data:image/{ext};base64,{img_data}" alt="产品图片" loading="lazy"></div>\n'
        else:
            for i in range(3):
                img_url = self._get_product_image_url(manual.product_name, i)
                images_html += f'<div class="gallery-item"><img src="{img_url}" alt="产品图片 {i+1}" loading="lazy"></div>\n'
        
        content_sections = ""
        section_titles = {
            "overview": "产品概述",
            "specifications": "规格参数",
            "features": "功能详解",
            "precautions": "使用注意事项",
            "packing_list": "包装清单"
        }
        
        section_icons = {
            "overview": "📋",
            "specifications": "📊",
            "features": "🔍",
            "precautions": "⚠️",
            "packing_list": "📦"
        }
        
        try:
            import markdown
            has_markdown = True
        except ImportError:
            has_markdown = False
        
        for section_key, title in section_titles.items():
            if section_key in manual.sections:
                if has_markdown:
                    section_html = markdown.markdown(manual.sections[section_key], 
                                                   extensions=['tables', 'fenced_code'])
                else:
                    section_html = manual.sections[section_key].replace('\n', '<br>')
                
                icon = section_icons.get(section_key, '📄')
                content_sections += f'''
        <section class="content-section" id="{section_key}">
            <h2>{icon} {title}</h2>
            <div class="section-content">
                {section_html}
            </div>
        </section>
'''
        
        nav_items = ""
        for key, title in section_titles.items():
            if key in manual.sections:
                nav_items += f'<a href="#{key}" class="nav-link">{title}</a>'
        
        features_str = ", ".join(manual.features[:3])
        
        style_tag = '''
        <style>
            :root {
                --primary: #667eea;
                --secondary: #764ba2;
                --accent: #f093fb;
                --dark: #1e293b;
                --light: #f8fafc;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html { scroll-behavior: smooth; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
                background: linear-gradient(180deg, #f0f4ff 0%, #ffffff 30%);
                color: var(--dark);
                line-height: 1.7;
            }
            .nav-bar {
                position: sticky;
                top: 0;
                background: rgba(255,255,255,0.95);
                backdrop-filter: blur(10px);
                border-bottom: 1px solid rgba(102,126,234,0.1);
                z-index: 100;
                padding: 12px 24px;
            }
            .nav-container { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 24px; }
            .nav-logo { font-weight: 800; font-size: 1.1rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .nav-links { display: flex; gap: 16px; flex-wrap: wrap; }
            .nav-link { color: #64748b; text-decoration: none; font-size: 0.85rem; font-weight: 500; padding: 6px 12px; border-radius: 6px; transition: all 0.2s; }
            .nav-link:hover { background: var(--primary); color: white; }
            .hero {
                background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--accent) 100%);
                color: white;
                padding: 80px 24px 100px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .hero::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%); animation: pulse 4s ease-in-out infinite; }
            @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.8; } }
            .hero-content { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
            .hero h1 { font-size: 3rem; font-weight: 800; margin-bottom: 16px; text-shadow: 0 4px 20px rgba(0,0,0,0.2); letter-spacing: -0.02em; }
            .hero .slogan { font-size: 1.35rem; opacity: 0.95; margin-bottom: 20px; font-style: italic; }
            .hero .positioning { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 50px; font-size: 0.95rem; backdrop-filter: blur(10px); }
            .container { max-width: 1200px; margin: 0 auto; padding: 40px 24px; }
            .section-title { font-size: 1.75rem; font-weight: 700; margin-bottom: 32px; color: var(--dark); position: relative; padding-bottom: 12px; }
            .section-title::after { content: ''; position: absolute; bottom: 0; left: 0; width: 60px; height: 4px; background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 2px; }
            .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 0 0 60px; }
            .gallery-item { border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; }
            .gallery-item:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(102,126,234,0.25); }
            .gallery-item img { width: 100%; height: 240px; object-fit: cover; display: block; }
            .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 0 0 60px; }
            .feature-card { background: white; padding: 28px 24px; border-radius: 16px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.06); transition: all 0.3s; border: 1px solid rgba(0,0,0,0.03); }
            .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(102,126,234,0.15); border-color: rgba(102,126,234,0.2); }
            .feature-icon { font-size: 2.5rem; margin-bottom: 12px; }
            .feature-title { font-weight: 600; font-size: 1rem; color: var(--dark); }
            .content-section { margin-bottom: 60px; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
            .content-section h2 { font-size: 1.5rem; margin-bottom: 24px; color: var(--dark); }
            .section-content { color: #475569; }
            .section-content p { margin: 12px 0; }
            .section-content ul, .section-content ol { margin: 16px 0; padding-left: 28px; }
            .section-content li { margin: 8px 0; }
            .section-content table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .section-content th, .section-content td { border: 1px solid #e2e8f0; padding: 14px 18px; text-align: left; }
            .section-content th { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; font-weight: 600; }
            .section-content tr:nth-child(even) { background: #f8fafc; }
            .footer { text-align: center; padding: 40px 24px; color: #94a3b8; font-size: 0.9rem; border-top: 1px solid #e2e8f0; margin-top: 60px; }
            @media (max-width: 768px) {
                .hero h1 { font-size: 2rem; }
                .nav-links { display: none; }
                .content-section { padding: 24px; }
            }
        </style>
        '''
        
        return f"""<!DOCTYPE html>
<html lang="{manual.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{manual.slogan}">
    <meta name="keywords" content="{features_str}">
    <title>{manual.product_name} - 产品介绍</title>
    {style_tag}
</head>
<body>
    <nav class="nav-bar">
        <div class="nav-container">
            <div class="nav-logo">{manual.product_name}</div>
            <div class="nav-links">
                {nav_items}
            </div>
        </div>
    </nav>

    <header class="hero">
        <div class="hero-content">
            <h1>{manual.product_name}</h1>
            <p class="slogan">{manual.slogan}</p>
            <p class="positioning">{manual.positioning}</p>
        </div>
    </header>

    <main class="container">
        <h2 class="section-title">产品图集</h2>
        <div class="gallery">
            {images_html}
        </div>

        <h2 class="section-title">核心功能</h2>
        <div class="features-grid">
            {features_html}
        </div>

        {content_sections}
    </main>

    <footer class="footer">
        <p>&copy; 2026 {manual.product_name} - {manual.slogan}</p>
        <p style="margin-top: 8px;">本页面由AI产品说明书生成工具自动创建</p>
    </footer>
</body>
</html>"""
    
    def create_zip_package(self, manual: ProductManual, formats: List[str] = None,
                           image_paths: List[str] = None, output_path: str = None) -> str:
        if formats is None:
            formats = ["markdown", "html", "text"]
        
        if output_path is None:
            safe_name = manual.product_name.replace(' ', '_').replace('/', '_')
            output_path = Config.OUTPUT_DIR / f"{safe_name}_package.zip"
        else:
            output_path = Path(output_path)
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        temp_files = []
        
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for fmt in formats:
                ext = self._get_format_extension(fmt)
                temp_path = Config.OUTPUT_DIR / f"temp_{manual.product_name}.{ext}"
                self.generator.save_manual(manual, str(temp_path), fmt)
                zf.write(temp_path, f"{manual.product_name}_说明书.{ext}")
                temp_files.append(temp_path)
            
            product_page_path = self.create_product_page(manual, image_paths, 
                                                         Config.OUTPUT_DIR / "temp_page.html")
            zf.write(product_page_path, f"{manual.product_name}_产品页面.html")
            temp_files.append(Path(product_page_path))
            
            metadata_path = Config.OUTPUT_DIR / "temp_metadata.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(manual.to_dict(), f, ensure_ascii=False, indent=2)
            zf.write(metadata_path, "metadata.json")
            temp_files.append(metadata_path)
        
        for temp_file in temp_files:
            if temp_file.exists():
                temp_file.unlink()
        
        return str(output_path)
    
    def _get_format_extension(self, format: str) -> str:
        extensions = {
            "markdown": "md",
            "html": "html",
            "text": "txt"
        }
        return extensions.get(format, "md")
    
    def batch_create_zips(self, manuals: List[ProductManual], output_dir: str = None) -> List[str]:
        if output_dir is None:
            output_dir = Config.OUTPUT_DIR
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        zip_files = []
        for manual in manuals:
            zip_path = self.create_zip_package(manual, output_path=output_dir / 
                                               f"{manual.product_name.replace(' ', '_')}_package.zip")
            zip_files.append(zip_path)
        
        return zip_files
