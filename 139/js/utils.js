function deepCloneMap(map) {
    return map.map(row => [...row]);
}

function findPlayer(map) {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === TILE_TYPES.PLAYER || map[y][x] === TILE_TYPES.PLAYER_ON_TARGET) {
                return { x, y };
            }
        }
    }
    return null;
}

function countTargets(map) {
    let count = 0;
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === TILE_TYPES.TARGET || 
                map[y][x] === TILE_TYPES.BOX_ON_TARGET ||
                map[y][x] === TILE_TYPES.PLAYER_ON_TARGET) {
                count++;
            }
        }
    }
    return count;
}

function countCompletedBoxes(map) {
    let count = 0;
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === TILE_TYPES.BOX_ON_TARGET) {
                count++;
            }
        }
    }
    return count;
}

function getUnfinishedTargets(map) {
    const targets = [];
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === TILE_TYPES.TARGET || map[y][x] === TILE_TYPES.PLAYER_ON_TARGET) {
                targets.push({ x, y });
            }
        }
    }
    return targets;
}

function getBoxes(map) {
    const boxes = [];
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === TILE_TYPES.BOX || map[y][x] === TILE_TYPES.BOX_ON_TARGET) {
                boxes.push({ x, y, onTarget: map[y][x] === TILE_TYPES.BOX_ON_TARGET });
            }
        }
    }
    return boxes;
}

function manhattanDistance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

function canMove(map, x, y) {
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return false;
    const tile = map[y][x];
    return tile !== TILE_TYPES.WALL;
}

function isBox(map, x, y) {
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return false;
    const tile = map[y][x];
    return tile === TILE_TYPES.BOX || tile === TILE_TYPES.BOX_ON_TARGET;
}

function simulateMove(map, playerPos, direction) {
    const newMap = deepCloneMap(map);
    const { x, y } = playerPos;
    const dir = DIR_VECTORS[direction];
    const nx = x + dir.x;
    const ny = y + dir.y;

    if (!canMove(newMap, nx, ny)) return null;

    if (isBox(newMap, nx, ny)) {
        const bx = nx + dir.x;
        const by = ny + dir.y;
        
        if (!canMove(newMap, bx, by) || isBox(newMap, bx, by)) return null;

        const originalBoxTile = newMap[ny][nx] === TILE_TYPES.BOX_ON_TARGET ? TILE_TYPES.TARGET : TILE_TYPES.EMPTY;
        const targetTile = newMap[by][bx];
        
        if (targetTile === TILE_TYPES.TARGET || targetTile === TILE_TYPES.PLAYER_ON_TARGET) {
            newMap[by][bx] = TILE_TYPES.BOX_ON_TARGET;
        } else {
            newMap[by][bx] = TILE_TYPES.BOX;
        }
        newMap[ny][nx] = originalBoxTile;
    }

    const originalPlayerTile = newMap[y][x] === TILE_TYPES.PLAYER_ON_TARGET ? TILE_TYPES.TARGET : TILE_TYPES.EMPTY;
    const targetPlayerTile = newMap[ny][nx];
    
    if (targetPlayerTile === TILE_TYPES.TARGET) {
        newMap[ny][nx] = TILE_TYPES.PLAYER_ON_TARGET;
    } else {
        newMap[ny][nx] = TILE_TYPES.PLAYER;
    }
    newMap[y][x] = originalPlayerTile;

    return {
        map: newMap,
        playerPos: { x: nx, y: ny },
        pushedBox: isBox(map, nx, ny)
    };
}

function getHint(map, playerPos) {
    const boxes = getBoxes(map);
    const unfinishedBoxes = boxes.filter(b => !b.onTarget);
    const targets = getUnfinishedTargets(map);

    if (unfinishedBoxes.length === 0 || targets.length === 0) return null;

    let nearestBox = null;
    let nearestDist = Infinity;

    for (const box of unfinishedBoxes) {
        const dist = manhattanDistance(playerPos, box);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearestBox = box;
        }
    }

    if (!nearestBox) return null;

    let targetBox = nearestBox;
    let targetPoint = targets[0];
    let minTargetDist = Infinity;
    
    for (const target of targets) {
        const dist = manhattanDistance(nearestBox, target);
        if (dist < minTargetDist) {
            minTargetDist = dist;
            targetPoint = target;
        }
    }

    const dx = targetPoint.x - targetBox.x;
    const dy = targetPoint.y - targetBox.y;

    let bestDir = null;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
            if (canPushBoxFromDirection(map, targetBox, 'left')) {
                bestDir = 'right';
            }
        } else {
            if (canPushBoxFromDirection(map, targetBox, 'right')) {
                bestDir = 'left';
            }
        }
    } else {
        if (dy > 0) {
            if (canPushBoxFromDirection(map, targetBox, 'up')) {
                bestDir = 'down';
            }
        } else {
            if (canPushBoxFromDirection(map, targetBox, 'down')) {
                bestDir = 'up';
            }
        }
    }

    if (!bestDir) {
        bestDir = findDirectionToBox(map, playerPos, targetBox);
    }

    return bestDir;
}

function canPushBoxFromDirection(map, box, pushDir) {
    const dir = DIR_VECTORS[pushDir];
    const playerX = box.x + dir.x;
    const playerY = box.y + dir.y;
    
    if (!canMove(map, playerX, playerY)) return false;
    if (isBox(map, playerX, playerY)) return false;
    
    return true;
}

function findDirectionToBox(map, playerPos, box) {
    let bestDir = null;
    let minDist = Infinity;

    for (const [dir, vec] of Object.entries(DIR_VECTORS)) {
        const newX = playerPos.x + vec.x;
        const newY = playerPos.y + vec.y;
        
        if (!canMove(map, newX, newY)) continue;
        if (isBox(map, newX, newY) && !(newX === box.x && newY === box.y)) continue;
        
        const newPos = { x: newX, y: newY };
        const dist = manhattanDistance(newPos, box);
        
        if (dist < minDist) {
            minDist = dist;
            bestDir = dir;
        }
    }

    return bestDir;
}

function validateLevel(map) {
    let playerCount = 0;
    let boxCount = 0;
    let targetCount = 0;

    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const tile = map[y][x];
            if (tile === TILE_TYPES.PLAYER || tile === TILE_TYPES.PLAYER_ON_TARGET) {
                playerCount++;
            }
            if (tile === TILE_TYPES.BOX || tile === TILE_TYPES.BOX_ON_TARGET) {
                boxCount++;
            }
            if (tile === TILE_TYPES.TARGET || tile === TILE_TYPES.BOX_ON_TARGET || tile === TILE_TYPES.PLAYER_ON_TARGET) {
                targetCount++;
            }
        }
    }

    const errors = [];
    if (playerCount !== 1) {
        errors.push(`需要恰好1个玩家，当前有${playerCount}个`);
    }
    if (boxCount === 0) {
        errors.push('至少需要1个箱子');
    }
    if (targetCount === 0) {
        errors.push('至少需要1个目标点');
    }
    if (boxCount !== targetCount) {
        errors.push(`箱子数量(${boxCount})必须等于目标点数量(${targetCount})`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
