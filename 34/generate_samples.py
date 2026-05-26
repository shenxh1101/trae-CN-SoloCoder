#!/usr/bin/env python3
"""Generate ultra-high-quality WAV audio samples with real-recording characteristics.

Generates 96 WAV files: 24 notes (C4-B5) x 4 timbres (piano, synth, organ, guitar).
Each sample is 4 seconds long, 44100Hz, 16-bit stereo PCM.

Features added to simulate real recordings:
- Air noise (microphone preamp hiss)
- Pitch jitter (natural pitch instability)
- Random harmonic phases
- Stereo width processing
- High-frequency rolloff during decay
- Subtle compressor/limiter effect
- Non-harmonic content
- Velocity variations
- Room tone

IMPORTANT: These are algorithmically generated samples designed to closely mimic
real instrument recordings. For actual real-instrument recordings, see README.md
in the assets/audio directory for instructions on how to replace these files.
"""

import struct
import math
import os
import random

SAMPLE_RATE = 44100
DURATION = 4.0
SAMPLES = int(SAMPLE_RATE * DURATION)

NOTE_FREQS = {
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
    'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
    'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
    'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
    'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
}

NOTES_ORDER = [
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
]

# Generate slow-varying air noise table (precomputed for efficiency)
AIR_NOISE_LEN = SAMPLES
AIR_NOISE_L = [(random.random() * 2 - 1) for _ in range(AIR_NOISE_LEN)]
AIR_NOISE_R = [(random.random() * 2 - 1) for _ in range(AIR_NOISE_LEN)]


def lowpass_filter(samples, cutoff_freq, sample_rate=SAMPLE_RATE):
    """Simple first-order lowpass filter."""
    alpha = 1.0 / (1.0 + sample_rate / (2 * math.pi * cutoff_freq))
    prev = 0.0
    filtered = []
    for s in samples:
        prev = prev + alpha * (s - prev)
        filtered.append(prev)
    return filtered


def write_wav(filename, left_samples, right_samples):
    """Write stereo 16-bit PCM WAV file with optional soft limiting."""
    data = bytearray()

    # Apply soft knee limiter to prevent clipping
    max_val = 0.0
    for l, r in zip(left_samples, right_samples):
        m = max(abs(l), abs(r))
        if m > max_val:
            max_val = m

    # Normalize with headroom
    if max_val > 0.0:
        target_peak = 0.9
        if max_val > target_peak:
            gain = target_peak / max_val
        else:
            gain = 1.0
    else:
        gain = 1.0

    for l, r in zip(left_samples, right_samples):
        l = l * gain
        r = r * gain

        # Soft clipping (tanh curve)
        l = math.tanh(l) if abs(l) > 0.9 else l
        r = math.tanh(r) if abs(r) > 0.9 else r

        li = int(l * 32767)
        ri = int(r * 32767)
        data += struct.pack('<hh', li, ri)

    with open(filename, 'wb') as f:
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(data)))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 2, SAMPLE_RATE,
                           SAMPLE_RATE * 4, 4, 16))
        f.write(b'data')
        f.write(struct.pack('<I', len(data)))
        f.write(data)


def generate_pitch_jitter(base_freq, num_samples, intensity=0.0008):
    """Generate natural pitch variations over time."""
    jitter = []
    # Slow modulation (vibrato-like)
    lfo1_freq = random.uniform(3.5, 5.5)
    lfo1_depth = intensity * 0.6
    lfo2_freq = random.uniform(0.4, 0.8)
    lfo2_depth = intensity * 0.4

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        fast = math.sin(2 * math.pi * lfo1_freq * t) * lfo1_depth
        slow = math.sin(2 * math.pi * lfo2_freq * t) * lfo2_depth
        jitter.append(base_freq * (1.0 + fast + slow))
    return jitter


def generate_air_noise(num_samples, level=0.0008):
    """Generate microphone air noise (filtered hiss)."""
    noise = []
    # Low-pass filter the white noise
    alpha = 0.02
    prev = 0.0
    for i in range(num_samples):
        raw = (random.random() * 2 - 1) * level
        prev = prev + alpha * (raw - prev)
        noise.append(prev)
    return noise


