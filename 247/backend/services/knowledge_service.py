from typing import List, Optional, Dict, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from config import Config
from data.knowledge_repository import KnowledgeRepository

class KnowledgeService:
    def __init__(self):
        self.repository = KnowledgeRepository()
        self.vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4))
        self._rebuild_index()

    def _rebuild_index(self):
        entries = self.repository.get_all_entries()
        if not entries:
            self.corpus = []
            self.entry_ids = []
            self.weights = []
            self.entries_map = {}
            return

        self.corpus = []
        self.entry_ids = []
        self.weights = []
        self.entries_map = {}

        for entry in entries:
            text_parts = [
                entry["question"],
                " ".join(entry.get("keywords", [])),
                " ".join(entry.get("answer_points", [])[:2]),
                entry.get("category", "")
            ]
            text = " ".join(text_parts)
            self.corpus.append(text)
            self.entry_ids.append(entry["id"])
            self.weights.append(entry["weight"])
            self.entries_map[entry["id"]] = entry

        if self.corpus:
            self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus)

    def match_knowledge(self, question: str) -> Tuple[Optional[Dict], float]:
        entries = self.repository.get_all_entries()
        if not entries:
            return None, 0.0

        self._rebuild_index()

        if not self.corpus:
            return None, 0.0

        question_vec = self.vectorizer.transform([question])
        similarities = cosine_similarity(question_vec, self.tfidf_matrix)[0]

        weighted_similarities = similarities * np.array(self.weights)
        best_idx = np.argmax(weighted_similarities)
        best_score = weighted_similarities[best_idx]

        threshold = Config.MATCH_THRESHOLD

        if best_score >= threshold:
            matched_entry = self.entries_map.get(self.entry_ids[best_idx])
            if not matched_entry:
                matched_entry = self.repository.get_entry_by_id(self.entry_ids[best_idx])
            return matched_entry, float(best_score)

        return None, float(best_score)

    def get_entry(self, entry_id: str) -> Optional[Dict]:
        return self.repository.get_entry_by_id(entry_id)

    def add_entry(self, entry_data: Dict) -> Dict:
        new_entry = self.repository.add_entry(entry_data)
        self._rebuild_index()
        return new_entry

    def update_entry(self, entry_id: str, update_data: Dict) -> Optional[Dict]:
        updated = self.repository.update_entry(entry_id, update_data)
        if updated:
            self._rebuild_index()
        return updated

    def delete_entry(self, entry_id: str) -> bool:
        deleted = self.repository.delete_entry(entry_id)
        if deleted:
            self._rebuild_index()
        return deleted

    def get_all_entries(self) -> List[Dict]:
        return self.repository.get_all_entries()

    def search_entries(self, keyword: str) -> List[Dict]:
        return self.repository.search_entries(keyword)
