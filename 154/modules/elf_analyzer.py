import os

try:
    from elftools.elf.elffile import ELFFile
    from elftools.elf.constants import P_FLAGS
    PYELFTOOLS_AVAILABLE = True
except ImportError:
    PYELFTOOLS_AVAILABLE = False


def analyze_elf(file_path):
    result = {
        'is_elf': False,
        'program_headers': [],
        'section_headers': [],
        'dynamic_segment': [],
        'error': None
    }

    if not PYELFTOOLS_AVAILABLE:
        result['error'] = 'pyelftools library is not installed. Please install it with: pip install pyelftools'
        return result

    if not os.path.exists(file_path):
        result['error'] = f'File not found: {file_path}'
        return result

    try:
        with open(file_path, 'rb') as f:
            elf = ELFFile(f)
            result['is_elf'] = True

            for i in range(elf.num_segments()):
                segment = elf.get_segment(i)
                header = segment.header
                flags_str = ''
                flags = header.p_flags
                if flags & P_FLAGS.PF_R:
                    flags_str += 'R'
                if flags & P_FLAGS.PF_W:
                    flags_str += 'W'
                if flags & P_FLAGS.PF_X:
                    flags_str += 'E'

                ph_dict = {
                    'type': header.p_type,
                    'offset': hex(header.p_offset),
                    'vaddr': hex(header.p_vaddr),
                    'paddr': hex(header.p_paddr),
                    'filesz': hex(header.p_filesz),
                    'memsz': hex(header.p_memsz),
                    'flags': flags_str
                }
                result['program_headers'].append(ph_dict)

            for i in range(elf.num_sections()):
                section = elf.get_section(i)
                header = section.header
                sh_dict = {
                    'name': section.name,
                    'type': header.sh_type,
                    'offset': hex(header.sh_offset),
                    'addr': hex(header.sh_addr),
                    'size': hex(header.sh_size),
                    'flags': hex(header.sh_flags)
                }
                result['section_headers'].append(sh_dict)

            dynamic = elf.get_section_by_name('.dynamic')
            if dynamic:
                for tag in dynamic.iter_tags():
                    dyn_dict = {
                        'tag': tag.entry.d_tag,
                        'value': hex(tag.entry.d_val) if hasattr(tag.entry, 'd_val') else str(tag.entry.d_un)
                    }
                    result['dynamic_segment'].append(dyn_dict)

    except Exception as e:
        error_msg = str(e)
        if 'magic' in error_msg.lower():
            result['is_elf'] = False
            result['error'] = None
        else:
            result['error'] = f'Error analyzing ELF file: {error_msg}'

    return result
