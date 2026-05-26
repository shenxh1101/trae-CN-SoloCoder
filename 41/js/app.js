(function() {
    'use strict';

    const CHAR_SETS = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    const AMBIGUOUS_CHARS = '0O1lI';

    const SYLLABLES = {
        vowels: 'aeiou',
        consonants: 'bcdfghjklmnpqrstvwxyz',
        blends: ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'th', 'tr', 'tw', 'wh', 'wr']
    };

    const STORAGE_KEYS = {
        HISTORY: 'passwordGeneratorHistory',
        THEME: 'passwordGeneratorTheme'
    };

    const MAX_HISTORY = 20;

    const elements = {
        passwordOutput: document.getElementById('password-output'),
        copyBtn: document.getElementById('copy-btn'),
        generateBtn: document.getElementById('generate-btn'),
        generateBatchBtn: document.getElementById('generate-batch-btn'),
        saveHistoryBtn: document.getElementById('save-history-btn'),
        lengthSlider: document.getElementById('length-slider'),
        lengthValue: document.getElementById('length-value'),
        includeUppercase: document.getElementById('include-uppercase'),
        includeLowercase: document.getElementById('include-lowercase'),
        includeNumbers: document.getElementById('include-numbers'),
        includeSymbols: document.getElementById('include-symbols'),
        excludeAmbiguous: document.getElementById('exclude-ambiguous'),
        pronounceable: document.getElementById('pronounceable'),
        strengthIndicator: document.getElementById('strength-indicator'),
        strengthText: document.getElementById('strength-text'),
        batchResultsSection: document.getElementById('batch-results-section'),
        batchPasswordsList: document.getElementById('batch-passwords-list'),
        clearBatchBtn: document.getElementById('clear-batch-btn'),
        historyList: document.getElementById('history-list'),
        historyCount: document.getElementById('history-count'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toast-message')
    };

    let currentPassword = '';
    let currentSettings = {};

    function init() {
        loadTheme();
        loadHistory();
        bindEvents();
        updateLengthDisplay();
    }

    function bindEvents() {
        elements.lengthSlider.addEventListener('input', updateLengthDisplay);
        elements.generateBtn.addEventListener('click', generateSinglePassword);
        elements.generateBatchBtn.addEventListener('click', generateBatchPasswords);
        elements.copyBtn.addEventListener('click', copyCurrentPassword);
        elements.saveHistoryBtn.addEventListener('click', saveCurrentToHistory);
        elements.clearBatchBtn.addEventListener('click', clearBatchResults);
        elements.clearHistoryBtn.addEventListener('click', clearAllHistory);
        elements.themeToggle.addEventListener('click', toggleTheme);

        [elements.includeUppercase, elements.includeLowercase, elements.includeNumbers, elements.includeSymbols].forEach(el => {
            el.addEventListener('change', ensureAtLeastOneSelected);
        });
    }

    function getRandomInt(max) {
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return array[0] % max;
    }

    function getRandomChar(chars) {
        return chars.charAt(getRandomInt(chars.length));
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = getRandomInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function getCurrentSettings() {
        return {
            length: parseInt(elements.lengthSlider.value),
            includeUppercase: elements.includeUppercase.checked,
            includeLowercase: elements.includeLowercase.checked,
            includeNumbers: elements.includeNumbers.checked,
            includeSymbols: elements.includeSymbols.checked,
            excludeAmbiguous: elements.excludeAmbiguous.checked,
            pronounceable: elements.pronounceable.checked
        };
    }

    function buildCharset(settings) {
        let charset = '';
        const usedSets = [];

        if (settings.includeUppercase) {
            let chars = CHAR_SETS.uppercase;
            if (settings.excludeAmbiguous) {
                chars = chars.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
            }
            charset += chars;
            usedSets.push({ name: 'uppercase', chars });
        }
        if (settings.includeLowercase) {
            let chars = CHAR_SETS.lowercase;
            if (settings.excludeAmbiguous) {
                chars = chars.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
            }
            charset += chars;
            usedSets.push({ name: 'lowercase', chars });
        }
        if (settings.includeNumbers) {
            let chars = CHAR_SETS.numbers;
            if (settings.excludeAmbiguous) {
                chars = chars.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
            }
            charset += chars;
            usedSets.push({ name: 'numbers', chars });
        }
        if (settings.includeSymbols) {
            charset += CHAR_SETS.symbols;
            usedSets.push({ name: 'symbols', chars: CHAR_SETS.symbols });
        }

        return { charset, usedSets };
    }

    function generatePassword(settings) {
        if (settings.pronounceable) {
            return generatePronounceablePassword(settings);
        }
        return generateRandomPassword(settings);
    }

    function generateRandomPassword(settings) {
        const { charset, usedSets } = buildCharset(settings);
        if (!charset) return '';

        const passwordChars = [];

        for (const set of usedSets) {
            passwordChars.push(getRandomChar(set.chars));
        }

        while (passwordChars.length < settings.length) {
            passwordChars.push(getRandomChar(charset));
        }

        return shuffleArray(passwordChars).join('');
    }

    function generatePronounceablePassword(settings) {
        let password = '';
        const useUpper = settings.includeUppercase;
        const useNumbers = settings.includeNumbers;
        const useSymbols = settings.includeSymbols;

        let vowels = SYLLABLES.vowels;
        let consonants = SYLLABLES.consonants;

        if (settings.excludeAmbiguous) {
            vowels = vowels.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
            consonants = consonants.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
        }

        let isVowel = false;
        let length = settings.length;

        if (useNumbers) length -= 1;
        if (useSymbols) length -= 1;

        while (password.length < length) {
            let char;
            if (isVowel) {
                char = getRandomChar(vowels);
            } else {
                if (getRandomInt(3) === 0 && password.length > 0) {
                    char = SYLLABLES.blends[getRandomInt(SYLLABLES.blends.length)];
                } else {
                    char = getRandomChar(consonants);
                }
            }

            if (useUpper && (password.length === 0 || getRandomInt(8) === 0)) {
                char = char.charAt(0).toUpperCase() + char.slice(1);
            }

            password += char;
            isVowel = !isVowel;
        }

        if (useNumbers) {
            let numbers = '23456789';
            if (!settings.excludeAmbiguous) numbers = CHAR_SETS.numbers;
            password += getRandomChar(numbers);
        }

        if (useSymbols) {
            password += getRandomChar(CHAR_SETS.symbols);
        }

        return password.slice(0, settings.length);
    }

    function calculateStrength(password, settings) {
        let score = 0;
        const length = password.length;

        if (length >= 8) score += 1;
        if (length >= 12) score += 1;
        if (length >= 16) score += 1;
        if (length >= 24) score += 1;

        const charsetCount = [
            settings.includeUppercase,
            settings.includeLowercase,
            settings.includeNumbers,
            settings.includeSymbols
        ].filter(Boolean).length;

        score += charsetCount - 1;

        if (settings.excludeAmbiguous) score += 0.5;
        if (settings.pronounceable) score -= 0.5;

        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    }

    function updateStrengthDisplay(password, settings) {
        const strength = calculateStrength(password, settings);
        
        elements.strengthIndicator.className = 'strength-indicator ' + strength;
        elements.strengthText.className = 'strength-text ' + strength;
        
        const strengthLabels = {
            weak: '弱',
            medium: '中',
            strong: '强'
        };
        elements.strengthText.textContent = strengthLabels[strength];
    }

    function generateSinglePassword() {
        const settings = getCurrentSettings();
        currentSettings = settings;
        const password = generatePassword(settings);
        currentPassword = password;

        elements.passwordOutput.value = password;
        elements.passwordOutput.classList.remove('generated');
        void elements.passwordOutput.offsetWidth;
        elements.passwordOutput.classList.add('generated');

        updateStrengthDisplay(password, settings);
    }

    function generateBatchPasswords() {
        const settings = getCurrentSettings();
        currentSettings = settings;
        const passwords = [];

        for (let i = 0; i < 10; i++) {
            passwords.push(generatePassword(settings));
        }

        renderBatchPasswords(passwords);
        elements.batchResultsSection.style.display = 'block';
    }

    function renderBatchPasswords(passwords) {
        elements.batchPasswordsList.innerHTML = '';

        passwords.forEach((password, index) => {
            const item = document.createElement('div');
            item.className = 'batch-password-item';
            item.style.animationDelay = (index * 0.05) + 's';

            item.innerHTML = `
                <span class="batch-password-text">${escapeHtml(password)}</span>
                <div class="batch-password-actions">
                    <button class="batch-action-btn" data-action="copy" title="复制">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="batch-action-btn" data-action="use" title="使用此密码">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('[data-action="copy"]')) {
                    copyToClipboard(password);
                    showToast('密码已复制到剪贴板');
                } else if (e.target.closest('[data-action="use"]')) {
                    usePassword(password);
                } else {
                    usePassword(password);
                }
            });

            elements.batchPasswordsList.appendChild(item);
        });
    }

    function usePassword(password) {
        currentPassword = password;
        elements.passwordOutput.value = password;
        elements.passwordOutput.classList.remove('generated');
        void elements.passwordOutput.offsetWidth;
        elements.passwordOutput.classList.add('generated');
        updateStrengthDisplay(password, currentSettings);
        showToast('已选择此密码');
    }

    function clearBatchResults() {
        elements.batchResultsSection.style.display = 'none';
        elements.batchPasswordsList.innerHTML = '';
    }

    function copyCurrentPassword() {
        if (!currentPassword) {
            showToast('请先生成密码');
            return;
        }
        copyToClipboard(currentPassword);
        showToast('密码已复制到剪贴板');
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
            } finally {
                document.body.removeChild(textarea);
            }
            return Promise.resolve();
        }
    }

    function showToast(message) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.add('show');
        
        setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2000);
    }

    function updateLengthDisplay() {
        elements.lengthValue.textContent = elements.lengthSlider.value;
    }

    function ensureAtLeastOneSelected() {
        const checkboxes = [
            elements.includeUppercase,
            elements.includeLowercase,
            elements.includeNumbers,
            elements.includeSymbols
        ];

        const checkedCount = checkboxes.filter(cb => cb.checked).length;
        if (checkedCount === 0) {
            this.checked = true;
            showToast('至少需要选择一种字符类型');
        }
    }

    function loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
            renderHistory(history);
        } catch (e) {
            console.error('Failed to load history:', e);
            renderHistory([]);
        }
    }

    function saveHistory(history) {
        try {
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
            renderHistory(history);
        } catch (e) {
            console.error('Failed to save history:', e);
            showToast('保存失败，请检查浏览器存储设置');
        }
    }

    function saveCurrentToHistory() {
        if (!currentPassword) {
            showToast('请先生成密码');
            return;
        }

        try {
            const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
            
            const exists = history.some(item => item.password === currentPassword);
            if (exists) {
                showToast('该密码已在历史记录中');
                return;
            }

            const settings = currentSettings || getCurrentSettings();
            const newEntry = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                password: currentPassword,
                length: settings.length,
                charset: getCharsetNames(settings),
                timestamp: Date.now(),
                strength: calculateStrength(currentPassword, settings)
            };

            history.unshift(newEntry);

            if (history.length > MAX_HISTORY) {
                history.splice(MAX_HISTORY);
            }

            saveHistory(history);
            showToast('已添加到历史记录');
        } catch (e) {
            console.error('Failed to save to history:', e);
            showToast('保存失败');
        }
    }

    function getCharsetNames(settings) {
        const names = [];
        if (settings.includeUppercase) names.push('大写');
        if (settings.includeLowercase) names.push('小写');
        if (settings.includeNumbers) names.push('数字');
        if (settings.includeSymbols) names.push('符号');
        return names;
    }

    function renderHistory(history) {
        elements.historyCount.textContent = history.length;

        if (history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>暂无历史记录</p>
                </div>
            `;
            return;
        }

        elements.historyList.innerHTML = '';

        history.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.style.animationDelay = (index * 0.05) + 's';
            div.dataset.id = item.id;

            const timeStr = formatTime(item.timestamp);
            const strengthLabels = { weak: '弱', medium: '中', strong: '强' };

            div.innerHTML = `
                <span class="history-password">${escapeHtml(item.password)}</span>
                <div class="history-meta">
                    <span class="history-length">${item.length}位</span>
                    <span class="history-strength ${item.strength}">${strengthLabels[item.strength]}</span>
                </div>
                <span class="history-time">${timeStr}</span>
                <div class="history-actions">
                    <button class="history-action-btn copy" title="复制">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="history-action-btn use" title="使用">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 12v-2a2 2 0 0 0-2-2H8l-4 4v8a2 2 0 0 0 2 2h5"></path>
                            <polyline points="18 21 23 16 18 11"></polyline>
                        </svg>
                    </button>
                    <button class="history-action-btn delete" title="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            div.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('.history-action-btn');
                if (actionBtn) {
                    const action = Array.from(actionBtn.classList).find(c => ['copy', 'use', 'delete'].includes(c));
                    if (action === 'copy') {
                        copyToClipboard(item.password);
                        showToast('密码已复制到剪贴板');
                    } else if (action === 'use') {
                        useHistoryPassword(item);
                    } else if (action === 'delete') {
                        deleteHistoryItem(item.id);
                    }
                }
            });

            elements.historyList.appendChild(div);
        });
    }

    function useHistoryPassword(item) {
        currentPassword = item.password;
        elements.passwordOutput.value = item.password;
        elements.passwordOutput.classList.remove('generated');
        void elements.passwordOutput.offsetWidth;
        elements.passwordOutput.classList.add('generated');

        const settings = {
            length: item.length,
            includeUppercase: item.charset.includes('大写'),
            includeLowercase: item.charset.includes('小写'),
            includeNumbers: item.charset.includes('数字'),
            includeSymbols: item.charset.includes('符号'),
            excludeAmbiguous: false,
            pronounceable: false
        };
        currentSettings = settings;

        elements.includeUppercase.checked = settings.includeUppercase;
        elements.includeLowercase.checked = settings.includeLowercase;
        elements.includeNumbers.checked = settings.includeNumbers;
        elements.includeSymbols.checked = settings.includeSymbols;
        elements.lengthSlider.value = settings.length;
        updateLengthDisplay();

        updateStrengthDisplay(item.password, settings);
        showToast('已加载历史密码');
    }

    function deleteHistoryItem(id) {
        try {
            const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
            const filtered = history.filter(item => item.id !== id);
            saveHistory(filtered);
            showToast('已删除该记录');
        } catch (e) {
            console.error('Failed to delete history item:', e);
            showToast('删除失败');
        }
    }

    function clearAllHistory() {
        if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
            saveHistory([]);
            showToast('已清空历史记录');
        }
    }

    function formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;

        if (diff < minute) {
            return '刚刚';
        } else if (diff < hour) {
            return Math.floor(diff / minute) + '分钟前';
        } else if (diff < day) {
            return Math.floor(diff / hour) + '小时前';
        } else if (diff < 7 * day) {
            return Math.floor(diff / day) + '天前';
        } else {
            const date = new Date(timestamp);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        }
    }

    function loadTheme() {
        try {
            const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
            if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.body.setAttribute('data-theme', 'dark');
            } else {
                document.body.setAttribute('data-theme', 'light');
            }
        } catch (e) {
            document.body.setAttribute('data-theme', 'light');
        }
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        
        try {
            localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        } catch (e) {
            console.error('Failed to save theme:', e);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
