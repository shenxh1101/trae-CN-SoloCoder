"""
索引管理模块 - 处理索引文件的生成、读取、JSON导入导出
"""
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime


class IndexManager:
    """索引管理器"""
    
    def __init__(self, index_file_path: Optional[str] = None):
        """
        初始化索引管理器
        
        Args:
            index_file_path: 索引文件路径
        """
        self.index_file_path = index_file_path
        self.index_data: Dict[str, Any] = {
            'version': '1.0',
            'created_at': datetime.now().isoformat(),
            'original_file': '',
            'original_size': 0,
            'original_md5': '',
            'chunk_size_mb': 0,
            'total_chunks': 0,
            'encryption_type': 'none',
            'chunk_extension': 'part',
            'chunks': [],
            'merge_progress': {
                'current_chunk': 0,
                'bytes_written': 0,
                'completed': False
            }
        }
    
    def set_original_file_info(self, file_path: str, file_size: int, file_md5: str,
                                chunk_size_mb: int, chunk_extension: str = 'part',
                                encryption_type: str = 'none') -> None:
        """
        设置原始文件信息
        
        Args:
            file_path: 原始文件路径
            file_size: 原始文件大小
            file_md5: 原始文件MD5
            chunk_size_mb: 分片大小(MB)
            chunk_extension: 分片文件扩展名
            encryption_type: 加密类型
        """
        self.index_data['original_file'] = os.path.basename(file_path)
        self.index_data['original_size'] = file_size
        self.index_data['original_md5'] = file_md5
        self.index_data['chunk_size_mb'] = chunk_size_mb
        self.index_data['chunk_extension'] = chunk_extension
        self.index_data['encryption_type'] = encryption_type
    
    def add_chunk(self, index: int, filename: str, size: int, md5: str,
                  start_byte: int, end_byte: int) -> None:
        """
        添加分片信息
        
        Args:
            index: 分片序号(从0开始)
            filename: 分片文件名
            size: 分片大小
            md5: 分片MD5
            start_byte: 在原始文件中的起始字节
            end_byte: 在原始文件中的结束字节
        """
        chunk_info = {
            'index': index,
            'filename': filename,
            'size': size,
            'md5': md5,
            'start_byte': start_byte,
            'end_byte': end_byte
        }
        self.index_data['chunks'].append(chunk_info)
        self.index_data['total_chunks'] = len(self.index_data['chunks'])
    
    def sort_chunks(self) -> None:
        """按序号排序分片"""
        self.index_data['chunks'].sort(key=lambda x: x['index'])
    
    def save(self, index_file_path: Optional[str] = None) -> str:
        """
        保存索引文件
        
        Args:
            index_file_path: 索引文件路径，如果为None则使用默认路径
            
        Returns:
            索引文件路径
        """
        path = index_file_path or self.index_file_path
        if path is None:
            raise ValueError("索引文件路径未指定")
        
        self.sort_chunks()
        self.index_data['updated_at'] = datetime.now().isoformat()
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(self.index_data, f, indent=2, ensure_ascii=False)
        
        self.index_file_path = path
        return path
    
    def load(self, index_file_path: Optional[str] = None) -> Dict[str, Any]:
        """
        加载索引文件
        
        Args:
            index_file_path: 索引文件路径，如果为None则使用默认路径
            
        Returns:
            索引数据
        """
        path = index_file_path or self.index_file_path
        if path is None:
            raise ValueError("索引文件路径未指定")
        if not os.path.exists(path):
            raise FileNotFoundError(f"索引文件不存在: {path}")
        
        with open(path, 'r', encoding='utf-8') as f:
            self.index_data = json.load(f)
        
        self.index_file_path = path
        return self.index_data
    
    def export_json(self, export_path: str) -> str:
        """
        导出索引为JSON格式
        
        Args:
            export_path: 导出文件路径
            
        Returns:
            导出文件路径
        """
        self.sort_chunks()
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(self.index_data, f, indent=2, ensure_ascii=False)
        return export_path
    
    def import_json(self, import_path: str) -> Dict[str, Any]:
        """
        从JSON文件导入索引
        
        Args:
            import_path: 导入文件路径
            
        Returns:
            索引数据
        """
        with open(import_path, 'r', encoding='utf-8') as f:
            self.index_data = json.load(f)
        self.index_file_path = import_path
        return self.index_data
    
    def import_from_text(self, text_file_path: str) -> List[str]:
        """
        从文本文件读取分片列表
        
        Args:
            text_file_path: 文本文件路径，每行一个分片文件路径
            
        Returns:
            分片文件路径列表
        """
        if not os.path.exists(text_file_path):
            raise FileNotFoundError(f"文本文件不存在: {text_file_path}")
        
        chunks = []
        with open(text_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    chunks.append(line)
        
        return chunks
    
    def update_merge_progress(self, current_chunk: int, bytes_written: int, completed: bool = False) -> None:
        """
        更新合并进度（用于断点续传）
        
        Args:
            current_chunk: 当前正在处理的分片序号
            bytes_written: 已写入的字节数
            completed: 是否完成
        """
        self.index_data['merge_progress'] = {
            'current_chunk': current_chunk,
            'bytes_written': bytes_written,
            'completed': completed,
            'updated_at': datetime.now().isoformat()
        }
        if self.index_file_path:
            self.save()
    
    def get_merge_progress(self) -> Dict[str, Any]:
        """
        获取合并进度
        
        Returns:
            合并进度信息
        """
        return self.index_data.get('merge_progress', {
            'current_chunk': 0,
            'bytes_written': 0,
            'completed': False
        })
    
    def get_chunks_in_range(self, start_index: int, end_index: int) -> List[Dict[str, Any]]:
        """
        获取指定序号范围内的分片
        
        Args:
            start_index: 起始序号(包含)
            end_index: 结束序号(包含)
            
        Returns:
            分片信息列表
        """
        self.sort_chunks()
        return [
            chunk for chunk in self.index_data['chunks']
            if start_index <= chunk['index'] <= end_index
        ]
    
    def get_chunk_dir(self) -> str:
        """
        获取分片文件所在目录
        
        Returns:
            目录路径
        """
        if self.index_file_path:
            return os.path.dirname(os.path.abspath(self.index_file_path))
        return os.getcwd()
    
    def get_chunk_path(self, chunk_filename: str) -> str:
        """
        获取分片文件的完整路径
        
        Args:
            chunk_filename: 分片文件名
            
        Returns:
            分片文件完整路径
        """
        chunk_dir = self.get_chunk_dir()
        return os.path.join(chunk_dir, chunk_filename)
