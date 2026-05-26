"""
文件合并器模块 - 支持普通合并、断点续传、范围提取等
"""
import os
from typing import Optional, Callable, List, Dict, Any, Tuple
from .checksum import calculate_md5, calculate_bytes_md5, verify_md5
from .index import IndexManager
from .crypto import get_encryptor, XOREncryptor, AESEncryptor


class FileMerger:
    """文件合并器"""
    
    def __init__(self, index_file_path: Optional[str] = None,
                 output_path: Optional[str] = None,
                 password: Optional[str] = None,
                 verify_integrity: bool = True,
                 resume: bool = True,
                 progress_callback: Optional[Callable[[int, int], None]] = None):
        """
        初始化文件合并器
        
        Args:
            index_file_path: 索引文件路径
            output_path: 输出文件路径
            password: 解密密码
            verify_integrity: 是否验证完整性
            resume: 是否支持断点续传
            progress_callback: 进度回调函数 (processed_bytes, total_bytes)
        """
        self.index_file_path = index_file_path
        self.output_path = output_path
        self.password = password
        self.verify_integrity = verify_integrity
        self.resume = resume
        self.progress_callback = progress_callback
        
        self.index_manager = IndexManager()
        self.encryptor = None
        
        if index_file_path:
            self.index_manager.load(index_file_path)
    
    def load_index(self, index_file_path: str) -> None:
        """
        加载索引文件
        
        Args:
            index_file_path: 索引文件路径
        """
        self.index_manager.load(index_file_path)
        self.index_file_path = index_file_path
    
    def load_chunks_from_text(self, text_file_path: str, output_path: str) -> None:
        """
        从文本文件加载分片列表
        
        Args:
            text_file_path: 文本文件路径
            output_path: 输出文件路径
        """
        chunks = self.index_manager.import_from_text(text_file_path)
        self.output_path = output_path
        
        self.index_manager.index_data['original_file'] = os.path.basename(output_path)
        self.index_manager.index_data['chunks'] = []
        self.index_manager.index_data['encryption_type'] = 'none'
        
        for i, chunk_path in enumerate(chunks, 1):
            if not os.path.exists(chunk_path):
                raise FileNotFoundError(f"分片文件不存在: {chunk_path}")
            
            chunk_size = os.path.getsize(chunk_path)
            chunk_md5 = calculate_md5(chunk_path)
            
            self.index_manager.add_chunk(
                index=i,
                filename=os.path.basename(chunk_path),
                size=chunk_size,
                md5=chunk_md5,
                start_byte=0,
                end_byte=chunk_size - 1
            )
        
        if chunks:
            self._chunks_dir_override = os.path.dirname(os.path.abspath(chunks[0]))
        else:
            self._chunks_dir_override = None
    
    def _get_decryptor(self, encryption_type: str, password: str) -> Optional[object]:
        """
        获取解密器
        
        Args:
            encryption_type: 加密类型
            password: 密码
            
        Returns:
            解密器实例或None
        """
        if encryption_type == 'none' or not encryption_type:
            return None
        return get_encryptor(encryption_type, password)
    
    def _verify_chunk(self, chunk_path: str, expected_md5: str, chunk_data: Optional[bytes] = None) -> bool:
        """
        验证分片完整性
        
        Args:
            chunk_path: 分片文件路径
            expected_md5: 预期MD5
            chunk_data: 分片数据（已读取时使用）
            
        Returns:
            是否完整
        """
        if not self.verify_integrity:
            return True
        
        if chunk_data is not None:
            actual_md5 = calculate_bytes_md5(chunk_data)
        else:
            actual_md5 = calculate_md5(chunk_path)
        
        return actual_md5.lower() == expected_md5.lower()
    
    def _get_chunk_dir(self) -> str:
        """
        获取分片文件所在目录
        
        Returns:
            目录路径
        """
        if hasattr(self, '_chunks_dir_override') and self._chunks_dir_override:
            return self._chunks_dir_override
        return self.index_manager.get_chunk_dir()
    
    def _read_and_decrypt_chunk(self, chunk_info: Dict[str, Any], chunk_dir: str) -> bytes:
        """
        读取并解密分片
        
        Args:
            chunk_info: 分片信息
            chunk_dir: 分片目录
            
        Returns:
            解密后的分片数据
        """
        chunk_path = os.path.join(chunk_dir, chunk_info['filename'])
        
        if not os.path.exists(chunk_path):
            raise FileNotFoundError(f"分片文件不存在: {chunk_path}")
        
        with open(chunk_path, 'rb') as f:
            chunk_data = f.read()
        
        encryption_type = self.index_manager.index_data.get('encryption_type', 'none')
        if encryption_type != 'none' and encryption_type:
            if not self.password:
                raise ValueError("分片已加密，需要提供密码才能解密")
            
            if encryption_type == 'aes':
                decryptor = self._get_decryptor(encryption_type, self.password)
            else:
                if self.encryptor is None:
                    self.encryptor = self._get_decryptor(encryption_type, self.password)
                decryptor = self.encryptor
            
            try:
                decrypted_data = decryptor.decrypt(chunk_data)
            except Exception as e:
                raise ValueError(f"解密失败，请检查密码是否正确: {str(e)}")
            
            chunk_data = decrypted_data
        
        return chunk_data
    
    def merge(self, output_path: Optional[str] = None) -> Tuple[str, bool]:
        """
        合并分片
        
        Args:
            output_path: 输出文件路径
            
        Returns:
            (输出文件路径, 完整性验证是否通过)
        """
        if not self.index_manager.index_data['chunks']:
            raise ValueError("没有可合并的分片")
        
        output_path = output_path or self.output_path
        if not output_path:
            original_file = self.index_manager.index_data['original_file']
            chunk_dir = self._get_chunk_dir()
            output_path = os.path.join(chunk_dir, original_file)
        
        output_dir = os.path.dirname(os.path.abspath(output_path))
        os.makedirs(output_dir, exist_ok=True)
        
        chunks = sorted(self.index_manager.index_data['chunks'], key=lambda x: x['index'])
        total_chunks = len(chunks)
        chunk_dir = self._get_chunk_dir()
        
        start_chunk = 0
        bytes_written = 0
        file_mode = 'wb'
        
        if self.resume and os.path.exists(output_path):
            progress = self.index_manager.get_merge_progress()
            if not progress.get('completed', False):
                start_chunk = progress.get('current_chunk', 0)
                bytes_written = progress.get('bytes_written', 0)
                file_mode = 'ab'
                
                actual_size = os.path.getsize(output_path)
                if actual_size != bytes_written:
                    print(f"警告: 输出文件大小({actual_size})与进度记录({bytes_written})不匹配，将从头开始合并")
                    start_chunk = 0
                    bytes_written = 0
                    file_mode = 'wb'
        
        total_bytes = self.index_manager.index_data.get('original_size', 0)
        if total_bytes == 0:
            total_bytes = sum(c['size'] for c in chunks)
        
        integrity_passed = True
        
        with open(output_path, file_mode) as out_file:
            for i in range(start_chunk, total_chunks):
                chunk_info = chunks[i]
                chunk_data = self._read_and_decrypt_chunk(chunk_info, chunk_dir)
                
                expected_md5 = chunk_info.get('md5', '')
                if expected_md5 and not self._verify_chunk('', expected_md5, chunk_data):
                    integrity_passed = False
                    raise ValueError(f"分片 {chunk_info['filename']} 完整性验证失败，MD5不匹配")
                
                out_file.write(chunk_data)
                bytes_written += len(chunk_data)
                
                self.index_manager.update_merge_progress(
                    current_chunk=i + 1,
                    bytes_written=bytes_written,
                    completed=False
                )
                
                if self.progress_callback:
                    self.progress_callback(bytes_written, total_bytes)
        
        self.index_manager.update_merge_progress(
            current_chunk=total_chunks,
            bytes_written=bytes_written,
            completed=True
        )
        
        if self.verify_integrity:
            expected_md5 = self.index_manager.index_data.get('original_md5', '')
            if expected_md5:
                integrity_passed = verify_md5(output_path, expected_md5)
                if not integrity_passed:
                    raise ValueError(f"合并后文件完整性验证失败，MD5不匹配")
        
        return output_path, integrity_passed
    
    def merge_range(self, start_index: int, end_index: int, output_path: str) -> Tuple[str, int]:
        """
        按分片序号范围提取部分分片合并
        
        Args:
            start_index: 起始序号(包含，从1开始)
            end_index: 结束序号(包含)
            output_path: 输出文件路径
            
        Returns:
            (输出文件路径, 合并的分片数量)
        """
        chunks = self.index_manager.get_chunks_in_range(start_index, end_index)
        if not chunks:
            raise ValueError(f"没有找到序号在 {start_index}-{end_index} 范围内的分片")
        
        output_dir = os.path.dirname(os.path.abspath(output_path))
        os.makedirs(output_dir, exist_ok=True)
        
        chunk_dir = self._get_chunk_dir()
        total_bytes = sum(c['size'] for c in chunks)
        bytes_written = 0
        
        with open(output_path, 'wb') as out_file:
            for chunk_info in chunks:
                chunk_data = self._read_and_decrypt_chunk(chunk_info, chunk_dir)
                
                if self.verify_integrity:
                    expected_md5 = chunk_info.get('md5', '')
                    if expected_md5 and not self._verify_chunk('', expected_md5, chunk_data):
                        raise ValueError(f"分片 {chunk_info['filename']} 完整性验证失败")
                
                out_file.write(chunk_data)
                bytes_written += len(chunk_data)
                
                if self.progress_callback:
                    self.progress_callback(bytes_written, total_bytes)
        
        return output_path, len(chunks)
    
    def verify_all_chunks(self) -> List[Dict[str, Any]]:
        """
        验证所有分片的完整性
        
        Returns:
            验证结果列表，每项包含 index, filename, valid, actual_md5, expected_md5
        """
        chunks = sorted(self.index_manager.index_data['chunks'], key=lambda x: x['index'])
        chunk_dir = self._get_chunk_dir()
        results = []
        
        for chunk_info in chunks:
            chunk_path = os.path.join(chunk_dir, chunk_info['filename'])
            expected_md5 = chunk_info.get('md5', '')
            exists = os.path.exists(chunk_path)
            
            if exists:
                actual_md5 = calculate_md5(chunk_path)
                valid = actual_md5.lower() == expected_md5.lower() if expected_md5 else True
            else:
                actual_md5 = ''
                valid = False
            
            results.append({
                'index': chunk_info['index'],
                'filename': chunk_info['filename'],
                'exists': exists,
                'valid': valid,
                'actual_md5': actual_md5,
                'expected_md5': expected_md5,
                'size': chunk_info.get('size', 0)
            })
        
        return results
