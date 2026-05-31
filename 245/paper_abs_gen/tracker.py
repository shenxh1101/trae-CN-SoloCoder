import json
import time
from pathlib import Path
from typing import Optional

from paper_abs_gen.generator import GenerationResult, StructuredAbstract


TRACKER_DIR = "pag_finetune_data"


class ModificationTracker:
    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = Path(output_dir) if output_dir else Path(TRACKER_DIR)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.records: list[dict] = []

    def record_modification(
        self,
        result: GenerationResult,
        modified_abstract: Optional[StructuredAbstract] = None,
        modified_keywords: Optional[list[str]] = None,
    ) -> dict:
        record = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "paper_path": result.paper_path,
            "paper_title": result.paper_title,
            "original_abstract": {
                "background": result.abstract_en.background if result.abstract_en else "",
                "methods": result.abstract_en.methods if result.abstract_en else "",
                "results": result.abstract_en.results if result.abstract_en else "",
                "conclusion": result.abstract_en.conclusion if result.abstract_en else "",
            } if result.abstract_en else None,
            "original_keywords": result.keywords,
            "modified_abstract": {
                "background": modified_abstract.background,
                "methods": modified_abstract.methods,
                "results": modified_abstract.results,
                "conclusion": modified_abstract.conclusion,
            } if modified_abstract else None,
            "modified_keywords": modified_keywords,
            "original_confidence": result.confidence,
        }
        self.records.append(record)
        return record

    def save(self, filename: Optional[str] = None) -> str:
        if not filename:
            filename = f"finetune_data_{time.strftime('%Y%m%d_%H%M%S')}.jsonl"
        filepath = self.output_dir / filename
        with open(filepath, "w", encoding="utf-8") as f:
            for record in self.records:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        return str(filepath)

    def load(self, filepath: str) -> None:
        path = Path(filepath)
        if not path.exists():
            return
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    self.records.append(json.loads(line))

    def generate_finetune_dataset(self, output_path: Optional[str] = None) -> str:
        if not output_path:
            output_path = str(self.output_dir / f"finetune_{time.strftime('%Y%m%d_%H%M%S')}.jsonl")
        with open(output_path, "w", encoding="utf-8") as f:
            for record in self.records:
                if record.get("modified_abstract") is None:
                    continue
                orig = record["original_abstract"]
                mod = record["modified_abstract"]
                training_example = {
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert academic paper abstract generator. Generate a structured abstract with Background, Methods, Results, and Conclusion sections."
                        },
                        {
                            "role": "user",
                            "content": f"Generate a structured abstract for this paper titled: {record['paper_title']}"
                        },
                        {
                            "role": "assistant",
                            "content": (
                                f"Background: {mod['background']}\n\n"
                                f"Methods: {mod['methods']}\n\n"
                                f"Results: {mod['results']}\n\n"
                                f"Conclusion: {mod['conclusion']}"
                            )
                        }
                    ]
                }
                if record.get("modified_keywords"):
                    training_example["messages"][2]["content"] += (
                        f"\n\nKeywords: {', '.join(record['modified_keywords'])}"
                    )
                f.write(json.dumps(training_example, ensure_ascii=False) + "\n")
        return output_path
