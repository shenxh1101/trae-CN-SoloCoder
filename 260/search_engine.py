import re
from typing import List, Dict, Tuple
from collections import defaultdict

from diary_reader import DiaryEntry


class SearchEngine:
    def __init__(self, entries: List[DiaryEntry]):
        self.entries = entries
        self.index = self._build_index()

    def _build_index(self) -> Dict[str, List[Tuple[int, int]]]:
        index = defaultdict(list)

        for entry_idx, entry in enumerate(self.entries):
            content = entry.content.lower()

            for match in re.finditer(r'\b\w+\b', content):
                word = match.group()
                index[word].append((entry_idx, match.start()))

        return index

    def search(self, query: str, context_chars: int = 50) -> List[Dict]:
        results = []
        query_lower = query.lower()

        for entry_idx, entry in enumerate(self.entries):
            content_lower = entry.content.lower()
            content = entry.content

            if query_lower in content_lower:
                positions = [
                    m.start() for m in re.finditer(
                        re.escape(query_lower), content_lower
                    )
                ]

                contexts = []
                for pos in positions:
                    start = max(0, pos - context_chars)
                    end = min(len(content), pos + len(query) + context_chars)
                    context = content[start:end]

                    if start > 0:
                        context = "..." + context
                    if end < len(content):
                        context = context + "..."

                    contexts.append(context)

                results.append({
                    "date": entry.date.strftime("%Y-%m-%d"),
                    "filename": entry.filename,
                    "matches": len(positions),
                    "contexts": contexts
                })

        return sorted(results, key=lambda x: x["matches"], reverse=True)

    def search_by_keywords(self, keywords: List[str], match_all: bool = True) -> List[Dict]:
        results = []

        for entry in self.entries:
            content_lower = entry.content.lower()
            found_keywords = []

            for kw in keywords:
                if kw.lower() in content_lower:
                    found_keywords.append(kw)

            if match_all and len(found_keywords) == len(keywords):
                results.append({
                    "date": entry.date.strftime("%Y-%m-%d"),
                    "keywords": found_keywords,
                    "preview": entry.content[:100] + "..."
                })
            elif not match_all and found_keywords:
                results.append({
                    "date": entry.date.strftime("%Y-%m-%d"),
                    "keywords": found_keywords,
                    "preview": entry.content[:100] + "..."
                })

        return results

    def answer_question(self, question: str) -> Dict:
        question_lower = question.lower()

        if "什么时候" in question_lower or "何时" in question_lower:
            return self._answer_when_question(question)
        elif "多少次" in question_lower or "几次" in question_lower:
            return self._answer_count_question(question)
        elif "什么" in question_lower or "哪" in question_lower:
            return self._answer_what_question(question)
        else:
            return self._answer_general_question(question)

    def _answer_when_question(self, question: str) -> Dict:
        keywords = self._extract_keywords_from_question(question)

        if not keywords:
            return {"answer": "请提供更具体的关键词", "results": []}

        results = self.search(" ".join(keywords))

        if not results:
            return {
                "answer": f"没有找到关于 '{', '.join(keywords)}' 的记录",
                "results": []
            }

        dates = [r["date"] for r in results]
        answer = (
            f"您在以下 {len(dates)} 个日期提到了 '{', '.join(keywords)}':\n"
            + ", ".join(dates[:10])
            + ("..." if len(dates) > 10 else "")
        )

        return {"answer": answer, "results": results}

    def _answer_count_question(self, question: str) -> Dict:
        keywords = self._extract_keywords_from_question(question)

        if not keywords:
            return {"answer": "请提供更具体的关键词", "results": []}

        results = self.search(" ".join(keywords))
        total_matches = sum(r["matches"] for r in results)

        answer = f"您总共提到 '{', '.join(keywords)}' {total_matches} 次，分布在 {len(results)} 天"

        return {"answer": answer, "results": results}

    def _answer_what_question(self, question: str) -> Dict:
        keywords = self._extract_keywords_from_question(question)
        results = self.search(" ".join(keywords)) if keywords else []

        if not results:
            return {
                "answer": "没有找到相关内容，尝试使用其他关键词",
                "results": []
            }

        answer = f"找到 {len(results)} 条相关记录："
        return {"answer": answer, "results": results[:5]}

    def _answer_general_question(self, question: str) -> Dict:
        keywords = self._extract_keywords_from_question(question)
        results = self.search(" ".join(keywords)) if keywords else []

        if not results:
            return {
                "answer": "没有找到相关记录，您可以尝试使用更简单的关键词搜索",
                "results": []
            }

        answer = f"找到 {len(results)} 条相关日记："
        return {"answer": answer, "results": results[:5]}

    def _extract_keywords_from_question(self, question: str) -> List[str]:
        stop_words = {"什么", "什么时候", "哪", "哪些", "我", "你", "的", "了", "吗", "呢", "啊",
                      "提到", "说", "写", "有", "是", "在", "关于", "多少次", "几次", "何时",
                      "请问", "能不能", "可以", "告诉我", "查找", "搜索"}

        words = re.findall(r'[\u4e00-\u9fa5a-zA-Z]+', question)
        keywords = [w for w in words if w not in stop_words and len(w) > 1]

        return keywords

    def get_word_frequency(self, word: str) -> Dict:
        word_lower = word.lower()
        results = self.search(word)

        frequency_by_month = defaultdict(int)
        for result in results:
            year_month = result["date"][:7]
            frequency_by_month[year_month] += result["matches"]

        return {
            "total": sum(r["matches"] for r in results),
            "days_mentioned": len(results),
            "by_month": dict(sorted(frequency_by_month.items()))
        }
