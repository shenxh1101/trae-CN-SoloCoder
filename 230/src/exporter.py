import os
import csv
from typing import Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm


class StoryboardExporter:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def to_csv(self, storyboard: Dict[str, Any], filename: str) -> str:
        filepath = os.path.join(self.output_dir, f"{filename}.csv")

        with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['视频标题', storyboard['title']])
            writer.writerow(['创意描述', storyboard['creative']])
            writer.writerow(['总时长', f"{storyboard['total_duration']}秒"])
            writer.writerow([])
            writer.writerow(['镜头序号', '景别', '画面描述', '台词/旁白', '建议时长(秒)', '节奏', '转场'])

            for shot in storyboard['shots']:
                writer.writerow([
                    shot.shot_number,
                    shot.shot_type,
                    shot.description,
                    shot.dialogue,
                    shot.duration,
                    shot.pace,
                    shot.transition
                ])

            writer.writerow([])
            writer.writerow(['整体节奏分析', storyboard['overall_pace_analysis']])
            writer.writerow(['转场建议', storyboard['transition_suggestions']])

        return filepath

    def to_markdown(self, storyboard: Dict[str, Any], filename: str) -> str:
        filepath = os.path.join(self.output_dir, f"{filename}.md")

        md_content = f"""# {storyboard['title']}

## 基本信息
- **创意描述**: {storyboard['creative']}
- **总时长**: {storyboard['total_duration']}秒
- **镜头数量**: {len(storyboard['shots'])}个

## 分镜脚本

| 镜头序号 | 景别 | 画面描述 | 台词/旁白 | 建议时长 | 节奏 | 转场 |
|---------|------|----------|----------|----------|------|------|
"""

        for shot in storyboard['shots']:
            md_content += f"| {shot.shot_number} | {shot.shot_type} | {shot.description} | {shot.dialogue} | {shot.duration}秒 | {shot.pace} | {shot.transition} |\n"

        md_content += f"""

## 整体节奏分析
{storyboard['overall_pace_analysis']}

## 转场建议
{storyboard['transition_suggestions']}
"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(md_content)

        return filepath

    def to_pdf(self, storyboard: Dict[str, Any], filename: str) -> str:
        filepath = os.path.join(self.output_dir, f"{filename}.pdf")

        doc = SimpleDocTemplate(
            filepath,
            pagesize=landscape(A4),
            rightMargin=1 * cm,
            leftMargin=1 * cm,
            topMargin=1 * cm,
            bottomMargin=1 * cm
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=20,
            spaceAfter=12
        )
        normal_style = styles['Normal']

        elements = []

        elements.append(Paragraph(storyboard['title'], title_style))
        elements.append(Spacer(1, 0.3 * cm))
        elements.append(Paragraph(f"<b>创意描述:</b> {storyboard['creative']}", normal_style))
        elements.append(Paragraph(f"<b>总时长:</b> {storyboard['total_duration']}秒", normal_style))
        elements.append(Spacer(1, 0.5 * cm))

        table_data = [
            ['镜头序号', '景别', '画面描述', '台词/旁白', '建议时长', '节奏', '转场']
        ]

        for shot in storyboard['shots']:
            table_data.append([
                str(shot.shot_number),
                shot.shot_type,
                Paragraph(shot.description, normal_style),
                Paragraph(shot.dialogue, normal_style),
                f"{shot.duration}秒",
                shot.pace,
                shot.transition
            ])

        col_widths = [1.2 * cm, 1.2 * cm, 8 * cm, 4 * cm, 1.5 * cm, 1.2 * cm, 1.5 * cm]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)

        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (2, 1), (3, -1), 'LEFT'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 0.5 * cm))

        elements.append(Paragraph("<b>整体节奏分析:</b>", normal_style))
        elements.append(Paragraph(storyboard['overall_pace_analysis'], normal_style))
        elements.append(Spacer(1, 0.3 * cm))
        elements.append(Paragraph("<b>转场建议:</b>", normal_style))
        elements.append(Paragraph(storyboard['transition_suggestions'], normal_style))

        doc.build(elements)
        return filepath

    def export_all(self, storyboard: Dict[str, Any], filename: str) -> Dict[str, str]:
        return {
            'csv': self.to_csv(storyboard, filename),
            'markdown': self.to_markdown(storyboard, filename),
            'pdf': self.to_pdf(storyboard, filename)
        }
