#!/usr/bin/env python3
import os
import sys
import argparse
import csv
import shutil
import io
import codecs
import re
from typing import Optional, Tuple, List, Dict, Any, Union

try:
    import chardet
    HAS_CHARDET = True
except ImportError:
    HAS_CHARDET = False


SUPPORTED_ENCODINGS = [
    'utf-8', 'utf-8-sig', 'gbk', 'gb2312', 'big5', 'shift_jis',
    'euc-kr', 'euc-jp', 'iso-8859-1', 'utf-16', 'utf-16-le', 'utf-16-be',
    'ascii', 'latin-1', 'cp1252', 'cp936', 'cp950', 'cp932'
]

DEFAULT_CHUNK_SIZE = 1024 * 1024
MIN_CHUNK_SIZE = 1024
MAX_CHUNK_SIZE = 100 * 1024 * 1024

BOM_TABLE = {
    b'\xef\xbb\xbf': 'utf-8-sig',
    b'\xff\xfe\x00\x00': 'utf-32-le',
    b'\x00\x00\xfe\xff': 'utf-32-be',
    b'\xff\xfe': 'utf-16-le',
    b'\xfe\xff': 'utf-16-be',
}


class EncodingDetector:
    """增强的编码检测器"""
    
    def __init__(self):
        self.encoding_profiles = {
            'ascii': self._score_ascii,
            'utf-8': self._score_utf8,
            'gbk': self._score_gbk,
            'gb2312': self._score_gb2312,
            'big5': self._score_big5,
            'shift_jis': self._score_shift_jis,
            'euc-kr': self._score_euc_kr,
            'euc-jp': self._score_euc_jp,
            'latin-1': self._score_latin1,
        }
    
    def detect(self, data: bytes) -> Tuple[str, float]:
        if not data:
            return 'utf-8', 0.5
        
        for bom, encoding in BOM_TABLE.items():
            if data.startswith(bom):
                return encoding, 0.98
        
        if HAS_CHARDET:
            try:
                result = chardet.detect(data)
                encoding = result.get('encoding', '').lower() if result.get('encoding') else ''
                confidence = result.get('confidence', 0.0)
                
                if encoding and encoding in SUPPORTED_ENCODINGS:
                    if encoding == 'ascii':
                        return 'utf-8', confidence
                    return encoding, confidence
            except Exception:
                pass
        
        return self._heuristic_detect(data)
    
    def _heuristic_detect(self, data: bytes) -> Tuple[str, float]:
        scores = {}
        
        for encoding, scorer in self.encoding_profiles.items():
            try:
                score = scorer(data)
                if score > 0:
                    scores[encoding] = score
            except Exception:
                continue
        
        if scores:
            best_encoding = max(scores, key=scores.get)
            best_score = scores[best_encoding]
            normalized_score = min(best_score / 100.0, 0.95)
            return best_encoding, normalized_score
        
        try:
            data.decode('utf-8')
            return 'utf-8', 0.7
        except UnicodeDecodeError:
            pass
        
        return 'utf-8', 0.1
    
    def _score_ascii(self, data: bytes) -> float:
        if not data:
            return 0
        ascii_chars = sum(1 for b in data if 0x20 <= b < 0x7F or b in (0x09, 0x0A, 0x0D))
        ratio = ascii_chars / len(data)
        return 80.0 if ratio > 0.99 else ratio * 50
    
    def _score_utf8(self, data: bytes) -> float:
        try:
            data.decode('utf-8')
            score = 85.0
            high_bytes = sum(1 for b in data if b >= 0x80)
            if high_bytes == 0:
                score = 70.0
            return score
        except UnicodeDecodeError as e:
            valid_chars = e.start
            ratio = valid_chars / len(data) if len(data) > 0 else 0
            return ratio * 60.0
    
    def _score_gbk(self, data: bytes) -> float:
        try:
            decoded = data.decode('gbk')
            score = 75.0
            chinese_chars = sum(1 for c in decoded if '\u4e00' <= c <= '\u9fff')
            if chinese_chars > 0:
                score += min(chinese_chars / 10, 15)
            return min(score, 95.0)
        except UnicodeDecodeError as e:
            ratio = e.start / len(data) if len(data) > 0 else 0
            return ratio * 50.0
    
    def _score_gb2312(self, data: bytes) -> float:
        try:
            decoded = data.decode('gb2312')
            score = 70.0
            chinese_chars = sum(1 for c in decoded if '\u4e00' <= c <= '\u9fff')
            if chinese_chars > 0:
                score += min(chinese_chars / 10, 15)
            return min(score, 90.0)
        except UnicodeDecodeError:
            return 0.0
    
    def _score_big5(self, data: bytes) -> float:
        try:
            decoded = data.decode('big5')
            score = 70.0
            chinese_chars = sum(1 for c in decoded if '\u4e00' <= c <= '\u9fff')
            if chinese_chars > 0:
                score += min(chinese_chars / 10, 15)
            return min(score, 90.0)
        except UnicodeDecodeError:
            return 0.0
    
    def _score_shift_jis(self, data: bytes) -> float:
        try:
            decoded = data.decode('shift_jis')
            score = 70.0
            japanese_chars = sum(1 for c in decoded if 
                '\u3040' <= c <= '\u309F' or '\u30A0' <= c <= '\u30FF' or
                '\u4e00' <= c <= '\u9fff')
            if japanese_chars > 0:
                score += min(japanese_chars / 10, 15)
            return min(score, 90.0)
        except UnicodeDecodeError:
            return 0.0
    
    def _score_euc_kr(self, data: bytes) -> float:
        try:
            decoded = data.decode('euc-kr')
            score = 70.0
            korean_chars = sum(1 for c in decoded if '\uAC00' <= c <= '\uD7AF')
            if korean_chars > 0:
                score += min(korean_chars / 10, 15)
            return min(score, 90.0)
        except UnicodeDecodeError:
            return 0.0
    
    def _score_euc_jp(self, data: bytes) -> float:
        try:
            decoded = data.decode('euc-jp')
            score = 70.0
            japanese_chars = sum(1 for c in decoded if 
                '\u3040' <= c <= '\u309F' or '\u30A0' <= c <= '\u30FF')
            if japanese_chars > 0:
                score += min(japanese_chars / 10, 15)
            return min(score, 90.0)
        except UnicodeDecodeError:
            return 0.0
    
    def _score_latin1(self, data: bytes) -> float:
        try:
            decoded = data.decode('latin-1')
            high_bytes = sum(1 for b in data if 0x80 <= b <= 0xFF)
            if high_bytes > 0:
                ratio = high_bytes / len(data)
                return min(ratio * 100, 60.0)
            return 20.0
        except UnicodeDecodeError:
            return 0.0


