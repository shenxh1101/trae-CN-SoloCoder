import os

try:
    import pefile
    PEFILE_AVAILABLE = True
except ImportError:
    PEFILE_AVAILABLE = False


def analyze_pe(file_path):
    result = {
        'is_pe': False,
        'sections': [],
        'imports': [],
        'exports': [],
        'error': None
    }

    if not PEFILE_AVAILABLE:
        result['error'] = 'pefile library is not installed. Please install it with: pip install pefile'
        return result

    if not os.path.exists(file_path):
        result['error'] = f'File not found: {file_path}'
        return result

    try:
        pe = pefile.PE(file_path)
        result['is_pe'] = True

        for section in pe.sections:
            section_dict = {
                'name': section.Name.decode('utf-8', errors='replace').rstrip('\x00'),
                'virtual_address': hex(section.VirtualAddress),
                'virtual_size': hex(section.Misc_VirtualSize),
                'raw_offset': hex(section.PointerToRawData),
                'raw_size': hex(section.SizeOfRawData),
                'characteristics': hex(section.Characteristics)
            }
            result['sections'].append(section_dict)

        if hasattr(pe, 'DIRECTORY_ENTRY_IMPORT'):
            for entry in pe.DIRECTORY_ENTRY_IMPORT:
                dll_name = entry.dll.decode('utf-8', errors='replace')
                functions = []
                for imp in entry.imports:
                    if imp.name:
                        functions.append(imp.name.decode('utf-8', errors='replace'))
                    else:
                        functions.append(f'ordinal_{imp.ordinal}')
                result['imports'].append({
                    'dll_name': dll_name,
                    'functions': functions
                })

        if hasattr(pe, 'DIRECTORY_ENTRY_EXPORT'):
            for exp in pe.DIRECTORY_ENTRY_EXPORT.symbols:
                export_dict = {
                    'name': exp.name.decode('utf-8', errors='replace') if exp.name else f'ordinal_{exp.ordinal}',
                    'address': hex(pe.OPTIONAL_HEADER.ImageBase + exp.address),
                    'ordinal': exp.ordinal
                }
                result['exports'].append(export_dict)

        pe.close()

    except Exception as e:
        error_msg = str(e)
        if 'magic' in error_msg.lower() or 'DOS Header' in error_msg:
            result['is_pe'] = False
            result['error'] = None
        else:
            result['error'] = f'Error analyzing PE file: {error_msg}'

    return result
