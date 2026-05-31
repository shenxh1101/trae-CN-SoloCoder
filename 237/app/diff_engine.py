import re
from difflib import SequenceMatcher
from app.config import SIMILARITY_THRESHOLD, CLAUSE_CATEGORIES
from app.text_processor import TextProcessor
from app.similarity_calculator import SimilarityCalculator

class DiffEngine:
    def __init__(self, use_transformer=False, ignore_patterns=None, threshold=None):
        self.text_processor = TextProcessor(ignore_patterns=ignore_patterns)
        self.similarity_calculator = SimilarityCalculator(use_transformer=use_transformer)
        self.threshold = threshold or SIMILARITY_THRESHOLD
    
    def categorize_clause(self, clause_text):
        for category, keywords in CLAUSE_CATEGORIES.items():
            for keyword in keywords:
                if keyword in clause_text:
                    return category
        return '其他条款'
    
    def highlight_diff(self, old_text, new_text):
        old_chars = list(old_text)
        new_chars = list(new_text)
        
        matcher = SequenceMatcher(None, old_chars, new_chars)
        opcodes = matcher.get_opcodes()
        
        old_result = []
        new_result = []
        
        for tag, i1, i2, j1, j2 in opcodes:
            old_segment = ''.join(old_chars[i1:i2])
            new_segment = ''.join(new_chars[j1:j2])
            
            if tag == 'equal':
                old_result.append(f'<span class="diff-equal">{old_segment}</span>')
                new_result.append(f'<span class="diff-equal">{new_segment}</span>')
            elif tag == 'delete':
                old_result.append(f'<span class="diff-delete">{old_segment}</span>')
            elif tag == 'insert':
                new_result.append(f'<span class="diff-insert">{new_segment}</span>')
            elif tag == 'replace':
                old_result.append(f'<span class="diff-delete">{old_segment}</span>')
                new_result.append(f'<span class="diff-insert">{new_segment}</span>')
        
        return {
            'old_highlighted': ''.join(old_result),
            'new_highlighted': ''.join(new_result)
        }
    
    def compare_contracts(self, text_a, text_b, focus_categories=None):
        text_a = self.text_processor.clean_text(text_a)
        text_b = self.text_processor.clean_text(text_b)
        
        overall_similarity = self.similarity_calculator.calculate_overall_similarity(
            text_a, text_b, text_processor=self.text_processor
        )
        
        clauses_a = self.text_processor.split_clauses(text_a)
        clauses_b = self.text_processor.split_clauses(text_b)
        
        processed_a = [self.text_processor.preprocess_for_similarity(c) for c in clauses_a]
        processed_b = [self.text_processor.preprocess_for_similarity(c) for c in clauses_b]
        
        matches = self.similarity_calculator.find_best_matches(
            processed_a, processed_b, threshold=self.threshold
        )
        
        diff_results = []
        
        for match in matches:
            diff_item = {
                'category': '其他条款',
                'type': match['method'],
                'similarity': match['similarity'],
                'a_index': match['a_index'],
                'b_index': match['b_index'],
                'old_text': '',
                'new_text': '',
                'old_highlighted': '',
                'new_highlighted': ''
            }
            
            if match['method'] == 'deleted':
                diff_item['old_text'] = clauses_a[match['a_index']]
                diff_item['category'] = self.categorize_clause(clauses_a[match['a_index']])
                highlights = self.highlight_diff(clauses_a[match['a_index']], '')
                diff_item['old_highlighted'] = highlights['old_highlighted']
            elif match['method'] == 'added':
                diff_item['new_text'] = clauses_b[match['b_index']]
                diff_item['category'] = self.categorize_clause(clauses_b[match['b_index']])
                highlights = self.highlight_diff('', clauses_b[match['b_index']])
                diff_item['new_highlighted'] = highlights['new_highlighted']
            else:
                old_text = clauses_a[match['a_index']]
                new_text = clauses_b[match['b_index']]
                diff_item['old_text'] = old_text
                diff_item['new_text'] = new_text
                diff_item['category'] = self.categorize_clause(old_text)
                
                if match['similarity'] < 0.99:
                    diff_item['type'] = 'modified'
                    highlights = self.highlight_diff(old_text, new_text)
                    diff_item['old_highlighted'] = highlights['old_highlighted']
                    diff_item['new_highlighted'] = highlights['new_highlighted']
                else:
                    diff_item['type'] = 'unchanged'
                    diff_item['old_highlighted'] = f'<span class="diff-equal">{old_text}</span>'
                    diff_item['new_highlighted'] = f'<span class="diff-equal">{new_text}</span>'
            
            diff_results.append(diff_item)
        
        if focus_categories:
            diff_results.sort(
                key=lambda x: (
                    0 if x['category'] in focus_categories else 1,
                    x['similarity']
                )
            )
        else:
            diff_results.sort(key=lambda x: x['similarity'])
        
        return {
            'overall_similarity': overall_similarity,
            'total_clauses_a': len(clauses_a),
            'total_clauses_b': len(clauses_b),
            'diff_results': diff_results,
            'stats': self._calculate_stats(diff_results)
        }
    
    def _calculate_stats(self, diff_results):
        stats = {
            'added': 0,
            'deleted': 0,
            'modified': 0,
            'unchanged': 0,
            'by_category': {}
        }
        
        for item in diff_results:
            stats[item['type']] = stats.get(item['type'], 0) + 1
            if item['category'] not in stats['by_category']:
                stats['by_category'][item['category']] = {'added': 0, 'deleted': 0, 'modified': 0, 'unchanged': 0}
            stats['by_category'][item['category']][item['type']] += 1
        
        return stats
    
    def generate_revised_contract(self, text_a, diff_results, merge_strategy='prefer_new'):
        clauses_a = self.text_processor.split_clauses(text_a)
        revised_clauses = []
        
        a_index_map = {}
        for item in diff_results:
            if item['a_index'] != -1:
                a_index_map[item['a_index']] = item
        
        for i, clause in enumerate(clauses_a):
            if i in a_index_map:
                item = a_index_map[i]
                if item['type'] == 'deleted':
                    if merge_strategy == 'keep_old':
                        revised_clauses.append(clause)
                elif item['type'] in ['modified', 'unchanged']:
                    if merge_strategy == 'prefer_new':
                        revised_clauses.append(item['new_text'])
                    elif merge_strategy == 'prefer_old':
                        revised_clauses.append(clause)
                    else:
                        revised_clauses.append(item['new_text'])
                else:
                    revised_clauses.append(clause)
            else:
                revised_clauses.append(clause)
        
        for item in diff_results:
            if item['type'] == 'added' and item['a_index'] == -1:
                revised_clauses.append(item['new_text'])
        
        return '\n\n'.join(revised_clauses)
