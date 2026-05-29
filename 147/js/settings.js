const Settings = {
    data: {
        soundEnabled: true,
        fontSize: 16,
        theme: 'dark'
    },

    init() {
        this.load();
        this.apply();
    },

    load() {
        const saved = localStorage.getItem('dnd_settings');
        if (saved) {
            this.data = { ...this.data, ...JSON.parse(saved) };
        }
    },

    save() {
        localStorage.setItem('dnd_settings', JSON.stringify(this.data));
    },

    apply() {
        this.setFontSize(this.data.fontSize, false);
        this.setTheme(this.data.theme, false);
        this.updateSoundToggle();
    },

    toggleSound() {
        this.data.soundEnabled = !this.data.soundEnabled;
        this.updateSoundToggle();
        this.save();
        if (this.data.soundEnabled && AudioManager) {
            AudioManager.playDice();
        }
    },

    updateSoundToggle() {
        const toggle = document.getElementById('sound-toggle');
        if (toggle) {
            if (this.data.soundEnabled) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
    },

    setFontSize(size, save = true) {
        this.data.fontSize = parseInt(size);
        document.body.style.fontSize = this.data.fontSize + 'px';
        const display = document.getElementById('font-size-display');
        if (display) {
            display.textContent = this.data.fontSize + 'px';
        }
        const slider = document.getElementById('font-size-slider');
        if (slider) {
            slider.value = this.data.fontSize;
        }
        if (save) {
            this.save();
        }
    },

    toggleTheme() {
        this.data.theme = this.data.theme === 'dark' ? 'light' : 'dark';
        this.setTheme(this.data.theme);
    },

    setTheme(theme, save = true) {
        this.data.theme = theme;
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        
        if (this.data.theme === 'dark') {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            if (themeToggle) themeToggle.classList.add('active');
        } else {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            if (themeToggle) themeToggle.classList.remove('active');
        }
        
        if (save) {
            this.save();
        }
    }
};
