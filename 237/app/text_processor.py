import re
import jieba
from app.config import DEFAULT_IGNORE_PATTERNS

class TextProcessor:
    def __init__(self, ignore_patterns=None, use_default_patterns=True):
        if ignore_patterns is not None and len(ignore_patterns) > 0:
            self.ignore_patterns = ignore_patterns
        elif use_default_patterns:
            self.ignore_patterns = DEFAULT_IGNORE_PATTERNS
        else:
            self.ignore_patterns = []
        self._compiled_patterns = [re.compile(p, re.IGNORECASE) for p in self.ignore_patterns]
    
    def clean_text(self, text):
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = text.strip()
        return text
    
    def apply_ignore_patterns(self, text):
        for pattern in self._compiled_patterns:
            text = pattern.sub('[IGNORED]', text)
        return text
    
    def split_clauses(self, text):
        clauses = []
        lines = text.split('\n')
        current_clause = []
        
        clause_start_pattern = re.compile(
            r'^(第[一二三四五六七八九十百千零\d]+[条款项]|[一二三四五六七八九十][、.．]|\d+[、.．]|\(\d+\)|[（(]\d+[）)|\d+\.\d+|\b[a-zA-Z][、.．])'
        )
        
        for line in lines:
            stripped_line = line.strip()
            if not stripped_line:
                if current_clause:
                    clause_text = '\n'.join(current_clause).strip()
                    if clause_text:
                        clauses.append(clause_text)
                    current_clause = []
            elif clause_start_pattern.match(stripped_line) and current_clause:
                clause_text = '\n'.join(current_clause).strip()
                if clause_text:
                    clauses.append(clause_text)
                current_clause = [stripped_line]
            else:
                current_clause.append(stripped_line)
        
        if current_clause:
            clause_text = '\n'.join(current_clause).strip()
            if clause_text:
                clauses.append(clause_text)
        
        if len(clauses) <= 3:
            sentences = re.split(r'[。！？.!?\n]', text)
            clauses = [s.strip() for s in sentences if s.strip()]
        
        return clauses
    
    def tokenize(self, text):
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s]', ' ', text)
        words = jieba.cut(text)
        return [w.strip() for w in words if w.strip()]
    
    def preprocess_for_similarity(self, text):
        text = self.clean_text(text)
        text = self.apply_ignore_patterns(text)
        tokens = self.tokenize(text)
        return ' '.join(tokens)
