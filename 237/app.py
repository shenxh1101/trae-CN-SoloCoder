#!/usr/bin/env python3
import sys
import json
import argparse
from app import create_app
from app.file_parser import parse_file
from app.diff_engine import DiffEngine

app = create_app()

def run_command_line():
    parser = argparse.ArgumentParser(description='AI合同条款智能比对工具 - 命令行模式')
    parser.add_argument('--contract-a', '-a', required=True, help='合同A文件路径')
    parser.add_argument('--contract-b', '-b', help='合同B文件路径')
    parser.add_argument('--text-a', help='合同A文本内容')
    parser.add_argument('--text-b', help='合同B文本内容')
    parser.add_argument('--template', '-t', help='模板ID（与模板比对时使用）')
    parser.add_argument('--output', '-o', help='输出格式: json (默认), text', default='json')
    parser.add_argument('--use-transformer', action='store_true', help='使用Sentence Transformer模型')
    parser.add_argument('--threshold', type=float, help='相似度阈值 (0.0-1.0)')
    parser.add_argument('--focus-categories', nargs='+', help='重点关注的条款类别')
    parser.add_argument('--ignore-patterns', nargs='+', help='自定义忽略正则表达式')
    
    args = parser.parse_args()
    
    try:
        if args.contract_a:
            text_a = parse_file(args.contract_a)
        elif args.text_a:
            text_a = args.text_a
        else:
            print(json.dumps({'error': '请提供合同A的文件路径或文本内容'}, ensure_ascii=False))
            sys.exit(1)
        
        if args.contract_b:
            text_b = parse_file(args.contract_b)
        elif args.text_b:
            text_b = args.text_b
        else:
            print(json.dumps({'error': '请提供合同B的文件路径或文本内容'}, ensure_ascii=False))
            sys.exit(1)
        
        diff_engine = DiffEngine(
            use_transformer=args.use_transformer,
            ignore_patterns=args.ignore_patterns,
            threshold=args.threshold
        )
        
        result = diff_engine.compare_contracts(text_a, text_b, focus_categories=args.focus_categories)
        
        if args.output == 'json':
            output = {
                'success': True,
                'overall_similarity': result['overall_similarity'],
                'total_clauses_a': result['total_clauses_a'],
                'total_clauses_b': result['total_clauses_b'],
                'stats': result['stats'],
                'differences': []
            }
            
            for item in result['diff_results']:
                output['differences'].append({
                    'category': item['category'],
                    'type': item['type'],
                    'similarity': item['similarity'],
                    'old_text': item['old_text'],
                    'new_text': item['new_text']
                })
            
            print(json.dumps(output, ensure_ascii=False, indent=2))
        
        else:
            print(f"=== 合同比对结果 ===")
            print(f"整体相似度: {result['overall_similarity']:.1%}")
            print(f"合同A条款数: {result['total_clauses_a']}")
            print(f"合同B条款数: {result['total_clauses_b']}")
            print(f"\n统计:")
            print(f"  新增: {result['stats']['added']}")
            print(f"  删除: {result['stats']['deleted']}")
            print(f"  修改: {result['stats']['modified']}")
            print(f"  未变化: {result['stats']['unchanged']}")
            print(f"\n差异详情:")
            for i, item in enumerate(result['diff_results'], 1):
                print(f"\n{i}. [{item['category']}] {item['type']} (相似度: {item['similarity']:.1%})")
                if item['old_text']:
                    print(f"   - 合同A: {item['old_text'][:100]}...")
                if item['new_text']:
                    print(f"   - 合同B: {item['new_text'][:100]}...")
    
    except Exception as e:
        print(json.dumps({'error': str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        run_command_line()
    else:
        app.run(debug=True, host='0.0.0.0', port=5001)
