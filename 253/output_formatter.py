import json
from typing import List, Optional
from datetime import datetime

from models import PodcastTopic, TopicComparison


class OutputFormatter:
    @staticmethod
    def to_json(topics: List[PodcastTopic], pretty: bool = True) -> str:
        data = [t.model_dump() for t in topics]
        indent = 2 if pretty else None
        return json.dumps(data, ensure_ascii=False, indent=indent)

    @staticmethod
    def to_markdown_table(topics: List[PodcastTopic]) -> str:
        lines = []
        lines.append("# 播客选题列表\n")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        lines.append("| 序号 | 标题 | 嘉宾类型 | 预估时长 | 播出窗口 |")
        lines.append("|------|------|----------|----------|----------|")

        for i, topic in enumerate(topics, 1):
            title = topic.title.replace('|', '\\|')
            guest = topic.guest_type.replace('|', '\\|')
            window = topic.broadcast_window or "-"
            lines.append(f"| {i} | {title} | {guest} | {topic.duration} | {window} |")

        lines.append("\n---\n")
        lines.append("## 详细大纲\n")

        for i, topic in enumerate(topics, 1):
            lines.append(f"### {i}. {topic.title}\n")
            lines.append(f"- **嘉宾类型**: {topic.guest_type}")
            lines.append(f"- **预估时长**: {topic.duration}")
            if topic.broadcast_window:
                lines.append(f"- **播出窗口**: {topic.broadcast_window}")
            lines.append(f"- **讨论大纲**:")
            for item in topic.outline:
                lines.append(f"  - {item}")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def to_shownotes(topics: List[PodcastTopic], episode_num: int = 1) -> str:
        lines = []

        for idx, topic in enumerate(topics, 1):
            lines.append(f"---")
            lines.append(f"# 第{episode_num + idx - 1}期: {topic.title}")
            lines.append(f"---\n")

            lines.append("## 节目信息")
            lines.append(f"- **主题**: {topic.title}")
            lines.append(f"- **嘉宾类型**: {topic.guest_type}")
            lines.append(f"- **预计时长**: {topic.duration}")
            if topic.broadcast_window:
                lines.append(f"- **推荐播出**: {topic.broadcast_window}")
            lines.append("")

            lines.append("## 内容大纲")
            for i, item in enumerate(topic.outline, 1):
                lines.append(f"{i}. {item}")
            lines.append("")

            lines.append("## 时间轴 (Timeline)")
            lines.append("| 时间 | 内容 |")
            lines.append("|------|------|")
            lines.append("| 00:00 | 开场介绍，欢迎嘉宾")
            lines.append(f"| 02:00 | {topic.outline[0] if topic.outline else '话题引入'}")
            if len(topic.outline) > 1:
                lines.append(f"| 10:00 | {topic.outline[1]}")
            if len(topic.outline) > 2:
                lines.append(f"| 20:00 | {topic.outline[2]}")
            lines.append("| 30:00 | 总结与下期预告")
            lines.append("")

            lines.append("## 嘉宾介绍")
            lines.append(f"> [嘉宾姓名]")
            lines.append(f"> {topic.guest_type}")
            lines.append(f"> 相关领域资深从业者")
            lines.append("")

            lines.append("## 相关链接")
            lines.append("- [待补充] 参考资料链接")
            lines.append("- [待补充] 嘉宾社交媒体")
            lines.append("")

            lines.append("## 致谢")
            lines.append("感谢收听！欢迎订阅、评论、分享。")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def to_task_list(topics: List[PodcastTopic]) -> str:
        lines = ["# 播客制作待办任务清单\n"]

        for i, topic in enumerate(topics, 1):
            lines.append(f"## {i}. {topic.title}\n")
            if topic.tasks:
                for j, task in enumerate(topic.tasks, 1):
                    status = "[ ]"
                    lines.append(f"{status} {task}")
            else:
                lines.append("- [ ] 联系合适的嘉宾")
                lines.append("- [ ] 收集背景资料")
                lines.append("- [ ] 准备访谈问题")
                lines.append("- [ ] 预约录制时间")
                lines.append("- [ ] 录制节目")
                lines.append("- [ ] 后期剪辑")
                lines.append("- [ ] 发布宣传")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def comparison_report(comparisons: List[TopicComparison]) -> str:
        lines = ["# 选题方案对比报告\n"]
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        lines.append("## 评分汇总表\n")
        lines.append("| 方案 | 关键词匹配 | 听众适配 | 综合评分 |")
        lines.append("|------|------------|----------|----------|")

        for comp in comparisons:
            lines.append(
                f"| {comp.position} | {comp.keyword_match_score} | "
                f"{comp.audience_fit_score} | {comp.overall_score} |"
            )

        lines.append("\n## 方案详情\n")

        for i, comp in enumerate(comparisons, 1):
            lines.append(f"### 方案 {i}: {comp.position}\n")
            lines.append(f"- **关键词匹配度**: {comp.keyword_match_score}/100")
            lines.append(f"- **听众适配度**: {comp.audience_fit_score}/100")
            lines.append(f"- **综合评分**: {comp.overall_score}/100")
            lines.append("")
            lines.append("#### 选题示例:")
            for j, topic in enumerate(comp.topics[:3], 1):
                lines.append(f"{j}. {topic.title}")
            lines.append("")

        best_idx = max(range(len(comparisons)), key=lambda i: comparisons[i].overall_score)
        best = comparisons[best_idx]
        lines.append(f"## 推荐方案\n")
        lines.append(f"综合评分最高的方案是: **{best.position}** (评分: {best.overall_score}/100)")
        lines.append("")

        return "\n".join(lines)

    @staticmethod
    def save_to_file(content: str, filename: str):
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        return filename
