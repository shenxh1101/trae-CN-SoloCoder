import os


def compare_files(file1, file2):
    result = {
        'file1_size': 0,
        'file2_size': 0,
        'size_difference': 0,
        'identical': False,
        'differing_bytes': [],
        'total_differences': 0
    }

    if not os.path.exists(file1):
        result['error'] = f'File not found: {file1}'
        return result

    if not os.path.exists(file2):
        result['error'] = f'File not found: {file2}'
        return result

    try:
        file1_size = os.path.getsize(file1)
        file2_size = os.path.getsize(file2)

        result['file1_size'] = file1_size
        result['file2_size'] = file2_size
        result['size_difference'] = abs(file1_size - file2_size)

        differing_bytes = []
        total_differences = 0
        max_diff = 1000

        with open(file1, 'rb') as f1, open(file2, 'rb') as f2:
            offset = 0
            chunk_size = 4096

            while True:
                chunk1 = f1.read(chunk_size)
                chunk2 = f2.read(chunk_size)

                if not chunk1 and not chunk2:
                    break

                min_len = min(len(chunk1), len(chunk2))

                for i in range(min_len):
                    if chunk1[i] != chunk2[i]:
                        total_differences += 1
                        if len(differing_bytes) < max_diff:
                            differing_bytes.append({
                                'offset': offset + i,
                                'file1_value': f'{chunk1[i]:02x}',
                                'file2_value': f'{chunk2[i]:02x}'
                            })

                if len(chunk1) > len(chunk2):
                    for i in range(min_len, len(chunk1)):
                        total_differences += 1
                        if len(differing_bytes) < max_diff:
                            differing_bytes.append({
                                'offset': offset + i,
                                'file1_value': f'{chunk1[i]:02x}',
                                'file2_value': '00'
                            })
                elif len(chunk2) > len(chunk1):
                    for i in range(min_len, len(chunk2)):
                        total_differences += 1
                        if len(differing_bytes) < max_diff:
                            differing_bytes.append({
                                'offset': offset + i,
                                'file1_value': '00',
                                'file2_value': f'{chunk2[i]:02x}'
                            })

                offset += chunk_size

        result['differing_bytes'] = differing_bytes
        result['total_differences'] = total_differences
        result['identical'] = (total_differences == 0)

    except Exception as e:
        result['error'] = f'Error comparing files: {str(e)}'

    return result
