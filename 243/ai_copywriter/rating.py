import os
import json
from datetime import datetime

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates")
TEMPLATE_DB = os.path.join(TEMPLATE_DIR, "template_library.json")
MIN_RATING_FOR_TEMPLATE = 4


class RatingSystem:
    def __init__(self):
        os.makedirs(TEMPLATE_DIR, exist_ok=True)
        if not os.path.exists(TEMPLATE_DB):
            with open(TEMPLATE_DB, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)

    def rate_copy(self, copy_result: dict, rating: int) -> dict:
        if not 1 <= rating <= 5:
            raise ValueError("评分必须在1-5之间")

        rated = copy_result.copy()
        rated["rating"] = rating
        rated["rated_at"] = datetime.now().isoformat()

        if rating >= MIN_RATING_FOR_TEMPLATE:
            self._save_to_template_library(rated)

        return rated

    def _save_to_template_library(self, rated_copy: dict):
        with open(TEMPLATE_DB, "r", encoding="utf-8") as f:
            library = json.load(f)

        template_entry = {
            "id": len(library) + 1,
            "product": rated_copy["product"],
            "selling_points": rated_copy["selling_points"],
            "platform": rated_copy["platform"],
            "tone": rated_copy["tone"],
            "copy": rated_copy["copy"],
            "rating": rated_copy["rating"],
            "rated_at": rated_copy["rated_at"],
            "source": rated_copy.get("source", "unknown"),
        }
        library.append(template_entry)

        with open(TEMPLATE_DB, "w", encoding="utf-8") as f:
            json.dump(library, f, ensure_ascii=False, indent=2)

    def list_templates(
        self,
        platform: str = None,
        tone: str = None,
        min_rating: int = None,
    ) -> list[dict]:
        with open(TEMPLATE_DB, "r", encoding="utf-8") as f:
            library = json.load(f)

        results = library
        if platform:
            results = [t for t in results if t["platform"] == platform]
        if tone:
            results = [t for t in results if t["tone"] == tone]
        if min_rating:
            results = [t for t in results if t["rating"] >= min_rating]

        results.sort(key=lambda x: x["rating"], reverse=True)
        return results

    def get_template_count(self) -> int:
        with open(TEMPLATE_DB, "r", encoding="utf-8") as f:
            library = json.load(f)
        return len(library)
