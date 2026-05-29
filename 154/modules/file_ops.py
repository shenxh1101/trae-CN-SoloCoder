import os
from typing import List

CHUNK_SIZE = 64 * 1024


def split_file(file_path: str, split_offset: int, output_dir: str = '.') -> tuple:
    file_name = os.path.basename(file_path)
    part1_path = os.path.join(output_dir, f'{file_name}.part1')
    part2_path = os.path.join(output_dir, f'{file_name}.part2')

    with open(file_path, 'rb') as f_in:
        bytes_remaining = split_offset
        with open(part1_path, 'wb') as f_out1:
            while bytes_remaining > 0:
                chunk_size = min(CHUNK_SIZE, bytes_remaining)
                chunk = f_in.read(chunk_size)
                if not chunk:
                    break
                f_out1.write(chunk)
                bytes_remaining -= len(chunk)

        with open(part2_path, 'wb') as f_out2:
            while True:
                chunk = f_in.read(CHUNK_SIZE)
                if not chunk:
                    break
                f_out2.write(chunk)

    return part1_path, part2_path


def merge_files(input_files: List[str], output_path: str) -> str:
    with open(output_path, 'wb') as f_out:
        for input_file in input_files:
            with open(input_file, 'rb') as f_in:
                while True:
                    chunk = f_in.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    f_out.write(chunk)

    return output_path
