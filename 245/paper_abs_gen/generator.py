import json
import re
from dataclasses import dataclass, field, asdict
from typing import Optional

from paper_abs_gen.llm_client import LLMClient


@dataclass
class StructuredAbstract:
    background: str = ""
    methods: str = ""
    results: str = ""
    conclusion: str = ""

    def to_plain(self) -> str:
        parts = []
        if self.background:
            parts.append(f"Background: {self.background}")
        if self.methods:
            parts.append(f"Methods: {self.methods}")
        if self.results:
            parts.append(f"Results: {self.results}")
        if self.conclusion:
            parts.append(f"Conclusion: {self.conclusion}")
        return "\n\n".join(parts)

    def to_flat(self) -> str:
        parts = [p for p in [self.background, self.methods, self.results, self.conclusion] if p]
        return " ".join(parts)


@dataclass
class CitationError:
    reference: str
    error_type: str
    detail: str


@dataclass
class GenerationResult:
    paper_path: str = ""
    paper_title: str = ""
    abstract_en: Optional[StructuredAbstract] = None
    abstract_zh: Optional[StructuredAbstract] = None
    keywords: list[str] = field(default_factory=list)
    confidence: float = 0.0
    methods: list[str] = field(default_factory=list)
    datasets: list[str] = field(default_factory=list)
    citation_errors: list[CitationError] = field(default_factory=list)
    raw_text_length: int = 0

    def to_dict(self) -> dict:
        d = {
            "paper_path": self.paper_path,
            "paper_title": self.paper_title,
            "abstract_en": asdict(self.abstract_en) if self.abstract_en else None,
            "abstract_zh": asdict(self.abstract_zh) if self.abstract_zh else None,
            "keywords": self.keywords,
            "confidence": self.confidence,
            "methods": self.methods,
            "datasets": self.datasets,
            "citation_errors": [
                {"reference": e.reference, "error_type": e.error_type, "detail": e.detail}
                for e in self.citation_errors
            ],
            "raw_text_length": self.raw_text_length,
        }
        return d

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)


ABSTRACT_SYSTEM_PROMPT = """You are an expert academic paper analyst. Your task is to generate a structured abstract from a research paper.

You must produce a JSON object with exactly these fields:
{
  "title": "The paper title",
  "background": "Background and motivation for the research",
  "methods": "Research methodology and approach used",
  "results": "Key findings and results",
  "conclusion": "Conclusions and implications",
  "keywords": ["keyword1", "keyword2", ...],
  "confidence": 0.85
}

Requirements:
- "keywords": 3 to 6 keywords that best represent the paper
- "confidence": a float between 0.0 and 1.0 indicating how confident you are about the abstract quality
- Each section should be 2-4 sentences, concise and informative
- Write in academic English style
- Focus on factual content from the paper, do not add information not present"""

ABSTRACT_SYSTEM_PROMPT_ZH = """You are an expert academic paper analyst. Your task is to translate and generate a Chinese structured abstract from a research paper.

You must produce a JSON object with exactly these fields:
{
  "background": "研究背景与动机",
  "methods": "研究方法与途径",
  "results": "主要发现与结果",
  "conclusion": "结论与启示"
}

Requirements:
- Each section should be 2-4 sentences in Chinese
- Maintain academic Chinese style
- Accurately translate technical terms
- Do not add information not present in the paper"""

METADATA_SYSTEM_PROMPT = """You are an expert academic paper analyst. Extract research methods and datasets from the paper.

Produce a JSON object:
{
  "methods": ["method1", "method2", ...],
  "datasets": ["dataset1", "dataset2", ...]
}

Requirements:
- List specific research methods (e.g., "BERT", "Random Forest", "Case Study", "Survey")
- List specific datasets mentioned (e.g., "ImageNet", "COCO", "custom dataset of 500 patients")
- Use precise names as they appear in the paper
- If no datasets are mentioned, return an empty list"""


def generate_abstract(client: LLMClient, text: str, max_chars: int = 15000) -> GenerationResult:
    truncated = text[:max_chars]
    if len(text) > max_chars:
        truncated += "\n\n[... text truncated ...]"

    user_prompt = f"Analyze the following paper and generate a structured abstract with keywords:\n\n{truncated}"
    result_data = client.chat_json(ABSTRACT_SYSTEM_PROMPT, user_prompt)

    abstract_en = StructuredAbstract(
        background=result_data.get("background", ""),
        methods=result_data.get("methods", ""),
        results=result_data.get("results", ""),
        conclusion=result_data.get("conclusion", ""),
    )

    return GenerationResult(
        paper_title=result_data.get("title", ""),
        abstract_en=abstract_en,
        keywords=result_data.get("keywords", []),
        confidence=min(1.0, max(0.0, result_data.get("confidence", 0.0))),
        raw_text_length=len(text),
    )


def generate_chinese_abstract(client: LLMClient, text: str, result: GenerationResult, max_chars: int = 15000) -> None:
    truncated = text[:max_chars]
    if len(text) > max_chars:
        truncated += "\n\n[... text truncated ...]"

    english_abstract = result.abstract_en.to_flat() if result.abstract_en else ""
    user_prompt = (
        f"Generate a Chinese abstract for this paper.\n\n"
        f"Paper text:\n{truncated}\n\n"
        f"English abstract for reference:\n{english_abstract}"
    )

    zh_data = client.chat_json(ABSTRACT_SYSTEM_PROMPT_ZH, user_prompt)
    result.abstract_zh = StructuredAbstract(
        background=zh_data.get("background", ""),
        methods=zh_data.get("methods", ""),
        results=zh_data.get("results", ""),
        conclusion=zh_data.get("conclusion", ""),
    )


