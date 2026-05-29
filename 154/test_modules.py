from modules.hexview import hex_view, paginate_hex_view
from modules.searcher import search_hex_pattern, search_string, hex_pattern_to_bytes

# 测试 hex_view
data = b'Hello World\x00\x00\x00\x00\x00'
lines = hex_view(data)
print('=== hex_view 测试 ===')
for line in lines:
    print(line)

# 测试 hex_pattern_to_bytes
print('\n=== hex_pattern_to_bytes 测试 ===')
print(repr(hex_pattern_to_bytes('48 65 6c 6c 6f')))
print(repr(hex_pattern_to_bytes('48656c6c6f')))
print(repr(hex_pattern_to_bytes('48:65:6c:6c:6f')))

# 测试 search_hex_pattern
print('\n=== search_hex_pattern 测试 ===')
data = b'Hello Hello World'
print(search_hex_pattern(data, '48 65 6c 6c 6f'))

# 测试 search_string
print('\n=== search_string 测试 ===')
data = b'Hello hello HELLO World'
print(search_string(data, 'hello'))
print(search_string(data, 'hello', case_sensitive=False))

# 测试 paginate_hex_view
print('\n=== paginate_hex_view 测试 ===')
data = bytes(range(256))
pages = list(paginate_hex_view(data, page_size=64))
print(f'总页数: {len(pages)}')
print(f'第1页行数: {len(pages[0])}')
print('第1页第1行:', pages[0][0])
print('第2页第1行:', pages[1][0])