_detector = EncodingDetector()


def detect_encoding(file_path: str, sample_size: int = 1024 * 1024) -> Tuple[str, float]:
    """检测文件编码"""
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            return 'utf-8', 0.5
        
        read_size = min(sample_size, file_size)
        
        with open(file_path, 'rb') as f:
            data = f.read(read_size)
        
        return _detector.detect(data)
    except FileNotFoundError:
        raise
    except PermissionError:
        print(f"权限错误: 无法读取文件 {file_path}", file=sys.stderr)
        return 'utf-8', 0.1
    except Exception as e:
        print(f"检测编码时出错 {file_path}: {e}", file=sys.stderr)
        return 'utf-8', 0.1


def detect_encoding_from_bytes(data: bytes) -> Tuple[str, float]:
    """从字节数据检测编码"""
    return _detector.detect(data)


def validate_encoding(encoding: str) -> bool:
    """验证编码是否有效"""
    try:
        codecs.lookup(encoding)
        return True
    except LookupError:
        return False


def normalize_encoding(encoding: str) -> str:
    """标准化编码名称"""
    encoding = encoding.lower().strip()
    aliases = {
        'utf8': 'utf-8',
        'utf-8-bom': 'utf-8-sig',
        'gb18030': 'gbk',
        'cp936': 'gbk',
        'ms936': 'gbk',
        'ansi': 'gbk',
        'shift-jis': 'shift_jis',
        'shiftjis': 'shift_jis',
        'sjis': 'shift_jis',
        'euckr': 'euc-kr',
        'eucjp': 'euc-jp',
        'iso8859-1': 'iso-8859-1',
        'latin1': 'latin-1',
        'latin_1': 'latin-1',
    }
    return aliases.get(encoding, encoding)


def convert_encoding(
    content: str,
    target_encoding: str,
    errors: str = 'replace',
    replace_char: Optional[str] = None
) -> bytes:
    """转换字符串编码"""
    if errors == 'replace' and replace_char is not None and replace_char != '?':
        try:
            target_encoder = codecs.getencoder(target_encoding)
            
            try:
                target_encoder(replace_char)
            except UnicodeEncodeError:
                print(f"警告: 替换字符 '{replace_char}' 无法用目标编码表示，使用默认 '?'", file=sys.stderr)
                replace_char = '?'
            
            encoded_chars = []
            
            for char in content:
                try:
                    target_encoder(char)
                    encoded_chars.append(char)
                except UnicodeEncodeError:
                    encoded_chars.append(replace_char)
            
            return ''.join(encoded_chars).encode(target_encoding, errors='strict')
        except Exception as e:
            print(f"自定义替换失败，使用默认方式: {e}", file=sys.stderr)
    
    return content.encode(target_encoding, errors=errors)


