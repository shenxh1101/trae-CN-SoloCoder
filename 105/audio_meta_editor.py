#!/usr/bin/env python3
import os
import shutil
import json
import csv
import re
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

import click
from mutagen import File
from mutagen.mp3 import MP3
from mutagen.flac import FLAC, Picture
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, TCON, APIC, ID3NoHeaderError
from mutagen.easyid3 import EasyID3


SUPPORTED_FORMATS = ('.mp3', '.flac')


def backup_file(file_path: str) -> str:
    path = Path(file_path)
    backup_path = path.with_suffix(f'{path.suffix}.bak')
    counter = 1
    while backup_path.exists():
        backup_path = path.with_suffix(f'.bak{counter}{path.suffix}')
        counter += 1
    shutil.copy2(file_path, backup_path)
    return str(backup_path)


def get_audio_files(path: str, recursive: bool = True) -> List[str]:
    path = Path(path)
    files = []
    if path.is_file():
        if path.suffix.lower() in SUPPORTED_FORMATS:
            files.append(str(path))
    elif path.is_dir():
        pattern = '**/*' if recursive else '*'
        for f in path.glob(pattern):
            if f.is_file() and f.suffix.lower() in SUPPORTED_FORMATS:
                files.append(str(f))
    return sorted(files)


def read_metadata(file_path: str) -> Dict[str, Any]:
    result = {
        'file': file_path,
        'format': None,
        'technical': {},
        'tags': {},
        'has_cover': False
    }

    try:
        audio = File(file_path)
        if audio is None:
            return result

        if isinstance(audio, MP3):
            result['format'] = 'MP3'
            result['technical'] = {
                'bitrate': audio.info.bitrate,
                'sample_rate': audio.info.sample_rate,
                'channels': audio.info.channels,
                'duration': audio.info.length,
                'duration_str': format_duration(audio.info.length)
            }
            result['tags'] = read_mp3_tags(audio)
            result['has_cover'] = has_mp3_cover(audio)

        elif isinstance(audio, FLAC):
            result['format'] = 'FLAC'
            result['technical'] = {
                'bitrate': audio.info.bitrate,
                'sample_rate': audio.info.sample_rate,
                'channels': audio.info.channels,
                'duration': audio.info.length,
                'duration_str': format_duration(audio.info.length),
                'bits_per_sample': audio.info.bits_per_sample
            }
            result['tags'] = dict(audio.tags) if audio.tags else {}
            result['has_cover'] = len(audio.pictures) > 0

    except Exception as e:
        result['error'] = str(e)

    return result


def read_mp3_tags(audio: MP3) -> Dict[str, str]:
    tags = {}
    try:
        id3 = EasyID3(audio.filename)
        tag_mapping = {
            'title': 'title',
            'artist': 'artist',
            'album': 'album',
            'date': 'date',
            'genre': 'genre',
            'tracknumber': 'tracknumber',
            'discnumber': 'discnumber',
            'composer': 'composer',
            'performer': 'performer'
        }
        for key, display_name in tag_mapping.items():
            if key in id3:
                value = id3[key]
                if isinstance(value, list) and value:
                    tags[display_name] = value[0]
                else:
                    tags[display_name] = str(value)
    except ID3NoHeaderError:
        pass
    return tags


def has_mp3_cover(audio: MP3) -> bool:
    try:
        id3 = ID3(audio.filename)
        for tag in id3.values():
            if isinstance(tag, APIC):
                return True
    except ID3NoHeaderError:
        pass
    return False


def format_duration(seconds: float) -> str:
    minutes, secs = divmod(int(seconds), 60)
    hours, minutes = divmod(minutes, 60)
    if hours > 0:
        return f'{hours}:{minutes:02d}:{secs:02d}'
    return f'{minutes}:{secs:02d}'


def write_metadata(file_path: str, tags: Dict[str, str], backup: bool = True) -> Tuple[bool, str]:
    if backup:
        backup_file(file_path)

    ext = Path(file_path).suffix.lower()

    try:
        if ext == '.mp3':
            write_mp3_tags(file_path, tags)
        elif ext == '.flac':
            write_flac_tags(file_path, tags)
        return True, 'Success'
    except Exception as e:
        return False, str(e)


def write_mp3_tags(file_path: str, tags: Dict[str, str]):
    try:
        id3 = EasyID3(file_path)
    except ID3NoHeaderError:
        id3 = EasyID3()

    tag_mapping = {
        'title': 'title',
        'artist': 'artist',
        'album': 'album',
        'year': 'date',
        'date': 'date',
        'genre': 'genre',
        'tracknumber': 'tracknumber',
        'discnumber': 'discnumber',
        'composer': 'composer',
        'performer': 'performer'
    }

    for key, value in tags.items():
        key_lower = key.lower()
        if key_lower in tag_mapping and value is not None:
            id3[tag_mapping[key_lower]] = str(value)

    id3.save(file_path)


