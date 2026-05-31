from paper_abs_gen.generator import GenerationResult, StructuredAbstract, CitationError
from paper_abs_gen.formatter import format_plain, format_latex_full, format_bibtex_entry, format_structured_data
from paper_abs_gen.tracker import ModificationTracker
from paper_abs_gen.extractor import find_papers_in_dir
import json


def test_data_structures():
    abstract = StructuredAbstract(
        background='Deep learning has transformed NLP.',
        methods='We propose a novel transformer architecture.',
        results='Our model achieves SOTA on 5 benchmarks.',
        conclusion='The proposed approach significantly improves performance.'
    )
    result = GenerationResult(
        paper_path='test_paper.pdf',
        paper_title='A Novel Transformer Architecture for NLP',
        abstract_en=abstract,
        keywords=['transformer', 'NLP', 'deep learning', 'attention mechanism'],
        confidence=0.92,
        methods=['Transformer', 'Self-Attention', 'Pre-training'],
        datasets=['GLUE', 'SQuAD', 'MNLI'],
        citation_errors=[
            CitationError(reference='Smith et al. 2023', error_type='missing_doi',
                          detail='Reference lacks a DOI')
        ],
        raw_text_length=15000,
    )
    return result


def test_plain_format(result):
    text = format_plain(result)
    assert 'Background:' in text
    assert 'Methods:' in text
    assert 'Results:' in text
    assert 'Conclusion:' in text
    assert 'transformer' in text
    assert '92%' in text
    print('  PASS: plain format')


def test_latex_format(result):
    text = format_latex_full(result)
    assert r'\begin{abstract}' in text
    assert r'\end{abstract}' in text
    assert r'\textbf{Background.}' in text
    assert r'\textbf{Keywords:}' in text
    print('  PASS: LaTeX format')


def test_bibtex_format(result):
    text = format_bibtex_entry(result)
    assert '@article{' in text
    assert 'abstract = {' in text
    assert 'keywords = {' in text
    print('  PASS: BibTeX format')


def test_structured_data(result):
    text = format_structured_data(result)
    data = json.loads(text)
    assert 'paper_title' in data
    assert 'methods' in data
    assert 'datasets' in data
    assert len(data['methods']) == 3
    print('  PASS: structured data format')


def test_json_roundtrip(result):
    json_str = result.to_json()
    parsed = json.loads(json_str)
    assert parsed['paper_title'] == 'A Novel Transformer Architecture for NLP'
    assert len(parsed['keywords']) == 4
    assert parsed['confidence'] == 0.92
    assert len(parsed['citation_errors']) == 1
    print('  PASS: JSON roundtrip')


def test_tracker(result):
    tracker = ModificationTracker(output_dir='/tmp/pag_test_tracker')
    modified = StructuredAbstract(
        background='Deep learning has fundamentally transformed NLP.',
        methods='We propose a novel multi-head transformer architecture.',
        results='Our model achieves SOTA on 5 benchmarks with 2.3% improvement.',
        conclusion='The proposed approach significantly improves performance.'
    )
    tracker.record_modification(
        result,
        modified_abstract=modified,
        modified_keywords=['transformer', 'NLP', 'sparse attention', 'deep learning']
    )
    path = tracker.save()
    ft_path = tracker.generate_finetune_dataset()
    assert len(tracker.records) == 1
    print(f'  PASS: tracker (saved to {path}, finetune: {ft_path})')


def test_chinese_abstract():
    from paper_abs_gen.formatter import format_latex_abstract
    zh_abstract = StructuredAbstract(
        background='深度学习已彻底改变了自然语言处理领域。',
        methods='我们提出了一种新颖的Transformer架构。',
        results='我们的模型在5个基准测试上达到了最先进水平。',
        conclusion='所提方法显著提升了各项任务的性能。'
    )
    result = GenerationResult(
        paper_path='zh_test.pdf',
        paper_title='A Novel Transformer for NLP',
        abstract_en=StructuredAbstract(background='test', methods='test', results='test', conclusion='test'),
        abstract_zh=zh_abstract,
        keywords=['transformer', 'NLP'],
        confidence=0.88,
    )
    latex = format_latex_abstract(result, lang='zh')
    assert r'\selectlanguage{chinese}' in latex
    assert '深度学习' in latex
    print('  PASS: Chinese abstract LaTeX')


def test_flat_abstract():
    abstract = StructuredAbstract(
        background='A', methods='B', results='C', conclusion='D'
    )
    flat = abstract.to_flat()
    assert flat == 'A B C D'
    print('  PASS: flat abstract')


def main():
    print('Running paper_abs_gen tests...\n')
    result = test_data_structures()

    test_plain_format(result)
    test_latex_format(result)
    test_bibtex_format(result)
    test_structured_data(result)
    test_json_roundtrip(result)
    test_tracker(result)
    test_chinese_abstract()
    test_flat_abstract()

    print('\nAll tests passed!')


if __name__ == '__main__':
    main()
