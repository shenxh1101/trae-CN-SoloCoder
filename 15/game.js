import * as THREE from 'three';

// ============================================
// 游戏配置
// ============================================
const CONFIG = {
    CELL_SIZE: 4,
    WALL_HEIGHT: 3,
    PLAYER_HEIGHT: 1.7,
    PLAYER_RADIUS: 0.4,
    MOVE_SPEED: 5,
    JUMP_FORCE: 8,
    GRAVITY: 20,
    MOUSE_SENSITIVITY: 0.002,
    MAZE_SIZE: 11,
    KEY_COUNT: 3,
    STAR_COUNT: 8,
    DIFFICULTIES: {
        easy: { enemyCount: 2, enemySpeed: 1.5, enemyVision: 6, name: '简单' },
        normal: { enemyCount: 3, enemySpeed: 2.5, enemyVision: 8, name: '普通' },
        hard: { enemyCount: 6, enemySpeed: 4, enemyVision: 12, name: '困难' }
    }
};

// ============================================
// 游戏状态
// ============================================
const gameState = {
    isPlaying: false,
    isPaused: false,
    difficulty: 'normal',
    keys: { w: false, a: false, s: false, d: false },
    flashlightOn: true,
    collectedKeys: 0,
    collectedStars: 0,
    totalStars: 0,
    steps: 0,
    startTime: 0,
    elapsedTime: 0,
    maze: null,
    player: {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        canJump: true
    },
    enemies: [],
    keyObjects: [],
    starObjects: [],
    particles: [],
    exploredCells: new Set(),
    exitPosition: null,
    exitDoor: null,
    seed: Date.now()
};

// ============================================
// 迷宫生成算法 (递归回溯 recursive backtracking algorithm)
// ============================================
class MazeGenerator {
    constructor(size, seed = Date.now()) {
        this.size = size;
        this.seed = seed;
        this.grid = [];
    }

    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    generate() {
        const size = this.size;
        for (let y = 0; y < size; y++) {
            this.grid[y] = [];
            for (let x = 0; x < size; x++) {
                this.grid[y][x] = {
                    x, y,
                    walls: { top: true, right: true, bottom: true, left: true },
                    visited: false
                };
            }
        }

        const stack = [];
        const start = this.grid[1][1];
        start.visited = true;
        stack.push(start);

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current);

            if (neighbors.length === 0) {
                stack.pop();
            } else {
                const next = neighbors[Math.floor(this.random() * neighbors.length)];
                this.removeWall(current, next);
                next.visited = true;
                stack.push(next);
            }
        }

        return this.grid;
    }

    getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const { x, y } = cell;

        if (y > 1 && !this.grid[y - 1][x].visited) neighbors.push(this.grid[y - 1][x]);
        if (x < this.size - 2 && !this.grid[y][x + 1].visited) neighbors.push(this.grid[y][x + 1]);
        if (y < this.size - 2 && !this.grid[y + 1][x].visited) neighbors.push(this.grid[y + 1][x]);
        if (x > 1 && !this.grid[y][x - 1].visited) neighbors.push(this.grid[y][x - 1]);

        return neighbors;
    }

    removeWall(current, next) {
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        if (dx === 1) {
            current.walls.right = false;
            next.walls.left = false;
        } else if (dx === -1) {
            current.walls.left = false;
            next.walls.right = false;
        } else if (dy === 1) {
            current.walls.bottom = false;
            next.walls.top = false;
        } else if (dy === -1) {
            current.walls.top = false;
            next.walls.bottom = false;
        }
    }

    getEmptyCells() {
        const cells = [];
        for (let y = 1; y < this.size - 1; y += 2) {
            for (let x = 1; x < this.size - 1; x += 2) {
                cells.push({ x, y });
            }
        }
        return cells;
    }
}

// ============================================
// Three.js 场景
// ============================================
let scene, camera, renderer;
let flashlight;
let ambientLight, directionalLight;

function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 5, 30);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('gameCanvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    ambientLight = new THREE.AmbientLight(0x404050, 0.3);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    flashlight = new THREE.SpotLight(0xffffdd, 2, 20, Math.PI / 6, 0.5, 1);
    flashlight.position.set(0, 0, 0);
    flashlight.castShadow = true;
    camera.add(flashlight);
    flashlight.target.position.set(0, 0, -1);
    camera.add(flashlight.target);
    scene.add(camera);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================
// 迷宫构建
// ============================================
let wallMeshes = [];
let floorMesh;

function buildMaze(maze) {
    while (wallMeshes.length > 0) {
        const mesh = wallMeshes.pop();
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
    }

    if (floorMesh) {
        scene.remove(floorMesh);
        floorMesh.geometry.dispose();
        floorMesh.material.dispose();
    }

    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    const floorGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a3a,
        roughness: 0.8,
        metalness: 0.2
    });
    floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const ceilingGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const ceilingMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2a,
        roughness: 0.9,
        metalness: 0.1
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = CONFIG.WALL_HEIGHT;
    scene.add(ceiling);
    wallMeshes.push(ceiling);

    const wallMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a4a6a,
        roughness: 0.7,
        metalness: 0.3
    });

    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            const cell = maze[y][x];
            const baseX = offset + x * cellSize;
            const baseZ = offset + y * cellSize;

            if (cell.walls.top && y > 0) {
                const wall = createWall(cellSize, CONFIG.WALL_HEIGHT, wallMat);
                wall.position.set(baseX, CONFIG.WALL_HEIGHT / 2, baseZ - cellSize / 2);
                scene.add(wall);
                wallMeshes.push(wall);
            }
            if (cell.walls.right) {
                const wall = createWall(cellSize, CONFIG.WALL_HEIGHT, wallMat);
                wall.rotation.y = Math.PI / 2;
                wall.position.set(baseX + cellSize / 2, CONFIG.WALL_HEIGHT / 2, baseZ);
                scene.add(wall);
                wallMeshes.push(wall);
            }
            if (cell.walls.bottom) {
                const wall = createWall(cellSize, CONFIG.WALL_HEIGHT, wallMat);
                wall.position.set(baseX, CONFIG.WALL_HEIGHT / 2, baseZ + cellSize / 2);
                scene.add(wall);
                wallMeshes.push(wall);
            }
            if (cell.walls.left && x > 0) {
                const wall = createWall(cellSize, CONFIG.WALL_HEIGHT, wallMat);
                wall.rotation.y = Math.PI / 2;
                wall.position.set(baseX - cellSize / 2, CONFIG.WALL_HEIGHT / 2, baseZ);
                scene.add(wall);
                wallMeshes.push(wall);
            }
        }
    }
}

