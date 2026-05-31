import csv
import json
from pathlib import Path
from typing import List, Dict, Any
from manual_generator import ManualGenerator, ProductManual


class BatchProcessor:
    def __init__(self):
        self.generator = ManualGenerator()
    
    def load_from_csv(self, csv_path: str) -> List[Dict[str, Any]]:
        products = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                features = [f.strip() for f in row.get('features', '').split(';') if f.strip()]
                product = {
                    "product_name": row.get('product_name', ''),
                    "features": features,
                    "positioning": row.get('positioning', ''),
                    "style": row.get('style', 'professional'),
                    "language": row.get('language', 'zh'),
                    "output_format": row.get('output_format', 'markdown')
                }
                if product["product_name"] and product["features"]:
                    products.append(product)
        return products
    
    def process_csv(self, csv_path: str, output_dir: str = None) -> List[str]:
        from config import Config
        
        if output_dir is None:
            output_dir = Config.OUTPUT_DIR
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        products = self.load_from_csv(csv_path)
        generated_files = []
        
        for i, product in enumerate(products, 1):
            print(f"\n[{i}/{len(products)}] 正在处理: {product['product_name']}")
            try:
                manual = self.generator.generate(
                    product_name=product["product_name"],
                    features=product["features"],
                    positioning=product["positioning"],
                    style=product["style"],
                    language=product["language"]
                )
                
                safe_name = product["product_name"].replace(' ', '_').replace('/', '_')
                output_path = output_dir / f"{safe_name}.{self._get_extension(product['output_format'])}"
                
                file_path = self.generator.save_manual(manual, str(output_path), product["output_format"])
                generated_files.append(file_path)
                
                self._save_manual_json(manual, output_dir / f"{safe_name}_data.json")
                
                print(f"  ✓ 已保存: {file_path}")
            except Exception as e:
                print(f"  ✗ 处理失败: {str(e)}")
        
        return generated_files
    
    def _get_extension(self, output_format: str) -> str:
        extensions = {
            "markdown": "md",
            "html": "html",
            "text": "txt"
        }
        return extensions.get(output_format, "md")
    
    def _save_manual_json(self, manual: ProductManual, output_path: Path):
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(manual.to_dict(), f, ensure_ascii=False, indent=2)
