const LevelEditor = {
    currentTool: 0,
    mapWidth: 10,
    mapHeight: 8,
    map: [],
    isOpen: false,
    skinIndex: 0,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('editorBtn').addEventListener('click', () => this.open());
        document.getElementById('editorModalClose').addEventListener('click', () => this.close());
        document.getElementById('clearEditor').addEventListener('click', () => this.clearMap());
        document.getElementById('resizeMap').addEventListener('click', () => this.resizeMap());
        document.getElementById('testLevel').addEventListener('click', () => this.testLevel());
        document.getElementById('saveLevel').addEventListener('click', () => this.saveLevel());

        document.querySelectorAll('#editorTools .tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#editorTools .tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = parseInt(btn.dataset.tool);
            });
        });

        document.getElementById('mapWidth').addEventListener('change', (e) => {
            this.mapWidth = Math.max(5, Math.min(20, parseInt(e.target.value) || 10));
        });
        document.getElementById('mapHeight').addEventListener('change', (e) => {
            this.mapHeight = Math.max(5, Math.min(20, parseInt(e.target.value) || 8));
        });

        document.getElementById('editorModal').addEventListener('click', (e) => {
            if (e.target.id === 'editorModal') {
                this.close();
            }
        });
    },

    open() {
        this.isOpen = true;
        this.skinIndex = StorageManager.loadSetting('skinIndex', 0);
        this.initializeEmptyMap();
        this.renderEditorCanvas();
        document.getElementById('editorModal').classList.remove('hidden');
    },

    close() {
        this.isOpen = false;
        document.getElementById('editorModal').classList.add('hidden');
    },

    initializeEmptyMap() {
        this.map = [];
        for (let y = 0; y < this.mapHeight; y++) {
            const row = [];
            for (let x = 0; x < this.mapWidth; x++) {
                if (y === 0 || y === this.mapHeight - 1 || x === 0 || x === this.mapWidth - 1) {
                    row.push(1);
                } else {
                    row.push(0);
                }
            }
            this.map.push(row);
        }
    },

    resizeMap() {
        const newWidth = Math.max(5, Math.min(20, parseInt(document.getElementById('mapWidth').value) || 10));
        const newHeight = Math.max(5, Math.min(20, parseInt(document.getElementById('mapHeight').value) || 8));
        
        const newMap = [];
        for (let y = 0; y < newHeight; y++) {
            const row = [];
            for (let x = 0; x < newWidth; x++) {
                if (y < this.mapHeight && x < this.mapWidth) {
                    row.push(this.map[y][x]);
                } else if (y === 0 || y === newHeight - 1 || x === 0 || x === newWidth - 1) {
                    row.push(1);
                } else {
                    row.push(0);
                }
            }
            newMap.push(row);
        }
        
        this.map = newMap;
        this.mapWidth = newWidth;
        this.mapHeight = newHeight;
        this.renderEditorCanvas();
    },

    clearMap() {
        this.initializeEmptyMap();
        this.renderEditorCanvas();
    },

    renderEditorCanvas() {
        const canvas = document.getElementById('editorCanvas');
        canvas.innerHTML = '';
        canvas.style.gridTemplateColumns = `repeat(${this.mapWidth}, var(--tile-size))`;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.x = x;
                tile.dataset.y = y;
                
                this.applyTileStyle(tile, this.map[y][x]);
                
                tile.addEventListener('click', () => this.handleTileClick(x, y));
                canvas.appendChild(tile);
            }
        }
    },

    applyTileStyle(tile, type) {
        tile.className = 'tile';
        
        switch (type) {
            case TILE_TYPES.WALL:
                tile.classList.add('tile-wall');
                tile.textContent = '';
                break;
            case TILE_TYPES.TARGET:
                tile.classList.add('tile-target');
                tile.textContent = '';
                break;
            case TILE_TYPES.BOX:
                tile.classList.add('tile-box');
                tile.textContent = '';
                break;
            case TILE_TYPES.PLAYER:
                tile.classList.add('tile-player');
                tile.dataset.skin = PLAYER_SKINS[this.skinIndex].emoji;
                break;
            case TILE_TYPES.BOX_ON_TARGET:
                tile.classList.add('tile-box-complete');
                tile.textContent = '';
                break;
            case TILE_TYPES.PLAYER_ON_TARGET:
                tile.classList.add('tile-player', 'target');
                tile.dataset.skin = PLAYER_SKINS[this.skinIndex].emoji;
                break;
            default:
                tile.classList.add('tile-floor');
                tile.textContent = '';
        }
    },

    handleTileClick(x, y) {
        const currentType = this.map[y][x];
        let newType = this.currentTool;

        if (currentType === TILE_TYPES.BOX_ON_TARGET || currentType === TILE_TYPES.PLAYER_ON_TARGET) {
            if (newType === TILE_TYPES.EMPTY) {
                newType = TILE_TYPES.TARGET;
            } else if (newType === TILE_TYPES.BOX) {
                newType = TILE_TYPES.BOX_ON_TARGET;
            } else if (newType === TILE_TYPES.PLAYER) {
                newType = TILE_TYPES.PLAYER_ON_TARGET;
            }
        }

        if (newType === TILE_TYPES.PLAYER || newType === TILE_TYPES.PLAYER_ON_TARGET) {
            for (let row = 0; row < this.mapHeight; row++) {
                for (let col = 0; col < this.mapWidth; col++) {
                    if (this.map[row][col] === TILE_TYPES.PLAYER) {
                        this.map[row][col] = TILE_TYPES.EMPTY;
                    } else if (this.map[row][col] === TILE_TYPES.PLAYER_ON_TARGET) {
                        this.map[row][col] = TILE_TYPES.TARGET;
                    }
                }
            }
        }

        if (newType === TILE_TYPES.BOX && currentType === TILE_TYPES.TARGET) {
            newType = TILE_TYPES.BOX_ON_TARGET;
        } else if (newType === TILE_TYPES.PLAYER && currentType === TILE_TYPES.TARGET) {
            newType = TILE_TYPES.PLAYER_ON_TARGET;
        }

        this.map[y][x] = newType;
        this.renderEditorCanvas();
    },

    validateCurrentMap() {
        return validateLevel(this.map);
    },

    testLevel() {
        const validation = this.validateCurrentMap();
        if (!validation.valid) {
            alert('关卡无效：\n' + validation.errors.join('\n'));
            return;
        }

        this.close();
        
        const testLevel = {
            id: 'test_level',
            name: '测试关卡',
            map: deepCloneMap(this.map)
        };

        Game.loadCustomLevel(testLevel);
    },

    saveLevel() {
        const validation = this.validateCurrentMap();
        if (!validation.valid) {
            alert('关卡无效：\n' + validation.errors.join('\n'));
            return;
        }

        const levelName = prompt('请输入关卡名称：', `自定义关卡 ${StorageManager.getCustomLevels().length + 1}`);
        if (!levelName) return;

        const customLevel = {
            id: `custom_${Date.now()}`,
            name: levelName,
            map: deepCloneMap(this.map)
        };

        StorageManager.saveCustomLevel(customLevel);
        alert('关卡保存成功！可以在关卡选择中找到。');
        
        if (confirm('是否立即开始玩这个关卡？')) {
            this.close();
            Game.loadCustomLevel(customLevel);
        }
    }
};