def extract_metadata(client: LLMClient, text: str, result: GenerationResult, max_chars: int = 15000) -> None:
    truncated = text[:max_chars]
    if len(text) > max_chars:
        truncated += "\n\n[... text truncated ...]"

    user_prompt = f"Extract research methods and datasets from this paper:\n\n{truncated}"
    meta_data = client.chat_json(METADATA_SYSTEM_PROMPT, user_prompt)
    result.methods = meta_data.get("methods", [])
    result.datasets = meta_data.get("datasets", [])


def check_citations(client: LLMClient, text: str, result: GenerationResult) -> None:
    ref_section = _extract_references(text)
    if not ref_section:
        return

    errors = _check_citations_rule_based(ref_section)
    if ref_section:
        errors.extend(_check_citations_llm(client, ref_section))
    result.citation_errors = errors


def _extract_references(text: str) -> str:
    section_markers = [
        r"(?im)^\s*references?\s*$",
        r"(?im)^\s*bibliography\s*$",
        r"(?im)^\s*works\s+cited\s*$",
        r"(?im)^\s*[\[\(]?(?:references?|bibliography)[\]\)]?\s*$",
        r"(?im)^\s*\d+\.?\s*references?\s*$",
        r"文献",
        r"参考文献",
    ]

    ref_start = -1
    ref_end = None
    for pattern in section_markers:
        match = re.search(pattern, text)
        if match:
            ref_start = match.end()
            break

    if ref_start == -1:
        return ""

    ref_section = text[ref_start:]
    appendix_match = re.search(r"(?im)^\s*appendix\s", ref_section)
    if appendix_match:
        ref_section = ref_section[:appendix_match.start()]
    return ref_section.strip()


def _split_references(ref_text: str) -> list[str]:
    refs = []
    lines = ref_text.split("\n")
    current_ref = []

    ref_start_pattern = re.compile(
        r"^(?:\[\d+\]|\d+\.\s*|\[\w+\]|\(\d+\)|\d+\)\s*)", re.IGNORECASE
    )

    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            continue
        if ref_start_pattern.match(line_stripped):
            if current_ref:
                refs.append(" ".join(current_ref))
            current_ref = [line_stripped]
        else:
            if current_ref:
                current_ref.append(line_stripped)
            else:
                current_ref = [line_stripped]

    if current_ref:
        refs.append(" ".join(current_ref))

    return refs


def _is_scholarly_reference(ref: str) -> bool:
    scholarly_indicators = [
        r"vol\.?\s*\d+",
        r"pp\.?\s*\d+",
        r"pages?\s*\d+",
        r"volume\s+\d+",
        r"issue\s+\d+",
        r"no\.?\s*\d+",
        r"journal",
        r"conference",
        r"proceedings",
        r"proc\.?",
        r"transactions",
        r"trans\.?",
        r"springer",
        r"elsevier",
        r"ieee",
        r"acm",
        r"\bin\s+(?:iclr|icml|neurips|nips|cvpr|iccv|acl|emnlp|kdd|aaai|ijcai|siggraph|pnas)\b",
    ]
    for pattern in scholarly_indicators:
        if re.search(pattern, ref, re.IGNORECASE):
            return True
    return False


def _check_citations_rule_based(ref_text: str) -> list[CitationError]:
    errors = []
    refs = _split_references(ref_text)

    for ref in refs:
        ref_stripped = ref.strip()
        if not ref_stripped or len(ref_stripped) < 15:
            continue

        ref_short = ref_stripped[:120]

        has_year = bool(re.search(r"\b(19|20)\d{2}\b", ref_stripped))
        has_doi = bool(re.search(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", ref_stripped, re.IGNORECASE))
        has_arxiv = bool(re.search(r"arxiv:\d+\.\d+", ref_stripped, re.IGNORECASE))
        is_scholarly = _is_scholarly_reference(ref_stripped)

        if is_scholarly and not has_doi and not has_arxiv:
            errors.append(CitationError(
                reference=ref_short,
                error_type="missing_doi",
                detail="Scholarly reference appears to be missing a DOI (required for journal/conference publications)"
            ))

        if not has_year:
            errors.append(CitationError(
                reference=ref_short,
                error_type="missing_year",
                detail="Reference does not contain a publication year"
            ))

        if not re.search(r"[A-Z][a-z]+[,;.]", ref_stripped) and not re.search(r"[A-Z]\.[A-Z]", ref_stripped):
            if len(ref_stripped) > 50 and is_scholarly:
                errors.append(CitationError(
                    reference=ref_short,
                    error_type="incomplete_authors",
                    detail="Reference may be missing or have incomplete author information"
                ))

        if re.search(r"\b(202[4-9]|20[3-9]\d)\b", ref_stripped):
            year_match = re.search(r"\b((?:202[4-9]|20[3-9]\d))\b", ref_stripped)
            year = year_match.group(1)
            if year and int(year) > 2026:
                errors.append(CitationError(
                    reference=ref_short,
                    error_type="future_year",
                    detail=f"Reference contains a future publication year: {year}"
                ))

    return errors


def _check_citations_llm(client: LLMClient, ref_text: str) -> list[CitationError]:
    system = """You are a citation format checker. Analyze the references section and identify format errors.
Return a JSON array of errors: [{"reference": "short excerpt", "error_type": "error type", "detail": "description"}]
If no errors found, return [].
Check for: missing DOI, incomplete author lists, missing page numbers, inconsistent formatting, missing publication year."""

    truncated = ref_text[:8000]
    user = f"Check these references for format errors:\n\n{truncated}"
    try:
        data = client.chat_json(system, user)
        if isinstance(data, list):
            return [CitationError(**e) for e in data]
        elif isinstance(data, dict) and "errors" in data:
            return [CitationError(**e) for e in data["errors"]]
    except Exception:
        pass
    return []