def count_replaced_chars(content: str, target_encoding: str) -> int:
    """统计无法映射的字符数量"""
    try:
        encoder = codecs.getencoder(target_encoding)
        count = 0
        for char in content:
            try:
                encoder(char)
            except UnicodeEncodeError:
                count += 1
        return count
    except Exception:
        return content.count('\ufffd')


def convert_file(
    input_path: str,
    output_path: str,
    source_encoding: Optional[str] = None,
    target_encoding: str = 'utf-8',
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    errors: str = 'replace',
    replace_char: Optional[str] = None,
    write_bom: bool = False
) -> Tuple[bool, str, Dict[str, Any]]:
    """转换单个文件编码（增强的分块读取实现）"""
    stats = {
        'source_encoding': source_encoding,
        'target_encoding': target_encoding,
        'confidence': 0.0,
        'total_chars': 0,
        'replaced_chars': 0,
        'total_bytes': 0,
        'chunks_processed': 0
    }
    
    try:
        if not os.path.exists(input_path):
            return False, f"输入文件不存在: {input_path}", stats
        
        file_size = os.path.getsize(input_path)
        stats['total_bytes'] = file_size
        
        if file_size == 0:
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
            open(output_path, 'wb').close()
            stats['source_encoding'] = source_encoding or 'utf-8'
            return True, "空文件已创建", stats
        
        chunk_size = max(MIN_CHUNK_SIZE, min(chunk_size, MAX_CHUNK_SIZE))
        
        if source_encoding is None:
            source_encoding, confidence = detect_encoding(input_path)
            stats['source_encoding'] = source_encoding
            stats['confidence'] = confidence
        else:
            source_encoding = normalize_encoding(source_encoding)
            if not validate_encoding(source_encoding):
                return False, f"无效的源编码: {source_encoding}", stats
        
        target_encoding = normalize_encoding(target_encoding)
        if not validate_encoding(target_encoding):
            return False, f"无效的目标编码: {target_encoding}", stats
        
        temp_output = output_path + '.tmp'
        output_dir = os.path.dirname(temp_output)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        
        decoder = codecs.getincrementaldecoder(source_encoding)(errors=errors)
        leftover = b''
        bom_written = False
        
        with open(input_path, 'rb') as infile, open(temp_output, 'wb') as outfile:
            
            if write_bom and target_encoding in ('utf-8-sig', 'utf-16', 'utf-16-le', 'utf-16-be'):
                if target_encoding == 'utf-8-sig':
                    outfile.write(b'\xef\xbb\xbf')
                elif target_encoding in ('utf-16', 'utf-16-le'):
                    outfile.write(b'\xff\xfe')
                elif target_encoding == 'utf-16-be':
                    outfile.write(b'\xfe\xff')
                bom_written = True
            
            while True:
                chunk = infile.read(chunk_size)
                if not chunk:
                    break
                
                stats['chunks_processed'] += 1
                
                try:
                    text = decoder.decode(chunk, final=False)
                except (UnicodeDecodeError, LookupError):
                    try:
                        decoder = codecs.getincrementaldecoder('utf-8')(errors=errors)
                        text = decoder.decode(leftover + chunk, final=False)
                        stats['source_encoding'] = 'utf-8'
                    except (UnicodeDecodeError, LookupError):
                        decoder = codecs.getincrementaldecoder('latin-1')(errors=errors)
                        text = decoder.decode(leftover + chunk, final=False)
                        stats['source_encoding'] = 'latin-1'
                
                if len(chunk) == chunk_size:
                    for i in range(min(4, len(text)), 0, -1):
                        if text[-i:] == '\ufffd' * i:
                            text = text[:-i]
                            leftover = chunk[-i*4:]
                            break
                    else:
                        leftover = b''
                
                stats['total_chars'] += len(text)
                stats['replaced_chars'] += count_replaced_chars(text, target_encoding)
                
                encoded = convert_encoding(text, target_encoding, errors, replace_char)
                outfile.write(encoded)
            
            final_text = decoder.decode(b'', final=True)
            if final_text:
                stats['total_chars'] += len(final_text)
                stats['replaced_chars'] += count_replaced_chars(final_text, target_encoding)
                encoded = convert_encoding(final_text, target_encoding, errors, replace_char)
                outfile.write(encoded)
        
        os.replace(temp_output, output_path)
        
        success_msg = f"转换成功 ({file_size} 字节, {stats['chunks_processed']} 个块)"
        if stats['replaced_chars'] > 0:
            success_msg += f", 替换了 {stats['replaced_chars']} 个字符"
        return True, success_msg, stats
        
    except PermissionError:
        return False, f"权限错误: 无法访问文件 {input_path}", stats
    except Exception as e:
        if 'temp_output' in locals() and os.path.exists(temp_output):
            try:
                os.remove(temp_output)
            except:
                pass
        return False, str(e), stats