def write_flac_tags(file_path: str, tags: Dict[str, str]):
    audio = FLAC(file_path)
    for key, value in tags.items():
        if value is not None:
            audio[key] = str(value)
    audio.save()


def delete_tags(file_path: str, fields: List[str], backup: bool = True) -> Tuple[bool, str]:
    if backup:
        backup_file(file_path)

    ext = Path(file_path).suffix.lower()

    try:
        if ext == '.mp3':
            delete_mp3_tags(file_path, fields)
        elif ext == '.flac':
            delete_flac_tags(file_path, fields)
        return True, 'Success'
    except Exception as e:
        return False, str(e)


def delete_mp3_tags(file_path: str, fields: List[str]):
    try:
        id3 = EasyID3(file_path)
    except ID3NoHeaderError:
        return

    tag_mapping = {
        'title': 'title',
        'artist': 'artist',
        'album': 'album',
        'year': 'date',
        'date': 'date',
        'genre': 'genre',
        'tracknumber': 'tracknumber',
        'discnumber': 'discnumber',
        'composer': 'composer',
        'performer': 'performer'
    }

    for field in fields:
        field_lower = field.lower()
        if field_lower in tag_mapping:
            id3.pop(tag_mapping[field_lower], None)

    id3.save(file_path)


def delete_flac_tags(file_path: str, fields: List[str]):
    audio = FLAC(file_path)
    for field in fields:
        if field in audio:
            del audio[field]
    audio.save()


def extract_cover(file_path: str, output_path: Optional[str] = None) -> Tuple[bool, str]:
    ext = Path(file_path).suffix.lower()

    try:
        if ext == '.mp3':
            return extract_mp3_cover(file_path, output_path)
        elif ext == '.flac':
            return extract_flac_cover(file_path, output_path)
    except Exception as e:
        return False, str(e)

    return False, 'Unsupported format'


def extract_mp3_cover(file_path: str, output_path: Optional[str] = None) -> Tuple[bool, str]:
    try:
        id3 = ID3(file_path)
    except ID3NoHeaderError:
        return False, 'No ID3 tag found'

    for tag in id3.values():
        if isinstance(tag, APIC):
            if output_path is None:
                output_path = str(Path(file_path).with_suffix('.jpg'))
            with open(output_path, 'wb') as f:
                f.write(tag.data)
            return True, output_path

    return False, 'No cover art found'


def extract_flac_cover(file_path: str, output_path: Optional[str] = None) -> Tuple[bool, str]:
    audio = FLAC(file_path)
    if not audio.pictures:
        return False, 'No cover art found'

    pic = audio.pictures[0]
    if output_path is None:
        output_path = str(Path(file_path).with_suffix('.jpg'))
    with open(output_path, 'wb') as f:
        f.write(pic.data)
    return True, output_path


def add_cover(file_path: str, cover_path: str, backup: bool = True) -> Tuple[bool, str]:
    if backup:
        backup_file(file_path)

    ext = Path(file_path).suffix.lower()

    try:
        with open(cover_path, 'rb') as f:
            cover_data = f.read()

        if ext == '.mp3':
            add_mp3_cover(file_path, cover_data)
        elif ext == '.flac':
            add_flac_cover(file_path, cover_data)
        return True, 'Success'
    except Exception as e:
        return False, str(e)


def add_mp3_cover(file_path: str, cover_data: bytes):
    try:
        id3 = ID3(file_path)
    except ID3NoHeaderError:
        id3 = ID3()

    id3.delall('APIC')
    id3.add(APIC(
        encoding=3,
        mime='image/jpeg',
        type=3,
        desc='Cover',
        data=cover_data
    ))
    id3.save(file_path)


def add_flac_cover(file_path: str, cover_data: bytes):
    audio = FLAC(file_path)
    audio.clear_pictures()
    pic = Picture()
    pic.data = cover_data
    pic.type = 3
    pic.mime = 'image/jpeg'
    pic.desc = 'Cover'
    audio.add_picture(pic)
    audio.save()


