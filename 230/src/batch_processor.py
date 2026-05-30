import os
import re
from typing import List, Dict, Any
from tqdm import tqdm
from pace_analyzer import PaceAnalyzer
from storyboard_html import generate_storyboard_html


class BatchProcessor:
    def __init__(self, generator, exporter):
        self.generator = generator
        self.exporter = exporter
        self.pace_analyzer = PaceAnalyzer()

    def read_creatives_from_file(self, filepath: str) -> List[str]:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"文件不存在: {filepath}")

        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        creatives = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                creatives.append(line)

        return creatives

    def _sanitize_filename(self, name: str) -> str:
        name = re.sub(r'[^\w\s-]', '', name)
        name = re.sub(r'[-\s]+', '_', name)
        return name.strip()[:30] or "story"

    def process_batch(
        self,
        input_file: str,
        output_dir: str,
        total_duration: int = 30,
        formats: List[str] = None
    ) -> Dict[str, Any]:
        formats = formats or ['markdown']

        creatives = self.read_creatives_from_file(input_file)
        if not creatives:
            return {"success": False, "message": "未找到有效的创意描述", "results": []}

        timestamp_dir = f"batch_{len(creatives)}_stories"
        batch_root = os.path.join(output_dir, timestamp_dir)
        os.makedirs(batch_root, exist_ok=True)

        results = []
        success_count = 0

        for i, creative in enumerate(tqdm(creatives, desc="批量生成中")):
            try:
                storyboard = self.generator.generate(creative, total_duration)

                safe_title = self._sanitize_filename(storyboard['title'])
                story_dir_name = f"{i + 1:03d}_{safe_title}"
                story_dir = os.path.join(batch_root, story_dir_name)
                os.makedirs(story_dir, exist_ok=True)

                self.exporter.output_dir = story_dir
                filename = "storyboard"

                exported_files = {}

                if 'csv' in formats:
                    exported_files['csv'] = self.exporter.to_csv(storyboard, filename)
                if 'markdown' in formats:
                    exported_files['markdown'] = self.exporter.to_markdown(storyboard, filename)
                if 'pdf' in formats:
                    exported_files['pdf'] = self.exporter.to_pdf(storyboard, filename)
                if 'html' in formats:
                    pace_analysis = self.pace_analyzer.analyze_pace_curve(storyboard)
                    html_path = os.path.join(story_dir, f"{filename}.html")
                    exported_files['html'] = generate_storyboard_html(storyboard, html_path, pace_analysis)

                results.append({
                    "index": i + 1,
                    "creative": creative,
                    "title": storyboard['title'],
                    "directory": story_dir,
                    "success": True,
                    "files": exported_files
                })
                success_count += 1

            except Exception as e:
                results.append({
                    "index": i + 1,
                    "creative": creative,
                    "success": False,
                    "error": str(e)
                })

        summary_path = os.path.join(batch_root, "summary.md")
        with open(summary_path, 'w', encoding='utf-8') as f:
            f.write(f"# 批量生成汇总\n\n")
            f.write(f"- 总数量: {len(creatives)}\n")
            f.write(f"- 成功: {success_count}\n")
            f.write(f"- 失败: {len(creatives) - success_count}\n\n")
            f.write("## 生成结果\n\n")
            for r in results:
                status = "✅" if r['success'] else "❌"
                f.write(f"{status} **{r.get('title', '未命名')}**\n")
                f.write(f"- 创意: {r['creative']}\n")
                if r['success']:
                    f.write(f"- 目录: {os.path.basename(r['directory'])}\n")
                    f.write(f"- 导出格式: {', '.join(r['files'].keys())}\n")
                else:
                    f.write(f"- 错误: {r.get('error', '未知错误')}\n")
                f.write("\n")

        return {
            "success": True,
            "batch_dir": batch_root,
            "total": len(creatives),
            "success_count": success_count,
            "results": results
        }
