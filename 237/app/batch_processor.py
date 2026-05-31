import os
import json
from app.file_parser import parse_file, allowed_file
from app.diff_engine import DiffEngine
from app.exporter import Exporter

class BatchProcessor:
    def __init__(self, upload_folder, export_folder=None):
        self.upload_folder = upload_folder
        self.export_folder = export_folder
    
    def process_folder(self, base_file_path, folder_path, 
                       use_transformer=False, ignore_patterns=None, 
                       threshold=None, focus_categories=None):
        return self.process_batch(
            base_file_path, folder_path,
            use_transformer=use_transformer,
            ignore_patterns=ignore_patterns,
            threshold=threshold,
            focus_categories=focus_categories
        )
    
    def process_batch(self, base_file_path, compare_folder_path, 
                      use_transformer=False, ignore_patterns=None, 
                      threshold=None, focus_categories=None):
        base_text = parse_file(base_file_path)
        base_name = os.path.basename(base_file_path)
        
        compare_files = []
        if os.path.isdir(compare_folder_path):
            for filename in os.listdir(compare_folder_path):
                filepath = os.path.join(compare_folder_path, filename)
                if os.path.isfile(filepath) and allowed_file(filename):
                    compare_files.append((filepath, filename))
        
        results = []
        diff_engine = DiffEngine(
            use_transformer=use_transformer,
            ignore_patterns=ignore_patterns,
            threshold=threshold
        )
        
        for idx, (filepath, filename) in enumerate(compare_files):
            try:
                compare_text = parse_file(filepath)
                comparison_result = diff_engine.compare_contracts(
                    base_text, compare_text, focus_categories=focus_categories
                )
                comparison_result['contract_name'] = filename
                comparison_result['contract_path'] = filepath
                comparison_result['contract_id'] = f'contract_{idx}'
                
                if self.export_folder:
                    exporter = Exporter(self.export_folder)
                    detail_filepath, detail_filename = exporter.export_to_html(
                        comparison_result,
                        base_name,
                        filename,
                        focus_categories
                    )
                    comparison_result['detail_file'] = {
                        'filename': detail_filename,
                        'download_url': f'/exports/{detail_filename}'
                    }
                
                results.append(comparison_result)
            except Exception as e:
                results.append({
                    'contract_name': filename,
                    'contract_path': filepath,
                    'contract_id': f'contract_{idx}',
                    'error': str(e),
                    'overall_similarity': 0,
                    'total_clauses_a': 0,
                    'total_clauses_b': 0,
                    'diff_results': [],
                    'stats': {'added': 0, 'deleted': 0, 'modified': 0, 'unchanged': 0, 'by_category': {}}
                })
        
        valid_results = [r for r in results if 'error' not in r]
        avg_similarity = sum(r['overall_similarity'] for r in valid_results) / len(valid_results) if valid_results else 0
        
        category_stats = {}
        for r in valid_results:
            for cat, cat_data in r['stats'].get('by_category', {}).items():
                if cat not in category_stats:
                    category_stats[cat] = {'added': 0, 'deleted': 0, 'modified': 0, 'unchanged': 0, 'contract_count': 0}
                category_stats[cat]['added'] += cat_data.get('added', 0)
                category_stats[cat]['deleted'] += cat_data.get('deleted', 0)
                category_stats[cat]['modified'] += cat_data.get('modified', 0)
                category_stats[cat]['unchanged'] += cat_data.get('unchanged', 0)
                if cat_data.get('added', 0) + cat_data.get('deleted', 0) + cat_data.get('modified', 0) > 0:
                    category_stats[cat]['contract_count'] += 1
        
        return {
            'base_contract': base_name,
            'base_contract_path': base_file_path,
            'total_compared': len(results),
            'success_count': len(valid_results),
            'error_count': len(results) - len(valid_results),
            'average_similarity': avg_similarity,
            'category_summary': category_stats,
            'results': results
        }
