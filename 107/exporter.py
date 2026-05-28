from models import TravelPlan
from datetime import timedelta
from typing import Optional

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors

    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


class Exporter:
    def __init__(self, exchange_rate: float = 7.0):
        self.exchange_rate = exchange_rate

    def export_to_text(self, plan: TravelPlan, filename: str) -> bool:
        try:
            with open(filename, "w", encoding="utf-8") as f:
                f.write("=" * 60 + "\n")
                f.write(f"旅行计划: {plan.name}\n")
                f.write("=" * 60 + "\n\n")

                f.write("【基本信息】\n")
                f.write(f"目的地: {plan.destination}\n")
                f.write(f"出发日期: {plan.start_date}\n")
                f.write(f"结束日期: {plan.end_date}\n")
                f.write(f"行程天数: {plan.duration} 天\n\n")

                if plan.daily_itineraries:
                    f.write("-" * 60 + "\n")
                    f.write("【每日行程】\n")
                    f.write("-" * 60 + "\n")
                    current_day = 0
                    for itinerary in plan.daily_itineraries:
                        if itinerary.day != current_day:
                            current_day = itinerary.day
                            current_date = plan.start_date + timedelta(days=itinerary.day - 1)
                            f.write(f"\n第 {itinerary.day} 天 ({current_date})\n")
                            f.write("-" * 40 + "\n")
                        f.write(f"  {itinerary.time} - {itinerary.location}")
                        if itinerary.notes:
                            f.write(f"\n    备注: {itinerary.notes}")
                        f.write("\n")
                    f.write("\n")

                if plan.budget_items:
                    f.write("-" * 60 + "\n")
                    f.write("【预算明细】\n")
                    f.write("-" * 60 + "\n")
                    f.write(f"{'分类':<10} {'描述':<20} {'金额':>10} {'状态':<10}\n")
                    f.write("-" * 60 + "\n")
                    for item in plan.budget_items:
                        status = "已花费" if item.is_spent else "未花费"
                        f.write(f"{item.category:<10} {item.description:<20} {item.amount:>8.2f} {item.currency} {status:<10}\n")
                    f.write("-" * 60 + "\n")
                    total_cny = plan.total_budget("CNY", self.exchange_rate)
                    spent_cny = plan.total_spent("CNY", self.exchange_rate)
                    f.write(f"总预算: ¥{total_cny:.2f}\n")
                    f.write(f"已花费: ¥{spent_cny:.2f}\n")
                    f.write(f"剩余: ¥{total_cny - spent_cny:.2f}\n\n")

                if plan.packing_list:
                    f.write("-" * 60 + "\n")
                    f.write("【行李清单】\n")
                    f.write("-" * 60 + "\n")
                    for i, item in enumerate(plan.packing_list, 1):
                        f.write(f"{i:2d}. [ ] {item}\n")
                    f.write("\n")

                if plan.notes:
                    f.write("-" * 60 + "\n")
                    f.write("【备注】\n")
                    f.write("-" * 60 + "\n")
                    f.write(plan.notes + "\n")

            return True
        except Exception as e:
            print(f"导出文本失败: {e}")
            return False

    def export_to_pdf(self, plan: TravelPlan, filename: str) -> bool:
        if not PDF_AVAILABLE:
            print("PDF导出需要安装 reportlab: pip install reportlab")
            return False

        try:
            doc = SimpleDocTemplate(filename, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []

            title_style = ParagraphStyle(
                "CustomTitle",
                parent=styles["Title"],
                fontSize=20,
                spaceAfter=20,
                textColor=colors.HexColor("#1a5276"),
            )
            heading_style = ParagraphStyle(
                "CustomHeading",
                parent=styles["Heading2"],
                fontSize=14,
                spaceBefore=15,
                spaceAfter=10,
                textColor=colors.HexColor("#2874a6"),
            )
            normal_style = styles["Normal"]

            elements.append(Paragraph(f"✈️ 旅行计划: {plan.name}", title_style))
            elements.append(Spacer(1, 12))

            info_data = [
                ["目的地", plan.destination],
                ["出发日期", str(plan.start_date)],
                ["结束日期", str(plan.end_date)],
                ["行程天数", f"{plan.duration} 天"],
            ]
            info_table = Table(info_data, colWidths=[1.5 * inch, 4 * inch])
            info_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#d4e6f1")),
                        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 0), (-1, -1), 11),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#aed6f1")),
                    ]
                )
            )
            elements.append(info_table)
            elements.append(Spacer(1, 15))

            if plan.daily_itineraries:
                elements.append(Paragraph("📅 每日行程", heading_style))
                current_day = 0
                for itinerary in plan.daily_itineraries:
                    if itinerary.day != current_day:
                        current_day = itinerary.day
                        current_date = plan.start_date + timedelta(days=itinerary.day - 1)
                        elements.append(
                            Paragraph(
                                f"<b>第 {itinerary.day} 天</b> ({current_date})",
                                styles["Heading3"],
                            )
                        )
                    itinerary_text = f"<b>{itinerary.time}</b> - {itinerary.location}"
                    if itinerary.notes:
                        itinerary_text += f"<br/><i>备注: {itinerary.notes}</i>"
                    elements.append(Paragraph(itinerary_text, normal_style))
                    elements.append(Spacer(1, 6))

            if plan.budget_items:
                elements.append(Spacer(1, 10))
                elements.append(Paragraph("💰 预算明细", heading_style))
                budget_data = [["分类", "描述", "金额", "状态"]]
                for item in plan.budget_items:
                    status = "✓ 已花费" if item.is_spent else "○ 未花费"
                    budget_data.append(
                        [
                            item.category,
                            item.description,
                            f"{item.amount:.2f} {item.currency}",
                            status,
                        ]
                    )
                budget_table = Table(
                    budget_data, colWidths=[1 * inch, 2.5 * inch, 1 * inch, 1 * inch]
                )
                budget_table.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2874a6")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("FONTSIZE", (0, 0), (-1, 0), 10),
                            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#ebf5fb")),
                            ("GRID", (0, 0), (-1, -1), 1, colors.white),
                            ("FONTSIZE", (0, 1), (-1, -1), 9),
                        ]
                    )
                )
                elements.append(budget_table)

                total_cny = plan.total_budget("CNY", self.exchange_rate)
                spent_cny = plan.total_spent("CNY", self.exchange_rate)
                elements.append(Spacer(1, 10))
                elements.append(
                    Paragraph(
                        f"<b>总预算:</b> ¥{total_cny:.2f} | "
                        f"<b>已花费:</b> ¥{spent_cny:.2f} | "
                        f"<b>剩余:</b> ¥{total_cny - spent_cny:.2f}",
                        normal_style,
                    )
                )

            if plan.packing_list:
                elements.append(Spacer(1, 15))
                elements.append(Paragraph("🎒 行李清单", heading_style))
                packing_text = "<br/>".join(
                    [f"☐ {item}" for item in plan.packing_list]
                )
                elements.append(Paragraph(packing_text, normal_style))

            if plan.notes:
                elements.append(Spacer(1, 15))
                elements.append(Paragraph("📝 备注", heading_style))
                elements.append(Paragraph(plan.notes, normal_style))

            doc.build(elements)
            return True
        except Exception as e:
            print(f"导出PDF失败: {e}")
            return False
