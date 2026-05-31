import re
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from datetime import date, datetime, timedelta

from diary_reader import DiaryEntry
from config import POSITIVE_WORDS, NEGATIVE_WORDS, EMOTION_CATEGORIES


class SearchEngine:
    def __init__(self, entries: List[DiaryEntry]):
        self.entries = entries or []
        self._keyword_pool = self._build_keyword_pool()

    def _build_keyword_pool(self) -> List[str]:
        pool = set()
        for kws in EMOTION_CATEGORIES.values():
            pool.update(kws)
        pool.update(POSITIVE_WORDS)
        pool.update(NEGATIVE_WORDS)
        return sorted(pool, key=len, reverse=True)

    def search(self, query: str, context_chars: int = 50) -> List[Dict]:
        if not query or not query.strip():
            return []
        if not self.entries:
            return []

        results = []
        query_lower = query.strip().lower()
        keywords = self._tokenize_query(query_lower)

        for entry in self.entries:
            try:
                content_lower = entry.content.lower()
                content = entry.content

                all_contexts = []
                total_matches = 0
                matched_keywords = []

                for kw in keywords:
                    if kw in content_lower:
                        matched_keywords.append(kw)
                        positions = [
                            m.start() for m in re.finditer(
                                re.escape(kw), content_lower
                            )
                        ]
                        total_matches += len(positions)

                        for pos in positions:
                            start = max(0, pos - context_chars)
                            end = min(len(content), pos + len(kw) + context_chars)
                            context = content[start:end]
                            if start > 0:
                                context = "..." + context
                            if end < len(content):
                                context = context + "..."
                            all_contexts.append(context)

                if matched_keywords:
                    results.append({
                        "date": entry.date.strftime("%Y-%m-%d"),
                        "filename": entry.filename,
                        "matches": total_matches,
                        "matched_keywords": matched_keywords,
                        "contexts": all_contexts
                    })
            except Exception:
                continue

        return sorted(results, key=lambda x: (len(x["matched_keywords"]), x["matches"]), reverse=True)

    def _tokenize_query(self, query: str) -> List[str]:
        if not query:
            return []

        tokens = []

        for kw in self._keyword_pool:
            if kw in query and kw not in tokens:
                tokens.append(kw)

        punctuation = r'[，,。.！!？?；;、：:"""\'\'（）()【】\[\]《》<>/\\|+\-=*&^%$#@~`\s]'
        parts = re.split(punctuation, query)
        parts = [p.strip() for p in parts if p.strip()]

        for p in parts:
            if p not in tokens and len(p) >= 2:
                tokens.append(p)

        for p in parts:
            for i in range(len(p) - 1):
                bigram = p[i:i + 2]
                if bigram not in tokens and '\u4e00' <= bigram[0] <= '\u9fa5':
                    tokens.append(bigram)

        return tokens

    def search_by_keywords(self, keywords: List[str], match_all: bool = True) -> List[Dict]:
        if not keywords:
            return []

        results = []
        for entry in self.entries:
            try:
                content_lower = entry.content.lower()
                found_keywords = [kw for kw in keywords if kw.lower() in content_lower]

                if match_all and len(found_keywords) == len(keywords):
                    results.append({
                        "date": entry.date.strftime("%Y-%m-%d"),
                        "keywords": found_keywords,
                        "preview": entry.content[:100] + "..." if len(entry.content) > 100 else entry.content
                    })
                elif not match_all and found_keywords:
                    results.append({
                        "date": entry.date.strftime("%Y-%m-%d"),
                        "keywords": found_keywords,
                        "preview": entry.content[:100] + "..." if len(entry.content) > 100 else entry.content
                    })
            except Exception:
                continue

        return results

    def answer_question(self, question: str) -> Dict:
        if not question or not question.strip():
            return {"answer": "请输入有效的问题", "results": []}

        if not self.entries:
            return {"answer": "暂无日记数据", "results": []}

        question = question.strip()

        time_range = self._extract_time_range(question)
        if time_range:
            result = self._answer_time_range_question(question, time_range)
            if "没有日记记录" in result["answer"] and self._is_emotion_question(question):
                emotion_result = self._answer_emotion_question(question)
                emotion_result.setdefault("answer_type", "emotion")
                return emotion_result
            result.setdefault("answer_type", "time_range")
            return result

        if self._is_comparison_question(question):
            result = self._answer_comparison_question(question)
            result.setdefault("answer_type", "comparison")
            return result

        if self._is_combined_keyword_question(question):
            result = self._answer_combined_question(question)
            result.setdefault("answer_type", "combined")
            return result

        if self._has_superlative(question):
            result = self._answer_superlative_question(question)
            result.setdefault("answer_type", "superlative")
            return result

        if "什么时候" in question or "何时" in question or "哪天" in question:
            result = self._answer_when_question(question)
            result.setdefault("answer_type", "when")
            return result

        if "多少次" in question or "几次" in question or "频率" in question:
            result = self._answer_count_question(question)
            result.setdefault("answer_type", "count")
            return result

        if self._is_emotion_question(question):
            result = self._answer_emotion_question(question)
            result.setdefault("answer_type", "emotion")
            return result
        elif "什么" in question or "哪些" in question or "哪" in question:
            result = self._answer_what_question(question)
            result.setdefault("answer_type", "what")
            return result
        else:
            result = self._answer_general_question(question)
            result.setdefault("answer_type", "general")
            return result

    def _extract_time_range(self, question: str) -> Optional[Dict]:
        patterns = [
            (r'(\d{4})年(\d{1,2})月', lambda m: {"year": int(m.group(1)), "month": int(m.group(2))}),
            (r'(\d{4})年', lambda m: {"year": int(m.group(1))}),
            (r'(\d{4})年第([1-4])季度', lambda m: self._resolve_quarter(int(m.group(1)), int(m.group(2)))),
            (r'(\d{1,2})月份?', lambda m: {"month": int(m.group(1))}),
            (r'第([1-4])季度', lambda m: self._resolve_quarter(None, int(m.group(1)))),
            (r'最近(\d+)天', self._resolve_recent_days),
            (r'最近(\d+)周', self._resolve_recent_weeks),
            (r'最近(\d+)个月?', self._resolve_recent_months),
            (r'去年', lambda m: self._resolve_last_year()),
            (r'今年', lambda m: self._resolve_this_year()),
            (r'前年', lambda m: self._resolve_year_before_last()),
            (r'去年(\d{1,2})月', lambda m: self._resolve_last_year_month(int(m.group(1)))),
            (r'今年(\d{1,2})月', lambda m: self._resolve_this_year_month(int(m.group(1)))),
            (r'(\d{1,2})月前', lambda m: self._resolve_months_ago(int(m.group(1)))),
            (r'(\d{1,2})周前', lambda m: self._resolve_weeks_ago(int(m.group(1)))),
            (r'昨天|前日', lambda m: self._resolve_yesterday()),
            (r'前天|大前天', lambda m: self._resolve_day_before_yesterday()),
            (r'上周', lambda m: self._resolve_last_week()),
            (r'本周|这周', lambda m: self._resolve_this_week()),
            (r'上上周|两周前', lambda m: self._resolve_week_before_last()),
            (r'上个月', lambda m: self._resolve_last_month()),
            (r'这个月|本月', lambda m: self._resolve_this_month()),
            (r'上上个月|两个月前', lambda m: self._resolve_month_before_last()),
        ]

        for pattern, resolver in patterns:
            match = re.search(pattern, question)
            if match:
                try:
                    return resolver(match)
                except Exception:
                    continue
        return None

    def _resolve_yesterday(self) -> Dict:
        yesterday = date.today() - timedelta(days=1)
        return {"start_date": yesterday, "end_date": yesterday}

    def _resolve_day_before_yesterday(self) -> Dict:
        dby = date.today() - timedelta(days=2)
        return {"start_date": dby, "end_date": dby}

    def _resolve_recent_days(self, match) -> Dict:
        days = int(match.group(1))
        end = date.today()
        start = end - timedelta(days=days)
        return {"start_date": start, "end_date": end}

    def _resolve_this_year(self) -> Dict:
        return {"year": date.today().year}

    def _resolve_last_year(self) -> Dict:
        return {"year": date.today().year - 1}

    def _resolve_year_before_last(self) -> Dict:
        return {"year": date.today().year - 2}

    def _resolve_this_year_month(self, month: int) -> Dict:
        return {"year": date.today().year, "month": month}

    def _resolve_last_year_month(self, month: int) -> Dict:
        return {"year": date.today().year - 1, "month": month}

    def _resolve_this_month(self) -> Dict:
        today = date.today()
        return {"year": today.year, "month": today.month}

    def _resolve_month_before_last(self) -> Dict:
        today = date.today()
        first_of_this_month = today.replace(day=1)
        last_of_prev = first_of_this_month - timedelta(days=1)
        first_of_prev = last_of_prev.replace(day=1)
        last_of_before = first_of_prev - timedelta(days=1)
        return {"year": last_of_before.year, "month": last_of_before.month}

    def _resolve_recent_weeks(self, match) -> Dict:
        weeks = int(match.group(1))
        end = date.today()
        start = end - timedelta(weeks=weeks)
        return {"start_date": start, "end_date": end}

    def _resolve_recent_months(self, match) -> Dict:
        months = int(match.group(1))
        end = date.today()
        start = end - timedelta(days=months * 30)
        return {"start_date": start, "end_date": end}

    def _resolve_months_ago(self, months: int) -> Dict:
        end = date.today()
        start = end - timedelta(days=months * 30)
        return {"start_date": start, "end_date": start}

    def _resolve_weeks_ago(self, weeks: int) -> Dict:
        end = date.today() - timedelta(weeks=weeks - 1)
        start = end - timedelta(days=6)
        return {"start_date": start, "end_date": end}

    def _resolve_week_before_last(self) -> Dict:
        today = date.today()
        start = today - timedelta(days=today.weekday() + 14)
        end = start + timedelta(days=6)
        return {"start_date": start, "end_date": end}

    def _resolve_quarter(self, year: Optional[int], quarter: int) -> Dict:
        if year is None:
            year = date.today().year
        start_month = (quarter - 1) * 3 + 1
        end_month = start_month + 2
        start_date = date(year, start_month, 1)
        if end_month == 12:
            end_date = date(year, 12, 31)
        else:
            end_date = date(year, end_month + 1, 1) - timedelta(days=1)
        return {"start_date": start_date, "end_date": end_date}

    def _answer_time_range_question(self, question: str, time_range: Dict) -> Dict:
        if "start_date" in time_range and "end_date" in time_range:
            filtered = [
                e for e in self.entries
                if time_range["start_date"] <= e.date <= time_range["end_date"]
            ]
            period_desc = f"{time_range['start_date']} ~ {time_range['end_date']}"
        elif "year" in time_range and "month" in time_range:
            filtered = [
                e for e in self.entries
                if e.date.year == time_range["year"] and e.date.month == time_range["month"]
            ]
            period_desc = f"{time_range['year']}年{time_range['month']}月"
        elif "year" in time_range:
            filtered = [e for e in self.entries if e.date.year == time_range["year"]]
            period_desc = f"{time_range['year']}年"
        elif "month" in time_range:
            current_year = date.today().year
            filtered = [
                e for e in self.entries
                if e.date.month == time_range["month"]
            ]
            period_desc = f"{time_range['month']}月"
        else:
            return {"answer": "无法识别时间范围", "results": []}

        if not filtered:
            if self.entries:
                earliest = min(e.date for e in self.entries)
                latest = max(e.date for e in self.entries)
                return {
                    "answer": (
                        f"{period_desc}没有日记记录。"
                        f"现有日记范围: {earliest} ~ {latest}"
                    ),
                    "results": []
                }
            return {"answer": f"{period_desc}没有日记记录", "results": []}

        kw = self._extract_search_term_from_time_question(question)
        if kw:
            matched = [e for e in filtered if kw in e.content]
            if matched:
                results = self.search(kw)
                results = [r for r in results if any(e.date.strftime("%Y-%m-%d") == r["date"] for e in filtered)]
                answer = f"在{period_desc}，找到 {len(matched)} 天提到了'{kw}'"
                return {"answer": answer, "results": results}

        avg_score = 0.5
        scored = [e for e in filtered if e.sentiment_score is not None]
        if scored:
            avg_score = sum(e.sentiment_score for e in scored) / len(scored)

        positive = sum(1 for e in scored if e.sentiment_score > 0.6) if scored else 0
        negative = sum(1 for e in scored if e.sentiment_score < 0.4) if scored else 0

        if avg_score > 0.6:
            mood_label = "偏积极 😊"
        elif avg_score > 0.4:
            mood_label = "较平稳 🙂"
        else:
            mood_label = "偏消极 😢"

        answer = (
            f"{period_desc}共有 {len(filtered)} 篇日记，"
            f"平均情绪 {avg_score:.2f}（{mood_label}），"
            f"积极{positive}天/消极{negative}天"
        )
        return {"answer": answer, "results": []}

    def _extract_search_term_from_time_question(self, question: str) -> str:
        time_noise = [
            r'\d{4}年\d{1,2}月', r'\d{4}年', r'\d{1,2}月份?',
            r'最近\d+天', r'上周', r'本周', r'这周', r'上个月',
            r'我', r'的', r'了', r'在', r'是', r'有', r'吗', r'呢', r'啊',
            r'什么', r'怎么', r'哪些', r'提到', r'说到', r'写到', r'关于',
            r'心情', r'情绪', r'状态', r'怎么样', r'如何',
        ]
        cleaned = question
        for pattern in time_noise:
            cleaned = re.sub(pattern, '', cleaned)
        cleaned = re.sub(r'[？?！!。，,、：:；;（）()\s]', '', cleaned)

        if not cleaned:
            return ""

        for kw in self._keyword_pool:
            if kw in cleaned:
                return kw

        for i in range(len(cleaned) - 1):
            bg = cleaned[i:i + 2]
            if bg not in self._question_noise():
                for entry in self.entries:
                    if bg in entry.content:
                        return bg

        return ""

    def _is_emotion_question(self, question: str) -> bool:
        emotion_indicators = [
            "开心", "快乐", "幸福", "高兴", "满意", "积极",
            "难过", "伤心", "沮丧", "消极", "焦虑", "压力",
            "情绪", "心情", "状态", "怎么样"
        ]
        return any(w in question for w in emotion_indicators)

    @staticmethod
    def _has_superlative(question: str) -> bool:
        superlative_patterns = [
            "最开心", "最快乐", "最好", "最幸福", "最高兴", "最积极",
            "最难过", "最伤心", "最差", "最沮丧", "最消极", "最低落",
            "最多", "最少", "最常",
        ]
        return any(p in question for p in superlative_patterns)

    def _answer_emotion_question(self, question: str) -> Dict:
        if "什么时候" in question or "哪天" in question or "何时" in question:
            is_positive = any(w in question for w in POSITIVE_WORDS)
            is_negative = any(w in question for w in NEGATIVE_WORDS)

            if is_positive:
                threshold = 0.7
                label = "积极"
            elif is_negative:
                threshold = 0.3
                label = "消极"
            else:
                threshold = 0.7
                label = "积极"

            if is_negative:
                matched = [
                    e for e in self.entries
                    if e.sentiment_score is not None and e.sentiment_score < threshold
                ]
            else:
                matched = [
                    e for e in self.entries
                    if e.sentiment_score is not None and e.sentiment_score > threshold
                ]

            if not matched:
                return {"answer": f"没有找到特别{label}的日记", "results": []}

            dates = [e.date.strftime("%Y-%m-%d") for e in matched[:10]]
            answer = f"您在以下 {len(matched)} 天情绪最{label}:\n" + ", ".join(dates)
            if len(matched) > 10:
                answer += f"... (共{len(matched)}天)"

            return {"answer": answer, "results": []}

        scored = [e for e in self.entries if e.sentiment_score is not None]
        if not scored:
            return {"answer": "暂无情绪分析数据", "results": []}

        avg = sum(e.sentiment_score for e in scored) / len(scored)
        positive = sum(1 for e in scored if e.sentiment_score > 0.6)
        negative = sum(1 for e in scored if e.sentiment_score < 0.4)
        neutral = len(scored) - positive - negative

        if avg > 0.6:
            overall = "整体偏积极 😊"
        elif avg > 0.4:
            overall = "整体较为平稳 🙂"
        else:
            overall = "整体偏消极 😢"

        answer = (
            f"{overall}\n"
            f"平均情绪分数: {avg:.2f}\n"
            f"积极天数: {positive}, 中性天数: {neutral}, 消极天数: {negative}"
        )
        return {"answer": answer, "results": []}

    def _is_comparison_question(self, question: str) -> bool:
        comparison_words = ["对比", "比较", "区别", "哪个", "谁更", "vs"]
        return any(w in question for w in comparison_words)

    def _answer_comparison_question(self, question: str) -> Dict:
        found_categories = []
        for cat in EMOTION_CATEGORIES:
            if cat in question:
                found_categories.append(cat)

        if len(found_categories) >= 2:
            cat_scores = {}
            for cat in found_categories:
                cat_entries = [
                    e for e in self.entries
                    if e.sentiment_score is not None and any(
                        kw in e.content for kw in EMOTION_CATEGORIES[cat]
                    )
                ]
                if cat_entries:
                    avg = sum(e.sentiment_score for e in cat_entries) / len(cat_entries)
                    cat_scores[cat] = {"avg": avg, "count": len(cat_entries)}

            if cat_scores:
                lines = []
                for cat, info in cat_scores.items():
                    lines.append(f"  {cat}: 平均情绪 {info['avg']:.2f} ({info['count']}天)")
                answer = "对比结果:\n" + "\n".join(lines)
                return {"answer": answer, "results": []}

        kw1, kw2 = None, None
        for kw in self._keyword_pool:
            if kw in question:
                if kw1 is None:
                    kw1 = kw
                elif kw2 is None and kw != kw1:
                    kw2 = kw
                    break

        if kw1 and kw2:
            r1 = self.search(kw1)
            r2 = self.search(kw2)
            answer = (
                f"'{kw1}': {len(r1)} 天提及, "
                f"'{kw2}': {len(r2)} 天提及"
            )
            return {"answer": answer, "results": r1 + r2}

        return {"answer": "请提供两个关键词进行对比，如'跑步和工作哪个更多'", "results": []}

    def _is_combined_keyword_question(self, question: str) -> bool:
        return "+" in question or "和" in question or "与" in question or "同时" in question

    def _answer_combined_question(self, question: str) -> Dict:
        keywords = []

        if "+" in question:
            parts = question.split("+")
        else:
            parts = re.split(r'[和与同时]', question)

        for part in parts:
            kw = self._extract_search_term(part.strip())
            if kw:
                keywords.append(kw)

        if len(keywords) < 2:
            return self._answer_general_question(question)

        results = self.search_by_keywords(keywords, match_all=True)
        if not results:
            partial = self.search_by_keywords(keywords, match_all=False)
            partial_info = []
            for r in partial:
                partial_info.append(f"{r['date']}({','.join(r['keywords'])})")
            answer = f"没有同时包含 '{'+'.join(keywords)}' 的日记"
            if partial_info:
                answer += f"\n但有以下日期提到了其中部分关键词: {', '.join(partial_info[:5])}"
            return {"answer": answer, "results": partial[:5]}

        dates = [r["date"] for r in results[:10]]
        answer = (
            f"同时包含 '{'+'.join(keywords)}' 的日记有 {len(results)} 篇:\n"
            + ", ".join(dates)
        )
        return {"answer": answer, "results": results[:5]}

    def _answer_when_question(self, question: str) -> Dict:
        search_query = self._extract_search_term(question)
        if not search_query:
            return {"answer": "请提供更具体的关键词", "results": []}

        results = self.search(search_query)

        if not results:
            return {"answer": f"没有找到关于'{search_query}'的记录", "results": []}

        dates = [r["date"] for r in results]
        answer = (
            f"您在以下 {len(dates)} 个日期提到了'{search_query}':\n"
            + ", ".join(dates[:10])
            + ("..." if len(dates) > 10 else "")
        )
        return {"answer": answer, "results": results}

    def _answer_count_question(self, question: str) -> Dict:
        search_query = self._extract_search_term(question)
        if not search_query:
            return {"answer": "请提供更具体的关键词", "results": []}

        results = self.search(search_query)
        total_matches = sum(r["matches"] for r in results)

        freq = self.get_word_frequency(search_query)
        answer = (
            f"您总共提到 '{search_query}' {total_matches} 次，"
            f"分布在 {len(results)} 天"
        )
        if freq.get("by_month"):
            months = [f"{k}:{v}次" for k, v in list(freq["by_month"].items())[:6]]
            answer += "\n按月分布: " + ", ".join(months)

        return {"answer": answer, "results": results}

    def _answer_superlative_question(self, question: str) -> Dict:
        scored = [e for e in self.entries if e.sentiment_score is not None]
        if not scored:
            return {"answer": "暂无情绪分析数据", "results": []}

        if any(w in question for w in ["最开心", "最快乐", "最好", "最幸福", "最高兴", "最积极"]):
            best = max(scored, key=lambda e: e.sentiment_score)
            answer = (
                f"情绪最好的一天是 {best.date.strftime('%Y-%m-%d')}，"
                f"情绪分数 {best.sentiment_score:.2f}\n"
                f"内容摘要: {best.content[:80]}..."
            )
            return {"answer": answer, "results": []}

        if any(w in question for w in ["最难过", "最伤心", "最差", "最沮丧", "最消极", "最低落"]):
            worst = min(scored, key=lambda e: e.sentiment_score)
            answer = (
                f"情绪最差的一天是 {worst.date.strftime('%Y-%m-%d')}，"
                f"情绪分数 {worst.sentiment_score:.2f}\n"
                f"内容摘要: {worst.content[:80]}..."
            )
            return {"answer": answer, "results": []}

        search_query = self._extract_search_term(question)
        if search_query:
            results = self.search(search_query)
            if results:
                top_date = results[0]["date"]
                answer = f"提到'{search_query}'最多的是 {top_date}，共 {results[0]['matches']} 次"
                return {"answer": answer, "results": results[:3]}

        return {"answer": "请提供更具体的关键词", "results": []}

    def _answer_what_question(self, question: str) -> Dict:
        search_query = self._extract_search_term(question)
        if not search_query:
            return {"answer": "请提供更具体的关键词", "results": []}

        results = self.search(search_query)
        if not results:
            return {"answer": f"没有找到关于'{search_query}'的内容", "results": []}

        answer = f"找到 {len(results)} 条关于'{search_query}'的记录"
        return {"answer": answer, "results": results[:5]}

    def _answer_general_question(self, question: str) -> Dict:
        search_query = self._extract_search_term(question)
        if not search_query:
            search_query = question.strip()

        results = self.search(search_query)
        if not results:
            return {
                "answer": f"没有找到关于'{search_query}'的记录，尝试使用更简单的关键词",
                "results": []
            }

        answer = f"找到 {len(results)} 条相关日记"
        return {"answer": answer, "results": results[:5]}

    def _extract_search_term(self, text: str) -> str:
        if not text:
            return ""

        for kw in self._keyword_pool:
            if kw in text:
                return kw

        bigrams = []
        clean = re.sub(r'[？?！!。，,、：:；;（）()\s\d]', '', text)
        for i in range(len(clean) - 1):
            bg = clean[i:i + 2]
            if bg not in self._question_noise():
                bigrams.append(bg)

        if bigrams:
            for bg in bigrams:
                for entry in self.entries:
                    if bg in entry.content:
                        return bg

        if bigrams:
            return bigrams[0]

        for char in clean:
            if '\u4e00' <= char <= '\u9fa5':
                return char

        return text.strip()[:2] if len(text.strip()) >= 2 else text.strip()

    @staticmethod
    def _question_noise() -> set:
        return {
            "什么", "怎么", "哪些", "为何", "如何", "为什么",
            "时候", "多少", "几次", "何时", "哪天", "哪里",
            "请问", "告诉", "查找", "搜索", "我想", "知道",
            "能不", "可以", "是不", "有没有", "过吗", "了吗",
            "比较", "对比", "区别", "最近", "上周", "本月",
            "今年", "去年", "最开", "最快", "最伤", "最沮"
        }

    def get_word_frequency(self, word: str) -> Dict:
        if not word:
            return {"total": 0, "days_mentioned": 0, "by_month": {}}

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