function createWall(width, height, material) {
    const geo = new THREE.BoxGeometry(width, height, 0.3);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isWall = true;
    return mesh;
}

// ============================================
// 碰撞检测
// ============================================
function checkCollision(position) {
    const maze = gameState.maze;
    if (!maze) return true;

    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    const gridX = Math.floor((position.x - offset) / cellSize + 0.5);
    const gridY = Math.floor((position.z - offset) / cellSize + 0.5);

    if (gridX < 0 || gridX >= maze[0].length || gridY < 0 || gridY >= maze.length) {
        return true;
    }

    const cell = maze[gridY][gridX];
    const localX = position.x - (offset + gridX * cellSize);
    const localZ = position.z - (offset + gridY * cellSize);
    const halfCell = cellSize / 2;
    const radius = CONFIG.PLAYER_RADIUS;

    if (cell.walls.top && localZ < -halfCell + radius) return true;
    if (cell.walls.bottom && localZ > halfCell - radius) return true;
    if (cell.walls.left && localX < -halfCell + radius) return true;
    if (cell.walls.right && localX > halfCell - radius) return true;

    return false;
}

function canMoveTo(position) {
    const testPoints = [
        position,
        new THREE.Vector3(position.x + CONFIG.PLAYER_RADIUS * 0.7, position.y, position.z),
        new THREE.Vector3(position.x - CONFIG.PLAYER_RADIUS * 0.7, position.y, position.z),
        new THREE.Vector3(position.x, position.y, position.z + CONFIG.PLAYER_RADIUS * 0.7),
        new THREE.Vector3(position.x, position.y, position.z - CONFIG.PLAYER_RADIUS * 0.7)
    ];

    for (const point of testPoints) {
        if (checkCollision(point)) return false;
    }
    return true;
}

// ============================================
// 玩家控制
// ============================================
function initPlayer() {
    const maze = gameState.maze;
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    gameState.player.position.set(
        offset + cellSize,
        CONFIG.PLAYER_HEIGHT,
        offset + cellSize
    );
    gameState.player.velocity.set(0, 0, 0);
    gameState.player.yaw = 0;
    gameState.player.pitch = 0;
    gameState.player.canJump = true;

    updatePlayerCamera();
}

function updatePlayer(dt) {
    const velocity = gameState.player.velocity;
    const position = gameState.player.position;

    velocity.y -= CONFIG.GRAVITY * dt;

    const forward = new THREE.Vector3(
        -Math.sin(gameState.player.yaw),
        0,
        -Math.cos(gameState.player.yaw)
    );
    const right = new THREE.Vector3(
        Math.cos(gameState.player.yaw),
        0,
        -Math.sin(gameState.player.yaw)
    );

    let moveX = 0, moveZ = 0;
    if (gameState.keys.w) { moveX += forward.x; moveZ += forward.z; }
    if (gameState.keys.s) { moveX -= forward.x; moveZ -= forward.z; }
    if (gameState.keys.a) { moveX -= right.x; moveZ -= right.z; }
    if (gameState.keys.d) { moveX += right.x; moveZ += right.z; }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
        moveX /= len;
        moveZ /= len;
    }

    const oldX = position.x;
    const oldZ = position.z;

    const newX = position.x + moveX * CONFIG.MOVE_SPEED * dt;
    const newZ = position.z + moveZ * CONFIG.MOVE_SPEED * dt;

    if (canMoveTo(new THREE.Vector3(newX, position.y, position.z))) {
        position.x = newX;
    }
    if (canMoveTo(new THREE.Vector3(position.x, position.y, newZ))) {
        position.z = newZ;
    }

    if ((oldX !== position.x || oldZ !== position.z) && len > 0) {
        const dist = Math.sqrt(
            Math.pow(position.x - oldX, 2) + 
            Math.pow(position.z - oldZ, 2)
        );
        gameState.steps += Math.floor(dist * 10) / 10;
    }

    position.y += velocity.y * dt;
    if (position.y < CONFIG.PLAYER_HEIGHT) {
        position.y = CONFIG.PLAYER_HEIGHT;
        velocity.y = 0;
        gameState.player.canJump = true;
    }

    if (gameState.keys.space && gameState.player.canJump) {
        velocity.y = CONFIG.JUMP_FORCE;
        gameState.player.canJump = false;
    }

    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = gameState.maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;
    const gridX = Math.floor((position.x - offset) / cellSize + 0.5);
    const gridY = Math.floor((position.z - offset) / cellSize + 0.5);
    const cellKey = `${gridX},${gridY}`;
    
    if (!gameState.exploredCells.has(cellKey)) {
        gameState.exploredCells.add(cellKey);
    }

    updatePlayerCamera();
}

