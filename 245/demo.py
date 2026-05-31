#!/usr/bin/env python3
"""End-to-end demo script for paper_abs_gen.

Usage:
    python demo.py                    # Run demo with mock data (no API key needed)
    python demo.py --real             # Run with real LLM API (requires OPENAI_API_KEY)
    python demo.py --input file.txt   # Process custom input file
    python demo.py --batch ./papers/  # Process a directory
"""

import argparse
import json
import os
import sys
from pathlib import Path

from paper_abs_gen.extractor import extract_text, find_papers_in_dir
from paper_abs_gen.generator import (
    GenerationResult,
    StructuredAbstract,
    CitationError,
    generate_abstract,
    generate_chinese_abstract,
    extract_metadata,
    check_citations,
)
from paper_abs_gen.llm_client import LLMClient
from paper_abs_gen.formatter import (
    format_plain,
    format_latex_full,
    format_bibtex_entry,
    format_structured_data,
)
from paper_abs_gen.tracker import ModificationTracker


def create_mock_result() -> GenerationResult:
    """Create a mock result for testing without API."""
    return GenerationResult(
        paper_path="sample_papers/attention_is_all_you_need.txt",
        paper_title="Attention Is All You Need",
        abstract_en=StructuredAbstract(
            background="The dominant sequence transduction models are based on complex recurrent or convolutional neural networks with encoder-decoder architectures. While attention mechanisms have been integrated, the sequential nature of recurrence limits parallelization during training, becoming increasingly problematic for longer sequences.",
            methods="We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The model employs stacked self-attention and point-wise, fully connected layers for both encoder and decoder, with multi-head attention allowing joint attention to information from different representation subspaces.",
            results="Experiments on the WMT 2014 English-to-German translation task achieve 28.4 BLEU, improving over existing best results by over 2 BLEU. On the WMT 2014 English-to-French translation task, the model establishes a new state-of-the-art BLEU score of 41.0 with significantly reduced training cost compared to prior models.",
            conclusion="The Transformer architecture demonstrates that attention mechanisms alone can effectively model sequence transduction, enabling significantly faster training than recurrent or convolutional layer-based approaches. This work opens new possibilities for parallelizable sequence modeling and may inspire future applications beyond translation."
        ),
        abstract_zh=StructuredAbstract(
            background="主流的序列转换模型基于复杂的循环或卷积神经网络，采用编码器-解码器架构。虽然已集成注意力机制，但循环的序列特性限制了训练期间的并行化能力，对较长序列而言问题愈发突出。",
            methods="我们提出了Transformer模型架构，摒弃循环结构，完全依赖注意力机制来建模输入和输出之间的全局依赖关系。该模型在编码器和解码器中均使用堆叠的自注意力和逐点全连接层，通过多头注意力机制实现对不同表示子空间信息的联合关注。",
            results="在WMT 2014英德翻译任务上达到28.4 BLEU，比现有最佳结果提升超过2 BLEU。在WMT 2014英法翻译任务上，模型以显著降低的训练成本，取得41.0 BLEU的全新单模型最优成绩。",
            conclusion="Transformer架构证明，仅靠注意力机制就能有效建模序列转换，相比基于循环层或卷积层的方法可实现显著更快的训练。这项工作为可并行化的序列建模开辟了新的可能，并可能启发翻译之外的更多应用。"
        ),
        keywords=["Transformer", "Self-Attention", "Machine Translation", "Multi-Head Attention", "Sequence Modeling"],
        confidence=0.94,
        methods=["Transformer Architecture", "Multi-Head Self-Attention", "Position-Wise Feed-Forward Networks", "Residual Connections"],
        datasets=["WMT 2014 English-to-German", "WMT 2014 English-to-French"],
        citation_errors=[
            CitationError(
                reference="[1] Bahdanau et al. Neural machine translation by jointly learning to align and translate. In ICLR, 2015.",
                error_type="missing_doi",
                detail="Conference paper reference appears to be missing a DOI"
            ),
            CitationError(
                reference="[2] Sutskever et al. Sequence to sequence learning with neural networks. In NIPS, 2014.",
                error_type="missing_doi",
                detail="Conference paper reference appears to be missing a DOI"
            ),
        ],
        raw_text_length=5693,
    )


def print_separator(title: str = ""):
    width = 80
    if title:
        left = (width - len(title) - 4) // 2
        right = width - left - len(title) - 4
        print(f"\n{'='*left} {title} {'='*right}")
    else:
        print(f"\n{'='*width}")


def display_result_summary(result: GenerationResult):
    print_separator("RESULT SUMMARY")
    print(f"📄 Paper: {result.paper_title}")
    print(f"📊 Confidence: {result.confidence:.0%}")
    print(f"📝 Text length: {result.raw_text_length} chars")
    print(f"🔑 Keywords: {', '.join(result.keywords)}")

    if result.methods:
        print(f"🔬 Methods: {', '.join(result.methods)}")
    if result.datasets:
        print(f"📊 Datasets: {', '.join(result.datasets)}")
    if result.citation_errors:
        print(f"⚠️  Citation issues: {len(result.citation_errors)}")


def display_abstracts(result: GenerationResult):
    print_separator("ENGLISH ABSTRACT")
    print(result.abstract_en.to_plain())

    if result.abstract_zh:
        print_separator("CHINESE ABSTRACT")
        print(result.abstract_zh.to_plain())


