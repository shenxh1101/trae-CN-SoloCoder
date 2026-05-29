const TILE = {
    EMPTY: 0,
    STONE: 1,
    BRICK: 2,
    POWERUP_BOMB: 3,
    POWERUP_RANGE: 4,
    POWERUP_SPEED: 5,
    EXIT: 6
};

const levels = [
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,2,0,2,0,0,0,0,1],
            [1,0,1,2,1,2,1,2,1,2,1,0,1],
            [1,0,2,0,2,0,2,0,2,0,2,0,1],
            [1,2,1,2,1,2,1,2,1,2,1,2,1],
            [1,0,2,0,2,0,2,0,2,0,2,0,1],
            [1,2,1,2,1,2,1,2,1,2,1,2,1],
            [1,0,2,0,2,0,2,0,2,0,2,0,1],
            [1,2,1,2,1,2,1,2,1,2,1,2,1],
            [1,0,2,0,2,0,2,0,2,0,2,0,1],
            [1,0,1,2,1,2,1,2,1,2,1,0,1],
            [1,0,0,0,0,2,0,2,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            { x: 11, y: 1, speed: 0.03 },
            { x: 11, y: 11, speed: 0.03 },
            { x: 6, y: 6, speed: 0.025 }
        ],
        playerStart: { x: 1, y: 1 }
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,2,2,2,2,2,2,2,0,0,1],
            [1,0,1,2,1,2,1,2,1,2,1,0,1],
            [1,2,2,0,0,2,2,2,0,0,2,2,1],
            [1,2,1,2,1,2,1,2,1,2,1,2,1],
            [1,2,2,2,2,0,0,0,2,2,2,2,1],
            [1,2,1,2,1,2,1,2,1,2,1,2,1],
            [1,2,2,2,2,0,0,0,2,2,2,2,1],
            [1,2,1,2,1,2,1,2,1,2,1,2,1],
            [1,2,2,0,0,2,2,2,0,0,2,2,1],
            [1,0,1,2,1,2,1,2,1,2,1,0,1],
            [1,0,0,2,2,2,2,2,2,2,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            { x: 11, y: 1, speed: 0.035 },
            { x: 11, y: 11, speed: 0.035 },
            { x: 1, y: 11, speed: 0.03 },
            { x: 6, y: 5, speed: 0.04 }
        ],
        playerStart: { x: 1, y: 1 }
    },
    {
        map: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,2,2,2,2,2,0,0,0,1],
            [1,0,1,2,1,2,1,2,1,2,1,0,1],
            [1,0,2,2,2,2,2,2,2,2,2,0,1],
            [1,2,1,2,1,0,0,0,1,2,1,2,1],
            [1,2,2,2,0,0,0,0,0,2,2,2,1],
            [1,2,1,2,0,0,0,0,0,2,1,2,1],
            [1,2,2,2,0,0,0,0,0,2,2,2,1],
            [1,2,1,2,1,0,0,0,1,2,1,2,1],
            [1,0,2,2,2,2,2,2,2,2,2,0,1],
            [1,0,1,2,1,2,1,2,1,2,1,0,1],
            [1,0,0,0,2,2,2,2,2,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        enemies: [
            { x: 11, y: 1, speed: 0.04 },
            { x: 11, y: 11, speed: 0.04 },
            { x: 1, y: 11, speed: 0.04 },
            { x: 5, y: 5, speed: 0.045 },
            { x: 7, y: 7, speed: 0.045 }
        ],
        playerStart: { x: 1, y: 1 }
    }
];

function getLevel(index) {
    const customLevels = JSON.parse(localStorage.getItem('customLevels') || '[]');
    if (index < levels.length) {
        return JSON.parse(JSON.stringify(levels[index]));
    }
    const customIndex = index - levels.length;
    if (customIndex < customLevels.length) {
        return JSON.parse(JSON.stringify(customLevels[customIndex]));
    }
    return generateRandomLevel(index);
}

function generateRandomLevel(levelNum) {
    const map = [];
    for (let y = 0; y < 13; y++) {
        map[y] = [];
        for (let x = 0; x < 13; x++) {
            if (x === 0 || y === 0 || x === 12 || y === 12) {
                map[y][x] = TILE.STONE;
            } else if (x % 2 === 0 && y % 2 === 0) {
                map[y][x] = TILE.STONE;
            } else if ((x <= 2 && y <= 2)) {
                map[y][x] = TILE.EMPTY;
            } else {
                map[y][x] = Math.random() > 0.4 ? TILE.BRICK : TILE.EMPTY;
            }
        }
    }

    const enemyCount = Math.min(3 + Math.floor(levelNum / 2), 8);
    const enemies = [];
    for (let i = 0; i < enemyCount; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * 11) + 1;
            y = Math.floor(Math.random() * 11) + 1;
        } while ((x <= 3 && y <= 3) || map[y][x] !== TILE.EMPTY);
        enemies.push({ x, y, speed: 0.03 + levelNum * 0.005 });
    }

    return { map, enemies, playerStart: { x: 1, y: 1 } };
}

function saveCustomLevel(levelData) {
    const customLevels = JSON.parse(localStorage.getItem('customLevels') || '[]');
    customLevels.push(levelData);
    localStorage.setItem('customLevels', JSON.stringify(customLevels));
}

function loadCustomLevels() {
    return JSON.parse(localStorage.getItem('customLevels') || '[]');
}

function createEmptyMap() {
    const map = [];
    for (let y = 0; y < 13; y++) {
        map[y] = [];
        for (let x = 0; x < 13; x++) {
            if (x === 0 || y === 0 || x === 12 || y === 12) {
                map[y][x] = TILE.STONE;
            } else if (x % 2 === 0 && y % 2 === 0) {
                map[y][x] = TILE.STONE;
            } else {
                map[y][x] = TILE.EMPTY;
            }
        }
    }
    return map;
}