function updatePlayerCamera() {
    camera.position.copy(gameState.player.position);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = gameState.player.yaw;
    camera.rotation.x = gameState.player.pitch;
}

// ============================================
// 钥匙系统
// ============================================
function placeKeys() {
    const maze = gameState.maze;
    const generator = new MazeGenerator(maze.length, gameState.seed + 1000);
    const emptyCells = generator.getEmptyCells();
    
    emptyCells.sort(() => Math.random() - 0.5);
    emptyCells.splice(0, 1);
    
    for (let i = 0; i < Math.min(CONFIG.KEY_COUNT, emptyCells.length); i++) {
        const cell = emptyCells[i];
        createKey(cell.x, cell.y);
    }
}

function createKey(gridX, gridY) {
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = gameState.maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    const group = new THREE.Group();
    
    const keyGeo = new THREE.TorusGeometry(0.2, 0.05, 8, 16);
    const keyMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.5,
        metalness: 0.9,
        roughness: 0.1
    });
    const torus = new THREE.Mesh(keyGeo, keyMat);
    torus.position.y = 0.2;
    group.add(torus);

    const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
    const shaft = new THREE.Mesh(shaftGeo, keyMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.25, 0.2, 0);
    group.add(shaft);

    const teethGeo = new THREE.BoxGeometry(0.08, 0.15, 0.03);
    const teeth1 = new THREE.Mesh(teethGeo, keyMat);
    teeth1.position.set(0.45, 0.15, 0);
    group.add(teeth1);
    const teeth2 = new THREE.Mesh(teethGeo, keyMat);
    teeth2.position.set(0.4, 0.25, 0);
    group.add(teeth2);

    const light = new THREE.PointLight(0xffaa00, 0.5, 5);
    light.position.y = 0.5;
    group.add(light);

    group.position.set(
        offset + gridX * cellSize,
        1.2,
        offset + gridY * cellSize
    );
    group.userData = { 
        isKey: true, 
        gridX, 
        gridY,
        collected: false,
        rotationSpeed: Math.random() * 2 + 1
    };

    scene.add(group);
    gameState.keyObjects.push(group);
}

function updateKeys(dt) {
    const playerPos = gameState.player.position;
    
    for (const key of gameState.keyObjects) {
        if (key.userData.collected) continue;

        key.rotation.y += key.userData.rotationSpeed * dt;
        key.position.y = 1.2 + Math.sin(Date.now() * 0.003) * 0.2;

        const dist = key.position.distanceTo(playerPos);
        if (dist < 1.5) {
            collectKey(key);
        }
    }
}

function collectKey(key) {
    key.userData.collected = true;
    gameState.collectedKeys++;
    scene.remove(key);
    
    createParticles(key.position, 0xffd700);
    showMessage(`钥匙 ${gameState.collectedKeys}/${CONFIG.KEY_COUNT}！`);
    
    const slots = document.querySelectorAll('.key-slot');
    if (slots[gameState.collectedKeys - 1]) {
        slots[gameState.collectedKeys - 1].classList.add('collected');
    }

    if (gameState.collectedKeys >= CONFIG.KEY_COUNT) {
        showMessage('所有钥匙已收集！快去找出口！');
        openExitDoor();
    }
}

// ============================================
// 出口门
// ============================================
function placeExit() {
    const maze = gameState.maze;
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    const gridX = maze[0].length - 2;
    const gridY = maze.length - 2;

    const group = new THREE.Group();

    const frameGeo = new THREE.BoxGeometry(cellSize * 0.8, CONFIG.WALL_HEIGHT * 0.9, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        metalness: 0.3,
        roughness: 0.7
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = CONFIG.WALL_HEIGHT / 2;
    group.add(frame);

    const doorGeo = new THREE.BoxGeometry(cellSize * 0.7, CONFIG.WALL_HEIGHT * 0.8, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0x330000,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.5
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.y = CONFIG.WALL_HEIGHT / 2;
    door.position.z = 0.06;
    group.add(door);

    const handleGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const handleMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.5, CONFIG.WALL_HEIGHT / 2, 0.12);
    group.add(handle);

    const light = new THREE.PointLight(0xff0000, 0.3, 5);
    light.position.y = CONFIG.WALL_HEIGHT / 2;
    light.position.z = 1;
    group.add(light);

    group.position.set(
        offset + gridX * cellSize,
        0,
        offset + gridY * cellSize
    );
    group.userData = {
        isExit: true,
        gridX,
        gridY,
        isOpen: false,
        doorMesh: door,
        light: light
    };

    scene.add(group);
    gameState.exitDoor = group;
    gameState.exitPosition = group.position.clone();
}

function openExitDoor() {
    if (gameState.exitDoor && !gameState.exitDoor.userData.isOpen) {
        gameState.exitDoor.userData.isOpen = true;
        const door = gameState.exitDoor.userData.doorMesh;
        const light = gameState.exitDoor.userData.light;
        
        door.material.color.setHex(0x00ff00);
        door.material.emissive.setHex(0x003300);
        light.color.setHex(0x00ff00);
        light.intensity = 0.8;
        
        createParticles(gameState.exitDoor.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0x00ff00);
    }
}

function checkExit() {
    if (!gameState.exitDoor || !gameState.exitDoor.userData.isOpen) return false;
    
    const dist = gameState.player.position.distanceTo(gameState.exitPosition);
    return dist < 2;
}

// ============================================
// 敌人AI
// ============================================
function placeEnemies() {
    const difficulty = CONFIG.DIFFICULTIES[gameState.difficulty];
    const maze = gameState.maze;
    const generator = new MazeGenerator(maze.length, gameState.seed + 2000);
    const emptyCells = generator.getEmptyCells();
    
    emptyCells.sort(() => Math.random() - 0.5);
    emptyCells.splice(0, 2);
    
    for (let i = 0; i < Math.min(difficulty.enemyCount, emptyCells.length); i++) {
        const cell = emptyCells[i];
        createEnemy(cell.x, cell.y);
    }
}

function createEnemy(gridX, gridY) {
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = gameState.maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;
    const difficulty = CONFIG.DIFFICULTIES[gameState.difficulty];

    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x8b0000,
        emissive: 0x330000,
        emissiveIntensity: 0.2,
        metalness: 0.1,
        roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
        color: 0x8b0000,
        metalness: 0.1,
        roughness: 0.8
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.5;
    head.castShadow = true;
    group.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.55, 0.2);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 1.55, 0.2);
    group.add(rightEye);

    const light = new THREE.PointLight(0xff0000, 0.3, 3);
    light.position.y = 1.2;
    group.add(light);

    group.position.set(
        offset + gridX * cellSize,
        0,
        offset + gridY * cellSize
    );

    group.userData = {
        isEnemy: true,
        gridX,
        gridY,
        speed: difficulty.enemySpeed,
        visionRange: difficulty.enemyVision,
        state: 'patrol',
        targetPosition: group.position.clone(),
        waitTime: 0,
        lastSeenPlayer: null
    };

    scene.add(group);
    gameState.enemies.push(group);
}

