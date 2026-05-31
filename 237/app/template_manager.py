import os
import json
from datetime import datetime
from app.file_parser import parse_file

class TemplateManager:
    def __init__(self, template_folder):
        self.template_folder = template_folder
        self.metadata_file = os.path.join(template_folder, 'templates.json')
        os.makedirs(self.template_folder, exist_ok=True)
        self._load_metadata()
    
    def _load_metadata(self):
        if os.path.exists(self.metadata_file):
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                self.templates = json.load(f)
        else:
            self.templates = {}
    
    def _save_metadata(self):
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.templates, f, ensure_ascii=False, indent=2)
    
    def save_template(self, file_storage, template_name, description=''):
        if not file_storage or not file_storage.filename:
            raise ValueError("No file provided")
        
        ext = file_storage.filename.rsplit('.', 1)[1].lower()
        template_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"template_{template_id}.{ext}"
        filepath = os.path.join(self.template_folder, filename)
        
        file_storage.save(filepath)
        
        text_content = parse_file(filepath)
        
        self.templates[template_id] = {
            'id': template_id,
            'name': template_name,
            'description': description,
            'filename': filename,
            'original_filename': file_storage.filename,
            'created_at': datetime.now().isoformat(),
            'content_preview': text_content[:500] + '...' if len(text_content) > 500 else text_content
        }
        
        self._save_metadata()
        return self.templates[template_id]
    
    def get_template(self, template_id):
        return self.templates.get(template_id)
    
    def get_template_content(self, template_id):
        template = self.get_template(template_id)
        if not template:
            return None
        
        filepath = os.path.join(self.template_folder, template['filename'])
        return parse_file(filepath)
    
    def list_templates(self):
        return list(self.templates.values())
    
    def delete_template(self, template_id):
        template = self.get_template(template_id)
        if not template:
            return False
        
        filepath = os.path.join(self.template_folder, template['filename'])
        if os.path.exists(filepath):
            os.remove(filepath)
        
        del self.templates[template_id]
        self._save_metadata()
        return True
    
    def update_template(self, template_id, name=None, description=None):
        if template_id not in self.templates:
            return None
        
        if name:
            self.templates[template_id]['name'] = name
        if description:
            self.templates[template_id]['description'] = description
        
        self.templates[template_id]['updated_at'] = datetime.now().isoformat()
        self._save_metadata()
        return self.templates[template_id]
