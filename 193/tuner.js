(function () {
    'use strict';

    var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    var INSTRUMENTS = {
        guitar: {
            name: '吉他',
            strings: [
                { name: 'E2', freq: 82.41 },
                { name: 'A2', freq: 110.00 },
                { name: 'D3', freq: 146.83 },
                { name: 'G3', freq: 196.00 },
                { name: 'B3', freq: 246.94 },
                { name: 'E4', freq: 329.63 }
            ]
        },
        violin: {
            name: '小提琴',
            strings: [
                { name: 'G3', freq: 196.00 },
                { name: 'D4', freq: 293.66 },
                { name: 'A4', freq: 440.00 },
                { name: 'E5', freq: 659.26 }
            ]
        },
        ukulele: {
            name: '尤克里里',
            strings: [
                { name: 'G4', freq: 392.00 },
                { name: 'C4', freq: 261.63 },
                { name: 'E4', freq: 329.63 },
                { name: 'A4', freq: 440.00 }
            ]
        },
        chromatic: {
            name: '半音',
            strings: []
        }
    };

    var a4Freq = 440;
    var currentMode = 'guitar';
    var currentStringIndex = 0;
    var isRunning = false;
    var audioCtx = null;
    var analyser = null;
    var mediaStream = null;
    var animFrameId = null;
    var history = [];

    var currentCents = 0;
    var currentFreq = 0;
    var currentNote = '--';
    var currentOctave = '';
    var smoothedCents = 0;
    var volumeLevel = 0;

    var lastVibrateTime = 0;
    var lastHistoryTime = 0;
    var stableNoteCount = 0;
    var lastStableNote = '';

    var canvas = document.getElementById('meterCanvas');
    var ctx = canvas.getContext('2d');

    function freqToNote(freq) {
        if (freq <= 0) return { note: '--', octave: '', cents: 0, noteIndex: -1 };
        var semitone = 12 * Math.log2(freq / a4Freq);
        var rounded = Math.round(semitone);
        var cents = (semitone - rounded) * 100;
        var noteIndex = ((rounded + 9) % 12 + 12) % 12;
        var octave = Math.floor((rounded + 9) / 12) + 4;
        return {
            note: NOTE_NAMES[noteIndex],
            octave: octave,
            cents: cents,
            noteIndex: noteIndex
        };
    }

    function autoCorrelate(buf, sampleRate) {
        var SIZE = buf.length;
        var rms = 0;
        for (var i = 0; i < SIZE; i++) {
            rms += buf[i] * buf[i];
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return -1;

        var r1 = 0, r2 = SIZE - 1;
        var threshold = 0.2;
        for (var i2 = 0; i2 < SIZE / 2; i2++) {
            if (Math.abs(buf[i2]) < threshold) { r1 = i2; break; }
        }
        for (var i3 = 1; i3 < SIZE / 2; i3++) {
            if (Math.abs(buf[SIZE - i3]) < threshold) { r2 = SIZE - i3; break; }
        }

        buf = buf.slice(r1, r2);
        SIZE = buf.length;

        var c = new Array(SIZE).fill(0);
        for (var i4 = 0; i4 < SIZE; i4++) {
            for (var j = 0; j < SIZE - i4; j++) {
                c[i4] += buf[j] * buf[j + i4];
            }
        }

        var d = 0;
        while (c[d] > c[d + 1]) d++;
        var maxVal = -1, maxPos = -1;
        for (var i5 = d; i5 < SIZE; i5++) {
            if (c[i5] > maxVal) {
                maxVal = c[i5];
                maxPos = i5;
            }
        }

        var t0 = maxPos;
        if (t0 > 0 && t0 < SIZE - 1) {
            var x1 = c[t0 - 1], x2 = c[t0], x3 = c[t0 + 1];
            var a = (x1 + x3 - 2 * x2) / 2;
            var b = (x3 - x1) / 2;
            if (a) t0 = t0 - b / (2 * a);
        }

        return sampleRate / t0;
    }

    function drawMeter(cents) {
        var w = canvas.width;
        var h = canvas.height;
        var dpr = window.devicePixelRatio || 1;

        ctx.clearRect(0, 0, w, h);

        var centerX = w / 2;
        var centerY = h - 30;
        var radius = Math.min(w / 2 - 20, h - 50);

        var isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        var startAngle = Math.PI;
        var endAngle = 2 * Math.PI;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = isDark ? '#30363d' : '#d0d7de';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (var t = -50; t <= 50; t += 5) {
            var frac = (t + 50) / 100;
            var angle = startAngle + frac * Math.PI;
            var isMajor = t % 10 === 0;
            var innerR = radius - (isMajor ? 20 : 12);
            var outerR = radius - 2;

            ctx.beginPath();
            ctx.moveTo(
                centerX + innerR * Math.cos(angle),
                centerY + innerR * Math.sin(angle)
            );
            ctx.lineTo(
                centerX + outerR * Math.cos(angle),
                centerY + outerR * Math.sin(angle)
            );

            if (t === 0) {
                ctx.strokeStyle = isDark ? '#3fb950' : '#1a7f37';
                ctx.lineWidth = 3;
            } else if (Math.abs(t) <= 10) {
                ctx.strokeStyle = isDark ? '#3fb950' : '#1a7f37';
                ctx.lineWidth = isMajor ? 2.5 : 1.5;
            } else if (Math.abs(t) <= 30) {
                ctx.strokeStyle = isDark ? '#d29922' : '#9a6700';
                ctx.lineWidth = isMajor ? 2.5 : 1.5;
            } else {
                ctx.strokeStyle = isDark ? '#f85149' : '#cf222e';
                ctx.lineWidth = isMajor ? 2.5 : 1.5;
            }
            ctx.stroke();

            if (isMajor) {
                var labelR = radius - 32;
                var lx = centerX + labelR * Math.cos(angle);
                var ly = centerY + labelR * Math.sin(angle);
                ctx.font = (t === 0 ? 'bold 13px' : '11px') + ' -apple-system, sans-serif';
                ctx.fillStyle = isDark ? '#8b949e' : '#656d76';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(t.toString(), lx, ly);
            }
        }

        var greenStart = startAngle + (40 / 100) * Math.PI;
        var greenEnd = startAngle + (60 / 100) * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 4, greenStart, greenEnd);
        ctx.strokeStyle = isDark ? 'rgba(63, 185, 80, 0.3)' : 'rgba(26, 127, 55, 0.2)';
        ctx.lineWidth = 6;
        ctx.stroke();

        var clampedCents = Math.max(-50, Math.min(50, cents));
        var needleFrac = (clampedCents + 50) / 100;
        var needleAngle = startAngle + needleFrac * Math.PI;

        ctx.save();
        ctx.shadowColor = isDark ? 'rgba(240, 136, 62, 0.5)' : 'rgba(207, 34, 46, 0.4)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
            centerX + (radius - 8) * Math.cos(needleAngle),
            centerY + (radius - 8) * Math.sin(needleAngle)
        );
        ctx.strokeStyle = isDark ? '#f0883e' : '#cf222e';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#f0883e' : '#cf222e';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#0d1117' : '#f6f8fa';
        ctx.fill();
    }

    function updateUI() {
        var noteEl = document.getElementById('noteName');
        var octaveEl = document.getElementById('octave');
        var centsEl = document.getElementById('centsValue');
        var freqEl = document.getElementById('freqValue');
        var volumeBarEl = document.getElementById('volumeBar');

        noteEl.textContent = currentNote;
        octaveEl.textContent = currentOctave;
        centsEl.textContent = (currentCents >= 0 ? '+' : '') + currentCents.toFixed(1);
        freqEl.textContent = currentFreq > 0 ? currentFreq.toFixed(1) : '--';

        var absCents = Math.abs(currentCents);
        if (absCents <= 3) {
            noteEl.classList.add('in-tune');
        } else {
            noteEl.classList.remove('in-tune');
        }

        var volPercent = Math.min(100, volumeLevel * 500);
        volumeBarEl.style.width = volPercent + '%';
        volumeBarEl.className = 'volume-bar';
        if (volPercent > 80) volumeBarEl.classList.add('loud');
        else if (volPercent > 50) volumeBarEl.classList.add('medium');

        drawMeter(smoothedCents);
    }

    function processAudio() {
        if (!isRunning || !analyser) return;

        var bufferLength = analyser.fftSize;
        var buffer = new Float32Array(bufferLength);
        analyser.getFloatTimeDomainData(buffer);

        var rms = 0;
        for (var i = 0; i < bufferLength; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / bufferLength);
        volumeLevel = volumeLevel * 0.7 + rms * 0.3;

        var freq = autoCorrelate(buffer, audioCtx.sampleRate);

        if (freq > 30 && freq < 4200) {
            currentFreq = freq;
            var info = freqToNote(freq);
            currentNote = info.note;
            currentOctave = info.octave;
            currentCents = info.cents;

            smoothedCents = smoothedCents * 0.7 + currentCents * 0.3;

            if (Math.abs(smoothedCents) <= 3) {
                triggerVibration();
            }

            var noteKey = info.note + info.octave;
            if (noteKey === lastStableNote) {
                stableNoteCount++;
            } else {
                lastStableNote = noteKey;
                stableNoteCount = 1;
            }
            if (stableNoteCount === 15) {
                maybeAddHistory(info);
            }
        } else {
            currentFreq = 0;
            currentNote = '--';
            currentOctave = '';
            currentCents = 0;
            smoothedCents = smoothedCents * 0.9;
            stableNoteCount = 0;
            lastStableNote = '';
        }

        updateUI();
        animFrameId = requestAnimationFrame(processAudio);
    }

    function triggerVibration() {
        if (navigator.vibrate) {
            var now = Date.now();
            if (now - lastVibrateTime > 2000) {
                navigator.vibrate(50);
                lastVibrateTime = now;
            }
        }
    }

    function maybeAddHistory(info) {
        var now = Date.now();
        if (now - lastHistoryTime < 2000) return;
        lastHistoryTime = now;

        var absCents = Math.abs(info.cents);
        var passed = absCents <= 5;
        var timeStr = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        history.unshift({
            note: info.note + info.octave,
            freq: currentFreq,
            cents: info.cents,
            passed: passed,
            time: timeStr
        });

        if (history.length > 10) history.pop();
        renderHistory();
    }

    function renderHistory() {
        var listEl = document.getElementById('historyList');
        if (history.length === 0) {
            listEl.innerHTML = '<div class="history-empty">暂无调音记录</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < history.length; i++) {
            var item = history[i];
            var icon = item.passed ? '✅' : '⚠️';
            var cls = item.passed ? 'hi-pass' : 'hi-fail';
            html += '<div class="history-item">' +
                '<div class="hi-left">' +
                '<span class="hi-icon">' + icon + '</span>' +
                '<span class="hi-note">' + item.note + '</span>' +
                '<span class="hi-freq">' + item.freq.toFixed(1) + 'Hz</span>' +
                '</div>' +
                '<div class="hi-right">' +
                '<div class="hi-cents ' + cls + '">' + (item.cents >= 0 ? '+' : '') + item.cents.toFixed(1) + '¢</div>' +
                '<div class="hi-time">' + item.time + '</div>' +
                '</div>' +
                '</div>';
        }
        listEl.innerHTML = html;
    }

    function buildStringButtons() {
        var container = document.getElementById('stringButtons');
        var group = document.getElementById('stringsGroup');
        var inst = INSTRUMENTS[currentMode];

        if (!inst.strings || inst.strings.length === 0) {
            group.style.display = 'none';
            return;
        }

        group.style.display = 'block';
        container.innerHTML = '';
        currentStringIndex = 0;

        for (var i = 0; i < inst.strings.length; i++) {
            var btn = document.createElement('button');
            btn.className = 'string-btn' + (i === 0 ? ' active' : '');
            btn.textContent = inst.strings[i].name;
            btn.setAttribute('data-index', i);
            btn.addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'));
                currentStringIndex = idx;
                var btns = container.querySelectorAll('.string-btn');
                for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
                this.classList.add('active');
            });
            container.appendChild(btn);
        }
    }

    async function startTuner() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('您的浏览器不支持麦克风访问，请使用现代浏览器（Chrome、Safari、Firefox）。');
            return;
        }

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
        } catch (err) {
            console.error('Microphone access denied:', err);
            document.getElementById('permissionModal').classList.remove('hidden');
            return;
        }

        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var source = audioCtx.createMediaStreamSource(mediaStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 4096;
        source.connect(analyser);

        isRunning = true;
        document.getElementById('startBtn').textContent = '⏹ 停止调音';
        document.getElementById('startBtn').classList.add('active');
        document.getElementById('permissionModal').classList.add('hidden');

        processAudio();
    }

    function stopTuner() {
        isRunning = false;
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(function (t) { t.stop(); });
            mediaStream = null;
        }
        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }
        analyser = null;

        currentFreq = 0;
        currentNote = '--';
        currentOctave = '';
        currentCents = 0;
        smoothedCents = 0;
        volumeLevel = 0;
        stableNoteCount = 0;
        lastStableNote = '';

        document.getElementById('startBtn').textContent = '🎤 开始调音';
        document.getElementById('startBtn').classList.remove('active');
        updateUI();
    }

    function init() {
        drawMeter(0);

        document.getElementById('startBtn').addEventListener('click', function () {
            if (isRunning) {
                stopTuner();
            } else {
                startTuner();
            }
        });

        var modeBtns = document.querySelectorAll('.mode-btn');
        for (var i = 0; i < modeBtns.length; i++) {
            modeBtns[i].addEventListener('click', function () {
                for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.remove('active');
                this.classList.add('active');
                currentMode = this.getAttribute('data-mode');
                buildStringButtons();
            });
        }

        buildStringButtons();

        document.getElementById('calibDown').addEventListener('click', function () {
            a4Freq = Math.max(400, a4Freq - 1);
            document.getElementById('calibValue').textContent = a4Freq;
        });

        document.getElementById('calibUp').addEventListener('click', function () {
            a4Freq = Math.min(480, a4Freq + 1);
            document.getElementById('calibValue').textContent = a4Freq;
        });

        var calibDownInterval = null;
        var calibUpInterval = null;

        document.getElementById('calibDown').addEventListener('mousedown', function () {
            var self = this;
            calibDownInterval = setInterval(function () {
                a4Freq = Math.max(400, a4Freq - 1);
                document.getElementById('calibValue').textContent = a4Freq;
            }, 120);
        });
        document.getElementById('calibDown').addEventListener('mouseup', function () { clearInterval(calibDownInterval); });
        document.getElementById('calibDown').addEventListener('mouseleave', function () { clearInterval(calibDownInterval); });

        document.getElementById('calibUp').addEventListener('mousedown', function () {
            calibUpInterval = setInterval(function () {
                a4Freq = Math.min(480, a4Freq + 1);
                document.getElementById('calibValue').textContent = a4Freq;
            }, 120);
        });
        document.getElementById('calibUp').addEventListener('mouseup', function () { clearInterval(calibUpInterval); });
        document.getElementById('calibUp').addEventListener('mouseleave', function () { clearInterval(calibUpInterval); });

        document.getElementById('themeToggle').addEventListener('click', function () {
            var html = document.documentElement;
            var current = html.getAttribute('data-theme');
            var next = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', next);
            this.textContent = next === 'dark' ? '🌙' : '☀️';
            drawMeter(smoothedCents);
        });

        document.getElementById('clearHistory').addEventListener('click', function () {
            history = [];
            renderHistory();
        });

        document.getElementById('permissionRetry').addEventListener('click', function () {
            document.getElementById('permissionModal').classList.add('hidden');
            startTuner();
        });

        window.addEventListener('resize', function () {
            drawMeter(smoothedCents);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
