from modules.disassembler import disassemble, get_capstone_arch_mode

# 测试 x86 32位反汇编
data = b'\xb8\x01\x00\x00\x00\xc3'
result = disassemble(data, arch='x86', mode='32')
print('x86 32-bit result:')
print(f'  success: {result["success"]}')
if result['success']:
    for insn in result['instructions']:
        print(f'  0x{insn["address"]:x}: {insn["bytes_hex"]} {insn["mnemonic"]} {insn["op_str"]}')
print()

# 测试架构和模式映射
try:
    arch, mode = get_capstone_arch_mode('x86', '64')
    print(f'get_capstone_arch_mode(x86, 64): ({arch}, {mode})')
    arch, mode = get_capstone_arch_mode('arm', 'thumb')
    print(f'get_capstone_arch_mode(arm, thumb): ({arch}, {mode})')
except Exception as e:
    print(f'Error: {e}')
print()

# 测试无效参数
result = disassemble(data, arch='invalid', mode='32')
print(f'Invalid arch result: success={result["success"]}, error={result["error"]}')

# 测试非字节数据
result = disassemble('not bytes')
print(f'Non-bytes result: success={result["success"]}, error={result["error"]}')