function updateEnemies(dt) {
    const playerPos = gameState.player.position;
    const maze = gameState.maze;
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    for (const enemy of gameState.enemies) {
        const data = enemy.userData;
        
        const dirToPlayer = new THREE.Vector3().subVectors(playerPos, enemy.position);
        const distToPlayer = dirToPlayer.length();
        const canSeePlayer = distToPlayer < data.visionRange && hasLineOfSight(enemy.position, playerPos);

        if (canSeePlayer) {
            data.state = 'chase';
            data.lastSeenPlayer = playerPos.clone();
        } else if (data.state === 'chase' && data.lastSeenPlayer) {
            const distToLast = enemy.position.distanceTo(data.lastSeenPlayer);
            if (distToLast < 0.5) {
                data.state = 'patrol';
                data.lastSeenPlayer = null;
            }
        }

        let targetPos;
        if (data.state === 'chase' && data.lastSeenPlayer) {
            targetPos = data.lastSeenPlayer;
        } else {
            if (enemy.position.distanceTo(data.targetPosition) < 0.3) {
                if (data.waitTime <= 0) {
                    const adjacent = getAdjacentEmptyCells(
                        Math.floor((enemy.position.x - offset) / cellSize + 0.5),
                        Math.floor((enemy.position.z - offset) / cellSize + 0.5)
                    );
                    if (adjacent.length > 0) {
                        const next = adjacent[Math.floor(Math.random() * adjacent.length)];
                        data.targetPosition.set(
                            offset + next.x * cellSize,
                            0,
                            offset + next.y * cellSize
                        );
                    }
                    data.waitTime = Math.random() * 2 + 1;
                } else {
                    data.waitTime -= dt;
                }
            }
            targetPos = data.targetPosition;
        }

        const moveDir = new THREE.Vector3().subVectors(targetPos, enemy.position);
        moveDir.y = 0;
        const moveLen = moveDir.length();
        
        if (moveLen > 0.1) {
            moveDir.normalize();
            const moveSpeed = data.state === 'chase' ? data.speed * 1.5 : data.speed;
            const newPos = enemy.position.clone().add(moveDir.multiplyScalar(moveSpeed * dt));
            
            const testPos = new THREE.Vector3(newPos.x, CONFIG.PLAYER_HEIGHT, newPos.z);
            if (!checkCollision(testPos)) {
                enemy.position.copy(newPos);
            }
            
            enemy.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        if (distToPlayer < 0.8) {
            onPlayerCaught();
        }
    }
}

function getAdjacentEmptyCells(gridX, gridY) {
    const maze = gameState.maze;
    const adjacent = [];
    const cell = maze[gridY]?.[gridX];
    if (!cell) return adjacent;

    if (!cell.walls.top && gridY > 0) adjacent.push({ x: gridX, y: gridY - 1 });
    if (!cell.walls.right && gridX < maze[0].length - 1) adjacent.push({ x: gridX + 1, y: gridY });
    if (!cell.walls.bottom && gridY < maze.length - 1) adjacent.push({ x: gridX, y: gridY + 1 });
    if (!cell.walls.left && gridX > 0) adjacent.push({ x: gridX - 1, y: gridY });

    return adjacent;
}

function hasLineOfSight(from, to) {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pos = new THREE.Vector3(
            from.x + (to.x - from.x) * t,
            CONFIG.PLAYER_HEIGHT,
            from.z + (to.z - from.z) * t
        );
        if (checkCollision(pos)) return false;
    }
    return true;
}

function onPlayerCaught() {
    showMessage('被敌人抓住了！关卡重置...');
    
    setTimeout(() => {
        resetLevel();
    }, 1500);
}