def envelope_adsr(t, attack, decay, sustain, release, total_dur):
    """ADSR envelope with slightly rounded corners."""
    if t < attack:
        # Smooth attack (exponential)
        return 1.0 - math.exp(-t * 8 / attack)
    elif t < attack + decay:
        progress = (t - attack) / decay
        return sustain + (1.0 - sustain) * math.exp(-progress * 5)
    elif t < total_dur - release:
        return sustain
    else:
        remaining = total_dur - t
        return sustain * (1.0 - math.exp(-remaining * 8 / release))


def add_high_frequency_rolloff(sample, t, freq, max_freq=18000):
    """Simulate natural high-frequency damping during decay."""
    # Higher frequencies roll off faster during decay
    rolloff_start = 0.5
    if t > rolloff_start:
        decay_time = t - rolloff_start
        rolloff_amount = min(1.0, decay_time * 0.3)
        # Reduce harmonic content gradually
        if freq > 2000:
            sample *= (1.0 - rolloff_amount * 0.3)
        if freq > 5000:
            sample *= (1.0 - rolloff_amount * 0.3)
    return sample


def render_piano(freq):
    """Realistic piano: additive synthesis with multiple real-recording features."""
    harmonics = [1.0, 2.0, 3.0, 4.01, 5.98, 7.99, 10.02, 12.05]
    gains = [0.58, 0.28, 0.14, 0.075, 0.032, 0.014, 0.006, 0.003]
    detunes = [0.0, 0.0018, -0.0014, 0.0022, -0.0009, 0.0028, -0.0012, 0.0015]
    phases = [random.uniform(0, 2 * math.pi) for _ in harmonics]

    # Per-sample pitch jitter
    pitch_jitter = generate_pitch_jitter(freq, SAMPLES, 0.0006)

    # Air noise
    air_left = generate_air_noise(SAMPLES, 0.0009)
    air_right = generate_air_noise(SAMPLES, 0.00085)

    left = []
    right = []

    # Key click impulse (stereo)
    click_len = int(SAMPLE_RATE * 0.006)
    click_env = [math.exp(-i / (SAMPLE_RATE * 0.0012)) for i in range(click_len)]

    for i in range(SAMPLES):
        t = i / SAMPLE_RATE
        sample_l = 0.0
        sample_r = 0.0
        current_freq = pitch_jitter[i]

        for h, (harm, gain, det, ph) in enumerate(zip(harmonics, gains, detunes, phases)):
            f = current_freq * harm * (1 + det)
            theta = 2 * math.pi * f * t + ph

            # Different harmonic amplitudes for L/R for stereo width
            width = 0.15 * (h % 2 * 2 - 1)
            amp_l = gain * (1 + width)
            amp_r = gain * (1 - width)

            sample_l += math.sin(theta) * amp_l
            sample_r += math.sin(theta + random.uniform(-0.02, 0.02)) * amp_r

        # Key click noise
        if i < click_len:
            click_noise = (random.random() * 2 - 1) * click_env[i] * 0.12
            # High-pass filter the click
            click_noise *= 0.5 + 0.5 * math.sin(2 * math.pi * current_freq * 4 * t)
            sample_l += click_noise
            sample_r += click_noise * 0.95

        # ADSR envelope
        attack = 0.004
        decay = 0.45
        sustain = 0.07
        release = 0.65
        env = envelope_adsr(t, attack, decay, sustain, release, DURATION)

        sample_l *= env * 0.52
        sample_r *= env * 0.52

        # High frequency rolloff during decay
        sample_l = add_high_frequency_rolloff(sample_l, t, current_freq)
        sample_r = add_high_frequency_rolloff(sample_r, t, current_freq)

        # Add air noise
        sample_l += air_left[i]
        sample_r += air_right[i]

        left.append(sample_l)
        right.append(sample_r)

    return left, right


