try:
    import capstone
    from capstone import (
        CS_ARCH_X86, CS_ARCH_ARM,
        CS_MODE_32, CS_MODE_64, CS_MODE_ARM, CS_MODE_THUMB,
        CS_OPT_SYNTAX, CS_OPT_SYNTAX_INTEL
    )
    CAPSTONE_AVAILABLE = True
except ImportError:
    capstone = None
    CS_ARCH_X86 = None
    CS_ARCH_ARM = None
    CS_MODE_32 = None
    CS_MODE_64 = None
    CS_MODE_ARM = None
    CS_MODE_THUMB = None
    CS_OPT_SYNTAX = None
    CS_OPT_SYNTAX_INTEL = None
    CAPSTONE_AVAILABLE = False


def get_capstone_arch_mode(arch, mode):
    if not CAPSTONE_AVAILABLE:
        raise ImportError("capstone library is not installed")

    arch_map = {
        'x86': CS_ARCH_X86,
        'arm': CS_ARCH_ARM,
    }

    mode_map = {
        'x86': {
            '32': CS_MODE_32,
            '64': CS_MODE_64,
        },
        'arm': {
            'arm': CS_MODE_ARM,
            'thumb': CS_MODE_THUMB,
        },
    }

    if arch not in arch_map:
        raise ValueError(f"Unsupported architecture: {arch}. Use 'x86' or 'arm'")

    if arch not in mode_map or mode not in mode_map[arch]:
        valid_modes = ', '.join(mode_map.get(arch, {}).keys())
        raise ValueError(f"Unsupported mode '{mode}' for architecture '{arch}'. Valid modes: {valid_modes}")

    return arch_map[arch], mode_map[arch][mode]


def disassemble(data, offset=0, arch='x86', mode='32', count=100):
    if not CAPSTONE_AVAILABLE:
        return {
            'success': False,
            'instructions': [],
            'error': "capstone library is not installed. Install it with: pip install capstone"
        }

    if not isinstance(data, (bytes, bytearray)):
        return {
            'success': False,
            'instructions': [],
            'error': "data must be bytes or bytearray"
        }

    try:
        cs_arch, cs_mode = get_capstone_arch_mode(arch, mode)
    except (ValueError, ImportError) as e:
        return {
            'success': False,
            'instructions': [],
            'error': str(e)
        }

    try:
        md = capstone.Cs(cs_arch, cs_mode)
        md.syntax = CS_OPT_SYNTAX_INTEL
        md.detail = True

        instructions = []
        for insn in md.disasm(bytes(data), offset):
            if len(instructions) >= count:
                break
            instructions.append({
                'address': insn.address,
                'bytes_hex': insn.bytes.hex(),
                'mnemonic': insn.mnemonic,
                'op_str': insn.op_str,
            })

        return {
            'success': True,
            'instructions': instructions,
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'instructions': [],
            'error': f"Disassembly failed: {str(e)}"
        }
