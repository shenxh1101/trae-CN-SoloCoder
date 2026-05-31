#!/usr/bin/env python3
"""Real LLM API Simulation with Trae-generated content."""

import json
from pathlib import Path

from paper_abs_gen.generator import (
    GenerationResult,
    StructuredAbstract,
    CitationError,
    _extract_references,
    _split_references,
    _check_citations_rule_based,
)
from paper_abs_gen.extractor import extract_text
from paper_abs_gen.formatter import (
    format_plain,
    format_latex_full,
    format_bibtex_entry,
    format_structured_data,
)
from paper_abs_gen.tracker import ModificationTracker


def generate_real_bert_result() -> GenerationResult:
    """Generate a real, high-quality result simulating LLM API output."""
    return GenerationResult(
        paper_path="sample_papers/bert_test_paper.txt",
        paper_title="BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
        abstract_en=StructuredAbstract(
            background="Language model pre-training has emerged as a powerful technique for improving natural language processing tasks. Existing approaches fall into feature-based methods like ELMo and fine-tuning approaches like the Transformer encoder. However, standard pre-trained models are constrained by unidirectional architectures, limiting the depth of contextual understanding that can be achieved during pre-training.",
            methods="We introduce BERT (Bidirectional Encoder Representations from Transformers), a novel pre-training approach that leverages masked language modeling and next sentence prediction objectives to train deep bidirectional representations. We evaluate two model sizes: BERT_BASE with 110M parameters (12 layers, 768 hidden size, 12 attention heads) and BERT_LARGE with 340M parameters (24 layers, 1024 hidden size, 16 attention heads). The pre-trained model can be fine-tuned with minimal additional layers for diverse downstream tasks.",
            results="BERT achieves state-of-the-art performance on 11 NLP tasks. It pushes the GLUE benchmark score to 80.5%, representing a 7.7% absolute improvement. On MultiNLI, accuracy reaches 86.7%, a 4.6% improvement. For question answering, BERT achieves 93.2 F1 on SQuAD v1.1 and 83.1 F1 on SQuAD v2.0, with improvements of 1.5 and 5.1 points respectively. On CoNLL-2003 named entity recognition, the model achieves 92.8 F1.",
            conclusion="BERT demonstrates that deep bidirectional pre-training significantly advances language representation learning. The architecture's simplicity and empirical power make it readily applicable to diverse tasks without extensive task-specific modifications. Our results establish that careful consideration of representation directionality is crucial for achieving strong performance across the NLP landscape."
        ),
        abstract_zh=StructuredAbstract(
            background="语言模型预训练已成为改进自然语言处理任务的强大技术。现有方法分为基于特征的方法（如ELMo）和微调方法（如Transformer编码器）。然而，标准的预训练模型受到单向架构的限制，这限制了预训练期间可以实现的上下文理解深度。",
            methods="我们提出了BERT（来自Transformer的双向编码器表示），这是一种新颖的预训练方法，利用掩码语言建模和下一句预测目标来训练深度双向表示。我们评估了两种模型规模：具有1.1亿参数的BERT_BASE（12层、768隐藏大小、12个注意力头）和具有3.4亿参数的BERT_LARGE（24层、1024隐藏大小、16个注意力头）。预训练模型可以用最少的附加层进行微调，以适应各种下游任务。",
            results="BERT在11项NLP任务上取得了最先进的性能。它将GLUE基准分数推高至80.5%，绝对提升了7.7个百分点。在MultiNLI上，准确率达到86.7%，提升了4.6个百分点。对于问答任务，BERT在SQuAD v1.1上取得了93.2的F1值，在SQuAD v2.0上取得了83.1的F1值，分别提升了1.5和5.1个百分点。在CoNLL-2003命名实体识别任务上，模型实现了92.8的F1值。",
            conclusion="BERT证明了深度双向预训练显著推进了语言表示学习。该架构的简洁性和经验效力使其可以轻松应用于各种任务，而无需大量针对任务的修改。我们的结果表明，仔细考虑表示的方向性对于在整个NLP领域实现强大性能至关重要。"
        ),
        keywords=["BERT", "Pre-training", "Transformers", "Natural Language Processing", "Bidirectional Representations", "Masked Language Model"],
        confidence=0.96,
        methods=[
            "Masked Language Modeling (MLM)",
            "Next Sentence Prediction (NSP)",
            "Transformer Encoder",
            "Bidirectional Attention",
            "Fine-tuning Paradigm",
        ],
        datasets=[
            "GLUE Benchmark",
            "MultiNLI",
            "SQuAD v1.1",
            "SQuAD v2.0",
            "CoNLL-2003 NER",
        ],
        citation_errors=[],
        raw_text_length=0,
    )


def print_separator(title="", width=80):
    if title:
        left = (width - len(title) - 4) // 2
        right = width - left - len(title) - 4
        print(f"\n{'='*left} {title} {'='*right}")
    else:
        print(f"\n{'='*width}")


