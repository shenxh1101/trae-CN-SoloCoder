import os
from datetime import datetime

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


class PDFExporter:
    def __init__(self):
        self.font_registered = False
        self._register_fonts()

    def _register_fonts(self):
        if not HAS_REPORTLAB:
            return
        try:
            font_paths = [
                '/System/Library/Fonts/PingFang.ttc',
                '/System/Library/Fonts/STHeiti Medium.ttc',
                '/System/Library/Fonts/Hiragino Sans GB.ttc',
                '/Library/Fonts/Arial Unicode.ttf',
            ]
            for path in font_paths:
                if os.path.exists(path):
                    try:
                        pdfmetrics.registerFont(TTFont('ChineseFont', path))
                        self.font_registered = True
                        break
                    except:
                        continue
        except:
            pass

    def export_report(self, data, output_path):
        if not HAS_REPORTLAB:
            return self._export_html_as_pdf(data, output_path)

        try:
            return self._export_with_reportlab(data, output_path)
        except Exception as e:
            print(f"ReportLab export failed: {e}")
            return self._export_html_as_pdf(data, output_path)

    def _export_with_reportlab(self, data, output_path):
        filename = data['filename']
        risks = data['risks']
        risk_level = data['risk_level']
        summary = data['summary']

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )

        styles = getSampleStyleSheet()
        font_name = 'ChineseFont' if self.font_registered else 'Helvetica'

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontName=font_name,
            fontSize=20,
            textColor=HexColor('#667eea'),
            spaceAfter=10
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=font_name,
            fontSize=14,
            textColor=HexColor('#333333'),
            spaceBefore=15,
            spaceAfter=10
        )

        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=10,
            leading=14,
            textColor=HexColor('#333333')
        )

        highlight_style = ParagraphStyle(
            'CustomHighlight',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=10,
            leading=14,
            textColor=HexColor('#059669'),
            backColor=HexColor('#f0fdf4')
        )

        story = []

        story.append(Paragraph('合同风险检测报告', title_style))
        story.append(Paragraph(f'文件名称：{filename}', normal_style))
        story.append(Paragraph(f'生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', normal_style))
        story.append(Spacer(1, 10))

        level_colors = {
            'high': '#dc2626',
            'medium': '#d97706',
            'low': '#059669'
        }
        level_texts = {
            'high': '高风险',
            'medium': '中风险',
            'low': '低风险'
        }

        level_color = HexColor(level_colors.get(risk_level, '#667eea'))
        risk_table = Table([
            [Paragraph(f'<font color="white"><b>{level_texts.get(risk_level, "未知")}</b></font>',
                       ParagraphStyle('LevelBadge', parent=normal_style, textColor=white, alignment=1))]
        ], colWidths=[120*mm], rowHeights=[12*mm])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), level_color),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
            ('ROUNDEDCORNERS', [4, 4, 4, 4])
        ]))
        story.append(risk_table)
        story.append(Spacer(1, 15))

        high_count = len([r for r in risks if r['severity'] == 'high'])
        medium_count = len([r for r in risks if r['severity'] == 'medium'])
        low_count = len([r for r in risks if r['severity'] == 'low'])

        stats_data = [
            ['高风险', '中风险', '低风险', '总计'],
            [str(high_count), str(medium_count), str(low_count), str(len(risks))]
        ]
        stats_table = Table(stats_data, colWidths=[40*mm, 40*mm, 40*mm, 40*mm])
        stats_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTSIZE', (0, 1), (-1, 1), 16),
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f0f9ff')),
            ('TEXTCOLOR', (0, 1), (0, 1), HexColor('#dc2626')),
            ('TEXTCOLOR', (1, 1), (1, 1), HexColor('#d97706')),
            ('TEXTCOLOR', (2, 1), (2, 1), HexColor('#059669')),
            ('TEXTCOLOR', (3, 1), (3, 1), HexColor('#667eea')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0'))
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 15))

        story.append(Paragraph('合同摘要', heading_style))
        for line in summary.split('\n'):
            if line.strip():
                story.append(Paragraph(line, normal_style))
        story.append(Spacer(1, 10))

        story.append(Paragraph('风险点详情', heading_style))

        for i, risk in enumerate(risks, 1):
            severity_colors = {
                'high': '#fee2e2',
                'medium': '#fef3c7',
                'low': '#d1fae5'
            }
            severity_texts = {
                'high': '高风险',
                'medium': '中风险',
                'low': '低风险'
            }

            text_colors = {
                'high': '#dc2626',
                'medium': '#d97706',
                'low': '#059669'
            }
            risk_header = Table([
                [Paragraph(f'<b>{i}. {risk["name"]}</b>', normal_style),
                 Paragraph(f'<font color="{text_colors.get(risk["severity"], "#667eea")}"><b>{severity_texts.get(risk["severity"], "")}</b></font>',
                           ParagraphStyle('Badge', parent=normal_style, alignment=2))]
            ], colWidths=[120*mm, 30*mm])
            risk_header.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), HexColor(severity_colors.get(risk['severity'], '#f0f0f0'))),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
            ]))
            story.append(risk_header)

            story.append(Paragraph(f'<b>【{risk["category"]}】</b> {risk["description"]}', normal_style))
            story.append(Paragraph(f'<b>相关内容：</b> {risk["paragraph_text"]}', normal_style))
            story.append(Paragraph(f'<b>💡 修改建议：</b> {risk["suggestion"]}', highlight_style))
            story.append(Spacer(1, 8))

        if not risks:
            story.append(Paragraph('🎉 未检测到明显风险点，请继续保持！', highlight_style))

        story.append(Spacer(1, 20))
        footer_style = ParagraphStyle(
            'Footer',
            parent=normal_style,
            textColor=HexColor('#999999'),
            alignment=1,
            fontSize=9
        )
        story.append(Paragraph('本报告由AI合同风险检测系统自动生成', footer_style))
        story.append(Paragraph('仅供参考，不构成法律建议', footer_style))

        doc.build(story)
        return output_path

    def _export_html_as_pdf(self, data, output_path):
        html_path = output_path.replace('.pdf', '.html')
        high_count = len([r for r in data['risks'] if r['severity'] == 'high'])
        medium_count = len([r for r in data['risks'] if r['severity'] == 'medium'])
        low_count = len([r for r in data['risks'] if r['severity'] == 'low'])

        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>合同风险检测报告 - {data['filename']}</title>