def backup_file(file_path: str, max_backups: int = 100) -> Optional[str]:
    """备份文件为.bak后缀"""
    if not os.path.exists(file_path):
        return None
    
    try:
        backup_path = file_path + '.bak'
        if not os.path.exists(backup_path):
            shutil.copy2(file_path, backup_path)
            return backup_path
        
        for counter in range(1, max_backups + 1):
            backup_path = f"{file_path}.bak{counter}"
            if not os.path.exists(backup_path):
                shutil.copy2(file_path, backup_path)
                return backup_path
        
        print(f"警告: 已达到最大备份数 {max_backups}，跳过备份", file=sys.stderr)
        return None
        
    except Exception as e:
        print(f"备份文件失败 {file_path}: {e}", file=sys.stderr)
        return None


def get_files_from_folder(
    folder_path: str,
    extensions: Optional[List[str]] = None,
    recursive: bool = False
) -> List[str]:
    """获取文件夹中的文件列表"""
    files = []
    
    if not os.path.exists(folder_path):
        print(f"警告: 文件夹不存在: {folder_path}", file=sys.stderr)
        return files
    
    if not os.path.isdir(folder_path):
        print(f"警告: 不是文件夹: {folder_path}", file=sys.stderr)
        return files
    
    normalized_extensions = None
    if extensions:
        normalized_extensions = [
            ext.lower() if ext.startswith('.') else '.' + ext.lower()
            for ext in extensions
        ]
    
    try:
        if recursive:
            for root, _, filenames in os.walk(folder_path):
                for filename in filenames:
                    filepath = os.path.join(root, filename)
                    if os.path.isfile(filepath):
                        if normalized_extensions is None or any(
                            filename.lower().endswith(ext) for ext in normalized_extensions
                        ):
                            files.append(filepath)
        else:
            for filename in os.listdir(folder_path):
                filepath = os.path.join(folder_path, filename)
                if os.path.isfile(filepath):
                    if normalized_extensions is None or any(
                        filename.lower().endswith(ext) for ext in normalized_extensions
                    ):
                        files.append(filepath)
    except PermissionError:
        print(f"权限错误: 无法访问文件夹 {folder_path}", file=sys.stderr)
    except Exception as e:
        print(f"遍历文件夹时出错: {e}", file=sys.stderr)
    
    return files


def get_files_from_csv(
    csv_path: str,
    file_column: Union[str, int] = 0,
    encoding_column: Optional[Union[str, int]] = 1,
    output_column: Optional[Union[str, int]] = None,
    delimiter: str = ','
) -> List[Dict[str, str]]:
    """从CSV文件读取文件列表和编码（支持更复杂的CSV格式）"""
    files = []
    
    if not os.path.exists(csv_path):
        print(f"错误: CSV文件不存在: {csv_path}", file=sys.stderr)
        return files
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig', newline='') as f:
            sample = f.read(8192)
            f.seek(0)
            
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
                reader = csv.DictReader(f, dialect=dialect)
                use_dict = True
            except (csv.Error, Exception):
                f.seek(0)
                reader = csv.reader(f, delimiter=delimiter)
                use_dict = False
            
            if use_dict:
                headers = reader.fieldnames or []
                
                file_col = file_column if isinstance(file_column, str) else headers[file_column] if isinstance(file_column, int) and file_column < len(headers) else headers[0]
                enc_col = None
                out_col = None
                
                if encoding_column is not None:
                    if isinstance(encoding_column, str):
                        enc_col = encoding_column
                    elif isinstance(encoding_column, int) and encoding_column < len(headers):
                        enc_col = headers[encoding_column]
                
                if output_column is not None:
                    if isinstance(output_column, str):
                        out_col = output_column
                    elif isinstance(output_column, int) and output_column < len(headers):
                        out_col = headers[output_column]
                
                for row_num, row in enumerate(reader, start=2):
                    if not row or not any(row.values()):
                        continue
                    
                    try:
                        filepath = row.get(file_col, '').strip()
                        if not filepath:
                            continue
                        
                        entry = {'filepath': filepath}
                        if enc_col:
                            encoding = row.get(enc_col, '').strip()
                            if encoding:
                                entry['encoding'] = encoding
                        if out_col:
                            output = row.get(out_col, '').strip()
                            if output:
                                entry['output'] = output
                        
                        files.append(entry)
                    except Exception as e:
                        print(f"警告: 解析CSV第 {row_num} 行时出错: {e}", file=sys.stderr)
            else:
                next(reader, None)
                for row_num, row in enumerate(reader, start=2):
                    if not row or not any(cell.strip() for cell in row):
                        continue
                    
                    try:
                        file_idx = file_column if isinstance(file_column, int) else 0
                        if file_idx >= len(row):
                            continue
                        
                        filepath = row[file_idx].strip()
                        if not filepath:
                            continue
                        
                        entry = {'filepath': filepath}
                        
                        if encoding_column is not None:
                            enc_idx = encoding_column if isinstance(encoding_column, int) else 1
                            if enc_idx < len(row):
                                encoding = row[enc_idx].strip()
                                if encoding:
                                    entry['encoding'] = encoding
                        
                        if output_column is not None:
                            out_idx = output_column if isinstance(output_column, int) else 2
                            if out_idx < len(row):
                                output = row[out_idx].strip()
                                if output:
                                    entry['output'] = output
                        
                        files.append(entry)
                    except Exception as e:
                        print(f"警告: 解析CSV第 {row_num} 行时出错: {e}", file=sys.stderr)
    
    except PermissionError:
        print(f"权限错误: 无法读取CSV文件 {csv_path}", file=sys.stderr)
    except Exception as e:
        print(f"读取CSV文件失败: {e}", file=sys.stderr)
    
    return files


