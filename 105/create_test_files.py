#!/usr/bin/env python3
import os
import urllib.request
from pathlib import Path
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, TCON, APIC
from PIL import Image, ImageDraw


def download_sample_mp3(output_path, url='https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'):
    if Path(output_path).exists():
        return output_path
    print(f'  Downloading sample MP3 from {url}...')
    urllib.request.urlretrieve(url, output_path)
    return output_path


def create_test_cover(output_path):
    img = Image.new('RGB', (300, 300), color=(73, 109, 137))
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 290, 290], fill=(255, 200, 100), outline=(0, 0, 0), width=5)
    draw.rectangle([50, 50, 250, 250], fill=(100, 200, 150), outline=(0, 0, 0), width=3)
    img.save(output_path, 'JPEG')
    return output_path


def set_mp3_metadata(file_path, title, artist, album, year, genre):
    id3 = ID3(file_path)
    id3.delete()
    id3.add(TIT2(encoding=3, text=title))
    id3.add(TPE1(encoding=3, text=artist))
    id3.add(TALB(encoding=3, text=album))
    id3.add(TDRC(encoding=3, text=year))
    id3.add(TCON(encoding=3, text=genre))
    id3.save(file_path)


def add_mp3_cover(file_path, cover_path):
    with open(cover_path, 'rb') as f:
        cover_data = f.read()
    id3 = ID3(file_path)
    id3.add(APIC(
        encoding=3,
        mime='image/jpeg',
        type=3,
        desc='Cover',
        data=cover_data
    ))
    id3.save(file_path)


def clear_metadata(file_path):
    id3 = ID3(file_path)
    id3.delete()
    id3.save(file_path)


def main():
    test_dir = Path('test_audio')
    test_dir.mkdir(exist_ok=True)

    print('Downloading base sample MP3...')
    base_mp3 = test_dir / '_base_sample.mp3'
    download_sample_mp3(str(base_mp3))
    clear_metadata(str(base_mp3))

    print('\nCreating test cover image...')
    cover_path = test_dir / 'cover.jpg'
    create_test_cover(str(cover_path))
    print(f'  Created: {cover_path}')

    print('\nCreating test MP3 file with full metadata and cover...')
    mp3_path = test_dir / 'test_song.mp3'
    mp3_path.write_bytes(base_mp3.read_bytes())
    set_mp3_metadata(str(mp3_path), '测试标题', '测试艺术家', '测试专辑', '2024', '流行')
    add_mp3_cover(str(mp3_path), str(cover_path))
    print(f'  Created: {mp3_path}')

    print('\nCreating second test MP3 file...')
    mp3_path2 = test_dir / 'test_song2.mp3'
    mp3_path2.write_bytes(base_mp3.read_bytes())
    set_mp3_metadata(str(mp3_path2), 'Another Song', 'Another Artist', 'Best Hits', '2023', 'Rock')
    add_mp3_cover(str(mp3_path2), str(cover_path))
    print(f'  Created: {mp3_path2}')

    print('\nCreating files for autofill test...')
    auto1 = test_dir / '周杰伦-七里香.mp3'
    auto1.write_bytes(base_mp3.read_bytes())
    clear_metadata(str(auto1))
    auto2 = test_dir / '林俊杰-江南.mp3'
    auto2.write_bytes(base_mp3.read_bytes())
    clear_metadata(str(auto2))
    print('  Created: 周杰伦-七里香.mp3, 林俊杰-江南.mp3')

    print('\nCreating files for batch edit test...')
    batch1 = test_dir / 'batch1.mp3'
    batch1.write_bytes(base_mp3.read_bytes())
    clear_metadata(str(batch1))
    batch2 = test_dir / 'batch2.mp3'
    batch2.write_bytes(base_mp3.read_bytes())
    clear_metadata(str(batch2))
    batch3 = test_dir / 'batch3.mp3'
    batch3.write_bytes(base_mp3.read_bytes())
    clear_metadata(str(batch3))
    print('  Created: batch1.mp3, batch2.mp3, batch3.mp3')

    print('\nCreating file for clean test...')
    clean_test = test_dir / 'empty_tags.mp3'
    clean_test.write_bytes(base_mp3.read_bytes())
    id3 = ID3()
    id3.add(TIT2(encoding=3, text=''))
    id3.add(TPE1(encoding=3, text='   '))
    id3.add(TALB(encoding=3, text='Valid Album'))
    id3.save(str(clean_test))
    print('  Created: empty_tags.mp3')

    print('\nCreating file without cover for add-cover test...')
    no_cover = test_dir / 'no_cover.mp3'
    no_cover.write_bytes(base_mp3.read_bytes())
    set_mp3_metadata(str(no_cover), 'No Cover Song', 'Test Artist', 'Album', '2024', 'Pop')
    print('  Created: no_cover.mp3')

    base_mp3.unlink()

    print('\n' + '='*50)
    print('Test files created successfully!')
    print(f'Test directory: {test_dir.absolute()}')
    print('='*50)


if __name__ == '__main__':
    main()
