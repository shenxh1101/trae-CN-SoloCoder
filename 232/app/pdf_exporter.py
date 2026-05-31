import os
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, 
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from .models import Roadmap


class PDFExporter:
    def __init__(self):
        self._register_fonts()
    
    def _register_fonts(self):
        try:
            font_paths = [
                '/System/Library/Fonts/PingFang.ttc',
                '/System/Library/Fonts/STHeiti Light.ttc',
                '/System/Library/Fonts/Heiti.ttc',
                '/Library/Fonts/Arial Unicode.ttf',
                '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
                '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
            ]
            
            for font_path in font_paths:
                if os.path.exists(font_path):
                    try:
                        pdfmetrics.registerFont(TTFont('ChineseFont', font_path))
                        self._font_name = 'ChineseFont'
                        self._font_bold_name = 'ChineseFont'
                        break
                    except Exception:
                        continue
            else:
                self._font_name = 'Helvetica'
                self._font_bold_name = 'Helvetica-Bold'
        except Exception:
            self._font_name = 'Helvetica'
            self._font_bold_name = 'Helvetica-Bold'
    
    def _get_styles(self):
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontName=self._font_bold_name,
            fontSize=20,
            leading=24,
            spaceAfter=20,
            textColor=HexColor('#2d3748'),
            alignment=TA_CENTER
        )
        
        h1_style = ParagraphStyle(
            'CustomH1',
            parent=styles['Heading1'],
            fontName=self._font_bold_name,
            fontSize=16,
            leading=20,
            spaceBefore=15,
            spaceAfter=10,
            textColor=HexColor('#2d3748')
        )
        
        h2_style = ParagraphStyle(
            'CustomH2',
            parent=styles['Heading2'],
            fontName=self._font_bold_name,
            fontSize=14,
            leading=18,
            spaceBefore=12,
            spaceAfter=8,
            textColor=HexColor('#4a5568')
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=self._font_name,
            fontSize=10,
            leading=14,
            spaceAfter=6,
            textColor=HexColor('#2d3748')
        )
        
        small_style = ParagraphStyle(
            'CustomSmall',
            parent=styles['Normal'],
            fontName=self._font_name,
            fontSize=9,
            leading=12,
            textColor=HexColor('#718096')
        )
        
        return {
            'title': title_style,
            'h1': h1_style,
            'h2': h2_style,
            'normal': normal_style,
            'small': small_style
        }
    
    def _draw_page_number(self, canvas, doc):
        canvas.saveState()
        canvas.setFont(self._font_name, 8)
        canvas.setFillColor(HexColor('#718096'))
        canvas.drawCentredString(A4[0] / 2, 15 * mm, f"第 {doc.page} 页")
        canvas.restoreState()
    
    def _draw_header(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(HexColor('#667eea'))
        canvas.rect(0, A4[1] - 8 * mm, A4[0], 8 * mm, fill=1, stroke=0)
        canvas.setFont(self._font_name, 8)
        canvas.setFillColor(white)
        canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 5 * mm, "AI 学习路线图生成器")
        canvas.restoreState()
    
    def export(self, roadmap: Roadmap, output_path: str) -> Optional[str]:
        try:
            styles = self._get_styles()
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=2 * cm,
                leftMargin=2 * cm,
                topMargin=2 * cm,
                bottomMargin=2 * cm
            )
            
            story = []
            self._build_content(roadmap, story, styles)
            
            doc.build(story, onFirstPage=self._draw_header, onLaterPages=self._draw_page_number)
            
            return output_path
        except Exception as e:
            print(f"PDF export error: {e}")
            return None
    
    def _build_content(self, roadmap: Roadmap, story, styles):
        story.append(Spacer(1, 10 * mm))
        story.append(Paragraph(f"🎯 {roadmap.skill} 学习路线图", styles['title']))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#e2e8f0')))
        story.append(Spacer(1, 5 * mm))
        
        summary_data = [
            [
                Paragraph("<b>总预估时间</b>", styles['normal']),
                Paragraph(f"<b>{roadmap.total_hours} 小时</b>", styles['normal']),
                Paragraph("<b>难度等级</b>", styles['normal']),
                Paragraph(f"<b>{'⭐' * roadmap.difficulty}</b>", styles['normal'])
            ],
            [
                Paragraph("学习阶段", styles['small']),
                Paragraph(f"{len(roadmap.phases)} 个", styles['small']),
                Paragraph("剩余时间", styles['small']),
                Paragraph(f"{roadmap.remaining_hours} 小时", styles['small'])
            ]
        ]
        
        if roadmap.time_budget:
            summary_data.append([
                Paragraph("每天学习", styles['small']),
                Paragraph(f"{roadmap.time_budget.get('daily_hours', 2)} 小时", styles['small']),
                Paragraph("总天数", styles['small']),
                Paragraph(f"{roadmap.time_budget.get('total_days', 90)} 天", styles['small'])
            ])
        
        summary_table = Table(summary_data, colWidths=[4 * cm, 4 * cm, 4 * cm, 4 * cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f7fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 5 * mm))
        
        completed = sum(1 for p in roadmap.phases if p.completed)
        total = len(roadmap.phases)
        percentage = (completed / total * 100) if total > 0 else 0
        
        story.append(Paragraph("📊 整体进度", styles['h2']))
        progress_data = [
            [
                Paragraph(f"已完成 {completed}/{total} 阶段 ({percentage:.1f}%)", styles['normal'])
            ]
        ]
        progress_table = Table(progress_data, colWidths=[16 * cm])
        progress_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#e2e8f0')),
            ('BOX', (0, 0), (-1, 0), 1, HexColor('#e2e8f0')),
        ]))
        story.append(progress_table)
        story.append(Spacer(1, 5 * mm))
        
        story.append(Paragraph("📚 学习阶段", styles['h1']))
        story.append(Spacer(1, 3 * mm))
        
        for i, phase in enumerate(roadmap.phases, 1):
            phase_color = '#48bb78' if phase.completed else '#667eea'
            phase_badge = "✅ 已完成" if phase.completed else "⏳ 待学习"
            
            phase_header = Table(
                [[
                    Paragraph(f"<font color='white'><b>阶段 {i}: {phase.name}</b></font>", styles['h2']),
                    Paragraph(f"<font color='white'>{phase_badge}</font>", styles['normal'])
                ]],
                colWidths=[12 * cm, 4 * cm]
            )
            phase_header.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor(phase_color)),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('LEFTPADDING', (0, 0), (-1, 0), 12),
                ('RIGHTPADDING', (0, 0), (-1, 0), 12),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ]))
            
            phase_content = []
            phase_content.append(phase_header)
            phase_content.append(Spacer(1, 3 * mm))
            
            meta_text = f"⏱️ 预估 {phase.estimated_hours} 小时 &nbsp;&nbsp;|&nbsp;&nbsp; {'⭐' * phase.difficulty} 难度"
            if phase.dependencies and len(phase.dependencies) > 0:
                dep_names = []
                for dep_id in phase.dependencies:
                    dep = next((p for p in roadmap.phases if p.id == dep_id), None)
                    dep_names.append(dep.name if dep else dep_id)
                meta_text += f" &nbsp;&nbsp;|&nbsp;&nbsp; 🔗 前置: {', '.join(dep_names)}"
            phase_content.append(Paragraph(meta_text, styles['small']))
            
            if phase.notes:
                phase_content.append(Spacer(1, 2 * mm))
                note_table = Table(
                    [[Paragraph(f"📝 {phase.notes}", styles['small'])]],
                    colWidths=[16 * cm]
                )
                note_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#fff3cd')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#856404')),
                    ('TOPPADDING', (0, 0), (-1, 0), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                    ('LEFTPADDING', (0, 0), (-1, 0), 10),
                    ('RIGHTPADDING', (0, 0), (-1, 0), 10),
                ]))
                phase_content.append(note_table)
            
            phase_content.append(Spacer(1, 3 * mm))
            phase_content.append(Paragraph("<b>🎯 学习目标</b>", styles['h2']))
            
            for obj in phase.objectives:
                phase_content.append(Paragraph(f"• {obj}", styles['normal']))
            
            phase_content.append(Spacer(1, 3 * mm))
            phase_content.append(Paragraph("<b>📚 推荐资源</b>", styles['h2']))
            
            if phase.resources:
                resource_rows = []
                for res in phase.resources:
                    type_icon = {'book': '📚', 'course': '🎓', 'documentation': '📖', 'project': '💻'}.get(res.type, '📌')
                    rating = f"👍{res.upvotes} 👎{res.downvotes}"
                    desc = f"<br/>{res.description}" if res.description else ""
                    resource_rows.append([
                        Paragraph(f"{type_icon} <b>{res.name}</b>{desc}", styles['normal']),
                        Paragraph(rating, styles['small'])
                    ])
                
                resource_table = Table(resource_rows, colWidths=[13 * cm, 3 * cm])
                resource_table.setStyle(TableStyle([
                    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#f7fafc')),
                ]))
                phase_content.append(resource_table)
            else:
                phase_content.append(Paragraph("暂无推荐资源", styles['small']))
            
            phase_content.append(Spacer(1, 8 * mm))
            phase_content.append(HRFlowable(width="100%", thickness=0.5, color=HexColor('#e2e8f0')))
            phase_content.append(Spacer(1, 5 * mm))
            
            if i < len(roadmap.phases):
                story.append(KeepTogether(phase_content))
            else:
                story.extend(phase_content)
        
        story.append(Spacer(1, 5 * mm))
        footer_text = "本路线图由 AI 学习路线图生成器自动生成，建议根据实际情况调整学习计划。"
        story.append(Paragraph(footer_text, styles['small']))
    
    def get_available_method(self) -> str:
        return 'reportlab'