function resetLevel() {
    gameState.collectedKeys = 0;
    
    const maze = gameState.maze;
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;
    
    gameState.player.position.set(
        offset + cellSize,
        CONFIG.PLAYER_HEIGHT,
        offset + cellSize
    );
    gameState.player.velocity.set(0, 0, 0);
    gameState.player.yaw = 0;
    gameState.player.pitch = 0;
    
    for (const key of gameState.keyObjects) {
        scene.remove(key);
    }
    gameState.keyObjects = [];
    placeKeys();
    
    const slots = document.querySelectorAll('.key-slot');
    slots.forEach(slot => slot.classList.remove('collected'));
    
    for (const enemy of gameState.enemies) {
        scene.remove(enemy);
    }
    gameState.enemies = [];
    placeEnemies();
    
    if (gameState.exitDoor) {
        gameState.exitDoor.userData.isOpen = false;
        const door = gameState.exitDoor.userData.doorMesh;
        const light = gameState.exitDoor.userData.light;
        door.material.color.setHex(0xff0000);
        door.material.emissive.setHex(0x330000);
        light.color.setHex(0xff0000);
        light.intensity = 0.3;
    }
    
    updatePlayerCamera();
}

// ============================================
// 星星收集
// ============================================
function placeStars() {
    const maze = gameState.maze;
    const generator = new MazeGenerator(maze.length, gameState.seed + 3000);
    const emptyCells = generator.getEmptyCells();
    
    emptyCells.sort(() => Math.random() - 0.5);
    emptyCells.splice(0, 1);
    
    gameState.totalStars = Math.min(CONFIG.STAR_COUNT, emptyCells.length - CONFIG.KEY_COUNT);
    
    for (let i = 0; i < gameState.totalStars; i++) {
        const idx = i + CONFIG.KEY_COUNT;
        if (idx < emptyCells.length) {
            const cell = emptyCells[idx];
            createStar(cell.x, cell.y);
        }
    }
}

function createStar(gridX, gridY) {
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = gameState.maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    const group = new THREE.Group();

    const starShape = new THREE.Shape();
    const outerRadius = 0.3;
    const innerRadius = 0.15;
    const points = 5;
    
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) starShape.moveTo(x, y);
        else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const extrudeSettings = { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 };
    const starGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    const starMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2
    });
    const star = new THREE.Mesh(starGeo, starMat);
    star.castShadow = true;
    group.add(star);

    const light = new THREE.PointLight(0x00ffff, 0.4, 4);
    light.position.y = 0.5;
    group.add(light);

    group.position.set(
        offset + gridX * cellSize,
        1.5,
        offset + gridY * cellSize
    );
    group.userData = {
        isStar: true,
        gridX,
        gridY,
        collected: false,
        rotationSpeed: Math.random() * 3 + 2
    };

    scene.add(group);
    gameState.starObjects.push(group);
}

function updateStars(dt) {
    const playerPos = gameState.player.position;
    
    for (const star of gameState.starObjects) {
        if (star.userData.collected) continue;

        star.rotation.y += star.userData.rotationSpeed * dt;
        star.rotation.x += star.userData.rotationSpeed * 0.5 * dt;
        star.position.y = 1.5 + Math.sin(Date.now() * 0.004) * 0.15;

        const dist = star.position.distanceTo(playerPos);
        if (dist < 1.2) {
            collectStar(star);
        }
    }
}

function collectStar(star) {
    star.userData.collected = true;
    gameState.collectedStars++;
    scene.remove(star);
    
    createParticles(star.position, 0x00ffff);
    showMessage(`⭐ +1 星星 (${gameState.collectedStars}/${gameState.totalStars})`);
}

// ============================================
// 粒子特效
// ============================================
function createParticles(position, color) {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;

        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 5
        ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: color,
        size: 0.15,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData = {
        velocities: velocities,
        life: 1,
        maxLife: 1
    };

    scene.add(particles);
    gameState.particles.push(particles);
}

function updateParticles(dt) {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const particles = gameState.particles[i];
        const data = particles.userData;
        const positions = particles.geometry.attributes.position.array;

        data.life -= dt;
        particles.material.opacity = data.life / data.maxLife;

        for (let j = 0; j < data.velocities.length; j++) {
            data.velocities[j].y -= CONFIG.GRAVITY * dt;
            positions[j * 3] += data.velocities[j].x * dt;
            positions[j * 3 + 1] += data.velocities[j].y * dt;
            positions[j * 3 + 2] += data.velocities[j].z * dt;
        }

        particles.geometry.attributes.position.needsUpdate = true;

        if (data.life <= 0) {
            scene.remove(particles);
            particles.geometry.dispose();
            particles.material.dispose();
            gameState.particles.splice(i, 1);
        }
    }
}

// ============================================
// 小地图
// ============================================
let minimapCanvas, minimapCtx;

function initMinimap() {
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');
}

