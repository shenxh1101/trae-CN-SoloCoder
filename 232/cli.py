#!/usr/bin/env python3
import argparse
import json
import os
import sys
from typing import List, Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.generator import RoadmapGenerator
from app.storage import LocalStorage
from app.output_formatter import OutputFormatter
from app.pdf_exporter import PDFExporter
from app.models import Roadmap


def main():
    parser = argparse.ArgumentParser(
        description='AI 学习路线图生成器 - 命令行版',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 生成单个技能的路线图
  python cli.py --skill "Python数据分析"
  
  # 生成并保存为Markdown
  python cli.py --skill "前端开发" --format md --output frontend_roadmap.md
  
  # 指定时间预算
  python cli.py --skill "机器学习" --daily-hours 3 --total-days 120 --format json
  
  # 批量生成并比较
  python cli.py --batch "Python数据分析,前端开发,机器学习" --compare
  
  # 使用用户技能树
  python cli.py --skill "后端开发" --user-id myuser --skill-tree my_skills.json
  
  # 导出为PDF
  python cli.py --skill "数据分析" --format pdf --output roadmap.pdf
  
  # 加载已有路线图并标记阶段完成
  python cli.py --load data/roadmaps/python数据分析_20260101.json --complete phase-1,phase-2
  
  # 加载已有路线图并查看进度
  python cli.py --load data/roadmaps/python数据分析_20260101.json --format md
  
  # 从已保存进度加载并动态调整剩余计划
  python cli.py --skill "Python数据分析" --user-id myuser --complete phase-1,phase-2
        """
    )
    
    parser.add_argument('--skill', type=str, help='要学习的技能名称')
    parser.add_argument('--batch', type=str, help='批量生成多个技能（用逗号分隔）')
    parser.add_argument('--compare', action='store_true', help='批量生成时显示比较结果')
    parser.add_argument('--format', type=str, choices=['json', 'md', 'html', 'pdf'], 
                        default='md', help='输出格式（默认: md）')
    parser.add_argument('--output', type=str, help='输出文件路径')
    parser.add_argument('--daily-hours', type=float, default=2, help='每天学习小时数（默认: 2）')
    parser.add_argument('--total-days', type=int, default=90, help='总学习天数（默认: 90）')
    parser.add_argument('--user-id', type=str, default='default', help='用户ID（用于加载技能树和进度）')
    parser.add_argument('--skill-tree', type=str, help='技能树JSON文件路径')
    parser.add_argument('--complete', type=str, 
                        help='标记已完成的阶段ID（用逗号分隔，如 phase-1,phase-2）')
    parser.add_argument('--load', type=str, 
                        help='加载已有的路线图JSON文件（用于标记进度或导出）')
    parser.add_argument('--no-save', action='store_true', help='不保存路线图到本地')
    parser.add_argument('--list', action='store_true', help='列出已保存的路线图')
    parser.add_argument('--show-progress', action='store_true', 
                        help='显示当前学习进度详情')
    
    args = parser.parse_args()
    
    storage = LocalStorage()
    generator = RoadmapGenerator(storage=storage)
    pdf_exporter = PDFExporter()
    
    if args.list:
        list_roadmaps(storage, generator)
        return
    
    if args.skill_tree and args.user_id:
        load_skill_tree(args.skill_tree, args.user_id, storage)
    
    time_budget = {
        'daily_hours': args.daily_hours,
        'total_days': args.total_days
    }
    
    if args.load:
        handle_load(args.load, args.complete, args.format, args.output, 
                    args.no_save, args.user_id, args.show_progress,
                    generator, storage, pdf_exporter)
    elif args.batch:
        skills = [s.strip() for s in args.batch.split(',') if s.strip()]
        handle_batch(skills, time_budget, args.user_id, args.complete, args.format, 
                     args.output, args.compare, args.no_save, 
                     generator, storage, pdf_exporter)
    elif args.skill:
        handle_single(args.skill, time_budget, args.user_id, args.complete, 
                      args.format, args.output, args.no_save, args.show_progress,
                      generator, storage, pdf_exporter)
    else:
        parser.print_help()
        print("\n错误: 请指定 --skill、--batch 或 --load 参数")
        sys.exit(1)


def list_roadmaps(storage: LocalStorage, generator: RoadmapGenerator):
    files = storage.list_roadmaps()
    if not files:
        print("暂无已保存的路线图")
        return
    
    print(f"已保存的路线图 ({len(files)}):\n")
    print(f"{'文件名':<45} {'技能':<15} {'阶段数':<8} {'完成度':<10}")
    print("-" * 80)
    
    for f in sorted(files, reverse=True):
        roadmap = storage.load_roadmap(f)
        if roadmap:
            completed = sum(1 for p in roadmap.phases if p.completed)
            total = len(roadmap.phases)
            pct = roadmap.get_completed_percentage()
            print(f"{f:<45} {roadmap.skill:<15} {total:<8} {pct:.0f}% ({completed}/{total})")
        else:
            print(f"{f:<45} (加载失败)")


def load_skill_tree(filepath: str, user_id: str, storage: LocalStorage):
    if not os.path.exists(filepath):
        print(f"错误: 技能树文件不存在: {filepath}")
        sys.exit(1)
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            skill_tree = json.load(f)
        
        filepath = storage.save_skill_tree(user_id, skill_tree)
        mastered = storage.get_mastered_skills(user_id)
        print(f"✓ 技能树已加载，已掌握 {len(mastered)} 项技能")
        if mastered:
            print(f"  已掌握: {', '.join(mastered[:5])}{'...' if len(mastered) > 5 else ''}")
    except json.JSONDecodeError:
        print("错误: 无效的JSON文件")
        sys.exit(1)


def handle_load(filepath: str, complete: Optional[str], format: str, output: Optional[str],
                no_save: bool, user_id: str, show_progress: bool,
                generator: RoadmapGenerator, storage: LocalStorage, 
                pdf_exporter: PDFExporter):
    original_path = filepath
    found_path = None
    
    if os.path.exists(filepath):
        found_path = filepath
    else:
        alt_path = os.path.join('data', 'roadmaps', filepath)
        if os.path.exists(alt_path):
            found_path = alt_path
        else:
            base_name = os.path.basename(filepath)
            alt2_path = os.path.join('data', 'roadmaps', base_name)
            if os.path.exists(alt2_path):
                found_path = alt2_path
    
    if not found_path:
        print(f"\n❌ 错误: 路线图文件不存在: {original_path}")
        print(f"   尝试查找的路径:")
        print(f"     1. {original_path}")
        print(f"     2. {os.path.abspath(os.path.join('data', 'roadmaps', filepath))}")
        print(f"\n📋 可用的路线图:")
        list_roadmaps(storage, generator)
        print(f"\n💡 提示:")
        print(f"   - 使用 python cli.py --list 查看所有已保存的路线图")
        print(f"   - 从列表中复制文件名，或输入完整文件路径")
        print(f"   - 也可以只输入文件名（如: Python数据分析_20260101.json）\n")
        sys.exit(1)
    
    filepath = found_path
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        roadmap = Roadmap.from_dict(data)
    except json.JSONDecodeError as e:
        print(f"\n❌ 错误: 路线图文件格式无效 (JSON解析失败)")
        print(f"   文件: {filepath}")
        print(f"   详情: {e}")
        print(f"\n📋 可用的路线图:")
        list_roadmaps(storage, generator)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 错误: 无法加载路线图文件")
        print(f"   文件: {filepath}")
        print(f"   详情: {e}")
        print(f"\n📋 可用的路线图:")
        list_roadmaps(storage, generator)
        sys.exit(1)
    
    print(f"✓ 已加载路线图: {roadmap.skill}")
    print(f"  总阶段: {len(roadmap.phases)} 个")
    print(f"  完成进度: {roadmap.get_completed_percentage():.1f}%")
    
    if show_progress:
        print(f"\n📋 学习进度详情:")
        print("-" * 60)
        for i, phase in enumerate(roadmap.phases, 1):
            status = "✅ 已完成" if phase.completed else "⏳ 待学习"
            print(f"  {phase.id:<12} 阶段{i}: {phase.name:<20} {status} ({phase.estimated_hours}h)")
        print("-" * 60)
        completed_h = sum(p.estimated_hours for p in roadmap.phases if p.completed)
        remaining_h = roadmap.get_remaining_hours()
        print(f"  已完成: {completed_h:.1f}h | 剩余: {remaining_h:.1f}h | 总计: {roadmap.total_hours:.1f}h")
    
    if complete:
        completed_ids = [c.strip() for c in complete.split(',')]
        
        valid_ids = {p.id for p in roadmap.phases}
        invalid_ids = [cid for cid in completed_ids if cid not in valid_ids]
        if invalid_ids:
            print(f"\n⚠️  以下阶段ID无效: {', '.join(invalid_ids)}")
            print(f"   可用ID: {', '.join(sorted(valid_ids))}")
            completed_ids = [cid for cid in completed_ids if cid in valid_ids]
        
        if completed_ids:
            previously_completed = [p.id for p in roadmap.phases if p.completed]
            all_completed = list(set(previously_completed + completed_ids))
            
            roadmap = generator.adjust_for_progress(roadmap, all_completed)
            
            storage.save_progress(user_id, roadmap.skill, all_completed)
            
            if not no_save:
                saved_path = storage.save_roadmap(roadmap)
                print(f"✓ 已保存更新后的路线图: {saved_path}")
            
            print(f"✓ 已标记 {len(completed_ids)} 个阶段为完成")
            print(f"  当前完成进度: {roadmap.get_completed_percentage():.1f}%")
            
            remaining_phases = [p for p in roadmap.phases if not p.completed]
            if remaining_phases:
                print(f"\n📅 剩余计划调整:")
                print("-" * 60)
                for i, phase in enumerate(remaining_phases, 1):
                    notes_str = f" ({phase.notes})" if phase.notes else ""
                    print(f"  {phase.id:<12} {phase.name:<20} {phase.estimated_hours}h{notes_str}")
                print("-" * 60)
                print(f"  剩余总时间: {roadmap.get_remaining_hours():.1f}h")
                
                if roadmap.time_budget:
                    daily = roadmap.time_budget.get('daily_hours', 2)
                    remaining_h = roadmap.get_remaining_hours()
                    if daily > 0:
                        est_days = remaining_h / daily
                        print(f"  按每天{daily}h计算，预计还需 {est_days:.0f} 天完成")
    
    content = format_output(roadmap, format, output, pdf_exporter)
    
    if not output and format != 'pdf':
        print("\n" + "=" * 60)
        print(content)
        print("=" * 60)
    
    print(f"\n✓ 完成！")
    print(f"  - 总预估时间: {roadmap.total_hours} 小时")
    print(f"  - 难度等级: {'⭐' * roadmap.difficulty}")
    print(f"  - 学习阶段: {len(roadmap.phases)} 个")
    print(f"  - 完成进度: {roadmap.get_completed_percentage():.1f}%")


def handle_single(skill: str, time_budget: dict, user_id: str, complete: Optional[str],
                  format: str, output: Optional[str], no_save: bool, show_progress: bool,
                  generator: RoadmapGenerator, storage: LocalStorage, 
                  pdf_exporter: PDFExporter):
    print(f"\n正在生成 [{skill}] 的学习路线图...")
    print(f"时间预算: 每天 {time_budget['daily_hours']} 小时，共 {time_budget['total_days']} 天")
    
    roadmap = generator.generate(skill, time_budget, user_id)
    
    if show_progress or complete:
        print(f"\n📋 可用阶段ID:")
        for i, phase in enumerate(roadmap.phases, 1):
            status = "✅" if phase.completed else "⏳"
            print(f"  {phase.id:<12} 阶段{i}: {phase.name} ({phase.estimated_hours}h) {status}")
    
    if complete:
        completed_ids = [c.strip() for c in complete.split(',')]
        
        valid_ids = {p.id for p in roadmap.phases}
        invalid_ids = [cid for cid in completed_ids if cid not in valid_ids]
        if invalid_ids:
            print(f"\n⚠️  以下阶段ID无效: {', '.join(invalid_ids)}")
            completed_ids = [cid for cid in completed_ids if cid in valid_ids]
        
        if completed_ids:
            previously_completed = [p.id for p in roadmap.phases if p.completed]
            all_completed = list(set(previously_completed + completed_ids))
            
            roadmap = generator.adjust_for_progress(roadmap, all_completed)
            storage.save_progress(user_id, skill, all_completed)
            
            print(f"✓ 已标记 {len(completed_ids)} 个阶段为完成")
            
            remaining_phases = [p for p in roadmap.phases if not p.completed]
            if remaining_phases:
                print(f"\n📅 剩余计划调整:")
                print("-" * 60)
                for phase in remaining_phases:
                    notes_str = f" ({phase.notes})" if phase.notes else ""
                    print(f"  {phase.id:<12} {phase.name:<20} {phase.estimated_hours}h{notes_str}")
                print("-" * 60)
                print(f"  剩余总时间: {roadmap.get_remaining_hours():.1f}h")
                
                if roadmap.time_budget:
                    daily = roadmap.time_budget.get('daily_hours', 2)
                    remaining_h = roadmap.get_remaining_hours()
                    if daily > 0:
                        est_days = remaining_h / daily
                        print(f"  按每天{daily}h计算，预计还需 {est_days:.0f} 天完成")
    
    if not no_save:
        filepath = storage.save_roadmap(roadmap)
        print(f"✓ 路线图已保存到: {filepath}")
    
    content = format_output(roadmap, format, output, pdf_exporter)
    
    if not output and format != 'pdf':
        print("\n" + "=" * 60)
        print(content)
        print("=" * 60)
    
    print(f"\n✓ 路线图生成完成！")
    print(f"  - 总预估时间: {roadmap.total_hours} 小时")
    print(f"  - 难度等级: {'⭐' * roadmap.difficulty}")
    print(f"  - 学习阶段: {len(roadmap.phases)} 个")
    print(f"  - 完成进度: {roadmap.get_completed_percentage():.1f}%")


def handle_batch(skills: List[str], time_budget: dict, user_id: str,
                 complete: Optional[str], format: str, output: Optional[str], 
                 compare: bool, no_save: bool,
                 generator: RoadmapGenerator, storage: LocalStorage,
                 pdf_exporter: PDFExporter):
    print(f"\n正在批量生成 {len(skills)} 个技能的学习路线图...")
    
    roadmaps = generator.generate_batch(skills, time_budget, user_id)
    
    if not no_save:
        for rm in roadmaps:
            filepath = storage.save_roadmap(rm)
            print(f"✓ 已保存 [{rm.skill}]: {filepath}")
    
    if compare:
        comparison = generator.compare_roadmaps(roadmaps)
        print_comparison(comparison)
        
        if output and format == 'html':
            html_content = OutputFormatter.comparison_to_html(comparison)
            with open(output, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"\n✓ 比较结果已保存到: {output}")
    
    for i, rm in enumerate(roadmaps):
        if output:
            base, ext = os.path.splitext(output)
            skill_output = f"{base}_{i+1}{ext}"
        else:
            skill_output = None
        
        if i == 0 or format != 'pdf':
            format_output(rm, format, skill_output, pdf_exporter)
    
    print(f"\n✓ 批量生成完成！共 {len(roadmaps)} 个路线图")


def format_output(roadmap, format: str, output: Optional[str], pdf_exporter: PDFExporter) -> str:
    if format == 'json':
        content = OutputFormatter.to_json(roadmap)
    elif format == 'md':
        content = OutputFormatter.to_markdown(roadmap)
    elif format == 'html':
        content = OutputFormatter.to_html(roadmap)
    elif format == 'pdf':
        if output:
            result = pdf_exporter.export(roadmap, output)
            if result:
                print(f"✓ PDF已保存到: {result}")
                method = pdf_exporter.get_available_method()
                if method != 'weasyprint':
                    print(f"  (使用 {method} 方式导出)")
            return ""
        else:
            content = OutputFormatter.to_html(roadmap)
            format = 'html'
            output = roadmap.skill.lower().replace(' ', '_') + '_roadmap.html'
    else:
        content = OutputFormatter.to_markdown(roadmap)
    
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ 已保存到: {output}")
    
    return content


def print_comparison(comparison: dict):
    s = comparison['summary']
    print("\n" + "=" * 60)
    print("📊 路线图比较")
    print("=" * 60)
    print(f"\n📈 概览统计:")
    print(f"  最少耗时: {s['min_hours']}h | 最多耗时: {s['max_hours']}h | 平均耗时: {s['avg_hours']}h")
    print(f"  最低难度: {'⭐' * s['min_difficulty']} | 最高难度: {'⭐' * s['max_difficulty']} | 平均难度: {s['avg_difficulty']}")
    
    print(f"\n📋 详细对比:")
    print(f"{'技能名称':<20} {'总耗时':<8} {'难度':<10} {'阶段数':<8} {'完成度':<10} {'剩余时间':<10}")
    print("-" * 70)
    
    for rm in comparison['roadmaps']:
        print(f"{rm['skill']:<20} {rm['total_hours']:<8}h {'⭐' * rm['difficulty']:<10} "
              f"{rm['phases_count']:<8} {rm['completion_percentage']:<9.1f}% {rm['remaining_hours']:<9}h")


if __name__ == '__main__':
    main()