def parse_filename(filename: str) -> Dict[str, str]:
    name = Path(filename).stem
    tags = {}

    patterns = [
        r'^(?P<artist>.+?)\s*-\s*(?P<title>.+)$',
        r'^(?P<track>\d+)\s*[.-]\s*(?P<title>.+)$',
        r'^(?P<track>\d+)\s+(?P<artist>.+?)\s*-\s*(?P<title>.+)$',
        r'^(?P<artist>.+?)\s*-\s*(?P<album>.+?)\s*-\s*(?P<title>.+)$',
    ]

    for pattern in patterns:
        match = re.match(pattern, name.strip())
        if match:
            for key, value in match.groupdict().items():
                tags[key] = value.strip()
            break

    return tags


def clean_metadata(file_path: str, backup: bool = True) -> Tuple[bool, str]:
    if backup:
        backup_file(file_path)

    ext = Path(file_path).suffix.lower()

    try:
        if ext == '.mp3':
            clean_mp3_metadata(file_path)
        elif ext == '.flac':
            clean_flac_metadata(file_path)
        return True, 'Success'
    except Exception as e:
        return False, str(e)


def clean_mp3_metadata(file_path: str):
    try:
        id3 = EasyID3(file_path)
    except ID3NoHeaderError:
        return

    keys_to_delete = []
    for key in id3.keys():
        value = id3[key]
        if isinstance(value, list):
            if not value or (len(value) == 1 and not str(value[0]).strip()):
                keys_to_delete.append(key)
        elif not str(value).strip():
            keys_to_delete.append(key)

    for key in keys_to_delete:
        id3.pop(key, None)

    id3.save(file_path)


def clean_flac_metadata(file_path: str):
    audio = FLAC(file_path)
    if not audio.tags:
        return

    keys_to_delete = []
    for key in audio.tags.keys():
        value = audio.tags[key]
        if isinstance(value, list):
            if not value or (len(value) == 1 and not str(value[0]).strip()):
                keys_to_delete.append(key)
        elif not str(value).strip():
            keys_to_delete.append(key)

    for key in keys_to_delete:
        del audio[key]

    audio.save()


def export_metadata(files: List[str], output_path: str, format: str = 'json'):
    metadata_list = []
    for file_path in files:
        meta = read_metadata(file_path)
        metadata_list.append({
            'file': file_path,
            'format': meta['format'],
            'tags': meta['tags'],
            'has_cover': meta['has_cover'],
            'technical': meta['technical']
        })

    if format == 'json':
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(metadata_list, f, indent=2, ensure_ascii=False)
    elif format == 'csv':
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            fieldnames = ['file', 'title', 'artist', 'album', 'year', 'genre', 'tracknumber']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for meta in metadata_list:
                row = {'file': meta['file']}
                tags = meta['tags']
                for key in fieldnames[1:]:
                    row[key] = tags.get(key, '')
                writer.writerow(row)


def import_metadata(csv_path: str, backup: bool = True) -> List[Tuple[str, bool, str]]:
    results = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            file_path = row.get('file', '')
            if not file_path or not Path(file_path).exists():
                results.append((file_path, False, 'File not found'))
                continue

            tags = {}
            for key, value in row.items():
                if key != 'file' and value:
                    tags[key] = value

            success, msg = write_metadata(file_path, tags, backup)
            results.append((file_path, success, msg))

    return results


def search_metadata(folder: str, query: str, field: Optional[str] = None) -> List[str]:
    files = get_audio_files(folder)
    results = []
    query_lower = query.lower()

    for file_path in files:
        meta = read_metadata(file_path)
        tags = meta.get('tags', {})

        if field:
            value = tags.get(field, '')
            if query_lower in str(value).lower():
                results.append(file_path)
        else:
            for value in tags.values():
                if query_lower in str(value).lower():
                    results.append(file_path)
                    break

    return results


@click.group()
def cli():
    pass


@cli.command()
@click.argument('path')
@click.option('--technical', '-t', is_flag=True, help='Show technical information')
def view(path, technical):
    """View metadata of an audio file or folder"""
    files = get_audio_files(path)
    if not files:
        click.echo('No audio files found.')
        return

    for file_path in files:
        click.echo(f'\n{click.style("File:", fg="cyan")} {file_path}')
        meta = read_metadata(file_path)

        if 'error' in meta:
            click.echo(f'  {click.style("Error:", fg="red")} {meta["error"]}')
            continue

        click.echo(f'  {click.style("Format:", fg="green")} {meta["format"]}')

        if technical and meta['technical']:
            click.echo(f'  {click.style("Technical:", fg="yellow")}')
            for key, value in meta['technical'].items():
                click.echo(f'    {key}: {value}')

        click.echo(f'  {click.style("Tags:", fg="yellow")}')
        if meta['tags']:
            for key, value in meta['tags'].items():
                click.echo(f'    {key}: {value}')
        else:
            click.echo('    No tags')

        click.echo(f'  {click.style("Cover:", fg="yellow")} {"Yes" if meta["has_cover"] else "No"}')


