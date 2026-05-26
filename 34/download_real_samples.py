#!/usr/bin/env python3
"""Download REAL instrument samples from public-domain GitHub repositories.

This script downloads ACTUAL RECORDINGS, not algorithmically generated samples.

SOURCES (all public domain / CC0 licensed):
- Piano: Splendid Grand Piano (AKAI Public Domain Steinway samples, 2000)
         Repository: sfzinstruments/SplendidGrandPiano
         License: Public Domain (released by AKAI early 2000)
         Download: jsdelivr CDN mirror

For other instruments, see assets/audio/README.md for how to replace
with your own real recordings.
"""

import os
import sys
import time
import urllib.request
import urllib.parse
import subprocess
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(BASE_DIR, 'assets', 'audio')

NOTES_24 = [
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
]

# jsdelivr CDN for Splendid Grand Piano (Public Domain AKAI Steinway samples)
# Using Mp (mezzo-piano) velocity for balanced, natural tone
PIANO_URL_TEMPLATE = (
    'https://cdn.jsdelivr.net/gh/sfzinstruments/SplendidGrandPiano@master/'
    'Samples/{velocity}%20{note_encoded}.flac'
)


def encode_note(note):
    """Encode note name for URL (e.g., C#4 -> C%234)"""
    return note.replace('#', '%23')


def download_file(url, dest_path, retries=3):
    """Download a file with retries and progress indication."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'PianoSimulator/1.0 (Real Sample Downloader)'
            })
            with urllib.request.urlopen(req, timeout=60) as response:
                if response.status != 200:
                    raise Exception(f'HTTP {response.status}')
                data = response.read()
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, 'wb') as f:
                    f.write(data)
                return True, len(data)
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                return False, 0
    return False, 0


def check_ffmpeg():
    """Check if ffmpeg is available for FLAC->WAV conversion."""
    return shutil.which('ffmpeg') is not None


def flac_to_wav(flac_path, wav_path):
    """Convert FLAC to 16-bit 44100Hz stereo WAV using ffmpeg."""
    try:
        subprocess.run([
            'ffmpeg', '-y', '-i', flac_path,
            '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2',
            wav_path
        ], check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f'  Conversion error: {e}')
        return False


def cleanup_old_files(directory, pattern='*.wav'):
    """Remove old algorithmically generated files."""
    import glob
    for f in glob.glob(os.path.join(directory, pattern)):
        os.remove(f)


def download_piano_samples(velocity='Mp'):
    """Download REAL Steinway Grand Piano samples (AKAI Public Domain).
    
    These are actual recordings from a Steinway Grand Piano, recorded by AKAI
    and released into the Public Domain in early 2000.
    """
    print('=' * 70)
    print('DOWNLOADING REAL STEINWAY GRAND PIANO SAMPLES')
    print('Source: AKAI Professional (Public Domain, 2000)')
    print('Repository: sfzinstruments/SplendidGrandPiano')
    print('=' * 70)

    if not check_ffmpeg():
        print('ERROR: ffmpeg not found. Please install ffmpeg first.')
        print('macOS: brew install ffmpeg')
        return False

    piano_dir = os.path.join(AUDIO_DIR, 'piano')
    os.makedirs(piano_dir, exist_ok=True)

    # Clean up old algorithmically generated WAV files
    print('\nRemoving old algorithmically generated samples...')
    cleanup_old_files(piano_dir, '*.wav')
    print('Done!\n')

    success_count = 0
    fail_count = 0
    total_bytes = 0

    print(f'Downloading {len(NOTES_24)} piano notes...\n')

    for i, note in enumerate(NOTES_24):
        note_encoded = encode_note(note)
        url = PIANO_URL_TEMPLATE.format(velocity=velocity, note_encoded=note_encoded)
        flac_path = os.path.join(piano_dir, f'{note}.flac')
        wav_path = os.path.join(piano_dir, f'{note}.wav')

        print(f'  [{i+1:2}/{len(NOTES_24)}] {note:4} -> ', end='', flush=True)

        success, size = download_file(url, flac_path)

        if success:
            if flac_to_wav(flac_path, wav_path):
                os.remove(flac_path)
                wav_size = os.path.getsize(wav_path)
                print(f'OK ({size//1024} KB FLAC -> {wav_size//1024} KB WAV)')
                success_count += 1
                total_bytes += wav_size
            else:
                print('FLAC OK, but WAV conversion failed')
                fail_count += 1
            time.sleep(0.15)  # Rate limiting for CDN
        else:
            print('FAILED')
            fail_count += 1

    print(f'\n{"="*70}')
    print(f'Results: {success_count} OK, {fail_count} FAILED')
    print(f'Total WAV size: {total_bytes / (1024*1024):.1f} MB')
    print(f'{"="*70}\n')

    return success_count == len(NOTES_24)


def main():
    print('Piano Simulator - REAL Sample Downloader')
    print('Downloading actual instrument recordings (Public Domain / CC0)')
    print()

    piano_ok = download_piano_samples('Mp')

    if piano_ok:
        print('\n' + '=' * 70)
        print('SUCCESS!')
        print()
        print('You now have REAL Steinway Grand Piano recordings')
        print('in assets/audio/piano/ directory.')
        print()
        print('These are NOT algorithmically generated - these are')
        print('actual recordings from a real acoustic piano!')
        print()
        print('Note: synth, organ, and guitar directories currently')
        print('use high-quality algorithmic samples. To replace them')
        print('with real recordings, see instructions in:')
        print('  assets/audio/README.md')
        print('=' * 70)
        return 0
    else:
        print('\n' + '=' * 70)
        print('Download incomplete. Check internet connection.')
        print('The app will use algorithmic fallbacks where needed.')
        print('=' * 70)
        return 1


if __name__ == '__main__':
    sys.exit(main())