function updateMinimap() {
    if (!minimapCtx || !gameState.maze) return;

    const maze = gameState.maze;
    const cellSize = CONFIG.CELL_SIZE;
    const totalSize = maze.length * cellSize;
    const offset = -totalSize / 2 + cellSize / 2;

    const mapCellSize = minimapCanvas.width / maze.length;
    const padding = 2;

    minimapCtx.fillStyle = '#0a0a15';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            const cell = maze[y][x];
            const px = x * mapCellSize;
            const py = y * mapCellSize;

            const cellKey = `${x},${y}`;
            const isExplored = gameState.exploredCells.has(cellKey);

            if (x % 2 === 1 && y % 2 === 1) {
                minimapCtx.fillStyle = isExplored ? '#2a4a6a' : '#1a1a2a';
                minimapCtx.fillRect(px + padding, py + padding, mapCellSize - padding * 2, mapCellSize - padding * 2);
            }

            if (isExplored) {
                minimapCtx.fillStyle = '#4a6a8a';
                if (!cell.walls.top && y > 0) {
                    minimapCtx.fillRect(px + padding, py, mapCellSize - padding * 2, padding * 2);
                }
                if (!cell.walls.right) {
                    minimapCtx.fillRect(px + mapCellSize - padding * 2, py + padding, padding * 2, mapCellSize - padding * 2);
                }
                if (!cell.walls.bottom) {
                    minimapCtx.fillRect(px + padding, py + mapCellSize - padding * 2, mapCellSize - padding * 2, padding * 2);
                }
                if (!cell.walls.left && x > 0) {
                    minimapCtx.fillRect(px, py + padding, padding * 2, mapCellSize - padding * 2);
                }
            }
        }
    }

    if (gameState.exitDoor) {
        const gridX = gameState.exitDoor.userData.gridX;
        const gridY = gameState.exitDoor.userData.gridY;
        const isOpen = gameState.exitDoor.userData.isOpen;
        const cellKey = `${gridX},${gridY}`;
        
        if (gameState.exploredCells.has(cellKey)) {
            minimapCtx.fillStyle = isOpen ? '#00ff00' : '#ff0000';
            minimapCtx.beginPath();
            minimapCtx.arc(
                gridX * mapCellSize + mapCellSize / 2,
                gridY * mapCellSize + mapCellSize / 2,
                mapCellSize / 3,
                0,
                Math.PI * 2
            );
            minimapCtx.fill();
        }
    }

    for (const key of gameState.keyObjects) {
        if (key.userData.collected) continue;
        const cellKey = `${key.userData.gridX},${key.userData.gridY}`;
        if (gameState.exploredCells.has(cellKey)) {
            minimapCtx.fillStyle = '#ffd700';
            minimapCtx.beginPath();
            minimapCtx.arc(
                key.userData.gridX * mapCellSize + mapCellSize / 2,
                key.userData.gridY * mapCellSize + mapCellSize / 2,
                mapCellSize / 4,
                0,
                Math.PI * 2
            );
            minimapCtx.fill();
        }
    }

    const playerGridX = Math.floor((gameState.player.position.x - offset) / cellSize + 0.5);
    const playerGridY = Math.floor((gameState.player.position.z - offset) / cellSize + 0.5);

    minimapCtx.save();
    minimapCtx.translate(
        playerGridX * mapCellSize + mapCellSize / 2,
        playerGridY * mapCellSize + mapCellSize / 2
    );
    minimapCtx.rotate(gameState.player.yaw);

    minimapCtx.fillStyle = '#00ff00';
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, -mapCellSize / 2.5);
    minimapCtx.lineTo(-mapCellSize / 3, mapCellSize / 3);
    minimapCtx.lineTo(mapCellSize / 3, mapCellSize / 3);
    minimapCtx.closePath();
    minimapCtx.fill();

    minimapCtx.restore();
}

// ============================================
// HUD 更新
// ============================================
function updateHUD() {
    const elapsed = gameState.elapsedTime;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('steps').textContent = Math.floor(gameState.steps);
    document.getElementById('stars').textContent = `${gameState.collectedStars}/${gameState.totalStars}`;
    document.getElementById('flashlightState').textContent = gameState.flashlightOn ? '开' : '关';
}

let messageTimeout;
function showMessage(text) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.classList.add('show');
    
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
        msg.classList.remove('show');
    }, 2000);
}

// ============================================
// 输入处理
// ============================================
function initInput() {
    document.addEventListener('keydown', (e) => {
        if (!gameState.isPlaying || gameState.isPaused) return;
        
        switch (e.key.toLowerCase()) {
            case 'w': gameState.keys.w = true; break;
            case 'a': gameState.keys.a = true; break;
            case 's': gameState.keys.s = true; break;
            case 'd': gameState.keys.d = true; break;
            case ' ': gameState.keys.space = true; break;
            case 'f': toggleFlashlight(); break;
            case 'escape': togglePause(); break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.key.toLowerCase()) {
            case 'w': gameState.keys.w = false; break;
            case 'a': gameState.keys.a = false; break;
            case 's': gameState.keys.s = false; break;
            case 'd': gameState.keys.d = false; break;
            case ' ': gameState.keys.space = false; break;
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!gameState.isPlaying || gameState.isPaused) return;
        if (document.pointerLockElement !== renderer.domElement) return;

        gameState.player.yaw -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
        gameState.player.pitch -= e.movementY * CONFIG.MOUSE_SENSITIVITY;
        gameState.player.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, gameState.player.pitch));
    });

    renderer.domElement.addEventListener('click', () => {
        if (gameState.isPlaying && !gameState.isPaused) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        const clickToStart = document.getElementById('clickToStart');
        if (document.pointerLockElement === renderer.domElement) {
            clickToStart.style.display = 'none';
        } else if (gameState.isPlaying && !gameState.isPaused) {
            clickToStart.style.display = 'flex';
        }
    });
}

function toggleFlashlight() {
    gameState.flashlightOn = !gameState.flashlightOn;
    flashlight.intensity = gameState.flashlightOn ? 2 : 0;
}

