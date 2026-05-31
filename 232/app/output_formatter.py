import json
from typing import Dict, Any, List
from datetime import datetime
from .models import Roadmap, Phase, Resource


class OutputFormatter:
    @staticmethod
    def to_json(roadmap: Roadmap, pretty: bool = True) -> str:
        data = roadmap.to_dict()
        if pretty:
            return json.dumps(data, ensure_ascii=False, indent=2)
        return json.dumps(data, ensure_ascii=False)
    
    @staticmethod
    def to_markdown(roadmap: Roadmap) -> str:
        lines = []
        
        lines.append(f"# {roadmap.skill} 学习路线图")
        lines.append("")
        
        total_hours = roadmap.calculate_total_hours()
        completion = roadmap.get_completed_percentage()
        remaining = roadmap.get_remaining_hours()
        
        lines.append(f"**总预估时间**: {total_hours} 小时")
        lines.append(f"**难度等级**: {'⭐' * roadmap.difficulty}")
        lines.append(f"**完成进度**: {completion:.1f}% ({total_hours - remaining}/{total_hours} 小时)")
        if roadmap.time_budget:
            lines.append(f"**时间预算**: 每天 {roadmap.time_budget.get('daily_hours', 2)} 小时，共 {roadmap.time_budget.get('total_days', 90)} 天")
        lines.append("")
        
        lines.append("## 进度概览")
        lines.append("")
        
        completed_count = sum(1 for p in roadmap.phases if p.completed)
        total_count = len(roadmap.phases)
        progress_percent = (completed_count / total_count * 100) if total_count > 0 else 0
        
        progress_bar_length = 30
        filled = int(progress_percent / 100 * progress_bar_length)
        progress_bar = "█" * filled + "░" * (progress_bar_length - filled)
        lines.append(f"```")
        lines.append(f"进度: [{progress_bar}] {progress_percent:.1f}%")
        lines.append(f"```")
        lines.append("")
        
        lines.append("## 学习阶段")
        lines.append("")
        
        for idx, phase in enumerate(roadmap.phases, 1):
            status = "✅ 已完成" if phase.completed else "⏳ 待学习"
            lines.append(f"### 阶段 {idx}: {phase.name} - {status}")
            lines.append("")
            lines.append(f"- **预估时间**: {phase.estimated_hours} 小时")
            lines.append(f"- **难度**: {'⭐' * phase.difficulty}")
            if phase.dependencies:
                dep_names = [p.name for p in roadmap.phases if p.id in phase.dependencies]
                lines.append(f"- **前置依赖**: {', '.join(dep_names)}")
            if phase.notes:
                lines.append(f"- **备注**: {phase.notes}")
            lines.append("")
            
            lines.append("#### 学习目标")
            lines.append("")
            for obj in phase.objectives:
                lines.append(f"- {obj}")
            lines.append("")
            
            lines.append("#### 推荐资源")
            lines.append("")
            
            type_icons = {
                "book": "📚",
                "course": "🎓",
                "documentation": "📖",
                "project": "💻"
            }
            
            for res in phase.resources:
                icon = type_icons.get(res.type, "📌")
                rating = f" [👍 {res.upvotes} 👎 {res.downvotes}]" if res.upvotes > 0 or res.downvotes > 0 else ""
                if res.url:
                    lines.append(f"- {icon} **[{res.name}]({res.url})** ({res.type}){rating}")
                else:
                    lines.append(f"- {icon} **{res.name}** ({res.type}){rating}")
                if res.description:
                    lines.append(f"  - {res.description}")
            lines.append("")
        
        lines.append("---")
        lines.append(f"*生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        
        return "\n".join(lines)
    
    @staticmethod
    def to_html(roadmap: Roadmap, include_progress_bar: bool = True) -> str:
        total_hours = roadmap.calculate_total_hours()
        completion = roadmap.get_completed_percentage()
        remaining = roadmap.get_remaining_hours()
        
        html_parts = [
            "<!DOCTYPE html>",
            "<html lang='zh-CN'>",
            "<head>",
            "<meta charset='UTF-8'>",
            f"<title>{roadmap.skill} - 学习路线图</title>",
            "<style>",
            OutputFormatter._get_css(),
            "</style>",
            "</head>",
            "<body>",
            "<div class='container'>",
            f"<h1 class='main-title'>🎯 {roadmap.skill} 学习路线图</h1>",
            "<div class='summary-card'>",
            "<div class='summary-grid'>",
            f"<div class='summary-item'><span class='label'>总预估时间</span><span class='value'>{total_hours} 小时</span></div>",
            f"<div class='summary-item'><span class='label'>难度等级</span><span class='value'>{'⭐' * roadmap.difficulty}</span></div>",
            f"<div class='summary-item'><span class='label'>完成进度</span><span class='value'>{completion:.1f}%</span></div>",
            f"<div class='summary-item'><span class='label'>剩余时间</span><span class='value'>{remaining} 小时</span></div>",
            "</div>"
        ]
        
        if roadmap.time_budget:
            html_parts.append(
                f"<div class='budget-info'>📅 时间预算: 每天 {roadmap.time_budget.get('daily_hours', 2)} 小时，共 {roadmap.time_budget.get('total_days', 90)} 天</div>"
            )
        
        if include_progress_bar:
            html_parts.append(OutputFormatter._get_progress_bar_html(roadmap))
        
        html_parts.append("</div>")
        html_parts.append("<h2 class='section-title'>📚 学习阶段</h2>")
        html_parts.append("<div class='phases-container'>")
        
        for idx, phase in enumerate(roadmap.phases, 1):
            html_parts.append(OutputFormatter._get_phase_html(idx, phase, roadmap))
        
        html_parts.append("</div>")
        html_parts.append("</div>")
        html_parts.append(f"<div class='footer'>生成于 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>")
        html_parts.append("</body>")
        html_parts.append("</html>")
        
        return "\n".join(html_parts)
    
    @staticmethod
    def _get_css() -> str:
        return """
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
                color: #333;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .main-title {
                text-align: center;
                color: white;
                font-size: 2.5rem;
                margin-bottom: 30px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }
            
            .summary-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                margin-bottom: 30px;
            }
            
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .summary-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 16px;
                background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
                border-radius: 12px;
            }
            
            .summary-item .label {
                font-size: 0.9rem;
                color: #666;
                margin-bottom: 8px;
            }
            
            .summary-item .value {
                font-size: 1.4rem;
                font-weight: bold;
                color: #4a5568;
            }
            
            .budget-info {
                text-align: center;
                padding: 12px;
                background: #e8f4fd;
                border-radius: 8px;
                color: #2c5282;
                font-weight: 500;
            }
            
            .progress-container {
                margin-top: 20px;
            }
            
            .progress-label {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-weight: 500;
                color: #4a5568;
            }
            
            .progress-bar-bg {
                width: 100%;
                height: 24px;
                background: #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }
            
            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #48bb78, #38a169);
                border-radius: 12px;
                transition: width 0.5s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.85rem;
                font-weight: bold;
            }
            
            .section-title {
                color: white;
                font-size: 1.8rem;
                margin: 30px 0 20px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
            }
            
            .phases-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .phase-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                transition: transform 0.2s, box-shadow 0.2s;
                border-left: 6px solid #667eea;
            }
            
            .phase-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            }
            
            .phase-card.completed {
                border-left-color: #48bb78;
                opacity: 0.85;
            }
            
            .phase-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
            }
            
            .phase-title {
                font-size: 1.4rem;
                color: #2d3748;
            }
            
            .phase-status {
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
            }
            
            .phase-status.completed {
                background: #c6f6d5;
                color: #22543d;
            }
            
            .phase-status.pending {
                background: #fefcbf;
                color: #744210;
            }
            
            .phase-meta {
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                margin-bottom: 16px;
                padding: 12px;
                background: #f7fafc;
                border-radius: 8px;
            }
            
            .meta-item {
                display: flex;
                align-items: center;
                gap: 6px;
                color: #4a5568;
                font-size: 0.9rem;
            }
            
            .phase-notes {
                background: #fff3cd;
                padding: 10px 14px;
                border-radius: 8px;
                margin-bottom: 16px;
                color: #856404;
                font-size: 0.9rem;
            }
            
            .phase-section {
                margin-bottom: 16px;
            }
            
            .phase-section h4 {
                color: #2d3748;
                margin-bottom: 10px;
                font-size: 1.1rem;
            }
            
            .objectives-list {
                list-style: none;
                padding-left: 0;
            }
            
            .objectives-list li {
                padding: 8px 12px;
                margin-bottom: 6px;
                background: #f7fafc;
                border-radius: 6px;
                border-left: 3px solid #667eea;
            }
            
            .resources-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 12px;
            }
            
            .resource-card {
                padding: 12px;
                background: linear-gradient(135deg, #f5f7fa 0%, #e8edf2 100%);
                border-radius: 8px;
                transition: transform 0.15s;
            }
            
            .resource-card:hover {
                transform: scale(1.02);
            }
            
            .resource-type {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 500;
                margin-bottom: 6px;
            }
            
            .resource-type.book { background: #fed7d7; color: #742a2a; }
            .resource-type.course { background: #bee3f8; color: #2a4365; }
            .resource-type.documentation { background: #c6f6d5; color: #22543d; }
            .resource-type.project { background: #e9d8fd; color: #44337a; }
            
            .resource-name {
                color: #2b6cb0;
                text-decoration: none;
                font-weight: 500;
                display: block;
                margin-bottom: 4px;
            }
            
            .resource-name:hover {
                text-decoration: underline;
            }
            
            .resource-desc {
                color: #718096;
                font-size: 0.85rem;
                margin-bottom: 6px;
            }
            
            .resource-rating {
                display: flex;
                gap: 12px;
                font-size: 0.8rem;
                color: #4a5568;
            }
            
            .footer {
                text-align: center;
                color: rgba(255,255,255,0.8);
                margin-top: 30px;
                font-size: 0.9rem;
            }
            
            @media print {
                body {
                    background: white;
                    padding: 0;
                }
                .main-title, .section-title {
                    color: #333;
                    text-shadow: none;
                }
                .phase-card {
                    break-inside: avoid;
                    box-shadow: none;
                    border: 1px solid #ddd;
                }
            }
        """
    
    @staticmethod
    def _get_progress_bar_html(roadmap: Roadmap) -> str:
        completed = sum(1 for p in roadmap.phases if p.completed)
        total = len(roadmap.phases)
        percentage = (completed / total * 100) if total > 0 else 0
        
        return f"""
            <div class='progress-container'>
                <div class='progress-label'>
                    <span>整体进度</span>
                    <span>{completed}/{total} 阶段</span>
                </div>
                <div class='progress-bar-bg'>
                    <div class='progress-bar-fill' style='width: {percentage}%'>
                        {percentage:.1f}%
                    </div>
                </div>
            </div>
        """
    
    @staticmethod
    def _get_phase_html(idx: int, phase: Phase, roadmap: Roadmap) -> str:
        status_class = "completed" if phase.completed else "pending"
        status_text = "✅ 已完成" if phase.completed else "⏳ 待学习"
        
        type_names = {
            "book": "📚 书籍",
            "course": "🎓 课程",
            "documentation": "📖 文档",
            "project": "💻 项目"
        }
        
        dep_names = [p.name for p in roadmap.phases if p.id in phase.dependencies]
        
        html = f"""
            <div class='phase-card {status_class}'>
                <div class='phase-header'>
                    <h3 class='phase-title'>阶段 {idx}: {phase.name}</h3>
                    <span class='phase-status {status_class}'>{status_text}</span>
                </div>
                
                <div class='phase-meta'>
                    <span class='meta-item'>⏱️ {phase.estimated_hours} 小时</span>
                    <span class='meta-item'>{'⭐' * phase.difficulty}</span>
                    {f'<span class="meta-item">🔗 前置: {", ".join(dep_names)}</span>' if dep_names else ''}
                </div>
                
                {f'<div class="phase-notes">📝 {phase.notes}</div>' if phase.notes else ''}
                
                <div class='phase-section'>
                    <h4>🎯 学习目标</h4>
                    <ul class='objectives-list'>
        """
        
        for obj in phase.objectives:
            html += f"<li>{obj}</li>"
        
        html += """
                    </ul>
                </div>
                
                <div class='phase-section'>
                    <h4>📚 推荐资源</h4>
                    <div class='resources-grid'>
        """
        
        for res in phase.resources:
            type_name = type_names.get(res.type, "📌 资源")
            rating_display = ""
            if res.upvotes > 0 or res.downvotes > 0:
                rating_display = f'<div class="resource-rating"><span>👍 {res.upvotes}</span><span>👎 {res.downvotes}</span></div>'
            
            name_html = f'<a href="{res.url}" class="resource-name" target="_blank">{res.name}</a>' if res.url else f'<span class="resource-name">{res.name}</span>'
            
            html += f"""
                <div class='resource-card'>
                    <span class='resource-type {res.type}'>{type_name}</span>
                    {name_html}
                    {f'<div class="resource-desc">{res.description}</div>' if res.description else ''}
                    {rating_display}
                </div>
            """
        
        html += """
                    </div>
                </div>
            </div>
        """
        
        return html
    
    @staticmethod
    def comparison_to_html(comparison: Dict[str, Any]) -> str:
        html_parts = [
            "<!DOCTYPE html>",
            "<html lang='zh-CN'>",
            "<head>",
            "<meta charset='UTF-8'>",
            "<title>路线图比较</title>",
            "<style>",
            OutputFormatter._get_comparison_css(),
            "</style>",
            "</head>",
            "<body>",
            "<div class='container'>",
            "<h1 class='title'>📊 学习路线图比较</h1>",
            OutputFormatter._get_comparison_summary_html(comparison),
            OutputFormatter._get_comparison_table_html(comparison),
            "</div>",
            "</body>",
            "</html>"
        ]
        
        return "\n".join(html_parts)
    
    @staticmethod
    def _get_comparison_css() -> str:
        return """
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container { max-width: 1200px; margin: 0 auto; }
            .title {
                text-align: center;
                color: white;
                font-size: 2.5rem;
                margin-bottom: 30px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }
            .summary-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                margin-bottom: 30px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 16px;
            }
            .summary-item {
                text-align: center;
                padding: 16px;
                background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
                border-radius: 12px;
            }
            .summary-item .label {
                font-size: 0.85rem;
                color: #666;
                margin-bottom: 6px;
            }
            .summary-item .value {
                font-size: 1.3rem;
                font-weight: bold;
                color: #2d3748;
            }
            .table-card {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                overflow-x: auto;
            }
            table {
                width: 100%;
                border-collapse: collapse;
            }
            th, td {
                padding: 14px;
                text-align: left;
                border-bottom: 1px solid #e2e8f0;
            }
            th {
                background: #f7fafc;
                font-weight: 600;
                color: #2d3748;
            }
            tr:hover {
                background: #f7fafc;
            }
            .difficulty-stars {
                color: #f6ad55;
            }
            .progress-bar {
                width: 100px;
                height: 12px;
                background: #e2e8f0;
                border-radius: 6px;
                overflow: hidden;
            }
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #48bb78, #38a169);
                border-radius: 6px;
            }
        """
    
    @staticmethod
    def _get_comparison_summary_html(comparison: Dict[str, Any]) -> str:
        s = comparison["summary"]
        return f"""
            <div class='summary-card'>
                <h2 style='margin-bottom: 20px; color: #2d3748;'>📈 概览统计</h2>
                <div class='summary-grid'>
                    <div class='summary-item'>
                        <div class='label'>最少耗时</div>
                        <div class='value'>{s['min_hours']}h</div>
                    </div>
                    <div class='summary-item'>
                        <div class='label'>最多耗时</div>
                        <div class='value'>{s['max_hours']}h</div>
                    </div>
                    <div class='summary-item'>
                        <div class='label'>平均耗时</div>
                        <div class='value'>{s['avg_hours']}h</div>
                    </div>
                    <div class='summary-item'>
                        <div class='label'>最低难度</div>
                        <div class='value'>{'⭐' * s['min_difficulty']}</div>
                    </div>
                    <div class='summary-item'>
                        <div class='label'>最高难度</div>
                        <div class='value'>{'⭐' * s['max_difficulty']}</div>
                    </div>
                    <div class='summary-item'>
                        <div class='label'>平均难度</div>
                        <div class='value'>{s['avg_difficulty']}</div>
                    </div>
                </div>
            </div>
        """
    
    @staticmethod
    def _get_comparison_table_html(comparison: Dict[str, Any]) -> str:
        html = """
            <div class='table-card'>
                <h2 style='margin-bottom: 20px; color: #2d3748;'>📋 详细比较</h2>
                <table>
                    <thead>
                        <tr>
                            <th>技能名称</th>
                            <th>总耗时</th>
                            <th>难度</th>
                            <th>阶段数</th>
                            <th>完成度</th>
                            <th>剩余时间</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for rm in comparison["roadmaps"]:
            html += f"""
                <tr>
                    <td><strong>{rm['skill']}</strong></td>
                    <td>{rm['total_hours']}h</td>
                    <td class='difficulty-stars'>{'⭐' * rm['difficulty']}</td>
                    <td>{rm['phases_count']}</td>
                    <td>
                        <div style='display: flex; align-items: center; gap: 10px;'>
                            <div class='progress-bar'>
                                <div class='progress-fill' style='width: {rm["completion_percentage"]}%'></div>
                            </div>
                            <span>{rm['completion_percentage']:.1f}%</span>
                        </div>
                    </td>
                    <td>{rm['remaining_hours']}h</td>
                </tr>
            """
        
        html += """
                    </tbody>
                </table>
            </div>
        """
        return html
