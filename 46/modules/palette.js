const PRESET_COLORS = [
    '#000000', '#FFFFFF', '#7F7F7F', '#C3C3C3',
    '#880015', '#ED1C24', '#FF7F27', '#FFF200',
    '#22B14C', '#00A2E8', '#3F48CC', '#A349A4',
    '#B97A57', '#FFAEC9', '#FFC90E', '#EFE4B0',
    '#B5E61D', '#99D9EA', '#7092BE', '#C8BFE7',
    '#FF00FF', '#00FFFF', '#FF6600', '#66FF00'
];

export class PaletteManager {
    constructor() {
        this.currentColor = '#000000';
        this.backgroundColor = '#FFFFFF';
        this.presetColors = PRESET_COLORS;
        
        this.init();
    }

    init() {
        this.renderPresetPalette();
        this.bindEvents();
        this.updateColorDisplay();
    }

    renderPresetPalette() {
        const container = document.getElementById('preset-palette');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.presetColors.forEach((color, index) => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'preset-color';
            colorDiv.style.backgroundColor = color;
            colorDiv.dataset.color = color;
            colorDiv.dataset.index = index;
            colorDiv.title = color;
            
            if (color === this.currentColor) {
                colorDiv.classList.add('active');
            }
            
            container.appendChild(colorDiv);
        });
    }

    bindEvents() {
        const presetContainer = document.getElementById('preset-palette');
        if (presetContainer) {
            presetContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('preset-color')) {
                    this.selectColor(e.target.dataset.color);
                }
            });
        }

        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                this.selectCustomColor(e.target.value);
            });
        }
    }

    selectColor(color) {
        this.currentColor = color.toUpperCase();
        this.updateColorDisplay();
        this.updateActivePreset();
        
        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) {
            colorPicker.value = this.currentColor;
        }
        
        return this.currentColor;
    }

    selectCustomColor(color) {
        this.currentColor = color.toUpperCase();
        this.updateColorDisplay();
        this.updateActivePreset();
        return this.currentColor;
    }

    getCurrentColor() {
        return this.currentColor;
    }

    getBackgroundColor() {
        return this.backgroundColor;
    }

    updateColorDisplay() {
        const preview = document.getElementById('current-color-preview');
        const hex = document.getElementById('current-color-hex');
        
        if (preview) {
            preview.style.backgroundColor = this.currentColor;
        }
        if (hex) {
            hex.textContent = this.currentColor;
        }
    }

    updateActivePreset() {
        const presetColors = document.querySelectorAll('.preset-color');
        presetColors.forEach(el => {
            if (el.dataset.color.toUpperCase() === this.currentColor) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    setColorFromPixel(color) {
        this.selectColor(color);
        
        const colorPicker = document.getElementById('color-picker');
        if (colorPicker) {
            colorPicker.value = this.currentColor;
        }
    }
}
