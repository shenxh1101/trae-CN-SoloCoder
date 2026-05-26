"""
文件分片器模块
"""
import os
from typing import Optional, Callable, Tuple
from .checksum import calculate_md5, calculate_bytes_md5
from .index import IndexManager
from .crypto import get_encryptor


class FileSplitter:
    """文件分片器"""
    
    def __init__(self, file_path: str, chunk_size_mb: int,
                 output_dir: Optional[str] = None,
                 chunk_extension: str = 'part',
                 encryption_type: str = 'none',
                 password: Optional[str] = None,
                 progress_callback: Optional[Callable[[int, int], None]] = None):
        """
        初始化文件分片器
        
        Args:
            file_path: 要分片的文件路径
            chunk_size_mb: 每个分片的大小(MB)
            output_dir: 输出目录，默认为原文件所在目录
            chunk_extension: 分片文件扩展名，如 'part' 生成 .part1, .part2
            encryption_type: 加密类型 ('none', 'xor', 'aes')
            password: 加密密码
            progress_callback: 进度回调函数 (processed_bytes, total_bytes)
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        self.file_path = file_path
        self.file_size = os.path.getsize(file_path)
        self.chunk_size = chunk_size_mb * 1024 * 1024
        self.chunk_size_mb = chunk_size_mb
        self.chunk_extension = chunk_extension
        self.encryption_type = encryption_type.lower() if encryption_type else 'none'
        self.password = password
        self.progress_callback = progress_callback
        
        if output_dir:
            self.output_dir = output_dir
        else:
            self.output_dir = os.path.dirname(os.path.abspath(file_path))
        
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.base_filename = os.path.splitext(os.path.basename(file_path))[0]
        self.index_manager = IndexManager()
        self.encryptor = None
        
        if self.encryption_type != 'none':
            if not password:
                raise ValueError("加密需要提供密码")
            self.encryptor = get_encryptor(self.encryption_type, password)
    
    def _get_chunk_filename(self, index: int) -> str:
        """
        生成分片文件名
        
        Args:
            index: 分片序号(从1开始)
            
        Returns:
            分片文件名
        """
        return f"{self.base_filename}.{self.chunk_extension}{index}"
    
    def split(self) -> Tuple[str, int]:
        """
        执行分片操作
        
        Returns:
            (索引文件路径, 分片数量)
        """
        original_md5 = calculate_md5(self.file_path)
        
        self.index_manager.set_original_file_info(
            file_path=self.file_path,
            file_size=self.file_size,
            file_md5=original_md5,
            chunk_size_mb=self.chunk_size_mb,
            chunk_extension=self.chunk_extension,
            encryption_type=self.encryption_type
        )
        
        chunk_index = 1
        bytes_processed = 0
        
        with open(self.file_path, 'rb') as f:
            while True:
                chunk_data = f.read(self.chunk_size)
                if not chunk_data:
                    break
                
                chunk_md5 = calculate_bytes_md5(chunk_data)
                
                if self.encryptor:
                    chunk_data = self.encryptor.encrypt(chunk_data)
                
                chunk_filename = self._get_chunk_filename(chunk_index)
                chunk_path = os.path.join(self.output_dir, chunk_filename)
                
                with open(chunk_path, 'wb') as chunk_file:
                    chunk_file.write(chunk_data)
                
                chunk_size = len(chunk_data)
                start_byte = bytes_processed
                end_byte = bytes_processed + self.chunk_size - 1
                if end_byte >= self.file_size:
                    end_byte = self.file_size - 1
                
                self.index_manager.add_chunk(
                    index=chunk_index,
                    filename=chunk_filename,
                    size=chunk_size,
                    md5=chunk_md5,
                    start_byte=start_byte,
                    end_byte=end_byte
                )
                
                bytes_processed += self.chunk_size
                if bytes_processed > self.file_size:
                    bytes_processed = self.file_size
                
                if self.progress_callback:
                    self.progress_callback(bytes_processed, self.file_size)
                
                chunk_index += 1
        
        index_filename = f"{self.base_filename}.index.json"
        index_path = os.path.join(self.output_dir, index_filename)
        self.index_manager.save(index_path)
        
        return index_path, chunk_index - 1
    
    def get_index_manager(self) -> IndexManager:
        """
        获取索引管理器
        
        Returns:
            索引管理器实例
        """
        return self.index_manager