// ============================================
// 游戏流程控制
// ============================================
function startNewGame(difficulty) {
    gameState.difficulty = difficulty;
    gameState.seed = Date.now();
    gameState.collectedKeys = 0;
    gameState.collectedStars = 0;
    gameState.totalStars = 0;
    gameState.steps = 0;
    gameState.elapsedTime = 0;
    gameState.exploredCells.clear();

    clearLevel();

    const generator = new MazeGenerator(CONFIG.MAZE_SIZE, gameState.seed);
    gameState.maze = generator.generate();

    buildMaze(gameState.maze);
    initPlayer();
    placeKeys();
    placeExit();
    placeEnemies();
    placeStars();

    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.startTime = performance.now();

    document.getElementById('menu').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('clickToStart').style.display = 'flex';
    document.getElementById('currentDifficulty').textContent = CONFIG.DIFFICULTIES[difficulty].name;

    const slots = document.querySelectorAll('.key-slot');
    slots.forEach(slot => slot.classList.remove('collected'));

    showMessage('收集所有钥匙，找到出口！');
}

function clearLevel() {
    for (const key of gameState.keyObjects) scene.remove(key);
    for (const enemy of gameState.enemies) scene.remove(enemy);
    for (const star of gameState.starObjects) scene.remove(star);
    for (const particle of gameState.particles) {
        scene.remove(particle);
        particle.geometry?.dispose();
        particle.material?.dispose();
    }
    if (gameState.exitDoor) scene.remove(gameState.exitDoor);

    gameState.keyObjects = [];
    gameState.enemies = [];
    gameState.starObjects = [];
    gameState.particles = [];
    gameState.exitDoor = null;
    gameState.exitPosition = null;
}

function togglePause() {
    if (!gameState.isPlaying) return;
    
    gameState.isPaused = !gameState.isPaused;
    document.getElementById('pauseMenu').style.display = gameState.isPaused ? 'flex' : 'none';
    
    if (gameState.isPaused) {
        document.exitPointerLock();
    } else {
        gameState.startTime = performance.now() - gameState.elapsedTime * 1000;
        renderer.domElement.requestPointerLock();
    }
}

function resumeGame() {
    gameState.isPaused = false;
    document.getElementById('pauseMenu').style.display = 'none';
    gameState.startTime = performance.now() - gameState.elapsedTime * 1000;
    renderer.domElement.requestPointerLock();
}

function quitToMenu() {
    gameState.isPlaying = false;
    gameState.isPaused = false;
    document.exitPointerLock();
    
    document.getElementById('menu').style.display = 'flex';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('clickToStart').style.display = 'none';
    
    loadBestRecords();
    checkSavedGame();
}