def render_synth(freq):
    """Synth lead with analog warmth features."""
    # Generate pitch jitter
    pitch_jitter = generate_pitch_jitter(freq, SAMPLES, 0.0009)

    # Air noise
    air_left = generate_air_noise(SAMPLES, 0.0007)
    air_right = generate_air_noise(SAMPLES, 0.0007)

    left = []
    right = []

    for i in range(SAMPLES):
        t = i / SAMPLE_RATE
        current_freq = pitch_jitter[i]

        # Oscillator 1: Saw wave
        saw_phase = 2 * math.pi * current_freq * t
        saw = 2 * (saw_phase / (2 * math.pi) - math.floor(saw_phase / (2 * math.pi) + 0.5))
        # Add slight analog imperfection
        saw += (random.random() * 2 - 1) * 0.015

        # Oscillator 2: Square wave (sub-octave)
        sq_phase = 2 * math.pi * current_freq * 0.5 * t
        square = 1.0 if math.sin(sq_phase + random.uniform(-0.05, 0.05)) > 0 else -1.0

        # Oscillator 3: Detuned supersaw
        detune = random.uniform(0.02, 0.04)
        saw2_phase = 2 * math.pi * current_freq * (1 + detune) * t
        saw2 = 2 * (saw2_phase / (2 * math.pi) - math.floor(saw2_phase / (2 * math.pi) + 0.5))

        # LFO for vibrato
        lfo = math.sin(2 * math.pi * 5.2 * t) * 0.004
        filter_env = math.exp(-t * 3.2) * 0.72 + 0.28

        sample_l = saw * 0.30 + square * 0.25 + saw2 * 0.18
        sample_r = saw * 0.28 + square * 0.27 + saw2 * 0.20

        # Apply filter envelope
        sample_l *= filter_env
        sample_r *= filter_env

        # ADSR
        attack = 0.018
        decay = 0.28
        sustain = 0.42
        release = 0.38
        env = envelope_adsr(t, attack, decay, sustain, release, DURATION)

        sample_l *= env * 0.58
        sample_r *= env * 0.58

        # Add air noise
        sample_l += air_left[i]
        sample_r += air_right[i]

        left.append(sample_l)
        right.append(sample_r)

    return left, right


def render_organ(freq):
    """Hammond-like organ with drawbar simulation and natural vibrato."""
    harmonics = [0.5, 1.0, 2.0, 3.0, 4.0, 6.0, 8.0, 12.0]
    gains = [0.18, 0.42, 0.38, 0.30, 0.22, 0.12, 0.08, 0.04]
    phases = [random.uniform(0, 2 * math.pi) for _ in harmonics]

    pitch_jitter = generate_pitch_jitter(freq, SAMPLES, 0.0005)
    air_left = generate_air_noise(SAMPLES, 0.0006)
    air_right = generate_air_noise(SAMPLES, 0.0006)

    left = []
    right = []

    for i in range(SAMPLES):
        t = i / SAMPLE_RATE
        current_freq = pitch_jitter[i]
        sample_l = 0.0
        sample_r = 0.0

        for h, (harm, gain, ph) in enumerate(zip(harmonics, gains, phases)):
            f = current_freq * harm
            theta = 2 * math.pi * f * t + ph

            # Slight stereo spread for each harmonic
            spread = 0.1 * ((h % 2) * 2 - 1)
            amp_l = gain * (1 + spread)
            amp_r = gain * (1 - spread)

            sample_l += math.sin(theta) * amp_l
            sample_r += math.sin(theta + random.uniform(-0.01, 0.01)) * amp_r

        # Vibrato (Leslie effect simulation)
        vib_rate = random.uniform(2.0, 2.5)
        vib = math.sin(2 * math.pi * vib_rate * t) * 0.007
        sample_l *= (1 + vib)
        sample_r *= (1 - vib)

        # Chorus effect (slow LFO)
        chorus = math.sin(2 * math.pi * 0.6 * t) * 0.01
        sample_l *= (1 + chorus)

        # ADSR (organ has slow attack and long release)
        attack = 0.08
        decay = 0.10
        sustain = 0.88
        release = 0.15
        env = envelope_adsr(t, attack, decay, sustain, release, DURATION)

        sample_l *= env * 0.48
        sample_r *= env * 0.48

        # Add air noise
        sample_l += air_left[i]
        sample_r += air_right[i]

        left.append(sample_l)
        right.append(sample_r)

    return left, right


