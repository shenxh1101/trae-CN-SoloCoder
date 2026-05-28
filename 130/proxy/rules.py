import json
import os
import re
from threading import Lock
from config import Config

class RuleManager:
    def __init__(self):
        self.rules_file = Config.RULES_FILE
        self.lock = Lock()
        self.rules = []
        self.load_rules()
    
    def load_rules(self):
        with self.lock:
            if os.path.exists(self.rules_file):
                try:
                    with open(self.rules_file, 'r', encoding='utf-8') as f:
                        self.rules = json.load(f)
                except:
                    self.rules = []
            else:
                self.rules = self._get_default_rules()
                self._save_rules()
    
    def _save_rules(self):
        with open(self.rules_file, 'w', encoding='utf-8') as f:
            json.dump(self.rules, f, indent=2, ensure_ascii=False)
    
    def _get_default_rules(self):
        return []
    
    def get_all_rules(self):
        with self.lock:
            return list(self.rules)
    
    def add_rule(self, rule):
        with self.lock:
            rule['id'] = str(len(self.rules) + 1)
            rule['lb_index'] = 0
            self.rules.append(rule)
            self._save_rules()
            return rule
    
    def update_rule(self, rule_id, rule_data):
        with self.lock:
            for i, rule in enumerate(self.rules):
                if rule['id'] == rule_id:
                    rule_data['id'] = rule_id
                    rule_data['lb_index'] = rule.get('lb_index', 0)
                    self.rules[i] = rule_data
                    self._save_rules()
                    return self.rules[i]
        return None
    
    def delete_rule(self, rule_id):
        with self.lock:
            self.rules = [r for r in self.rules if r['id'] != rule_id]
            self._save_rules()
            return True
    
    def match_rule(self, path):
        with self.lock:
            for rule in self.rules:
                if not rule.get('enabled', True):
                    continue
                
                source_path = rule['source_path']
                if ':' in source_path:
                    pattern = self._path_to_regex(source_path)
                    match = re.match(pattern, path)
                    if match:
                        return rule, match.groupdict(), ''
                else:
                    if path == source_path:
                        return rule, {}, ''
                    elif path.startswith(source_path + '/'):
                        extra_path = path[len(source_path):]
                        return rule, {}, extra_path
        return None, {}, ''
    
    def _path_to_regex(self, path):
        parts = path.split('/')
        pattern_parts = []
        for part in parts:
            if part.startswith(':'):
                param_name = part[1:]
                pattern_parts.append(f'(?P<{param_name}>[^/]+)')
            else:
                pattern_parts.append(re.escape(part))
        return '^' + '/'.join(pattern_parts) + '$'
    
    def build_target_url(self, rule, path_params, extra_path=''):
        targets = rule.get('target_urls')
        if not targets:
            targets = [rule.get('target_url')]
        targets = [t for t in targets if t]
        
        if not targets:
            return None
        
        lb_index = rule.get('lb_index', 0)
        target_url = targets[lb_index % len(targets)]
        
        rule['lb_index'] = (lb_index + 1) % len(targets)
        
        for key, value in path_params.items():
            target_url = target_url.replace(f':{key}', value)
        
        if extra_path:
            if target_url.endswith('/'):
                target_url = target_url[:-1]
            target_url = target_url + extra_path
        
        return target_url
    
    def export_rules(self):
        with self.lock:
            return json.dumps(self.rules, indent=2, ensure_ascii=False)
    
    def import_rules(self, rules_json):
        with self.lock:
            try:
                new_rules = json.loads(rules_json)
                for rule in new_rules:
                    rule['lb_index'] = 0
                self.rules = new_rules
                self._save_rules()
                return True
            except:
                return False

rule_manager = RuleManager()