def display_export_formats(result: GenerationResult, output_dir: Path):
    print_separator("EXPORT FORMATS")

    formats = [
        ("Plain Text", format_plain(result), "abstract.txt"),
        ("LaTeX", format_latex_full(result), "abstract.tex"),
        ("BibTeX", format_bibtex_entry(result), "citation.bib"),
        ("Structured JSON", format_structured_data(result), "structured.json"),
        ("Full JSON", result.to_json(), "result.json"),
    ]

    for name, content, filename in formats:
        path = output_dir / filename
        path.write_text(content, encoding="utf-8")
        print(f"✓ {name}: {path}")


def run_mock_demo():
    """Run demonstration with mock data (no API key required)."""
    print_separator()
    print("  PAPER ABSTRACT GENERATOR - DEMO MODE")
    print("  (Mock data - no API calls)")
    print_separator()

    result = create_mock_result()
    output_dir = Path("demo_output")
    output_dir.mkdir(exist_ok=True)

    print("\n📥 Input: sample_papers/attention_is_all_you_need.txt")

    display_result_summary(result)
    display_abstracts(result)
    display_export_formats(result, output_dir)

    print_separator("FINE-TUNING SIMULATION")
    tracker = ModificationTracker(output_dir=str(output_dir / "fine_tune_data"))

    modified_abstract = StructuredAbstract(
        background=result.abstract_en.background + " This study addresses critical limitations in parallelization efficiency.",
        methods="Our novel Transformer architecture employs multi-headed self-attention mechanisms without recurrence.",
        results=result.abstract_en.results,
        conclusion=result.abstract_en.conclusion,
    )
    modified_keywords = ["Transformer", "Attention Mechanism", "Machine Translation", "Deep Learning"]

    tracker.record_modification(
        result,
        modified_abstract=modified_abstract,
        modified_keywords=modified_keywords,
    )
    tracker_path = tracker.save()
    ft_path = tracker.generate_finetune_dataset()
    print(f"✓ Modifications tracked: {tracker_path}")
    print(f"✓ Fine-tune dataset: {ft_path}")

    print_separator("DEMO COMPLETE")
    print(f"All outputs saved to: {output_dir.absolute()}")
    print("\nTo run with real LLM API, set OPENAI_API_KEY and run:")
    print("  python demo.py --real")


def run_real_demo(input_file: str = None, use_chinese: bool = True, extract_meta: bool = True, check_cite: bool = True):
    """Run with real LLM API."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ Error: OPENAI_API_KEY environment variable not set.")
        print("Set it with: export OPENAI_API_KEY='sk-...'")
        return

    print_separator()
    print("  PAPER ABSTRACT GENERATOR - REAL API MODE")
    print_separator()

    try:
        client = LLMClient()
        print(f"✓ API client initialized (model: {client.model})")
    except Exception as e:
        print(f"❌ Failed to initialize API client: {e}")
        return

    input_path = input_file or "sample_papers/attention_is_all_you_need.txt"
    print(f"\n📥 Processing: {input_path}")

    try:
        text = extract_text(input_path)
        print(f"✓ Extracted {len(text)} characters")
    except Exception as e:
        print(f"❌ Failed to extract text: {e}")
        return

    output_dir = Path("demo_output_real")
    output_dir.mkdir(exist_ok=True)

    print("\n🔄 Generating abstract...")
    result = generate_abstract(client, text)
    result.paper_path = input_path

    if use_chinese:
        print("🔄 Generating Chinese abstract...")
        generate_chinese_abstract(client, text, result)

    if extract_meta:
        print("🔄 Extracting methods and datasets...")
        extract_metadata(client, text, result)

    if check_cite:
        print("🔄 Checking citations...")
        check_citations(client, text, result)

    print("\n✓ Generation complete!")

    display_result_summary(result)
    display_abstracts(result)
    display_export_formats(result, output_dir)

    print_separator("COMPLETE")
    print(f"All outputs saved to: {output_dir.absolute()}")


def run_batch_demo(input_dir: str):
    """Process a directory of papers."""
    from paper_abs_gen.batch import batch_process

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ Error: OPENAI_API_KEY environment variable not set.")
        return

    print_separator()
    print("  BATCH PROCESSING MODE")
    print_separator()

    try:
        client = LLMClient()
    except Exception as e:
        print(f"❌ Failed to initialize API client: {e}")
        return

    papers = find_papers_in_dir(input_dir)
    print(f"Found {len(papers)} papers in: {input_dir}")

    results = batch_process(
        client=client,
        input_dir=input_dir,
        chinese=True,
        extract_meta=True,
        check_cite=True,
        export_latex=True,
        export_bibtex=True,
    )
    print(f"\n✓ Processed {len(results)} papers")


def main():
    parser = argparse.ArgumentParser(description="paper_abs_gen End-to-End Demo")
    parser.add_argument("--real", action="store_true", help="Use real LLM API")
    parser.add_argument("--input", type=str, help="Input file for real mode")
    parser.add_argument("--batch", type=str, help="Directory for batch processing")
    parser.add_argument("--no-chinese", action="store_true", help="Skip Chinese abstract")
    parser.add_argument("--no-meta", action="store_true", help="Skip metadata extraction")
    parser.add_argument("--no-cite", action="store_true", help="Skip citation checking")

    args = parser.parse_args()

    if args.batch:
        run_batch_demo(args.batch)
    elif args.real:
        run_real_demo(
            input_file=args.input,
            use_chinese=not args.no_chinese,
            extract_meta=not args.no_meta,
            check_cite=not args.no_cite,
        )
    else:
        run_mock_demo()


if __name__ == "__main__":
    main()