def preview_conversion(
    file_path: str,
    source_encoding: Optional[str] = None,
    target_encoding: str = 'utf-8',
    lines: int = 10,
    max_line_length: int = 100
) -> Dict[str, Any]:
    """预览转换结果"""
    result = {
        'file': file_path,
        'source_encoding': source_encoding,
        'target_encoding': target_encoding,
        'confidence': 0.0,
        'original_lines': [],
        'converted_lines': [],
        'original_preview': '',
        'converted_preview': ''
    }
    
    try:
        if not os.path.exists(file_path):
            result['error'] = f"文件不存在: {file_path}"
            return result
        
        if source_encoding is None:
            source_encoding, confidence = detect_encoding(file_path)
            result['source_encoding'] = source_encoding
            result['confidence'] = confidence
        
        file_size = os.path.getsize(file_path)
        sample_size = min(1024 * 100, file_size)
        
        with open(file_path, 'rb') as f:
            sample = f.read(sample_size)
        
        original_text = sample.decode(source_encoding, errors='replace')
        original_lines = original_text.splitlines()[:lines]
        
        truncated_lines = []
        for line in original_lines:
            if len(line) > max_line_length:
                truncated_lines.append(line[:max_line_length] + '...')
            else:
                truncated_lines.append(line)
        result['original_lines'] = truncated_lines
        result['original_preview'] = '\n'.join(truncated_lines)
        
        converted_bytes = convert_encoding(original_text, target_encoding, errors='replace')
        converted_text = converted_bytes.decode(target_encoding, errors='replace')
        converted_lines = converted_text.splitlines()[:lines]
        
        truncated_conv_lines = []
        for line in converted_lines:
            if len(line) > max_line_length:
                truncated_conv_lines.append(line[:max_line_length] + '...')
            else:
                truncated_conv_lines.append(line)
        result['converted_lines'] = truncated_conv_lines
        result['converted_preview'] = '\n'.join(truncated_conv_lines)
        
    except Exception as e:
        result['error'] = str(e)
    
    return result


def generate_report(results: List[Dict[str, Any]], report_path: Optional[str] = None) -> str:
    """生成转换报告"""
    success_count = sum(1 for r in results if r.get('success', False))
    failed_count = sum(1 for r in results if not r.get('success', False))
    total_files = len(results)
    success_rate = (success_count / total_files * 100) if total_files > 0 else 0
    
    total_chars = sum(r.get('stats', {}).get('total_chars', 0) for r in results if r.get('success', False))
    total_replaced = sum(r.get('stats', {}).get('replaced_chars', 0) for r in results if r.get('success', False))
    
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    report_lines = [
        "=" * 70,
        "文件编码转换报告",
        "=" * 70,
        f"生成时间: {timestamp}",
        f"总计文件数: {total_files}",
        f"成功: {success_count}",
        f"失败: {failed_count}",
        f"成功率: {success_rate:.1f}%",
        "",
    ]
    
    if total_chars > 0:
        report_lines.extend([
            f"总处理字符数: {total_chars:,}",
            f"替换字符数: {total_replaced:,}",
            "",
        ])
    
    report_lines.extend([
        "-" * 70,
        "成功转换的文件:",
        "-" * 70,
    ])
    
    for r in results:
        if r.get('success', False):
            stats = r.get('stats', {})
            src_enc = r.get('source_encoding', stats.get('source_encoding', '?'))
            tgt_enc = r.get('target_encoding', stats.get('target_encoding', '?'))
            output = r.get('output', '?')
            size = stats.get('total_bytes', 0)
            size_str = f" ({size:,} 字节)" if size > 0 else ""
            replaced = stats.get('replaced_chars', 0)
            replaced_str = f" [替换{replaced}字符]" if replaced > 0 else ""
            report_lines.append(f"✓ {r['file']} [{src_enc}] -> {output} [{tgt_enc}]{size_str}{replaced_str}")
    
    if failed_count > 0:
        report_lines.extend([
            "",
            "-" * 70,
            "转换失败的文件:",
            "-" * 70,
        ])
        
        for r in results:
            if not r.get('success', False):
                error = r.get('error', '未知错误')
                report_lines.append(f"✗ {r.get('file', '?')}: {error}")
    
    report_lines.append("=" * 70)
    
    report_text = "\n".join(report_lines)
    
    if report_path:
        try:
            report_dir = os.path.dirname(report_path)
            if report_dir and not os.path.exists(report_dir):
                os.makedirs(report_dir, exist_ok=True)
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(report_text)
            print(f"报告已保存到: {report_path}", file=sys.stderr)
        except Exception as e:
            print(f"保存报告失败: {e}", file=sys.stderr)
    
    return report_text


