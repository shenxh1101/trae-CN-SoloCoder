(function () {
    'use strict';

    var KW = 1e-14;
    var MAX_VOLUME = 250;
    var BEAKER_MAX_Y = 360;
    var BEAKER_MIN_Y = 60;
    var BEAKER_LIQUID_RANGE = BEAKER_MAX_Y - BEAKER_MIN_Y;
    var MAX_CURVE_POINTS = 500;

    var state = {
        totalVolume: 100,
        hMoles: 0,
        history: [],
        curveData: [],
        phenolphthalein: false,
        methylOrange: false,
        soundEnabled: true,
        titrationActive: false,
        titrationInterval: null,
        previousPH: 7.0
    };

    var audioCtx = null;

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioCtx;
    }

    function playBeep(freq, duration) {
        if (!state.soundEnabled) return;
        try {
            var ctx = getAudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq || 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (duration || 0.3));
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + (duration || 0.3));
        } catch (e) { /* ignore */ }
    }

    function playCrossingSound() {
        playBeep(660, 0.15);
        setTimeout(function () { playBeep(880, 0.15); }, 150);
        setTimeout(function () { playBeep(1100, 0.2); }, 300);
    }

    function showToast(message) {
        var existing = document.getElementById('toast-msg');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.id = 'toast-msg';
        toast.textContent = message;
        toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,20,50,0.95);color:#e0e8f5;padding:10px 24px;border-radius:8px;border:1px solid rgba(80,120,180,0.3);font-size:13px;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;font-family:Noto Sans SC,sans-serif;';
        document.body.appendChild(toast);
        requestAnimationFrame(function () { toast.style.opacity = '1'; });
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
        }, 2000);
    }

    function calcHConcFromNet(Cnet) {
        if (Cnet > 1e-12) {
            return (Cnet + Math.sqrt(Cnet * Cnet + 4 * KW)) / 2;
        } else if (Cnet < -1e-12) {
            var CnetOH = -Cnet;
            var ohConc = (CnetOH + Math.sqrt(CnetOH * CnetOH + 4 * KW)) / 2;
            return KW / ohConc;
        } else {
            return Math.sqrt(KW);
        }
    }

    function calcPH() {
        if (state.totalVolume <= 0) return 7.0;
        var V = state.totalVolume / 1000;
        var Cnet = state.hMoles / V;
        var hConc = calcHConcFromNet(Cnet);
        var ph = -Math.log10(Math.max(hConc, 1e-15));
        return Math.max(0, Math.min(14, ph));
    }

    function getHConc() {
        if (state.totalVolume <= 0) return 1e-7;
        var V = state.totalVolume / 1000;
        var Cnet = state.hMoles / V;
        return Math.max(calcHConcFromNet(Cnet), 1e-15);
    }

    function getOHConc() {
        return KW / getHConc();
    }

    function formatScientific(num) {
        if (num === 0) return '0';
        var exp = Math.floor(Math.log10(Math.abs(num)));
        var mantissa = num / Math.pow(10, exp);
        var superscripts = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
        var expStr = String(exp).split('').map(function (c) { return superscripts[c] || c; }).join('');
        return mantissa.toFixed(2) + '×10' + expStr;
    }

    function getBaseColor(ph) {
        if (ph <= 3) return { r: 220, g: 30, b: 50 };
        if (ph <= 5) {
            var t = (ph - 3) / 2;
            return { r: Math.round(220 + (200 - 220) * t), g: Math.round(30 + (120 - 30) * t), b: Math.round(50 + (20 - 50) * t) };
        }
        if (ph <= 6.5) {
            var t2 = (ph - 5) / 1.5;
            return { r: Math.round(200 + (255 - 200) * t2), g: Math.round(120 + (194 - 120) * t2), b: Math.round(20 + (59 - 20) * t2) };
        }
        if (ph <= 7.5) {
            var t3 = (ph - 6.5) / 1;
            return { r: Math.round(255 + (100 - 255) * t3), g: Math.round(194 + (200 - 194) * t3), b: Math.round(59 + (80 - 59) * t3) };
        }
        if (ph <= 9) {
            var t4 = (ph - 7.5) / 1.5;
            return { r: Math.round(100 - 50 * t4), g: Math.round(200 - 60 * t4), b: Math.round(80 + 140 * t4) };
        }
        if (ph <= 11) {
            var t5 = (ph - 9) / 2;
            return { r: Math.round(50 - 20 * t5), g: Math.round(140 - 40 * t5), b: Math.round(220 + 35 * t5) };
        }
        return { r: 20, g: 60, b: 255 };
    }

    function getPhenolphthaleinColor(ph) {
        if (ph < 8.2) return null;
        if (ph <= 10) {
            var t = (ph - 8.2) / 1.8;
            return { r: Math.round(200 + 55 * t), g: Math.round(50 + 20 * (1 - t)), b: Math.round(100 + 60 * t) };
        }
        return { r: 255, g: 30, b: 160 };
    }

    function getMethylOrangeColor(ph) {
        if (ph < 3.1) return { r: 220, g: 40, b: 30 };
        if (ph <= 4.4) {
            var t = (ph - 3.1) / 1.3;
            return { r: Math.round(220 + 35 * t), g: Math.round(40 + 130 * t), b: Math.round(30 + 20 * t) };
        }
        return { r: 255, g: 210, b: 50 };
    }

    function getLiquidColor(ph) {
        var hasIndicator = state.phenolphthalein || state.methylOrange;

        if (!hasIndicator) {
            var base = getBaseColor(ph);
            return 'rgb(' + base.r + ',' + base.g + ',' + base.b + ')';
        }

        var colors = [];
        if (state.phenolphthalein) {
            var pp = getPhenolphthaleinColor(ph);
            if (pp) colors.push(pp);
        }
        if (state.methylOrange) {
            var mo = getMethylOrangeColor(ph);
            if (mo) colors.push(mo);
        }

        if (colors.length === 0) {
            return 'rgba(180, 210, 240, 0.4)';
        }

        var r = 0, g = 0, b = 0;
        colors.forEach(function (c) {
            r += c.r;
            g += c.g;
            b += c.b;
        });
        r = Math.min(255, Math.round(r / colors.length));
        g = Math.min(255, Math.round(g / colors.length));
        b = Math.min(255, Math.round(b / colors.length));

        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function getPhColor(ph) {
        if (ph < 4) return '#ff3b5c';
        if (ph < 6) return '#ff8a65';
        if (ph < 6.5) return '#ffc23b';
        if (ph <= 7.5) return '#8bc34a';
        if (ph <= 9) return '#00bcd4';
        return '#3b7bff';
    }

    function updateUI() {
        var ph = calcPH();
        var hConc = getHConc();
        var ohConc = getOHConc();

        var phEl = document.getElementById('ph-value');
        phEl.textContent = ph.toFixed(2);
        phEl.style.color = getPhColor(ph);

        var indicator = document.getElementById('ph-indicator');
        var pct = (ph / 14) * 100;
        indicator.style.left = pct + '%';

        document.getElementById('h-conc').textContent = formatScientific(hConc);
        document.getElementById('oh-conc').textContent = formatScientific(ohConc);

        var liquid = document.getElementById('liquid');
        var volumeRatio = Math.min(state.totalVolume / MAX_VOLUME, 1);
        var liquidHeight = volumeRatio * BEAKER_LIQUID_RANGE;
        var liquidY = BEAKER_MAX_Y - liquidHeight;
        liquid.setAttribute('y', liquidY);
        liquid.setAttribute('height', liquidHeight);
        liquid.setAttribute('fill', getLiquidColor(ph));

        document.getElementById('volume-label').textContent = Math.round(state.totalVolume) + ' mL';

        if ((state.previousPH - 7) * (ph - 7) < 0) {
            playCrossingSound();
        }
        state.previousPH = ph;

        drawCurve();
    }

    function addReagent(name, deltaHMoles, volumeML, type) {
        if (state.titrationActive && type !== 'titration') return;
        if (state.totalVolume + volumeML > MAX_VOLUME) {
            showToast('烧杯已满！无法继续添加试剂');
            return;
        }

        var prevPH = calcPH();

        state.totalVolume += volumeML;
        state.hMoles += deltaHMoles;

        var newPH = calcPH();

        state.history.push({
            name: name,
            volume: volumeML,
            type: type || name,
            prevPH: prevPH,
            newPH: newPH,
            totalVolume: state.totalVolume,
            hConc: getHConc(),
            ohConc: getOHConc()
        });

        state.curveData.push({
            volume: state.totalVolume,
            ph: newPH
        });

        addBubble();
        renderHistory();
        updateUI();

        flashButton(type || name);
    }

    function addBubble() {
        var bubblesContainer = document.getElementById('bubbles');
        for (var i = 0; i < 3; i++) {
            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            var cx = 120 + Math.random() * 60;
            var volumeRatio = Math.min(state.totalVolume / MAX_VOLUME, 1);
            var cy = BEAKER_MAX_Y - Math.random() * (volumeRatio * BEAKER_LIQUID_RANGE * 0.5);
            var r = 2 + Math.random() * 3;
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', 'rgba(255,255,255,0.25)');
            circle.classList.add('bubble');
            circle.style.animationDuration = (1.5 + Math.random()) + 's';
            bubblesContainer.appendChild(circle);
            (function (el) {
                setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, 3000);
            })(circle);
        }
    }

    function flashButton(type) {
        var btnMap = { '盐酸': 'btn-hcl', '氢氧化钠': 'btn-naoh', '水': 'btn-water', 'hcl': 'btn-hcl', 'naoh': 'btn-naoh', 'water': 'btn-water', 'titration': null, 'buffer': null };
        var btnId = btnMap[type];
        if (btnId) {
            var btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.add('flash');
                setTimeout(function () { btn.classList.remove('flash'); }, 400);
            }
        }
    }

    function renderHistory() {
        var list = document.getElementById('history-list');
        if (state.history.length === 0) {
            list.innerHTML = '<div class="history-empty">尚无记录，请添加试剂</div>';
            return;
        }

        var html = '';
        var items = state.history.slice().reverse();
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var dotClass = 'water';
            if (item.type === '盐酸' || item.type === 'hcl') dotClass = 'hcl';
            else if (item.type === '氢氧化钠' || item.type === 'naoh') dotClass = 'naoh';
            else if (item.type === 'buffer') dotClass = 'buffer';

            var phChange = item.newPH - item.prevPH;
            var changeStr = phChange >= 0 ? '+' + phChange.toFixed(2) : phChange.toFixed(2);
            var phColor = getPhColor(item.newPH);

            html += '<div class="history-item">' +
                '<span class="history-dot ' + dotClass + '"></span>' +
                '<div class="history-info">' +
                '<div class="history-name">' + item.name + '</div>' +
                '<div class="history-detail">' + item.volume + 'mL · 总体积 ' + Math.round(item.totalVolume) + 'mL</div>' +
                '</div>' +
                '<span class="history-ph" style="color:' + phColor + '">' + item.newPH.toFixed(2) + ' <small style="color:' + (phChange > 0 ? '#4caf50' : phChange < 0 ? '#ff5252' : '#999') + '">(' + changeStr + ')</small></span>' +
                '</div>';
        }
        list.innerHTML = html;
    }

    function sampleCurveData() {
        var data = state.curveData;
        if (data.length <= MAX_CURVE_POINTS) return data;
        var step = data.length / MAX_CURVE_POINTS;
        var sampled = [data[0]];
        for (var i = 1; i < MAX_CURVE_POINTS - 1; i++) {
            var idx = Math.round(i * step);
            sampled.push(data[idx]);
        }
        sampled.push(data[data.length - 1]);
        return sampled;
    }

    function drawCurve() {
        var canvas = document.getElementById('ph-curve');
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        if (rect.width === 0) return;
        canvas.width = rect.width * dpr;
        canvas.height = 200 * dpr;
        ctx.scale(dpr, dpr);
        var w = rect.width;
        var h = 200;

        ctx.clearRect(0, 0, w, h);

        var pad = { top: 20, right: 16, bottom: 28, left: 40 };
        var plotW = w - pad.left - pad.right;
        var plotH = h - pad.top - pad.bottom;

        ctx.fillStyle = 'rgba(140, 165, 200, 0.3)';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'right';

        for (var phLine = 0; phLine <= 14; phLine += 2) {
            var y = pad.top + plotH - (phLine / 14) * plotH;
            ctx.strokeStyle = 'rgba(80, 120, 180, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + plotW, y);
            ctx.stroke();
            ctx.fillText(phLine.toString(), pad.left - 6, y + 3);
        }

        var curveData = sampleCurveData();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(140, 165, 200, 0.3)';

        var maxVol = 0;
        curveData.forEach(function (d) { if (d.volume > maxVol) maxVol = d.volume; });
        maxVol = Math.max(maxVol, 50);
        var volStep = Math.ceil(maxVol / 5 / 10) * 10;
        if (volStep < 1) volStep = 10;

        for (var v = 0; v <= maxVol; v += volStep) {
            var x = pad.left + (v / maxVol) * plotW;
            ctx.strokeStyle = 'rgba(80, 120, 180, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, pad.top);
            ctx.lineTo(x, pad.top + plotH);
            ctx.stroke();
            ctx.fillText(v + '', x, h - pad.bottom + 14);
        }

        ctx.strokeStyle = 'rgba(140, 165, 200, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pad.left, pad.top, plotW, plotH);

        if (curveData.length < 2) {
            ctx.fillStyle = 'rgba(140, 165, 200, 0.25)';
            ctx.font = '11px Noto Sans SC, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('添加试剂后显示pH曲线', w / 2, h / 2);
            return;
        }

        var gradient = ctx.createLinearGradient(pad.left, pad.top, pad.left, pad.top + plotH);
        gradient.addColorStop(0, 'rgba(255, 59, 92, 0.08)');
        gradient.addColorStop(0.5, 'rgba(255, 194, 59, 0.05)');
        gradient.addColorStop(1, 'rgba(59, 123, 255, 0.08)');

        ctx.beginPath();
        ctx.moveTo(pad.left + (curveData[0].volume / maxVol) * plotW, pad.top + plotH);
        curveData.forEach(function (d) {
            var cx = pad.left + (d.volume / maxVol) * plotW;
            var cy = pad.top + plotH - (d.ph / 14) * plotH;
            ctx.lineTo(cx, cy);
        });
        var lastD = curveData[curveData.length - 1];
        ctx.lineTo(pad.left + (lastD.volume / maxVol) * plotW, pad.top + plotH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        var first = true;
        curveData.forEach(function (d) {
            var cx = pad.left + (d.volume / maxVol) * plotW;
            var cy = pad.top + plotH - (d.ph / 14) * plotH;
            if (first) {
                ctx.moveTo(cx, cy);
                first = false;
            } else {
                ctx.lineTo(cx, cy);
            }
        });
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        var last = curveData[curveData.length - 1];
        var lastX = pad.left + (last.volume / maxVol) * plotW;
        var lastY = pad.top + plotH - (last.ph / 14) * plotH;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = getPhColor(last.ph);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(140, 165, 200, 0.3)';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('体积 (mL)', pad.left + plotW / 2, h - 2);

        ctx.save();
        ctx.translate(10, pad.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('pH', 0, 0);
        ctx.restore();
    }

    function resetBeaker() {
        stopTitration();
        state.totalVolume = 100;
        state.hMoles = 0;
        state.history = [];
        state.curveData = [];
        state.previousPH = 7.0;
        state.curveData.push({ volume: state.totalVolume, ph: calcPH() });
        renderHistory();
        updateUI();
        showToast('烧杯已重置');
    }

    function setBuffer(targetPH) {
        stopTitration();
        var prevPH = calcPH();

        state.totalVolume = 100;
        if (targetPH === 7) {
            state.hMoles = 0;
        } else if (targetPH < 7) {
            var hConc = Math.pow(10, -targetPH);
            state.hMoles = hConc * (state.totalVolume / 1000);
        } else {
            var ohConc = Math.pow(10, -(14 - targetPH));
            state.hMoles = -(ohConc * (state.totalVolume / 1000));
        }

        var newPH = calcPH();

        state.history.push({
            name: '缓冲溶液 pH' + targetPH,
            volume: 100,
            type: 'buffer',
            prevPH: prevPH,
            newPH: newPH,
            totalVolume: state.totalVolume,
            hConc: getHConc(),
            ohConc: getOHConc()
        });

        state.curveData = [{ volume: state.totalVolume, ph: newPH }];

        renderHistory();
        updateUI();
        showToast('已切换至缓冲溶液 pH ' + targetPH);
    }

    function startTitration() {
        if (state.titrationActive) return;

        var reagent = document.getElementById('titration-reagent').value;
        var speed = parseInt(document.getElementById('titration-speed').value);
        var targetPH = parseFloat(document.getElementById('titration-target').value);

        if (isNaN(targetPH) || targetPH < 0 || targetPH > 14) {
            showToast('请输入有效的目标pH值 (0-14)');
            return;
        }

        var currentPH = calcPH();

        if (reagent === 'hcl' && currentPH <= targetPH) {
            showToast('当前pH (' + currentPH.toFixed(2) + ') 已低于或等于目标pH，无需加入盐酸');
            return;
        }
        if (reagent === 'naoh' && currentPH >= targetPH) {
            showToast('当前pH (' + currentPH.toFixed(2) + ') 已高于或等于目标pH，无需加入NaOH');
            return;
        }

        var dropVolume = 0.5;
        var concentration = 0.1;
        var deltaH = reagent === 'hcl'
            ? concentration * dropVolume / 1000
            : -(concentration * dropVolume / 1000);

        var intervalMs = Math.round(1000 / speed);

        var reagentName = reagent === 'hcl' ? '盐酸' : '氢氧化钠';
        var reagentType = reagent === 'hcl' ? 'hcl' : 'naoh';

        state.titrationActive = true;
        document.getElementById('btn-titration-start').disabled = true;
        document.getElementById('btn-titration-stop').disabled = false;
        document.querySelector('.beaker-wrapper').classList.add('titration-active');

        function checkTarget() {
            var ph = calcPH();
            if (state.totalVolume >= MAX_VOLUME) {
                stopTitration();
                showToast('烧杯已满，滴定停止');
                return true;
            }
            if (reagent === 'hcl' && ph <= targetPH) {
                stopTitration();
                showToast('已达到目标pH ' + targetPH.toFixed(1));
                return true;
            }
            if (reagent === 'naoh' && ph >= targetPH) {
                stopTitration();
                showToast('已达到目标pH ' + targetPH.toFixed(1));
                return true;
            }
            return false;
        }

        state.titrationInterval = setInterval(function () {
            if (checkTarget()) return;
            if (state.totalVolume + dropVolume > MAX_VOLUME) {
                stopTitration();
                showToast('烧杯已满，滴定停止');
                return;
            }

            var prevPH = calcPH();
            state.totalVolume += dropVolume;
            state.hMoles += deltaH;

            var newPH = calcPH();

            state.history.push({
                name: reagentName + ' (滴定)',
                volume: dropVolume,
                type: reagentType,
                prevPH: prevPH,
                newPH: newPH,
                totalVolume: state.totalVolume,
                hConc: getHConc(),
                ohConc: getOHConc()
            });

            state.curveData.push({
                volume: state.totalVolume,
                ph: newPH
            });

            renderHistory();
            updateUI();

            checkTarget();
        }, intervalMs);
    }

    function stopTitration() {
        if (state.titrationInterval) {
            clearInterval(state.titrationInterval);
            state.titrationInterval = null;
        }
        state.titrationActive = false;
        document.getElementById('btn-titration-start').disabled = false;
        document.getElementById('btn-titration-stop').disabled = true;
        var wrapper = document.querySelector('.beaker-wrapper');
        if (wrapper) wrapper.classList.remove('titration-active');
    }

    function exportCSV() {
        if (state.history.length === 0) {
            showToast('尚无实验数据可导出');
            return;
        }

        var csv = '\uFEFF步骤,试剂,体积(mL),累计体积(mL),pH值,H⁺浓度(mol/L),OH⁻浓度(mol/L)\n';

        state.history.forEach(function (item, idx) {
            var hConc = item.hConc || Math.pow(10, -item.newPH);
            var ohConc = item.ohConc || (KW / hConc);
            csv += (idx + 1) + ',' + item.name + ',' + item.volume.toFixed(1) + ',' +
                item.totalVolume.toFixed(1) + ',' + item.newPH.toFixed(2) + ',' +
                hConc.toExponential(4) + ',' + ohConc.toExponential(4) + '\n';
        });

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'pH_experiment_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV文件已导出 (' + state.history.length + '条记录)');
    }

    function runTests() {
        var results = [];
        var pass = 0;
        var fail = 0;

        function assert(condition, description) {
            if (condition) {
                pass++;
                results.push('✅ ' + description);
            } else {
                fail++;
                results.push('❌ ' + description);
            }
        }

        function approx(a, b, eps) {
            return Math.abs(a - b) < (eps || 0.05);
        }

        var savedState = JSON.parse(JSON.stringify(state));

        state.totalVolume = 100;
        state.hMoles = 0;
        state.previousPH = 7.0;

        var ph = calcPH();
        assert(approx(ph, 7.0), '纯水 pH = 7.00 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = 0.001;
        ph = calcPH();
        assert(approx(ph, 2.0), '0.01M HCl pH ≈ 2.00 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = -0.001;
        ph = calcPH();
        assert(approx(ph, 12.0), '0.01M NaOH pH ≈ 12.00 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = 0.01;
        ph = calcPH();
        assert(approx(ph, 1.0), '0.1M HCl pH ≈ 1.00 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = -0.01;
        ph = calcPH();
        assert(approx(ph, 13.0), '0.1M NaOH pH ≈ 13.00 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = 0;
        state.totalVolume = 100;
        ph = calcPH();
        assert(approx(ph, 7.0), '中性溶液 pH = 7.00 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = 1e-8;
        state.totalVolume = 100;
        ph = calcPH();
        assert(approx(ph, 6.79, 0.05), '极稀酸(1e-7M) pH ≈ 6.79 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = 0;
        state.totalVolume = 110;
        ph = calcPH();
        assert(approx(ph, 7.0), '纯水稀释仍为 pH 7 (实际: ' + ph.toFixed(2) + ')');

        state.hMoles = 0.001;
        state.totalVolume = 110;
        ph = calcPH();
        var dilutedPH = -Math.log10(0.001 / 0.110);
        assert(approx(ph, dilutedPH), '酸加水稀释 pH升高 (实际: ' + ph.toFixed(2) + ', 期望: ' + dilutedPH.toFixed(2) + ')');

        state.totalVolume = 100;
        state.hMoles = Math.pow(10, -4) * 0.1;
        ph = calcPH();
        assert(approx(ph, 4.0), '缓冲溶液 pH4 (实际: ' + ph.toFixed(2) + ')');

        state.totalVolume = 100;
        state.hMoles = 0;
        ph = calcPH();
        assert(approx(ph, 7.0), '缓冲溶液 pH7 (实际: ' + ph.toFixed(2) + ')');

        state.totalVolume = 100;
        state.hMoles = -(Math.pow(10, -5) * 0.1);
        ph = calcPH();
        assert(approx(ph, 9.0), '缓冲溶液 pH9 (实际: ' + ph.toFixed(2) + ')');

        state.totalVolume = 100;
        state.hMoles = 0.001;
        var hConc = getHConc();
        var ohConc = getOHConc();
        assert(approx(hConc * ohConc, 1e-14, 1e-16), '酸性溶液 Kw验证 [H+][OH-]=1e-14 (实际: ' + (hConc * ohConc).toExponential(2) + ')');

        state.totalVolume = 100;
        state.hMoles = -0.001;
        hConc = getHConc();
        ohConc = getOHConc();
        assert(approx(hConc * ohConc, 1e-14, 1e-16), '碱性溶液 Kw验证 [H+][OH-]=1e-14 (实际: ' + (hConc * ohConc).toExponential(2) + ')');

        var crossingDetected = false;
        var savedPreviousPH = state.previousPH;
        state.previousPH = 8.0;
        state.hMoles = -0.001;
        state.totalVolume = 100;
        window._crossingTriggered = false;
        var origPlay = playCrossingSound;
        playCrossingSound = function () { window._crossingTriggered = true; };

        state.hMoles = 0.001;
        updateUI();
        crossingDetected = window._crossingTriggered;

        playCrossingSound = origPlay;
        state.previousPH = savedPreviousPH;
        assert(crossingDetected, 'pH 从碱性跨过7到酸性时声音提示触发');

        state.previousPH = 5.0;
        state.hMoles = -0.001;
        state.totalVolume = 100;
        window._crossingTriggered = false;
        playCrossingSound = function () { window._crossingTriggered = true; };
        updateUI();
        var crossingDetected2 = window._crossingTriggered;
        state.previousPH = savedPreviousPH;
        playCrossingSound = origPlay;
        assert(crossingDetected2, 'pH 从酸性跨过7到碱性时声音提示触发');

        var csvTestHistory = [
            { name: '盐酸', volume: 10, type: '盐酸', prevPH: 7.0, newPH: 2.04, totalVolume: 110, hConc: 0.00909, ohConc: 1.1e-12 }
        ];
        var testCSV = '\uFEFF步骤,试剂,体积(mL),累计体积(mL),pH值,H⁺浓度(mol/L),OH⁻浓度(mol/L)\n';
        csvTestHistory.forEach(function (item, idx) {
            var hc = item.hConc || Math.pow(10, -item.newPH);
            var oc = item.ohConc || (KW / hc);
            testCSV += (idx + 1) + ',' + item.name + ',' + item.volume.toFixed(1) + ',' +
                item.totalVolume.toFixed(1) + ',' + item.newPH.toFixed(2) + ',' +
                hc.toExponential(4) + ',' + oc.toExponential(4) + '\n';
        });
        assert(testCSV.indexOf('步骤') >= 0 && testCSV.indexOf('试剂') >= 0 && testCSV.indexOf('累计体积') >= 0, 'CSV 包含所有必要列头');
        assert(testCSV.indexOf('110.0') >= 0, 'CSV 累计体积使用 totalVolume');
        assert(testCSV.indexOf('9.0900e-3') >= 0, 'CSV H⁺浓度科学计数法格式正确');

        state.totalVolume = 100;
        state.hMoles = 0.01;
        state.previousPH = calcPH();
        var titrationSteps = 0;
        for (var step = 0; step < 400; step++) {
            if (state.totalVolume + 0.5 > MAX_VOLUME) break;
            var prevPHT = calcPH();
            state.totalVolume += 0.5;
            state.hMoles -= 0.1 * 0.5 / 1000;
            var newPHT = calcPH();
            titrationSteps++;
            if (newPHT >= 7.0) break;
        }
        var titrationPH = calcPH();
        assert(titrationPH >= 6.95, 'NaOH滴定HCl: 达到等价点附近pH≈7 (实际: ' + titrationPH.toFixed(2) + ', 步数: ' + titrationSteps + ')');
        assert(titrationSteps >= 190, 'NaOH滴定HCl: 需要~200滴达到等价点 (实际: ' + titrationSteps + ')');

        state.totalVolume = savedState.totalVolume;
        state.hMoles = savedState.hMoles;
        state.previousPH = savedState.previousPH;
        state.history = savedState.history;
        state.curveData = savedState.curveData;

        var summary = '\n========== pH模拟器综合测试报告 ==========\n' +
            results.join('\n') + '\n' +
            '----------------------------------------\n' +
            '通过: ' + pass + '/' + (pass + fail) + '\n' +
            '失败: ' + fail + '/' + (pass + fail) + '\n' +
            '========================================';

        console.log(summary);
        return { pass: pass, fail: fail, results: results };
    }

    function init() {
        state.curveData.push({ volume: state.totalVolume, ph: calcPH() });

        document.getElementById('btn-hcl').addEventListener('click', function () {
            addReagent('盐酸', 0.1 * 10 / 1000, 10, '盐酸');
        });

        document.getElementById('btn-naoh').addEventListener('click', function () {
            addReagent('氢氧化钠', -0.1 * 10 / 1000, 10, '氢氧化钠');
        });

        document.getElementById('btn-water').addEventListener('click', function () {
            addReagent('蒸馏水', 0, 10, '水');
        });

        document.getElementById('btn-reset').addEventListener('click', resetBeaker);
        document.getElementById('btn-export').addEventListener('click', exportCSV);

        document.getElementById('btn-sound').addEventListener('click', function () {
            state.soundEnabled = !state.soundEnabled;
            this.classList.toggle('active', state.soundEnabled);
            if (state.soundEnabled) playBeep(440, 0.1);
        });
        document.getElementById('btn-sound').classList.add('active');

        document.getElementById('toggle-phenolphthalein').addEventListener('change', function () {
            state.phenolphthalein = this.checked;
            updateUI();
        });

        document.getElementById('toggle-methyl-orange').addEventListener('change', function () {
            state.methylOrange = this.checked;
            updateUI();
        });

        document.querySelectorAll('.buffer-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var ph = parseInt(this.getAttribute('data-ph'));
                setBuffer(ph);
            });
        });

        document.getElementById('btn-titration-start').addEventListener('click', startTitration);
        document.getElementById('btn-titration-stop').addEventListener('click', stopTitration);

        document.getElementById('titration-speed').addEventListener('input', function () {
            document.getElementById('speed-display').textContent = this.value + ' 滴/秒';
            if (state.titrationActive) {
                stopTitration();
                startTitration();
            }
        });

        updateUI();

        window.pHSimTest = runTests;

        setTimeout(function () {
            console.log('%c🔬 pH模拟器已加载。在控制台输入 pHSimTest() 运行综合测试。', 'color: #6ea8fe; font-size: 14px; font-weight: bold;');
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
