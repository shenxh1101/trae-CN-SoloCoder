import os
import io
import zipfile
import shutil
import hashlib
import markdown
from datetime import datetime, timedelta
from typing import Tuple, Optional, Dict, List
from config import Config
from pygments import highlight
from pygments.lexers import get_lexer_for_filename, guess_lexer, get_lexer_by_name
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound

def human_readable_size(size_bytes: int) -> str:
    if size_bytes == 0:
        return '0 B'
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    i = 0
    while size_bytes >= 1024 and i < len(units) - 1:
        size_bytes /= 1024
        i += 1
    return f'{size_bytes:.2f} {units[i]}'

def get_file_extension(filename: str) -> str:
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

def get_preview_type(filename: str) -> Optional[str]:
    ext = get_file_extension(filename)
    for preview_type, extensions in Config.ALLOWED_PREVIEW_EXTENSIONS.items():
        if ext in extensions:
            return preview_type
    return None

def get_file_type_category(filename: str) -> str:
    ext = get_file_extension(filename)
    image_exts = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'}
    doc_exts = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'}
    video_exts = {'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'}
    audio_exts = {'mp3', 'wav', 'flac', 'aac', 'ogg'}
    archive_exts = {'zip', 'rar', '7z', 'tar', 'gz', 'bz2'}
    code_exts = {'py', 'js', 'ts', 'html', 'css', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'rb', 'php', 'sh', 'bash', 'json', 'xml', 'yaml', 'yml'}
    
    if ext in image_exts:
        return 'image'
    elif ext in doc_exts:
        return 'document'
    elif ext in video_exts:
        return 'video'
    elif ext in audio_exts:
        return 'audio'
    elif ext in archive_exts:
        return 'archive'
    elif ext in code_exts:
        return 'code'
    else:
        return 'other'

def format_datetime(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        return iso_str

def get_remaining_time(expires_at: Optional[str]) -> Optional[str]:
    if not expires_at:
        return '永不过期'
    try:
        exp_dt = datetime.fromisoformat(expires_at)
        now = datetime.now()
        remaining = exp_dt - now
        if remaining.total_seconds() <= 0:
            return '已过期'
        days = remaining.days
        hours = remaining.seconds // 3600
        minutes = (remaining.seconds % 3600) // 60
        if days > 0:
            return f'{days}天{hours}小时'
        elif hours > 0:
            return f'{hours}小时{minutes}分钟'
        else:
            return f'{minutes}分钟'
    except (ValueError, TypeError):
        return None

def calculate_expiration(expiration_option: str) -> Optional[str]:
    delta = Config.EXPIRATION_OPTIONS.get(expiration_option)
    if delta is None:
        return None
    return (datetime.now() + delta).isoformat()

def render_text_preview(file_path: str, filename: str) -> Dict:
    ext = get_file_extension(filename)
    preview_type = get_preview_type(filename)
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read(2 * 1024 * 1024)
        
        if preview_type == 'markdown':
            html_content = markdown.markdown(content, extensions=['fenced_code', 'tables', 'toc'])
            return {
                'type': 'markdown',
                'content': html_content,
                'raw': content
            }
        elif preview_type == 'code' or ext in Config.ALLOWED_PREVIEW_EXTENSIONS.get('code', set()):
            try:
                lexer = get_lexer_for_filename(filename)
            except ClassNotFound:
                try:
                    lexer = guess_lexer(content)
                except ClassNotFound:
                    lexer = get_lexer_by_name('text')
            formatter = HtmlFormatter(linenos=True, cssclass='code-preview')
            highlighted = highlight(content, lexer, formatter)
            css = formatter.get_style_defs('.code-preview')
            return {
                'type': 'code',
                'content': highlighted,
                'css': css,
                'raw': content
            }
        else:
            return {
                'type': 'text',
                'content': content,
                'raw': content
            }
    except Exception as e:
        return {
            'type': 'error',
            'content': f'无法预览文件: {str(e)}'
        }

def render_image_preview(file_path: str) -> Dict:
    return {
        'type': 'image',
        'path': file_path
    }

def render_pdf_preview(file_path: str) -> Dict:
    return {
        'type': 'pdf',
        'path': file_path
    }

def get_file_preview(file_path: str, filename: str) -> Optional[Dict]:
    preview_type = get_preview_type(filename)
    if not preview_type:
        return None
    
    if preview_type == 'image':
        return render_image_preview(file_path)
    elif preview_type == 'pdf':
        return render_pdf_preview(file_path)
    elif preview_type in ['text', 'markdown', 'code']:
        return render_text_preview(file_path, filename)
    return None

def compute_file_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for byte_block in iter(lambda: f.read(4096), b''):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def safe_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename.strip()

def create_unique_folder(base_path: str) -> str:
    folder_name = hashlib.md5(datetime.now().isoformat().encode()).hexdigest()[:16]
    folder_path = os.path.join(base_path, folder_name)
    os.makedirs(folder_path, exist_ok=True)
    return folder_path

def zip_directory(dir_path: str, zip_path: str) -> str:
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, dir_path)
                zipf.write(file_path, arcname)
    return zip_path

def get_directory_size(dir_path: str) -> int:
    total = 0
    for entry in os.scandir(dir_path):
        if entry.is_file():
            total += entry.stat().st_size
        elif entry.is_dir():
            total += get_directory_size(entry.path)
    return total

def is_file_expired(file_info: Dict) -> bool:
    if file_info.get('expires_at'):
        try:
            exp_dt = datetime.fromisoformat(file_info['expires_at'])
            if datetime.now() >= exp_dt:
                return True
        except (ValueError, TypeError):
            pass
    if file_info.get('max_downloads') and file_info.get('download_count', 0) >= file_info['max_downloads']:
        return True
    return False

def parse_tags(tags_str: str) -> List[str]:
    if not tags_str:
        return []
    tags = [tag.strip() for tag in tags_str.split(',')]
    return [tag for tag in tags if tag]

def get_storage_stats(files: List[Dict]) -> Dict:
    total_size = 0
    type_count = {}
    for f in files:
        size = f.get('size', 0)
        total_size += size
        category = get_file_type_category(f.get('original_name', ''))
        type_count[category] = type_count.get(category, 0) + 1
    return {
        'total_files': len(files),
        'total_size': total_size,
        'total_size_human': human_readable_size(total_size),
        'type_distribution': type_count
    }

def merge_chunks(chunk_dir: str, output_path: str, expected_size: int = None) -> bool:
    try:
        with open(output_path, 'wb') as outfile:
            chunks = sorted(os.listdir(chunk_dir), key=lambda x: int(x.split('_')[-1]))
            for chunk in chunks:
                chunk_path = os.path.join(chunk_dir, chunk)
                with open(chunk_path, 'rb') as infile:
                    shutil.copyfileobj(infile, outfile)
        
        if expected_size:
            actual_size = os.path.getsize(output_path)
            if actual_size != expected_size:
                return False
        
        shutil.rmtree(chunk_dir)
        return True
    except Exception:
        return False

def get_uploaded_chunks(upload_id: str) -> List[int]:
    chunk_dir = os.path.join(Config.CHUNK_FOLDER, upload_id)
    if not os.path.exists(chunk_dir):
        return []
    chunks = []
    for filename in os.listdir(chunk_dir):
        try:
            chunk_num = int(filename.split('_')[-1])
            chunks.append(chunk_num)
        except (ValueError, IndexError):
            continue
    return sorted(chunks)