def process_stdin(
    source_encoding: Optional[str] = None,
    target_encoding: str = 'utf-8',
    errors: str = 'replace',
    replace_char: Optional[str] = None
) -> int:
    """处理标准输入"""
    try:
        data = sys.stdin.buffer.read()
        
        if not data:
            return 0
        
        if source_encoding is None:
            source_encoding, confidence = detect_encoding_from_bytes(data)
            print(f"检测到编码: {source_encoding} (置信度: {confidence:.2%})", file=sys.stderr)
        else:
            source_encoding = normalize_encoding(source_encoding)
            if not validate_encoding(source_encoding):
                print(f"错误: 无效的源编码: {source_encoding}", file=sys.stderr)
                return 1
        
        target_encoding = normalize_encoding(target_encoding)
        if not validate_encoding(target_encoding):
            print(f"错误: 无效的目标编码: {target_encoding}", file=sys.stderr)
            return 1
        
        text = data.decode(source_encoding, errors=errors)
        result = convert_encoding(text, target_encoding, errors, replace_char)
        sys.stdout.buffer.write(result)
        return 0
    except KeyboardInterrupt:
        print("\n操作已取消", file=sys.stderr)
        return 130
    except Exception as e:
        print(f"处理标准输入失败: {e}", file=sys.stderr)
        return 1


def validate_chunk_size(value: int) -> int:
    """验证并标准化块大小"""
    try:
        value = int(value)
        if value < MIN_CHUNK_SIZE:
            print(f"警告: 块大小 {value} 太小，使用最小值 {MIN_CHUNK_SIZE}", file=sys.stderr)
            return MIN_CHUNK_SIZE
        if value > MAX_CHUNK_SIZE:
            print(f"警告: 块大小 {value} 太大，使用最大值 {MAX_CHUNK_SIZE}", file=sys.stderr)
            return MAX_CHUNK_SIZE
        return value
    except (ValueError, TypeError):
        print(f"警告: 无效的块大小值，使用默认值 {DEFAULT_CHUNK_SIZE}", file=sys.stderr)
        return DEFAULT_CHUNK_SIZE


