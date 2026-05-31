import os
from typing import Optional, Dict, List
from .models import TravelPlan


PDF_ENGINES = {
    "weasyprint": {
        "name": "WeasyPrint",
        "pip_cmd": "pip install weasyprint",
        "system_deps": {
            "Darwin": "brew install pango glib",
            "Linux": "sudo apt-get install libpango-1.0-0 libpangoft2-1.0-0",
            "Windows": "需安装GTK+运行库",
        },
        "description": "推荐方案，渲染质量最好，支持复杂布局和中文显示效果最佳",
    },
    "xhtml2pdf": {
        "name": "xhtml2pdf",
        "pip_cmd": "pip install xhtml2pdf",
        "system_deps": {},
        "description": "纯Python实现，无需额外系统依赖",
    },
    "reportlab": {
        "name": "ReportLab",
        "pip_cmd": "pip install reportlab",
        "system_deps": {},
        "description": "自动检测系统中文字体，兼容性最好",
    },
}


class ExportManager:
    def __init__(self, output_dir: Optional[str] = None):
        if output_dir:
            self.output_dir = output_dir
        else:
            self.output_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output"
            )
        os.makedirs(self.output_dir, exist_ok=True)

    def get_pdf_engines_status(self) -> Dict[str, Dict]:
        import platform
        current_os = platform.system()
        
        status = {}
        for engine_id, engine_info in PDF_ENGINES.items():
            available = False
            error_msg = ""
            
            try:
                if engine_id == "weasyprint":
                    import weasyprint
                    available = True
                elif engine_id == "xhtml2pdf":
                    from xhtml2pdf import pisa
                    available = True
                elif engine_id == "reportlab":
                    import reportlab
                    available = True
            except ImportError as e:
                error_msg = f"缺少Python库: {e.name}"
            except Exception as e:
                error_msg = f"系统依赖问题: {str(e)[:50]}"
            
            install_guide = []
            install_guide.append(f"1. 安装Python库: {engine_info['pip_cmd']}")
            if current_os in engine_info["system_deps"]:
                install_guide.append(f"2. 安装系统依赖: {engine_info['system_deps'][current_os]}")
            
            status[engine_id] = {
                "name": engine_info["name"],
                "available": available,
                "description": engine_info["description"],
                "error_msg": error_msg,
                "install_guide": install_guide,
            }
        return status

    def get_pdf_install_guide(self) -> str:
        import platform
        current_os = platform.system()
        status = self.get_pdf_engines_status()
        
        lines = ["=" * 60, "📄 PDF导出引擎安装指南", "=" * 60, ""]
        
        for engine_id, info in status.items():
            marker = "✅" if info["available"] else "❌"
            lines.append(f"{marker} {info['name']}")
            lines.append(f"   说明: {info['description']}")
            
            if not info["available"]:
                lines.append(f"   问题: {info['error_msg']}")
                lines.append(f"   安装:")
                for step in info["install_guide"]:
                    lines.append(f"      {step}")
            lines.append("")
        
        lines.append("💡 建议优先安装 reportlab，无需系统依赖且中文支持良好")
        lines.append("=" * 60)
        return "\n".join(lines)

    def to_markdown(self, plan: TravelPlan) -> str:
        lines = []
        lines.append(f"# {plan.title}")
        lines.append("")
        lines.append(f"**计划ID**: {plan.plan_id}")
        lines.append(f"**目的地**: {', '.join(plan.destinations)}")
        lines.append(f"**旅行偏好**: {', '.join(plan.preferences)}")
        lines.append(f"**预计总花费**: ¥{plan.total_budget:.2f}")
        lines.append("")
        lines.append("---")
        lines.append("")
        
        lines.append(self.budget_to_markdown_table(plan))
        lines.append("")
        lines.append("---")
        lines.append("")
        
        lines.append("## 📅 每日行程")
        lines.append("")
        
        for day in plan.days:
            lines.append(f"### 第{day.day_number}天 - {day.city}")
            lines.append("")
            lines.append(f"- **步行强度**: {day.walking_intensity}")
            lines.append(f"- **当日花费**: ¥{day.total_cost:.2f}")
            if day.weather_hint:
                lines.append(f"- **天气提示**: {day.weather_hint}")
            if day.holiday_warning:
                for warning in day.holiday_warning.split("\n"):
                    lines.append(f"- **{warning}**")
            lines.append("")
            
            for activity in day.activities:
                lines.append(f"#### {activity.time_slot}")
                lines.append("")
                
                if activity.description:
                    lines.append(f">{activity.description}")
                    lines.append("")
                
                if activity.attraction:
                    attr = activity.attraction
                    lines.append(f"**{attr.name}**")
                    lines.append("")
                    lines.append(f"- ⭐ 评分: {attr.rating}/5.0（{attr.review_count}条评价）")
                    lines.append(f"- 🎫 门票: ¥{attr.ticket_price}")
                    lines.append(f"- ⏱️ 建议游览: {attr.avg_visit_time}小时")
                    lines.append(f"- 📍 位置: {attr.location_hint}")
                    lines.append(f"- 💬 热门评价: {attr.reviews[0] if attr.reviews else ''}")
                    if len(attr.reviews) > 1:
                        lines.append(f"- 💬 其他评价: {attr.reviews[1]}")
                    lines.append("")
                
                if activity.restaurant:
                    rest = activity.restaurant
                    lines.append(f"**{rest.name}**")
                    lines.append("")
                    lines.append(f"- 🍽️ 菜系: {rest.cuisine}")
                    lines.append(f"- ⭐ 评分: {rest.rating}/5.0（{rest.review_count}条评价）")
                    lines.append(f"- 💰 人均: ¥{rest.avg_price}")
                    lines.append(f"- 🕒 营业时间: {rest.business_hours}")
                    if rest.must_try:
                        lines.append(f"- 🥢 必点: {', '.join(rest.must_try)}")
                    lines.append(f"- 💬 热门评价: {rest.reviews[0] if rest.reviews else ''}")
                    lines.append("")
                
                if activity.transport:
                    trans = activity.transport
                    lines.append(f"**交通建议**")
                    lines.append("")
                    lines.append(f"- 🚇 方式: {trans.transport_type.value}")
                    lines.append(f"- ⏱️ 时长: {trans.duration}")
                    lines.append(f"- 💰 费用: ¥{trans.cost:.2f}")
                    if trans.tip:
                        lines.append(f"- 💡 提示: {trans.tip}")
                    lines.append("")
                
                if activity.booking_hint:
                    lines.append(f"> {activity.booking_hint}")
                    lines.append("")
            
            lines.append("---")
            lines.append("")
        
        lines.append(self.text_map_to_markdown(plan))
        lines.append("")
        
        lines.append(self.packing_list_to_markdown(plan))
        lines.append("")
        
        lines.append("---")
        lines.append("")
        lines.append(f"*生成时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        
        return "\n".join(lines)

    def budget_to_markdown_table(self, plan: TravelPlan) -> str:
        lines = []
        lines.append("## 📊 预算明细")
        lines.append("")
        lines.append("| 项目 | 花费（元） | 占比 | 可视化 |")
        lines.append("|------|------------|------|--------|")
        total = sum(plan.budget_table.values())
        for item, cost in plan.budget_table.items():
            percentage = (cost / total * 100) if total > 0 else 0
            bar_length = int(percentage / 5)
            bar = "█" * bar_length
            lines.append(f"| {item} | ¥{cost:.2f} | {percentage:.1f}% | {bar} |")
        lines.append(f"| **总计** | **¥{total:.2f}** | **100%** | {'█'*20} |")
        return "\n".join(lines)

    def text_map_to_markdown(self, plan: TravelPlan) -> str:
        lines = []
        lines.append("## 🗺️ 路线地图")
        lines.append("")
        lines.append("```")
        lines.append("=" * 70)
        lines.append("📍 旅行路线简易文本地图")
        lines.append("=" * 70)
        lines.append("")
        
        if len(plan.destinations) > 1:
            lines.append("🚄 跨城市路线图：")
            route_line = ""
            for i in range(len(plan.destinations)):
                if i > 0:
                    transport = self._get_transport_between_cities(
                        plan.destinations[i-1], plan.destinations[i]
                    )
                    route_line += f" --[{transport}]--> "
                route_line += f"[{plan.destinations[i]}]"
            lines.append(f"   {route_line}")
            lines.append("")
        
        for day in plan.days:
            lines.append(f"📅 第{day.day_number:2d}天（{day.city}）：")
            lines.append(f"   ┌{'─' * 66}┐")
            
            locations = []
            for activity in day.activities:
                if activity.attraction:
                    locations.append(("📍", activity.attraction.name, activity.attraction.category))
                elif activity.restaurant:
                    locations.append(("🍽️", activity.restaurant.name, activity.restaurant.cuisine))
            
            if locations:
                route = " → ".join([f"{icon}{name}" for icon, name, _ in locations])
                lines.append(f"   │ 路线：{route:<60}│")
                
                detail_line = "   │       "
                for i, (icon, name, cat) in enumerate(locations):
                    if i > 0:
                        detail_line += " → "
                    detail_line += f"({cat})"
                lines.append(f"{detail_line:<68}│")
                
                lines.append(f"   │ 步行强度：{day.walking_intensity:<54}│")
                lines.append(f"   │ 当日预算：¥{day.total_cost:<53.2f}│")
            else:
                lines.append(f"   │ 交通转换日，安排跨城出行{'':<46}│")
            
            lines.append(f"   └{'─' * 66}┘")
            lines.append("")
        
        lines.append("=" * 70)
        lines.append("```")
        return "\n".join(lines)

    def _get_transport_between_cities(self, from_city: str, to_city: str) -> str:
        from .data_loader import DataLoader
        loader = DataLoader()
        transport = loader.get_transport_between_cities(from_city, to_city)
        if "high_speed_rail" in transport:
            return "高铁"
        elif "flight" in transport:
            return "飞机"
        return "交通"

    def packing_list_to_markdown(self, plan: TravelPlan) -> str:
        lines = []
        lines.append("## 🧳 行李打包清单")
        lines.append("")
        
        categories = {
            "证件类": [],
            "电子类": [],
            "衣物类": [],
            "日用品类": [],
            "药品类": [],
            "其他": [],
        }
        
        keywords_map = {
            "证件类": ["身份证", "护照", "驾照", "证件"],
            "电子类": ["手机", "充电", "充电宝", "相机", "电脑", "耳机"],
            "衣物类": ["外套", "T恤", "裤子", "鞋子", "毛衣", "内衣", "羽绒服", "帽子", "手套", "围巾"],
            "日用品类": ["洗漱", "雨伞", "雨衣", "防晒", "太阳镜", "遮阳帽", "纸巾"],
            "药品类": ["药品", "感冒", "肠胃", "创可贴", "口罩", "药"],
        }
        
        for item in plan.packing_list:
            categorized = False
            for cat, keywords in keywords_map.items():
                if any(kw in item for kw in keywords):
                    categories[cat].append(item)
                    categorized = True
                    break
            if not categorized:
                categories["其他"].append(item)
        
        for cat, items in categories.items():
            if items:
                lines.append(f"### {cat}")
                lines.append("")
                lines.append("| 序号 | 物品 | 已准备 |")
                lines.append("|------|------|--------|")
                for i, item in enumerate(sorted(items), 1):
                    lines.append(f"| {i} | {item} | ☐ |")
                lines.append("")
        
        return "\n".join(lines)

    def save_markdown(self, plan: TravelPlan, filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"{plan.plan_id}_{plan.title.replace('/', '_')}.md"
        filepath = os.path.join(self.output_dir, filename)
        
        content = self.to_markdown(plan)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return filepath

    def save_pdf(self, plan: TravelPlan, filename: Optional[str] = None, method: str = "auto") -> str:
        if not filename:
            filename = f"{plan.plan_id}_{plan.title.replace('/', '_')}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        md_content = self.to_markdown(plan)
        status = self.get_pdf_engines_status()
        used_engine = None
        
        if method == "auto":
            for engine_id in ["weasyprint", "xhtml2pdf", "reportlab"]:
                if status[engine_id]["available"]:
                    result = False
                    if engine_id == "weasyprint":
                        result = self._try_weasyprint(md_content, filepath)
                    elif engine_id == "xhtml2pdf":
                        result = self._try_xhtml2pdf(md_content, filepath)
                    elif engine_id == "reportlab":
                        result = self._try_reportlab(md_content, filepath)
                    
                    if result:
                        used_engine = engine_id
                        break
            
            if not used_engine:
                guide = self.get_pdf_install_guide()
                raise ImportError(
                    "所有PDF导出引擎都不可用。请先安装以下任一引擎：\n"
                    + guide
                )
        else:
            if method not in status:
                raise ValueError(f"不支持的PDF导出方式: {method}，可选: {', '.join(status.keys())}")
            
            if not status[method]["available"]:
                guide = self.get_pdf_install_guide()
                raise ImportError(
                    f"{status[method]['name']} 不可用。详细安装指南：\n"
                    + guide
                )
            
            result = False
            if method == "weasyprint":
                result = self._try_weasyprint(md_content, filepath)
            elif method == "xhtml2pdf":
                result = self._try_xhtml2pdf(md_content, filepath)
            elif method == "reportlab":
                result = self._try_reportlab(md_content, filepath)
            
            if not result:
                raise RuntimeError(f"{status[method]['name']} 导出失败，请检查错误日志")
            used_engine = method
        
        if used_engine:
            self._last_pdf_engine = used_engine
        
        return filepath

    def get_last_pdf_engine(self) -> str:
        return getattr(self, '_last_pdf_engine', 'unknown')

    def _try_weasyprint(self, md_content: str, filepath: str) -> bool:
        try:
            from markdown import markdown
            import weasyprint
            
            html_content = markdown(md_content, extensions=['tables'])
            
            full_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    @font-face {{
                        font-family: 'ChineseSans';
                        src: local('PingFang SC'), local('Microsoft YaHei'), local('Hiragino Sans GB');
                    }}
                    body {{ font-family: 'ChineseSans', 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 20px; font-size: 12px; }}
                    h1 {{ color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; font-size: 20px; }}
                    h2 {{ color: #555; margin-top: 25px; font-size: 16px; }}
                    h3 {{ color: #666; font-size: 14px; }}
                    h4 {{ color: #777; font-size: 13px; }}
                    table {{ border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 11px; }}
                    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                    th {{ background-color: #4CAF50; color: white; }}
                    tr:nth-child(even) {{ background-color: #f9f9f9; }}
                    blockquote {{ background: #f5f5f5; border-left: 4px solid #4CAF50; padding: 10px 15px; margin: 10px 0; }}
                    pre {{ background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 11px; }}
                    hr {{ border: none; border-top: 1px solid #eee; margin: 15px 0; }}
                </style>
            </head>
            <body>
            {html_content}
            </body>
            </html>
            """
            
            weasyprint.HTML(string=full_html).write_pdf(filepath)
            return True
        except Exception:
            return False

    def _try_xhtml2pdf(self, md_content: str, filepath: str) -> bool:
        try:
            from markdown import markdown
            from xhtml2pdf import pisa
            
            html_content = markdown(md_content, extensions=['tables'])
            
            full_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Helvetica, Arial, sans-serif; padding: 20px; font-size: 11px; }}
                    h1 {{ color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; font-size: 18px; }}
                    h2 {{ color: #555; margin-top: 20px; font-size: 15px; }}
                    h3 {{ color: #666; font-size: 13px; }}
                    h4 {{ color: #777; font-size: 12px; }}
                    table {{ border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10px; }}
                    th, td {{ border: 1px solid #ddd; padding: 6px; text-align: left; }}
                    th {{ background-color: #4CAF50; color: white; }}
                    tr:nth-child(even) {{ background-color: #f9f9f9; }}
                    blockquote {{ background: #f5f5f5; border-left: 3px solid #4CAF50; padding: 8px 12px; margin: 8px 0; }}
                    pre {{ background: #f5f5f5; padding: 10px; font-size: 10px; }}
                    hr {{ border-top: 1px solid #eee; margin: 12px 0; }}
                </style>
            </head>
            <body>
            {html_content}
            </body>
            </html>
            """
            
            with open(filepath, "w+b") as f:
                pisa_status = pisa.CreatePDF(full_html, dest=f)
            return not pisa_status.err
        except Exception:
            return False

    def _try_reportlab(self, md_content: str, filepath: str) -> bool:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors
            from reportlab.lib.units import cm
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            
            font_paths = [
                "/System/Library/Fonts/PingFang.ttc",
                "/System/Library/Fonts/STHeiti Light.ttc",
                "/System/Library/Fonts/Hiragino Sans GB.ttc",
                "C:/Windows/Fonts/msyh.ttc",
                "C:/Windows/Fonts/simhei.ttf",
                "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            ]
            
            font_name = "Helvetica"
            for path in font_paths:
                if os.path.exists(path):
                    try:
                        pdfmetrics.registerFont(TTFont('ChineseFont', path))
                        font_name = "ChineseFont"
                        break
                    except Exception:
                        continue
            
            doc = SimpleDocTemplate(filepath, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
            story = []
            
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontName=font_name, fontSize=18, textColor=colors.HexColor('#333333'))
            h2_style = ParagraphStyle('CustomH2', parent=styles['Heading2'], fontName=font_name, fontSize=14, textColor=colors.HexColor('#555555'))
            h3_style = ParagraphStyle('CustomH3', parent=styles['Heading3'], fontName=font_name, fontSize=12, textColor=colors.HexColor('#666666'))
            h4_style = ParagraphStyle('CustomH4', parent=styles['Heading4'], fontName=font_name, fontSize=11, textColor=colors.HexColor('#777777'))
            normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontName=font_name, fontSize=10, leading=14)
            code_style = ParagraphStyle('CustomCode', parent=styles['Code'], fontName='Courier', fontSize=9, leading=12)
            
            lines = md_content.split('\n')
            in_table = False
            table_data = []
            
            for line in lines:
                if line.startswith('# '):
                    story.append(Paragraph(line[2:], title_style))
                    story.append(Spacer(1, 0.3*cm))
                elif line.startswith('## '):
                    story.append(Paragraph(line[3:], h2_style))
                    story.append(Spacer(1, 0.2*cm))
                elif line.startswith('### '):
                    story.append(Paragraph(line[4:], h3_style))
                    story.append(Spacer(1, 0.15*cm))
                elif line.startswith('#### '):
                    story.append(Paragraph(line[5:], h4_style))
                elif line.startswith('|') and '|---' not in line:
                    cells = [c.strip() for c in line.split('|')[1:-1]]
                    table_data.append([Paragraph(c, normal_style) for c in cells])
                elif line.startswith('|---'):
                    continue
                elif line.strip() == '' and table_data:
                    if table_data:
                        t = Table(table_data, colWidths=[4*cm, 3*cm, 2*cm, 4*cm] if len(table_data[0])==4 else None)
                        t.setStyle(TableStyle([
                            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4CAF50')),
                            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                            ('FONTNAME', (0,0), (-1,-1), font_name),
                            ('FONTSIZE', (0,0), (-1,-1), 9),
                            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                            ('TOPPADDING', (0,0), (-1,-1), 6),
                            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                        ]))
                        story.append(t)
                        story.append(Spacer(1, 0.2*cm))
                    table_data = []
                elif line.startswith('```'):
                    continue
                elif line.startswith('---'):
                    story.append(Spacer(1, 0.1*cm))
                elif line.startswith('>'):
                    story.append(Paragraph(line[1:], ParagraphStyle('Quote', parent=normal_style, textColor=colors.HexColor('#666666'), leftIndent=10, borderColor=colors.HexColor('#4CAF50'), borderWidth=0, borderPadding=5)))
                elif line.strip():
                    story.append(Paragraph(line, normal_style))
                else:
                    story.append(Spacer(1, 0.1*cm))
            
            if table_data:
                t = Table(table_data)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4CAF50')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ]))
                story.append(t)
            
            doc.build(story)
            return True
        except Exception as e:
            print(f"reportlab error: {e}")
            return False

    def save_budget_csv(self, plan: TravelPlan, filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"{plan.plan_id}_预算表.csv"
        filepath = os.path.join(self.output_dir, filename)
        
        import csv
        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["项目", "花费（元）", "占比", "备注"])
            total = sum(plan.budget_table.values())
            for item, cost in plan.budget_table.items():
                percentage = (cost / total * 100) if total > 0 else 0
                writer.writerow([item, cost, f"{percentage:.1f}%", ""])
            writer.writerow(["总计", total, "100%", ""])
        
        return filepath

    def save_budget_markdown(self, plan: TravelPlan, filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"{plan.plan_id}_预算表.md"
        filepath = os.path.join(self.output_dir, filename)
        
        content = self.budget_to_markdown_table(plan)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        
        return filepath

    def save_packing_list(self, plan: TravelPlan, filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"{plan.plan_id}_打包清单.txt"
        filepath = os.path.join(self.output_dir, filename)
        
        lines = ["=" * 60, f"{plan.title} - 行李打包清单", "=" * 60, ""]
        
        categories = {
            "证件类": [],
            "电子类": [],
            "衣物类": [],
            "日用品类": [],
            "药品类": [],
            "其他": [],
        }
        
        keywords_map = {
            "证件类": ["身份证", "护照", "驾照", "证件"],
            "电子类": ["手机", "充电", "充电宝", "相机", "电脑", "耳机"],
            "衣物类": ["外套", "T恤", "裤子", "鞋子", "毛衣", "内衣", "羽绒服", "帽子", "手套", "围巾"],
            "日用品类": ["洗漱", "雨伞", "雨衣", "防晒", "太阳镜", "遮阳帽", "纸巾"],
            "药品类": ["药品", "感冒", "肠胃", "创可贴", "口罩", "药"],
        }
        
        for item in plan.packing_list:
            categorized = False
            for cat, keywords in keywords_map.items():
                if any(kw in item for kw in keywords):
                    categories[cat].append(item)
                    categorized = True
                    break
            if not categorized:
                categories["其他"].append(item)
        
        for cat, items in categories.items():
            if items:
                lines.append(f"【{cat}】")
                for item in sorted(items):
                    lines.append(f"□ {item}")
                lines.append("")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        
        return filepath