@cli.command()
@click.argument('file_path')
@click.option('--title', help='Set title')
@click.option('--artist', help='Set artist')
@click.option('--album', help='Set album')
@click.option('--year', help='Set year')
@click.option('--genre', help='Set genre')
@click.option('--track', 'tracknumber', help='Set track number')
@click.option('--no-backup', is_flag=True, help='Disable backup')
def edit(file_path, title, artist, album, year, genre, tracknumber, no_backup):
    """Edit metadata of an audio file"""
    if not Path(file_path).exists():
        click.echo(f'{click.style("Error:", fg="red")} File not found')
        return

    tags = {}
    if title is not None:
        tags['title'] = title
    if artist is not None:
        tags['artist'] = artist
    if album is not None:
        tags['album'] = album
    if year is not None:
        tags['year'] = year
    if genre is not None:
        tags['genre'] = genre
    if tracknumber is not None:
        tags['tracknumber'] = tracknumber

    if not tags:
        click.echo('No tags specified. Use --title, --artist, --album, --year, --genre, or --track.')
        return

    success, msg = write_metadata(file_path, tags, not no_backup)
    if success:
        click.echo(click.style('Success!', fg='green'))
        if not no_backup:
            click.echo(f'Backup created: {file_path}.bak')
    else:
        click.echo(f'{click.style("Error:", fg="red")} {msg}')


@cli.command('batch-edit')
@click.argument('folder')
@click.option('--artist', help='Set artist for all files')
@click.option('--album', help='Set album for all files')
@click.option('--year', help='Set year for all files')
@click.option('--genre', help='Set genre for all files')
@click.option('--no-backup', is_flag=True, help='Disable backup')
@click.option('--recursive/--no-recursive', default=True, help='Process subfolders')
def batch_edit(folder, artist, album, year, genre, no_backup, recursive):
    """Batch edit metadata for all audio files in a folder"""
    files = get_audio_files(folder, recursive)
    if not files:
        click.echo('No audio files found.')
        return

    tags = {}
    if artist is not None:
        tags['artist'] = artist
    if album is not None:
        tags['album'] = album
    if year is not None:
        tags['year'] = year
    if genre is not None:
        tags['genre'] = genre

    if not tags:
        click.echo('No tags specified. Use --artist, --album, --year, or --genre.')
        return

    click.echo(f'Processing {len(files)} files...')
    for file_path in files:
        success, msg = write_metadata(file_path, tags, not no_backup)
        status = click.style('OK', fg='green') if success else click.style('FAIL', fg='red')
        click.echo(f'[{status}] {file_path}')


@cli.command()
@click.argument('path')
@click.option('--write', is_flag=True, help='Write parsed tags to files')
@click.option('--no-backup', is_flag=True, help='Disable backup')
@click.option('--recursive/--no-recursive', default=True, help='Process subfolders')
def autofill(path, write, no_backup, recursive):
    """Parse and fill metadata from filenames"""
    files = get_audio_files(path, recursive)
    if not files:
        click.echo('No audio files found.')
        return

    for file_path in files:
        filename = Path(file_path).name
        parsed = parse_filename(filename)

        click.echo(f'\n{click.style("File:", fg="cyan")} {filename}')
        if parsed:
            for key, value in parsed.items():
                click.echo(f'  {key}: {value}')

            if write:
                success, msg = write_metadata(file_path, parsed, not no_backup)
                if success:
                    click.echo(f'  {click.style("Written!", fg="green")}')
                else:
                    click.echo(f'  {click.style(f"Error: {msg}", fg="red")}')
        else:
            click.echo('  No pattern matched')


@cli.command()
@click.argument('path')
@click.argument('output')
@click.option('--format', 'fmt', type=click.Choice(['json', 'csv']), default='json', help='Output format')
@click.option('--recursive/--no-recursive', default=True, help='Process subfolders')
def export(path, output, fmt, recursive):
    """Export metadata to JSON or CSV file"""
    files = get_audio_files(path, recursive)
    if not files:
        click.echo('No audio files found.')
        return

    export_metadata(files, output, fmt)
    click.echo(f'{click.style("Success!", fg="green")} Exported {len(files)} files to {output}')