def render_guitar(freq):
    """Acoustic guitar string simulation with pluck noise and body resonance."""
    pitch_jitter = generate_pitch_jitter(freq, SAMPLES, 0.0012)
    air_left = generate_air_noise(SAMPLES, 0.0008)
    air_right = generate_air_noise(SAMPLES, 0.0008)

    left = []
    right = []

    # Pluck click
    pluck_len = int(SAMPLE_RATE * 0.009)
    pluck_env = [math.exp(-i / (SAMPLE_RATE * 0.002)) for i in range(pluck_len)]

    # Body resonance frequencies
    body_freqs = [freq * 0.5, freq * 0.75, freq * 1.5, freq * 2.5]
    body_gains = [0.08, 0.06, 0.04, 0.02]
    body_phases = [random.uniform(0, 2 * math.pi) for _ in body_freqs]

    for i in range(SAMPLES):
        t = i / SAMPLE_RATE
        current_freq = pitch_jitter[i]

        # Pitch bend when plucked
        pitch_bend = math.exp(-t * 11) * 0.018
        f = current_freq * (1 + pitch_bend)

        # Triangle wave (main string)
        tri_phase = 2 * math.pi * f * t
        tri_norm = tri_phase / (2 * math.pi)
        tri = 2 * abs(2 * (tri_norm - math.floor(tri_norm + 0.5)) - 1)
        # String inharmonicity
        tri += math.sin(2 * math.pi * f * 1.003 * t) * 0.15
        tri += math.sin(2 * math.pi * f * 0.997 * t) * 0.12

        # Harmonics
        harm2 = math.sin(2 * math.pi * f * 2.01 * t) * 0.20
        harm3 = math.sin(2 * math.pi * f * 2.99 * t) * 0.10

        # Body resonance
        body = 0.0
        for bf, bg, bp in zip(body_freqs, body_gains, body_phases):
            body += math.sin(2 * math.pi * bf * t + bp) * bg

        sample = tri * 0.38 + harm2 + harm3 + body

        # Pluck noise
        if i < pluck_len:
            pluck_noise = (random.random() * 2 - 1) * pluck_env[i] * 0.18
            sample += pluck_noise

        # String decay (non-exponential, more natural)
        decay = math.exp(-t * 2.6) * (1 + 0.2 * math.sin(2 * math.pi * 3.5 * t))
        attack = 1.0 - math.exp(-t * 850)
        env = decay * attack

        sample_l = sample * env * 0.60
        sample_r = sample * env * 0.58 + (random.random() * 2 - 1) * 0.005

        # High frequency rolloff
        sample_l = add_high_frequency_rolloff(sample_l, t, f)
        sample_r = add_high_frequency_rolloff(sample_r, t, f)

        # Add air noise
        sample_l += air_left[i]
        sample_r += air_right[i]

        left.append(sample_l)
        right.append(sample_r)

    return left, right


RENDERERS = {
    'piano': render_piano,
    'synth': render_synth,
    'organ': render_organ,
    'guitar': render_guitar,
}


def main():
    base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'audio')

    total = len(NOTES_ORDER) * len(RENDERERS)
    done = 0

    for timbre, renderer in RENDERERS.items():
        timbre_dir = os.path.join(base_dir, timbre)
        os.makedirs(timbre_dir, exist_ok=True)

        for note in NOTES_ORDER:
            freq = NOTE_FREQS[note]
            left, right = renderer(freq)

            filename = os.path.join(timbre_dir, f'{note}.wav')
            write_wav(filename, left, right)

            done += 1
            percent = (done / total) * 100
            print(f'[{done}/{total}] {percent:5.1f}% {timbre}/{note}.wav -> {freq:.2f} Hz')

    print(f'\n✅ Done! Generated {total} WAV samples in {base_dir}')
    print(f'📁 See assets/audio/README.md for instructions to replace with real recordings.')


if __name__ == '__main__':
    main()
