import os
import io
import json
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

class PDFGenerator:
    def __init__(self):
        self._register_fonts()
        
    def _register_fonts(self):
        try:
            font_paths = [
                '/System/Library/Fonts/PingFang.ttc',
                '/System/Library/Fonts/STHeiti Medium.ttc',
                '/Library/Fonts/Arial Unicode.ttf',
            ]
            for path in font_paths:
                if os.path.exists(path):
                    pdfmetrics.registerFont(TTFont('ChineseFont', path))
                    self.font_name = 'ChineseFont'
                    return
        except Exception:
            pass
        self.font_name = 'Helvetica'

    def generate_report(self, session_data: dict, answers: list) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch
        )

        styles = self._get_styles()
        story = []

        story.append(Paragraph('AI面试官 - 面试报告', styles['custom_title']))
        story.append(Spacer(1, 0.3 * inch))

        story.append(Paragraph('📋 基本信息', styles['custom_heading2']))
        info_data = [
            ['面试岗位', session_data.get('position', '-')],
            ['难度级别', '高级' if session_data.get('difficulty') == 'senior' else '初级'],
            ['面试模式', '压力面试' if session_data.get('pressure_mode') else '普通模式'],
            ['开始时间', session_data.get('started_at', '-')],
            ['结束时间', session_data.get('completed_at', '-')],
            ['总体评分', self._render_stars(session_data.get('overall_score', 0))],
            ['情感分析', session_data.get('sentiment', '-')],
            ['自信程度', f"{session_data.get('confidence_score', 0) * 100:.0f}%"],
        ]
        info_table = Table(info_data, colWidths=[1.5 * inch, 4 * inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.4 * inch))

        if session_data.get('weaknesses'):
            story.append(Paragraph('⚠️ 薄弱环节', styles['custom_heading2']))
            weaknesses = json.loads(session_data['weaknesses']) if isinstance(session_data['weaknesses'], str) else session_data['weaknesses']
            for i, w in enumerate(weaknesses, 1):
                story.append(Paragraph(f'{i}. {w}', styles['custom_body']))
            story.append(Spacer(1, 0.3 * inch))

        story.append(Paragraph('📝 详细答题记录', styles['custom_heading2']))
        story.append(Spacer(1, 0.2 * inch))

        for i, answer in enumerate(answers, 1):
            story.append(Paragraph(f'问题 {i}', styles['custom_heading3']))
            story.append(Paragraph(f'<b>题目:</b> {answer.get("question_text", "-")}', styles['custom_body']))
            
            if answer.get('code_passed') is not None:
                status = '✅ 通过' if answer['code_passed'] else '❌ 未通过'
                story.append(Paragraph(f'<b>代码测试:</b> {status}', styles['custom_body']))
            
            stars = self._render_stars(answer.get('score', 0))
            story.append(Paragraph(f'<b>评分:</b> {stars} ({answer.get("score", 0)}/5)', styles['custom_body']))
            
            if answer.get('time_spent'):
                story.append(Paragraph(f'<b>用时:</b> {answer["time_spent"]}秒', styles['custom_body']))
            
            if answer.get('hint_used'):
                story.append(Paragraph('<b>提示:</b> 已使用提示', styles['custom_body']))
            
            story.append(Paragraph(f'<b>你的回答:</b>', styles['custom_body']))
            story.append(Paragraph(answer.get('user_answer', '未作答') or '未作答', styles['custom_answer']))
            
            feedback = answer.get('feedback', '')
            if feedback:
                story.append(Paragraph(f'<b>面试官反馈:</b>', styles['custom_body']))
                story.append(Paragraph(feedback.replace('\n', '<br/>'), styles['custom_feedback']))
            
            matched = answer.get('keywords_matched', '')
            if matched:
                try:
                    matched_list = json.loads(matched) if isinstance(matched, str) else matched
                    if matched_list:
                        story.append(Paragraph(f'<b>✅ 已掌握知识点:</b> {", ".join(matched_list)}', styles['custom_body']))
                except Exception:
                    pass
            
            missing = answer.get('keywords_missing', '')
            if missing:
                try:
                    missing_list = json.loads(missing) if isinstance(missing, str) else missing
                    if missing_list:
                        story.append(Paragraph(f'<b>❌ 需加强知识点:</b> {", ".join(missing_list)}', styles['custom_body']))
                except Exception:
                    pass

            story.append(Spacer(1, 0.3 * inch))

        if len(answers) > 0:
            story.append(PageBreak())
            story.append(Paragraph('📊 得分分析', styles['custom_heading2']))
            
            scores = [a.get('score', 0) for a in answers]
            score_distribution = [0] * 5
            for s in scores:
                if 1 <= s <= 5:
                    score_distribution[s - 1] += 1
            
            chart_data = [
                ['评分', '1星', '2星', '3星', '4星', '5星'],
                ['题数', score_distribution[0], score_distribution[1], score_distribution[2], score_distribution[3], score_distribution[4]],
            ]
            chart_table = Table(chart_data, colWidths=[1 * inch] + [1 * inch] * 5)
            chart_colors = [colors.red, colors.orange, colors.yellow, colors.lightgreen, colors.green]
            chart_style = [
                ('FONTNAME', (0, 0), (-1, -1), self.font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]
            for i in range(5):
                chart_style.append(('BACKGROUND', (i + 1, 1), (i + 1, 1), chart_colors[i]))
            chart_table.setStyle(TableStyle(chart_style))
            story.append(chart_table)
            story.append(Spacer(1, 0.3 * inch))

            avg_score = sum(scores) / max(len(scores), 1)
            summary_data = [
                ['平均得分', f'{avg_score:.1f}/5'],
                ['最高得分', f'{max(scores)}/5'],
                ['最低得分', f'{min(scores)}/5'],
                ['总题数', str(len(answers))],
            ]
            summary_table = Table(summary_data, colWidths=[1.5 * inch, 2 * inch])
            summary_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), self.font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ]))
            story.append(summary_table)

        story.append(Spacer(1, 0.5 * inch))
        story.append(Paragraph('— 报告由AI面试官生成 —', styles['custom_footer']))
        story.append(Paragraph(f'生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', styles['custom_footer']))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def _get_styles(self):
        styles = getSampleStyleSheet()
        
        custom_styles = {
            'custom_title': ParagraphStyle(
                name='custom_title',
                fontName=self.font_name,
                fontSize=20,
                leading=24,
                alignment=1,
                textColor=colors.HexColor('#2563eb'),
                spaceAfter=12,
            ),
            'custom_heading2': ParagraphStyle(
                name='custom_heading2',
                fontName=self.font_name,
                fontSize=14,
                leading=18,
                textColor=colors.HexColor('#1e40af'),
                spaceBefore=6,
                spaceAfter=6,
            ),
            'custom_heading3': ParagraphStyle(
                name='custom_heading3',
                fontName=self.font_name,
                fontSize=12,
                leading=16,
                textColor=colors.HexColor('#1e3a8a'),
                spaceBefore=8,
                spaceAfter=4,
            ),
            'custom_body': ParagraphStyle(
                name='custom_body',
                fontName=self.font_name,
                fontSize=10,
                leading=14,
                textColor=colors.black,
                spaceAfter=4,
            ),
            'custom_answer': ParagraphStyle(
                name='custom_answer',
                fontName=self.font_name,
                fontSize=10,
                leading=14,
                textColor=colors.HexColor('#374151'),
                leftIndent=10,
                rightIndent=10,
                spaceAfter=6,
                backColor=colors.HexColor('#f9fafb'),
                borderPadding=6,
            ),
            'custom_feedback': ParagraphStyle(
                name='custom_feedback',
                fontName=self.font_name,
                fontSize=10,
                leading=14,
                textColor=colors.HexColor('#065f46'),
                leftIndent=10,
                rightIndent=10,
                spaceAfter=6,
                backColor=colors.HexColor('#ecfdf5'),
                borderPadding=6,
            ),
            'custom_footer': ParagraphStyle(
                name='custom_footer',
                fontName=self.font_name,
                fontSize=8,
                leading=10,
                textColor=colors.grey,
                alignment=1,
            )
        }
        
        return custom_styles

    def _render_stars(self, score):
        if not score:
            return '☆☆☆☆☆'
        score = int(float(score))
        return '⭐' * score + '☆' * (5 - score)