<style>
    @media print {{
        body {{ font-family: "Microsoft YaHei", Arial, sans-serif; }}
    }}
    body {{
        font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif;
        padding: 40px;
        color: #333;
        line-height: 1.6;
    }}
    h1 {{ color: #667eea; text-align: center; }}
    .risk-level {{
        display: inline-block;
        padding: 10px 30px;
        border-radius: 5px;
        color: white;
        font-size: 1.2rem;
        font-weight: bold;
    }}
    .risk-level.high {{ background: #dc2626; }}
    .risk-level.medium {{ background: #d97706; }}
    .risk-level.low {{ background: #059669; }}
    .stats {{ display: flex; gap: 20px; margin: 20px 0; justify-content: center; }}
    .stat-item {{ text-align: center; padding: 15px 25px; background: #f0f9ff; border-radius: 8px; }}
    .stat-number {{ font-size: 2rem; font-weight: bold; }}
    .stat-label {{ color: #666; }}
    .summary {{ background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }}
    .risk-item {{
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 15px;
    }}
    .risk-item.high {{ border-left: 4px solid #dc2626; }}
    .risk-item.medium {{ border-left: 4px solid #d97706; }}
    .risk-item.low {{ border-left: 4px solid #059669; }}
    .suggestion {{
        background: #f0fdf4;
        border-left: 3px solid #10b981;
        padding: 12px 15px;
        border-radius: 6px;
        margin-top: 10px;
    }}
    .risk-badge {{
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        float: right;
    }}
    .risk-badge.high {{ background: #fee2e2; color: #dc2626; }}
    .risk-badge.medium {{ background: #fef3c7; color: #d97706; }}
    .risk-badge.low {{ background: #d1fae5; color: #059669; }}
    .header {{ text-align: center; padding-bottom: 20px; border-bottom: 2px solid #667eea; }}
    .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; }}
</style>
</head>
<body>
    <div class="header">
        <h1>合同风险检测报告</h1>
        <p>文件名称：{data['filename']}</p>
        <p>生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
        <span class="risk-level {data['risk_level']}">{data['risk_level'] == 'high' and '高风险' or data['risk_level'] == 'medium' and '中风险' or '低风险'}</span>
    </div>
    <div class="stats">
        <div class="stat-item"><div class="stat-number" style="color:#dc2626;">{high_count}</div><div class="stat-label">高风险</div></div>
        <div class="stat-item"><div class="stat-number" style="color:#d97706;">{medium_count}</div><div class="stat-label">中风险</div></div>
        <div class="stat-item"><div class="stat-number" style="color:#059669;">{low_count}</div><div class="stat-label">低风险</div></div>
        <div class="stat-item"><div class="stat-number" style="color:#667eea;">{len(data['risks'])}</div><div class="stat-label">总计</div></div>
    </div>
    <div class="summary">
        <h2>合同摘要</h2>
        <p style="white-space: pre-line;">{data['summary']}</p>
    </div>
    <h2>风险点详情</h2>
"""
        if data['risks']:
            for i, risk in enumerate(data['risks'], 1):
                severity_text = risk['severity'] == 'high' and '高风险' or risk['severity'] == 'medium' and '中风险' or '低风险'
                html_content += f"""
    <div class="risk-item {risk['severity']}">
        <h3>{i}. {risk['name']} <span class="risk-badge {risk['severity']}">{severity_text}</span></h3>
        <p><b>【{risk['category']}】</b> {risk['description']}</p>
        <p style="color:#666;">相关内容：{risk['paragraph_text']}</p>
        <div class="suggestion"><b>💡 修改建议：</b> {risk['suggestion']}</div>
    </div>
"""
        else:
            html_content += '<div style="text-align:center;padding:40px;color:#059669;background:#d1fae5;border-radius:8px;">🎉 未检测到明显风险点，请继续保持！</div>'

        html_content += """
    <div class="footer">
        <p>本报告由AI合同风险检测系统自动生成</p>
        <p>仅供参考，不构成法律建议</p>
    </div>
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>
"""

        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return html_path

    def export_batch_report(self, data, output_path):
        if not HAS_REPORTLAB:
            return self._export_batch_html(data, output_path)

        try:
            return self._export_batch_with_reportlab(data, output_path)
        except Exception as e:
            print(f"ReportLab export failed: {e}")
            return self._export_batch_html(data, output_path)

    def _export_batch_with_reportlab(self, data, output_path):
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )

        styles = getSampleStyleSheet()
        font_name = 'ChineseFont' if self.font_registered else 'Helvetica'

        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontName=font_name,
            fontSize=20,
            textColor=HexColor('#667eea'),
            spaceAfter=10
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=font_name,
            fontSize=14,
            textColor=HexColor('#333333'),
            spaceBefore=15,
            spaceAfter=10
        )

        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=10,
            leading=14,
            textColor=HexColor('#333333')
        )

        story = []

        story.append(Paragraph('批量合同风险检测汇总报告', title_style))
        story.append(Paragraph(f'源文件：{data["original_filename"]}', normal_style))
        story.append(Paragraph(f'生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', normal_style))
        story.append(Spacer(1, 15))

        level_colors = {
            'high': '#dc2626',
            'medium': '#d97706',
            'low': '#059669'
        }
        level_color = HexColor(level_colors.get(data['overall_level'], '#667eea'))
        level_text = {'high': '整体高风险', 'medium': '整体中风险', 'low': '整体低风险'}.get(data['overall_level'], '未知')

        risk_table = Table([
            [Paragraph(f'<font color="white"><b>{level_text}</b></font>',
                       ParagraphStyle('LevelBadge', parent=normal_style, textColor=white, alignment=1))]
        ], colWidths=[150*mm], rowHeights=[12*mm])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), level_color),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
            ('ROUNDEDCORNERS', [4, 4, 4, 4])
        ]))
        story.append(risk_table)
        story.append(Spacer(1, 15))

        stats_data = [
            ['检测文件数', '风险总数', '高风险文件', '中风险文件', '低风险文件'],
            [str(data['total_files']), str(data['total_risks']),
             str(data['high_risk_count']), str(data['medium_risk_count']),
             str(data['low_risk_count'])]
        ]
        stats_table = Table(stats_data, colWidths=[30*mm, 30*mm, 30*mm, 30*mm, 30*mm])
        stats_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f0f9ff')),
            ('TEXTCOLOR', (0, 1), (0, 1), HexColor('#667eea')),
            ('TEXTCOLOR', (1, 1), (2, 1), HexColor('#dc2626')),
            ('TEXTCOLOR', (3, 1), (3, 1), HexColor('#d97706')),
            ('TEXTCOLOR', (4, 1), (4, 1), HexColor('#059669')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e0e0e0'))
        ]))
        story.append(stats_table)
        story.append(Spacer(1, 15))

        story.append(Paragraph('各文件检测结果', heading_style))

        for result in data['results']:
            story.append(Paragraph(f'<b>{result["filename"]}</b> - {result["risk_count"]} 个风险点',
                                   heading_style))

            if result['risks']:
                for risk in result['risks']:
                    severity_colors = {
                        'high': '#fee2e2',
                        'medium': '#fef3c7',
                        'low': '#d1fae5'
                    }
                    story.append(Paragraph(f'<b>{risk["name"]}</b>', normal_style))
                    story.append(Paragraph(risk['description'], normal_style))
                    story.append(Paragraph(f'💡 {risk["suggestion"]}', normal_style))
                    story.append(Spacer(1, 5))
            else:
                story.append(Paragraph('✅ 未检测到明显风险点', normal_style))
            story.append(Spacer(1, 10))

        footer_style = ParagraphStyle(
            'Footer',
            parent=normal_style,
            textColor=HexColor('#999999'),
            alignment=1,
            fontSize=9
        )
        story.append(Spacer(1, 20))
        story.append(Paragraph('本报告由AI合同风险检测系统自动生成', footer_style))
        story.append(Paragraph('仅供参考，不构成法律建议', footer_style))

        doc.build(story)
        return output_path

    def _export_batch_html(self, data, output_path):
        html_path = output_path.replace('.pdf', '.html')

        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>批量合同风险检测汇总报告</title>
<style>
    body {{
        font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif;
        padding: 40px;
        color: #333;
        line-height: 1.6;
    }}
    h1 {{ color: #667eea; text-align: center; }}
    .risk-level {{
        display: inline-block;
        padding: 10px 30px;
        border-radius: 5px;
        color: white;
        font-size: 1.2rem;
        font-weight: bold;
    }}
    .risk-level.high {{ background: #dc2626; }}
    .risk-level.medium {{ background: #d97706; }}
    .risk-level.low {{ background: #059669; }}
    .stats {{ display: flex; gap: 20px; margin: 20px 0; justify-content: center; flex-wrap: wrap; }}
    .stat-item {{ text-align: center; padding: 15px 25px; background: #f0f9ff; border-radius: 8px; min-width: 120px; }}
    .stat-number {{ font-size: 2rem; font-weight: bold; }}
    .stat-label {{ color: #666; }}
    .file-result {{
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }}
    .risk-item {{
        background: #fafafa;
        padding: 15px;
        border-radius: 6px;
        margin-top: 10px;
    }}
    .risk-item.high {{ border-left: 3px solid #dc2626; }}
    .risk-item.medium {{ border-left: 3px solid #d97706; }}
    .risk-item.low {{ border-left: 3px solid #059669; }}
    .risk-badge {{
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
    }}
    .risk-badge.high {{ background: #fee2e2; color: #dc2626; }}
    .risk-badge.medium {{ background: #fef3c7; color: #d97706; }}
    .risk-badge.low {{ background: #d1fae5; color: #059669; }}
    .header {{ text-align: center; padding-bottom: 20px; border-bottom: 2px solid #667eea; }}
    .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; }}
</style>
</head>
<body>
    <div class="header">
        <h1>批量合同风险检测汇总报告</h1>
        <p>源文件：{data['original_filename']}</p>
        <p>生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
        <span class="risk-level {data['overall_level']}">{data['overall_level'] == 'high' and '整体高风险' or data['overall_level'] == 'medium' and '整体中风险' or '整体低风险'}</span>
    </div>
    <div class="stats">
        <div class="stat-item"><div class="stat-number" style="color:#667eea;">{data['total_files']}</div><div class="stat-label">检测文件数</div></div>
        <div class="stat-item"><div class="stat-number" style="color:#dc2626;">{data['total_risks']}</div><div class="stat-label">风险总数</div></div>
        <div class="stat-item"><div class="stat-number" style="color:#dc2626;">{data['high_risk_count']}</div><div class="stat-label">高风险文件</div></div>
        <div class="stat-item"><div class="stat-number" style="color:#d97706;">{data['medium_risk_count']}</div><div class="stat-label">中风险文件</div></div>
        <div class="stat-item"><div class="stat-number" style="color:#059669;">{data['low_risk_count']}</div><div class="stat-label">低风险文件</div></div>
    </div>
    <h2>各文件检测结果</h2>
"""

        for result in data['results']:
            severity_text = result['risk_level'] == 'high' and '高风险' or result['risk_level'] == 'medium' and '中风险' or '低风险'
            html_content += f"""
    <div class="file-result">
        <h3>{result['filename']} - {result['risk_count']} 个风险点 <span class="risk-badge {result['risk_level']}">{severity_text}</span></h3>
"""
            if result['risks']:
                for risk in result['risks']:
                    sev_text = risk['severity'] == 'high' and '高' or risk['severity'] == 'medium' and '中' or '低'
                    html_content += f"""
        <div class="risk-item {risk['severity']}">
            <div><b>{risk['name']}</b> <span class="risk-badge {risk['severity']}">{sev_text}</span></div>
            <p style="color:#666;">{risk['description']}</p>
            <p style="color:#059669;">💡 {risk['suggestion']}</p>
        </div>
"""
            else:
                html_content += '<p style="color:#059669;">✅ 未检测到明显风险点</p>'
            html_content += '</div>'

        html_content += """
    <div class="footer">
        <p>本报告由AI合同风险检测系统自动生成</p>
        <p>仅供参考，不构成法律建议</p>
    </div>
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>
"""

        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return html_path