function gameWin() {
    gameState.isPlaying = false;
    document.exitPointerLock();
    
    const isNewRecord = saveBestRecord(gameState.difficulty, gameState.elapsedTime, Math.floor(gameState.steps));
    
    document.getElementById('finalTime').textContent = formatTime(gameState.elapsedTime);
    document.getElementById('finalSteps').textContent = Math.floor(gameState.steps);
    document.getElementById('finalStars').textContent = `${gameState.collectedStars}/${gameState.totalStars}`;
    document.getElementById('newRecord').style.display = isNewRecord ? 'block' : 'none';
    document.getElementById('gameOver').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('clickToStart').style.display = 'none';
    
    localStorage.removeItem('maze_save');
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// 存档系统
// ============================================
function saveGame() {
    if (!gameState.isPlaying) return;

    const saveData = {
        seed: gameState.seed,
        difficulty: gameState.difficulty,
        player: {
            position: {
                x: gameState.player.position.x,
                y: gameState.player.position.y,
                z: gameState.player.position.z
            },
            yaw: gameState.player.yaw,
            pitch: gameState.player.pitch
        },
        collectedKeys: gameState.collectedKeys,
        collectedStars: gameState.collectedStars,
        totalStars: gameState.totalStars,
        steps: gameState.steps,
        elapsedTime: gameState.elapsedTime,
        exploredCells: Array.from(gameState.exploredCells),
        keyStates: gameState.keyObjects.map(k => ({
            gridX: k.userData.gridX,
            gridY: k.userData.gridY,
            collected: k.userData.collected
        })),
        starStates: gameState.starObjects.map(s => ({
            gridX: s.userData.gridX,
            gridY: s.userData.gridY,
            collected: s.userData.collected
        })),
        exitOpen: gameState.exitDoor?.userData.isOpen || false
    };

    localStorage.setItem('maze_save', JSON.stringify(saveData));
    showMessage('💾 游戏已保存！');
}

function loadGame() {
    const saveStr = localStorage.getItem('maze_save');
    if (!saveStr) return false;

    try {
        const saveData = JSON.parse(saveStr);
        
        gameState.seed = saveData.seed;
        gameState.difficulty = saveData.difficulty;
        gameState.collectedKeys = saveData.collectedKeys;
        gameState.collectedStars = saveData.collectedStars;
        gameState.totalStars = saveData.totalStars;
        gameState.steps = saveData.steps;
        gameState.elapsedTime = saveData.elapsedTime;
        gameState.exploredCells = new Set(saveData.exploredCells);

        clearLevel();

        const generator = new MazeGenerator(CONFIG.MAZE_SIZE, gameState.seed);
        gameState.maze = generator.generate();

        buildMaze(gameState.maze);
        
        gameState.player.position.set(
            saveData.player.position.x,
            saveData.player.position.y,
            saveData.player.position.z
        );
        gameState.player.yaw = saveData.player.yaw;
        gameState.player.pitch = saveData.player.pitch;
        gameState.player.velocity.set(0, 0, 0);
        updatePlayerCamera();

        placeKeys();
        for (let i = 0; i < saveData.keyStates.length && i < gameState.keyObjects.length; i++) {
            if (saveData.keyStates[i].collected) {
                gameState.keyObjects[i].userData.collected = true;
                scene.remove(gameState.keyObjects[i]);
            }
        }

        placeExit();
        if (saveData.exitOpen && gameState.exitDoor) {
            gameState.exitDoor.userData.isOpen = true;
            const door = gameState.exitDoor.userData.doorMesh;
            const light = gameState.exitDoor.userData.light;
            door.material.color.setHex(0x00ff00);
            door.material.emissive.setHex(0x003300);
            light.color.setHex(0x00ff00);
            light.intensity = 0.8;
        }

        placeEnemies();

        placeStars();
        for (let i = 0; i < saveData.starStates.length && i < gameState.starObjects.length; i++) {
            if (saveData.starStates[i].collected) {
                gameState.starObjects[i].userData.collected = true;
                scene.remove(gameState.starObjects[i]);
            }
        }

        const slots = document.querySelectorAll('.key-slot');
        slots.forEach((slot, idx) => {
            if (idx < gameState.collectedKeys) {
                slot.classList.add('collected');
            }
        });

        gameState.isPlaying = true;
        gameState.isPaused = false;
        gameState.startTime = performance.now() - gameState.elapsedTime * 1000;

        document.getElementById('menu').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        document.getElementById('clickToStart').style.display = 'flex';
        document.getElementById('currentDifficulty').textContent = CONFIG.DIFFICULTIES[saveData.difficulty].name;

        showMessage('📂 游戏已加载！');
        return true;
    } catch (e) {
        console.error('加载存档失败:', e);
        return false;
    }
}

function checkSavedGame() {
    const hasSave = localStorage.getItem('maze_save') !== null;
    document.getElementById('continueBtn').style.display = hasSave ? 'inline-block' : 'none';
}

// ============================================
// 最佳记录
// ============================================
function saveBestRecord(difficulty, time, steps) {
    const key = `maze_best_${difficulty}`;
    const existing = localStorage.getItem(key);
    let isNewRecord = false;

    if (!existing) {
        localStorage.setItem(key, JSON.stringify({ time, steps }));
        isNewRecord = true;
    } else {
        const data = JSON.parse(existing);
        if (time < data.time || (time === data.time && steps < data.steps)) {
            localStorage.setItem(key, JSON.stringify({ time, steps }));
            isNewRecord = true;
        }
    }

    return isNewRecord;
}

function loadBestRecords() {
    const difficulties = ['easy', 'normal', 'hard'];
    const ids = ['bestEasy', 'bestNormal', 'bestHard'];

    difficulties.forEach((diff, idx) => {
        const key = `maze_best_${diff}`;
        const data = localStorage.getItem(key);
        const el = document.getElementById(ids[idx]);
        
        if (data) {
            const record = JSON.parse(data);
            el.textContent = `${formatTime(record.time)} / ${record.steps}步`;
        } else {
            el.textContent = '--';
        }
    });
}

// ============================================
// 难度选择 UI
// ============================================
function initMenuUI() {
    const diffBtns = document.querySelectorAll('.diff-btn');
    diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.difficulty = btn.dataset.difficulty;
        });
    });

    document.getElementById('newGameBtn').addEventListener('click', () => {
        const activeDiff = document.querySelector('.diff-btn.active');
        startNewGame(activeDiff.dataset.difficulty);
    });

    document.getElementById('continueBtn').addEventListener('click', () => {
        loadGame();
    });

    document.getElementById('resumeBtn').addEventListener('click', resumeGame);
    document.getElementById('saveBtn').addEventListener('click', saveGame);
    document.getElementById('quitBtn').addEventListener('click', quitToMenu);

    document.getElementById('playAgainBtn').addEventListener('click', () => {
        const activeDiff = document.querySelector('.diff-btn.active');
        startNewGame(activeDiff?.dataset.difficulty || 'normal');
    });

    document.getElementById('backToMenuBtn').addEventListener('click', quitToMenu);

    document.getElementById('clickToStart').addEventListener('click', () => {
        if (gameState.isPlaying && !gameState.isPaused) {
            renderer.domElement.requestPointerLock();
        }
    });

    loadBestRecords();
    checkSavedGame();
}

// ============================================
// 主游戏循环
// ============================================
let lastTime = 0;

function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (gameState.isPlaying && !gameState.isPaused) {
        gameState.elapsedTime = (performance.now() - gameState.startTime) / 1000;

        updatePlayer(dt);
        updateKeys(dt);
        updateStars(dt);
        updateEnemies(dt);
        updateParticles(dt);
        updateMinimap();
        updateHUD();

        if (checkExit()) {
            gameWin();
        }
    }

    renderer.render(scene, camera);
}

// ============================================
// 初始化
// ============================================
function init() {
    initThreeJS();
    initInput();
    initMinimap();
    initMenuUI();
    
    const crosshair = document.createElement('div');
    crosshair.className = 'crosshair';
    document.body.appendChild(crosshair);

    lastTime = performance.now();
    gameLoop(lastTime);
}

init();

window.gameState = gameState;
window.checkCollision = checkCollision;
window.canMoveTo = canMoveTo;
window.flashlight = flashlight;
window.scene = scene;
window.camera = camera;
window.renderer = renderer;
window.openExitDoor = openExitDoor;
window.saveGame = saveGame;
window.loadGame = loadGame;
window.resetLevel = resetLevel;
window.onPlayerCaught = onPlayerCaught;
window.CONFIG = CONFIG;
window.MazeGenerator = MazeGenerator;