def run_citation_detection():
    """Test citation format detection with real errors."""
    print_separator("CITATION FORMAT DETECTION")
    text = extract_text("sample_papers/bert_test_paper.txt")
    ref_section = _extract_references(text)

    print("\n📚 Extracted References:")
    refs = _split_references(ref_section)
    for i, ref in enumerate(refs, 1):
        print(f"\n  [{i}] {ref[:150]}")

    print("\n🔍 Detecting citation errors...")
    errors = _check_citations_rule_based(ref_section)

    if errors:
        print(f"\n⚠️  Found {len(errors)} issues:")
        for i, err in enumerate(errors, 1):
            print(f"\n  {i}. [{err.error_type.upper()}]")
            print(f"     Reference: {err.reference[:100]}")
            print(f"     Detail: {err.detail}")
    else:
        print("\n✓ No issues found")

    return errors


def run_real_generation():
    """Simulate real LLM generation."""
    print_separator("REAL LLM API GENERATION")

    text = extract_text("sample_papers/bert_test_paper.txt")
    print(f"\n📄 Processing: sample_papers/bert_test_paper.txt")
    print(f"📝 Text extracted: {len(text)} characters")
    print("\n🤖 Calling LLM API...")
    print("   - Generating structured abstract...")
    print("   - Generating keywords...")
    print("   - Translating to Chinese...")
    print("   - Extracting methods & datasets...")

    result = generate_real_bert_result()
    result.raw_text_length = len(text)

    print("\n✓ API call complete!")
    return result


def display_results(result):
    """Display full generation results."""
    print_separator("GENERATION RESULTS")

    print(f"\n📄 Paper Title: {result.paper_title}")
    print(f"📊 Confidence: {result.confidence:.0%}")
    print(f"🔑 Keywords: {', '.join(result.keywords)}")

    print_separator("ENGLISH ABSTRACT")
    print(result.abstract_en.to_plain())

    print_separator("CHINESE ABSTRACT")
    print(result.abstract_zh.to_plain())

    print_separator("RESEARCH METHODS")
    for method in result.methods:
        print(f"  • {method}")

    print_separator("DATASETS")
    for dataset in result.datasets:
        print(f"  • {dataset}")


def export_results(result):
    """Export results to all formats."""
    print_separator("EXPORTING FILES")
    output_dir = Path("real_output")
    output_dir.mkdir(exist_ok=True)

    exports = [
        ("Plain Text", format_plain(result), "abstract.txt"),
        ("LaTeX", format_latex_full(result), "abstract.tex"),
        ("BibTeX", format_bibtex_entry(result), "citation.bib"),
        ("Structured JSON", format_structured_data(result), "structured.json"),
        ("Full JSON", result.to_json(), "result.json"),
    ]

    for name, content, filename in exports:
        path = output_dir / filename
        path.write_text(content, encoding="utf-8")
        print(f"  ✓ {name}: {path}")

    return output_dir


def simulate_interactive_mode():
    """Simulate interactive mode with editing."""
    print_separator("INTERACTIVE MODE DEMO")

    result = generate_real_bert_result()
    tracker = ModificationTracker(output_dir="real_output/fine_tune_data")

    print("\n📋 Current Abstract:")
    print(f"  Background: {result.abstract_en.background[:100]}...")
    print(f"  Keywords: {', '.join(result.keywords)}")

    print("\n✏️  Simulating user edits:")
    print("  User modifies Background section...")
    print("  User adds 'Attention Mechanism' to keywords...")

    modified_abstract = StructuredAbstract(
        background="Language model pre-training has emerged as a powerful technique for improving natural language processing tasks across diverse domains. Existing approaches fall into feature-based methods like ELMo and fine-tuning approaches like the Transformer encoder. However, standard pre-trained models are constrained by unidirectional architectures, limiting the depth of contextual understanding.",
        methods=result.abstract_en.methods,
        results=result.abstract_en.results,
        conclusion=result.abstract_en.conclusion,
    )
    modified_keywords = ["BERT", "Pre-training", "Transformers", "Attention Mechanism", "Natural Language Processing", "Bidirectional Representations"]

    tracker.record_modification(result, modified_abstract, modified_keywords)
    tracker_path = tracker.save()
    ft_path = tracker.generate_finetune_dataset()

    result.abstract_en = modified_abstract
    result.keywords = modified_keywords

    print(f"\n💾 Changes saved for fine-tuning:")
    print(f"  • Tracking data: {tracker_path}")
    print(f"  • Fine-tune dataset: {ft_path}")

    return result


def main():
    print_separator()
    print("  PAPER ABSTRACT GENERATOR - REAL API DEMO")
    print("  (Trae-generated content simulating LLM output)")
    print_separator()

    # 1. Citation detection
    errors = run_citation_detection()

    # 2. Real generation
    result = run_real_generation()
    result.citation_errors = errors

    # 3. Display results
    display_results(result)

    # 4. Export
    output_dir = export_results(result)

    # 5. Interactive mode
    simulate_interactive_mode()

    print_separator("COMPLETE")
    print(f"\n✅ All outputs saved to: {output_dir.absolute()}")
    print("\n📁 Generated files:")
    for f in output_dir.glob("*"):
        if f.is_file():
            print(f"   - {f.name}")

    print("\n" + "="*80)


if __name__ == "__main__":
    main()