@cli.command('import')
@click.argument('csv_path')
@click.option('--no-backup', is_flag=True, help='Disable backup')
def import_cmd(csv_path, no_backup):
    """Import metadata from CSV file"""
    if not Path(csv_path).exists():
        click.echo(f'{click.style("Error:", fg="red")} CSV file not found')
        return

    results = import_metadata(csv_path, not no_backup)
    for file_path, success, msg in results:
        status = click.style('OK', fg='green') if success else click.style('FAIL', fg='red')
        click.echo(f'[{status}] {file_path}: {msg}')


@cli.command('extract-cover')
@click.argument('file_path')
@click.option('--output', '-o', help='Output file path')
def extract_cover_cmd(file_path, output):
    """Extract cover art from audio file"""
    if not Path(file_path).exists():
        click.echo(f'{click.style("Error:", fg="red")} File not found')
        return

    success, result = extract_cover(file_path, output)
    if success:
        click.echo(f'{click.style("Success!", fg="green")} Cover saved to: {result}')
    else:
        click.echo(f'{click.style("Error:", fg="red")} {result}')


@cli.command('add-cover')
@click.argument('file_path')
@click.argument('cover_path')
@click.option('--no-backup', is_flag=True, help='Disable backup')
def add_cover_cmd(file_path, cover_path, no_backup):
    """Add or replace cover art in audio file"""
    if not Path(file_path).exists():
        click.echo(f'{click.style("Error:", fg="red")} Audio file not found')
        return
    if not Path(cover_path).exists():
        click.echo(f'{click.style("Error:", fg="red")} Cover image not found')
        return

    success, msg = add_cover(file_path, cover_path, not no_backup)
    if success:
        click.echo(click.style('Success!', fg='green'))
    else:
        click.echo(f'{click.style("Error:", fg="red")} {msg}')


@cli.command('delete-tags')
@click.argument('file_path')
@click.option('--field', '-f', multiple=True, help='Fields to delete (can be used multiple times)')
@click.option('--no-backup', is_flag=True, help='Disable backup')
def delete_tags_cmd(file_path, field, no_backup):
    """Delete specified metadata fields"""
    if not Path(file_path).exists():
        click.echo(f'{click.style("Error:", fg="red")} File not found')
        return

    if not field:
        click.echo('No fields specified. Use --field to specify fields to delete.')
        return

    success, msg = delete_tags(file_path, list(field), not no_backup)
    if success:
        click.echo(click.style('Success!', fg='green'))
    else:
        click.echo(f'{click.style("Error:", fg="red")} {msg}')


@cli.command()
@click.argument('file_path')
def backup(file_path):
    """Create a backup copy of the file"""
    if not Path(file_path).exists():
        click.echo(f'{click.style("Error:", fg="red")} File not found')
        return

    backup_path = backup_file(file_path)
    click.echo(f'{click.style("Success!", fg="green")} Backup created: {backup_path}')


@cli.command('tech-info')
@click.argument('path')
@click.option('--recursive/--no-recursive', default=True, help='Process subfolders')
def tech_info(path, recursive):
    """Show technical information about audio files"""
    files = get_audio_files(path, recursive)
    if not files:
        click.echo('No audio files found.')
        return

    for file_path in files:
        click.echo(f'\n{click.style("File:", fg="cyan")} {file_path}')
        meta = read_metadata(file_path)

        if 'error' in meta:
            click.echo(f'  {click.style("Error:", fg="red")} {meta["error"]}')
            continue

        click.echo(f'  {click.style("Format:", fg="green")} {meta["format"]}')
        if meta['technical']:
            for key, value in meta['technical'].items():
                click.echo(f'  {key}: {value}')


@cli.command()
@click.argument('folder')
@click.argument('query')
@click.option('--field', '-f', help='Search in specific field (e.g., artist, title)')
def search(folder, query, field):
    """Search audio files by metadata"""
    results = search_metadata(folder, query, field)

    if not results:
        click.echo('No matching files found.')
        return

    click.echo(f'{click.style("Found:", fg="green")} {len(results)} files')
    for file_path in results:
        click.echo(f'  {file_path}')


@cli.command()
@click.argument('path')
@click.option('--no-backup', is_flag=True, help='Disable backup')
@click.option('--recursive/--no-recursive', default=True, help='Process subfolders')
def clean(path, no_backup, recursive):
    """Remove empty/redundant metadata fields"""
    files = get_audio_files(path, recursive)
    if not files:
        click.echo('No audio files found.')
        return

    click.echo(f'Processing {len(files)} files...')
    for file_path in files:
        success, msg = clean_metadata(file_path, not no_backup)
        status = click.style('OK', fg='green') if success else click.style('FAIL', fg='red')
        click.echo(f'[{status}] {file_path}')


if __name__ == '__main__':
    cli()