def main():
    parser = argparse.ArgumentParser(
        description='文件编码转换工具 - 支持多种编码转换和批量处理',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""支持的编码: {', '.join(SUPPORTED_ENCODINGS)}

示例:
  转换单个文件:
    %(prog)s -i input.txt -o output.txt -t utf-8
    %(prog)s -i input.txt -s gbk -t utf-8 --backup
    %(prog)s -i input.txt -t utf-8 --chunk-size 2097152 --replace-char "□"
  
  批量转换文件夹:
    %(prog)s -d ./docs -t utf-8 -e .txt .csv --recursive
    %(prog)s -d ./docs -t utf-8 --output-dir ./converted --report report.txt
  
  预览转换效果:
    %(prog)s -i input.txt --preview
    %(prog)s -i input.txt --preview --preview-lines 20
  
  仅检测编码:
    %(prog)s -i input.txt --detect-only
  
  从CSV读取文件列表:
    %(prog)s --csv-list files.csv -t utf-8 --report report.txt
    %(prog)s --csv-list files.csv --csv-delimiter ";" --csv-encoding-col 2
  
  管道模式:
    cat input.txt | %(prog)s --pipe -t gbk > output.txt
    echo "测试文本" | %(prog)s --pipe -s utf-8 -t big5

注意: 建议安装 chardet 库以获得更准确的编码检测: pip install chardet
        """
    )
    
    parser.add_argument('-i', '--input', help='输入文件路径')
    parser.add_argument('-o', '--output', help='输出文件路径')
    parser.add_argument('-d', '--directory', help='输入文件夹路径')
    parser.add_argument('-t', '--target-encoding', default='utf-8',
                        help=f'目标编码 (默认: utf-8)')
    parser.add_argument('-s', '--source-encoding',
                        help='源编码（不指定则自动检测）')
    parser.add_argument('-e', '--extensions', nargs='+',
                        help='指定扩展名，如: .txt .csv .xml')
    parser.add_argument('-r', '--recursive', action='store_true',
                        help='递归处理子文件夹')
    parser.add_argument('--backup', action='store_true',
                        help='备份原文件为.bak后缀')
    parser.add_argument('--preview', action='store_true',
                        help='预览模式，不实际转换')
    parser.add_argument('--preview-lines', type=int, default=10,
                        help='预览行数 (默认: 10)')
    parser.add_argument('--chunk-size', type=int, default=DEFAULT_CHUNK_SIZE,
                        help=f'分块读取大小(字节) (默认: {DEFAULT_CHUNK_SIZE}, 范围: {MIN_CHUNK_SIZE}-{MAX_CHUNK_SIZE})')
    parser.add_argument('--replace-char', default=None,
                        help='无法映射字符的替代字符 (默认: ?)')
    parser.add_argument('--errors', default='replace',
                        choices=['strict', 'ignore', 'replace'],
                        help='错误处理方式 (默认: replace)')
    parser.add_argument('--output-dir', help='批量转换的输出目录')
    parser.add_argument('--report', help='生成转换报告的文件路径')
    parser.add_argument('--csv-list', help='从CSV文件读取文件列表和编码')
    parser.add_argument('--csv-delimiter', default=',',
                        help='CSV文件分隔符 (默认: ,)')
    parser.add_argument('--csv-file-col', default=0,
                        help='CSV文件路径列 (默认: 0)')
    parser.add_argument('--csv-encoding-col', type=int, default=1,
                        help='CSV编码列 (默认: 1)')
    parser.add_argument('--csv-output-col', type=int, default=None,
                        help='CSV输出路径列 (可选)')
    parser.add_argument('--pipe', action='store_true',
                        help='管道模式，从stdin读取并输出到stdout')
    parser.add_argument('--detect-only', action='store_true',
                        help='仅检测文件编码，不转换')
    parser.add_argument('--overwrite', action='store_true',
                        help='覆盖原文件（批量转换时）')
    parser.add_argument('--write-bom', action='store_true',
                        help='为UTF编码写入BOM')
    parser.add_argument('--quiet', '-q', action='store_true',
                        help='静默模式，减少输出')
    parser.add_argument('--list-encodings', action='store_true',
                        help='列出所有支持的编码')
    
    args = parser.parse_args()
    
    if args.list_encodings:
        print("支持的编码列表:")
        for enc in SUPPORTED_ENCODINGS:
            print(f"  - {enc}")
        return 0
    
    if not any([args.input, args.directory, args.csv_list, args.pipe]):
        parser.print_help()
        return 1
    
    if args.pipe:
        return process_stdin(
            args.source_encoding, args.target_encoding,
            args.errors, args.replace_char
        )
    
    args.chunk_size = validate_chunk_size(args.chunk_size)
    
    if args.target_encoding:
        args.target_encoding = normalize_encoding(args.target_encoding)
        if not validate_encoding(args.target_encoding):
            print(f"错误: 无效的目标编码: {args.target_encoding}", file=sys.stderr)
            return 1
    
    if args.source_encoding:
        args.source_encoding = normalize_encoding(args.source_encoding)
        if not validate_encoding(args.source_encoding):
            print(f"错误: 无效的源编码: {args.source_encoding}", file=sys.stderr)
            return 1
    
    results = []
    
    try:
        if args.csv_list:
            files = get_files_from_csv(
                args.csv_list,
                file_column=args.csv_file_col,
                encoding_column=args.csv_encoding_col,
                output_column=args.csv_output_col,
                delimiter=args.csv_delimiter
            )
            
            if not files:
                print("警告: 未从CSV文件读取到任何文件", file=sys.stderr)
                return 1
            
            for entry in files:
                filepath = entry['filepath']
                source_enc = entry.get('encoding') or args.source_encoding
                custom_output = entry.get('output')
                
                if custom_output and not args.output_dir:
                    original_output = args.output
                    args.output = custom_output
                    result = process_single_file(filepath, args, source_enc)
                    args.output = original_output
                else:
                    result = process_single_file(filepath, args, source_enc)
                results.append(result)
        
        elif args.directory:
            files = get_files_from_folder(args.directory, args.extensions, args.recursive)
            
            if not files:
                print("警告: 未找到匹配的文件", file=sys.stderr)
                return 1
            
            if not args.quiet:
                print(f"找到 {len(files)} 个文件待处理")
            
            for filepath in files:
                result = process_single_file(filepath, args, args.source_encoding)
                results.append(result)
        
        elif args.input:
            result = process_single_file(args.input, args, args.source_encoding)
            results.append(result)
        
        if args.report:
            report = generate_report(results, args.report)
            if not args.quiet:
                print(report)
        elif not args.preview and not args.detect_only and not args.quiet:
            success = sum(1 for r in results if r.get('success', False))
            print(f"\n处理完成: 成功 {success}/{len(results)} 个文件")
    
    except KeyboardInterrupt:
        print("\n操作已取消", file=sys.stderr)
        return 130
    except Exception as e:
        print(f"处理过程中发生错误: {e}", file=sys.stderr)
        return 1
    
    failed = sum(1 for r in results if not r.get('success', False))
    return 0 if failed == 0 else min(failed, 125)


def process_single_file(filepath: str, args: argparse.Namespace, source_encoding: Optional[str]) -> Dict[str, Any]:
    """处理单个文件"""
    result = {'file': filepath, 'success': False, 'stats': {}}
    
    if not os.path.exists(filepath):
        result['error'] = f"文件不存在: {filepath}"
        if not args.quiet:
            print(f"✗ {filepath}: 文件不存在")
        return result
    
    if not os.path.isfile(filepath):
        result['error'] = f"不是文件: {filepath}"
        if not args.quiet:
            print(f"✗ {filepath}: 不是文件")
        return result
    
    try:
        if args.detect_only:
            encoding, confidence = detect_encoding(filepath)
            if not args.quiet:
                size = os.path.getsize(filepath)
                print(f"{filepath}: {encoding} (置信度: {confidence:.2%}, 大小: {size:,} 字节)")
            result['success'] = True
            result['source_encoding'] = encoding
            result['confidence'] = confidence
            return result
        
        if args.preview:
            preview = preview_conversion(
                filepath, source_encoding, args.target_encoding, args.preview_lines
            )
            print(f"\n{'='*70}")
            print(f"文件: {filepath}")
            print(f"大小: {os.path.getsize(filepath):,} 字节")
            
            if 'error' in preview:
                print(f"错误: {preview['error']}")
                result['error'] = preview['error']
            else:
                print(f"检测编码: {preview['source_encoding']} (置信度: {preview['confidence']:.2%})")
                print(f"目标编码: {preview['target_encoding']}")
                print(f"\n{'='*70}")
                print(f"{'转换前':<50} | 转换后")
                print(f"{'='*70}")
                for orig, conv in zip(preview['original_lines'], preview['converted_lines']):
                    print(f"{orig:<50} | {conv}")
                print(f"{'='*70}")
            result['success'] = 'error' not in preview
            return result
        
        if args.output_dir:
            base_dir = args.directory or os.path.dirname(filepath)
            try:
                rel_path = os.path.relpath(filepath, base_dir)
            except ValueError:
                rel_path = os.path.basename(filepath)
            output_path = os.path.join(args.output_dir, rel_path)
        elif args.output:
            output_path = args.output
        elif args.overwrite:
            output_path = filepath
        else:
            base, ext = os.path.splitext(filepath)
            output_path = f"{base}_{args.target_encoding}{ext}"
        
        if args.backup and os.path.exists(filepath) and output_path == filepath:
            backup_path = backup_file(filepath)
            if backup_path and not args.quiet:
                print(f"已备份: {backup_path}")
        
        success, message, stats = convert_file(
            filepath, output_path, source_encoding,
            args.target_encoding, args.chunk_size,
            args.errors, args.replace_char,
            args.write_bom
        )
        
        result.update({
            'success': success,
            'error': message if not success else None,
            'source_encoding': stats['source_encoding'],
            'target_encoding': args.target_encoding,
            'confidence': stats['confidence'],
            'output': output_path,
            'stats': stats
        })
        
        if not args.quiet:
            if success:
                conf_str = f" (置信度: {stats['confidence']:.2%})" if source_encoding is None else ""
                replaced_str = f" [替换{stats['replaced_chars']}字符]" if stats['replaced_chars'] > 0 else ""
                print(f"✓ {filepath} [{stats['source_encoding']}{conf_str}] -> {output_path} [{args.target_encoding}]{replaced_str}")
            else:
                print(f"✗ {filepath}: {message}")
    
    except PermissionError:
        result['error'] = f"权限错误: 无法访问文件"
        if not args.quiet:
            print(f"✗ {filepath}: 权限错误")
    except KeyboardInterrupt:
        raise
    except Exception as e:
        result['error'] = str(e)
        if not args.quiet:
            print(f"✗ {filepath}: {e}")
    
    return result


if __name__ == '__main__':
    sys.exit(main())
